# ============================================================
# app/core/database.py — Conexão PostgreSQL (async SQLAlchemy)
# ============================================================
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings


# Engine assíncrono
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base para todos os modelos SQLAlchemy."""
    pass


async def get_db() -> AsyncSession:
    """Dependency injection — sessão de banco de dados."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Cria todas as tabelas (usar Alembic em produção)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
