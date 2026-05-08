# ============================================================
# app/services/compras_import.py
# Importação inteligente do Excel de movimentação de produtos
# ============================================================
import hashlib
import io
import uuid
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.models.compras import MovimentacaoProduto


def _parse_cost(val) -> float:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return 0.0
    s = str(val).strip().replace('\xa0', '').replace(' ', '')
    if s in ('', 'nan', 'None', '-'):
        return 0.0
    return float(s.replace('.', '').replace(',', '.')) or 0.0


def _parse_num(val) -> float:
    try:
        return float(str(val).replace(',', '.'))
    except Exception:
        return 0.0


def _clean_name(val) -> str:
    if not val or str(val).strip() in ('', 'nan'):
        return ''
    return str(val).strip().replace('\t', ' ').replace('\xa0', ' ')


def _hash_row(r: dict) -> str:
    fields = '|'.join(str(r.get(k, '')) for k in [
        'estoque_anterior', 'custo_anterior',
        'qtd_entrada', 'custo_entrada',
        'qtd_saida', 'custo_saida',
        'estoque_final', 'custo_final',
    ])
    return hashlib.md5(fields.encode()).hexdigest()


def _read_file(content: bytes, filename: str) -> pd.DataFrame:
    """Lê xlsx ou csv com encoding fallback."""
    fname = (filename or '').lower()
    if fname.endswith('.csv'):
        for enc in ['utf-8-sig', 'latin-1', 'utf-8', 'cp1252']:
            try:
                df = pd.read_csv(io.BytesIO(content), sep=';', encoding=enc,
                                 dtype=str, encoding_errors='replace')
                return df
            except Exception:
                continue
        raise ValueError("Não foi possível ler o CSV.")
    else:
        return pd.read_excel(io.BytesIO(content), dtype=str)


async def importar_movimentacao(
    content: bytes,
    filename: str,
    periodo: str,
    empresa_id: Optional[uuid.UUID],
    db: AsyncSession,
) -> dict:
    """
    Upsert inteligente por (empresa_id, id_filial, id_produto, periodo).
    - Novo  → INSERT
    - Mudou → UPDATE
    - Igual → SKIP
    """
    df = _read_file(content, filename)

    # Validar colunas mínimas
    required = {'ID FILIAL', 'ID PRODUTO', 'NOME PRODUTO'}
    missing  = required - set(df.columns)
    if missing:
        raise ValueError(f"Colunas obrigatórias ausentes: {missing}. Encontradas: {list(df.columns)}")

    # Buscar existentes do período de uma vez
    existing_result = await db.execute(
        select(
            MovimentacaoProduto.id_filial,
            MovimentacaoProduto.id_produto,
            MovimentacaoProduto.id,
            MovimentacaoProduto.dados_hash,
        ).where(
            and_(
                MovimentacaoProduto.empresa_id == empresa_id,
                MovimentacaoProduto.periodo    == periodo,
            )
        )
    )
    existing = {
        (r.id_filial, r.id_produto): (r.id, r.dados_hash)
        for r in existing_result
    }

    total    = len(df)
    inserted = 0
    updated  = 0
    skipped  = 0
    errors   = []

    BATCH      = 300
    to_insert  = []
    to_update  = []

    for idx, row in df.iterrows():
        try:
            id_filial  = int(float(str(row.get('ID FILIAL',  0) or 0)))
            id_produto = int(float(str(row.get('ID PRODUTO', 0) or 0)))
            if id_filial == 0 or id_produto == 0:
                continue

            data = {
                'empresa_id':      empresa_id,
                'periodo':         periodo,
                'id_filial':       id_filial,
                'nome_filial':     _clean_name(row.get('NOME FILIAL', '')),
                'id_produto':      id_produto,
                'nome_produto':    _clean_name(row.get('NOME PRODUTO', '')),
                'grupo':           _clean_name(row.get('GRUPO', '')),
                'estoque_anterior': _parse_num(row.get('ESTOQUE ANTERIOR', 0)),
                'custo_anterior':  _parse_cost(row.get('CUSTO TOTAL ANTERIOR R$', 0)),
                'qtd_entrada':     _parse_num(row.get('QTD ENTRADA', 0)),
                'custo_entrada':   _parse_cost(row.get('CUSTO TOTAL ENTRADA R$', 0)),
                'qtd_saida':       _parse_num(row.get('QTD SAÍDA', 0) or row.get('QTD SAIDA', 0)),
                'custo_saida':     _parse_cost(row.get('CUSTO TOTAL SAÍDA R$', 0) or row.get('CUSTO TOTAL SAIDA R$', 0)),
                'estoque_final':   _parse_num(row.get('ESTOQUE FINAL', 0)),
                'custo_final':     _parse_cost(row.get('CUSTO TOTAL FINAL R$', 0)),
            }
            data['dados_hash'] = _hash_row(data)

            key = (id_filial, id_produto)
            if key in existing:
                rec_id, old_hash = existing[key]
                if old_hash != data['dados_hash']:
                    data['id']          = rec_id
                    data['atualizado_em'] = datetime.now(timezone.utc)
                    to_update.append(data)
                    updated += 1
                else:
                    skipped += 1
            else:
                data['id']           = uuid.uuid4()
                data['importado_em'] = datetime.now(timezone.utc)
                data['atualizado_em'] = datetime.now(timezone.utc)
                to_insert.append(data)
                inserted += 1

            if len(to_insert) >= BATCH:
                db.add_all([MovimentacaoProduto(**r) for r in to_insert])
                to_insert = []
            if len(to_update) >= BATCH:
                await _batch_update(db, to_update)
                to_update = []

        except Exception as e:
            errors.append(f"Linha {idx+2}: {str(e)[:100]}")

    if to_insert:
        db.add_all([MovimentacaoProduto(**r) for r in to_insert])
    if to_update:
        await _batch_update(db, to_update)

    await db.flush()

    return {
        'total_arquivo': total,
        'inseridos':     inserted,
        'atualizados':   updated,
        'ignorados':     skipped,
        'erros':         len(errors),
        'periodo':       periodo,
        'primeiros_erros': errors[:5],
    }


async def _batch_update(db: AsyncSession, rows: list):
    for r in rows:
        rec_id = r.pop('id')
        result = await db.execute(
            select(MovimentacaoProduto).where(MovimentacaoProduto.id == rec_id)
        )
        obj = result.scalar_one_or_none()
        if obj:
            for k, v in r.items():
                setattr(obj, k, v)
        r['id'] = rec_id


# ── Analytics ─────────────────────────────────────────────────

async def get_stats(
    db: AsyncSession,
    empresa_id: Optional[uuid.UUID],
    periodo:   Optional[str] = None,
    grupo:     Optional[str] = None,
    filial:    Optional[str] = None,
    categoria: Optional[str] = None,  # pneus | pecas | administrativo
) -> dict:
    from sqlalchemy import desc

    import re as _re
    _PNEU_RE_SVC  = _re.compile(r'\d{3}[\s/]\d{2}[\s/R]?\d{2}', _re.IGNORECASE)
    _ADMIN_KW_SVC = ['MATERIAIS APLICADOS','INSUMO','UNIFORME','HIGIENE','COPA','COZINHA','FERRAMENTA','ESCRITORIO','ESCRITÓRIO','MATERIAL DE ESCRITOR','MATERIAL DE OBRA']
    from sqlalchemy import or_, case

    filters = []
    if empresa_id: filters.append(MovimentacaoProduto.empresa_id == empresa_id)
    if periodo:    filters.append(MovimentacaoProduto.periodo    == periodo)
    if grupo:      filters.append(MovimentacaoProduto.grupo      == grupo)
    if filial:     filters.append(MovimentacaoProduto.nome_filial == filial)

    if categoria == 'pneus':
        filters.append(or_(
            MovimentacaoProduto.grupo.ilike('%PNEU%'),
            MovimentacaoProduto.nome_produto.ilike('%PNEU%'),
            MovimentacaoProduto.grupo.op('~')(r'\d{3}[\s/]\d{2}[\s/R]?\d{2}'),
        ))
    elif categoria == 'administrativo':
        filters.append(or_(*[MovimentacaoProduto.grupo.ilike(f'%{kw}%') for kw in _ADMIN_KW_SVC]))
    elif categoria == 'pecas':
        filters.append(and_(
            ~MovimentacaoProduto.grupo.ilike('%PNEU%'),
            ~MovimentacaoProduto.nome_produto.ilike('%PNEU%'),
            ~MovimentacaoProduto.grupo.op('~')(r'\d{3}[\s/]\d{2}[\s/R]?\d{2}'),
            *[~MovimentacaoProduto.grupo.ilike(f'%{kw}%') for kw in _ADMIN_KW_SVC],
        ))

    base = and_(*filters) if filters else True

    # KPIs globais
    kpi_result = await db.execute(
        select(
            func.count(MovimentacaoProduto.id).label('total'),
            func.count(MovimentacaoProduto.id_filial.distinct()).label('n_filiais'),
            func.count(MovimentacaoProduto.id_produto.distinct()).label('n_produtos'),
            func.count(MovimentacaoProduto.grupo.distinct()).label('n_grupos'),
            func.sum(MovimentacaoProduto.qtd_entrada).label('qtd_entrada'),
            func.sum(MovimentacaoProduto.custo_entrada).label('custo_entrada'),
            func.sum(MovimentacaoProduto.qtd_saida).label('qtd_saida'),
            func.sum(MovimentacaoProduto.custo_saida).label('custo_saida'),
            func.sum(MovimentacaoProduto.estoque_final).label('estoque_final'),
            func.sum(MovimentacaoProduto.custo_final).label('custo_final'),
        ).where(base)
    )
    row = kpi_result.one()
    kpis = {
        'total':          int(row.total or 0),
        'n_filiais':      int(row.n_filiais or 0),
        'n_produtos':     int(row.n_produtos or 0),
        'n_grupos':       int(row.n_grupos or 0),
        'qtd_entrada':    float(row.qtd_entrada or 0),
        'custo_entrada':  round(float(row.custo_entrada or 0), 2),
        'qtd_saida':      float(row.qtd_saida or 0),
        'custo_saida':    round(float(row.custo_saida or 0), 2),
        'estoque_final':  float(row.estoque_final or 0),
        'custo_final':    round(float(row.custo_final or 0), 2),
    }

    # Estoque negativo
    neg_result = await db.execute(
        select(func.count(MovimentacaoProduto.id)).where(
            and_(base, MovimentacaoProduto.estoque_final < 0)
        )
    )
    kpis['estoque_negativo'] = int(neg_result.scalar() or 0)

    # Top filiais por custo final
    filiais_result = await db.execute(
        select(
            MovimentacaoProduto.nome_filial,
            func.sum(MovimentacaoProduto.estoque_final).label('estoque'),
            func.sum(MovimentacaoProduto.custo_final).label('custo'),
            func.sum(MovimentacaoProduto.qtd_entrada).label('entrada'),
            func.sum(MovimentacaoProduto.custo_entrada).label('custo_entrada'),
            func.sum(MovimentacaoProduto.qtd_saida).label('saida'),
            func.sum(MovimentacaoProduto.custo_saida).label('custo_saida'),
        ).where(base)
        .group_by(MovimentacaoProduto.nome_filial)
        .order_by(desc(func.sum(MovimentacaoProduto.custo_final)))
        .limit(30)
    )
    por_filial = [
        {
            'nome': r.nome_filial, 'estoque': float(r.estoque or 0),
            'custo': round(float(r.custo or 0), 2),
            'entrada': float(r.entrada or 0), 'custo_entrada': round(float(r.custo_entrada or 0), 2),
            'saida': float(r.saida or 0), 'custo_saida': round(float(r.custo_saida or 0), 2),
        }
        for r in filiais_result
    ]

    # Top grupos por custo
    grupos_result = await db.execute(
        select(
            MovimentacaoProduto.grupo,
            func.sum(MovimentacaoProduto.estoque_final).label('estoque'),
            func.sum(MovimentacaoProduto.custo_final).label('custo'),
            func.sum(MovimentacaoProduto.qtd_entrada).label('entrada'),
            func.sum(MovimentacaoProduto.qtd_saida).label('saida'),
            func.count(MovimentacaoProduto.id_produto.distinct()).label('n_produtos'),
        ).where(base)
        .group_by(MovimentacaoProduto.grupo)
        .order_by(desc(func.sum(MovimentacaoProduto.custo_final)))
        .limit(30)
    )
    por_grupo = [
        {
            'grupo': r.grupo, 'estoque': float(r.estoque or 0),
            'custo': round(float(r.custo or 0), 2),
            'entrada': float(r.entrada or 0), 'saida': float(r.saida or 0),
            'n_produtos': int(r.n_produtos or 0),
        }
        for r in grupos_result
    ]

    # Top produtos por custo
    produtos_result = await db.execute(
        select(
            MovimentacaoProduto.id_produto,
            MovimentacaoProduto.nome_produto,
            MovimentacaoProduto.grupo,
            func.sum(MovimentacaoProduto.estoque_final).label('estoque'),
            func.sum(MovimentacaoProduto.custo_final).label('custo'),
            func.sum(MovimentacaoProduto.qtd_entrada).label('entrada'),
            func.sum(MovimentacaoProduto.qtd_saida).label('saida'),
            func.count(MovimentacaoProduto.id_filial.distinct()).label('n_filiais'),
        ).where(base)
        .group_by(MovimentacaoProduto.id_produto, MovimentacaoProduto.nome_produto, MovimentacaoProduto.grupo)
        .order_by(desc(func.sum(MovimentacaoProduto.custo_final)))
        .limit(20)
    )
    top_produtos = [
        {
            'id': int(r.id_produto), 'nome': r.nome_produto, 'grupo': r.grupo,
            'estoque': float(r.estoque or 0), 'custo': round(float(r.custo or 0), 2),
            'entrada': float(r.entrada or 0), 'saida': float(r.saida or 0),
            'n_filiais': int(r.n_filiais or 0),
        }
        for r in produtos_result
    ]

    # Períodos disponíveis
    periodos_result = await db.execute(
        select(MovimentacaoProduto.periodo)
        .where(MovimentacaoProduto.empresa_id == empresa_id)
        .distinct()
        .order_by(MovimentacaoProduto.periodo.desc())
    )
    periodos = [r[0] for r in periodos_result if r[0]]

    # Listas para filtros
    filiais_list = [r.nome_filial for r in (await db.execute(
        select(MovimentacaoProduto.nome_filial).where(base)
        .distinct().order_by(MovimentacaoProduto.nome_filial)
    ))]
    grupos_list = [r.grupo for r in (await db.execute(
        select(MovimentacaoProduto.grupo).where(base)
        .distinct().order_by(MovimentacaoProduto.grupo)
    )) if r.grupo]

    return {
        'kpis':        kpis,
        'por_filial':  por_filial,
        'por_grupo':   por_grupo,
        'top_produtos': top_produtos,
        'periodos':    periodos,
        'filtros': {
            'filiais': filiais_list,
            'grupos':  grupos_list,
        }
    }
