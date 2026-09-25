from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import engine, Base
from app.routers import auth, chat

# Create all tables on startup (for SQLite/dev; use Alembic migrations in prod)
Base.metadata.create_all(bind=engine)

settings = get_settings()

app = FastAPI(
    title="AI ChatBot API",
    description="Gemini-powered chatbot with JWT authentication",
    version="1.0.0",
)

# CORS — allow the frontend origin
allowed_origins = [settings.cors_allowed_origin]
if settings.cors_allowed_origin != "*":
    for local_origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
        if local_origin not in allowed_origins:
            allowed_origins.append(local_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(chat.router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}


# Serve the production React build from the same Cloud Run container.
frontend_index = Path(__file__).resolve().parents[2] / "frontend" / "dist" / "index.html"
frontend_assets = frontend_index.parent / "assets"

if frontend_assets.exists():
    app.mount("/assets", StaticFiles(directory=frontend_assets), name="frontend-assets")


@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    if frontend_index.exists():
        return FileResponse(frontend_index)
    return {"detail": "Frontend build not found."}
