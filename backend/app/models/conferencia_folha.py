# ============================================================
# app/models/conferencia_folha.py
# Conferência de Folha — por filial, por mês
# ============================================================
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, DateTime, BigInteger, Index, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def now_utc():
    return datetime.now(timezone.utc)


class ConferenciaFolhaLinha(Base):
    """
    Uma linha do relatório de Conferência de Folha.
    Chave: (empresa_id, filial_nome, competencia, nome_colaborador)
    """
    __tablename__ = "conf_folha_linhas"

    id:           Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:   Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Identificação da loja / período
    filial_nome:  Mapped[str]            = mapped_column(String(300), nullable=False)
    filial_cnpj:  Mapped[Optional[str]]  = mapped_column(String(30))
    competencia:  Mapped[str]            = mapped_column(String(20), nullable=False)  # YYYY-MM
    mes_nome:     Mapped[Optional[str]]  = mapped_column(String(20))
    ano:          Mapped[Optional[int]]  = mapped_column(BigInteger)

    # Colaborador
    nome:         Mapped[str]            = mapped_column(String(300), nullable=False)
    dt_admissao:  Mapped[Optional[str]]  = mapped_column(String(20))
    cargo:        Mapped[Optional[str]]  = mapped_column(String(200))
    pix_cpf:      Mapped[Optional[str]]  = mapped_column(String(100))

    # Remuneração base
    salario:      Mapped[float]          = mapped_column(Float, default=0)
    somar_sal:    Mapped[Optional[str]]  = mapped_column(String(10))   # Sim / Não
    liquidez_pct: Mapped[Optional[float]] = mapped_column(Float)
    liquidez_val: Mapped[Optional[float]] = mapped_column(Float)

    # Proventos
    premiacao:        Mapped[float]      = mapped_column(Float, default=0)
    bonus:            Mapped[float]      = mapped_column(Float, default=0)
    vlr_ser_pago:     Mapped[float]      = mapped_column(Float, default=0)
    sal_familia:      Mapped[float]      = mapped_column(Float, default=0)
    ajuda_custo:      Mapped[float]      = mapped_column(Float, default=0)
    horas_extra:      Mapped[float]      = mapped_column(Float, default=0)
    quebra_caixa:     Mapped[float]      = mapped_column(Float, default=0)
    periculosidade:   Mapped[float]      = mapped_column(Float, default=0)
    outros_creditos:  Mapped[float]      = mapped_column(Float, default=0)
    total_proventos:  Mapped[float]      = mapped_column(Float, default=0)

    # Descontos
    inss:             Mapped[float]      = mapped_column(Float, default=0)
    irrf:             Mapped[float]      = mapped_column(Float, default=0)
    vt:               Mapped[float]      = mapped_column(Float, default=0)
    faltas:           Mapped[float]      = mapped_column(Float, default=0)
    desc_diversos:    Mapped[float]      = mapped_column(Float, default=0)
    horas_falta:      Mapped[float]      = mapped_column(Float, default=0)
    vale_func:        Mapped[float]      = mapped_column(Float, default=0)
    vale_func_os:     Mapped[float]      = mapped_column(Float, default=0)
    outros_debitos:   Mapped[float]      = mapped_column(Float, default=0)
    total_descontos:  Mapped[float]      = mapped_column(Float, default=0)

    # Resultado
    liquido:          Mapped[float]      = mapped_column(Float, default=0)

    # Controle
    dados_hash:   Mapped[Optional[str]]  = mapped_column(String(64))
    importado_em: Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc)
    atualizado_em: Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    __table_args__ = (
        Index("ix_cfl_empresa_filial_comp", "empresa_id", "filial_nome", "competencia"),
        Index("ix_cfl_empresa_comp",        "empresa_id", "competencia"),
        Index("ix_cfl_filial",              "filial_nome"),
        Index("ix_cfl_competencia",         "competencia"),
    )


class ConferenciaFolhaResumo(Base):
    """
    Totalizadores por filial/mês — linha de rodapé do relatório.
    """
    __tablename__ = "conf_folha_resumos"

    id:              Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:      Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    filial_nome:     Mapped[str]            = mapped_column(String(300), nullable=False)
    filial_cnpj:     Mapped[Optional[str]]  = mapped_column(String(30))
    competencia:     Mapped[str]            = mapped_column(String(20), nullable=False)
    mes_nome:        Mapped[Optional[str]]  = mapped_column(String(20))
    ano:             Mapped[Optional[int]]  = mapped_column(BigInteger)
    total_funcionarios: Mapped[int]         = mapped_column(BigInteger, default=0)

    # Totais
    total_salarios:     Mapped[float]       = mapped_column(Float, default=0)
    total_liquidez:     Mapped[float]       = mapped_column(Float, default=0)
    total_proventos:    Mapped[float]       = mapped_column(Float, default=0)
    total_inss:         Mapped[float]       = mapped_column(Float, default=0)
    total_irrf:         Mapped[float]       = mapped_column(Float, default=0)
    total_vt:           Mapped[float]       = mapped_column(Float, default=0)
    total_descontos:    Mapped[float]       = mapped_column(Float, default=0)
    total_liquido:      Mapped[float]       = mapped_column(Float, default=0)
    total_vale_func:    Mapped[float]       = mapped_column(Float, default=0)

    # Indicadores da loja
    liquidez_loja:      Mapped[Optional[float]] = mapped_column(Float)
    liquidez_pct:       Mapped[Optional[float]] = mapped_column(Float)

    importado_em:    Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc)

    __table_args__ = (
        Index("ix_cfr_empresa_filial_comp", "empresa_id", "filial_nome", "competencia", unique=True),
        Index("ix_cfr_empresa_comp",        "empresa_id", "competencia"),
    )


class ConferenciaFolhaImportacao(Base):
    """Histórico de importações de PDFs de Conferência de Folha."""
    __tablename__ = "conf_folha_importacoes"

    id:           Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:   Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    filial_nome:  Mapped[str]            = mapped_column(String(300), nullable=False)
    competencia:  Mapped[str]            = mapped_column(String(20), nullable=False)
    mes_nome:     Mapped[Optional[str]]  = mapped_column(String(20))
    nome_arquivo: Mapped[str]            = mapped_column(String(300), nullable=False)
    total_linhas: Mapped[int]            = mapped_column(BigInteger, default=0)
    inseridos:    Mapped[int]            = mapped_column(BigInteger, default=0)
    atualizados:  Mapped[int]            = mapped_column(BigInteger, default=0)
    ignorados:    Mapped[int]            = mapped_column(BigInteger, default=0)
    erros:        Mapped[int]            = mapped_column(BigInteger, default=0)
    importado_em: Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc)

    __table_args__ = (
        Index("ix_cfi_empresa", "empresa_id"),
        Index("ix_cfi_comp",    "competencia"),
    )
