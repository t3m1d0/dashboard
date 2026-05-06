# ============================================================
# app/models/sustentacao.py — Modelo para chamados de sustentação
# Espelho direto do CSV exportado do sistema
# ============================================================
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, Integer, DateTime, BigInteger, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def now_utc():
    return datetime.now(timezone.utc)


class ChamadoSustentacao(Base):
    """
    Representa um chamado/tarefa importado do CSV.
    cod_tarefa é a chave de negócio única — usado para upsert.
    """
    __tablename__ = "chamados_sustentacao"

    id:                  Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id:          Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Chave de negócio — ID do sistema de origem
    cod_tarefa:          Mapped[int]             = mapped_column(BigInteger, nullable=False)
    cod_chamado:         Mapped[int]             = mapped_column(BigInteger, nullable=False)

    # Dados da tarefa
    descricao_tarefa:    Mapped[Optional[str]]   = mapped_column(Text)
    assunto:             Mapped[str]             = mapped_column(String(300), nullable=False)
    setor:               Mapped[Optional[str]]   = mapped_column(String(200))
    titulo_chamado:      Mapped[str]             = mapped_column(String(500), nullable=False)
    usuario_solicitante: Mapped[Optional[str]]   = mapped_column(String(300))
    origem:              Mapped[Optional[str]]   = mapped_column(String(300))  # franquia/unidade
    situacao:            Mapped[str]             = mapped_column(String(50), nullable=False)  # Concluído|Indeferido|Em andamento|Pendente
    usuario_responsavel: Mapped[Optional[str]]   = mapped_column(String(300))  # quem aceitou a tarefa

    # Datas
    data_disponibilidade: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))  # abertura
    data_aceitacao:       Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    data_conclusao:       Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    data_indeferimento:   Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Controle de sync
    importado_em:        Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=now_utc)
    atualizado_em:       Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Hash dos dados para detectar alterações sem comparar campo a campo
    dados_hash:          Mapped[Optional[str]]   = mapped_column(String(64))

    __table_args__ = (
        Index("ix_cs_empresa_cod_tarefa", "empresa_id", "cod_tarefa", unique=True),
        Index("ix_cs_data_disponibilidade", "data_disponibilidade"),
        Index("ix_cs_situacao", "situacao"),
        Index("ix_cs_assunto", "assunto"),
        Index("ix_cs_responsavel", "usuario_responsavel"),
    )
