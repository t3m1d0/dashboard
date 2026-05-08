# ============================================================
# app/models/compras.py — Movimentação de Produtos
# ============================================================
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, Integer, Float, DateTime, BigInteger, Index, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def now_utc():
    return datetime.now(timezone.utc)


class MovimentacaoProduto(Base):
    """
    Representa uma linha do relatório de movimentação de produtos.
    Chave de negócio: (empresa_id, id_filial, id_produto, periodo)
    Upsert inteligente — sem duplicação ao reimportar.
    """
    __tablename__ = "movimentacoes_produtos"

    id:           Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:   Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Identificadores
    id_filial:    Mapped[int]             = mapped_column(BigInteger, nullable=False)
    nome_filial:  Mapped[str]             = mapped_column(String(300), nullable=False)
    id_produto:   Mapped[int]             = mapped_column(BigInteger, nullable=False)
    nome_produto: Mapped[str]             = mapped_column(String(500), nullable=False)
    grupo:        Mapped[Optional[str]]   = mapped_column(String(200))

    # Período do snapshot (YYYY-MM ou identificador do arquivo)
    periodo:      Mapped[Optional[str]]   = mapped_column(String(20), nullable=True)

    # Estoque
    estoque_anterior: Mapped[float]       = mapped_column(Float, default=0)
    custo_anterior:   Mapped[float]       = mapped_column(Float, default=0)

    # Entradas
    qtd_entrada:      Mapped[float]       = mapped_column(Float, default=0)
    custo_entrada:    Mapped[float]       = mapped_column(Float, default=0)

    # Saídas
    qtd_saida:        Mapped[float]       = mapped_column(Float, default=0)
    custo_saida:      Mapped[float]       = mapped_column(Float, default=0)

    # Estoque final
    estoque_final:    Mapped[float]       = mapped_column(Float, default=0)
    custo_final:      Mapped[float]       = mapped_column(Float, default=0)

    # Controle
    importado_em:     Mapped[datetime]    = mapped_column(DateTime(timezone=True), default=now_utc)
    atualizado_em:    Mapped[datetime]    = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    dados_hash:       Mapped[Optional[str]] = mapped_column(String(64))

    __table_args__ = (
        Index("ix_mp_empresa_filial_produto_periodo",
              "empresa_id", "id_filial", "id_produto", "periodo", unique=True),
        Index("ix_mp_grupo",     "grupo"),
        Index("ix_mp_periodo",   "periodo"),
        Index("ix_mp_empresa",   "empresa_id"),
    )
