# ============================================================
# app/routers/projetos.py — CRUD Projetos (Kanban)
# ============================================================
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas import ProjetoCreate, ProjetoUpdate, ProjetoResponse, ProjetoListResponse
from app.services import ProjetoService, AuditService

router = APIRouter(prefix="/projetos", tags=["Projetos"])


@router.get("", response_model=ProjetoListResponse)
async def list_projetos(
    status:    Optional[str] = Query(None),
    prioridade: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ProjetoService(db)
    items = await svc.list(
        empresa_id=current_user.empresa_id,
        status=status,
        prioridade=prioridade,
    )
    return ProjetoListResponse(total=len(items), items=items)


@router.get("/kanban")
async def get_kanban(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Projetos agrupados por status para o Kanban."""
    board = await ProjetoService(db).get_kanban(current_user.empresa_id)
    # Serializar para dict simples
    return {
        status: [
            {
                "id": str(p.id), "titulo": p.titulo, "descricao": p.descricao,
                "prioridade": p.prioridade, "status": p.status, "progresso": p.progresso,
                "prazo": p.prazo, "tags": p.tags or [],
                "responsavel_id": str(p.responsavel_id) if p.responsavel_id else None,
            }
            for p in projetos
        ]
        for status, projetos in board.items()
    }


@router.post("", response_model=ProjetoResponse, status_code=201)
async def create_projeto(
    body: ProjetoCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    projeto = await ProjetoService(db).create(
        body.model_dump(), empresa_id=current_user.empresa_id
    )
    await AuditService(db).log("projeto.create", current_user.id, "projeto", str(projeto.id))
    return projeto


@router.patch("/{projeto_id}", response_model=ProjetoResponse)
async def update_projeto(
    projeto_id: uuid.UUID,
    body: ProjetoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    projeto = await ProjetoService(db).update(projeto_id, body.model_dump(exclude_none=True))
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    await AuditService(db).log("projeto.update", current_user.id, "projeto", str(projeto_id))
    return projeto


@router.delete("/{projeto_id}", status_code=204)
async def delete_projeto(
    projeto_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    deleted = await ProjetoService(db).delete(projeto_id)
    if not deleted:
        raise HTTPException(404, "Projeto não encontrado")
    await AuditService(db).log("projeto.delete", current_user.id, "projeto", str(projeto_id))
