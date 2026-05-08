# ============================================================
# app/models/gente.py — Módulo Gente e Gestão
# Estrutura preparada para receber relatório de folha de pagamento
# ============================================================
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, Float, DateTime, BigInteger, Index, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def now_utc():
    return datetime.now(timezone.utc)


class GenteColaborador(Base):
    """
    Colaborador — chave de negócio: (empresa_id, matricula) ou (empresa_id, cpf).
    Upsert ao importar planilha.
    """
    __tablename__ = "gente_colaboradores"

    id:          Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:  Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Identificação
    matricula:   Mapped[Optional[str]]  = mapped_column(String(50))
    cpf:         Mapped[Optional[str]]  = mapped_column(String(14))
    nome:        Mapped[str]            = mapped_column(String(300), nullable=False)
    pis:         Mapped[Optional[str]]  = mapped_column(String(20))

    # Lotação
    empresa:     Mapped[Optional[str]]  = mapped_column(String(200))  # nome da empresa/filial
    departamento: Mapped[Optional[str]] = mapped_column(String(200))
    cargo:       Mapped[Optional[str]]  = mapped_column(String(200))
    funcao:      Mapped[Optional[str]]  = mapped_column(String(200))
    centro_custo: Mapped[Optional[str]] = mapped_column(String(200))
    filial:      Mapped[Optional[str]]  = mapped_column(String(200))

    # Vínculo
    tipo_contrato: Mapped[Optional[str]] = mapped_column(String(100))  # CLT, PJ, etc
    situacao:    Mapped[Optional[str]]  = mapped_column(String(50))    # Ativo, Férias, etc
    data_admissao: Mapped[Optional[str]] = mapped_column(String(20))
    data_demissao: Mapped[Optional[str]] = mapped_column(String(20))

    # Remuneração base
    salario_base: Mapped[float]         = mapped_column(Float, default=0)

    # Controle
    importado_em:  Mapped[datetime]     = mapped_column(DateTime(timezone=True), default=now_utc)
    atualizado_em: Mapped[datetime]     = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    __table_args__ = (
        Index("ix_gc_empresa_matricula", "empresa_id", "matricula"),
        Index("ix_gc_empresa_cpf",       "empresa_id", "cpf"),
        Index("ix_gc_empresa",           "empresa_id"),
        Index("ix_gc_situacao",          "situacao"),
    )


class GenteFolha(Base):
    """
    Linha de folha de pagamento.
    Chave de upsert: (empresa_id, matricula_ou_cpf, competencia, verba_codigo).
    Flexível para qualquer formato de relatório.
    """
    __tablename__ = "gente_folha"

    id:          Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:  Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Período
    competencia: Mapped[str]            = mapped_column(String(20), nullable=False)  # YYYY-MM
    mes_nome:    Mapped[Optional[str]]  = mapped_column(String(20))  # Janeiro, etc

    # Colaborador
    matricula:   Mapped[Optional[str]]  = mapped_column(String(50))
    cpf:         Mapped[Optional[str]]  = mapped_column(String(14))
    nome:        Mapped[str]            = mapped_column(String(300), nullable=False)

    # Lotação
    empresa:       Mapped[Optional[str]]  = mapped_column(String(200))
    departamento:  Mapped[Optional[str]] = mapped_column(String(200))
    cargo:         Mapped[Optional[str]] = mapped_column(String(200))
    centro_custo:  Mapped[Optional[str]] = mapped_column(String(200))
    filial:        Mapped[Optional[str]] = mapped_column(String(200))

    # Colaborador (campos do relatório MBG)
    data_admissao: Mapped[Optional[str]] = mapped_column(String(20))
    situacao:      Mapped[Optional[str]] = mapped_column(String(50))
    tipo_contrato: Mapped[Optional[str]] = mapped_column(String(100))

    # Verba / Rubrica (estrutura aberta para qualquer ERP)
    verba_codigo: Mapped[Optional[str]] = mapped_column(String(50))
    verba_nome:  Mapped[Optional[str]]  = mapped_column(String(200))
    verba_tipo:  Mapped[Optional[str]]  = mapped_column(String(20))  # P=Provento D=Desconto

    # Valores
    referencia:  Mapped[Optional[float]] = mapped_column(Float)   # horas, dias, etc
    valor:       Mapped[float]           = mapped_column(Float, default=0)

    # Totalizadores por colaborador (quando linha é resumo)
    salario_base:  Mapped[Optional[float]] = mapped_column(Float)
    total_proventos: Mapped[Optional[float]] = mapped_column(Float)
    total_descontos: Mapped[Optional[float]] = mapped_column(Float)
    liquido:       Mapped[Optional[float]] = mapped_column(Float)
    fgts:          Mapped[Optional[float]] = mapped_column(Float)
    inss:          Mapped[Optional[float]] = mapped_column(Float)
    irrf:          Mapped[Optional[float]] = mapped_column(Float)

    # Controle
    dados_hash:    Mapped[Optional[str]] = mapped_column(String(64))
    importado_em:  Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc)
    atualizado_em: Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    __table_args__ = (
        Index("ix_gf_empresa_competencia",   "empresa_id", "competencia"),
        Index("ix_gf_empresa_matricula",     "empresa_id", "matricula", "competencia"),
        Index("ix_gf_empresa",               "empresa_id"),
        Index("ix_gf_competencia",           "competencia"),
        Index("ix_gf_cargo",                 "cargo"),
        Index("ix_gf_departamento",          "departamento"),
    )


class GenteImportacao(Base):
    """Histórico de importações do módulo Gente e Gestão."""
    __tablename__ = "gente_importacoes"

    id:           Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:   Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    tipo:         Mapped[str]            = mapped_column(String(30), nullable=False)  # folha
    competencia:  Mapped[Optional[str]]  = mapped_column(String(20))
    mes_nome:     Mapped[Optional[str]]  = mapped_column(String(20))
    nome_arquivo: Mapped[str]            = mapped_column(String(300), nullable=False)
    total_linhas: Mapped[int]            = mapped_column(BigInteger, default=0)
    inseridos:    Mapped[int]            = mapped_column(BigInteger, default=0)
    atualizados:  Mapped[int]            = mapped_column(BigInteger, default=0)
    ignorados:    Mapped[int]            = mapped_column(BigInteger, default=0)
    erros:        Mapped[int]            = mapped_column(BigInteger, default=0)
    colunas_detectadas: Mapped[Optional[str]] = mapped_column(Text)  # JSON string
    importado_em: Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc)

    __table_args__ = (
        Index("ix_gi_empresa",            "empresa_id"),
        Index("ix_gi_competencia",        "competencia"),
    )
