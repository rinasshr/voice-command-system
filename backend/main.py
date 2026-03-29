"""
Voice Command Recognition System — FastAPI backend.

Provides REST API for:
- User authentication (JWT) and role-based access control
- Audio recording upload, speech-to-text (VOSK), command extraction
- Voice record management (CRUD, confirm, correct, filter)
- User administration (create, block, change role)
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, get_db, Base
from models import User
from auth import hash_password
from routers import auth_router, records_router, users_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables and default admin user on startup."""
    Base.metadata.create_all(bind=engine)

    db = next(get_db())
    if not db.query(User).filter(User.username == "admin").first():
        db.add(User(
            username="admin",
            hashed_password=hash_password("admin"),
            role="admin",
        ))
        db.commit()
        logger.info("Default admin user created (login: admin / password: admin)")
    db.close()

    yield  # Application runs here


app = FastAPI(
    title="Voice Command Recognition System",
    description="Система распознавания голосовых команд оператора",
    version="1.0.0",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.app\.github\.dev",  # GitHub Codespaces
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(records_router.router)
app.include_router(users_router.router)
