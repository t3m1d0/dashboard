# ============================================================
# app/routers/auth.py — Autenticação JWT
# ============================================================
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.schemas import LoginRequest, TokenResponse, UsuarioCreate, UsuarioResponse, UsuarioPublico
from app.services import UsuarioService, AuditService

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    svc = UsuarioService(db)
    user = await svc.authenticate(body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    # Atualiza último login
    user.ultimo_login = datetime.now(timezone.utc)

    token = create_access_token({"sub": str(user.id), "role": user.role})

    await AuditService(db).log(
        acao="login",
        usuario_id=user.id,
        ip=request.client.host if request.client else None,
    )

    return TokenResponse(
        access_token=token,
        usuario=UsuarioPublico.model_validate(user),
    )


@router.get("/me", response_model=UsuarioResponse)
async def me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/register", response_model=UsuarioResponse, status_code=201)
async def register(body: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    svc = UsuarioService(db)
    existing = await svc.get_by_email(body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email já cadastrado")
    user = await svc.create(body.model_dump())
    return user
