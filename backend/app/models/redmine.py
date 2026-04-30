# ============================================================
# app/models/redmine.py — Modelos para integração Redmine
# ============================================================
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Text, Boolean, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


def now_utc():
    return datetime.now(timezone.utc)


# ── Configuração da integração Redmine por empresa ───────────
class RedmineConfig(Base):
    """
    Armazena credenciais do Redmine por empresa.
    A API KEY nunca é exposta ao frontend — apenas validada no backend.
    """
    __tablename__ = "redmine_configs"

    id:           Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:   Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id"), unique=True, nullable=False)
    url:          Mapped[str]       = mapped_column(String(500), nullable=False)   # https://redmine.empresa.com
    api_key_hash: Mapped[str]       = mapped_column(Text, nullable=False)          # hash bcrypt da key
    api_key_enc:  Mapped[str]       = mapped_column(Text, nullable=False)          # key criptografada (Fernet)
    ativo:        Mapped[bool]      = mapped_column(Boolean, default=True)
    ultimo_sync:  Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    sync_interval_min: Mapped[int]  = mapped_column(Integer, default=15)           # intervalo em minutos
    criado_em:    Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=now_utc)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    empresa:      Mapped["Empresa"] = relationship("Empresa")  # type: ignore
    projetos:     Mapped[List["RedmineProjeto"]] = relationship(back_populates="config", cascade="all, delete-orphan")
    sync_logs:    Mapped[List["RedmineSyncLog"]] = relationship(back_populates="config", cascade="all, delete-orphan")


# ── Projetos sincronizados do Redmine ────────────────────────
class RedmineProjeto(Base):
    __tablename__ = "redmine_projetos"

    id:           Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    config_id:    Mapped[uuid.UUID] = mapped_column(ForeignKey("redmine_configs.id"), nullable=False)
    empresa_id:   Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id"), nullable=False)
    redmine_id:   Mapped[int]       = mapped_column(Integer, nullable=False)       # ID no Redmine
    identificador: Mapped[str]      = mapped_column(String(100), nullable=False)   # slug/identifier
    nome:         Mapped[str]       = mapped_column(String(200), nullable=False)
    descricao:    Mapped[Optional[str]] = mapped_column(Text)
    ativo:        Mapped[bool]      = mapped_column(Boolean, default=True)
    sincronizar:  Mapped[bool]      = mapped_column(Boolean, default=True)         # se deve ser sincronizado
    criado_em:    Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=now_utc)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    config:       Mapped["RedmineConfig"]       = relationship(back_populates="projetos")
    tarefas:      Mapped[List["RedmineTarefa"]] = relationship(back_populates="projeto", cascade="all, delete-orphan")


# ── Tarefas (Issues) sincronizadas ───────────────────────────
class RedmineTarefa(Base):
    __tablename__ = "redmine_tarefas"

    id:              Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    projeto_id:      Mapped[uuid.UUID]      = mapped_column(ForeignKey("redmine_projetos.id"), nullable=False)
    empresa_id:      Mapped[uuid.UUID]      = mapped_column(ForeignKey("empresas.id"), nullable=False)
    redmine_id:      Mapped[int]            = mapped_column(Integer, nullable=False)
    assunto:         Mapped[str]            = mapped_column(String(500), nullable=False)
    descricao:       Mapped[Optional[str]]  = mapped_column(Text)
    status:          Mapped[str]            = mapped_column(String(80), nullable=False)    # nome do status no Redmine
    status_id:       Mapped[int]            = mapped_column(Integer, nullable=False)
    prioridade:      Mapped[str]            = mapped_column(String(50), nullable=False)
    prioridade_id:   Mapped[int]            = mapped_column(Integer, nullable=False)
    tracker:         Mapped[str]            = mapped_column(String(80))                    # Bug, Feature, Task etc
    responsavel_nome: Mapped[Optional[str]] = mapped_column(String(150))
    responsavel_id:  Mapped[Optional[int]]  = mapped_column(Integer)
    autor_nome:      Mapped[Optional[str]]  = mapped_column(String(150))
    categoria:       Mapped[Optional[str]]  = mapped_column(String(150))
    versao:          Mapped[Optional[str]]  = mapped_column(String(100))                   # sprint/milestone
    estimativa_horas: Mapped[Optional[float]] = mapped_column(Float)
    horas_gastas:    Mapped[Optional[float]] = mapped_column(Float)
    progresso:       Mapped[int]            = mapped_column(Integer, default=0)
    tags:            Mapped[Optional[list]] = mapped_column(JSON, default=list)
    data_inicio:     Mapped[Optional[str]]  = mapped_column(String(10))                   # YYYY-MM-DD
    data_prazo:      Mapped[Optional[str]]  = mapped_column(String(10))
    data_criacao:    Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    data_atualizacao: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    data_fechamento: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    atrasada:        Mapped[bool]           = mapped_column(Boolean, default=False)
    dados_extras:    Mapped[Optional[dict]] = mapped_column(JSON)                          # campos customizados
    sincronizado_em: Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc)

    projeto:         Mapped["RedmineProjeto"]        = relationship(back_populates="tarefas")
    comentarios:     Mapped[List["RedmineComentario"]] = relationship(back_populates="tarefa", cascade="all, delete-orphan")


# ── Comentários das tarefas ───────────────────────────────────
class RedmineComentario(Base):
    __tablename__ = "redmine_comentarios"

    id:           Mapped[uuid.UUID]     = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tarefa_id:    Mapped[uuid.UUID]     = mapped_column(ForeignKey("redmine_tarefas.id"), nullable=False)
    redmine_id:   Mapped[int]           = mapped_column(Integer, nullable=False)
    autor_nome:   Mapped[str]           = mapped_column(String(150), nullable=False)
    autor_id:     Mapped[int]           = mapped_column(Integer)
    texto:        Mapped[str]           = mapped_column(Text, nullable=False)
    criado_em:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc)

    tarefa:       Mapped["RedmineTarefa"] = relationship(back_populates="comentarios")


# ── Membros da equipe (Redmine users) ────────────────────────
class RedmineMembro(Base):
    __tablename__ = "redmine_membros"

    id:              Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:      Mapped[uuid.UUID]      = mapped_column(ForeignKey("empresas.id"), nullable=False)
    redmine_id:      Mapped[int]            = mapped_column(Integer, nullable=False)
    nome:            Mapped[str]            = mapped_column(String(150), nullable=False)
    login:           Mapped[Optional[str]]  = mapped_column(String(100))
    email:           Mapped[Optional[str]]  = mapped_column(String(150))
    ativo:           Mapped[bool]           = mapped_column(Boolean, default=True)
    avatar_url:      Mapped[Optional[str]]  = mapped_column(String(500))
    criado_em:       Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc)


# ── Snapshots de métricas de produtividade ───────────────────
class RedmineMetricaSnapshot(Base):
    """Snapshot diário de métricas por membro — para histórico e gráficos."""
    __tablename__ = "redmine_metricas"

    id:             Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:     Mapped[uuid.UUID]      = mapped_column(ForeignKey("empresas.id"), nullable=False)
    membro_id:      Mapped[Optional[int]]  = mapped_column(Integer)                    # redmine user id
    membro_nome:    Mapped[Optional[str]]  = mapped_column(String(150))
    periodo:        Mapped[str]            = mapped_column(String(10))                 # YYYY-MM-DD
    tarefas_abertas: Mapped[int]           = mapped_column(Integer, default=0)
    tarefas_em_andamento: Mapped[int]      = mapped_column(Integer, default=0)
    tarefas_concluidas: Mapped[int]        = mapped_column(Integer, default=0)
    tarefas_atrasadas: Mapped[int]         = mapped_column(Integer, default=0)
    horas_estimadas: Mapped[float]         = mapped_column(Float, default=0)
    horas_gastas:   Mapped[float]          = mapped_column(Float, default=0)
    tempo_medio_resolucao_horas: Mapped[Optional[float]] = mapped_column(Float)
    dados:          Mapped[Optional[dict]] = mapped_column(JSON)
    criado_em:      Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc)


# ── Logs de sincronização ────────────────────────────────────
class RedmineSyncLog(Base):
    __tablename__ = "redmine_sync_logs"

    id:             Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    config_id:      Mapped[uuid.UUID]      = mapped_column(ForeignKey("redmine_configs.id"), nullable=False)
    empresa_id:     Mapped[uuid.UUID]      = mapped_column(ForeignKey("empresas.id"), nullable=False)
    tipo:           Mapped[str]            = mapped_column(String(50))                 # full | incremental | manual
    status:         Mapped[str]            = mapped_column(String(20), default="ok")   # ok | erro | parcial
    projetos_sync:  Mapped[int]            = mapped_column(Integer, default=0)
    tarefas_sync:   Mapped[int]            = mapped_column(Integer, default=0)
    membros_sync:   Mapped[int]            = mapped_column(Integer, default=0)
    erros:          Mapped[Optional[list]] = mapped_column(JSON)
    duracao_ms:     Mapped[Optional[int]]  = mapped_column(Integer)
    criado_em:      Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc)

    config:         Mapped["RedmineConfig"] = relationship(back_populates="sync_logs")
