# ============================================================
# app/routers/redmine.py — Endpoints da integração Redmine
# ============================================================
import uuid
import logging
from typing import Optional, List, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from pydantic import BaseModel, HttpUrl

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.redmine import (
    RedmineConfig, RedmineProjeto, RedmineTarefa,
    RedmineComentario, RedmineMembro, RedmineSyncLog, RedmineMetricaSnapshot
)
from app.services.redmine import (
    RedmineClient, RedmineAPIError,
    encrypt_api_key, decrypt_api_key,
    RedmineSyncService, get_burndown
)

router = APIRouter(prefix="/redmine", tags=["Redmine"])
logger = logging.getLogger(__name__)


# ── Schemas inline (Pydantic v2) ──────────────────────────────
class ConfigCreate(BaseModel):
    url: str
    api_key: str
    sync_interval_min: int = 15

class ConfigResponse(BaseModel):
    id: uuid.UUID
    url: str
    ativo: bool
    ultimo_sync: Optional[Any] = None
    sync_interval_min: int
    configurado: bool = True

    class Config:
        from_attributes = True

class ProjetoResponse(BaseModel):
    id: uuid.UUID
    redmine_id: int
    identificador: str
    nome: str
    descricao: Optional[str] = None
    ativo: bool
    sincronizar: bool

    class Config:
        from_attributes = True

class TarefaResponse(BaseModel):
    id: uuid.UUID
    redmine_id: int
    projeto_id: uuid.UUID
    assunto: str
    descricao: Optional[str] = None
    status: str
    prioridade: str
    tracker: Optional[str] = None
    responsavel_nome: Optional[str] = None
    categoria: Optional[str] = None
    versao: Optional[str] = None
    estimativa_horas: Optional[float] = None
    horas_gastas: Optional[float] = None
    progresso: int
    tags: Optional[list] = []
    data_inicio: Optional[str] = None
    data_prazo: Optional[str] = None
    data_criacao: Optional[Any] = None
    data_fechamento: Optional[Any] = None
    atrasada: bool
    sincronizado_em: Any

    class Config:
        from_attributes = True


# ── Config / Setup ────────────────────────────────────────────
@router.get("/config", response_model=Optional[ConfigResponse])
async def get_config(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retorna config atual (sem expor a API key)."""
    result = await db.execute(
        select(RedmineConfig).where(RedmineConfig.empresa_id == current_user.empresa_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        return None
    return config


@router.post("/config", response_model=ConfigResponse)
async def save_config(
    body: ConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Salva/atualiza configuração do Redmine.
    Testa a conexão antes de salvar. API key é criptografada — nunca retornada.
    """
    # Testar conexão primeiro
    try:
        client = RedmineClient(body.url, body.api_key)
        user_info = await client.test_connection()
        logger.info(f"Redmine conectado como: {user_info.get('login', '?')}")
    except RedmineAPIError as e:
        raise HTTPException(400, f"Falha ao conectar no Redmine: {str(e)}")

    api_key_enc = encrypt_api_key(body.api_key, settings.SECRET_KEY)

    result = await db.execute(
        select(RedmineConfig).where(RedmineConfig.empresa_id == current_user.empresa_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.url           = body.url
        existing.api_key_enc   = api_key_enc
        existing.api_key_hash  = api_key_enc[:20]  # fingerprint para UI
        existing.sync_interval_min = body.sync_interval_min
        existing.ativo         = True
        config = existing
    else:
        config = RedmineConfig(
            empresa_id=current_user.empresa_id,
            url=body.url,
            api_key_enc=api_key_enc,
            api_key_hash=api_key_enc[:20],
            sync_interval_min=body.sync_interval_min,
        )
        db.add(config)

    await db.flush()
    return config


@router.delete("/config", status_code=204)
async def delete_config(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(RedmineConfig).where(RedmineConfig.empresa_id == current_user.empresa_id)
    )
    config = result.scalar_one_or_none()
    if config:
        config.ativo = False


# ── Sync ─────────────────────────────────────────────────────
@router.post("/sync")
async def trigger_sync(
    background_tasks: BackgroundTasks,
    tipo: str = Query("manual"),
    force_full: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Dispara sincronização. Roda em background para não bloquear a UI."""
    svc = RedmineSyncService(db)
    config = await svc.get_config(current_user.empresa_id)
    if not config:
        raise HTTPException(400, "Redmine não configurado")

    # Roda sync síncrono para feedback imediato no manual
    log = await svc.sync(current_user.empresa_id, tipo=tipo, force_full=force_full)
    return {
        "status":        log.status,
        "projetos_sync": log.projetos_sync,
        "tarefas_sync":  log.tarefas_sync,
        "membros_sync":  log.membros_sync,
        "duracao_ms":    log.duracao_ms,
        "erros":         log.erros or [],
    }


@router.get("/sync/logs")
async def get_sync_logs(
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(RedmineSyncLog)
        .where(RedmineSyncLog.empresa_id == current_user.empresa_id)
        .order_by(desc(RedmineSyncLog.criado_em))
        .limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id":            str(l.id),
            "tipo":          l.tipo,
            "status":        l.status,
            "projetos_sync": l.projetos_sync,
            "tarefas_sync":  l.tarefas_sync,
            "membros_sync":  l.membros_sync,
            "duracao_ms":    l.duracao_ms,
            "erros":         l.erros,
            "criado_em":     l.criado_em.isoformat() if l.criado_em else None,
        }
        for l in logs
    ]


# ── Projetos ─────────────────────────────────────────────────
@router.get("/projetos", response_model=List[ProjetoResponse])
async def get_projetos(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(RedmineProjeto)
        .where(and_(
            RedmineProjeto.empresa_id == current_user.empresa_id,
            RedmineProjeto.ativo == True,
        ))
        .order_by(RedmineProjeto.nome)
    )
    return result.scalars().all()


@router.patch("/projetos/{projeto_id}")
async def update_projeto(
    projeto_id: uuid.UUID,
    sincronizar: bool,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(RedmineProjeto).where(RedmineProjeto.id == projeto_id))
    proj = result.scalar_one_or_none()
    if not proj:
        raise HTTPException(404, "Projeto não encontrado")
    proj.sincronizar = sincronizar
    return {"ok": True}


# ── Tarefas ───────────────────────────────────────────────────
@router.get("/tarefas")
async def get_tarefas(
    projeto_id:  Optional[str]  = Query(None),
    status:      Optional[str]  = Query(None),
    prioridade:  Optional[str]  = Query(None),
    responsavel: Optional[str]  = Query(None),
    versao:      Optional[str]  = Query(None),
    atrasadas:   Optional[bool] = Query(None),
    busca:       Optional[str]  = Query(None),
    page:        int            = Query(1, ge=1),
    page_size:   int            = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filters = [RedmineTarefa.empresa_id == current_user.empresa_id]

    if projeto_id:
        # Resolve UUID ou redmine_id
        try:
            pid = uuid.UUID(projeto_id)
            filters.append(RedmineTarefa.projeto_id == pid)
        except ValueError:
            pass

    if status:
        filters.append(RedmineTarefa.status == status)
    if prioridade:
        filters.append(RedmineTarefa.prioridade == prioridade)
    if responsavel:
        filters.append(RedmineTarefa.responsavel_nome == responsavel)
    if versao:
        filters.append(RedmineTarefa.versao == versao)
    if atrasadas is not None:
        filters.append(RedmineTarefa.atrasada == atrasadas)
    if busca:
        filters.append(RedmineTarefa.assunto.ilike(f"%{busca}%"))

    total_q = select(func.count(RedmineTarefa.id)).where(and_(*filters))
    total   = (await db.execute(total_q)).scalar()

    q = (
        select(RedmineTarefa)
        .where(and_(*filters))
        .order_by(desc(RedmineTarefa.sincronizado_em))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = (await db.execute(q)).scalars().all()

    return {
        "total": total,
        "page": page,
        "items": [_tarefa_to_dict(t) for t in items],
    }


@router.get("/tarefas/kanban")
async def get_kanban(
    projeto_id: Optional[str] = Query(None),
    responsavel: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Tarefas agrupadas por status para o board Kanban."""
    filters = [RedmineTarefa.empresa_id == current_user.empresa_id]
    if projeto_id:
        try:
            filters.append(RedmineTarefa.projeto_id == uuid.UUID(projeto_id))
        except ValueError:
            pass
    if responsavel:
        filters.append(RedmineTarefa.responsavel_nome == responsavel)

    result = await db.execute(select(RedmineTarefa).where(and_(*filters)))
    tarefas = result.scalars().all()

    # Agrupa por status
    board: Dict[str, list] = {}
    for t in tarefas:
        board.setdefault(t.status, []).append(_tarefa_to_dict(t))

    return board


@router.get("/tarefas/{tarefa_id}")
async def get_tarefa(
    tarefa_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(RedmineTarefa).where(RedmineTarefa.id == tarefa_id))
    tarefa = result.scalar_one_or_none()
    if not tarefa:
        raise HTTPException(404, "Tarefa não encontrada")

    # Comentários
    c_result = await db.execute(
        select(RedmineComentario)
        .where(RedmineComentario.tarefa_id == tarefa_id)
        .order_by(RedmineComentario.criado_em)
    )
    comentarios = [
        {
            "id":         str(c.id),
            "autor":      c.autor_nome,
            "texto":      c.texto,
            "criado_em":  c.criado_em.isoformat() if c.criado_em else None,
        }
        for c in c_result.scalars().all()
    ]

    data = _tarefa_to_dict(tarefa)
    data["comentarios"] = comentarios
    return data


# ── Dashboard / Métricas ──────────────────────────────────────
@router.get("/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Payload completo para o dashboard de desenvolvimento."""
    empresa_id = current_user.empresa_id

    # Config
    config_result = await db.execute(
        select(RedmineConfig).where(RedmineConfig.empresa_id == empresa_id)
    )
    config = config_result.scalar_one_or_none()

    # KPIs globais (snapshot mais recente)
    snap_result = await db.execute(
        select(RedmineMetricaSnapshot).where(
            and_(
                RedmineMetricaSnapshot.empresa_id == empresa_id,
                RedmineMetricaSnapshot.membro_id.is_(None),
            )
        ).order_by(desc(RedmineMetricaSnapshot.criado_em)).limit(1)
    )
    snap = snap_result.scalar_one_or_none()

    # Burndown 14 dias
    burndown = await get_burndown(db, empresa_id, dias=14)

    # Métricas por membro
    membros_result = await db.execute(
        select(RedmineMetricaSnapshot).where(
            and_(
                RedmineMetricaSnapshot.empresa_id == empresa_id,
                RedmineMetricaSnapshot.membro_id.isnot(None),
            )
        ).order_by(desc(RedmineMetricaSnapshot.criado_em))
    )
    # Pega apenas o snapshot mais recente por membro
    membros_snap: Dict[int, Any] = {}
    for m in membros_result.scalars().all():
        if m.membro_id not in membros_snap:
            membros_snap[m.membro_id] = m

    membros_lista = [
        {
            "membro_id":     m.membro_id,
            "nome":          m.membro_nome,
            "abertas":       m.tarefas_abertas,
            "em_andamento":  m.tarefas_em_andamento,
            "concluidas":    m.tarefas_concluidas,
            "atrasadas":     m.tarefas_atrasadas,
            "horas_gastas":  m.horas_gastas,
            "taxa_conclusao": round(m.tarefas_concluidas / max(m.tarefas_abertas + m.tarefas_em_andamento + m.tarefas_concluidas, 1) * 100, 1),
            "tempo_medio":   m.tempo_medio_resolucao_horas,
        }
        for m in sorted(membros_snap.values(), key=lambda x: x.tarefas_concluidas, reverse=True)
    ]

    # Distribuição por status
    status_result = await db.execute(
        select(RedmineTarefa.status, func.count(RedmineTarefa.id))
        .where(RedmineTarefa.empresa_id == empresa_id)
        .group_by(RedmineTarefa.status)
        .order_by(desc(func.count(RedmineTarefa.id)))
    )
    por_status = [{"status": r[0], "total": r[1]} for r in status_result]

    # Distribuição por prioridade
    prio_result = await db.execute(
        select(RedmineTarefa.prioridade, func.count(RedmineTarefa.id))
        .where(RedmineTarefa.empresa_id == empresa_id)
        .group_by(RedmineTarefa.prioridade)
    )
    por_prioridade = [{"prioridade": r[0], "total": r[1]} for r in prio_result]

    # Tarefas atrasadas recentes
    atrasadas_result = await db.execute(
        select(RedmineTarefa)
        .where(and_(RedmineTarefa.empresa_id == empresa_id, RedmineTarefa.atrasada == True))
        .order_by(RedmineTarefa.data_prazo)
        .limit(10)
    )

    return {
        "configurado":    config is not None and config.ativo,
        "ultimo_sync":    config.ultimo_sync.isoformat() if config and config.ultimo_sync else None,
        "kpis": {
            "abertas":       snap.tarefas_abertas      if snap else 0,
            "em_andamento":  snap.tarefas_em_andamento if snap else 0,
            "concluidas":    snap.tarefas_concluidas   if snap else 0,
            "atrasadas":     snap.tarefas_atrasadas    if snap else 0,
            "horas_gastas":  snap.horas_gastas         if snap else 0,
            "horas_estimadas": snap.horas_estimadas    if snap else 0,
            "tempo_medio_resolucao": snap.tempo_medio_resolucao_horas if snap else None,
        },
        "burndown":        burndown,
        "por_status":      por_status,
        "por_prioridade":  por_prioridade,
        "equipe":          membros_lista,
        "atrasadas":       [_tarefa_to_dict(t) for t in atrasadas_result.scalars().all()],
    }


@router.get("/filtros")
async def get_filtros(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retorna valores únicos para popular os dropdowns de filtro."""
    empresa_id = current_user.empresa_id

    async def distinct(col):
        r = await db.execute(
            select(col).where(
                and_(RedmineTarefa.empresa_id == empresa_id, col.isnot(None))
            ).distinct().order_by(col)
        )
        return [x[0] for x in r if x[0]]

    return {
        "status":       await distinct(RedmineTarefa.status),
        "prioridades":  await distinct(RedmineTarefa.prioridade),
        "responsaveis": await distinct(RedmineTarefa.responsavel_nome),
        "versoes":      await distinct(RedmineTarefa.versao),
        "trackers":     await distinct(RedmineTarefa.tracker),
    }


# ── Helper ────────────────────────────────────────────────────
def _tarefa_to_dict(t: RedmineTarefa) -> dict:
    return {
        "id":               str(t.id),
        "redmine_id":       t.redmine_id,
        "projeto_id":       str(t.projeto_id),
        "assunto":          t.assunto,
        "descricao":        t.descricao,
        "status":           t.status,
        "prioridade":       t.prioridade,
        "prioridade_id":    t.prioridade_id,
        "tracker":          t.tracker,
        "responsavel":      t.responsavel_nome,
        "responsavel_id":   t.responsavel_id,
        "categoria":        t.categoria,
        "versao":           t.versao,
        "estimativa_horas": t.estimativa_horas,
        "horas_gastas":     t.horas_gastas,
        "progresso":        t.progresso,
        "tags":             t.tags or [],
        "data_inicio":      t.data_inicio,
        "data_prazo":       t.data_prazo,
        "data_criacao":     t.data_criacao.isoformat() if t.data_criacao else None,
        "data_fechamento":  t.data_fechamento.isoformat() if t.data_fechamento else None,
        "atrasada":         t.atrasada,
        "sincronizado_em":  t.sincronizado_em.isoformat() if t.sincronizado_em else None,
    }


# ── Entregas (tarefas concluídas → cards de entrega) ──────────
@router.get("/entregas")
async def get_entregas(
    limit: int = Query(30, le=100),
    projeto_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Retorna tarefas concluídas do Redmine formatadas como Entregas Estratégicas.
    Fallback: retorna lista vazia se Redmine não configurado (frontend usa JSON estático).
    """
    from app.services.redmine.metrics import CLOSED_STATUSES

    empresa_id = current_user.empresa_id

    # Verifica se Redmine está configurado
    cfg = await db.execute(
        select(RedmineConfig).where(
            and_(RedmineConfig.empresa_id == empresa_id, RedmineConfig.ativo == True)
        )
    )
    if not cfg.scalar_one_or_none():
        return {"configurado": False, "items": []}

    filters = [
        RedmineTarefa.empresa_id == empresa_id,
        RedmineTarefa.status.in_(list(CLOSED_STATUSES)),
    ]
    if projeto_id:
        try:
            filters.append(RedmineTarefa.projeto_id == uuid.UUID(projeto_id))
        except ValueError:
            pass

    q = (
        select(RedmineTarefa, RedmineProjeto.nome.label("projeto_nome"))
        .join(RedmineProjeto, RedmineTarefa.projeto_id == RedmineProjeto.id)
        .where(and_(*filters))
        .order_by(desc(RedmineTarefa.data_fechamento))
        .limit(limit)
    )
    rows = (await db.execute(q)).all()

    # Mapeia tracker → ícone/cor padrão
    TRACKER_ICON = {
        "Bug": "bug", "Feature": "star", "Task": "check-square",
        "Melhoria": "trending-up", "Suporte": "headphones",
    }
    TRACKER_COR = {
        "Bug": "#ef4444", "Feature": "#8b5cf6", "Task": "#3b82f6",
        "Melhoria": "#10b981", "Suporte": "#06b6d4",
    }
    PRIO_IMPACTO = {
        "Urgente": "Crítico", "Alta": "Alto", "Normal": "Médio", "Baixa": "Baixo", "Imediata": "Crítico",
    }

    items = []
    for row in rows:
        t: RedmineTarefa = row[0]
        proj_nome: str   = row[1]

        cor   = TRACKER_COR.get(t.tracker or "", "#8b5cf6")
        icone = TRACKER_ICON.get(t.tracker or "", "check-square")

        # Ganho estimado: horas gastas ou estimativa
        if t.horas_gastas and t.horas_gastas > 0:
            ganho = f"{t.horas_gastas:.0f}h investidas"
        elif t.estimativa_horas and t.estimativa_horas > 0:
            ganho = f"{t.estimativa_horas:.0f}h estimadas"
        else:
            ganho = "Entregue"

        items.append({
            "id":             str(t.id),
            "redmine_id":     t.redmine_id,
            "titulo":         t.assunto,
            "descricao":      (t.descricao or "")[:300] if t.descricao else f"Tarefa #{t.redmine_id} do projeto {proj_nome}",
            "impacto":        PRIO_IMPACTO.get(t.prioridade, "Médio"),
            "areaBeneficiada": proj_nome,
            "ganhoEstimado":  ganho,
            "status":         "Concluído",
            "data":           t.data_fechamento.isoformat() if t.data_fechamento else t.sincronizado_em.isoformat(),
            "icone":          icone,
            "cor":            cor,
            "tracker":        t.tracker,
            "responsavel":    t.responsavel_nome,
            "versao":         t.versao,
            "horas_gastas":   t.horas_gastas,
            "projeto":        proj_nome,
            "redmine_url":    None,  # populado pelo frontend com a URL base
        })

    return {"configurado": True, "items": items}


# ── Roadmap (tarefas em aberto por versão/sprint) ─────────────
@router.get("/roadmap")
async def get_roadmap(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Deriva o Roadmap a partir das tarefas abertas do Redmine.
    Agrupa por versão/sprint → categoria do roadmap.
    Fallback: retorna lista vazia se Redmine não configurado.
    """
    from app.services.redmine.metrics import CLOSED_STATUSES

    empresa_id = current_user.empresa_id

    cfg = await db.execute(
        select(RedmineConfig).where(
            and_(RedmineConfig.empresa_id == empresa_id, RedmineConfig.ativo == True)
        )
    )
    config = cfg.scalar_one_or_none()
    if not config:
        return {"configurado": False, "items": [], "sprints": []}

    # Tarefas NÃO concluídas
    q = (
        select(RedmineTarefa, RedmineProjeto.nome.label("projeto_nome"))
        .join(RedmineProjeto, RedmineTarefa.projeto_id == RedmineProjeto.id)
        .where(
            and_(
                RedmineTarefa.empresa_id == empresa_id,
                RedmineTarefa.status.not_in(list(CLOSED_STATUSES)),
            )
        )
        .order_by(RedmineTarefa.data_prazo.asc().nulls_last(), RedmineTarefa.prioridade_id.asc())
    )
    rows = (await db.execute(q)).all()

    # Determina categoria com base na data/versão
    from datetime import date, timedelta
    hoje = date.today()

    def _categoria(t: RedmineTarefa) -> str:
        if t.versao:
            return t.versao  # usa o nome da sprint como categoria
        if not t.data_prazo:
            return "Sem Prazo"
        prazo = date.fromisoformat(t.data_prazo)
        diff  = (prazo - hoje).days
        if diff < 0:
            return "Atrasado"
        if diff <= 30:
            return "Próximas Entregas"
        if diff <= 90:
            return "Melhorias Planejadas"
        return "Projetos Futuros"

    PRIO_MAP = {
        "Imediata": "Crítica", "Urgente": "Crítica",
        "Alta": "Alta", "Normal": "Média", "Baixa": "Baixa",
    }
    CATEGORIA_COR = {
        "Próximas Entregas":    "#3b82f6",
        "Melhorias Planejadas": "#8b5cf6",
        "Projetos Futuros":     "#10b981",
        "Atrasado":             "#ef4444",
        "Sem Prazo":            "#6b7280",
    }

    items = []
    sprints_vistas: set = set()

    for row in rows:
        t: RedmineTarefa = row[0]
        proj_nome: str   = row[1]
        cat = _categoria(t)
        if t.versao:
            sprints_vistas.add(t.versao)

        cor = CATEGORIA_COR.get(cat, "#8b5cf6")

        items.append({
            "id":          str(t.id),
            "redmine_id":  t.redmine_id,
            "titulo":      t.assunto,
            "descricao":   (t.descricao or "")[:200] if t.descricao else f"#{t.redmine_id} · {proj_nome}",
            "categoria":   cat,
            "prazo":       t.data_prazo or "—",
            "prioridade":  PRIO_MAP.get(t.prioridade, "Média"),
            "impacto":     proj_nome,
            "status":      t.status,
            "responsavel": t.responsavel_nome,
            "tracker":     t.tracker,
            "progresso":   t.progresso,
            "atrasada":    t.atrasada,
            "versao":      t.versao,
            "cor":         cor,
            "projeto":     proj_nome,
        })

    return {
        "configurado": True,
        "items":       items,
        "sprints":     sorted(list(sprints_vistas)),
        "ultimo_sync": config.ultimo_sync.isoformat() if config.ultimo_sync else None,
    }
