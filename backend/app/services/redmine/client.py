# ============================================================
# app/services/redmine/client.py
# Cliente HTTP para a API do Redmine com retry, rate limit e cache
# ============================================================
import asyncio
import time
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
import httpx
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

# ── Constantes ───────────────────────────────────────────────
REDMINE_PAGE_SIZE = 100
MAX_RETRIES       = 3
RETRY_DELAY_S     = 2.0
REQUEST_TIMEOUT_S = 30
RATE_LIMIT_DELAY  = 0.3  # 300ms entre requests (~3 req/s, bem abaixo do limite)


class RedmineAPIError(Exception):
    def __init__(self, message: str, status_code: int = 0):
        self.status_code = status_code
        super().__init__(message)


class RedmineClient:
    """
    Cliente assíncrono para a API REST do Redmine.
    Implementa: retry exponencial, rate limiting, paginação automática.
    Decisão: usar httpx async para consistência com o resto do stack FastAPI.
    """

    def __init__(self, url: str, api_key: str):
        self.base_url = url.rstrip("/")
        self._headers = {
            "X-Redmine-API-Key": api_key,
            "Content-Type": "application/json",
        }
        self._last_request = 0.0

    async def _throttle(self):
        """Rate limiting gentil — respeita 300ms entre requests."""
        elapsed = time.monotonic() - self._last_request
        if elapsed < RATE_LIMIT_DELAY:
            await asyncio.sleep(RATE_LIMIT_DELAY - elapsed)
        self._last_request = time.monotonic()

    async def _get(self, path: str, params: dict = None) -> dict:
        """GET com retry exponencial."""
        url = f"{self.base_url}{path}.json"
        last_error = None

        for attempt in range(MAX_RETRIES):
            try:
                await self._throttle()
                async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_S) as client:
                    resp = await client.get(url, headers=self._headers, params=params or {})

                if resp.status_code == 200:
                    return resp.json()
                elif resp.status_code == 401:
                    raise RedmineAPIError("API Key inválida ou sem permissão", 401)
                elif resp.status_code == 404:
                    raise RedmineAPIError(f"Recurso não encontrado: {path}", 404)
                elif resp.status_code == 429:
                    wait = RETRY_DELAY_S * (2 ** attempt)
                    logger.warning(f"Rate limit atingido. Aguardando {wait}s...")
                    await asyncio.sleep(wait)
                    continue
                else:
                    raise RedmineAPIError(f"Erro HTTP {resp.status_code}", resp.status_code)

            except (httpx.ConnectError, httpx.TimeoutException) as e:
                last_error = e
                if attempt < MAX_RETRIES - 1:
                    wait = RETRY_DELAY_S * (2 ** attempt)
                    logger.warning(f"Tentativa {attempt + 1} falhou: {e}. Retry em {wait}s...")
                    await asyncio.sleep(wait)

        raise RedmineAPIError(f"Falha após {MAX_RETRIES} tentativas: {last_error}")

    async def _get_paginated(self, path: str, key: str, params: dict = None) -> List[dict]:
        """Busca todos os registros com paginação automática."""
        all_items = []
        offset = 0
        base_params = {**(params or {}), "limit": REDMINE_PAGE_SIZE}

        while True:
            data = await self._get(path, {**base_params, "offset": offset})
            items = data.get(key, [])
            all_items.extend(items)

            total = data.get("total_count", 0)
            offset += len(items)

            if offset >= total or not items:
                break

        return all_items

    # ── Métodos públicos ──────────────────────────────────────

    async def test_connection(self) -> Dict[str, Any]:
        """Testa conexão e retorna info do usuário autenticado."""
        data = await self._get("/users/current")
        return data.get("user", {})

    async def get_projects(self) -> List[dict]:
        return await self._get_paginated("/projects", "projects")

    async def get_issues(
        self,
        project_id: Optional[str] = None,
        status_id: str = "*",
        updated_on: Optional[str] = None,
        limit: int = None,
    ) -> List[dict]:
        params: dict = {"status_id": status_id, "include": "journals,attachments"}
        if project_id:
            params["project_id"] = project_id
        if updated_on:
            params["updated_on"] = f">={updated_on}"

        if limit:
            params["limit"] = limit
            data = await self._get("/issues", params)
            return data.get("issues", [])

        return await self._get_paginated("/issues", "issues", params)

    async def get_issue(self, issue_id: int) -> dict:
        data = await self._get(f"/issues/{issue_id}", {"include": "journals,watchers,attachments,relations"})
        return data.get("issue", {})

    async def get_users(self) -> List[dict]:
        """Busca membros — requer permissão de admin no Redmine."""
        try:
            return await self._get_paginated("/users", "users", {"status": 1})
        except RedmineAPIError as e:
            if e.status_code in (401, 403):
                logger.warning("Sem permissão para listar usuários do Redmine. Usando dados das issues.")
                return []
            raise

    async def get_time_entries(
        self,
        project_id: Optional[str] = None,
        user_id: Optional[int] = None,
        from_date: Optional[str] = None,
    ) -> List[dict]:
        params = {}
        if project_id:
            params["project_id"] = project_id
        if user_id:
            params["user_id"] = user_id
        if from_date:
            params["from"] = from_date
        return await self._get_paginated("/time_entries", "time_entries", params)

    async def get_versions(self, project_id: str) -> List[dict]:
        """Versões = Sprints/Milestones no Redmine."""
        try:
            data = await self._get(f"/projects/{project_id}/versions")
            return data.get("versions", [])
        except RedmineAPIError:
            return []


# ── Criptografia da API Key ───────────────────────────────────
# Decisão: API Key armazenada criptografada com Fernet (AES-128-CBC)
# A SECRET_KEY do app é usada para derivar a chave Fernet.
# Nunca exposta ao frontend.

def _get_fernet(secret_key: str) -> Fernet:
    import base64, hashlib
    key = hashlib.sha256(secret_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))

def encrypt_api_key(api_key: str, secret_key: str) -> str:
    return _get_fernet(secret_key).encrypt(api_key.encode()).decode()

def decrypt_api_key(encrypted: str, secret_key: str) -> str:
    return _get_fernet(secret_key).decrypt(encrypted.encode()).decode()
