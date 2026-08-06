PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,  
    password_hash TEXT NOT NULL,
    is_verified INTEGER DEFAULT 0,
    age INTEGER NOT NULL,
    grade TEXT NOT NULL,
    interest TEXT NOT NULL,
    github_user TEXT,
    linkedin_url TEXT,
    custom_link_1 TEXT,
    custom_link_2 TEXT,
    custom_link_3 TEXT,
    custom_link_4 TEXT,
    custom_link_5 TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    bio TEXT
);

CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    media_path TEXT,
    github_link TEXT,
    category TEXT NOT NULL,
    parent_id INTEGER,
    event_type TEXT,
    event_time TEXT,
    event_location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES posts (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users (id),
    FOREIGN KEY (following_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,        -- Who receives the notification
    actor_id INTEGER NOT NULL,       -- Who triggered the notification
    type TEXT NOT NULL,              -- 'follow', 'reply', or 'post'
    post_id INTEGER,                 -- Related post if applicable
    is_read INTEGER DEFAULT 0,       -- 0 for unread, 1 for read
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (actor_id) REFERENCES users (id),
    FOREIGN KEY (post_id) REFERENCES posts (id)
);