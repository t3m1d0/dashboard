# ============================================================
# app/models/loja.py — Cadastro Central de Lojas / Filiais
# CSC (Centro de Serviços Compartilhados) Muniz
# ============================================================
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, DateTime, BigInteger, Index, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def now_utc():
    return datetime.now(timezone.utc)


class Loja(Base):
    """
    Cadastro central de lojas/filiais gerenciadas pelo CSC.
    É a entidade raiz que amarra todos os outros módulos.
    """
    __tablename__ = "lojas"

    id:          Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:  Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Identificação
    codigo:      Mapped[str]             = mapped_column(String(50), nullable=False)
    nome:        Mapped[str]             = mapped_column(String(300), nullable=False)
    razao_social: Mapped[Optional[str]]  = mapped_column(String(300))
    cnpj_cpf:    Mapped[Optional[str]]   = mapped_column(String(30))

    # Localização
    uf:          Mapped[Optional[str]]   = mapped_column(String(2))
    cidade:      Mapped[Optional[str]]   = mapped_column(String(100))
    endereco:    Mapped[Optional[str]]   = mapped_column(Text)
    cep:         Mapped[Optional[str]]   = mapped_column(String(10))

    # Agrupamento
    grupo:       Mapped[Optional[str]]   = mapped_column(String(100))
    # Ex: 'MUNIZ AUTO CENTER', 'ADMINISTRATIVO', 'SUB MATRIZ', 'OUTROS'
    subgrupo:    Mapped[Optional[str]]   = mapped_column(String(100))
    franqueado:  Mapped[Optional[str]]   = mapped_column(String(200))

    # Contato
    tel:         Mapped[Optional[str]]   = mapped_column(String(50))
    email:       Mapped[Optional[str]]   = mapped_column(String(200))
    responsavel: Mapped[Optional[str]]   = mapped_column(String(200))

    # Status
    ativa:       Mapped[bool]            = mapped_column(Boolean, default=True)
    observacao:  Mapped[Optional[str]]   = mapped_column(Text)

    # Controle
    importado_em:  Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc)
    atualizado_em: Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    __table_args__ = (
        Index("ix_loja_empresa_codigo", "empresa_id", "codigo", unique=True),
        Index("ix_loja_empresa",        "empresa_id"),
        Index("ix_loja_uf",             "uf"),
        Index("ix_loja_grupo",          "grupo"),
        Index("ix_loja_ativa",          "ativa"),
    )
