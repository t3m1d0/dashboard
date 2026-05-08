# ============================================================
# app/routers/financeiro.py — Módulo Financeiro
# Endpoints que o ERP_CONFIG do HTML irá consumir
# ============================================================
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from typing import Optional
import uuid, os

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.financeiro import FinFranqueado, FinRegiao, FinLoja, FinLancamento, FinImportacao
from app.services.financeiro_import import (
    importar_csv, get_stats_loja, detectar_tipo_pelo_nome
)
from app.services import UploadService

router = APIRouter(prefix="/financeiro", tags=["Financeiro"])

MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ── Seed da estrutura da rede ─────────────────────────────────
@router.post("/seed/rede")
async def seed_rede(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Importa a estrutura completa da rede Muniz (franqueados + regiões + lojas)
    do HTML original para o banco de dados.
    Idempotente — pode ser chamado múltiplas vezes.
    """
    from app.services.financeiro_seed import seed_rede_muniz
    result = await seed_rede_muniz(db)
    return result


# ── Franqueados ───────────────────────────────────────────────
@router.get("/franqueados")
async def list_franqueados(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(FinFranqueado).order_by(FinFranqueado.nome)
    )
    franqs = result.scalars().all()
    return [
        {
            'id': str(f.id), 'codigo': f.codigo, 'nome': f.nome,
            'cidade': f.cidade, 'uf': f.uf, 'status': f.status,
        }
        for f in franqs
    ]


# ── Lojas ─────────────────────────────────────────────────────
@router.get("/lojas")
async def list_lojas(
    franqueado_codigo: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(FinLoja).order_by(FinLoja.nome)
    if franqueado_codigo:
        q = q.where(FinLoja.franqueado_codigo == franqueado_codigo)
    result = await db.execute(q)
    lojas = result.scalars().all()
    return [
        {
            'id': str(l.id), 'codigo': l.codigo, 'nome': l.nome,
            'uf': l.uf, 'status': l.status,
            'franqueado_codigo': l.franqueado_codigo,
            'regiao_codigo': l.regiao_codigo,
        }
        for l in lojas
    ]


# ── Import CSV por loja ───────────────────────────────────────
@router.post("/import")
async def import_lancamentos(
    file: UploadFile = File(...),
    loja_codigo: str = Form(...),
    periodo: str = Form(...),           # YYYY-MM
    tipo: Optional[str] = Form(None),  # Se None, detecta pelo nome do arquivo
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Importa CSV de lançamentos financeiros para uma loja.
    O tipo é detectado automaticamente pelo nome do arquivo se não informado.
    """
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(413, f"Máximo {settings.MAX_UPLOAD_SIZE_MB}MB")

    # Buscar nome da loja
    loja_result = await db.execute(
        select(FinLoja).where(FinLoja.codigo == loja_codigo)
    )
    loja = loja_result.scalar_one_or_none()
    loja_nome = loja.nome if loja else loja_codigo

    try:
        resultado = await importar_csv(
            content=content,
            filename=file.filename or '',
            tipo=tipo,
            loja_codigo=loja_codigo,
            loja_nome=loja_nome,
            periodo=periodo,
            empresa_id=current_user.empresa_id,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erro: {str(e)}")

    return resultado


# ── Stats de uma loja (consome REAL_DATA do HTML) ─────────────
@router.get("/stats/{loja_codigo}")
async def get_stats(
    loja_codigo: str,
    periodo: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Stats financeiros de uma loja — alimenta o dashboard HTML."""
    return await get_stats_loja(
        db, loja_codigo, current_user.empresa_id, periodo=periodo
    )


# ── Endpoints estilo ERP (mesmas rotas do ERP_CONFIG) ─────────
@router.get("/contas-receber")
async def get_contas_receber(
    loja_codigo: Optional[str] = Query(None),
    periodo: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(200, le=500),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await _list_tipo(db, 'a_receber', loja_codigo, periodo,
                            current_user.empresa_id, page, page_size)


@router.get("/contas-pagar")
async def get_contas_pagar(
    loja_codigo: Optional[str] = Query(None),
    periodo: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(200, le=500),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await _list_tipo(db, 'a_pagar', loja_codigo, periodo,
                            current_user.empresa_id, page, page_size)


@router.get("/recebidas")
async def get_recebidas(
    loja_codigo: Optional[str] = Query(None),
    periodo: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(200, le=500),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await _list_tipo(db, 'recebidas', loja_codigo, periodo,
                            current_user.empresa_id, page, page_size)


@router.get("/pagas")
async def get_pagas(
    loja_codigo: Optional[str] = Query(None),
    periodo: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(200, le=500),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await _list_tipo(db, 'pagas', loja_codigo, periodo,
                            current_user.empresa_id, page, page_size)


@router.get("/extratos")
async def get_extratos(
    loja_codigo: Optional[str] = Query(None),
    periodo: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(200, le=500),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await _list_tipo(db, 'extrato', loja_codigo, periodo,
                            current_user.empresa_id, page, page_size)


# ── Períodos disponíveis por loja ─────────────────────────────
@router.get("/periodos/{loja_codigo}")
async def get_periodos(
    loja_codigo: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(
            FinLancamento.periodo,
            FinLancamento.tipo,
            func.count(FinLancamento.id).label('n'),
            func.sum(FinLancamento.valor).label('total'),
        )
        .where(and_(
            FinLancamento.loja_codigo == loja_codigo,
            FinLancamento.empresa_id == current_user.empresa_id,
        ))
        .group_by(FinLancamento.periodo, FinLancamento.tipo)
        .order_by(FinLancamento.periodo.desc())
    )
    rows = result.fetchall()
    periodos: dict = {}
    for r in rows:
        p = r.periodo or 'sem-periodo'
        if p not in periodos:
            periodos[p] = {'periodo': p, 'tipos': {}}
        periodos[p]['tipos'][r.tipo] = {'n': int(r.n), 'total': float(r.total or 0)}
    return sorted(periodos.values(), key=lambda x: x['periodo'], reverse=True)


# ── Histórico de importações ──────────────────────────────────
@router.get("/importacoes")
async def list_importacoes(
    loja_codigo: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(FinImportacao).where(
        FinImportacao.empresa_id == current_user.empresa_id
    )
    if loja_codigo:
        q = q.where(FinImportacao.loja_codigo == loja_codigo)
    q = q.order_by(desc(FinImportacao.importado_em)).limit(100)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        {
            'id': str(r.id), 'loja_codigo': r.loja_codigo, 'tipo': r.tipo,
            'periodo': r.periodo, 'nome_arquivo': r.nome_arquivo,
            'inseridos': r.inseridos, 'atualizados': r.atualizados,
            'erros': r.erros, 'importado_em': r.importado_em.isoformat(),
        }
        for r in rows
    ]


# ── Delete período/tipo ───────────────────────────────────────
@router.delete("/lancamentos/{loja_codigo}/{tipo}/{periodo}")
async def delete_lancamentos(
    loja_codigo: str,
    tipo: str,
    periodo: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from sqlalchemy import delete as sa_delete
    result = await db.execute(
        sa_delete(FinLancamento).where(and_(
            FinLancamento.empresa_id == current_user.empresa_id,
            FinLancamento.loja_codigo == loja_codigo,
            FinLancamento.tipo == tipo,
            FinLancamento.periodo == periodo,
        ))
    )
    await db.flush()
    return {'ok': True, 'removidos': result.rowcount}


# ── Helper interno ────────────────────────────────────────────
async def _list_tipo(db, tipo, loja_codigo, periodo, empresa_id, page, page_size):
    filters = [
        FinLancamento.tipo == tipo,
        FinLancamento.empresa_id == empresa_id,
    ]
    if loja_codigo:
        filters.append(FinLancamento.loja_codigo == loja_codigo)
    if periodo:
        filters.append(FinLancamento.periodo == periodo)

    base = and_(*filters)
    total = (await db.execute(
        select(func.count(FinLancamento.id)).where(base)
    )).scalar()

    rows = (await db.execute(
        select(FinLancamento).where(base)
        .order_by(FinLancamento.dt_vencimento.asc().nulls_last())
        .offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    return {
        'total': total, 'page': page,
        'items': [
            {
                'id': str(r.id), 'codigo': r.codigo,
                'cliente': r.cliente, 'fornecedor': r.fornecedor,
                'valor': r.valor, 'plano': r.plano,
                'dt_lancamento': r.dt_lancamento,
                'dt_vencimento': r.dt_vencimento,
                'dt_recebimento': r.dt_recebimento,
                'dt_pagamento': r.dt_pagamento,
                'conta': r.conta, 'descricao': r.descricao,
                'loja_codigo': r.loja_codigo,
            }
            for r in rows
        ]
    }
