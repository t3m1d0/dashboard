# ============================================================
# app/routers/uploads.py — Upload e parsing de arquivos
# ============================================================
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os, uuid, shutil
import pandas as pd

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.schemas import UploadResponse
from app.services import UploadService, ChamadoService, ProjetoService, KPIService, AuditService

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_TYPES = {"text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                 "application/vnd.ms-excel", "application/json"}
MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def _ensure_upload_dir():
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def _read_file(path: str, filename: str) -> pd.DataFrame:
    if filename.endswith(".csv"):
        return pd.read_csv(path, encoding="utf-8-sig")
    elif filename.endswith((".xlsx", ".xls")):
        return pd.read_excel(path)
    raise ValueError("Formato não suportado")


async def _import_chamados(df: pd.DataFrame, empresa_id, db: AsyncSession):
    svc = ChamadoService(db)
    col_map = {
        "TITULO": "titulo", "TÍTULO": "titulo",
        "DESCRICAO": "descricao", "DESCRIÇÃO": "descricao",
        "CATEGORIA": "categoria",
        "ASSUNTO": "assunto",
        "PRIORIDADE": "prioridade",
        "STATUS": "status",
    }
    df.rename(columns={k: v for k, v in col_map.items() if k in df.columns}, inplace=True)

    count = 0
    for _, row in df.iterrows():
        data = {k: str(v) for k, v in row.items() if pd.notna(v) and k in col_map.values()}
        if "titulo" in data:
            await svc.create(data, empresa_id=empresa_id)
            count += 1
    return count


async def _import_projetos(df: pd.DataFrame, empresa_id, db: AsyncSession):
    svc = ProjetoService(db)
    count = 0
    for _, row in df.iterrows():
        titulo = str(row.get("TITULO") or row.get("TÍTULO") or "")
        if not titulo:
            continue
        data = {
            "titulo": titulo[:200],
            "descricao": str(row.get("DESCRICAO") or row.get("DESCRIÇÃO") or ""),
            "prioridade": str(row.get("PRIORIDADE") or "media").lower(),
            "status": str(row.get("STATUS") or "backlog").lower().replace(" ", ""),
            "progresso": int(row.get("PROGRESSO") or 0),
            "prazo": str(row.get("PRAZO") or ""),
            "tags": [t.strip() for t in str(row.get("TAGS") or "").split(",") if t.strip()],
        }
        await svc.create(data, empresa_id=empresa_id)
        count += 1
    return count


@router.post("", response_model=UploadResponse, status_code=201)
async def upload_file(
    tipo: str = Form(...),          # sustentacao | projetos | kpis | roadmap
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_upload_dir()

    # Validações
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(413, f"Arquivo muito grande. Máximo: {settings.MAX_UPLOAD_SIZE_MB}MB")

    if tipo not in ("sustentacao", "projetos", "kpis", "roadmap"):
        raise HTTPException(400, "Tipo inválido. Use: sustentacao, projetos, kpis, roadmap")

    # Salvar arquivo
    ext = os.path.splitext(file.filename or "")[1].lower()
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    # Processar
    total_registros = 0
    try:
        if ext in (".csv", ".xlsx", ".xls"):
            df = _read_file(filepath, file.filename or "")
            if tipo == "sustentacao":
                total_registros = await _import_chamados(df, current_user.empresa_id, db)
            elif tipo == "projetos":
                total_registros = await _import_projetos(df, current_user.empresa_id, db)
            else:
                total_registros = len(df)
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(422, f"Erro ao processar arquivo: {str(e)}")

    # Registrar upload
    upload = await UploadService(db).create({
        "tipo": tipo,
        "nome_arquivo": file.filename or filename,
        "caminho": filepath,
        "tamanho_bytes": len(content),
        "total_registros": total_registros,
        "status": "processado",
        "usuario_id": current_user.id,
        "empresa_id": current_user.empresa_id,
    })

    await AuditService(db).log(
        "upload.create", current_user.id, "upload", str(upload.id),
        dados={"tipo": tipo, "arquivo": file.filename, "registros": total_registros}
    )

    return upload


@router.get("", response_model=List[UploadResponse])
async def list_uploads(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await UploadService(db).list(current_user.empresa_id)
