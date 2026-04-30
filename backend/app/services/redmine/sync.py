# ============================================================
# app/services/redmine/sync.py
# Serviço de sincronização — orquestra o processo completo
# ============================================================
import uuid
import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete

from app.models.redmine import (
    RedmineConfig, RedmineProjeto, RedmineTarefa,
    RedmineComentario, RedmineMembro, RedmineSyncLog, RedmineMetricaSnapshot
)
from app.services.redmine.client import RedmineClient, RedmineAPIError, decrypt_api_key
from app.services.redmine.metrics import calcular_metricas
from app.core.config import settings

logger = logging.getLogger(__name__)


class RedmineSyncService:
    """
    Orquestra a sincronização entre Redmine e banco local.
    Suporta sync completo (full) e incremental (apenas alterados desde último sync).
    Decisão: sync incremental usa o campo updated_on do Redmine para reduzir carga.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_client(self, config: RedmineConfig) -> RedmineClient:
        api_key = decrypt_api_key(config.api_key_enc, settings.SECRET_KEY)
        return RedmineClient(config.url, api_key)

    async def get_config(self, empresa_id: uuid.UUID) -> Optional[RedmineConfig]:
        result = await self.db.execute(
            select(RedmineConfig).where(
                and_(RedmineConfig.empresa_id == empresa_id, RedmineConfig.ativo == True)
            )
        )
        return result.scalar_one_or_none()

    async def sync(
        self,
        empresa_id: uuid.UUID,
        tipo: str = "incremental",
        force_full: bool = False,
    ) -> RedmineSyncLog:
        """
        Executa sincronização. Retorna o log com resultado.
        tipo: 'full' | 'incremental' | 'manual'
        """
        start_ms = time.monotonic() * 1000
        config = await self.get_config(empresa_id)
        if not config:
            raise ValueError("Configuração Redmine não encontrada para esta empresa")

        log = RedmineSyncLog(
            config_id=config.id,
            empresa_id=empresa_id,
            tipo=tipo,
            status="em_progresso",
        )
        self.db.add(log)
        await self.db.flush()

        erros = []
        projetos_sync = tarefas_sync = membros_sync = 0

        try:
            client = await self._get_client(config)

            # Determina data de corte para sync incremental
            updated_since = None
            if not force_full and tipo == "incremental" and config.ultimo_sync:
                delta = timedelta(minutes=5)  # margem de segurança
                updated_since = (config.ultimo_sync - delta).strftime("%Y-%m-%d")

            # 1. Sincronizar projetos
            projetos_sync = await self._sync_projetos(client, config, empresa_id)

            # 2. Sincronizar tarefas (por projeto ativo)
            projetos_ativos = await self._get_projetos_ativos(empresa_id)
            for proj in projetos_ativos:
                try:
                    count = await self._sync_tarefas(client, proj, empresa_id, updated_since)
                    tarefas_sync += count
                except RedmineAPIError as e:
                    erros.append(f"Projeto {proj.nome}: {str(e)}")
                    logger.error(f"Erro sync projeto {proj.nome}: {e}")

            # 3. Sincronizar membros
            try:
                membros_sync = await self._sync_membros(client, empresa_id)
            except Exception as e:
                erros.append(f"Membros: {str(e)}")

            # 4. Calcular métricas do dia
            await calcular_metricas(self.db, empresa_id)

            # Atualizar config
            config.ultimo_sync = datetime.now(timezone.utc)

            log.status = "parcial" if erros else "ok"
            log.projetos_sync = projetos_sync
            log.tarefas_sync = tarefas_sync
            log.membros_sync = membros_sync
            log.erros = erros if erros else None
            log.duracao_ms = int(time.monotonic() * 1000 - start_ms)

            logger.info(
                f"Sync concluído: {projetos_sync} projetos, "
                f"{tarefas_sync} tarefas, {membros_sync} membros. "
                f"Duração: {log.duracao_ms}ms"
            )

        except Exception as e:
            log.status = "erro"
            log.erros = [str(e)]
            log.duracao_ms = int(time.monotonic() * 1000 - start_ms)
            logger.error(f"Sync falhou: {e}", exc_info=True)

        return log

    async def _sync_projetos(
        self, client: RedmineClient, config: RedmineConfig, empresa_id: uuid.UUID
    ) -> int:
        projetos_api = await client.get_projects()
        count = 0

        for p in projetos_api:
            result = await self.db.execute(
                select(RedmineProjeto).where(
                    and_(
                        RedmineProjeto.redmine_id == p["id"],
                        RedmineProjeto.empresa_id == empresa_id,
                    )
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.nome = p.get("name", existing.nome)
                existing.descricao = p.get("description")
                existing.ativo = not p.get("status") == "closed"
            else:
                novo = RedmineProjeto(
                    config_id=config.id,
                    empresa_id=empresa_id,
                    redmine_id=p["id"],
                    identificador=p.get("identifier", str(p["id"])),
                    nome=p.get("name", ""),
                    descricao=p.get("description"),
                )
                self.db.add(novo)
                count += 1

        await self.db.flush()
        return count

    async def _get_projetos_ativos(self, empresa_id: uuid.UUID) -> List[RedmineProjeto]:
        result = await self.db.execute(
            select(RedmineProjeto).where(
                and_(
                    RedmineProjeto.empresa_id == empresa_id,
                    RedmineProjeto.ativo == True,
                    RedmineProjeto.sincronizar == True,
                )
            )
        )
        return result.scalars().all()

    async def _sync_tarefas(
        self,
        client: RedmineClient,
        projeto: RedmineProjeto,
        empresa_id: uuid.UUID,
        updated_since: Optional[str],
    ) -> int:
        issues = await client.get_issues(
            project_id=projeto.identificador,
            updated_on=updated_since,
        )
        count = 0
        hoje = datetime.now(timezone.utc).date()

        for issue in issues:
            # Verifica se está atrasada
            prazo = issue.get("due_date")
            atrasada = False
            if prazo and issue.get("status", {}).get("name") not in ("Fechado", "Resolvido", "Rejeitado"):
                atrasada = prazo < str(hoje)

            result = await self.db.execute(
                select(RedmineTarefa).where(
                    and_(
                        RedmineTarefa.redmine_id == issue["id"],
                        RedmineTarefa.empresa_id == empresa_id,
                    )
                )
            )
            existing = result.scalar_one_or_none()

            fields = {
                "assunto":          issue.get("subject", ""),
                "descricao":        issue.get("description"),
                "status":           issue.get("status", {}).get("name", ""),
                "status_id":        issue.get("status", {}).get("id", 0),
                "prioridade":       issue.get("priority", {}).get("name", ""),
                "prioridade_id":    issue.get("priority", {}).get("id", 0),
                "tracker":          issue.get("tracker", {}).get("name", ""),
                "responsavel_nome": issue.get("assigned_to", {}).get("name") if issue.get("assigned_to") else None,
                "responsavel_id":   issue.get("assigned_to", {}).get("id") if issue.get("assigned_to") else None,
                "autor_nome":       issue.get("author", {}).get("name"),
                "categoria":        issue.get("category", {}).get("name") if issue.get("category") else None,
                "versao":           issue.get("fixed_version", {}).get("name") if issue.get("fixed_version") else None,
                "estimativa_horas": issue.get("estimated_hours"),
                "horas_gastas":     issue.get("spent_hours"),
                "progresso":        issue.get("done_ratio", 0),
                "data_inicio":      issue.get("start_date"),
                "data_prazo":       prazo,
                "data_criacao":     _parse_dt(issue.get("created_on")),
                "data_atualizacao": _parse_dt(issue.get("updated_on")),
                "data_fechamento":  _parse_dt(issue.get("closed_on")),
                "atrasada":         atrasada,
                "sincronizado_em":  datetime.now(timezone.utc),
            }

            if existing:
                for k, v in fields.items():
                    setattr(existing, k, v)
            else:
                novo = RedmineTarefa(
                    projeto_id=projeto.id,
                    empresa_id=empresa_id,
                    redmine_id=issue["id"],
                    **fields,
                )
                self.db.add(novo)
                count += 1

            # Sincronizar comentários (journals)
            await self._sync_comentarios(issue, existing or novo, empresa_id)

        await self.db.flush()
        return count

    async def _sync_comentarios(self, issue: dict, tarefa: RedmineTarefa, empresa_id: uuid.UUID):
        for journal in issue.get("journals", []):
            if not journal.get("notes"):
                continue
            result = await self.db.execute(
                select(RedmineComentario).where(RedmineComentario.redmine_id == journal["id"])
            )
            if result.scalar_one_or_none():
                continue
            comentario = RedmineComentario(
                tarefa_id=tarefa.id,
                redmine_id=journal["id"],
                autor_nome=journal.get("user", {}).get("name", ""),
                autor_id=journal.get("user", {}).get("id", 0),
                texto=journal["notes"],
                criado_em=_parse_dt(journal.get("created_on")) or datetime.now(timezone.utc),
            )
            self.db.add(comentario)

    async def _sync_membros(self, client: RedmineClient, empresa_id: uuid.UUID) -> int:
        from app.models.redmine import RedmineMembro
        users = await client.get_users()
        count = 0
        for u in users:
            result = await self.db.execute(
                select(RedmineMembro).where(
                    and_(RedmineMembro.redmine_id == u["id"], RedmineMembro.empresa_id == empresa_id)
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                existing.nome = u.get("firstname", "") + " " + u.get("lastname", "")
                existing.login = u.get("login")
                existing.email = u.get("mail")
            else:
                membro = RedmineMembro(
                    empresa_id=empresa_id,
                    redmine_id=u["id"],
                    nome=f"{u.get('firstname', '')} {u.get('lastname', '')}".strip(),
                    login=u.get("login"),
                    email=u.get("mail"),
                )
                self.db.add(membro)
                count += 1
        await self.db.flush()
        return count


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None
