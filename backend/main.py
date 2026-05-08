# ============================================================
# main.py — FastAPI entry point
# ============================================================
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.database import create_tables
from app.routers import auth, dashboard, chamados, projetos, kpis, uploads
from app.routers import redmine
from app.routers import sustentacao
from app.routers import compras


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    print(f"✅ {settings.APP_NAME} v{settings.APP_VERSION} iniciado")
    yield
    print("🛑 Servidor encerrado")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth.router,      prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(chamados.router,  prefix="/api")
app.include_router(projetos.router,  prefix="/api")
app.include_router(kpis.router,      prefix="/api")
app.include_router(uploads.router,   prefix="/api")
app.include_router(redmine.router,     prefix="/api")
app.include_router(sustentacao.router,  prefix="/api")
app.include_router(compras.router,       prefix="/api")

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
