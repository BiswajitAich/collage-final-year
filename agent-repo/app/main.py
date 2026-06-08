import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import FRONTEND_ORIGINS
from app.database import SessionLocal, engine
from app.routers import agent, rooms, webhook

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with SessionLocal() as session:
        await session.execute(text("SELECT 1"))
    logger.info("✓ Database connection verified")
    yield
    await engine.dispose()
    logger.info("Database engine disposed")


app = FastAPI(
    title="Voice Agent API",
    version="2.0.0",
    description="LiveKit room management + AI agent dispatch for voice conversations",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms.router)
app.include_router(agent.router)
app.include_router(webhook.router)


# ── Utility endpoints ─────────────────────────────────────────────────────────

@app.get("/health", tags=["infra"])
async def health():
    """Liveness probe — also checks DB connectivity."""
    async with SessionLocal() as session:
        await session.execute(text("SELECT 1"))
    return {"ok": True}


@app.get("/", tags=["infra"])
async def root():
    return {"message": "Voice Agent API is running", "docs": "/docs"}

