from __future__ import annotations
import time
from werkzeug.exceptions import HTTPException
from werkzeug.utils import secure_filename
import os
from dotenv import load_dotenv
import re
from datetime import timedelta
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import psycopg2
import psycopg2.extras
import sqlite3
from pathlib import Path
import requests
from functools import wraps

from flask import (
    jsonify,
    Flask,
    g,
    request,
    session,
    url_for,
    redirect
)
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from itsdangerous import URLSafeTimedSerializer
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# Frontend URL for Redirects (e.g., Email Verification)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# Path Configuration
BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "project.db"
SCHEMA = BASE_DIR / "schema.sql"

# Flask App Initialization
app = Flask(__name__)
# Enable CORS for React integration, allowing credentials (cookies/sessions) to be passed
CORS(app, supports_credentials=True, origins=[FRONTEND_URL, "http://127.0.0.1:3000"])

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

# Blocked Domains for Security
BLOCKED_DOMAINS = {
    "iplogger.org", "iplogger.com", "iplogger.ru", "2no.co", "yip.su", 
    "grabify.link", "blasze.com", "cest.la", "spotlogger.com", "iplogger.co",
    "pornhub.com", "xvideos.com", "xnxx.com", "stripchat.com", "cam4.com", 
    "redtube.com", "youporngay.com", "hentaihaven.xxx"
}

# File Upload Configuration (Configured for up to 36 MB and GIF/multimedia support)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'webp'}
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 36 * 1024 * 1024
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ALLOWED_PFP_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
def allowed_pfp_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_PFP_EXTENSIONS
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Database Configuration
db_url = os.environ.get("DATABASE_URL", "sqlite:///app.db")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Rate Limiting Configuration
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["50 per hour"],
    storage_uri="memory://"
)

# Utility Functions for Email Verification
def get_serializer():
    return URLSafeTimedSerializer(app.secret_key)

def generate_verification_token(email):
    serializer = get_serializer()
    return serializer.dumps(email, salt='email-verification-salt')

def confirm_verification_token(token, expiration=3600):
    serializer = get_serializer()
    try:
        email = serializer.loads(token, salt='email-verification-salt', max_age=expiration)
    except Exception:
        return None
    return email

def send_verification_email(user_email, token):
    resend_api_key = os.environ.get("RESEND_API_KEY")
    if not resend_api_key:
        print("RESEND_API_KEY not found. Skipping email.")
        return
        
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
            <div style="font-family: -apple-system, sans-serif; text-align: center; padding: 40px;">
                <h2>Welcome to STEMNet Greece!</h2>
                <p>Please verify your email address below to activate your account.</p>
                <a href="{verify_url}" style="padding: 14px 32px; background-color: #3ba47c; color: white; text-decoration: none; border-radius: 8px;">Verify Email</a>
            </div>
        """
    }
    try:
        requests.post("https://api.resend.com/emails", headers=headers, json=data)
    except Exception as e:
        print(f"Error sending email: {e}")

def sanitize_profile_links(user):
    if not user: return None
    user_dict = dict(user)
    
    github_val = user_dict.get("github_user")
    if github_val:
        github_val = github_val.strip()
        if not github_val.startswith("http"):
            user_dict["github_user"] = f"https://github.com/{github_val}"
    
    link_keys = ["linkedin_url", "custom_link_1", "custom_link_2", "custom_link_3", "custom_link_4", "custom_link_5"]
    for link_key in link_keys:
        url = user_dict.get(link_key)
        if url and isinstance(url, str):
            url = url.strip()
            if url and not (url.startswith("http://") or url.startswith("https://")):
                user_dict[link_key] = f"https://{url}"
            else:
                user_dict[link_key] = url
    return user_dict

# Database Wrappers
class PostgresCursorWrapper:
    def __init__(self, cursor):
        self._cursor = cursor
        self.lastrowid = None

    def execute(self, query, params=()):
        postgres_query = query.replace("?", "%s")
        is_insert = postgres_query.strip().upper().startswith("INSERT")
        has_returning = "RETURNING" in postgres_query.upper()
        
        if is_insert and not has_returning:
            postgres_query = postgres_query.rstrip().rstrip(";") + " RETURNING id;"
            self._cursor.execute(postgres_query, params)
            result = self._cursor.fetchone()
            if result:
                self.lastrowid = result.get("id") if isinstance(result, dict) else result[0]
        else:
            self._cursor.execute(postgres_query, params)
        return self

    def fetchone(self): return self._cursor.fetchone()
    def fetchall(self): return self._cursor.fetchall()
    def fetchmany(self, size=None): return self._cursor.fetchmany(size) if size else self._cursor.fetchmany()
    def __iter__(self): return iter(self._cursor)
    def __getattr__(self, name): return getattr(self._cursor, name)

class PostgresWrapper:
    def __init__(self, conn):
        self.conn = conn
    def cursor(self): return PostgresCursorWrapper(self.conn.cursor())
    def execute(self, query, params=()): return self.cursor().execute(query, params)
    def commit(self): self.conn.commit()
    def rollback(self): self.conn.rollback()
    def close(self): self.conn.close()

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
            connection.execute("PRAGMA foreign_keys = ON;")
            g.db = connection
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None and hasattr(db, 'close'):
        db.close()

@app.before_request
def upgrade_database():
    if getattr(app, '_db_checked', False): return
    db = get_db()
    is_postgres = bool(os.environ.get("DATABASE_URL"))
    try:
        with app.open_resource("schema.sql", mode="r") as f:
            schema_script = f.read()
        if is_postgres:
            schema_script = re.sub(r'(?i)PRAGMA\s+[^;]+;', '', schema_script)
            schema_script = re.sub(r'(?i)INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT', 'SERIAL PRIMARY KEY', schema_script)
            raw_conn = db.conn if hasattr(db, 'conn') else db
            with raw_conn.cursor() as cur:
                try:
                    cur.execute(schema_script)
                except Exception as se:
                    if hasattr(raw_conn, 'rollback'): raw_conn.rollback()
                    print(f"Schema script skipped existing elements: {se}")
        else:
            db.cursor().executescript(schema_script)
        db.commit()

        # Safely add missing columns to PostgreSQL or SQLite without crashing
        alter_cols = [
            ("posts", "parent_id INTEGER"),
            ("posts", "event_type TEXT"),
            ("posts", "event_time TEXT"),
            ("posts", "event_location TEXT"),
            ("posts", "group_id INTEGER"),
            ("users", "failed_attempts INTEGER DEFAULT 0"),
            ("users", "locked_until REAL DEFAULT 0")
        ]

        if is_postgres:
            for table, col_def in alter_cols:
                try:
                    db.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_def};")
                    db.commit()
                except Exception:
                    if hasattr(db, 'rollback'): db.rollback()
        else:
            for table, col_def in alter_cols:
                col_name = col_def.split()[0]
                cursor = db.execute(f"PRAGMA table_info({table});")
                existing_cols = [row["name"] for row in cursor.fetchall()]
                if col_name not in existing_cols:
                    db.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def.split(' ', 1)[1]};")
            db.commit()
    except Exception as e:
        print(f"Database initialization notice: {e}")
        if hasattr(db, 'rollback'): db.rollback()
        elif hasattr(db, 'conn'): db.conn.rollback()
    app._db_checked = True

@app.before_request
def load_current_user():
    user_id = session.get("user_id")
    if user_id is None:
        g.user = None
    else:
        g.user = get_db().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
def login_required(view):
    @wraps(view)
    def wrapped_view(*args, **kwargs):
        if g.get("user") is None:
            return jsonify({"error": "Unauthorized. Please log in."}), 401
        return view(*args, **kwargs)
    return wrapped_view

@app.route("/api/auth/me", methods=["GET"])
def get_current_user():
    if g.get("user"):
        user_dict = sanitize_profile_links(g.user)
        user_dict.pop("password_hash", None)
        return jsonify({"user": user_dict}), 200
    return jsonify({"user": None}), 200

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or request.form

    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")
    age_str = data.get("age", "").strip()
    grade = data.get("grade", "").strip()
    interest = data.get("interest", "").strip()

    if not all([username, email, password, confirm_password, age_str, grade, interest]):
        return jsonify({"error": "Please fill out all required fields."}), 400
    if password != confirm_password:
        return jsonify({"error": "Passwords do not match."}), 400
    if len(password) < 8 or not any(c.isdigit() for c in password) or not any(not c.isalnum() for c in password):
        return jsonify({"error": "Password does not meet complexity requirements."}), 400
        
    try:
        age = int(age_str)
        if age < 10 or age > 100: 
            return jsonify({"error": "Please enter a realistic age."}), 400
    except ValueError:
        return jsonify({"error": "Age must be a valid number."}), 400

    db = get_db()
    existing_user = db.execute("SELECT username, email FROM users WHERE username = ? OR email = ?", (username, email)).fetchone()

    if existing_user:
        if existing_user["email"] == email: 
            return jsonify({"error": "Email already registered."}), 400
        elif existing_user["username"] == username: 
            return jsonify({"error": "Username taken."}), 400

    try:
        db.execute(
            """INSERT INTO users (username, email, password_hash, age, grade, interest) VALUES (?, ?, ?, ?, ?, ?)""",
            (username, email, generate_password_hash(password), age, grade, interest)
        )
        db.commit()
        token_email = generate_verification_token(email)
        send_verification_email(email, token_email)
        return jsonify({"success": True, "message": "Registration successful! Please check your email to verify."}), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": "Registration failed due to a database error."}), 500

@app.route("/api/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    data = request.get_json(silent=True) or request.form or {}
    
    identifier = (
        data.get("username_or_email") or 
        data.get("username") or 
        data.get("email") or ""
    ).strip()
    password = data.get("password", "")
    remember = data.get("remember", False)

    if not identifier or not password:
        return jsonify({"error": "Missing credentials"}), 400

    db = get_db()
    user = db.execute(
        "SELECT * FROM users WHERE username = ? OR email = ?", 
        (identifier, identifier)
    ).fetchone()

    if user is None:
        return jsonify({"error": "Invalid credentials"}), 401

    user_dict = dict(user)
    current_time = time.time()
    locked_until = user_dict.get("locked_until", 0) or 0
    if locked_until > current_time:
        return jsonify({"error": "Account temporarily locked."}), 403

    if not check_password_hash(user_dict["password_hash"], password):
        failed_attempts = user_dict.get("failed_attempts", 0) + 1
        new_locked_until = current_time + 300 if failed_attempts >= 5 else 0
        db.execute(
            "UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?", 
            (failed_attempts, new_locked_until, user_dict["id"])
        )
        db.commit()
        return jsonify({"error": "Invalid credentials"}), 401

    if user_dict.get("is_verified") == 0:
        return jsonify({"error": "Email not verified.", "needs_verification": True}), 403

    db.execute(
        "UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?", 
        (user_dict["id"],)
    )
    db.commit()

    session.clear()
    session.permanent = bool(remember)
    session["user_id"] = user_dict["id"]
    
    user_dict.pop("password_hash", None)
    return jsonify({"success": True, "user": sanitize_profile_links(user_dict)}), 200


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True}), 200

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({"posts": [], "groups": [], "users": []}), 200

    try:
        search_term = f"%{query}%"
        db = get_db()
        
        # Get current user id from session if logged in
        current_user_id = session.get('user_id', 0)
        
        posts = db.execute('''
            SELECT posts.*, users.username, users.profile_pic,
                   (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
                   (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) as user_liked
            FROM posts
            JOIN users ON posts.user_id = users.id
            WHERE posts.content LIKE ? OR posts.category LIKE ?
            ORDER BY posts.created_at DESC
            LIMIT 10
        ''', (current_user_id, search_term, search_term)).fetchall()
        
        groups = db.execute('''
            SELECT groups.*, users.username AS owner_username
            FROM groups
            JOIN users ON groups.user_id = users.id
            WHERE groups.name LIKE ? OR groups.description LIKE ?
            ORDER BY groups.created_at DESC
            LIMIT 10
        ''', (search_term, search_term)).fetchall()
        
        users = db.execute('''
            SELECT id, username, profile_pic, bio, interest
            FROM users
            WHERE username LIKE ? OR bio LIKE ? OR interest LIKE ?
            LIMIT 10
        ''', (search_term, search_term, search_term)).fetchall()
        
        return jsonify({
            "posts": [dict(p) for p in posts],
            "groups": [dict(g) for g in groups],
            "users": [dict(u) for u in users]
        }), 200

    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({'error': 'An error occurred while searching'}), 500
    
@app.route("/api/verify/<token>")
def verify_email(token):
    email = confirm_verification_token(token)
    if not email:
        return redirect(f"{FRONTEND_URL}/login?error=invalid_token")

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not user:
        return redirect(f"{FRONTEND_URL}/login?error=user_not_found")
        
    db.execute("UPDATE users SET is_verified = 1 WHERE email = ?", (email,))
    db.commit()
    return redirect(f"{FRONTEND_URL}/login?verified=true")

#Post related Endpoints
@app.route("/api/posts/create", methods=["POST"])
@login_required
def create_post():
    db = get_db()
    
    content = request.form.get("content", "").strip()
    category = request.form.get("category", "").strip()
    parent_id = request.form.get("reply_to", type=int)
    group_id = request.form.get("group_id", type=int)
    
    if not content: return jsonify({"error": "Content cannot be empty."}), 400
    
    github_link = request.form.get("github_link", "").strip() or None
    event_type = request.form.get("event_type", "").strip() if category == "Events" else None
    event_time = request.form.get("event_time", "").strip() if category == "Events" else None
    event_location = request.form.get("event_location", "").strip() if category == "Events" else None

    media_path = None
    file = request.files.get("media")
    if file and file.filename != '' and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = f"{g.user['id']}_{int(time.time())}_{filename}"
        if supabase:
            try:
                supabase.storage.from_("uploads").upload(
                    path=unique_filename, file=file.read(),
                    file_options={"content-type": file.content_type, "upsert": "false"}
                )
                media_path = supabase.storage.from_("uploads").get_public_url(unique_filename)
            except Exception as e:
                app.logger.error(f"Supabase upload error: {e}")
                return jsonify({"error": "Failed to upload media."}), 500

    cursor = db.execute(
        """INSERT INTO posts (user_id, content, media_path, github_link, category, parent_id, event_type, event_time, event_location, group_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (g.user["id"], content, media_path, github_link, category, parent_id, event_type, event_time, event_location, group_id)
    )
    post_id = cursor.lastrowid

    if parent_id:
        parent_author = db.execute("SELECT user_id FROM posts WHERE id = ?", (parent_id,)).fetchone()
        if parent_author and parent_author["user_id"] != g.user["id"]:
            db.execute("INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)",
                       (parent_author["user_id"], g.user["id"], "reply", post_id))

    db.commit()
    return jsonify({"success": True, "post_id": post_id}), 201

@app.route("/api/posts", methods=["GET"])
def get_posts():
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    category = request.args.get('category')
    
    query = """
        SELECT posts.*, users.username, users.profile_pic,
               parent_posts.content AS parent_content,
               parent_users.username AS parent_username,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        LEFT JOIN posts AS parent_posts ON posts.parent_id = parent_posts.id 
        LEFT JOIN users AS parent_users ON parent_posts.user_id = parent_users.id 
        WHERE posts.group_id IS NULL
    """
    params = [current_user_id]
    
    if category:
        query += " AND posts.category = ?"
        params.append(category)
    else:
        query += " AND posts.category != 'Events'"
        
    query += " ORDER BY posts.created_at DESC"
    posts = db.execute(query, params).fetchall()
    
    return jsonify([dict(row) for row in posts]), 200

@app.route("/api/posts/<int:post_id>", methods=["GET"])
def api_get_single_post(post_id):
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0

    try:
        db.execute(
            """
            DELETE FROM posts 
            WHERE event_time IS NOT NULL 
              AND event_time != '' 
              AND (
                  datetime(event_time) < datetime('now')
                  OR date(event_time) < date('now')
              )
            """
        )
        db.commit()
    except Exception as e:
        db.rollback()


    post = db.execute(
        """
        SELECT posts.*, users.username, users.profile_pic,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        WHERE posts.id = ?
        """, 
        (current_user_id, post_id)
    ).fetchone()
    
    if not post:
        return jsonify({"error": "Event not found or has expired."}), 404
        
    post_dict = dict(post)
    
    comments_cursor = db.execute(
        """
        SELECT posts.*, users.username, users.profile_pic,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        WHERE posts.parent_id = ? OR posts.reply_to = ?
        ORDER BY posts.created_at ASC
        """,
        (current_user_id, post_id, str(post_id))
    ).fetchall()
    
    comments = [dict(row) for row in comments_cursor]
    
    return jsonify({
        "post": post_dict,
        "comments": comments
    }), 200

@app.route("/api/posts/<int:post_id>", methods=["PUT", "POST"])
def api_update_post(post_id):
    if not g.get("user"):
        return jsonify({"error": "Unauthorized"}), 401
        
    db = get_db()
    user_id = g.user["id"]
    
    post = db.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        return jsonify({"error": "Post not found"}), 404
        
    if post["user_id"] != user_id:
        return jsonify({"error": "Permission denied"}), 403
        
    data = request.get_json()
    new_content = data.get("content")
    
    if not new_content:
        return jsonify({"error": "Content cannot be empty"}), 400
        
    try:
        db.execute("UPDATE posts SET content = ? WHERE id = ?", (new_content, post_id))
        db.commit()
        return jsonify({"success": True, "message": "Post updated successfully"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
 
@app.route("/api/posts/<int:post_id>/comments", methods=["PUT","POST"])
def api_update_comment(post_id):
    if not g.get("user"):
        return jsonify({"error": "Unauthorized"}), 401
        
    db = get_db()
    user_id = g.user["id"]
    
    post = db.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        return jsonify({"error": "Post not found"}), 404
        
    if post["user_id"] != user_id:
        return jsonify({"error": "Permission denied"}), 403
        
    data = request.get_json(silent=True)
    if not data or "content" not in data:
        return jsonify({"error": "Invalid request: JSON body with 'content' is required"}), 400
        
    new_content = data.get("content").strip()
    if not new_content:
        return jsonify({"error": "Content cannot be empty"}), 400
        
    try:
        db.execute("UPDATE posts SET content = ? WHERE id = ?", (new_content, post_id))
        db.commit()
        return jsonify({"success": True, "message": "Post updated successfully"}), 200
    except Exception as e:
        db.rollback()
        # TODO: app.logger.error(f"Database error: {str(e)}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route("/api/posts/<int:post_id>", methods=["GET"])
@app.route("/api/post/<int:post_id>", methods=["GET"])
@app.route("/api/posts/<int:post_id>/thread", methods=["GET"])
def api_get_post_thread(post_id):
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    
    # Fetch main post
    post = db.execute(
        """
        SELECT posts.*, users.username, users.profile_pic,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        WHERE posts.id = ?
        """, 
        (current_user_id, post_id)
    ).fetchone()
    
    if not post:
        return jsonify({"error": "Post not found"}), 404
        
    post_dict = dict(post)
    
    # Fetch parent post if any
    parent_post = None
    if post_dict.get("parent_id"):
        parent = db.execute(
            """
            SELECT posts.*, users.username, users.profile_pic,
                   (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
                   (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
            FROM posts 
            JOIN users ON posts.user_id = users.id 
            WHERE posts.id = ?
            """, 
            (current_user_id, post_dict["parent_id"])
        ).fetchone()
        if parent:
            parent_post = dict(parent)
            
    # Fetch replies
    replies_cursor = db.execute(
        """
        SELECT posts.*, users.username, users.profile_pic,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        WHERE posts.parent_id = ?
        ORDER BY posts.created_at ASC
        """,
        (current_user_id, post_id)
    ).fetchall()
    
    replies = [dict(row) for row in replies_cursor]
    
    return jsonify({
        "post": post_dict,
        "parent": parent_post,
        "replies": replies
    }), 200

@app.route("/api/posts/<int:post_id>/edit", methods=["POST", "PUT"])
@login_required
def api_edit_post(post_id):
    db = get_db()
    user_id = g.user["id"]
    
    post = db.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        return jsonify({"error": "Post not found"}), 404
    
    if post["user_id"] != user_id:
        return jsonify({"error": "You do not have permission to edit this post."}), 403
        
    # Extract form fields (FormData sends data via request.form)
    content = request.form.get("content", "").strip() or request.json.get("content", "").strip() if request.is_json else request.form.get("content", "").strip()
    category = request.form.get("category", "").strip() or (request.json.get("category", "").strip() if request.is_json else request.form.get("category", "").strip())
    
    github_link = None
    event_type = None
    event_time = None
    event_location = None
    
    # Handle category-specific fields safely for both Form data and JSON fallback
    if request.is_json:
        get_val = lambda key: request.json.get(key, "").strip()
    else:
        get_val = lambda key: request.form.get(key, "").strip()

    category = request.form.get("category") or (request.json.get("category") if request.is_json else "")
    category = category.strip()

    if category == "Events":
        event_type = get_val("event_type")
        event_time = get_val("event_time")
        event_location = get_val("event_location")
    else:
        github_link = get_val("github_link") or None
        if category == "Other":
            custom_category = get_val("custom_category")
            category = custom_category if custom_category else "Other"
            
    if not content:
        return jsonify({"error": "Post content cannot be empty."}), 400
        
    # --- IMAGE HANDLING ---
    # Start by keeping the existing image path from the database row
    media_path = post["media_path"] # Change to post["image_url"] if your column is named differently
    
    # Check if a new file was uploaded in request.files
    if "image" in request.files:
        file = request.files["image"]
        if file and file.filename != "" and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Ensure unique filenames if necessary, or save directly:
            upload_folder = app.config.get("UPLOAD_FOLDER", "static/uploads")
            os.makedirs(upload_folder, exist_ok=True)
            
            file_path = os.path.join(upload_folder, filename)
            file.save(file_path)
            
            # Save the relative path to be stored in the database
            media_path = f"uploads/{filename}"

    try:
        db.execute(
            """
            UPDATE posts 
            SET content = ?, category = ?, github_link = ?, event_type = ?, event_time = ?, event_location = ?, media_path = ?
            WHERE id = ?
            """,
            (content, category, github_link, event_type, event_time, event_location, media_path, post_id)
        )
        db.commit()
        return jsonify({"success": True, "message": "Post updated successfully!"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/api/posts/<int:post_id>/delete", methods=["POST", "DELETE"])
@login_required
def api_delete_post(post_id):
    db = get_db()
    user_id = g.user["id"]
    
    post = db.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        return jsonify({"error": "Post not found"}), 404
        
    if post["user_id"] != user_id:
        return jsonify({"error": "You do not have permission to delete this post."}), 403
        
    try:
        # Clean up associated database entries (matching your reference logic)
        db.execute("DELETE FROM likes WHERE post_id = ?", (post_id,))
        db.execute("DELETE FROM notifications WHERE post_id = ?", (post_id,))
        db.execute("DELETE FROM posts WHERE id = ?", (post_id,))
        db.commit()

        # Remove physical media file if it exists
        if post["media_path"]:
            file_name = post["media_path"].replace("uploads/", "")
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
            if os.path.exists(file_path):
                os.remove(file_path)
                
        return jsonify({"success": True, "message": "Post deleted successfully."}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
  
@app.route("/api/posts/<int:post_id>/like", methods=["POST"])
@login_required
def toggle_like(post_id):
    db = get_db()
    user_id = g.user["id"]

    # 1. Check if the post exists and get the author's ID
    post = db.execute("SELECT user_id FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        return jsonify({"error": "Post not found"}), 404

    # 2. Check if the user already liked the post
    existing_like = db.execute(
        "SELECT * FROM likes WHERE user_id = ? AND post_id = ?", 
        (user_id, post_id)
    ).fetchone()

    if existing_like:
        # UNLIKE: Remove the like and the associated notification
        db.execute("DELETE FROM likes WHERE user_id = ? AND post_id = ?", (user_id, post_id))
        db.execute(
            "DELETE FROM notifications WHERE user_id = ? AND actor_id = ? AND type = 'like' AND post_id = ?", 
            (post["user_id"], user_id, post_id)
        )
    else:
        # LIKE: Insert the like
        db.execute("INSERT INTO likes (user_id, post_id) VALUES (?, ?)", (user_id, post_id))
        
        # Trigger the notification (Make sure they aren't liking their own post)
        if post["user_id"] != user_id:
            db.execute(
                "INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, 'like', ?)",
                (post["user_id"], user_id, post_id)
            )
            
    db.commit()
    return jsonify({"success": True}), 200

   
#Profile related API Endpoints 
@app.route("/api/profile/<username>", methods=["GET"])
def profile(username):
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    
    raw_user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not raw_user: return jsonify({"error": "User not found"}), 404

    profile_user = sanitize_profile_links(raw_user)
    profile_user.pop("password_hash", None)

    posts = db.execute(
        """SELECT posts.*, users.username,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
           FROM posts JOIN users ON posts.user_id = users.id 
           WHERE posts.user_id = ? ORDER BY posts.created_at DESC""",
        (current_user_id, profile_user["id"])
    ).fetchall()

    f_row = db.execute("SELECT COUNT(*) as c FROM follows WHERE following_id = ?", (profile_user["id"],)).fetchone()
    followers_count = f_row["c"] if f_row else 0
    
    fw_row = db.execute("SELECT COUNT(*) as c FROM follows WHERE follower_id = ?", (profile_user["id"],)).fetchone()
    following_count = fw_row["c"] if fw_row else 0

    is_following = False
    if current_user_id and current_user_id != profile_user["id"]:
        check = db.execute("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?", (current_user_id, profile_user["id"])).fetchone()
        is_following = bool(check)

    return jsonify({
        "user": profile_user,
        "posts": [dict(p) for p in posts],
        "stats": {"followers": followers_count, "following": following_count},
        "is_following": is_following
    }), 200

@app.route("/api/profile/edit", methods=["POST"])
@login_required
def edit_profile():
    data = request.form if request.form else (request.get_json(silent=True) or {})
    
    age_raw = data.get("age")
    age = int(age_raw) if age_raw and str(age_raw).isdigit() else None
    grade = data.get("grade", "").strip()
    interest = data.get("interest", "").strip()
    bio = data.get("bio", "").strip()
    github_user = data.get("github_user", "").strip()
    linkedin_url = data.get("linkedin_url", "").strip()
    custom_link_1 = data.get("custom_link_1", "").strip()
    custom_link_2 = data.get("custom_link_2", "").strip()
    custom_link_3 = data.get("custom_link_3", "").strip()
    custom_link_4 = data.get("custom_link_4", "").strip()
    custom_link_5 = data.get("custom_link_5", "").strip()

    file = request.files.get("profile_pic")
    profile_pic_url = None

    if file and file.filename != '' and allowed_pfp_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = f"pfp_{g.user['id']}_{int(time.time())}_{filename}"
        if supabase:
            try:
                supabase.storage.from_("uploads").upload(
                    path=unique_filename, file=file.read(),
                    file_options={"content-type": file.content_type, "upsert": "true"}
                )
                profile_pic_url = supabase.storage.from_("uploads").get_public_url(unique_filename)
            except Exception as e:
                app.logger.error(f"Supabase PFP upload error: {e}")
                return jsonify({"error": "Failed to upload image"}), 500
        else:
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)
            profile_pic_url = f"/static/uploads/{unique_filename}"

    db = get_db()
    try:
        if profile_pic_url:
            db.execute(
                """UPDATE users SET age = ?, grade = ?, interest = ?, bio = ?, 
                   github_user = ?, linkedin_url = ?, custom_link_1 = ?, custom_link_2 = ?, 
                   custom_link_3 = ?, custom_link_4 = ?, custom_link_5 = ?, profile_pic = ? 
                   WHERE id = ?""",
                (age, grade, interest, bio, github_user, linkedin_url, 
                 custom_link_1, custom_link_2, custom_link_3, custom_link_4, custom_link_5, 
                 profile_pic_url, g.user["id"])
            )
        else:
            db.execute(
                """UPDATE users SET age = ?, grade = ?, interest = ?, bio = ?, 
                   github_user = ?, linkedin_url = ?, custom_link_1 = ?, custom_link_2 = ?, 
                   custom_link_3 = ?, custom_link_4 = ?, custom_link_5 = ? 
                   WHERE id = ?""",
                (age, grade, interest, bio, github_user, linkedin_url, 
                 custom_link_1, custom_link_2, custom_link_3, custom_link_4, custom_link_5, 
                 g.user["id"])
            )
        db.commit()
    except Exception as e:
        db.rollback()
        app.logger.error(f"Profile update error: {e}")
        return jsonify({"error": "Database error updating profile."}), 500

    updated_user = db.execute("SELECT * FROM users WHERE id = ?", (g.user["id"],)).fetchone()
    user_dict = sanitize_profile_links(dict(updated_user))
    user_dict.pop("password_hash", None)

    return jsonify({"success": True, "user": user_dict}), 200

@app.route("/api/follow/<int:user_id>", methods=["POST"])
@login_required
def follow(user_id):
    db = get_db()
    if g.user["id"] == user_id: 
        return jsonify({"error": "Cannot follow yourself"}), 400
        
    try:
        # Check if already following to avoid duplicate notifications
        existing = db.execute(
            "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?", 
            (g.user["id"], user_id)
        ).fetchone()
        
        if not existing:
            # Insert the follow record
            db.execute(
                "INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)", 
                (g.user["id"], user_id)
            )
            
            # Trigger the notification
            db.execute(
                "INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, 'follow', NULL)",
                (user_id, g.user["id"])
            )
            db.commit()
            
        return jsonify({"success": True}), 200
    except Exception as e:
        print(f"Follow error: {e}")
        return jsonify({"error": "Database error"}), 500

@app.route("/api/unfollow/<int:user_id>", methods=["POST"])
@login_required
def unfollow(user_id):
    db = get_db()
    try:
        db.execute("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", (g.user["id"], user_id))
        db.commit()
        return jsonify({"success": True}), 200
    except Exception:
        return jsonify({"error": "Database error"}), 500

@app.route("/api/followers/<username>", methods=["GET"])
def get_followers(username):
    db = get_db()
    target_user = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if not target_user:
        return jsonify({"error": "User not found"}), 404

    followers = db.execute(
        """SELECT u.id, u.username, u.profile_pic, u.bio 
           FROM follows f 
           JOIN users u ON f.follower_id = u.id 
           WHERE f.following_id = ?""",
        (target_user["id"],)
    ).fetchall()

    return jsonify([dict(row) for row in followers]), 200

@app.route("/api/following/<username>", methods=["GET"])
def get_following(username):
    db = get_db()
    target_user = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if not target_user:
        return jsonify({"error": "User not found"}), 404

    following = db.execute(
        """SELECT u.id, u.username, u.profile_pic, u.bio 
           FROM follows f 
           JOIN users u ON f.following_id = u.id 
           WHERE f.follower_id = ?""",
        (target_user["id"],)
    ).fetchall()

    return jsonify([dict(row) for row in following]), 200

# Events API Endpoint
@app.route("/api/events", methods=["GET"])
def get_events():
    db = get_db()
    user_id = session.get("user_id")
    
    if user_id:

        events = db.execute(
            """SELECT posts.*, users.username, 
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
               EXISTS(SELECT 1 FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) as user_liked
               FROM posts 
               JOIN users ON posts.user_id = users.id 
               WHERE posts.category = 'Events'
               ORDER BY posts.event_time ASC""",
            (user_id,)
        ).fetchall()
    else:

        events = db.execute(
            """SELECT posts.*, users.username, 
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
               0 as user_liked
               FROM posts 
               JOIN users ON posts.user_id = users.id 
               WHERE posts.category = 'Events'
               ORDER BY posts.event_time ASC"""
        ).fetchall()
    
    return jsonify([dict(row) for row in events]), 200

# Education API Endpoint
@app.route('/api/education', methods=['GET'])
def get_education_extras():
    return jsonify({
        "status": "success",
        "category": "STEMNet Greece Student Extra Vault",
        "total_categories": 7
    })
  
# Group API Endpoints  
@app.route("/api/groups/create", methods=["POST"])
@login_required
def create_group():
    db = get_db()
    name = request.form.get("name", "").strip()
    description = request.form.get("description", "").strip()
    
    if not name:
        return jsonify({"error": "Group name cannot be empty."}), 400
        
    cursor = db.execute(
        "INSERT INTO groups (user_id, name, description) VALUES (?, ?, ?)",
        (g.user["id"], name, description)
    )
    db.commit()
    return jsonify({"success": True, "group_id": cursor.lastrowid}), 201

@app.route("/api/groups", methods=["GET"])
def get_groups():
    db = get_db()
    groups = db.execute("SELECT g.*, u.username FROM groups g JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC").fetchall()
    return jsonify([dict(g) for g in groups]), 200

@app.route("/api/groups/<int:group_id>", methods=["GET"])
def get_group_details(group_id):
    db = get_db()
    group = db.execute("SELECT groups.*, users.username AS creator_username FROM groups JOIN users ON groups.user_id = users.id WHERE groups.id = ?", (group_id,)).fetchone()
    if not group:
        return jsonify({"error": "Group not found"}), 404
        
    # Fetch posts/discussions belonging specifically to this group
    current_user_id = g.user["id"] if g.get("user") else 0
    posts = db.execute(
        """
        SELECT posts.*, users.username, users.profile_pic,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        WHERE posts.group_id = ?
        ORDER BY posts.created_at DESC
        """,
        (current_user_id, group_id)
    ).fetchall()
    
    return jsonify({
        "group": dict(group),
        "posts": [dict(p) for p in posts]
    }), 200

#Notification API Endpoints
@app.route("/api/notifications", methods=["GET"])
@login_required
def api_get_notifications():
    db = get_db()
    
    # Safely fetch notifications, actors, and post content (if applicable)
    notifications = db.execute(
        """
        SELECT n.*, u.username AS actor_username, u.profile_pic AS actor_pic, p.content AS post_content
        FROM notifications n
        JOIN users u ON n.actor_id = u.id
        LEFT JOIN posts p ON n.post_id = p.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        """,
        (g.user["id"],)
    ).fetchall()
    
    return jsonify([dict(row) for row in notifications]), 200

@app.route("/api/notifications/unread", methods=["GET"])
@login_required
def check_unread():
    db = get_db()
    count = db.execute(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0", 
        (g.user["id"],)
    ).fetchone()
    return jsonify({"has_unread": count["count"] > 0}), 200

@app.route("/api/notifications/read", methods=["POST"])
@login_required
def mark_notifications_read():
    db = get_db()
    db.execute(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", 
        (g.user["id"],)
    )
    db.commit()
    return jsonify({"success": True}), 200

# Error Handlers for API
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not Found"}), 404

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Rate limit exceeded"}), 429
@app.errorhandler(500)

def server_error(e):
    return jsonify({"error": "Internal Server Error"}), 500

# Run the Flask app
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)