# ============================================================
# app/models/ — Modelos SQLAlchemy (mapeamento PostgreSQL)
# ============================================================
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    String, Text, Boolean, Integer, Float, DateTime,
    ForeignKey, JSON, Enum as SAEnum, SmallInteger
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


def now_utc():
    return datetime.now(timezone.utc)


# ── Empresa ──────────────────────────────────────────────────
class Empresa(Base):
    __tablename__ = "empresas"

    id:          Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome:        Mapped[str]        = mapped_column(String(150), nullable=False)
    slug:        Mapped[str]        = mapped_column(String(80), unique=True, nullable=False)
    plano:       Mapped[str]        = mapped_column(String(30), default="standard")
    ativo:       Mapped[bool]       = mapped_column(Boolean, default=True)
    criado_em:   Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=now_utc)

    usuarios:    Mapped[List["Usuario"]]  = relationship(back_populates="empresa")
    franquias:   Mapped[List["Franquia"]] = relationship(back_populates="empresa")
    projetos:    Mapped[List["Projeto"]]  = relationship(back_populates="empresa")
    kpi_snapshots: Mapped[List["KPISnapshot"]] = relationship(back_populates="empresa")


# ── Franquia ──────────────────────────────────────────────────
class Franquia(Base):
    __tablename__ = "franquias"

    id:          Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:  Mapped[uuid.UUID]  = mapped_column(ForeignKey("empresas.id"), nullable=False)
    nome:        Mapped[str]        = mapped_column(String(150), nullable=False)
    cidade:      Mapped[Optional[str]] = mapped_column(String(100))
    uf:          Mapped[Optional[str]] = mapped_column(String(2))
    ativo:       Mapped[bool]       = mapped_column(Boolean, default=True)
    criado_em:   Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=now_utc)

    empresa:     Mapped["Empresa"]  = relationship(back_populates="franquias")
    chamados:    Mapped[List["Chamado"]] = relationship(back_populates="franquia")


# ── Usuario ───────────────────────────────────────────────────
class Usuario(Base):
    __tablename__ = "usuarios"

    id:           Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:   Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("empresas.id"))
    nome:         Mapped[str]       = mapped_column(String(100), nullable=False)
    email:        Mapped[str]       = mapped_column(String(150), unique=True, nullable=False)
    senha_hash:   Mapped[str]       = mapped_column(Text, nullable=False)
    cargo:        Mapped[Optional[str]] = mapped_column(String(80))
    role:         Mapped[str]       = mapped_column(String(30), default="viewer")  # viewer|editor|admin|superadmin
    ativo:        Mapped[bool]      = mapped_column(Boolean, default=True)
    ultimo_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    criado_em:    Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=now_utc)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    empresa:      Mapped[Optional["Empresa"]] = relationship(back_populates="usuarios")
    chamados:     Mapped[List["Chamado"]]     = relationship(back_populates="responsavel")
    projetos:     Mapped[List["Projeto"]]     = relationship(back_populates="responsavel")
    uploads:      Mapped[List["Upload"]]      = relationship(back_populates="usuario")
    audit_logs:   Mapped[List["AuditLog"]]    = relationship(back_populates="usuario")


# ── Chamado (Sustentação) ─────────────────────────────────────
class Chamado(Base):
    __tablename__ = "chamados"

    id:             Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:     Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("empresas.id"))
    franquia_id:    Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("franquias.id"))
    responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("usuarios.id"))

    titulo:         Mapped[str]        = mapped_column(String(200), nullable=False)
    descricao:      Mapped[Optional[str]] = mapped_column(Text)
    categoria:      Mapped[Optional[str]] = mapped_column(String(80))
    assunto:        Mapped[Optional[str]] = mapped_column(String(150))
    prioridade:     Mapped[str]        = mapped_column(String(20), default="media")  # baixa|media|alta|critica
    status:         Mapped[str]        = mapped_column(String(30), default="aberto") # aberto|em_atendimento|resolvido|fechado
    dentro_sla:     Mapped[Optional[bool]] = mapped_column(Boolean)
    sla_prazo:      Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    resolvido_em:   Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    criado_em:      Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=now_utc)
    atualizado_em:  Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    franquia:       Mapped[Optional["Franquia"]] = relationship(back_populates="chamados")
    responsavel:    Mapped[Optional["Usuario"]]  = relationship(back_populates="chamados")


# ── Projeto (Kanban) ──────────────────────────────────────────
class Projeto(Base):
    __tablename__ = "projetos"

    id:             Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:     Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("empresas.id"))
    responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("usuarios.id"))

    titulo:         Mapped[str]        = mapped_column(String(200), nullable=False)
    descricao:      Mapped[Optional[str]] = mapped_column(Text)
    prioridade:     Mapped[str]        = mapped_column(String(20), default="media")  # baixa|media|alta|critica
    status:         Mapped[str]        = mapped_column(String(30), default="backlog") # backlog|desenvolvimento|homologacao|validacao|producao
    progresso:      Mapped[int]        = mapped_column(SmallInteger, default=0)
    prazo:          Mapped[Optional[str]] = mapped_column(String(10))  # YYYY-MM-DD
    tags:           Mapped[Optional[list]] = mapped_column(JSON, default=list)
    criado_em:      Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=now_utc)
    atualizado_em:  Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    empresa:        Mapped[Optional["Empresa"]] = relationship(back_populates="projetos")
    responsavel:    Mapped[Optional["Usuario"]] = relationship(back_populates="projetos")


# ── KPI Snapshot (métricas mensais) ───────────────────────────
class KPISnapshot(Base):
    __tablename__ = "kpi_snapshots"

    id:          Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:  Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("empresas.id"))
    periodo:     Mapped[str]        = mapped_column(String(7), nullable=False)  # '2025-04'
    mes:         Mapped[str]        = mapped_column(String(20))
    ano:         Mapped[int]        = mapped_column(Integer)
    dados:       Mapped[dict]       = mapped_column(JSON, nullable=False)       # payload completo
    criado_em:   Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=now_utc)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    empresa:     Mapped[Optional["Empresa"]] = relationship(back_populates="kpi_snapshots")


# ── Upload ────────────────────────────────────────────────────
class Upload(Base):
    __tablename__ = "uploads"

    id:          Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id:  Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("usuarios.id"))
    empresa_id:  Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("empresas.id"))

    tipo:        Mapped[str]        = mapped_column(String(50), nullable=False)  # sustentacao|projetos|kpis|roadmap
    nome_arquivo: Mapped[str]       = mapped_column(String(255), nullable=False)
    caminho:     Mapped[str]        = mapped_column(Text, nullable=False)
    tamanho_bytes: Mapped[Optional[int]] = mapped_column(Integer)
    total_registros: Mapped[Optional[int]] = mapped_column(Integer)
    status:      Mapped[str]        = mapped_column(String(20), default="processado")
    criado_em:   Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=now_utc)

    usuario:     Mapped[Optional["Usuario"]] = relationship(back_populates="uploads")


# ── Audit Log ─────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id:          Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id:  Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("usuarios.id"))
    acao:        Mapped[str]        = mapped_column(String(100), nullable=False)
    entidade:    Mapped[Optional[str]] = mapped_column(String(80))
    entidade_id: Mapped[Optional[str]] = mapped_column(String(36))
    dados:       Mapped[Optional[dict]] = mapped_column(JSON)
    ip:          Mapped[Optional[str]] = mapped_column(String(45))
    criado_em:   Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=now_utc)

    usuario:     Mapped[Optional["Usuario"]] = relationship(back_populates="audit_logs")
