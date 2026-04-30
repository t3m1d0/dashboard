# ============================================================
# app/routers/dashboard.py — Endpoint principal do dashboard
# ============================================================
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
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
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Retorna payload completo para o dashboard.
    Prioriza dados do banco — cai no JSON padrão se não houver snapshot.
    """
    empresa_id = current_user.empresa_id
    default = _load_default()

    # KPIs — tenta snapshot mais recente
    kpi_svc = KPIService(db)
    snapshot = await kpi_svc.get_latest(empresa_id)

    if snapshot:
        dados = snapshot.dados
        meta = {
            "empresa": dados.get("meta", {}).get("empresa", "Grupo Franqueador"),
            "mes": snapshot.mes,
            "ano": snapshot.ano,
            "geradoEm": snapshot.criado_em.isoformat(),
        }
        visao_geral    = dados.get("visaoGeral",       default.get("visaoGeral", {}))
        visao_est      = dados.get("visaoEstrategica", default.get("visaoEstrategica", {}))
        entregas       = dados.get("entregasEstrategicas", default.get("entregasEstrategicas", []))
        roadmap        = dados.get("roadmap",          default.get("roadmap", []))
    else:
        meta        = default.get("meta", {})
        visao_geral = default.get("visaoGeral", {})
        visao_est   = default.get("visaoEstrategica", {})
        entregas    = default.get("entregasEstrategicas", [])
        roadmap     = default.get("roadmap", [])

    # Sustentação — dados ao vivo do banco
    cham_svc = ChamadoService(db)
    stats    = await cham_svc.get_stats(empresa_id)

    if stats["total"] > 0:
        sustentacao = {
            **default.get("sustentacao", {}),
            "sla": {**default.get("sustentacao", {}).get("sla", {}), "taxaDentroSLA": stats["sla_pct"]},
            "porCategoria": stats["por_categoria"] or default.get("sustentacao", {}).get("porCategoria", []),
            "top15Assuntos": stats["top_assuntos"] or default.get("sustentacao", {}).get("top15Assuntos", []),
        }
    else:
        sustentacao = default.get("sustentacao", {})

    # Projetos — kanban ao vivo
    proj_svc = ProjetoService(db)
    projetos_db = await proj_svc.list(empresa_id=empresa_id)

    if projetos_db:
        desenvolvimento = {
            "projetos": [
                {
                    "id": p.id,
                    "titulo": p.titulo,
                    "descricao": p.descricao or "",
                    "responsavel": str(p.responsavel_id or "Equipe"),
                    "prioridade": p.prioridade.capitalize(),
                    "prazo": p.prazo or "",
                    "progresso": p.progresso,
                    "status": p.status,
                    "tags": p.tags or [],
                }
                for p in projetos_db
            ]
        }
    else:
        desenvolvimento = default.get("desenvolvimento", {"projetos": []})

    return DashboardOverviewResponse(
        meta=meta,
        visaoGeral=visao_geral,
        sustentacao=sustentacao,
        desenvolvimento=desenvolvimento,
        entregasEstrategicas=entregas,
        visaoEstrategica=visao_est,
        roadmap=roadmap,
    )
