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
from urllib.parse import urlparse
import io
from PIL import Image

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

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

DATABASE = BASE_DIR / "project.db"
SCHEMA = BASE_DIR / "schema.sql"

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=[FRONTEND_URL, "http://127.0.0.1:3000"])

app.config["SESSION_PERMANENT"] = False
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)

if not app.debug:
    app.config.update(
        SESSION_COOKIE_SECURE=True,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
    )
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "fallback-dev-key-change-in-prod")

MANUAL_BLOCKED_DOMAINS = {
    "iplogger.org", "iplogger.com", "iplogger.ru", "2no.co", "yip.su",
    "grabify.link", "blasze.com", "cest.la", "spotlogger.com", "iplogger.co",
    "pornhub.com", "xvideos.com", "xnxx.com", "stripchat.com", "cam4.com",
    "redtube.com", "youporngay.com", "hentaihaven.xxx"
}

_blocked_domains_cache = None
_blocked_domains_cache_time = 0
BLOCKED_DOMAINS_CACHE_TTL = 3600

def fetch_urlhaus_blocklist():
    try:
        resp = requests.get(
            "https://urlhaus.abuse.ch/downloads/text_online/",
            timeout=10
        )
        if resp.status_code == 200:
            domains = set()
            for line in resp.text.splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                try:
                    parsed = urlparse(line)
                    if parsed.netloc:
                        domains.add(parsed.netloc.lower())
                except Exception:
                    continue
            return domains
    except Exception as e:
        print(f"Failed to fetch URLhaus list: {e}")
    return set()

def get_blocked_domains():
    global _blocked_domains_cache, _blocked_domains_cache_time
    now = time.time()
    if _blocked_domains_cache is None or (now - _blocked_domains_cache_time) > BLOCKED_DOMAINS_CACHE_TTL:
        remote = fetch_urlhaus_blocklist()
        _blocked_domains_cache = MANUAL_BLOCKED_DOMAINS | remote
        _blocked_domains_cache_time = now
    return _blocked_domains_cache

def extract_domain(url):
    if not url or not isinstance(url, str):
        return None
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return None

def is_blocked_url(url):
    domain = extract_domain(url)
    return bool(domain and domain in get_blocked_domains())

def contains_blocked_link(text):
    if not text or not isinstance(text, str):
        return False
    blocked = get_blocked_domains()
    url_pattern = re.compile(r'https?://[^\s<>"\']+|www\.[^\s<>"\']+')
    for match in url_pattern.findall(text):
        domain = extract_domain(match)
        if domain and domain in blocked:
            return True
    return False

BLOCKED_DOMAINS = MANUAL_BLOCKED_DOMAINS

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'webp'}
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ALLOWED_PFP_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
def allowed_pfp_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_PFP_EXTENSIONS
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_mime_type(filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
    }.get(ext, 'application/octet-stream')

def resize_image_if_needed(file_bytes, filename, max_dimension=1600):
    """Resizes static images (png/jpg/webp) to a max dimension on the long
    edge before upload, to reduce page weight. GIFs are left untouched to
    preserve animation, and videos are skipped entirely (no image codec)."""
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext not in ('png', 'jpg', 'jpeg', 'webp'):
        return file_bytes
    try:
        img = Image.open(io.BytesIO(file_bytes))
        width, height = img.size
        if max(width, height) <= max_dimension:
            return file_bytes
        if width > height:
            new_width = max_dimension
            new_height = round(height * (max_dimension / width))
        else:
            new_height = max_dimension
            new_width = round(width * (max_dimension / height))
        resized = img.resize((new_width, new_height), Image.LANCZOS)
        output = io.BytesIO()
        fmt = img.format if img.format else ('JPEG' if ext in ('jpg', 'jpeg') else 'PNG')
        if fmt == 'JPEG' and resized.mode in ('RGBA', 'P'):
            resized = resized.convert('RGB')
        resized.save(output, format=fmt, quality=85, optimize=True)
        return output.getvalue()
    except Exception as e:
        print(f"Image resize failed, using original: {e}")
        return file_bytes

def get_pagination_params():
    try:
        page = max(1, int(request.args.get('page', 1)))
    except (ValueError, TypeError):
        page = 1
    try:
        per_page = int(request.args.get('per_page', 20))
        per_page = min(max(per_page, 1), 50)
    except (ValueError, TypeError):
        per_page = 20
    offset = (page - 1) * per_page
    return page, per_page, offset

def get_search_pagination_params():
    """Separate from get_pagination_params() because search defaults to a
    smaller per-page count (10) suited to a multi-section preview layout,
    rather than the 20-per-page used for full-page feeds."""
    try:
        page = max(1, int(request.args.get('page', 1)))
    except (ValueError, TypeError):
        page = 1
    try:
        per_page = int(request.args.get('per_page', 10))
        per_page = min(max(per_page, 1), 50)
    except (ValueError, TypeError):
        per_page = 10
    offset = (page - 1) * per_page
    return page, per_page, offset

db_url = os.environ.get("DATABASE_URL", "sqlite:///app.db")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["50 per hour"],
    storage_uri=os.environ.get("REDIS_URL", "memory://")
)
RECAPTCHA_SECRET_KEY = os.environ.get("RECAPTCHA_SECRET_KEY")

def verify_recaptcha(token):
    if not RECAPTCHA_SECRET_KEY:
        app.logger.warning("RECAPTCHA_SECRET_KEY not set; skipping verification.")
        return True
    if not token:
        return False
    try:
        resp = requests.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data={"secret": RECAPTCHA_SECRET_KEY, "response": token},
            timeout=5
        )
        result = resp.json()
        return bool(result.get("success"))
    except Exception as e:
        app.logger.error(f"reCAPTCHA verification error: {e}")
        return False

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

    verify_url = f"{FRONTEND_URL}/api/verify/{token}"
    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "from": "STEMNet Greece <noreply@verify.stemnet.app>",
        "to": [user_email],
        "subject": "Verify your STEMNet Greece Account",
        "html": f"""
            <div style="background-color: #121212; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                <div style="max-width: 480px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 12px; overflow: hidden;">
                    <div style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #2a2a2a;">
                        <h1 style="margin: 0; color: #ccff00; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
                            STEMNet Greece
                        </h1>
                    </div>
                    <div style="padding: 32px; text-align: center;">
                        <h2 style="margin: 0 0 12px 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                            Welcome aboard!
                        </h2>
                        <p style="margin: 0 0 28px 0; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                            You're one step away from joining Greece's STEM and robotics community. Verify your email to activate your account.
                        </p>
                        <a href="{verify_url}" style="display: inline-block; padding: 14px 36px; background-color: #ccff00; color: #111111; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
                            Verify Email
                        </a>
                        <p style="margin: 28px 0 0 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                            If the button doesn't work, copy and paste this link into your browser:<br>
                            <a href="{verify_url}" style="color: #ccff00; word-break: break-all;">{verify_url}</a>
                        </p>
                    </div>
                    <div style="padding: 20px 32px; background-color: #0f0f0f; text-align: center; border-top: 1px solid #2a2a2a;">
                        <p style="margin: 0; color: #52525b; font-size: 12px;">
                            If you didn't create this account, you can safely ignore this email.
                        </p>
                    </div>
                </div>
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

def remove_or_softdelete_post(db, post_id, reassign_user_id=None):
    child_count_row = db.execute(
        "SELECT COUNT(*) as c FROM posts WHERE parent_id = ?", (post_id,)
    ).fetchone()
    has_children = child_count_row and child_count_row["c"] > 0

    if has_children:
        db.execute("DELETE FROM likes WHERE post_id = ?", (post_id,))
        db.execute("DELETE FROM notifications WHERE post_id = ?", (post_id,))
        db.execute("DELETE FROM event_attendees WHERE post_id = ?", (post_id,))
        if reassign_user_id:
            db.execute(
                """UPDATE posts
                   SET content = 'This post has been deleted.',
                       media_path = NULL,
                       github_link = NULL,
                       event_type = NULL,
                       event_time = NULL,
                       event_location = NULL,
                       is_deleted = 1,
                       user_id = ?
                   WHERE id = ?""",
                (reassign_user_id, post_id)
            )
        else:
            db.execute(
                """UPDATE posts
                   SET content = 'This post has been deleted.',
                       media_path = NULL,
                       github_link = NULL,
                       event_type = NULL,
                       event_time = NULL,
                       event_location = NULL,
                       is_deleted = 1
                   WHERE id = ?""",
                (post_id,)
            )
        return False
    else:
        db.execute("DELETE FROM likes WHERE post_id = ?", (post_id,))
        db.execute("DELETE FROM notifications WHERE post_id = ?", (post_id,))
        db.execute("DELETE FROM event_attendees WHERE post_id = ?", (post_id,))
        db.execute("DELETE FROM posts WHERE id = ?", (post_id,))
        return True

class PostgresCursorWrapper:
    """Thin wrapper so the app's SQLite-style '?' placeholders and
    cursor.lastrowid usage also work against psycopg2/Postgres.

    ASSUMPTION: any query starting with 'INSERT' (case-insensitive) and not
    already containing the word 'RETURNING' is treated as a single-row
    insert, and gets ' RETURNING id;' appended automatically so lastrowid
    can be read back the same way SQLite's cursor.lastrowid works. This
    breaks silently if:
      - you write a multi-row INSERT (INSERT INTO x VALUES (...), (...)) —
        only the first inserted id is captured into lastrowid, the rest
        are dropped
      - an INSERT already has its own RETURNING clause but returns a
        different column than 'id' — self.lastrowid will read that
        column's value instead, mislabeled as an id
      - an INSERT ... SELECT has a WHERE clause containing the literal
        word 'returning' inside a string/identifier — this would be
        misdetected as already having a RETURNING clause and skip the
        auto-append, silently breaking lastrowid
    If you ever need either pattern above, bypass this wrapper — call
    db.conn.cursor() directly — rather than relying on the auto-RETURNING
    behavior here.
    """
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

        alter_cols = [
            ("posts", "parent_id INTEGER"),
            ("posts", "event_type TEXT"),
            ("posts", "event_time TEXT"),
            ("posts", "event_location TEXT"),
            ("posts", "group_id INTEGER"),
            ("posts", "is_deleted INTEGER DEFAULT 0"),
            ("users", "failed_attempts INTEGER DEFAULT 0"),
            ("users", "locked_until REAL DEFAULT 0"),
            ("notifications", "user_id INTEGER"),
            ("notifications", "actor_id INTEGER"),
            ("notifications", "type TEXT"),
            ("notifications", "post_id INTEGER"),
            ("notifications", "is_read INTEGER DEFAULT 0"),
            ("notifications", "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
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

        try:
            if is_postgres:
                db.execute("""
                    CREATE TABLE IF NOT EXISTS bug_reports (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER,
                        username TEXT,
                        email TEXT,
                        description TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
            else:
                db.execute("""
                    CREATE TABLE IF NOT EXISTS bug_reports (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER,
                        username TEXT,
                        email TEXT,
                        description TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
            db.commit()
        except Exception as e:
            print(f"bug_reports table init notice: {e}")
            if hasattr(db, 'rollback'): db.rollback()

        try:
            if is_postgres:
                db.execute("""
                    CREATE TABLE IF NOT EXISTS event_attendees (
                        id SERIAL PRIMARY KEY,
                        post_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        status TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(post_id, user_id)
                    );
                """)
            else:
                db.execute("""
                    CREATE TABLE IF NOT EXISTS event_attendees (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        post_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        status TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(post_id, user_id)
                    );
                """)
            db.commit()
        except Exception as e:
            print(f"event_attendees table init notice: {e}")
            if hasattr(db, 'rollback'): db.rollback()

        try:
            if is_postgres:
                db.execute("CREATE INDEX IF NOT EXISTS idx_posts_fts ON posts USING GIN (to_tsvector('english', content));")
                db.execute("CREATE INDEX IF NOT EXISTS idx_groups_fts ON groups USING GIN (to_tsvector('english', name || ' ' || description));")
                db.commit()
        except Exception as e:
            print(f"Full-text search index init notice: {e}")
            if hasattr(db, 'rollback'): db.rollback()
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

@app.route("/api/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    data = request.get_json(silent=True) or request.form or {}

    recaptcha_token = data.get("recaptcha_token", "")
    if not verify_recaptcha(recaptcha_token):
        return jsonify({"error": "reCAPTCHA verification failed. Please try again."}), 400

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

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or request.form

    recaptcha_token = data.get("recaptcha_token", "")
    if not verify_recaptcha(recaptcha_token):
        return jsonify({"error": "reCAPTCHA verification failed. Please try again."}), 400

    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")
    age_str = data.get("age", "").strip()
    grade = data.get("grade", "").strip()
    interest = data.get("interest", "").strip()
    github_user = data.get("github_user", "").strip()
    linkedin_url = data.get("linkedin_url", "").strip()
    custom_link_1 = data.get("custom_link_1", "").strip()
    custom_link_2 = data.get("custom_link_2", "").strip()
    custom_link_3 = data.get("custom_link_3", "").strip()
    custom_link_4 = data.get("custom_link_4", "").strip()
    custom_link_5 = data.get("custom_link_5", "").strip()

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

    for link_value in [github_user, linkedin_url, custom_link_1, custom_link_2, custom_link_3, custom_link_4, custom_link_5]:
        if link_value and is_blocked_url(link_value):
            return jsonify({"error": "One of the links you entered is not allowed."}), 400

    db = get_db()
    existing_user = db.execute("SELECT username, email FROM users WHERE username = ? OR email = ?", (username, email)).fetchone()

    if existing_user:
        if existing_user["email"] == email:
            return jsonify({"error": "Email already registered."}), 400
        elif existing_user["username"] == username:
            return jsonify({"error": "Username taken."}), 400

    try:
        db.execute(
            """INSERT INTO users (username, email, password_hash, age, grade, interest, github_user, linkedin_url, custom_link_1, custom_link_2, custom_link_3, custom_link_4, custom_link_5)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (username, email, generate_password_hash(password), age, grade, interest,
             github_user or None, linkedin_url or None, custom_link_1 or None,
             custom_link_2 or None, custom_link_3 or None, custom_link_4 or None, custom_link_5 or None)
        )
        db.commit()
        token_email = generate_verification_token(email)
        send_verification_email(email, token_email)
        return jsonify({"success": True, "message": "Registration successful! Please check your email to verify."}), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": "Registration failed due to a database error."}), 500

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

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True}), 200

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '').strip()
    result_type = request.args.get('type', '').strip().lower()

    if not query:
        return jsonify({
            "posts": [], "has_more_posts": False,
            "groups": [], "has_more_groups": False,
            "users": [], "has_more_users": False,
            "page": 1
        }), 200

    try:
        db = get_db()
        is_postgres = bool(os.environ.get("DATABASE_URL"))
        current_user_id = session.get('user_id', 0)
        page, per_page, offset = get_search_pagination_params()

        response = {"page": page}

        if not result_type or result_type == 'posts':
            if is_postgres:
                posts_rows = db.execute(
                    '''
                    SELECT posts.*, users.username, users.profile_pic,
                           (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
                           (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) as user_liked,
                           ts_rank(to_tsvector('english', posts.content), plainto_tsquery('english', ?)) AS rank
                    FROM posts
                    JOIN users ON posts.user_id = users.id
                    WHERE to_tsvector('english', posts.content) @@ plainto_tsquery('english', ?)
                      AND (posts.is_deleted IS NULL OR posts.is_deleted = 0)
                    ORDER BY rank DESC, posts.created_at DESC
                    LIMIT ? OFFSET ?
                    ''',
                    (current_user_id, query, query, per_page + 1, offset)
                ).fetchall()
            else:
                search_term = f"%{query}%"
                posts_rows = db.execute(
                    '''
                    SELECT posts.*, users.username, users.profile_pic,
                           (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
                           (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) as user_liked
                    FROM posts
                    JOIN users ON posts.user_id = users.id
                    WHERE (posts.content LIKE ? OR posts.category LIKE ?)
                      AND (posts.is_deleted IS NULL OR posts.is_deleted = 0)
                    ORDER BY posts.created_at DESC
                    LIMIT ? OFFSET ?
                    ''',
                    (current_user_id, search_term, search_term, per_page + 1, offset)
                ).fetchall()

            response["has_more_posts"] = len(posts_rows) > per_page
            response["posts"] = [dict(p) for p in posts_rows[:per_page]]

        if not result_type or result_type == 'groups':
            if is_postgres:
                groups_rows = db.execute(
                    '''
                    SELECT groups.*, users.username AS owner_username,
                           ts_rank(to_tsvector('english', groups.name || ' ' || groups.description), plainto_tsquery('english', ?)) AS rank
                    FROM groups
                    JOIN users ON groups.user_id = users.id
                    WHERE to_tsvector('english', groups.name || ' ' || groups.description) @@ plainto_tsquery('english', ?)
                    ORDER BY rank DESC, groups.created_at DESC
                    LIMIT ? OFFSET ?
                    ''',
                    (query, query, per_page + 1, offset)
                ).fetchall()
            else:
                search_term = f"%{query}%"
                groups_rows = db.execute(
                    '''
                    SELECT groups.*, users.username AS owner_username
                    FROM groups
                    JOIN users ON groups.user_id = users.id
                    WHERE groups.name LIKE ? OR groups.description LIKE ?
                    ORDER BY groups.created_at DESC
                    LIMIT ? OFFSET ?
                    ''',
                    (search_term, search_term, per_page + 1, offset)
                ).fetchall()

            response["has_more_groups"] = len(groups_rows) > per_page
            response["groups"] = [dict(g) for g in groups_rows[:per_page]]

        if not result_type or result_type == 'users':
            search_term = f"%{query}%"
            users_rows = db.execute(
                '''
                SELECT id, username, profile_pic, bio, interest
                FROM users
                WHERE username LIKE ? OR bio LIKE ? OR interest LIKE ?
                LIMIT ? OFFSET ?
                ''',
                (search_term, search_term, search_term, per_page + 1, offset)
            ).fetchall()

            response["has_more_users"] = len(users_rows) > per_page
            response["users"] = [dict(u) for u in users_rows[:per_page]]

        return jsonify(response), 200

    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({'error': 'An error occurred while searching'}), 500

@app.route("/api/posts/create", methods=["POST"])
@login_required
def create_post():
    db = get_db()
    current_user_id = g.user["id"]

    content = request.form.get("content", "").strip()
    category = request.form.get("category", "").strip()
    parent_id = request.form.get("reply_to", type=int)
    group_id = request.form.get("group_id", type=int)

    if not content:
        return jsonify({"error": "Content cannot be empty."}), 400

    if contains_blocked_link(content):
        return jsonify({"error": "Your post contains a link to a blocked or unsafe domain."}), 400

    github_link = request.form.get("github_link", "").strip() or None
    if github_link and is_blocked_url(github_link):
        return jsonify({"error": "That link is not allowed."}), 400

    event_type = request.form.get("event_type", "").strip() if category == "Events" else None
    event_time = request.form.get("event_time", "").strip() if category == "Events" else None
    event_location = request.form.get("event_location", "").strip() if category == "Events" else None

    media_path = None
    file = request.files.get("media")
    if file and file.filename != '' and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = f"{current_user_id}_{int(time.time())}_{filename}"
        content_type = get_mime_type(filename)
        file_bytes = file.read()
        file_bytes = resize_image_if_needed(file_bytes, filename)
        if supabase:
            try:
                supabase.storage.from_("uploads").upload(
                    path=unique_filename, file=file_bytes,
                    file_options={"content-type": content_type, "upsert": "false"}
                )
                media_path = supabase.storage.from_("uploads").get_public_url(unique_filename)
            except Exception as e:
                app.logger.error(f"Supabase upload error: {e}")
                return jsonify({"error": "Failed to upload media."}), 500

    try:
        cursor = db.execute(
            """INSERT INTO posts (user_id, content, media_path, github_link, category, parent_id, event_type, event_time, event_location, group_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (current_user_id, content, media_path, github_link, category, parent_id, event_type, event_time, event_location, group_id)
        )
        post_id = cursor.lastrowid
        db.commit()
    except Exception as e:
        db.rollback()
        app.logger.error(f"Post insert error: {e}")
        return jsonify({"error": "Failed to create post."}), 500

    try:
        db.execute(
            """INSERT INTO notifications (user_id, actor_id, type, post_id, is_read)
               VALUES (?, ?, 'self_post', ?, 0)""",
            (current_user_id, current_user_id, post_id)
        )

        if parent_id:
            parent_author = db.execute("SELECT user_id FROM posts WHERE id = ?", (parent_id,)).fetchone()
            if parent_author and parent_author["user_id"] != current_user_id:
                db.execute(
                    """INSERT INTO notifications (user_id, actor_id, type, post_id, is_read)
                       VALUES (?, ?, 'reply', ?, 0)""",
                    (parent_author["user_id"], current_user_id, post_id)
                )
        else:
            db.execute(
                """INSERT INTO notifications (user_id, actor_id, type, post_id, is_read)
                   SELECT follower_id, ?, 'new_post', ?, 0
                   FROM follows
                   WHERE following_id = ?""",
                (current_user_id, post_id, current_user_id)
            )
        db.commit()
    except Exception as e:
        db.rollback()
        app.logger.error(f"Notification insert error: {e}")

    return jsonify({"success": True, "post_id": post_id}), 201

@app.route("/api/posts", methods=["GET"])
def get_posts():
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    category = request.args.get('category')
    page, per_page, offset = get_pagination_params()

    query = """
        SELECT posts.*, users.username, users.profile_pic,
               parent_posts.content AS parent_content,
               parent_users.username AS parent_username,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked,
               (SELECT COUNT(*) FROM posts AS replies WHERE replies.parent_id = posts.id AND (replies.is_deleted IS NULL OR replies.is_deleted = 0)) AS comment_count
        FROM posts
        JOIN users ON posts.user_id = users.id
        LEFT JOIN posts AS parent_posts ON posts.parent_id = parent_posts.id
        LEFT JOIN users AS parent_users ON parent_posts.user_id = parent_users.id
        WHERE posts.group_id IS NULL
          AND (posts.is_deleted IS NULL OR posts.is_deleted = 0)
    """
    params = [current_user_id]

    if category:
        query += " AND posts.category = ?"
        params.append(category)
    else:
        query += " AND posts.category != 'Events'"

    query += " ORDER BY posts.created_at DESC LIMIT ? OFFSET ?"
    params.extend([per_page + 1, offset])

    rows = db.execute(query, params).fetchall()
    has_more = len(rows) > per_page
    posts = [dict(row) for row in rows[:per_page]]

    return jsonify({"posts": posts, "has_more": has_more, "page": page}), 200

@app.route("/api/posts/<int:post_id>", methods=["GET"])
def api_get_single_post(post_id):
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    page, per_page, offset = get_pagination_params()

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
        return jsonify({"error": "Post not found."}), 404

    post_dict = dict(post)

    comments_cursor = db.execute(
        """
        SELECT posts.*, users.username, users.profile_pic,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.parent_id = ?
        ORDER BY posts.created_at ASC
        LIMIT ? OFFSET ?
        """,
        (current_user_id, post_id, per_page + 1, offset)
    ).fetchall()

    has_more_comments = len(comments_cursor) > per_page
    comments = [dict(row) for row in comments_cursor[:per_page]]

    return jsonify({
        "post": post_dict,
        "comments": comments,
        "has_more_comments": has_more_comments,
        "page": page
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

    if contains_blocked_link(new_content):
        return jsonify({"error": "Your post contains a link to a blocked or unsafe domain."}), 400

    try:
        db.execute("UPDATE posts SET content = ? WHERE id = ?", (new_content, post_id))
        db.commit()
        return jsonify({"success": True, "message": "Post updated successfully"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/api/posts/<int:post_id>/comments", methods=["PUT","POST"])
@app.route("/api/post/<int:post_id>/comments", methods=["PUT","POST"])
@login_required
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

    if contains_blocked_link(new_content):
        return jsonify({"error": "Your reply contains a link to a blocked or unsafe domain."}), 400

    try:
        db.execute("UPDATE posts SET content = ? WHERE id = ?", (new_content, post_id))
        db.commit()
        return jsonify({"success": True, "message": "Post updated successfully"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route("/api/posts/<int:post_id>", methods=["GET"])
@app.route("/api/post/<int:post_id>", methods=["GET"])
@app.route("/api/posts/<int:post_id>/thread", methods=["GET"])
def api_get_post_thread(post_id):
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0
    page, per_page, offset = get_pagination_params()

    post = db.execute(
        """
        SELECT posts.*, users.username, users.profile_pic,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked,
               (SELECT COUNT(*) FROM posts AS replies WHERE replies.parent_id = posts.id AND (replies.is_deleted IS NULL OR replies.is_deleted = 0)) AS comment_count,
               (SELECT COUNT(*) FROM event_attendees WHERE event_attendees.post_id = posts.id AND event_attendees.status = 'going') AS going_count,
               (SELECT COUNT(*) FROM event_attendees WHERE event_attendees.post_id = posts.id AND event_attendees.status = 'interested') AS interested_count,
               (SELECT status FROM event_attendees WHERE event_attendees.post_id = posts.id AND event_attendees.user_id = ?) AS user_rsvp_status
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.id = ?
        """,
        (current_user_id, current_user_id, post_id)
    ).fetchone()

    if not post:
        return jsonify({"error": "Post not found"}), 404

    post_dict = dict(post)

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

    replies_cursor = db.execute(
        """
        SELECT posts.*, users.username, users.profile_pic,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.parent_id = ?
        ORDER BY posts.created_at ASC
        LIMIT ? OFFSET ?
        """,
        (current_user_id, post_id, per_page + 1, offset)
    ).fetchall()

    has_more_replies = len(replies_cursor) > per_page
    replies = [dict(row) for row in replies_cursor[:per_page]]

    return jsonify({
        "post": post_dict,
        "parent": parent_post,
        "replies": replies,
        "has_more_replies": has_more_replies,
        "page": page
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

    content = request.form.get("content", "").strip() or request.json.get("content", "").strip() if request.is_json else request.form.get("content", "").strip()
    category = request.form.get("category", "").strip() or (request.json.get("category", "").strip() if request.is_json else request.form.get("category", "").strip())

    github_link = None
    event_type = None
    event_time = None
    event_location = None

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

    if contains_blocked_link(content):
        return jsonify({"error": "Your post contains a link to a blocked or unsafe domain."}), 400

    if github_link and is_blocked_url(github_link):
        return jsonify({"error": "That link is not allowed."}), 400

    media_path = post["media_path"]

    if "image" in request.files:
        file = request.files["image"]
        if file and file.filename != "" and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            content_type = get_mime_type(filename)
            file_bytes = file.read()
            file_bytes = resize_image_if_needed(file_bytes, filename)
            if supabase:
                try:
                    unique_filename = f"{user_id}_{int(time.time())}_{filename}"
                    supabase.storage.from_("uploads").upload(
                        path=unique_filename, file=file_bytes,
                        file_options={"content-type": content_type, "upsert": "false"}
                    )
                    media_path = supabase.storage.from_("uploads").get_public_url(unique_filename)
                except Exception as e:
                    app.logger.error(f"Supabase edit upload error: {e}")
                    return jsonify({"error": "Failed to upload media."}), 500
            else:
                upload_folder = app.config.get("UPLOAD_FOLDER", "static/uploads")
                os.makedirs(upload_folder, exist_ok=True)
                file_path = os.path.join(upload_folder, filename)
                with open(file_path, 'wb') as f:
                    f.write(file_bytes)
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
        hard_deleted = remove_or_softdelete_post(db, post_id)
        db.commit()

        if hard_deleted and post["media_path"]:
            file_name = post["media_path"].replace("uploads/", "")
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
            if os.path.exists(file_path):
                os.remove(file_path)

        return jsonify({"success": True, "message": "Post deleted successfully."}), 200
    except Exception as e:
        db.rollback()
        app.logger.error(f"Delete post error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/posts/<int:post_id>/like", methods=["POST"])
@login_required
def toggle_like(post_id):
    db = get_db()
    user_id = g.user["id"]

    post = db.execute("SELECT user_id FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        return jsonify({"error": "Post not found"}), 404

    existing_like = db.execute(
        "SELECT * FROM likes WHERE user_id = ? AND post_id = ?",
        (user_id, post_id)
    ).fetchone()

    if existing_like:
        db.execute("DELETE FROM likes WHERE user_id = ? AND post_id = ?", (user_id, post_id))
        db.execute(
            "DELETE FROM notifications WHERE user_id = ? AND actor_id = ? AND type = 'like' AND post_id = ?",
            (post["user_id"], user_id, post_id)
        )
    else:
        db.execute("INSERT INTO likes (user_id, post_id) VALUES (?, ?)", (user_id, post_id))

        if post["user_id"] != user_id:
            db.execute(
                "INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, 'like', ?)",
                (post["user_id"], user_id, post_id)
            )

    db.commit()
    return jsonify({"success": True}), 200

@app.route("/api/events/<int:post_id>/rsvp", methods=["POST"])
@login_required
def rsvp_event(post_id):
    db = get_db()
    user_id = g.user["id"]
    data = request.get_json(silent=True) or {}
    status = data.get("status", "").strip().lower()

    if status not in ("going", "interested"):
        return jsonify({"error": "Invalid RSVP status."}), 400

    post = db.execute("SELECT id, category FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post or post["category"] != "Events":
        return jsonify({"error": "Event not found."}), 404

    try:
        existing = db.execute(
            "SELECT * FROM event_attendees WHERE post_id = ? AND user_id = ?",
            (post_id, user_id)
        ).fetchone()

        if existing and existing["status"] == status:
            db.execute("DELETE FROM event_attendees WHERE post_id = ? AND user_id = ?", (post_id, user_id))
            new_status = None
        elif existing:
            db.execute(
                "UPDATE event_attendees SET status = ? WHERE post_id = ? AND user_id = ?",
                (status, post_id, user_id)
            )
            new_status = status
        else:
            db.execute(
                "INSERT INTO event_attendees (post_id, user_id, status) VALUES (?, ?, ?)",
                (post_id, user_id, status)
            )
            new_status = status

        db.commit()

        going_count = db.execute(
            "SELECT COUNT(*) as c FROM event_attendees WHERE post_id = ? AND status = 'going'", (post_id,)
        ).fetchone()["c"]
        interested_count = db.execute(
            "SELECT COUNT(*) as c FROM event_attendees WHERE post_id = ? AND status = 'interested'", (post_id,)
        ).fetchone()["c"]

        return jsonify({
            "success": True,
            "user_status": new_status,
            "going_count": going_count,
            "interested_count": interested_count
        }), 200
    except Exception as e:
        db.rollback()
        app.logger.error(f"RSVP error: {e}")
        return jsonify({"error": "Failed to update RSVP."}), 500

@app.route("/api/profile/<username>", methods=["GET"])
def profile(username):
    db = get_db()
    current_user_id = g.user["id"] if g.get("user") else 0

    raw_user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not raw_user: return jsonify({"error": "User not found"}), 404

    profile_user = sanitize_profile_links(raw_user)
    profile_user.pop("password_hash", None)

    posts = db.execute(
        """SELECT posts.*, users.username, users.profile_pic,
               parent_posts.content AS parent_content,
               parent_users.username AS parent_username,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked,
               (SELECT COUNT(*) FROM posts AS replies WHERE replies.parent_id = posts.id AND (replies.is_deleted IS NULL OR replies.is_deleted = 0)) AS comment_count
           FROM posts
           JOIN users ON posts.user_id = users.id
           LEFT JOIN posts AS parent_posts ON posts.parent_id = parent_posts.id
           LEFT JOIN users AS parent_users ON parent_posts.user_id = parent_users.id
           WHERE posts.user_id = ?
             AND (posts.is_deleted IS NULL OR posts.is_deleted = 0)
           ORDER BY posts.created_at DESC""",
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

    for link_key, link_value in [("github_user", github_user), ("linkedin_url", linkedin_url),
                                  ("custom_link_1", custom_link_1), ("custom_link_2", custom_link_2),
                                  ("custom_link_3", custom_link_3), ("custom_link_4", custom_link_4),
                                  ("custom_link_5", custom_link_5)]:
        if link_value and is_blocked_url(link_value):
            return jsonify({"error": f"The link you entered for {link_key.replace('_', ' ')} is not allowed."}), 400

    file = request.files.get("profile_pic")
    profile_pic_url = None

    if file and file.filename != '' and allowed_pfp_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = f"pfp_{g.user['id']}_{int(time.time())}_{filename}"
        content_type = get_mime_type(filename)
        file_bytes = file.read()
        file_bytes = resize_image_if_needed(file_bytes, filename, max_dimension=800)
        if supabase:
            try:
                supabase.storage.from_("uploads").upload(
                    path=unique_filename, file=file_bytes,
                    file_options={"content-type": content_type, "upsert": "true"}
                )
                profile_pic_url = supabase.storage.from_("uploads").get_public_url(unique_filename)
            except Exception as e:
                app.logger.error(f"Supabase PFP upload error: {e}")
                return jsonify({"error": "Failed to upload image"}), 500
        else:
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            with open(filepath, 'wb') as f:
                f.write(file_bytes)
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
        existing = db.execute(
            "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
            (g.user["id"], user_id)
        ).fetchone()

        if not existing:
            db.execute(
                "INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                (g.user["id"], user_id)
            )

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

@app.route("/api/events", methods=["GET"])
def get_events():
    db = get_db()
    user_id = session.get("user_id") or 0
    page, per_page, offset = get_pagination_params()

    query = """SELECT posts.*, users.username,
           (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
           (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) as user_liked,
           (SELECT COUNT(*) FROM posts AS replies WHERE replies.parent_id = posts.id AND (replies.is_deleted IS NULL OR replies.is_deleted = 0)) AS comment_count,
           (SELECT COUNT(*) FROM event_attendees WHERE event_attendees.post_id = posts.id AND event_attendees.status = 'going') as going_count,
           (SELECT COUNT(*) FROM event_attendees WHERE event_attendees.post_id = posts.id AND event_attendees.status = 'interested') as interested_count,
           (SELECT status FROM event_attendees WHERE event_attendees.post_id = posts.id AND event_attendees.user_id = ?) as user_rsvp_status
           FROM posts
           JOIN users ON posts.user_id = users.id
           WHERE posts.category = 'Events'
             AND (posts.is_deleted IS NULL OR posts.is_deleted = 0)
           ORDER BY posts.event_time ASC
           LIMIT ? OFFSET ?"""
    params = [user_id, user_id, per_page + 1, offset]

    rows = db.execute(query, params).fetchall()
    has_more = len(rows) > per_page
    events = [dict(row) for row in rows[:per_page]]

    return jsonify({"events": events, "has_more": has_more, "page": page}), 200

@app.route("/api/cron/cleanup-events", methods=["POST"])
def api_cleanup_events():
    db = get_db()
    is_postgres = bool(os.environ.get("DATABASE_URL"))

    try:
        if is_postgres:
            expired_rows = db.execute(
                """
                SELECT id FROM posts
                WHERE event_time IS NOT NULL
                  AND event_time != ''
                  AND event_time::timestamp < NOW()
                """
            ).fetchall()
        else:
            expired_rows = db.execute(
                """
                SELECT id FROM posts
                WHERE event_time IS NOT NULL
                  AND event_time != ''
                  AND (
                      datetime(event_time) < datetime('now')
                      OR date(event_time) < date('now')
                  )
                """
            ).fetchall()

        expired_ids = [row["id"] for row in expired_rows]

        for event_id in expired_ids:
            remove_or_softdelete_post(db, event_id)

        db.commit()
        return jsonify({"message": "Expired events cleaned up.", "processed": len(expired_ids)}), 200
    except Exception as e:
        db.rollback()
        app.logger.error(f"Event cleanup error: {e}")
        return jsonify({"error": "Failed to clean up events."}), 500

@app.route("/api/cron/cleanup-notifications", methods=["POST"])
def api_cleanup_notifications():
    db = get_db()
    is_postgres = bool(os.environ.get("DATABASE_URL"))

    try:
        if is_postgres:
            db.execute(
                """
                DELETE FROM notifications
                WHERE is_read = 1
                  AND created_at < NOW() - INTERVAL '30 days'
                """
            )
        else:
            db.execute(
                """
                DELETE FROM notifications
                WHERE is_read = 1
                  AND created_at < datetime('now', '-30 days')
                """
            )
        db.commit()
        return jsonify({"message": "Old read notifications cleaned up."}), 200
    except Exception as e:
        db.rollback()
        app.logger.error(f"Notification cleanup error: {e}")
        return jsonify({"error": "Failed to clean up notifications."}), 500

@app.route('/api/education', methods=['GET'])
def get_education_extras():
    return jsonify({
        "status": "success",
        "category": "STEMNet Greece Student Extra Vault",
        "total_categories": 7
    })

@app.route("/api/groups/create", methods=["POST"])
@login_required
def create_group():
    db = get_db()
    name = request.form.get("name", "").strip()
    description = request.form.get("description", "").strip()

    if not name:
        return jsonify({"error": "Group name cannot be empty."}), 400
    if not description:
        return jsonify({"error": "Group description cannot be empty."}), 400

    existing = db.execute("SELECT id FROM groups WHERE user_id = ?", (g.user["id"],)).fetchone()
    if existing:
        return jsonify({"error": "You already own a group. Each account can create only one."}), 400

    try:
        cursor = db.execute(
            "INSERT INTO groups (user_id, name, description) VALUES (?, ?, ?)",
            (g.user["id"], name, description)
        )
        db.commit()
        return jsonify({"success": True, "group_id": cursor.lastrowid}), 201
    except Exception as e:
        db.rollback()
        app.logger.error(f"Create group error: {e}")
        return jsonify({"error": "Failed to create group."}), 500

@app.route("/api/groups", methods=["GET"])
def get_groups():
    db = get_db()
    page, per_page, offset = get_pagination_params()
    rows = db.execute(
        "SELECT g.*, u.username FROM groups g JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC LIMIT ? OFFSET ?",
        (per_page + 1, offset)
    ).fetchall()
    has_more = len(rows) > per_page
    groups = [dict(g) for g in rows[:per_page]]
    return jsonify({"groups": groups, "has_more": has_more, "page": page}), 200

@app.route("/api/groups/<int:group_id>", methods=["GET"])
def get_group_details(group_id):
    db = get_db()
    group = db.execute("SELECT groups.*, users.username AS creator_username FROM groups JOIN users ON groups.user_id = users.id WHERE groups.id = ?", (group_id,)).fetchone()
    if not group:
        return jsonify({"error": "Group not found"}), 404

    current_user_id = g.user["id"] if g.get("user") else 0
    posts = db.execute(
        """
        SELECT posts.*, users.username, users.profile_pic,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
               (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS user_liked,
               (SELECT COUNT(*) FROM posts AS replies WHERE replies.parent_id = posts.id AND (replies.is_deleted IS NULL OR replies.is_deleted = 0)) AS comment_count
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.group_id = ?
          AND (posts.is_deleted IS NULL OR posts.is_deleted = 0)
        ORDER BY posts.created_at DESC
        """,
        (current_user_id, group_id)
    ).fetchall()

    return jsonify({
        "group": dict(group),
        "posts": [dict(p) for p in posts]
    }), 200

@app.route("/api/groups/<int:group_id>/edit", methods=["POST", "PUT"])
@login_required
def edit_group(group_id):
    db = get_db()
    group = db.execute("SELECT * FROM groups WHERE id = ?", (group_id,)).fetchone()
    if not group:
        return jsonify({"error": "Group not found"}), 404
    if group["user_id"] != g.user["id"]:
        return jsonify({"error": "Permission denied"}), 403

    data = request.get_json(silent=True) or request.form
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    if not name or not description:
        return jsonify({"error": "Name and description are required."}), 400

    try:
        db.execute("UPDATE groups SET name = ?, description = ? WHERE id = ?", (name, description, group_id))
        db.commit()
        return jsonify({"success": True, "message": "Group updated."}), 200
    except Exception as e:
        db.rollback()
        app.logger.error(f"Edit group error: {e}")
        return jsonify({"error": "Failed to update group."}), 500

@app.route("/api/groups/<int:group_id>/delete", methods=["POST", "DELETE"])
@login_required
def delete_group(group_id):
    db = get_db()
    group = db.execute("SELECT * FROM groups WHERE id = ?", (group_id,)).fetchone()
    if not group:
        return jsonify({"error": "Group not found"}), 404
    if group["user_id"] != g.user["id"]:
        return jsonify({"error": "Permission denied"}), 403

    try:
        post_rows = db.execute("SELECT id FROM posts WHERE group_id = ?", (group_id,)).fetchall()
        for row in post_rows:
            remove_or_softdelete_post(db, row["id"])
        db.execute("DELETE FROM groups WHERE id = ?", (group_id,))
        db.commit()
        return jsonify({"success": True, "message": "Group deleted."}), 200
    except Exception as e:
        db.rollback()
        app.logger.error(f"Delete group error: {e}")
        return jsonify({"error": "Failed to delete group."}), 500

@app.route("/api/notifications", methods=["GET"])
@login_required
def api_get_notifications():
    db = get_db()
    try:
        notifications = db.execute(
            """SELECT n.id, n.user_id, n.actor_id, n.type, n.post_id, n.is_read, n.created_at,
                      COALESCE(u.username, n.actor_username) AS actor_username,
                      u.profile_pic AS actor_pic,
                      p.content AS post_content
               FROM notifications n
               LEFT JOIN users u ON u.id = n.actor_id
               LEFT JOIN posts p ON n.post_id = p.id
               WHERE n.user_id = ?
               ORDER BY n.created_at DESC""",
            (g.user["id"],)
        ).fetchall()
        return jsonify([dict(row) for row in notifications]), 200
    except Exception as e:
        app.logger.error(f"Notifications fetch error: {e}")
        return jsonify({"error": "Failed to load notifications."}), 500

@app.route("/api/notifications/unread", methods=["GET"])
@login_required
def check_unread():
    db = get_db()
    try:
        count = db.execute(
            "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
            (g.user["id"],)
        ).fetchone()
        return jsonify({"has_unread": count["count"] > 0}), 200
    except Exception as e:
        app.logger.error(f"Unread check error: {e}")
        return jsonify({"has_unread": False}), 200

@app.route("/api/notifications/read", methods=["POST"])
@login_required
def mark_notifications_read():
    db = get_db()
    try:
        db.execute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
            (g.user["id"],)
        )
        db.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        db.rollback()
        app.logger.error(f"Mark read error: {e}")
        return jsonify({"error": "Failed to update notifications."}), 500

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL")

def generate_password_reset_token(email):
    return get_serializer().dumps(email, salt='password-reset-salt')

def confirm_password_reset_token(token, expiration=3600):
    try:
        return get_serializer().loads(token, salt='password-reset-salt', max_age=expiration)
    except Exception:
        return None

def generate_email_change_token(user_id, new_email):
    return get_serializer().dumps({'user_id': user_id, 'new_email': new_email}, salt='email-change-salt')

def confirm_email_change_token(token, expiration=3600):
    try:
        return get_serializer().loads(token, salt='email-change-salt', max_age=expiration)
    except Exception:
        return None

def send_password_reset_email(user_email, token):
    resend_api_key = os.environ.get("RESEND_API_KEY")
    if not resend_api_key:
        print("RESEND_API_KEY not found. Skipping email.")
        return

    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "from": "STEMNet Greece <noreply@verify.stemnet.app>",
        "to": [user_email],
        "subject": "Reset your STEMNet Greece password",
        "html": f"""
            <div style="background-color: #121212; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                <div style="max-width: 480px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 12px; overflow: hidden;">
                    <div style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #2a2a2a;">
                        <h1 style="margin: 0; color: #ccff00; font-size: 22px; font-weight: 700;">STEMNet Greece</h1>
                    </div>
                    <div style="padding: 32px; text-align: center;">
                        <h2 style="margin: 0 0 12px 0; color: #ffffff; font-size: 20px; font-weight: 600;">Reset your password</h2>
                        <p style="margin: 0 0 28px 0; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                            Click below to choose a new password. This link expires in 1 hour.
                        </p>
                        <a href="{reset_url}" style="display: inline-block; padding: 14px 36px; background-color: #ccff00; color: #111111; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
                            Reset Password
                        </a>
                        <p style="margin: 28px 0 0 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                            If you didn't request this, you can safely ignore this email.
                        </p>
                    </div>
                </div>
            </div>
        """
    }
    try:
        requests.post("https://api.resend.com/emails", headers=headers, json=data)
    except Exception as e:
        print(f"Error sending password reset email: {e}")

def send_email_change_verification(new_email, token):
    resend_api_key = os.environ.get("RESEND_API_KEY")
    if not resend_api_key:
        print("RESEND_API_KEY not found. Skipping email.")
        return

    verify_url = f"{FRONTEND_URL}/api/verify-email-change/{token}"
    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "from": "STEMNet Greece <noreply@verify.stemnet.app>",
        "to": [new_email],
        "subject": "Confirm your new STEMNet Greece email",
        "html": f"""
            <div style="background-color: #121212; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                <div style="max-width: 480px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 12px; overflow: hidden;">
                    <div style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #2a2a2a;">
                        <h1 style="margin: 0; color: #ccff00; font-size: 22px; font-weight: 700;">STEMNet Greece</h1>
                    </div>
                    <div style="padding: 32px; text-align: center;">
                        <h2 style="margin: 0 0 12px 0; color: #ffffff; font-size: 20px; font-weight: 600;">Confirm this email</h2>
                        <p style="margin: 0 0 28px 0; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                            Click below to make this your new STEMNet Greece login email.
                        </p>
                        <a href="{verify_url}" style="display: inline-block; padding: 14px 36px; background-color: #ccff00; color: #111111; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
                            Confirm Email
                        </a>
                    </div>
                </div>
            </div>
        """
    }
    try:
        requests.post("https://api.resend.com/emails", headers=headers, json=data)
    except Exception as e:
        print(f"Error sending email change verification: {e}")

def send_bug_report_email(reporter_username, reporter_email, description):
    resend_api_key = os.environ.get("RESEND_API_KEY")
    if not resend_api_key or not ADMIN_EMAIL:
        print("RESEND_API_KEY or ADMIN_EMAIL not set. Skipping bug report email.")
        return

    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "from": "STEMNet Greece <noreply@verify.stemnet.app>",
        "to": [ADMIN_EMAIL],
        "subject": f"Bug report from @{reporter_username}",
        "html": f"""
            <div style="font-family: -apple-system, sans-serif; padding: 20px;">
                <h2>Bug report</h2>
                <p><strong>From:</strong> @{reporter_username} ({reporter_email})</p>
                <p><strong>Description:</strong></p>
                <p style="white-space: pre-line;">{description}</p>
            </div>
        """
    }
    try:
        requests.post("https://api.resend.com/emails", headers=headers, json=data)
    except Exception as e:
        print(f"Error sending bug report email: {e}")

def send_bug_report_confirmation_email(reporter_email, description):
    resend_api_key = os.environ.get("RESEND_API_KEY")
    if not resend_api_key:
        print("RESEND_API_KEY not found. Skipping confirmation email.")
        return

    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "from": "STEMNet Greece <noreply@verify.stemnet.app>",
        "to": [reporter_email],
        "subject": "We received your bug report",
        "html": f"""
            <div style="background-color: #121212; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                <div style="max-width: 480px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 12px; overflow: hidden;">
                    <div style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #2a2a2a;">
                        <h1 style="margin: 0; color: #ccff00; font-size: 22px; font-weight: 700;">STEMNet Greece</h1>
                    </div>
                    <div style="padding: 32px; text-align: center;">
                        <h2 style="margin: 0 0 12px 0; color: #ffffff; font-size: 20px; font-weight: 600;">Thanks for the report</h2>
                        <p style="margin: 0 0 20px 0; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                            We've received the following report and will look into it:
                        </p>
                        <p style="margin: 0; color: #ffffff; font-size: 14px; line-height: 1.6; white-space: pre-line; text-align: left; background: #0f0f0f; padding: 16px; border-radius: 8px;">
                            {description}
                        </p>
                    </div>
                </div>
            </div>
        """
    }
    try:
        requests.post("https://api.resend.com/emails", headers=headers, json=data)
    except Exception as e:
        print(f"Error sending bug report confirmation email: {e}")

@app.route("/api/settings/change-password", methods=["POST"])
@login_required
def change_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not current_password or not new_password:
        return jsonify({"error": "Both current and new password are required."}), 400

    if not check_password_hash(g.user["password_hash"], current_password):
        return jsonify({"error": "Current password is incorrect."}), 401

    if len(new_password) < 8 or not any(c.isdigit() for c in new_password) or not any(not c.isalnum() for c in new_password):
        return jsonify({"error": "New password does not meet complexity requirements."}), 400

    db = get_db()
    try:
        db.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (generate_password_hash(new_password), g.user["id"])
        )
        db.commit()
        return jsonify({"success": True, "message": "Password updated successfully."}), 200
    except Exception as e:
        db.rollback()
        app.logger.error(f"Change password error: {e}")
        return jsonify({"error": "Failed to update password."}), 500

@app.route("/api/settings/send-password-reset", methods=["POST"])
@login_required
def send_password_reset():
    token = generate_password_reset_token(g.user["email"])
    send_password_reset_email(g.user["email"], token)
    return jsonify({"success": True, "message": "Check your email for a reset link."}), 200

@app.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}
    token = data.get("token", "")
    new_password = data.get("new_password", "")

    email = confirm_password_reset_token(token)
    if not email:
        return jsonify({"error": "This reset link is invalid or has expired."}), 400

    if len(new_password) < 8 or not any(c.isdigit() for c in new_password) or not any(not c.isalnum() for c in new_password):
        return jsonify({"error": "Password does not meet complexity requirements."}), 400

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not user:
        return jsonify({"error": "User not found."}), 404

    try:
        db.execute(
            "UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = 0 WHERE email = ?",
            (generate_password_hash(new_password), email)
        )
        db.commit()
        return jsonify({"success": True, "message": "Password reset successfully. You can now log in."}), 200
    except Exception as e:
        db.rollback()
        app.logger.error(f"Reset password error: {e}")
        return jsonify({"error": "Failed to reset password."}), 500

@app.route("/api/settings/change-email", methods=["POST"])
@login_required
def change_email():
    data = request.get_json(silent=True) or {}
    new_email = data.get("new_email", "").strip()
    password = data.get("password", "")

    if not new_email or not password:
        return jsonify({"error": "New email and password are required."}), 400

    if not check_password_hash(g.user["password_hash"], password):
        return jsonify({"error": "Password is incorrect."}), 401

    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE email = ?", (new_email,)).fetchone()
    if existing:
        return jsonify({"error": "That email is already in use."}), 400

    token = generate_email_change_token(g.user["id"], new_email)
    send_email_change_verification(new_email, token)
    return jsonify({"success": True, "message": "Check your new email inbox to confirm the change."}), 200

@app.route("/api/verify-email-change/<token>")
def verify_email_change(token):
    data = confirm_email_change_token(token)
    if not data:
        return redirect(f"{FRONTEND_URL}/settings?error=invalid_token")

    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE email = ?", (data["new_email"],)).fetchone()
    if existing:
        return redirect(f"{FRONTEND_URL}/settings?error=email_taken")

    try:
        db.execute("UPDATE users SET email = ? WHERE id = ?", (data["new_email"], data["user_id"]))
        db.commit()
        return redirect(f"{FRONTEND_URL}/settings?email_changed=true")
    except Exception as e:
        db.rollback()
        app.logger.error(f"Email change error: {e}")
        return redirect(f"{FRONTEND_URL}/settings?error=server_error")

@app.route("/api/settings/report-bug", methods=["POST"])
@login_required
def report_bug():
    data = request.get_json(silent=True) or {}
    description = data.get("description", "").strip()

    if not description:
        return jsonify({"error": "Please describe the issue."}), 400

    db = get_db()
    try:
        db.execute(
            "INSERT INTO bug_reports (user_id, username, email, description) VALUES (?, ?, ?, ?)",
            (g.user["id"], g.user["username"], g.user["email"], description)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        app.logger.error(f"Bug report save error: {e}")

    send_bug_report_email(g.user["username"], g.user["email"], description)
    send_bug_report_confirmation_email(g.user["email"], description)

    return jsonify({"success": True, "message": "Thanks — your report has been sent and saved."}), 200

def get_deleted_user_id(db):
    row = db.execute("SELECT id FROM users WHERE username = ?", ('deleted_user',)).fetchone()
    if row:
        return row["id"]
    cursor = db.execute(
        """INSERT INTO users (username, email, password_hash, age, grade, interest, is_verified)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        ('deleted_user', 'deleted-user@stemnet.invalid', generate_password_hash(os.urandom(16).hex()), 18, 'N/A', 'N/A', 1)
    )
    db.commit()
    return cursor.lastrowid

@app.route("/api/settings/delete-account", methods=["POST"])
@login_required
def delete_account():
    data = request.get_json(silent=True) or {}
    password = data.get("password", "")

    if not password:
        return jsonify({"error": "Password is required."}), 400

    if not check_password_hash(g.user["password_hash"], password):
        return jsonify({"error": "Password is incorrect."}), 401

    db = get_db()
    user_id = g.user["id"]

    try:
        placeholder_id = get_deleted_user_id(db)

        own_group = db.execute("SELECT id FROM groups WHERE user_id = ?", (user_id,)).fetchone()
        if own_group:
            db.execute("UPDATE posts SET group_id = NULL WHERE group_id = ?", (own_group["id"],))
            db.execute("DELETE FROM groups WHERE id = ?", (own_group["id"],))

        own_posts = db.execute("SELECT id FROM posts WHERE user_id = ?", (user_id,)).fetchall()
        for row in own_posts:
            remove_or_softdelete_post(db, row["id"], reassign_user_id=placeholder_id)

        db.execute("DELETE FROM likes WHERE user_id = ?", (user_id,))
        db.execute("DELETE FROM event_attendees WHERE user_id = ?", (user_id,))
        db.execute("DELETE FROM notifications WHERE user_id = ? OR actor_id = ?", (user_id, user_id))
        db.execute("DELETE FROM follows WHERE follower_id = ? OR following_id = ?", (user_id, user_id))
        db.execute("DELETE FROM users WHERE id = ?", (user_id,))
        db.commit()

        session.clear()
        return jsonify({"success": True, "message": "Account deleted."}), 200
    except Exception as e:
        db.rollback()
        app.logger.error(f"Delete account error: {e}")
        return jsonify({"error": "Failed to delete account."}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not Found"}), 404

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Rate limit exceeded"}), 429
@app.errorhandler(500)

def server_error(e):
    return jsonify({"error": "Internal Server Error"}), 500

@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Cross-Origin-Resource-Policy'] = 'same-origin'
    if not app.debug:
        response.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
    return response

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)