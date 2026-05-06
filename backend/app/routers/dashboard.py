# ============================================================
# app/routers/dashboard.py — Dashboard overview com filtro de período
# ============================================================
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, extract
from typing import Optional
import json, os

from app.core.database import get_db
from app.core.security import get_current_user
from app.services import KPIService, ChamadoService, ProjetoService
from app.schemas import DashboardOverviewResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
DEFAULT_DATA_PATH = os.path.join(os.path.dirname(__file__), "../../data/default.json")


def _load_default() -> dict:
    try:
        with open(DEFAULT_DATA_PATH) as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_overview(
    mes: Optional[int]  = Query(None, ge=1, le=12),
    ano: Optional[int]  = Query(None),
    data_inicio: Optional[str] = Query(None),
    data_fim:    Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    empresa_id = current_user.empresa_id
    default    = _load_default()

    # KPI Snapshot — busca do período ou mais recente
    kpi_svc  = KPIService(db)
    snapshot = None
    if mes and ano:
        periodo_str = f"{ano}-{mes:02d}"
        snapshot = await kpi_svc.get_by_periodo(periodo_str, empresa_id)
    if not snapshot:
        snapshot = await kpi_svc.get_latest(empresa_id)

    if snapshot:
        dados       = snapshot.dados
        meta        = {"empresa": dados.get("meta", {}).get("empresa", "Grupo Franqueador"), "mes": snapshot.mes, "ano": snapshot.ano, "geradoEm": snapshot.criado_em.isoformat()}
        visao_geral = dados.get("visaoGeral", default.get("visaoGeral", {}))
        visao_est   = dados.get("visaoEstrategica", default.get("visaoEstrategica", {}))
        entregas    = dados.get("entregasEstrategicas", [])
        roadmap     = dados.get("roadmap", [])
    else:
        meta        = default.get("meta", {})
        visao_geral = default.get("visaoGeral", {})
        visao_est   = default.get("visaoEstrategica", {})
        entregas    = []
        roadmap     = []

    # Enriquecer com Redmine
    try:
        from app.models.redmine import RedmineConfig, RedmineMetricaSnapshot
        cfg_r = await db.execute(select(RedmineConfig).where(and_(RedmineConfig.empresa_id == empresa_id, RedmineConfig.ativo == True)))
        config = cfg_r.scalar_one_or_none()
        if config:
            rm_q = select(RedmineMetricaSnapshot).where(
                and_(RedmineMetricaSnapshot.empresa_id == empresa_id, RedmineMetricaSnapshot.membro_id.is_(None))
            )
            if mes and ano:
                from datetime import date
                periodo_dia = f"{ano}-{mes:02d}"
                rm_q = rm_q.where(RedmineMetricaSnapshot.periodo.like(f"{periodo_dia}%"))
            rm_q = rm_q.order_by(desc(RedmineMetricaSnapshot.criado_em)).limit(1)
            rm_snap = (await db.execute(rm_q)).scalar_one_or_none()
            if rm_snap:
                visao_geral = {**visao_geral,
                    "entregasDesenvolvimento": {"valor": rm_snap.tarefas_concluidas, "anterior": 0},
                    "projetosAndamento":       {"valor": rm_snap.tarefas_em_andamento, "anterior": 0},
                }
                visao_est = {**visao_est,
                    "projetosEntregues":          rm_snap.tarefas_concluidas,
                    "horasEconomizidasAutomacao": int(rm_snap.horas_gastas or 0),
                    "incidentesCriticosEvitados": rm_snap.tarefas_atrasadas,
                }
    except Exception:
        pass

    # Sustentação com filtro de período
    cham_svc = ChamadoService(db)
    stats    = await cham_svc.get_stats(empresa_id, mes=mes, ano=ano, data_inicio=data_inicio, data_fim=data_fim)
    if stats["total"] > 0:
        sustentacao = {
            **default.get("sustentacao", {}),
            "sla": {**default.get("sustentacao", {}).get("sla", {}), "taxaDentroSLA": stats["sla_pct"]},
            "porCategoria":  stats["por_categoria"] or [],
            "top15Assuntos": stats["top_assuntos"] or [],
        }
    else:
        sustentacao = default.get("sustentacao", {})

    # Projetos
    proj_svc    = ProjetoService(db)
    projetos_db = await proj_svc.list(empresa_id=empresa_id)
    if projetos_db:
        desenvolvimento = {"projetos": [{"id": p.id, "titulo": p.titulo, "descricao": p.descricao or "", "responsavel": str(p.responsavel_id or "Equipe"), "prioridade": p.prioridade.capitalize(), "prazo": p.prazo or "", "progresso": p.progresso, "status": p.status, "tags": p.tags or []} for p in projetos_db]}
    else:
        desenvolvimento = {"projetos": []}

    return DashboardOverviewResponse(
        meta=meta, visaoGeral=visao_geral, sustentacao=sustentacao,
        desenvolvimento=desenvolvimento, entregasEstrategicas=entregas,
        visaoEstrategica=visao_est, roadmap=roadmap,
    )
