# ============================================================
# app/routers/sustentacao.py — Endpoints de Sustentação
# ============================================================
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract, desc
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.sustentacao import ChamadoSustentacao
from app.services.sustentacao_import import importar_csv, get_stats
from app.services import AuditService, UploadService
from app.core.config import settings
import os

router = APIRouter(prefix="/sustentacao", tags=["Sustentação"])

MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ── Upload CSV ───────────────────────────────────────────────
@router.post("/import")
async def import_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Importa CSV de chamados com upsert inteligente.
    Detecta novos e alterados automaticamente.
    """
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(413, f"Arquivo muito grande. Máximo: {settings.MAX_UPLOAD_SIZE_MB}MB")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".csv", ".xlsx", ".xls"):
        raise HTTPException(400, "Use arquivo .csv ou .xlsx")

    try:
        resultado = await importar_csv(content, current_user.empresa_id, db)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erro ao processar: {str(e)}")

    # Salvar o arquivo
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
    with open(filepath, "wb") as f:
        f.write(content)

    await UploadService(db).create({
        "tipo": "sustentacao",
        "nome_arquivo": file.filename or "import.csv",
        "caminho": filepath,
        "tamanho_bytes": len(content),
        "total_registros": resultado["inseridos"] + resultado["atualizados"],
        "status": "processado",
        "usuario_id": current_user.id,
        "empresa_id": current_user.empresa_id,
    })

    await AuditService(db).log(
        "sustentacao.import", current_user.id, "chamados_sustentacao", None, dados=resultado
    )

    return resultado


# ── Dashboard stats ──────────────────────────────────────────
@router.get("/stats")
async def get_sustentacao_stats(
    mes: Optional[int]  = Query(None, ge=1, le=12),
    ano: Optional[int]  = Query(None),
    data_inicio: Optional[str] = Query(None),
    data_fim:    Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await get_stats(
        db, current_user.empresa_id,
        mes=mes, ano=ano, data_inicio=data_inicio, data_fim=data_fim
    )


# ── Listagem de chamados ──────────────────────────────────────
@router.get("/chamados")
async def list_chamados(
    mes: Optional[int]  = Query(None, ge=1, le=12),
    ano: Optional[int]  = Query(None),
    data_inicio: Optional[str] = Query(None),
    data_fim:    Optional[str] = Query(None),
    situacao: Optional[str]    = Query(None),
    assunto:  Optional[str]    = Query(None),
    responsavel: Optional[str] = Query(None),
    origem:   Optional[str]    = Query(None),
    busca:    Optional[str]    = Query(None),
    page:     int              = Query(1, ge=1),
    page_size: int             = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from datetime import datetime, timezone

    filters = [ChamadoSustentacao.empresa_id == current_user.empresa_id]

    # Período
    if data_inicio and data_fim:
        di = datetime.strptime(data_inicio, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        df_ = datetime.strptime(data_fim, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        filters.append(ChamadoSustentacao.data_disponibilidade >= di)
        filters.append(ChamadoSustentacao.data_disponibilidade <= df_)
    elif ano:
        filters.append(extract("year", ChamadoSustentacao.data_disponibilidade) == ano)
        if mes:
            filters.append(extract("month", ChamadoSustentacao.data_disponibilidade) == mes)

    if situacao:    filters.append(ChamadoSustentacao.situacao == situacao)
    if assunto:     filters.append(ChamadoSustentacao.assunto == assunto)
    if responsavel: filters.append(ChamadoSustentacao.usuario_responsavel == responsavel)
    if origem:      filters.append(ChamadoSustentacao.origem == origem)
    if busca:       filters.append(ChamadoSustentacao.titulo_chamado.ilike(f"%{busca}%"))

    base = and_(*filters)
    total = (await db.execute(select(func.count(ChamadoSustentacao.id)).where(base))).scalar()

    q = (
        select(ChamadoSustentacao).where(base)
        .order_by(desc(ChamadoSustentacao.data_disponibilidade))
        .offset((page - 1) * page_size).limit(page_size)
    )
    items = (await db.execute(q)).scalars().all()

    return {
        "total": total,
        "page": page,
        "items": [
            {
                "id":                  str(c.id),
                "cod_tarefa":          c.cod_tarefa,
                "cod_chamado":         c.cod_chamado,
                "titulo_chamado":      c.titulo_chamado,
                "assunto":             c.assunto,
                "situacao":            c.situacao,
                "origem":              c.origem,
                "usuario_responsavel": c.usuario_responsavel,
                "usuario_solicitante": c.usuario_solicitante,
                "data_disponibilidade": c.data_disponibilidade.isoformat() if c.data_disponibilidade else None,
                "data_conclusao":       c.data_conclusao.isoformat()       if c.data_conclusao       else None,
                "data_indeferimento":   c.data_indeferimento.isoformat()   if c.data_indeferimento   else None,
            }
            for c in items
        ]
    }


# ── Histórico de uploads ──────────────────────────────────────
@router.get("/uploads")
async def list_uploads(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await UploadService(db).list(current_user.empresa_id)
