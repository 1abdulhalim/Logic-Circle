# main.py — FastAPI backend for Logic Circle
#
# Endpoints:
#   POST /api/scores      — submit a score after completing a level
#   GET  /api/leaderboard — get top 10 players by total stars
#
# Also serves the game's static files (HTML/CSS/JS) at /

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import os

from server.database import init_db, save_score, get_leaderboard

# ── App setup ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("\n  Game running at: http://localhost:8501\n")
    yield

app = FastAPI(title="Logic Circle API", lifespan=lifespan)

# ── Request / Response models ─────────────────────────────────────────────────

class ScoreSubmission(BaseModel):
    player_name: str = Field(..., min_length=1, max_length=30)
    level_id:    int = Field(..., ge=1, le=20)
    stars:       int = Field(..., ge=1, le=3)


class LeaderboardEntry(BaseModel):
    rank:             int
    player_name:      str
    total_stars:      int
    levels_completed: int


# ── API routes ────────────────────────────────────────────────────────────────

@app.post("/api/scores", status_code=201)
def submit_score(data: ScoreSubmission):
    """Save a player's score for a level (keeps their personal best)."""
    save_score(data.player_name, data.level_id, data.stars)
    return {"message": "Score saved"}


@app.get("/api/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard():
    """Return top 10 players ranked by total stars earned."""
    rows = get_leaderboard(limit=10)
    return [LeaderboardEntry(rank=i + 1, **row) for i, row in enumerate(rows)]


# ── Serve game files ──────────────────────────────────────────────────────────

GAME_DIR = os.path.join(os.path.dirname(__file__), "..", "game")

@app.get("/{full_path:path}")
def serve_game(full_path: str):
    """Serve the game's static files; fall back to index.html."""
    file_path = os.path.join(GAME_DIR, full_path)
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(GAME_DIR, "index.html"))
