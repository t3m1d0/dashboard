# ============================================================
# app/models/financeiro.py — Módulo Financeiro
# Espelha a estrutura do dashboard HTML (REDE + lançamentos CSV)
# ============================================================
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, Float, DateTime, BigInteger, Date, Index, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def now_utc():
    return datetime.now(timezone.utc)


class FinFranqueado(Base):
    """Franqueado da rede Muniz — espelha REDE.franqueados[]"""
    __tablename__ = "fin_franqueados"

    id:        Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo:    Mapped[str]            = mapped_column(String(20), nullable=False)   # ex: f14
    nome:      Mapped[str]            = mapped_column(String(200), nullable=False)
    cidade:    Mapped[Optional[str]]  = mapped_column(String(100))
    uf:        Mapped[Optional[str]]  = mapped_column(String(2))
    status:    Mapped[str]            = mapped_column(String(20), default='ativa')
    email:     Mapped[Optional[str]]  = mapped_column(String(200))
    tel:       Mapped[Optional[str]]  = mapped_column(String(50))
    criado_em: Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc)

    __table_args__ = (
        Index("ix_fin_franq_codigo", "codigo", unique=True),
    )


class FinRegiao(Base):
    """Região de um franqueado — espelha REDE.regioes[]"""
    __tablename__ = "fin_regioes"

    id:           Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo:       Mapped[str]            = mapped_column(String(20), nullable=False)  # ex: rg1
    nome:         Mapped[str]            = mapped_column(String(100), nullable=False)
    franqueado_id: Mapped[uuid.UUID]     = mapped_column(UUID(as_uuid=True), nullable=False)
    franqueado_codigo: Mapped[str]       = mapped_column(String(20), nullable=False)  # fid de referência

    __table_args__ = (
        Index("ix_fin_regiao_codigo", "codigo", unique=True),
    )


class FinLoja(Base):
    """Loja da rede — espelha REDE.lojas[]"""
    __tablename__ = "fin_lojas"

    id:               Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo:           Mapped[str]            = mapped_column(String(20), nullable=False)   # ex: l32
    nome:             Mapped[str]            = mapped_column(String(200), nullable=False)
    cidade:           Mapped[Optional[str]]  = mapped_column(String(100))
    uf:               Mapped[Optional[str]]  = mapped_column(String(2))
    status:           Mapped[str]            = mapped_column(String(20), default='ativa')
    franqueado_id:    Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), nullable=False)
    franqueado_codigo: Mapped[str]           = mapped_column(String(20), nullable=False)
    regiao_id:        Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    regiao_codigo:    Mapped[Optional[str]]  = mapped_column(String(20))
    criado_em:        Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc)

    __table_args__ = (
        Index("ix_fin_loja_codigo", "codigo", unique=True),
        Index("ix_fin_loja_franqueado", "franqueado_id"),
    )


class FinLancamento(Base):
    """
    Lançamento financeiro importado via CSV.
    Cobre os 5 tipos: recebidas, pagas, a_receber, a_pagar, extratos
    Chave de upsert: (loja_codigo, tipo, codigo_interno, periodo)
    """
    __tablename__ = "fin_lancamentos"

    id:           Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:   Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Relacionamento com loja
    loja_id:      Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    loja_codigo:  Mapped[str]            = mapped_column(String(20), nullable=False)
    loja_nome:    Mapped[Optional[str]]  = mapped_column(String(200))

    # Tipo de lançamento
    tipo:         Mapped[str]            = mapped_column(String(30), nullable=False)
    # recebidas | pagas | a_receber | a_pagar | extrato

    # Período (YYYY-MM) para separar importações por mês
    periodo:      Mapped[Optional[str]]  = mapped_column(String(20))

    # Campos do CSV (todos opcionais pois variam por ERP)
    codigo:        Mapped[Optional[str]] = mapped_column(String(100))   # código interno
    cliente:       Mapped[Optional[str]] = mapped_column(String(300))
    fornecedor:    Mapped[Optional[str]] = mapped_column(String(300))
    valor:         Mapped[float]         = mapped_column(Float, default=0)
    plano:         Mapped[Optional[str]] = mapped_column(String(200))   # forma de pagamento
    parcela:       Mapped[Optional[str]] = mapped_column(String(50))
    conta:         Mapped[Optional[str]] = mapped_column(String(200))
    centro_custo:  Mapped[Optional[str]] = mapped_column(String(200))
    descricao:     Mapped[Optional[str]] = mapped_column(Text)
    observacao:    Mapped[Optional[str]] = mapped_column(Text)
    num_documento: Mapped[Optional[str]] = mapped_column(String(100))
    identificacao: Mapped[Optional[str]] = mapped_column(String(200))

    # Datas (todas como string para flexibilidade de formato)
    dt_lancamento:  Mapped[Optional[str]] = mapped_column(String(30))
    dt_vencimento:  Mapped[Optional[str]] = mapped_column(String(30))
    dt_recebimento: Mapped[Optional[str]] = mapped_column(String(30))
    dt_pagamento:   Mapped[Optional[str]] = mapped_column(String(30))
    dt_competencia: Mapped[Optional[str]] = mapped_column(String(30))

    # Controle
    dados_hash:    Mapped[Optional[str]] = mapped_column(String(64))
    importado_em:  Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc)
    atualizado_em: Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    __table_args__ = (
        Index("ix_fin_lanc_loja_tipo_periodo", "loja_codigo", "tipo", "periodo"),
        Index("ix_fin_lanc_empresa",  "empresa_id"),
        Index("ix_fin_lanc_tipo",     "tipo"),
        Index("ix_fin_lanc_periodo",  "periodo"),
        Index("ix_fin_lanc_dt_venc",  "dt_vencimento"),
    )


class FinImportacao(Base):
    """Registro de cada importação CSV realizada."""
    __tablename__ = "fin_importacoes"

    id:           Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:   Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    loja_codigo:  Mapped[str]            = mapped_column(String(20), nullable=False)
    tipo:         Mapped[str]            = mapped_column(String(30), nullable=False)
    periodo:      Mapped[Optional[str]]  = mapped_column(String(20))
    nome_arquivo: Mapped[str]            = mapped_column(String(300), nullable=False)
    total_linhas: Mapped[int]            = mapped_column(BigInteger, default=0)
    inseridos:    Mapped[int]            = mapped_column(BigInteger, default=0)
    atualizados:  Mapped[int]            = mapped_column(BigInteger, default=0)
    ignorados:    Mapped[int]            = mapped_column(BigInteger, default=0)
    erros:        Mapped[int]            = mapped_column(BigInteger, default=0)
    importado_em: Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc)

    __table_args__ = (
        Index("ix_fin_imp_empresa",    "empresa_id"),
        Index("ix_fin_imp_loja_tipo",  "loja_codigo", "tipo"),
    )
