# database.py — SQLite setup using Python's built-in sqlite3 (no install needed)

import sqlite3
import hashlib
import secrets
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "scores.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # lets us access columns by name
    return conn


def init_db():
    """Create tables if they don't exist yet."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scores (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT    NOT NULL,
                level_id    INTEGER NOT NULL,
                stars       INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 3),
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                username      TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt          TEXT NOT NULL,
                created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()


def _hash_password(password: str, salt: str = None):
    if salt is None:
        salt = secrets.token_hex(16)
    pw_hash = hashlib.sha256((salt + password).encode()).hexdigest()
    return pw_hash, salt


def register_user(username: str, password: str) -> bool:
    """Returns True on success, False if username is taken."""
    pw_hash, salt = _hash_password(password)
    try:
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)",
                (username, pw_hash, salt)
            )
            conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False


def login_user(username: str, password: str) -> bool:
    """Returns True if credentials are correct."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT password_hash, salt FROM users WHERE username = ?",
            (username,)
        ).fetchone()
    if not row:
        return False
    check_hash, _ = _hash_password(password, row["salt"])
    return check_hash == row["password_hash"]


def save_score(player_name: str, level_id: int, stars: int):
    """Insert or update a player's score for a level (keeps their best)."""
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id, stars FROM scores WHERE player_name = ? AND level_id = ?",
            (player_name, level_id)
        ).fetchone()

        if existing:
            if stars > existing["stars"]:
                conn.execute(
                    "UPDATE scores SET stars = ? WHERE id = ?",
                    (stars, existing["id"])
                )
        else:
            conn.execute(
                "INSERT INTO scores (player_name, level_id, stars) VALUES (?, ?, ?)",
                (player_name, level_id, stars)
            )
        conn.commit()


def get_leaderboard(limit: int = 10):
    """Return top players sorted by total stars, then levels completed."""
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT
                player_name,
                SUM(stars)  AS total_stars,
                COUNT(*)    AS levels_completed
            FROM scores
            GROUP BY player_name
            ORDER BY total_stars DESC, levels_completed DESC
            LIMIT ?
        """, (limit,)).fetchall()
    return [dict(row) for row in rows]
