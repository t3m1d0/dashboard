# ============================================================
# app/services/ — Camada de serviços (regras de negócio)
# ============================================================
from __future__ import annotations
import uuid
from typing import Optional, List, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload

from app.models import (
    Usuario, Chamado, Projeto, KPISnapshot, Upload, AuditLog, Empresa
)
from app.core.security import hash_password, verify_password


# ── Base Service ──────────────────────────────────────────────
class BaseService:
    def __init__(self, db: AsyncSession):
        self.db = db


# ── Usuario Service ───────────────────────────────────────────
class UsuarioService(BaseService):

    async def get_by_id(self, user_id: str) -> Optional[Usuario]:
        result = await self.db.execute(select(Usuario).where(Usuario.id == uuid.UUID(user_id)))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[Usuario]:
        result = await self.db.execute(select(Usuario).where(Usuario.email == email))
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> Usuario:
        password = data.pop("password")
        usuario = Usuario(**data, senha_hash=hash_password(password))
        self.db.add(usuario)
        await self.db.flush()
        return usuario

    async def authenticate(self, email: str, password: str) -> Optional[Usuario]:
        user = await self.get_by_email(email)
        if not user or not verify_password(password, user.senha_hash):
            return None
        return user

    async def list_all(self, empresa_id: Optional[uuid.UUID] = None) -> List[Usuario]:
        q = select(Usuario)
        if empresa_id:
            q = q.where(Usuario.empresa_id == empresa_id)
        result = await self.db.execute(q.order_by(Usuario.nome))
        return result.scalars().all()


# ── Chamado Service ───────────────────────────────────────────
class ChamadoService(BaseService):

    async def list(
        self,
        empresa_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        categoria: Optional[str] = None,
        prioridade: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ):
        filters = []
        if empresa_id:
            filters.append(Chamado.empresa_id == empresa_id)
        if status:
            filters.append(Chamado.status == status)
        if categoria:
            filters.append(Chamado.categoria == categoria)
        if prioridade:
            filters.append(Chamado.prioridade == prioridade)

        q = select(Chamado).where(and_(*filters)) if filters else select(Chamado)
        total_q = select(func.count()).select_from(q.subquery())
        total = (await self.db.execute(total_q)).scalar()

        q = q.order_by(desc(Chamado.criado_em)).offset((page - 1) * page_size).limit(page_size)
        items = (await self.db.execute(q)).scalars().all()
        return total, items

    async def create(self, data: dict, empresa_id: Optional[uuid.UUID] = None) -> Chamado:
        chamado = Chamado(**data, empresa_id=empresa_id)
        self.db.add(chamado)
        await self.db.flush()
        return chamado

    async def update(self, chamado_id: uuid.UUID, data: dict) -> Optional[Chamado]:
        result = await self.db.execute(select(Chamado).where(Chamado.id == chamado_id))
        chamado = result.scalar_one_or_none()
        if not chamado:
            return None
        for k, v in data.items():
            if v is not None:
                setattr(chamado, k, v)
        await self.db.flush()
        return chamado

    async def get_stats(self, empresa_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        """Estatísticas consolidadas para o dashboard."""
        filters = [Chamado.empresa_id == empresa_id] if empresa_id else []
        base = and_(*filters) if filters else True

        total = (await self.db.execute(
            select(func.count(Chamado.id)).where(base)
        )).scalar()

        resolvidos = (await self.db.execute(
            select(func.count(Chamado.id)).where(and_(base, Chamado.status == "resolvido"))
        )).scalar()

        criticos = (await self.db.execute(
            select(func.count(Chamado.id)).where(and_(base, Chamado.prioridade == "critica", Chamado.status != "fechado"))
        )).scalar()

        dentro_sla = (await self.db.execute(
            select(func.count(Chamado.id)).where(and_(base, Chamado.dentro_sla == True))
        )).scalar()

        sla_pct = round((dentro_sla / total * 100), 1) if total > 0 else 0

        # Contagem por categoria
        cat_result = await self.db.execute(
            select(Chamado.categoria, func.count(Chamado.id))
            .where(base)
            .group_by(Chamado.categoria)
            .order_by(desc(func.count(Chamado.id)))
        )
        por_categoria = [{"categoria": r[0] or "Outros", "total": r[1]} for r in cat_result]

        # Top assuntos
        assunto_result = await self.db.execute(
            select(Chamado.assunto, func.count(Chamado.id))
            .where(and_(base, Chamado.assunto.isnot(None)))
            .group_by(Chamado.assunto)
            .order_by(desc(func.count(Chamado.id)))
            .limit(15)
        )
        top_assuntos = [
            {"rank": i+1, "assunto": r[0], "total": r[1], "tendencia": "stable"}
            for i, r in enumerate(assunto_result)
        ]

        return {
            "total": total,
            "resolvidos": resolvidos,
            "criticos": criticos,
            "sla_pct": sla_pct,
            "por_categoria": por_categoria,
            "top_assuntos": top_assuntos,
        }


# ── Projeto Service ───────────────────────────────────────────
class ProjetoService(BaseService):

    async def list(
        self,
        empresa_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        prioridade: Optional[str] = None,
    ) -> List[Projeto]:
        filters = []
        if empresa_id:
            filters.append(Projeto.empresa_id == empresa_id)
        if status:
            filters.append(Projeto.status == status)
        if prioridade:
            filters.append(Projeto.prioridade == prioridade)

        q = select(Projeto).where(and_(*filters)) if filters else select(Projeto)
        q = q.order_by(Projeto.criado_em)
        return (await self.db.execute(q)).scalars().all()

    async def create(self, data: dict, empresa_id: Optional[uuid.UUID] = None) -> Projeto:
        projeto = Projeto(**data, empresa_id=empresa_id)
        self.db.add(projeto)
        await self.db.flush()
        return projeto

    async def update(self, projeto_id: uuid.UUID, data: dict) -> Optional[Projeto]:
        result = await self.db.execute(select(Projeto).where(Projeto.id == projeto_id))
        projeto = result.scalar_one_or_none()
        if not projeto:
            return None
        for k, v in data.items():
            if v is not None:
                setattr(projeto, k, v)
        await self.db.flush()
        return projeto

    async def delete(self, projeto_id: uuid.UUID) -> bool:
        result = await self.db.execute(select(Projeto).where(Projeto.id == projeto_id))
        projeto = result.scalar_one_or_none()
        if not projeto:
            return False
        await self.db.delete(projeto)
        return True

    async def get_kanban(self, empresa_id: Optional[uuid.UUID] = None) -> Dict[str, List]:
        """Projetos agrupados por status para o Kanban."""
        projetos = await self.list(empresa_id=empresa_id)
        board: Dict[str, List] = {
            "backlog": [], "desenvolvimento": [],
            "homologacao": [], "validacao": [], "producao": []
        }
        for p in projetos:
            if p.status in board:
                board[p.status].append(p)
        return board


# ── KPI Service ───────────────────────────────────────────────
class KPIService(BaseService):

    async def get_latest(self, empresa_id: Optional[uuid.UUID] = None) -> Optional[KPISnapshot]:
        q = select(KPISnapshot).order_by(desc(KPISnapshot.criado_em))
        if empresa_id:
            q = q.where(KPISnapshot.empresa_id == empresa_id)
        return (await self.db.execute(q.limit(1))).scalar_one_or_none()

    async def get_by_periodo(self, periodo: str, empresa_id: Optional[uuid.UUID] = None) -> Optional[KPISnapshot]:
        q = select(KPISnapshot).where(KPISnapshot.periodo == periodo)
        if empresa_id:
            q = q.where(KPISnapshot.empresa_id == empresa_id)
        return (await self.db.execute(q)).scalar_one_or_none()

    async def upsert(self, periodo: str, mes: str, ano: int, dados: dict, empresa_id: Optional[uuid.UUID] = None) -> KPISnapshot:
        existing = await self.get_by_periodo(periodo, empresa_id)
        if existing:
            existing.dados = dados
            existing.mes = mes
            existing.ano = ano
            await self.db.flush()
            return existing
        snapshot = KPISnapshot(periodo=periodo, mes=mes, ano=ano, dados=dados, empresa_id=empresa_id)
        self.db.add(snapshot)
        await self.db.flush()
        return snapshot

    async def historico(self, empresa_id: Optional[uuid.UUID] = None, limit: int = 12) -> List[KPISnapshot]:
        q = select(KPISnapshot).order_by(desc(KPISnapshot.criado_em)).limit(limit)
        if empresa_id:
            q = q.where(KPISnapshot.empresa_id == empresa_id)
        return (await self.db.execute(q)).scalars().all()


# ── Upload Service ────────────────────────────────────────────
class UploadService(BaseService):

    async def create(self, data: dict) -> Upload:
        upload = Upload(**data)
        self.db.add(upload)
        await self.db.flush()
        return upload

    async def list(self, empresa_id: Optional[uuid.UUID] = None) -> List[Upload]:
        q = select(Upload).order_by(desc(Upload.criado_em))
        if empresa_id:
            q = q.where(Upload.empresa_id == empresa_id)
        return (await self.db.execute(q)).scalars().all()


# ── Audit Service ─────────────────────────────────────────────
class AuditService(BaseService):

    async def log(
        self,
        acao: str,
        usuario_id: Optional[uuid.UUID] = None,
        entidade: Optional[str] = None,
        entidade_id: Optional[str] = None,
        dados: Optional[dict] = None,
        ip: Optional[str] = None,
    ) -> AuditLog:
        entry = AuditLog(
            acao=acao,
            usuario_id=usuario_id,
            entidade=entidade,
            entidade_id=entidade_id,
            dados=dados,
            ip=ip,
        )
        self.db.add(entry)
        await self.db.flush()
        return entry
