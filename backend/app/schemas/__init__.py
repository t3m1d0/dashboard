# ============================================================
# app/schemas/__init__.py — Pydantic v2 schemas (request/response)
# ============================================================
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any, Dict
from datetime import datetime
import uuid


# ── Base helpers ─────────────────────────────────────────────
class UUIDModel(BaseModel):
    id: uuid.UUID

class TimestampModel(BaseModel):
    criado_em: datetime
    atualizado_em: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Auth ─────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: "UsuarioPublico"

class UsuarioPublico(BaseModel):
    id: uuid.UUID
    nome: str
    email: str
    cargo: Optional[str] = None
    role: str
    empresa_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True


# ── Usuario ───────────────────────────────────────────────────
class UsuarioCreate(BaseModel):
    nome: str
    email: EmailStr
    password: str
    cargo: Optional[str] = None
    role: str = "viewer"
    empresa_id: Optional[uuid.UUID] = None

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    cargo: Optional[str] = None
    role: Optional[str] = None
    ativo: Optional[bool] = None

class UsuarioResponse(UUIDModel, TimestampModel):
    nome: str
    email: str
    cargo: Optional[str] = None
    role: str
    ativo: bool
    empresa_id: Optional[uuid.UUID] = None
    ultimo_login: Optional[datetime] = None


# ── Chamado ───────────────────────────────────────────────────
class ChamadoCreate(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    assunto: Optional[str] = None
    prioridade: str = "media"
    franquia_id: Optional[uuid.UUID] = None
    sla_prazo: Optional[datetime] = None

class ChamadoUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    assunto: Optional[str] = None
    prioridade: Optional[str] = None
    status: Optional[str] = None
    dentro_sla: Optional[bool] = None
    responsavel_id: Optional[uuid.UUID] = None
    resolvido_em: Optional[datetime] = None

class ChamadoResponse(UUIDModel, TimestampModel):
    titulo: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    assunto: Optional[str] = None
    prioridade: str
    status: str
    dentro_sla: Optional[bool] = None
    resolvido_em: Optional[datetime] = None
    responsavel_id: Optional[uuid.UUID] = None
    franquia_id: Optional[uuid.UUID] = None

class ChamadoListResponse(BaseModel):
    total: int
    items: List[ChamadoResponse]


# ── Projeto ───────────────────────────────────────────────────
class ProjetoCreate(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    prioridade: str = "media"
    status: str = "backlog"
    progresso: int = 0
    prazo: Optional[str] = None
    tags: List[str] = []
    responsavel_id: Optional[uuid.UUID] = None

    @field_validator("progresso")
    @classmethod
    def progresso_range(cls, v: int) -> int:
        if not 0 <= v <= 100:
            raise ValueError("Progresso deve ser entre 0 e 100")
        return v

class ProjetoUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    prioridade: Optional[str] = None
    status: Optional[str] = None
    progresso: Optional[int] = None
    prazo: Optional[str] = None
    tags: Optional[List[str]] = None
    responsavel_id: Optional[uuid.UUID] = None

class ProjetoResponse(UUIDModel, TimestampModel):
    titulo: str
    descricao: Optional[str] = None
    prioridade: str
    status: str
    progresso: int
    prazo: Optional[str] = None
    tags: List[str] = []
    responsavel_id: Optional[uuid.UUID] = None
    empresa_id: Optional[uuid.UUID] = None

class ProjetoListResponse(BaseModel):
    total: int
    items: List[ProjetoResponse]


# ── KPI Snapshot ──────────────────────────────────────────────
class KPISnapshotCreate(BaseModel):
    periodo: str           # '2025-04'
    mes: str
    ano: int
    dados: Dict[str, Any]

class KPISnapshotResponse(UUIDModel):
    periodo: str
    mes: str
    ano: int
    dados: Dict[str, Any]
    criado_em: datetime
    empresa_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True


# ── Upload ────────────────────────────────────────────────────
class UploadResponse(UUIDModel):
    tipo: str
    nome_arquivo: str
    tamanho_bytes: Optional[int] = None
    total_registros: Optional[int] = None
    status: str
    criado_em: datetime

    class Config:
        from_attributes = True


# ── Dashboard Overview ────────────────────────────────────────
class DashboardOverviewResponse(BaseModel):
    """Resposta consolidada para o frontend."""
    meta: Dict[str, Any]
    visaoGeral: Dict[str, Any]
    sustentacao: Dict[str, Any]
    desenvolvimento: Dict[str, Any]
    entregasEstrategicas: List[Dict[str, Any]]
    visaoEstrategica: Dict[str, Any]
    roadmap: List[Dict[str, Any]]


# ── Pagination ────────────────────────────────────────────────
class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 20
    search: Optional[str] = None


# Update forward ref
TokenResponse.model_rebuild()
