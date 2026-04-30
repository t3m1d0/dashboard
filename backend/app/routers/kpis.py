# ============================================================
# app/routers/kpis.py — KPI Snapshots mensais
# ============================================================
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas import KPISnapshotCreate, KPISnapshotResponse
from app.services import KPIService, AuditService

router = APIRouter(prefix="/kpis", tags=["KPIs"])


@router.get("/latest", response_model=KPISnapshotResponse)
async def get_latest(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    snapshot = await KPIService(db).get_latest(current_user.empresa_id)
    if not snapshot:
        raise HTTPException(404, "Nenhum snapshot encontrado")
    return snapshot


@router.get("/historico", response_model=List[KPISnapshotResponse])
async def get_historico(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await KPIService(db).historico(current_user.empresa_id)


@router.post("", response_model=KPISnapshotResponse, status_code=201)
async def upsert_snapshot(
    body: KPISnapshotCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    snapshot = await KPIService(db).upsert(
        periodo=body.periodo,
        mes=body.mes,
        ano=body.ano,
        dados=body.dados,
        empresa_id=current_user.empresa_id,
    )
    await AuditService(db).log("kpi.upsert", current_user.id, "kpi_snapshot", str(snapshot.id))
    return snapshot
