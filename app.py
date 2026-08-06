from __future__ import annotations
import time
from flask_wtf.csrf import CSRFProtect
import urllib.parse
from werkzeug.utils import secure_filename
import os
from dotenv import load_dotenv

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
        "from": "STEMNet Greece <onboarding@resend.dev>",  # Use onboarding@resend.dev for testing
        "to": [user_email],
        "subject": "Verify your STEMNet Greece Account",
        "html": f"""
            <h2>Welcome to STEMNet Greece!</h2>
            <p>Please click the link below to verify your email address and activate your account:</p>
            <p><a href="{verify_url}" style="padding: 10px 15px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
            <p>If you did not sign up for this, please ignore this email.</p>
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
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "fallback-dev-key-change-in-prod")
csrf = CSRFProtect(app)  

UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

ALLOWED_PFP_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
def allowed_pfp_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_PFP_EXTENSIONS

def get_db() -> sqlite3.Connection:
    if "db" not in g:
        connection = sqlite3.connect(DATABASE)
        connection.row_factory = sqlite3.Row
        g.db = connection
    return g.db

# ---------------------------------------------------------
# 1. Database Hook (MUST be @app.before_request)
# ---------------------------------------------------------
@app.before_request
def upgrade_database():
    if getattr(app, '_db_checked', False):
        return

    db = get_db()
    
    try:
        cursor = db.execute("PRAGMA table_info(posts);")
        columns = [row["name"] for row in cursor.fetchall()]
        
        if not columns:
            with app.open_resource("schema.sql", mode="r") as f:
                db.cursor().executescript(f.read())
            db.commit()
            
            cursor = db.execute("PRAGMA table_info(posts);")
            columns = [row["name"] for row in cursor.fetchall()]

        if columns:
            if "parent_id" not in columns:
                db.execute("ALTER TABLE posts ADD COLUMN parent_id INTEGER;")
            if "event_type" not in columns:
                db.execute("ALTER TABLE posts ADD COLUMN event_type TEXT;")
            if "event_time" not in columns:
                db.execute("ALTER TABLE posts ADD COLUMN event_time TEXT;")
            if "event_location" not in columns:
                db.execute("ALTER TABLE posts ADD COLUMN event_location TEXT;")
            db.commit()
            
    except Exception as e:
        print(f"Database initialization error: {e}")

    app._db_checked = True

# ---------------------------------------------------------
# 2. Security Headers (MUST be @app.after_request)
# ---------------------------------------------------------
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
            count = db.execute(
                "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0",
                (g.user["id"],)
            ).fetchone()[0]
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
            "SELECT id, username FROM users WHERE id = ?", (user_id,)
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


@app.route("/register", methods=("GET", "POST"))
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

            except sqlite3.IntegrityError:
                flash("Registration failed due to a database error.", "danger")
            else:
                flash("Registration successful! Please check your email to verify your account before logging in.", "success")
                return redirect(url_for("login"))

    return render_template("register.html")

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

@app.route("/login", methods=("GET", "POST"))
def login():
    if request.method == "POST":
        # Capture the input, which could be either a username or an email
        identifier = request.form.get("username_or_email", "").strip()
        password = request.form.get("password", "")

        if not identifier or not password:
            flash("Please enter both your username/email and password.", "danger")
            return render_template("login.html")

        db = get_db()
        
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
            session["user_id"] = user["id"]
            flash("Logged in successfully!", "success")
            return redirect(url_for("index"))

    return render_template("login.html")

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

        # Handle file/media upload
        file = request.files.get("media")
        if file and file.filename != '':
            if allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_filename = f"{g.user['id']}_{int(time.time())}_{filename}"
                os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
                media_path = f"uploads/{unique_filename}"
            else:
                flash("Invalid file type. Allowed: images (png, jpg, gif) and short videos (mp4, webm).", "danger")
                return render_template("create.html", parent_post=parent_post)

        # Insert into database with event fields
        cursor = db.execute(
            """
            INSERT INTO posts (user_id, content, media_path, github_link, category, parent_id, event_type, event_time, event_location) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (g.user["id"], content, media_path, github_link, category, parent_id, event_type, event_time, event_location)
        )
        post_id = cursor.lastrowid

        # Notification loops (Replies & Followers) remain the same...
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
    user_id = g.user["id"]
    
    existing_like = db.execute(
        "SELECT * FROM likes WHERE user_id = ? AND post_id = ?",
        (user_id, post_id)
    ).fetchone()
    
    if existing_like:
        db.execute("DELETE FROM likes WHERE user_id = ? AND post_id = ?", (user_id, post_id))
        liked = False
    else:
        db.execute("INSERT INTO likes (user_id, post_id) VALUES (?, ?)", (user_id, post_id))
        liked = True
    
    db.commit()
    
    count_row = db.execute("SELECT COUNT(*) FROM likes WHERE post_id = ?", (post_id,)).fetchone()
    count = count_row[0] if count_row else 0
    
    return jsonify({"liked": liked, "count": count})

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

    # 5. Fetch Follower and Following counts
    followers_count = db.execute(
        "SELECT COUNT(*) FROM follows WHERE following_id = ?", (profile_user["id"],)
    ).fetchone()[0]
    
    following_count = db.execute(
        "SELECT COUNT(*) FROM follows WHERE follower_id = ?", (profile_user["id"],)
    ).fetchone()[0]

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


@app.route("/follow/<int:user_id>", methods=("POST",))
def follow(user_id):
    if g.get("user") is None:
        flash("Please log in to follow users.", "warning")
        return redirect(url_for("login"))
    
    if user_id == g.user["id"]:
        flash("You cannot follow yourself.", "danger")
        return redirect(request.referrer or url_for("index"))

    db = get_db()
    target_user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not target_user:
        flash("User not found.", "danger")
        return redirect(url_for("index"))

    existing = db.execute(
        "SELECT * FROM follows WHERE follower_id = ? AND following_id = ?",
        (g.user["id"], user_id)
    ).fetchone()

    if existing:
        db.execute(
            "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
            (g.user["id"], user_id)
        )
        db.commit()
        flash(f"Unfollowed @{target_user['username']}.", "info")
    else:
        db.execute(
            "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)",
            (g.user["id"], user_id)
        )
        # Create notification for follow
        db.execute(
            "INSERT INTO notifications (user_id, actor_id, type) VALUES (?, ?, ?)",
            (user_id, g.user["id"], "follow")
        )
        db.commit()
        flash(f"Now following @{target_user['username']}!", "success")

    return redirect(request.referrer or url_for("profile", username=target_user["username"]))


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

@app.route("/profile/<username>/followers")
def followers_list(username):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not user:
        flash("User not found.", "danger")
        return redirect(url_for("index"))
    
    followers = db.execute(
        """
        SELECT u.* FROM users u
        JOIN follows f ON u.id = f.follower_id
        WHERE f.following_id = ?
        """,
        (user["id"],)
    ).fetchall()
    
    return render_template("user_list.html", profile_user=user, users=followers, title=f"Followers of @{username}")


@app.route("/profile/<username>/following")
def following_list(username):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not user:
        flash("User not found.", "danger")
        return redirect(url_for("index"))
    
    following = db.execute(
        """
        SELECT u.* FROM users u
        JOIN follows f ON u.id = f.following_id
        WHERE f.follower_id = ?
        """,
        (user["id"],)
    ).fetchall()
    
    return render_template("user_list.html", profile_user=user, users=following, title=f"Users followed by @{username}")

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
if __name__ == "__main__":
    app.run(debug=True)