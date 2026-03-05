# database.py — SQLite setup using Python's built-in sqlite3 (no install needed)

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "scores.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # lets us access columns by name
    return conn


def init_db():
    """Create the scores table if it doesn't exist yet."""
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
        conn.commit()


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
