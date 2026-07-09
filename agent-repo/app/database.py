from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.config import APP_DATABASE_URL, DATABASE_URL

# ── n8n database (VoiceSession) ───────────────────────────────────────────────

engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    async with SessionLocal() as session:
        yield session


# ── App database (Workflow, User — Prisma-managed) ────────────────────────────
# Falls back to DATABASE_URL when APP_DATABASE_URL is not explicitly provided.

app_engine: AsyncEngine | None = None
AppSessionLocal: async_sessionmaker[AsyncSession] | None = None

if APP_DATABASE_URL:
    app_engine = create_async_engine(
        APP_DATABASE_URL,
        pool_pre_ping=True,
        pool_size=2,
        max_overflow=5,
    )

    AppSessionLocal = async_sessionmaker(
        bind=app_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def get_app_db():
    """FastAPI dependency — yields an async session on the app database."""
    if AppSessionLocal is None:
        raise RuntimeError("APP_DATABASE_URL is not configured")
    async with AppSessionLocal() as session:
        yield session