# ============================================================
# app/routers/chamados.py — CRUD Chamados (Sustentação)
# ============================================================
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas import ChamadoCreate, ChamadoUpdate, ChamadoResponse, ChamadoListResponse
from app.services import ChamadoService, AuditService

router = APIRouter(prefix="/chamados", tags=["Chamados"])


@router.get("", response_model=ChamadoListResponse)
async def list_chamados(
    status:     Optional[str] = Query(None),
    categoria:  Optional[str] = Query(None),
    prioridade: Optional[str] = Query(None),
    page:       int = Query(1, ge=1),
    page_size:  int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ChamadoService(db)
    total, items = await svc.list(
        empresa_id=current_user.empresa_id,
        status=status,
        categoria=categoria,
        prioridade=prioridade,
        page=page,
        page_size=page_size,
    )
    return ChamadoListResponse(total=total, items=items)


@router.post("", response_model=ChamadoResponse, status_code=201)
async def create_chamado(
    body: ChamadoCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ChamadoService(db)
    data = body.model_dump()
    chamado = await svc.create(data, empresa_id=current_user.empresa_id)
    await AuditService(db).log("chamado.create", current_user.id, "chamado", str(chamado.id))
    return chamado


@router.patch("/{chamado_id}", response_model=ChamadoResponse)
async def update_chamado(
    chamado_id: uuid.UUID,
    body: ChamadoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ChamadoService(db)
    chamado = await svc.update(chamado_id, body.model_dump(exclude_none=True))
    if not chamado:
        raise HTTPException(404, "Chamado não encontrado")
    await AuditService(db).log("chamado.update", current_user.id, "chamado", str(chamado_id))
    return chamado


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ChamadoService(db).get_stats(current_user.empresa_id)
