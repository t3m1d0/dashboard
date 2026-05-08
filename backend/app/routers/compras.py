# ============================================================
# app/routers/compras.py — Módulo de Compras
# ============================================================
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from typing import Optional
import uuid, os

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.compras import MovimentacaoProduto
from app.services.compras_import import importar_movimentacao, get_stats
from app.services import UploadService, AuditService

router = APIRouter(prefix="/compras", tags=["Compras"])

import re

# ── Classificação de produtos ─────────────────────────────────
_PNEU_RE    = re.compile(r'\b\d{3}[\s/]\d{2}[\s/R]?\d{2}\b', re.IGNORECASE)
_ADMIN_KW   = [
    'MATERIAIS APLICADOS', 'INSUMO', 'UNIFORME', 'HIGIENE',
    'COPA', 'COZINHA', 'FERRAMENTA', 'ESCRITORIO', 'ESCRITÓRIO',
    'MATERIAL DE ESCRITOR', 'MATERIAL DE OBRA',
]

def _is_pneu(grupo: str, nome: str) -> bool:
    g, n = grupo.upper(), nome.upper()
    if 'PNEU' in g or 'PNEU' in n: return True
    if _PNEU_RE.search(g) or _PNEU_RE.search(n): return True
    return False

def _is_admin(grupo: str) -> bool:
    g = grupo.upper()
    return any(kw in g for kw in _ADMIN_KW)

def _categoria_filters(categoria: str):
    """Retorna filtros SQLAlchemy para a categoria selecionada."""
    from sqlalchemy import or_, and_, func
    if categoria == 'pneus':
        return [or_(
            MovimentacaoProduto.grupo.ilike('%PNEU%'),
            MovimentacaoProduto.nome_produto.ilike('%PNEU%'),
            MovimentacaoProduto.grupo.op('~')(r'\d{3}[\s/]\d{2}[\s/R]?\d{2}'),
        )]
    elif categoria == 'administrativo':
        kw_filters = [
            MovimentacaoProduto.grupo.ilike(f'%{kw}%')
            for kw in _ADMIN_KW
        ]
        return [or_(*kw_filters)]
    elif categoria == 'pecas':
        # Nem pneu nem administrativo
        not_pneu = and_(
            ~MovimentacaoProduto.grupo.ilike('%PNEU%'),
            ~MovimentacaoProduto.nome_produto.ilike('%PNEU%'),
            ~MovimentacaoProduto.grupo.op('~')(r'\d{3}[\s/]\d{2}[\s/R]?\d{2}'),
        )
        not_admin_filters = [
            ~MovimentacaoProduto.grupo.ilike(f'%{kw}%')
            for kw in _ADMIN_KW
        ]
        return [not_pneu, and_(*not_admin_filters)]
    return []



MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ── Import ────────────────────────────────────────────────────
@router.post("/movimentacao/import")
async def import_movimentacao(
    file: UploadFile = File(...),
    periodo: str = Form(...),  # Ex: "2026-05" ou "Maio 2026"
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(413, f"Arquivo muito grande. Máximo: {settings.MAX_UPLOAD_SIZE_MB}MB")

    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in ('.xlsx', '.xls', '.csv'):
        raise HTTPException(400, "Use arquivo .xlsx, .xls ou .csv")

    try:
        resultado = await importar_movimentacao(
            content, file.filename or 'import', periodo,
            current_user.empresa_id, db
        )
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erro ao processar: {str(e)}")

    # Registrar upload
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
    with open(filepath, 'wb') as f:
        f.write(content)

    await UploadService(db).create({
        'tipo': 'compras_movimentacao',
        'nome_arquivo': file.filename or 'import',
        'caminho': filepath,
        'tamanho_bytes': len(content),
        'total_registros': resultado['inseridos'] + resultado['atualizados'],
        'status': 'processado',
        'usuario_id': current_user.id,
        'empresa_id': current_user.empresa_id,
    })

    await AuditService(db).log(
        'compras.movimentacao.import', current_user.id,
        'movimentacoes_produtos', None, dados=resultado
    )

    return resultado


# ── Stats / Dashboard ─────────────────────────────────────────
@router.get("/movimentacao/stats")
async def get_movimentacao_stats(
    periodo:   Optional[str] = Query(None),
    grupo:     Optional[str] = Query(None),
    filial:    Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),  # pneus | pecas | administrativo
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await get_stats(
        db, current_user.empresa_id,
        periodo=periodo, grupo=grupo, filial=filial, categoria=categoria
    )


# ── Listagem ──────────────────────────────────────────────────
@router.get("/movimentacao/itens")
async def list_itens(
    periodo:   Optional[str] = Query(None),
    grupo:     Optional[str] = Query(None),
    filial:    Optional[str] = Query(None),
    busca:     Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),  # pneus | pecas | administrativo
    order_by: str           = Query('custo_final'),
    order:    str           = Query('desc'),
    page:     int           = Query(1, ge=1),
    page_size: int          = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filters = [MovimentacaoProduto.empresa_id == current_user.empresa_id]
    if periodo: filters.append(MovimentacaoProduto.periodo     == periodo)
    if grupo:   filters.append(MovimentacaoProduto.grupo       == grupo)
    if filial:  filters.append(MovimentacaoProduto.nome_filial == filial)
    if busca:   filters.append(MovimentacaoProduto.nome_produto.ilike(f'%{busca}%'))
    if categoria:
        filters.extend(_categoria_filters(categoria))

    base = and_(*filters)

    total = (await db.execute(
        select(func.count(MovimentacaoProduto.id)).where(base)
    )).scalar()

    col_map = {
        'custo_final':  MovimentacaoProduto.custo_final,
        'estoque_final': MovimentacaoProduto.estoque_final,
        'qtd_entrada':  MovimentacaoProduto.qtd_entrada,
        'qtd_saida':    MovimentacaoProduto.qtd_saida,
        'nome_produto': MovimentacaoProduto.nome_produto,
    }
    col = col_map.get(order_by, MovimentacaoProduto.custo_final)
    ord_fn = desc(col) if order == 'desc' else col

    rows = (await db.execute(
        select(MovimentacaoProduto).where(base)
        .order_by(ord_fn)
        .offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    return {
        'total': total,
        'page':  page,
        'items': [
            {
                'id':              str(r.id),
                'id_filial':       r.id_filial,
                'nome_filial':     r.nome_filial,
                'id_produto':      r.id_produto,
                'nome_produto':    r.nome_produto,
                'grupo':           r.grupo,
                'periodo':         r.periodo,
                'estoque_anterior': r.estoque_anterior,
                'custo_anterior':   r.custo_anterior,
                'qtd_entrada':     r.qtd_entrada,
                'custo_entrada':   r.custo_entrada,
                'qtd_saida':       r.qtd_saida,
                'custo_saida':     r.custo_saida,
                'estoque_final':   r.estoque_final,
                'custo_final':     r.custo_final,
            }
            for r in rows
        ]
    }


# ── Períodos disponíveis ──────────────────────────────────────
@router.get("/movimentacao/periodos")
async def list_periodos(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(
            MovimentacaoProduto.periodo,
            func.count(MovimentacaoProduto.id).label('registros'),
            func.count(MovimentacaoProduto.id_filial.distinct()).label('filiais'),
            func.sum(MovimentacaoProduto.custo_final).label('custo_total'),
        )
        .where(MovimentacaoProduto.empresa_id == current_user.empresa_id)
        .group_by(MovimentacaoProduto.periodo)
        .order_by(MovimentacaoProduto.periodo.desc())
    )
    return [
        {
            'periodo': r.periodo,
            'registros': int(r.registros or 0),
            'filiais': int(r.filiais or 0),
            'custo_total': round(float(r.custo_total or 0), 2),
        }
        for r in result
    ]
