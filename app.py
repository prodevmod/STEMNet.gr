from __future__ import annotations
import time
from flask_wtf.csrf import CSRFProtect
from werkzeug.exceptions import HTTPException
from werkzeug.utils import secure_filename
import os
from dotenv import load_dotenv
import re
from datetime import timedelta
from markupsafe import Markup
import psycopg2
import psycopg2.extras

import sqlite3
from pathlib import Path
import requests

from flask import (
    jsonify,
    Flask,
    flash,
    g,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash
from itsdangerous import URLSafeTimedSerializer
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Path Configuration
BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "project.db"
SCHEMA = BASE_DIR / "schema.sql"

# Flask App Initialization
app = Flask(__name__)
app.config["SESSION_PERMANENT"] = False
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)

# Security Configuration
if not app.debug:
    app.config.update(
        SESSION_COOKIE_SECURE=True,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
    )
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "fallback-dev-key-change-in-prod")
csrf = CSRFProtect(app)  

# Blocked Domains for Security
BLOCKED_DOMAINS = {
    # IP Grabbers / Trackers
    "iplogger.org", "iplogger.com", "iplogger.ru", "2no.co", "yip.su", 
    "grabify.link", "blasze.com", "cest.la", "spotlogger.com", "iplogger.co",
    # Explicit Adult Content Domains
    "pornhub.com", "xvideos.com", "xnxx.com", "stripchat.com", "cam4.com", 
    "redtube.com", "youporngay.com", "hentaihaven.xxx"
}

# File Upload Configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm'}
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ALLOWED_PFP_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
def allowed_pfp_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_PFP_EXTENSIONS

# Database Configuration
db_url = os.environ.get("DATABASE_URL", "sqlite:///app.db")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Utility Functions for Email Verification
def get_serializer():
    return URLSafeTimedSerializer(app.secret_key)

# Email Verification Token Generation and Confirmation
def generate_verification_token(email):
    serializer = get_serializer()
    return serializer.dumps(email, salt='email-verification-salt')

# Confirm Verification Token with Expiration
def confirm_verification_token(token, expiration=3600): # Expires in 1 hour (3600 seconds)
    serializer = get_serializer()
    try:
        email = serializer.loads(token, salt='email-verification-salt', max_age=expiration)
    except Exception:
        return None
    return email

# Send Verification Email using Resend API
def send_verification_email(user_email, token):
    resend_api_key = os.environ.get("RESEND_API_KEY")
    verify_url = url_for('verify_email', token=token, _external=True)

    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json"
    }
        
    data = {
            "from": "STEMNet Greece <noreply@verify.stemnet.app>", 
                "to": [user_email],
                "subject": "Verify your STEMNet Greece Account",
            "html": f"""
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 40px auto; padding: 40px; text-align: center; background-color: #ffffff; border-radius: 12px; border: 1px solid #eaeaea; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
                            
                            <h2 style="color: #141f36; font-size: 26px; font-weight: 800; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">
                                Welcome to STEMNet Greece!
                            </h2>
                            
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 35px;">
                                We are thrilled to have you! Please verify your email address below to activate your account and join the community.
                            </p>
                            
                            <!-- Modern Dashboard-Style Button -->
                            <a href="{verify_url}" style="display: inline-block; padding: 14px 32px; background-color: #3ba47c; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 12px rgba(59, 164, 124, 0.3);">
                                Verify Email
                            </a>
                            
                            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 40px 0 25px 0;">
                            
                            <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0;">
                                If you did not sign up for STEMNet Greece, you can safely ignore this email.
                            </p>
                            
                        </div>
        """
    }

    try:
        response = requests.post("https://api.resend.com/emails", headers=headers, json=data)
        if response.status_code not in [200, 201]:
            print(f"Failed to send email: {response.text}")
    except Exception as e:
        print(f"Error sending email: {e}")

# Utility Function to Sanitize Profile Links
def sanitize_profile_links(user):
    """Safely sanitizes links and ensures dict format for Jinja rendering."""
    if not user:
        return None
    
    # Convert sqlite3.Row object to a standard mutable Python dictionary
    user_dict = dict(user)
    
    # 1. Format the GitHub URL (since it's saved as just a username)
    github_val = user_dict.get("github_user")
    if github_val:
        github_val = github_val.strip()
        if not github_val.startswith("http"):
            user_dict["github_user"] = f"https://github.com/{github_val}"
    
    # 2. Ensure other links have http:// or https:// prefixes
    link_keys = [
        "linkedin_url", "custom_link_1", "custom_link_2", 
        "custom_link_3", "custom_link_4", "custom_link_5"
    ]
    
    for link_key in link_keys:
        url = user_dict.get(link_key)
        if url and isinstance(url, str):
            url = url.strip()
            if url and not (url.startswith("http://") or url.startswith("https://")):
                user_dict[link_key] = f"https://{url}"
            else:
                user_dict[link_key] = url

    return user_dict

# Utility Function to Check Allowed File Extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Database Wrappers for PostgreSQL Compatibility
class PostgresCursorWrapper:
    """Wraps the psycopg2 cursor to translate '?' placeholders to '%s' and support lastrowid."""
    def __init__(self, cursor):
        self._cursor = cursor
        self.lastrowid = None

    def execute(self, query, params=()):
        # Translate SQLite '?' placeholders to PostgreSQL '%s'
        postgres_query = query.replace("?", "%s")
        
        is_insert = postgres_query.strip().upper().startswith("INSERT")
        has_returning = "RETURNING" in postgres_query.upper()
        
        if is_insert and not has_returning:
            postgres_query = postgres_query.rstrip().rstrip(";") + " RETURNING id;"
            self._cursor.execute(postgres_query, params)
            result = self._cursor.fetchone()
            if result:
                if isinstance(result, dict):
                    self.lastrowid = result.get("id") or list(result.values())[0]
                else:
                    self.lastrowid = result[0]
        else:
            self._cursor.execute(postgres_query, params)
            
        return self

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def fetchmany(self, size=None):
        return self._cursor.fetchmany(size) if size else self._cursor.fetchmany()

    def __iter__(self):
        return iter(self._cursor)

    def __getattr__(self, name):
        return getattr(self._cursor, name)


class PostgresWrapper:
    """Makes PostgreSQL connection behave like SQLite, supporting both .cursor() and connection-level .execute()."""
    def __init__(self, conn):
        self.conn = conn

    def cursor(self):
        return PostgresCursorWrapper(self.conn.cursor())

    def execute(self, query, params=()):
        """Allows db.execute(...) shorthand directly on the connection, just like sqlite3."""
        cursor = self.cursor()
        return cursor.execute(query, params)

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

def get_db():
    if "db" not in g:
        db_url = os.environ.get("DATABASE_URL")
        
        if db_url:
            if db_url.startswith("postgres://"):
                db_url = db_url.replace("postgres://", "postgresql://", 1)
            
            connection = psycopg2.connect(db_url, cursor_factory=psycopg2.extras.RealDictCursor)
            g.db = PostgresWrapper(connection)
        else:
            connection = sqlite3.connect(DATABASE)
            connection.row_factory = sqlite3.Row
            # ONLY run PRAGMA on SQLite
            connection.execute("PRAGMA foreign_keys = ON;")
            g.db = connection
            
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        if hasattr(db, 'close'):
            db.close()

## Before Request: Database Upgrade and Schema Management
@app.before_request
def upgrade_database():
    if getattr(app, '_db_checked', False):
        return

    db = get_db()
    is_postgres = bool(os.environ.get("DATABASE_URL"))

    try:
        # Run schema creation if tables don't exist
        with app.open_resource("schema.sql", mode="r") as f:
            schema_script = f.read()

        if is_postgres:
            schema_script = re.sub(r'(?i)PRAGMA\s+[^;]+;', '', schema_script)
            schema_script = re.sub(
                r'(?i)INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT', 
                'SERIAL PRIMARY KEY', 
                schema_script
            )

            raw_conn = db.conn if hasattr(db, 'conn') else db
            with raw_conn.cursor() as cur:
                cur.execute(schema_script)
        else:
            db.cursor().executescript(schema_script)

        db.commit()

        # Safely add evolving columns using native Postgres IF NOT EXISTS
        if is_postgres:
            db.execute("ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_id INTEGER;")
            db.execute("ALTER TABLE posts ADD COLUMN IF NOT EXISTS event_type TEXT;")
            db.execute("ALTER TABLE posts ADD COLUMN IF NOT EXISTS event_time TEXT;")
            db.execute("ALTER TABLE posts ADD COLUMN IF NOT EXISTS event_location TEXT;")
            # --- Added for Login Brute Force Mitigation ---
            db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;")
            db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until REAL DEFAULT 0;")
            db.commit()
        else:
            cursor = db.execute("PRAGMA table_info(posts);")
            columns = [row["name"] for row in cursor.fetchall()]
            missing_cols = {
                "parent_id": "INTEGER",
                "event_type": "TEXT",
                "event_time": "TEXT",
                "event_location": "TEXT"
            }
            for col_name, col_type in missing_cols.items():
                if col_name not in columns:
                    db.execute(f"ALTER TABLE posts ADD COLUMN {col_name} {col_type};")
            
            # --- Added for Login Brute Force Mitigation (SQLite) ---
            user_cursor = db.execute("PRAGMA table_info(users);")
            user_columns = [row["name"] for row in user_cursor.fetchall()]
            if "failed_attempts" not in user_columns:
                db.execute("ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0;")
            if "locked_until" not in user_columns:
                db.execute("ALTER TABLE users ADD COLUMN locked_until REAL DEFAULT 0;")

            db.commit()

    except Exception as e:
        print(f"Database initialization error: {e}")
        if hasattr(db, 'rollback'):
            db.rollback()
        elif hasattr(db, 'conn'):
            db.conn.rollback()

    app._db_checked = True

# Before Request: User Session Management 
@app.before_request
def load_current_user() -> None:
    user_id = session.get("user_id")
    if user_id is None:
        g.user = None
    else:
        g.user = get_db().execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()
 
# Registration Route with reCAPTCHA v3 and Email Verification
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        # 1. Verify Google reCAPTCHA v3 token and score
        token = request.form.get("g-recaptcha-response")
        if not token:
            flash("Security verification failed. Please try again.", "danger")
            return render_template("register.html")

        payload = {
            "secret": os.environ.get("RECAPTCHA_SECRET_KEY"),
            "response": token,
            "remoteip": request.remote_addr
        }
        response = requests.post("https://www.google.com/recaptcha/api/siteverify", data=payload)
        result = response.json()

        # Block if not successful or if the bot score is below 0.5
        if not result.get("success") or result.get("score", 0) < 0.2:
            flash("Automated activity detected. Registration blocked.", "danger")
            return render_template("register.html")

        # 2. Capture Form Inputs
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")
        age_str = request.form.get("age", "").strip()
        grade = request.form.get("grade", "").strip()
        interest = request.form.get("interest", "").strip()

        # Specific Social Profiles
        github_user = request.form.get("github_user", "").strip() or None
        linkedin_url = request.form.get("linkedin_url", "").strip() or None

        # 5 Custom Link Slots
        custom_link_1 = request.form.get("custom_link_1", "").strip() or None
        custom_link_2 = request.form.get("custom_link_2", "").strip() or None
        custom_link_3 = request.form.get("custom_link_3", "").strip() or None
        custom_link_4 = request.form.get("custom_link_4", "").strip() or None
        custom_link_5 = request.form.get("custom_link_5", "").strip() or None

        # 3. Validation Checks
        if not username or not email or not password or not confirm_password or not age_str or not grade or not interest:
            flash("Please fill out all required fields.", "danger")
            return render_template("register.html")
        elif password != confirm_password:
            flash("Passwords do not match.", "danger")
            return render_template("register.html")
        elif len(password) < 8:
            flash("Password must be at least 8 characters long.", "danger")
            return render_template("register.html")
        elif not any(c.isdigit() for c in password):
            flash("Password must contain at least one number.", "danger")
            return render_template("register.html")
        elif not any(not c.isalnum() for c in password):
            flash("Password must contain at least one special character.", "danger")
            return render_template("register.html")
        else:
            try:
                age = int(age_str)
                if age < 10 or age > 100:
                    flash("Please enter a realistic age.", "danger")
                    return render_template("register.html")
            except ValueError:
                flash("Age must be a valid number.", "danger")
                return render_template("register.html")

            db = get_db()
            
            # Pre-check for existing email or username
            existing_user = db.execute(
                "SELECT username, email FROM users WHERE username = ? OR email = ?",
                (username, email)
            ).fetchone()

            if existing_user:
                if existing_user["email"] == email:
                    flash("Email already registered.", "danger")
                elif existing_user["username"] == username:
                    flash("That username is already taken.", "danger")
                return render_template("register.html")

            try:
                db.execute(
                    """
                    INSERT INTO users (
                        username, email, password_hash, age, grade, interest, 
                        github_user, linkedin_url,
                        custom_link_1, custom_link_2, custom_link_3, custom_link_4, custom_link_5
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        username,
                        email,  
                        generate_password_hash(password),
                        age,
                        grade,
                        interest,
                        github_user,
                        linkedin_url,
                        custom_link_1,
                        custom_link_2,
                        custom_link_3,
                        custom_link_4,
                        custom_link_5,
                    ),
                )
                db.commit()

                # Generate token and send verification email
                token_email = generate_verification_token(email)
                send_verification_email(email, token_email)

            except (sqlite3.IntegrityError, psycopg2.Error) as e:
                print(f"Registration DB Error: {e}")
                db.rollback()
                flash("Registration failed. That username or email may already be in use.", "danger")
                return render_template("register.html")
            else:
                flash("Registration successful! Please check your email to verify your account before logging in.", "success")
                return redirect(url_for("login"))

    return render_template("register.html")

# Login Route with reCAPTCHA v3 and Brute Force Mitigation
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        # 1. Verify Google reCAPTCHA v3 token and score
        token = request.form.get("g-recaptcha-response")
        if not token:
            flash("Security verification failed. Please try again.", "danger")
            return render_template("login.html")

        payload = {
            "secret": os.environ.get("RECAPTCHA_SECRET_KEY"),
            "response": token,
            "remoteip": request.remote_addr
        }
        
        response = requests.post("https://www.google.com/recaptcha/api/siteverify", data=payload)
        result = response.json()

        # Block if not successful or if the bot score is below 0.5
        if not result.get("success") or result.get("score", 0) < 0.2:
            flash("Automated activity detected. Login blocked.", "danger")
            return render_template("login.html")

        # 2. Extract Credentials
        identifier = request.form.get("username_or_email", "").strip()
        password = request.form.get("password", "")
        remember = request.form.get("remember")

        if not identifier or not password:
            flash("Please enter both your username/email and password.", "danger")
            return render_template("login.html")

        db = get_db()
        
        try:
            user = db.execute(
                "SELECT * FROM users WHERE username = ? OR email = ?", 
                (identifier, identifier)
            ).fetchone()

            if user is None:
                flash("Invalid username/email or password.", "danger")
                return render_template("login.html")

            # Convert user row to a standard dict so .get() works on both SQLite and PostgreSQL
            user_dict = dict(user)

            # 3. Check if the account is currently locked out
            current_time = time.time()
            locked_until = user_dict.get("locked_until", 0) or 0
            if locked_until > current_time:
                remaining_mins = max(1, int((locked_until - current_time) / 60))
                flash(f"Too many failed login attempts. Account is temporarily locked. Please try again in {remaining_mins} minute(s).", "danger")
                return render_template("login.html")

            # 4. Verify Password
            if not check_password_hash(user_dict["password_hash"], password):
                failed_attempts = user_dict.get("failed_attempts", 0) + 1
                new_locked_until = 0
                
                # Lock account for 5 minutes (300 seconds) after 5 failed attempts
                if failed_attempts >= 5:
                    new_locked_until = current_time + 300
                    flash("Too many failed login attempts. Your account has been locked for 5 minutes.", "danger")
                else:
                    flash(f"Invalid username/email or password. Attempt {failed_attempts}/5.", "danger")
                
                db.execute(
                    "UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?",
                    (failed_attempts, new_locked_until, user_dict["id"])
                )
                db.commit()
                return render_template("login.html")

            elif user_dict["is_verified"] == 0:
                flash("Please verify your email address before logging in. Check your inbox.", "warning")
                return render_template("login.html")
            else:
                # 5. Successful Login: Reset failed attempts and lockout timers
                db.execute(
                    "UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?",
                    (user_dict["id"],)
                )
                db.commit()

                session.clear()
                session.permanent = True if remember else False
                session["user_id"] = user_dict["id"]
                session["just_logged_in"] = True
                flash("Logged in successfully!", "success")
                return redirect(url_for("index"))
                
        except (sqlite3.Error, psycopg2.Error) as e:
            print(f"Login DB Error: {e}")
            if hasattr(db, 'rollback'):
                db.rollback()
            elif hasattr(db, 'conn'):
                db.conn.rollback()
            flash("An unexpected database error occurred. Please try again.", "danger")
            return render_template("login.html")

    return render_template("login.html")

# After Request: Security Headers
@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Context Processor: Unread Notifications and Login Flag
@app.context_processor
def utility_processor():
    def get_unread_notifications():
        if g.get("user"):
            db = get_db()
            row = db.execute(
                "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0",
                (g.user["id"],)
            ).fetchone()
            
            if not row:
                return False
            
            # Handle both Postgres dictionary rows and SQLite tuple rows safely
            count = row['count'] if isinstance(row, dict) else row[0]
            return count > 0
        return False
    return dict(has_unread_notifications=get_unread_notifications())

@app.context_processor
def inject_login_flag():
    # Pops the flag so it is only True on the very first page render after logging in
    just_logged_in = session.pop("just_logged_in", False)
    return dict(just_logged_in=just_logged_in)

# Login Required Decorator
def login_required(view):
    def wrapped_view(*args, **kwargs):
        if g.get("user") is None:
            flash("Please log in to continue.", "warning")
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    wrapped_view.__name__ = view.__name__
    return wrapped_view

# Index Route: Display Posts and Featured Groups
@app.route("/")
def index():
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    selected_category = request.args.get("category", "").strip()
    
    query = """
        SELECT posts.*, users.username,
               parent_posts.content AS parent_content,
               parent_users.username AS parent_username,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        LEFT JOIN posts AS parent_posts ON posts.parent_id = parent_posts.id 
        LEFT JOIN users AS parent_users ON parent_posts.user_id = parent_users.id 
        WHERE posts.category != 'Events' AND posts.group_id IS NULL
    """
    params = [current_user_id]
    
    if selected_category:
        query += " AND posts.category = ?"
        params.append(selected_category)
        
    query += " ORDER BY posts.created_at DESC"
    
    posts = db.execute(query, params).fetchall()
    
    # Safely fetch featured groups (wrapped in try/except in case table is missing)
    featured_groups = []
    try:
        featured_groups = db.execute('''
            SELECT g.*, u.username FROM groups g 
            JOIN users u ON g.user_id = u.id 
            ORDER BY RANDOM() LIMIT 3
        ''').fetchall()
    except Exception:
        pass
    
    return render_template("index.html", posts=posts, selected_category=selected_category, featured_groups=featured_groups)

# Email Verification Route
@app.route("/verify/<token>")
def verify_email(token):
    email = confirm_verification_token(token)
    if not email:
        flash("The verification link is invalid or has expired.", "danger")
        return redirect(url_for("login"))

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    
    if not user:
        flash("User not found.", "danger")
        return redirect(url_for("login"))

    if user["is_verified"] == 1:
        flash("Account already verified. Please log in.", "info")
        return redirect(url_for("login"))

    # Mark user as verified
    db.execute("UPDATE users SET is_verified = 1 WHERE email = ?", (email,))
    db.commit()
    
    flash("Email verified successfully! You can now log in.", "success")
    return redirect(url_for("login"))

# Logout Route
@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("index"))

# Create Post Route with Reply and Group Support
@app.route("/create", methods=("GET", "POST"))
def create_post():
    if g.get("user") is None:
        flash("Please log in to create a post.", "warning")
        return redirect(url_for("login"))

    db = get_db()
    parent_id = request.args.get("reply_to", type=int)
    group_id = request.args.get("group_id", type=int) or request.form.get("group_id", type=int)
    parent_post = None

    if parent_id:
        parent_post = db.execute(
            "SELECT posts.*, users.username FROM posts JOIN users ON posts.user_id = users.id WHERE posts.id = ?",
            (parent_id,)
        ).fetchone()

    if request.method == "POST":
        content = request.form.get("content", "").strip()
        category = request.form.get("category", "").strip()
        
        # Handle Event Specific Fields vs GitHub Links
        github_link = None
        event_type = None
        event_time = None
        event_location = None

        if category == "Events":
            event_type = request.form.get("event_type", "").strip()
            event_time = request.form.get("event_time", "").strip()
            event_location = request.form.get("event_location", "").strip()
        else:
            github_link = request.form.get("github_link", "").strip() or None
            if category == "Other":
                custom_category = request.form.get("custom_category", "").strip()
                category = custom_category if custom_category else "Other"

        media_path = None

        if not content:
            flash("Post content cannot be empty.", "danger")
            return render_template("create.html", parent_post=parent_post, group_id=group_id)

        # Handle file/media upload to Supabase Storage
        file = request.files.get("media")
        if file and file.filename != '':
            if allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_filename = f"{g.user['id']}_{int(time.time())}_{filename}"
                file_bytes = file.read()
                
                try:
                    supabase.storage.from_("uploads").upload(
                        path=unique_filename,
                        file=file_bytes,
                        file_options={"content-type": file.content_type, "upsert": "false"}
                    )
                    
                    public_url_response = supabase.storage.from_("uploads").get_public_url(unique_filename)
                    
                    if isinstance(public_url_response, dict):
                        media_path = public_url_response.get("publicUrl")
                    else:
                        media_path = public_url_response
                except Exception as e:
                    app.logger.error(f"Supabase upload error: {e}")
                    flash("Failed to upload media file to cloud storage.", "danger")
                    return render_template("create.html", parent_post=parent_post, group_id=group_id)
            else:
                flash("Invalid file type. Allowed: images (png, jpg, gif) and short videos (mp4, webm).", "danger")
                return render_template("create.html", parent_post=parent_post, group_id=group_id)

        # Insert into database including group_id
        cursor = db.execute(
            """
            INSERT INTO posts (user_id, content, media_path, github_link, category, parent_id, event_type, event_time, event_location, group_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (g.user["id"], content, media_path, github_link, category, parent_id, event_type, event_time, event_location, group_id if group_id else None)
        )
        post_id = cursor.lastrowid

        # Notification loops
        if parent_id:
            parent_author = db.execute("SELECT user_id FROM posts WHERE id = ?", (parent_id,)).fetchone()
            if parent_author and parent_author["user_id"] != g.user["id"]:
                db.execute(
                    "INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)",
                    (parent_author["user_id"], g.user["id"], "reply", post_id)
                )

        followers = db.execute("SELECT follower_id FROM follows WHERE following_id = ?", (g.user["id"],)).fetchall()
        for follower in followers:
            db.execute(
                "INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)",
                (follower["follower_id"], g.user["id"], "post", post_id)
            )

        db.commit()
        flash("Post published successfully!", "success")
        
        # Redirect back to the group if posted inside one, otherwise index
        if group_id:
            return redirect(url_for("group_detail", group_id=group_id))
        return redirect(url_for("index"))

    return render_template("create.html", parent_post=parent_post, group_id=group_id)

# Like/Unlike Toggle Route
@app.route("/like/<int:post_id>", methods=["POST"])
@csrf.exempt
def toggle_like(post_id):
    if not g.get("user"):
        return jsonify({"error": "Unauthorized"}), 401
    
    db = get_db()
    cursor = db.cursor()
    user_id = g.user["id"]
    
    try:
        cursor.execute(
            "SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?",
            (user_id, post_id)
        )
        existing_like = cursor.fetchone()
        
        if existing_like:
            cursor.execute("DELETE FROM likes WHERE user_id = ? AND post_id = ?", (user_id, post_id))
            liked = False
        else:
            cursor.execute("INSERT INTO likes (user_id, post_id) VALUES (?, ?)", (user_id, post_id))
            liked = True
        
        db.commit()
                
        cursor.execute("SELECT COUNT(*) AS count FROM likes WHERE post_id = ?", (post_id,))
        count_row = cursor.fetchone()
        
        # Use dictionary key lookup for RealDictCursor compatibility
        count = count_row["count"] if count_row else 0
        
        return jsonify({"liked": liked, "count": count})
    except Exception as e:
        db.rollback()
        print(f"Error in toggle_like: {e}")  
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
 
# Profile Route: View Own or Other User's Profile
@app.route("/profile")
@app.route("/profile/<username>")
def profile(username: str | None = None):
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0

    # 1. Handle /profile (current user) vs /profile/<username> (target user)
    if username is None:
        if g.get("user") is None:
            flash("Please log in to view your profile.", "warning")
            return redirect(url_for("login"))
        user_id = g.user["id"]
    else:
        target_user = db.execute(
            "SELECT id FROM users WHERE username = ?", (username,)
        ).fetchone()
        
        if target_user is None:
            flash(f"User @{username} does not exist.", "danger")
            return redirect(url_for("index"))
        user_id = target_user["id"]

    # 2. Fetch raw user record
    raw_user = db.execute(
        "SELECT * FROM users WHERE id = ?", (user_id,)
    ).fetchone()

    if not raw_user:
        flash("User not found.", "danger")
        return redirect(url_for("index"))

    # 3. Sanitize profile links into a dict
    profile_user = sanitize_profile_links(raw_user)

    # 4. Fetch user's posts
    posts = db.execute(
        """
        SELECT posts.*, users.username,
               parent_posts.content AS parent_content,
               parent_users.username AS parent_username,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        LEFT JOIN posts AS parent_posts ON posts.parent_id = parent_posts.id 
        LEFT JOIN users AS parent_users ON parent_posts.user_id = parent_users.id 
        WHERE posts.user_id = ?
        ORDER BY posts.created_at DESC
        """,
        (current_user_id, profile_user["id"])
    ).fetchall()

    # 5. Fetch Follower and Following counts safely
    followers_row = db.execute(
        "SELECT COUNT(*) FROM follows WHERE following_id = ?", (profile_user["id"],)
    ).fetchone()
    followers_count = next(iter(followers_row.values())) if isinstance(followers_row, dict) else followers_row[0]
    
    following_row = db.execute(
        "SELECT COUNT(*) FROM follows WHERE follower_id = ?", (profile_user["id"],)
    ).fetchone()
    following_count = next(iter(following_row.values())) if isinstance(following_row, dict) else following_row[0]

    # 6. Check if current user is following this profile user
    is_following = False
    if g.get("user") and g.user["id"] != profile_user["id"]:
        check_follow = db.execute(
            "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
            (g.user["id"], profile_user["id"])
        ).fetchone()
        is_following = check_follow is not None

    return render_template(
        "profile.html", 
        profile_user=profile_user, 
        posts=posts, 
        followers_count=followers_count, 
        following_count=following_count, 
        is_following=is_following
    )

# Edit Profile Route
@app.route("/profile/edit", methods=("GET", "POST"))
def edit_profile():
    # Security check: Ensure user is logged in
    if g.get("user") is None:
        flash("Please log in to edit your profile.", "danger")
        return redirect(url_for("login"))

    db = get_db()
    user_id = g.user["id"] 

    if request.method == "POST":
        age_str = request.form.get("age", "").strip()
        grade = request.form.get("grade", "").strip()
        interest = request.form.get("interest", "").strip()
        
        # Socials & Custom Links
        github_user = request.form.get("github_user", "").strip() or None
        linkedin_url = request.form.get("linkedin_url", "").strip() or None
        custom_link_1 = request.form.get("custom_link_1", "").strip() or None
        custom_link_2 = request.form.get("custom_link_2", "").strip() or None
        custom_link_3 = request.form.get("custom_link_3", "").strip() or None
        custom_link_4 = request.form.get("custom_link_4", "").strip() or None
        custom_link_5 = request.form.get("custom_link_5", "").strip() or None
        bio = request.form.get("bio", "").strip()

        if not age_str or not grade or not interest:
            flash("Please fill out all required fields.", "danger")
        else:
            try:
                age = int(age_str)
                if age < 10 or age > 100:
                    flash("Please enter a realistic age.", "danger")
                    profile_user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
                    return render_template("edit_profile.html", profile_user=profile_user)
            except ValueError:
                flash("Age must be a valid number.", "danger")
                profile_user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
                return render_template("edit_profile.html", profile_user=profile_user)

            # Handle Profile Picture Upload
            file = request.files.get("profile_pic")
            profile_pic_path = g.user["profile_pic"] 
            
            if file and file.filename != '':
                if allowed_pfp_file(file.filename):
                    filename = secure_filename(file.filename)
                    unique_filename = f"pfp_{user_id}_{int(time.time())}_{filename}"
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(file_path)
                    profile_pic_path = f"uploads/{unique_filename}"
                else:
                    flash("Invalid image file type. Allowed: png, jpg, jpeg, gif, webp", "danger")
                    profile_user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
                    return render_template("edit_profile.html", profile_user=profile_user)

            db.execute(
                """
                UPDATE users 
                SET age = ?, grade = ?, interest = ?, github_user = ?, linkedin_url = ?, 
                    custom_link_1 = ?, custom_link_2 = ?, custom_link_3 = ?, custom_link_4 = ?, custom_link_5 = ?, bio = ?, profile_pic = ?
                WHERE id = ?
                """,
                (
                    age, grade, interest, github_user, linkedin_url, 
                    custom_link_1, custom_link_2, custom_link_3, custom_link_4, custom_link_5, 
                    bio, profile_pic_path, user_id
                )
            )
            db.commit()

            flash("Profile updated successfully!", "success")
            return redirect(url_for("profile"))

    profile_user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return render_template("edit_profile.html", profile_user=profile_user)

# Follow/Unfollow Routes with Conflict Handling
@app.route("/follow/<int:user_id>", methods=["POST"])
def follow(user_id):
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else None
    
    if not current_user_id:
        return redirect(url_for("login"))
        
    if current_user_id == user_id:
        flash("You cannot follow yourself.", "warning")
        return redirect(request.referrer or url_for("index"))

    try:
        db.execute(
            """
            INSERT INTO follows (follower_id, following_id, created_at) 
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (follower_id, following_id) DO NOTHING
            """,
            (current_user_id, user_id)
        )
        
        if hasattr(db, 'commit'):
            db.commit()
        elif hasattr(db, 'connection'):
            db.connection.commit()
        else:
            g.db.commit()
            
    except Exception as e:
        app.logger.error(f"Follow error: {e}")
        flash("Could not follow user due to a database error.", "danger")

    return redirect(request.referrer or url_for("index"))

@app.route("/unfollow/<int:user_id>", methods=["POST"])
def unfollow(user_id):
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else None
    
    if not current_user_id:
        return redirect(url_for("login"))

    try:
        db.execute(
            "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
            (current_user_id, user_id)
        )
        
        if hasattr(db, 'commit'):
            db.commit()
        elif hasattr(db, 'connection'):
            db.connection.commit()
        else:
            g.db.commit()
            
    except Exception as e:
        app.logger.error(f"Unfollow error: {e}")
        flash("Could not unfollow user due to a database error.", "danger")

    return redirect(request.referrer or url_for("index"))

# Notifications Route
@app.route("/notifications")
def notifications():
    if g.get("user") is None:
        flash("Please log in to view notifications.", "warning")
        return redirect(url_for("login"))

    db = get_db()
    notifs = db.execute(
        """
        SELECT n.*, u.username as actor_username, p.content as post_content 
        FROM notifications n
        JOIN users u ON n.actor_id = u.id
        LEFT JOIN posts p ON n.post_id = p.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        """,
        (g.user["id"],)
    ).fetchall()

    # Mark notifications as read once viewed
    db.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", (g.user["id"],))
    db.commit()

    return render_template("notifications.html", notifications=notifs)

# User Followers and Following Routes
@app.route("/user/<username>/followers")
def followers(username):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not user:
        flash("User not found.", "danger")
        return redirect(url_for("index"))

    followers_list = db.execute(
        """
        SELECT users.id, users.username, users.profile_pic 
        FROM follows 
        JOIN users ON follows.follower_id = users.id 
        WHERE follows.following_id = ?
        """,
        (user["id"],)
    ).fetchall()
    
    return render_template("followers.html", followers=followers_list, profile_user=user)

@app.route("/user/<username>/following")
def following(username):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not user:
        flash("User not found.", "danger")
        return redirect(url_for("index"))

    following_list = db.execute(
        """
        SELECT users.id, users.username, users.profile_pic 
        FROM follows 
        JOIN users ON follows.following_id = users.id 
        WHERE follows.follower_id = ?
        """,
        (user["id"],)
    ).fetchall()
    
    return render_template("following.html", following=following_list, profile_user=user)

# Post Detail Route with Replies and Like Counts
@app.route("/post/<int:post_id>")
def post_detail(post_id):
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    
    post = db.execute(
        """
        SELECT posts.*, users.username,
               parent_posts.content AS parent_content,
               parent_users.username AS parent_username,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        LEFT JOIN posts AS parent_posts ON posts.parent_id = parent_posts.id 
        LEFT JOIN users AS parent_users ON parent_posts.user_id = parent_users.id 
        WHERE posts.id = ?
        """,
        (current_user_id, post_id)
    ).fetchone()

    if not post:
        flash("Post not found.", "danger")
        return redirect(url_for("index"))

    # Fetch direct replies to this specific post
    replies = db.execute(
        """
        SELECT posts.*, users.username,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        WHERE posts.parent_id = ?
        ORDER BY posts.created_at ASC
        """,
        (current_user_id, post_id)
    ).fetchall()

    return render_template("post_detail.html", post=post, replies=replies)

# Edit Post Route with Permission Checks
@app.route("/post/<int:post_id>/edit", methods=("GET", "POST"))
def edit_post(post_id):
    if g.get("user") is None:
        flash("Please log in to edit posts.", "warning")
        return redirect(url_for("login"))
        
    db = get_db()
    post = db.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
    
    if not post:
        flash("Post not found.", "danger")
        return redirect(url_for("index"))
        
    if post["user_id"] != g.user["id"]:
        flash("You do not have permission to edit this post.", "danger")
        return redirect(url_for("index"))
        
    if request.method == "POST":
        content = request.form.get("content", "").strip()
        category = request.form.get("category", "").strip()
        
        github_link = None
        event_type = None
        event_time = None
        event_location = None
        
        if category == "Events":
            event_type = request.form.get("event_type", "").strip()
            event_time = request.form.get("event_time", "").strip()
            event_location = request.form.get("event_location", "").strip()
        else:
            github_link = request.form.get("github_link", "").strip() or None
            if category == "Other":
                custom_category = request.form.get("custom_category", "").strip()
                category = custom_category if custom_category else "Other"
                
        if not content:
            flash("Post content cannot be empty.", "danger")
            return render_template("edit_post.html", post=post)
            
        db.execute(
            """
            UPDATE posts 
            SET content = ?, category = ?, github_link = ?, event_type = ?, event_time = ?, event_location = ?
            WHERE id = ?
            """,
            (content, category, github_link, event_type, event_time, event_location, post_id)
        )
        db.commit()
        flash("Post updated successfully!", "success")
        return redirect(url_for("post_detail", post_id=post_id))
        
    return render_template("edit_post.html", post=post)

# Delete Post Route with Permission Checks and Cleanup
@app.route("/post/<int:post_id>/delete", methods=["POST"])
def delete_post(post_id):
    if g.get("user") is None:
        flash("Please log in.", "warning")
        return redirect(url_for("login"))
        
    db = get_db()
    post = db.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
    
    if not post:
        flash("Post not found.", "danger")
        return redirect(url_for("index"))
        
    if post["user_id"] != g.user["id"]:
        flash("You do not have permission to delete this post.", "danger")
        return redirect(url_for("index"))
        
    # Clean up associated database entries
    db.execute("DELETE FROM likes WHERE post_id = ?", (post_id,))
    db.execute("DELETE FROM notifications WHERE post_id = ?", (post_id,))
    db.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    db.commit()

    if post["media_path"]:
        file_name = post["media_path"].replace("uploads/", "")
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
        if os.path.exists(file_path):
            os.remove(file_path)
    
    flash("Post deleted successfully.", "success")
    return redirect(url_for("index"))

# Events Feed Route
@app.route("/events")
def events_feed():
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    
    posts = db.execute(
        """
        SELECT posts.*, users.username,
               parent_posts.content AS parent_content,
               parent_users.username AS parent_username,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        LEFT JOIN posts AS parent_posts ON posts.parent_id = parent_posts.id 
        LEFT JOIN users AS parent_users ON parent_posts.user_id = parent_users.id 
        WHERE posts.category = 'Events'
        ORDER BY posts.created_at DESC
        """,
        (current_user_id,)
    ).fetchall()
    
    return render_template("events.html", posts=posts)

# Search Route: Search Posts, Users, and Groups
@app.route("/search")
def search():
    query = request.args.get("q", "").strip()
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    
    posts = []
    users = []
    groups = []
    
    if query:
        search_term = f"%{query}%"
        
        # 1. Search posts (content, categories, etc.)
        posts = db.execute(
            """
            SELECT posts.*, users.username,
                   parent_posts.content AS parent_content,
                   parent_users.username AS parent_username,
                   (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
                   (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
            FROM posts 
            JOIN users ON posts.user_id = users.id 
            LEFT JOIN posts AS parent_posts ON posts.parent_id = parent_posts.id 
            LEFT JOIN users AS parent_users ON parent_posts.user_id = parent_users.id 
            WHERE posts.content LIKE ? OR posts.category LIKE ?
            ORDER BY posts.created_at DESC
            """,
            (current_user_id, search_term, search_term)
        ).fetchall()

        # 2. Search users (by username, bio, or interest)
        users = db.execute(
            """
            SELECT id, username, profile_pic, bio, grade, interest 
            FROM users 
            WHERE username LIKE ? OR bio LIKE ? OR interest LIKE ?
            ORDER BY username ASC
            """,
            (search_term, search_term, search_term)
        ).fetchall()

        # 3. Search groups (by name or description)
        groups = db.execute(
            """
            SELECT groups.*, users.username 
            FROM groups 
            JOIN users ON groups.user_id = users.id 
            WHERE groups.name LIKE ? OR groups.description LIKE ?
            ORDER BY groups.created_at DESC
            """,
            (search_term, search_term)
        ).fetchall()

    return render_template("search.html", posts=posts, users=users, groups=groups, query=query)

# Error Handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(Exception)
def handle_500_error(e):
    # Pass through standard HTTP errors (like 404 Not Found)
    if isinstance(e, HTTPException):
        return e
    app.logger.error(f"Server Error: {e}")
    return render_template("500.html"), 500

@app.errorhandler(429)
def ratelimit_handler(e):
    return render_template("ratelimit.html"), 429

# API Endpoint for Posts with Like Counts and User Like Status
@app.route('/api/posts')
def api_posts():
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    category = request.args.get('category')
    
    query = """
        SELECT posts.*, users.username,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        WHERE posts.category != 'Events'
    """
    params = [current_user_id]
    
    if category:
        query += " AND posts.category = ?"
        params.append(category)
        
    query += " ORDER BY posts.id DESC"
    
    posts = db.execute(query, params).fetchall()
        
    # Convert database row objects to standard Python dictionaries for JSON serialization
    posts_list = [dict(row) for row in posts]
    return jsonify(posts_list)

# Groups Routes
@app.route("/groups")
def groups():
    db = get_db()
    all_groups = db.execute("""
        SELECT g.*, u.username 
        FROM groups g 
        JOIN users u ON g.user_id = u.id 
        ORDER BY g.created_at DESC
    """).fetchall()
    return render_template("groups.html", groups=all_groups)

## Create Group Route with Ownership Check
@app.route('/group/create', methods=['GET', 'POST'])
@login_required
def create_group():
    db = get_db()
    current_user_id = g.user['id']
    
    # Check if user already owns a group chat
    existing_group = db.execute('SELECT id FROM groups WHERE user_id = ?', [current_user_id]).fetchone()
    if existing_group:
        flash('You already have a group chat!', 'error')
        return redirect(url_for('group_detail', group_id=existing_group['id']))
    
    if request.method == 'POST':
        name = request.form.get('name')
        description = request.form.get('description')
        
        if not name or not description:
            flash('Both name and description are required.', 'error')
        else:
            cursor = db.cursor()
            cursor.execute('INSERT INTO groups (user_id, name, description) VALUES (?, ?, ?)',
                        [current_user_id, name, description])
            db.commit()
            group_id = cursor.lastrowid
            flash('Group chat created successfully!', 'success')
            return redirect(url_for('group_detail', group_id=group_id))
            
    return render_template('create_group.html')

## Group Detail Route with Posts
@app.route("/group/<int:group_id>")
def group_detail(group_id):
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    
    # 1. Fetch the group details
    group = db.execute("""
        SELECT g.*, u.username 
        FROM groups g 
        JOIN users u ON g.user_id = u.id 
        WHERE g.id = ?
    """, (group_id,)).fetchone()
    
    if not group:
        flash("Group not found.", "error")
        return redirect(url_for('groups'))
        
    # 2. Fetch posts belonging specifically to this group
    posts = db.execute("""
        SELECT posts.*, users.username,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        WHERE posts.group_id = ?
        ORDER BY posts.created_at DESC
    """, (current_user_id, group_id)).fetchall()
    
    return render_template("group_detail.html", group=group, posts=posts)

# STEM Extras Route
@app.route('/stem-extras')
def stem_extras():
    return render_template('stem-extras.html')

# Inline SVG Filter for Jinja2
@app.template_filter('inline_svg')
def inline_svg(filename, width=20, height=20, class_name=""):
    """Reads an SVG file from static/ and embeds its raw XML directly into HTML."""
    filepath = os.path.join(app.static_folder, filename)
    
    if not os.path.exists(filepath):
        return Markup(f'<!-- SVG {filename} not found -->')
        
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            svg_content = f.read()
            
        # Wrap in a controlled span container to guarantee rigid dimensions in flexbox
        wrapper = (
            f'<span class="inline-svg-wrapper {class_name}" '
            f'style="display: inline-flex; align-items: center; justify-content: center; '
            f'width: {width}px; height: {height}px; flex-shrink: 0;">'
            f'{svg_content}'
            f'</span>'
        )
        return Markup(wrapper)
    except Exception as e:
        return Markup(f'<!-- Error loading {filename}: {e} -->')

if __name__ == "__main__":
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(host="0.0.0.0", port=80)