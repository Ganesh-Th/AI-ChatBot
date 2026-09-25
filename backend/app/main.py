from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    allowed_origins.append("http://localhost:5173")  # always allow local dev

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
