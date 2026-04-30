# ============================================================
# app/services/redmine/metrics.py
# Cálculo de métricas de produtividade da equipe
# ============================================================
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc

from app.models.redmine import RedmineTarefa, RedmineMetricaSnapshot


# Status que indicam conclusão
CLOSED_STATUSES = {"Fechado", "Resolvido", "Rejected", "Fechada", "Resolvida", "Done", "Closed"}
OPEN_STATUSES   = {"Novo", "Nova", "New", "Aberto", "Aberta"}
WIP_STATUSES    = {"Em andamento", "In Progress", "Em Progresso", "Doing", "Em Desenvolvimento"}


async def calcular_metricas(db: AsyncSession, empresa_id: uuid.UUID):
    """Calcula e persiste snapshot diário de métricas."""
    hoje = datetime.now(timezone.utc).date().isoformat()

    # Busca todas as tarefas da empresa
    result = await db.execute(
        select(RedmineTarefa).where(RedmineTarefa.empresa_id == empresa_id)
    )
    tarefas = result.scalars().all()

    if not tarefas:
        return

    # Métricas globais
    global_snap = _calcular_metricas_grupo(tarefas, None, None)
    await _upsert_snapshot(db, empresa_id, None, None, hoje, global_snap)

    # Métricas por membro
    membros: Dict[str, List[RedmineTarefa]] = {}
    for t in tarefas:
        if t.responsavel_nome:
            membros.setdefault(t.responsavel_nome, []).append(t)

    for nome, lista in membros.items():
        membro_id = lista[0].responsavel_id
        snap = _calcular_metricas_grupo(lista, nome, membro_id)
        await _upsert_snapshot(db, empresa_id, membro_id, nome, hoje, snap)

    await db.flush()


def _calcular_metricas_grupo(
    tarefas: List[RedmineTarefa],
    membro_nome: Optional[str],
    membro_id: Optional[int],
) -> Dict[str, Any]:
    abertas = em_andamento = concluidas = atrasadas = 0
    horas_est = horas_gastas = 0.0
    tempos_resolucao = []

    for t in tarefas:
        status = t.status or ""
        if status in CLOSED_STATUSES:
            concluidas += 1
            # Calcula tempo de resolução em horas
            if t.data_criacao and t.data_fechamento:
                delta = t.data_fechamento - t.data_criacao
                tempos_resolucao.append(delta.total_seconds() / 3600)
        elif status in WIP_STATUSES:
            em_andamento += 1
        else:
            abertas += 1

        if t.atrasada:
            atrasadas += 1

        horas_est    += t.estimativa_horas or 0
        horas_gastas += t.horas_gastas or 0

    tempo_medio = (
        sum(tempos_resolucao) / len(tempos_resolucao) if tempos_resolucao else None
    )

    total = abertas + em_andamento + concluidas
    taxa_conclusao = round(concluidas / total * 100, 1) if total > 0 else 0

    return {
        "tarefas_abertas":         abertas,
        "tarefas_em_andamento":    em_andamento,
        "tarefas_concluidas":      concluidas,
        "tarefas_atrasadas":       atrasadas,
        "horas_estimadas":         round(horas_est, 1),
        "horas_gastas":            round(horas_gastas, 1),
        "tempo_medio_resolucao":   round(tempo_medio, 1) if tempo_medio else None,
        "taxa_conclusao":          taxa_conclusao,
    }


async def _upsert_snapshot(
    db: AsyncSession,
    empresa_id: uuid.UUID,
    membro_id: Optional[int],
    membro_nome: Optional[str],
    periodo: str,
    dados: dict,
):
    result = await db.execute(
        select(RedmineMetricaSnapshot).where(
            and_(
                RedmineMetricaSnapshot.empresa_id == empresa_id,
                RedmineMetricaSnapshot.periodo == periodo,
                RedmineMetricaSnapshot.membro_id == membro_id,
            )
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.dados = dados
        existing.tarefas_abertas         = dados["tarefas_abertas"]
        existing.tarefas_em_andamento    = dados["tarefas_em_andamento"]
        existing.tarefas_concluidas      = dados["tarefas_concluidas"]
        existing.tarefas_atrasadas       = dados["tarefas_atrasadas"]
        existing.horas_estimadas         = dados["horas_estimadas"]
        existing.horas_gastas            = dados["horas_gastas"]
        existing.tempo_medio_resolucao_horas = dados.get("tempo_medio_resolucao")
    else:
        snap = RedmineMetricaSnapshot(
            empresa_id=empresa_id,
            membro_id=membro_id,
            membro_nome=membro_nome,
            periodo=periodo,
            tarefas_abertas=dados["tarefas_abertas"],
            tarefas_em_andamento=dados["tarefas_em_andamento"],
            tarefas_concluidas=dados["tarefas_concluidas"],
            tarefas_atrasadas=dados["tarefas_atrasadas"],
            horas_estimadas=dados["horas_estimadas"],
            horas_gastas=dados["horas_gastas"],
            tempo_medio_resolucao_horas=dados.get("tempo_medio_resolucao"),
            dados=dados,
        )
        db.add(snap)


async def get_burndown(
    db: AsyncSession,
    empresa_id: uuid.UUID,
    dias: int = 14,
) -> List[Dict[str, Any]]:
    """Gera dados de burndown dos últimos N dias."""
    from datetime import date

    resultado = []
    hoje = date.today()

    for i in range(dias - 1, -1, -1):
        dia = (hoje - timedelta(days=i)).isoformat()
        result = await db.execute(
            select(RedmineMetricaSnapshot).where(
                and_(
                    RedmineMetricaSnapshot.empresa_id == empresa_id,
                    RedmineMetricaSnapshot.periodo == dia,
                    RedmineMetricaSnapshot.membro_id.is_(None),
                )
            )
        )
        snap = result.scalar_one_or_none()

        resultado.append({
            "data":        dia,
            "dia":         datetime.strptime(dia, "%Y-%m-%d").strftime("%d/%m"),
            "abertas":     snap.tarefas_abertas      if snap else None,
            "em_andamento": snap.tarefas_em_andamento if snap else None,
            "concluidas":  snap.tarefas_concluidas   if snap else None,
            "atrasadas":   snap.tarefas_atrasadas    if snap else None,
        })

    return resultado
