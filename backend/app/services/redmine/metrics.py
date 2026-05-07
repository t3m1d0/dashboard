# ============================================================
# app/services/redmine/metrics.py
# ============================================================
import uuid
from datetime import datetime, timezone, timedelta, date
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, text

from app.models.redmine import RedmineTarefa, RedmineMetricaSnapshot

CLOSED_STATUSES = {
    "Concluída", "Concluida", "Fechado", "Fechada",
    "Resolvido", "Resolvida", "Rejected", "Rejeitado",
    "Cancelado", "Done", "Closed"
}
OPEN_STATUSES = {
    "A fazer", "Novo", "Nova", "New", "Aberto", "Aberta",
    "Não entregue", "Nao entregue", "Aguardando Build", "Aguardando Merge"
}
WIP_STATUSES = {
    "Fazendo", "Em andamento", "In Progress", "Em Progresso",
    "Doing", "Em Desenvolvimento", "A testar"
}


async def calcular_metricas(db: AsyncSession, empresa_id: uuid.UUID):
    """Calcula e persiste snapshot do dia atual."""
    hoje = date.today().isoformat()
    result = await db.execute(
        select(RedmineTarefa).where(RedmineTarefa.empresa_id == empresa_id)
    )
    tarefas = result.scalars().all()
    if not tarefas:
        return

    global_snap = _calcular_metricas_grupo(tarefas, None, None)
    await _upsert_snapshot(db, empresa_id, None, None, hoje, global_snap)

    membros: Dict[str, List[RedmineTarefa]] = {}
    for t in tarefas:
        if t.responsavel_nome:
            membros.setdefault(t.responsavel_nome, []).append(t)

    for nome, lista in membros.items():
        snap = _calcular_metricas_grupo(lista, nome, lista[0].responsavel_id)
        await _upsert_snapshot(db, empresa_id, lista[0].responsavel_id, nome, hoje, snap)

    await db.flush()


def _calcular_metricas_grupo(tarefas, membro_nome, membro_id):
    abertas = em_andamento = concluidas = atrasadas = 0
    horas_est = horas_gastas = 0.0
    tempos_resolucao = []

    for t in tarefas:
        status = t.status or ""
        if status in CLOSED_STATUSES:
            concluidas += 1
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

    tempo_medio = sum(tempos_resolucao) / len(tempos_resolucao) if tempos_resolucao else None
    total = abertas + em_andamento + concluidas
    taxa_conclusao = round(concluidas / total * 100, 1) if total > 0 else 0

    return {
        "tarefas_abertas":       abertas,
        "tarefas_em_andamento":  em_andamento,
        "tarefas_concluidas":    concluidas,
        "tarefas_atrasadas":     atrasadas,
        "horas_estimadas":       round(horas_est, 1),
        "horas_gastas":          round(horas_gastas, 1),
        "tempo_medio_resolucao": round(tempo_medio, 1) if tempo_medio else None,
        "taxa_conclusao":        taxa_conclusao,
    }


async def _upsert_snapshot(db, empresa_id, membro_id, membro_nome, periodo, dados):
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
        existing.tarefas_abertas             = dados["tarefas_abertas"]
        existing.tarefas_em_andamento        = dados["tarefas_em_andamento"]
        existing.tarefas_concluidas          = dados["tarefas_concluidas"]
        existing.tarefas_atrasadas           = dados["tarefas_atrasadas"]
        existing.horas_estimadas             = dados["horas_estimadas"]
        existing.horas_gastas                = dados["horas_gastas"]
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
    dias: int = 30,
) -> List[Dict[str, Any]]:
    """
    Gera burndown dos últimos N dias.
    Se não há snapshots históricos, deriva os dados das tarefas existentes
    usando data_criacao e data_fechamento — assim funciona mesmo com apenas 1 sync.
    """
    hoje = date.today()

    # 1. Tentar buscar snapshots históricos reais
    result = await db.execute(
        select(RedmineMetricaSnapshot).where(
            and_(
                RedmineMetricaSnapshot.empresa_id == empresa_id,
                RedmineMetricaSnapshot.membro_id.is_(None),
            )
        ).order_by(RedmineMetricaSnapshot.periodo)
    )
    snapshots = {s.periodo: s for s in result.scalars().all()}

    # 2. Se temos snapshots suficientes, usar eles
    if len(snapshots) >= 3:
        resultado = []
        for i in range(dias - 1, -1, -1):
            dia  = (hoje - timedelta(days=i)).isoformat()
            snap = snapshots.get(dia)
            resultado.append({
                "data":        dia,
                "dia":         datetime.strptime(dia, "%Y-%m-%d").strftime("%d/%m"),
                "abertas":     snap.tarefas_abertas      if snap else None,
                "em_andamento": snap.tarefas_em_andamento if snap else None,
                "concluidas":  snap.tarefas_concluidas   if snap else None,
                "atrasadas":   snap.tarefas_atrasadas    if snap else None,
            })
        return resultado

    # 3. Fallback: derivar burndown das tarefas pelo campo data_criacao/data_fechamento
    # Conta tarefas criadas até cada dia (cumulativo) e concluídas até cada dia
    tarefas_result = await db.execute(
        select(
            RedmineTarefa.data_criacao,
            RedmineTarefa.data_fechamento,
            RedmineTarefa.status,
        ).where(RedmineTarefa.empresa_id == empresa_id)
    )
    todas_tarefas = tarefas_result.fetchall()

    resultado = []
    data_inicio = hoje - timedelta(days=dias - 1)

    for i in range(dias):
        dia_dt = data_inicio + timedelta(days=i)
        dia_str = dia_dt.isoformat()
        dia_end = datetime.combine(dia_dt, datetime.max.time()).replace(tzinfo=timezone.utc)

        criadas_ate_dia  = 0
        fechadas_ate_dia = 0
        em_aberto        = 0

        for t in todas_tarefas:
            criacao   = t.data_criacao
            fechamento = t.data_fechamento
            status    = t.status or ""

            # Conta se foi criada até este dia
            if criacao and criacao <= dia_end:
                criadas_ate_dia += 1
                # Se foi fechada antes deste dia
                if fechamento and fechamento <= dia_end:
                    fechadas_ate_dia += 1
                else:
                    em_aberto += 1

        resultado.append({
            "data":        dia_str,
            "dia":         dia_dt.strftime("%d/%m"),
            "abertas":     em_aberto if criadas_ate_dia > 0 else None,
            "em_andamento": None,
            "concluidas":  fechadas_ate_dia if criadas_ate_dia > 0 else None,
            "atrasadas":   None,
        })

    return resultado
