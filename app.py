from __future__ import annotations
import time
from flask_wtf.csrf import CSRFProtect
from werkzeug.exceptions import HTTPException
from werkzeug.utils import secure_filename
import os
from dotenv import load_dotenv
import re
from datetime import timedelta
from flask import abort

import psycopg2
import psycopg2.extras

load_dotenv()

import sqlite3
from pathlib import Path
import smtplib
from email.message import EmailMessage
import requests

from flask import (
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

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_serializer():
    return URLSafeTimedSerializer(app.secret_key)

def generate_verification_token(email):
    serializer = get_serializer()
    return serializer.dumps(email, salt='email-verification-salt')

def confirm_verification_token(token, expiration=3600): # Expires in 1 hour (3600 seconds)
    serializer = get_serializer()
    try:
        email = serializer.loads(token, salt='email-verification-salt', max_age=expiration)
    except Exception:
        return None
    return email

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

BLOCKED_DOMAINS = {
    # IP Grabbers / Trackers
    "iplogger.org", "iplogger.com", "iplogger.ru", "2no.co", "yip.su", 
    "grabify.link", "blasze.com", "cest.la", "spotlogger.com", "iplogger.co",
    # Explicit Adult Content Domains
    "pornhub.com", "xvideos.com", "xnxx.com", "stripchat.com", "cam4.com", 
    "redtube.com", "youporngay.com", "hentaihaven.xxx"
}

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


# Path Configuration
BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "project.db"
SCHEMA = BASE_DIR / "schema.sql"

# Flask App Initialization
app = Flask(__name__)
app.config["SESSION_PERMANENT"] = False
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)

if not app.debug:
    app.config.update(
        SESSION_COOKIE_SECURE=True,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
    )
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "fallback-dev-key-change-in-prod")
csrf = CSRFProtect(app)  

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm'}
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

ALLOWED_PFP_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
def allowed_pfp_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_PFP_EXTENSIONS


class PostgresCursorWrapper:
    """Wraps psycopg2 cursor to support .lastrowid seamlessly."""
    def __init__(self, cursor, lastrowid=None):
        self._cursor = cursor
        self.lastrowid = lastrowid

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
    """
    Makes PostgreSQL behave like SQLite:
    1. Replaces '?' placeholders with '%s'.
    2. Automatically appends 'RETURNING id' to INSERT statements so cursor.lastrowid works.
    """
    def __init__(self, conn):
        self.conn = conn

    def execute(self, query, params=()):
        cursor = self.conn.cursor()
        postgres_query = query.replace("?", "%s")
        
        is_insert = postgres_query.strip().upper().startswith("INSERT")
        has_returning = "RETURNING" in postgres_query.upper()
        
        lastrowid = None
        if is_insert and not has_returning:
            postgres_query = postgres_query.rstrip().rstrip(";") + " RETURNING id;"
            cursor.execute(postgres_query, params)
            result = cursor.fetchone()
            if result:
                lastrowid = result["id"] if isinstance(result, dict) and "id" in result else result[0]
        else:
            cursor.execute(postgres_query, params)

        return PostgresCursorWrapper(cursor, lastrowid=lastrowid)

    def cursor(self):
        return self.conn.cursor()

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
db_url = os.environ.get("DATABASE_URL", "sqlite:///app.db")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False



@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        identifier = request.form.get("username_or_email", "").strip()
        password = request.form.get("password", "")
        remember = request.form.get("remember")  # <--- Read the "remember" checkbox value

        if not identifier or not password:
            flash("Please enter both your username/email and password.", "danger")
            return render_template("login.html")

        db = get_db()
        
        try:
            # Check if the identifier matches EITHER the username OR the email
            user = db.execute(
                "SELECT * FROM users WHERE username = ? OR email = ?", 
                (identifier, identifier)
            ).fetchone()

            if user is None:
                flash("Invalid username/email or password.", "danger")
            elif not check_password_hash(user["password_hash"], password):
                flash("Invalid username/email or password.", "danger")
            elif user["is_verified"] == 0:
                flash("Please verify your email address before logging in. Check your inbox.", "warning")
                return render_template("login.html")
            else:
                session.clear()
                # If checked, session becomes permanent (uses app.config["PERMANENT_SESSION_LIFETIME"])
                session.permanent = True if remember else False  # <--- Updated line
                session["user_id"] = user["id"]
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


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip()  # Capture email
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

        # Validation Checks
        if not username or not email or not password or not confirm_password or not age_str or not grade or not interest:
            flash("Please fill out all required fields.", "danger")
        elif password != confirm_password:
            flash("Passwords do not match.", "danger")
        elif len(password) < 8:
            flash("Password must be at least 8 characters long.", "danger")
        elif not any(c.isdigit() for c in password):
            flash("Password must contain at least one number.", "danger")
        elif not any(not c.isalnum() for c in password):
            flash("Password must contain at least one special character.", "danger")
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
            
            # Pre-check for existing email or username to give the specific error message
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
                token = generate_verification_token(email)
                send_verification_email(email, token)

            except (sqlite3.IntegrityError, psycopg2.Error) as e:
                print(f"Registration DB Error: {e}")
                db.rollback()  # Resets the aborted PostgreSQL transaction state
                flash("Registration failed. That username or email may already be in use.", "danger")
                return render_template("register.html")
            else:
                flash("Registration successful! Please check your email to verify your account before logging in.", "success")
                return redirect(url_for("login"))

    return render_template("register.html")


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
            db.commit()

    except Exception as e:
        print(f"Database initialization error: {e}")
        if hasattr(db, 'rollback'):
            db.rollback()
        elif hasattr(db, 'conn'):
            db.conn.rollback()

    app._db_checked = True


@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

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

@app.teardown_appcontext
def close_db(exception: BaseException | None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


# User Session Management
@app.before_request
def load_current_user() -> None:
    user_id = session.get("user_id")
    if user_id is None:
        g.user = None
    else:
        g.user = get_db().execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()


def login_required(view):
    def wrapped_view(*args, **kwargs):
        if g.get("user") is None:
            flash("Please log in to continue.", "warning")
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    wrapped_view.__name__ = view.__name__
    return wrapped_view


# Route Stubs
@app.route("/")
def index():
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    selected_category = request.args.get("category", "").strip()
    
    # Base query: Exclude 'Events' from the main feed
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
        WHERE posts.category != 'Events'
    """
    params = [current_user_id]
    
    # Apply category filter if selected
    if selected_category:
        query += " AND posts.category = ?"
        params.append(selected_category)
        
    query += " ORDER BY posts.created_at DESC"
    
    posts = db.execute(query, params).fetchall()
    
    return render_template("index.html", posts=posts, selected_category=selected_category)




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



@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("index"))


@app.route("/create", methods=("GET", "POST"))
def create_post():
    if g.get("user") is None:
        flash("Please log in to create a post.", "warning")
        return redirect(url_for("login"))

    db = get_db()
    parent_id = request.args.get("reply_to", type=int)
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
            return render_template("create.html", parent_post=parent_post)

        # Handle file/media upload to Supabase Storage
        file = request.files.get("media")
        if file and file.filename != '':
            if allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_filename = f"{g.user['id']}_{int(time.time())}_{filename}"
                file_bytes = file.read()
                
                try:
                    # Upload directly to the Supabase Storage bucket named 'uploads'
                    supabase.storage.from_("uploads").upload(
                        path=unique_filename,
                        file=file_bytes,
                        file_options={"content-type": file.content_type, "upsert": "false"}
                    )
                    
                    # Fetch the permanent public URL
                    public_url_response = supabase.storage.from_("uploads").get_public_url(unique_filename)
                    
                    if isinstance(public_url_response, dict):
                        media_path = public_url_response.get("publicUrl")
                    else:
                        media_path = public_url_response
                except Exception as e:
                    app.logger.error(f"Supabase upload error: {e}")
                    flash("Failed to upload media file to cloud storage.", "danger")
                    return render_template("create.html", parent_post=parent_post)
            else:
                flash("Invalid file type. Allowed: images (png, jpg, gif) and short videos (mp4, webm).", "danger")
                return render_template("create.html", parent_post=parent_post)

        # Insert into database with event fields and cloud media URL
        cursor = db.execute(
            """
            INSERT INTO posts (user_id, content, media_path, github_link, category, parent_id, event_type, event_time, event_location) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (g.user["id"], content, media_path, github_link, category, parent_id, event_type, event_time, event_location)
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
        return redirect(url_for("index"))

    return render_template("create.html", parent_post=parent_post)

from flask import jsonify

@app.route("/like/<int:post_id>", methods=["POST"])
@csrf.exempt
def toggle_like(post_id):
    if not g.get("user"):
        return jsonify({"error": "Unauthorized"}), 401
    
    db = get_db()
    cursor = db.cursor()  # Must use cursor for psycopg2
    user_id = g.user["id"]
    
    try:
        cursor.execute(
            "SELECT 1 FROM likes WHERE user_id = %s AND post_id = %s",
            (user_id, post_id)
        )
        existing_like = cursor.fetchone()
        
        if existing_like:
            cursor.execute("DELETE FROM likes WHERE user_id = %s AND post_id = %s", (user_id, post_id))
            liked = False
        else:
            cursor.execute("INSERT INTO likes (user_id, post_id) VALUES (%s, %s)", (user_id, post_id))
            liked = True
        
        db.commit()
        
        cursor.execute("SELECT COUNT(*) AS count FROM likes WHERE post_id = %s", (post_id,))
        count_row = cursor.fetchone()
        count = count_row["count"] if count_row else 0
        
        return jsonify({"liked": liked, "count": count})
    except Exception as e:
        db.rollback()
        print(f"Error in toggle_like: {e}")  # Prints directly to app.log
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()


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
            "SELECT id FROM users WHERE username = %s", (username,)
        ).fetchone()
        
        if target_user is None:
            flash(f"User @{username} does not exist.", "danger")
            return redirect(url_for("index"))
        user_id = target_user["id"]

    # 2. Fetch raw user record
    raw_user = db.execute(
        "SELECT * FROM users WHERE id = %s", (user_id,)
    ).fetchone()

    if not raw_user:
        flash("User not found.", "danger")
        return redirect(url_for("index"))

    # 3. Sanitize profile links into a dict
    profile_user = sanitize_profile_links(raw_user)

    # 4. Fetch user's posts (fixed ? to %s)
    posts = db.execute(
        """
        SELECT posts.*, users.username,
               parent_posts.content AS parent_content,
               parent_users.username AS parent_username,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = %s) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        LEFT JOIN posts AS parent_posts ON posts.parent_id = parent_posts.id 
        LEFT JOIN users AS parent_users ON parent_posts.user_id = parent_users.id 
        WHERE posts.user_id = %s
        ORDER BY posts.created_at DESC
        """,
        (current_user_id, profile_user["id"])
    ).fetchall()

    # 5. Fetch Follower and Following counts safely (fixed ? to %s)
    followers_row = db.execute(
        "SELECT COUNT(*) FROM follows WHERE following_id = %s", (profile_user["id"],)
    ).fetchone()
    followers_count = next(iter(followers_row.values())) if isinstance(followers_row, dict) else followers_row[0]
    
    following_row = db.execute(
        "SELECT COUNT(*) FROM follows WHERE follower_id = %s", (profile_user["id"],)
    ).fetchone()
    following_count = next(iter(following_row.values())) if isinstance(following_row, dict) else following_row[0]

    # 6. Check if current user is following this profile user (fixed ? to %s)
    is_following = False
    if g.get("user") and g.user["id"] != profile_user["id"]:
        check_follow = db.execute(
            "SELECT 1 FROM follows WHERE follower_id = %s AND following_id = %s",
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


@app.route("/profile/edit", methods=("GET", "POST"))
def edit_profile():
    # Security check: Ensure user is logged in
    if g.get("user") is None:
        flash("Please log in to edit your profile.", "danger")
        return redirect(url_for("login"))

    db = get_db()
    user_id = g.user["id"]  # Securely grabbed from session, cannot be spoofed

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
            profile_pic_path = g.user["profile_pic"]  # Keep existing PFP if no new file uploaded
            
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

            # Secure parameterized update query restricted to current user's ID
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

    # Fetch latest data for GET request
    profile_user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return render_template("edit_profile.html", profile_user=profile_user)


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
        # A single execute command using ON CONFLICT to prevent duplicates
        # No .fetchone() or .fetchall() needed!
        db.execute(
            """
            INSERT INTO follows (follower_id, following_id, created_at) 
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (follower_id, following_id) DO NOTHING
            """,
            (current_user_id, user_id)
        )
        
        # Safely commit using your wrapper
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
        # A simple delete command
        db.execute(
            "DELETE FROM follows WHERE follower_id = %s AND following_id = %s",
            (current_user_id, user_id)
        )
        
        # Safely commit using your wrapper
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

@app.route("/user/<username>/followers")
def followers(username):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = %s", (username,)).fetchone()
    if not user:
        flash("User not found.", "danger")
        return redirect(url_for("index"))

    followers_list = db.execute(
        """
        SELECT users.id, users.username, users.profile_pic 
        FROM follows 
        JOIN users ON follows.follower_id = users.id 
        WHERE follows.following_id = %s
        """,
        (user["id"],)
    ).fetchall()
    
    return render_template("followers.html", followers=followers_list, profile_user=user)


@app.route("/user/<username>/following")
def following(username):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = %s", (username,)).fetchone()
    if not user:
        flash("User not found.", "danger")
        return redirect(url_for("index"))

    following_list = db.execute(
        """
        SELECT users.id, users.username, users.profile_pic 
        FROM follows 
        JOIN users ON follows.following_id = users.id 
        WHERE follows.follower_id = %s
        """,
        (user["id"],)
    ).fetchall()
    
    return render_template("following.html", following=following_list, profile_user=user)

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

@app.route("/search")
def search():
    query = request.args.get("q", "").strip()
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    
    posts = []
    users = []
    
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

        # 2. Search users (by username or bio)
        users = db.execute(
            """
            SELECT id, username, profile_pic, bio, grade, interest 
            FROM users 
            WHERE username LIKE ? OR bio LIKE ? OR interest LIKE ?
            ORDER BY username ASC
            """,
            (search_term, search_term, search_term)
        ).fetchall()

    return render_template("search.html", posts=posts, users=users, query=query)

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

@app.context_processor
def inject_login_flag():
    # Pops the flag so it is only True on the very first page render after logging in
    just_logged_in = session.pop("just_logged_in", False)
    return dict(just_logged_in=just_logged_in)


@app.errorhandler(500)
@app.errorhandler(Exception)
def handle_500_error(e):
    # Pass through other HTTP status codes (like 404, 403)
    if isinstance(e, HTTPException) and e.code != 500:
        return e
    
    app.logger.error(f"Server Error: {e}")
    return render_template("500.html"), 500

if __name__ == "__main__":
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(host="0.0.0.0", port=80)