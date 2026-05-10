# ============================================================
# app/services/financeiro_import.py
# Importação de CSVs financeiros — espelha o CSV_MAP + SINONIMOS do HTML
# ============================================================
import hashlib, io, uuid, re
from datetime import datetime, timezone
from typing import Optional
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.models.financeiro import FinLancamento, FinImportacao

# ── Mapeamento de colunas — idêntico ao HTML ─────────────────
CSV_MAP = {
    'CODIGO': 'codigo', 'Cliente': 'cliente', 'Valor (R$)': 'valor',
    'Valor R$': 'valor', 'Plano': 'plano', 'Parcela': 'parcela',
    'Data Lançamento': 'dt_lancamento', 'Data Vencimento': 'dt_vencimento',
    'Data Recebimento': 'dt_recebimento', 'Data Pagamento': 'dt_pagamento',
    'Data Competência': 'dt_competencia',
    'Conta': 'conta', 'Identificação': 'identificacao',
    'N° do documento': 'num_documento',
    'Última modificação': 'ultima_modificacao',
    'Cadastrado por': 'cadastrado_por',
    'Conta Centro de Custo': 'centro_custo', 'Observação': 'observacao',
}

SINONIMOS = {
    # Colunas do formato Muniz (a_pagar.csv, recebidas.csv etc)
    'cod': 'codigo', 'seq': 'codigo',
    'fornecedor': 'fornecedor', 'nome_fornecedor': 'fornecedor',
    'cliente': 'cliente', 'nome_cliente': 'cliente',
    'parcela': 'parcela',
    'observacao': 'observacao', 'obs': 'observacao',
    'competencia': 'dt_competencia', 'dt_competencia': 'dt_competencia',
    'vencimento': 'dt_vencimento', 'dt_vencimento': 'dt_vencimento',
    'lancamento': 'dt_lancamento', 'dt_lancamento': 'dt_lancamento',
    'recebimento': 'dt_recebimento', 'dt_recebimento': 'dt_recebimento',
    'pagamento': 'dt_pagamento', 'dt_pagamento': 'dt_pagamento',
    'valor_r': 'valor', 'valor_rs': 'valor', 'valor_r_': 'valor',
    'plano_de_pagamento': 'plano', 'plano': 'plano', 'forma_pagamento': 'plano',
    'cadastrado_por': 'descricao', 'ultima_modificacao': 'observacao',
    'cod_lancamento': 'codigo', 'numero': 'codigo',
    'historico': 'descricao', 'descricao': 'descricao',
    'conta': 'conta', 'centro_custo': 'centro_custo',
    'identificacao': 'identificacao', 'num_documento': 'num_documento',
    'codigo': 'codigo', 'codigo_titulo': 'codigo',
    'cliente': 'cliente', 'nome_cliente': 'cliente', 'razao_social': 'cliente',
    'fornecedor': 'fornecedor', 'nome_fornecedor': 'fornecedor',
    'valor_r': 'valor', 'vlr': 'valor', 'vl': 'valor', 'valor_original': 'valor',
    'valor_liquido': 'valor', 'vlr_doc': 'valor', 'valor_pago': 'valor',
    'plano': 'plano', 'forma_pagamento': 'plano', 'forma': 'plano', 'plano_de_pagamento': 'plano',
    'parcela': 'parcela', 'installment': 'parcela',
    'data_lancamento': 'dt_lancamento', 'dt_lanc': 'dt_lancamento', 'data': 'dt_lancamento', 'lancamento': 'dt_lancamento',
    'data_vencimento': 'dt_vencimento', 'dt_venc': 'dt_vencimento', 'vencimento': 'dt_vencimento',
    'data_recebimento': 'dt_recebimento', 'dt_rec': 'dt_recebimento',
    'data_pagamento': 'dt_pagamento', 'dt_pag': 'dt_pagamento', 'dt_baixa': 'dt_pagamento',
    'data_competencia': 'dt_competencia', 'competencia': 'dt_competencia',
    'conta': 'conta', 'historico': 'descricao', 'descricao': 'descricao',
    'tipo': 'tipo', 'saldo': 'saldo', 'num_documento': 'num_documento',
    'observacao': 'observacao', 'centro_custo': 'centro_custo',
}

# Tipos válidos
TIPOS_VALIDOS = {'recebidas', 'pagas', 'a_receber', 'a_pagar', 'extrato'}

# Mapeamento de nomes de arquivo para tipo
NOME_TIPO_MAP = {
    'recebidas': 'recebidas', 'recebido': 'recebidas', 'cr': 'recebidas',
    'pagas': 'pagas', 'pagamento': 'pagas', 'pagamentos': 'pagas', 'cp': 'pagas',
    'a_receber': 'a_receber', 'contas_receber': 'a_receber', 'cra': 'a_receber',
    'a_pagar': 'a_pagar', 'contas_pagar': 'a_pagar', 'cpa': 'a_pagar',
    'extrato': 'extrato', 'extratos': 'extrato',
}


def _norm_key(k: str) -> str:
    """Normaliza chave de coluna — converte acentos e normaliza."""
    import unicodedata
    s = str(k).lower().strip()
    # Converter acentos para ASCII
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9]', '_', s)
    s = re.sub(r'_+', '_', s).strip('_')
    return s


def detectar_tipo_pelo_nome(filename: str) -> Optional[str]:
    """Detecta tipo do CSV pelo nome do arquivo."""
    nome = (filename or '').lower()
    for ext in ['.csv', '.xlsx', '.xls']:
        nome = nome.replace(ext, '')
    partes = re.split(r'[_\-\s/\\]', nome)
    for parte in reversed(partes):
        if parte in NOME_TIPO_MAP:
            return NOME_TIPO_MAP[parte]
    for key, tipo in NOME_TIPO_MAP.items():
        if key in nome:
            return tipo
    return None


def _mapear_colunas(cols: list) -> dict:
    """Mapeia colunas do CSV para campos internos."""
    mapeamento = {}
    used_targets = set()
    for col in cols:
        if not col or str(col) == 'nan':
            continue
        target = None
        if col in CSV_MAP:
            target = CSV_MAP[col]
        else:
            norm = _norm_key(col)
            if norm in SINONIMOS:
                target = SINONIMOS[norm]
            else:
                partial = next((s for s in SINONIMOS if norm.find(s) >= 0 or s.find(norm) >= 0), None)
                if partial:
                    target = SINONIMOS[partial]
        if target and target not in used_targets:
            mapeamento[col] = target
            used_targets.add(target)
    return mapeamento


def _parse_valor(val) -> float:
    """Parseia valor monetário com vírgula brasileira."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return 0.0
    s = str(val).strip().replace('R$', '').replace('\xa0', '').replace(' ', '')
    if not s or s in ('-', '—', 'nan'):
        return 0.0
    if ',' in s and '.' in s:
        return float(s.replace('.', '').replace(',', '.')) or 0.0
    if ',' in s:
        return float(s.replace(',', '.')) or 0.0
    return float(s) or 0.0


def _clean(val, maxlen: int = 300) -> Optional[str]:
    if val is None or str(val).strip() in ('', 'nan', 'None'):
        return None
    return str(val).strip()[:maxlen]


def _hash_row(data: dict) -> str:
    fields = '|'.join(str(data.get(k, '')) for k in [
        'valor', 'dt_lancamento', 'dt_vencimento', 'dt_recebimento',
        'dt_pagamento', 'cliente', 'fornecedor', 'plano',
    ])
    return hashlib.md5(fields.encode()).hexdigest()


def _read_file(content: bytes, filename: str) -> pd.DataFrame:
    fname = (filename or '').lower()

    if fname.endswith('.csv'):
        for enc in ['latin-1', 'utf-8-sig', 'utf-8', 'cp1252']:
            try:
                text = content.decode(enc, errors='replace')
                lines = text.splitlines()

                # Detectar separador
                sep = ','
                for line in lines[:10]:
                    if line.count(';') >= 3:
                        sep = ';'
                        break

                # Detectar linha do header (pula linhas de título)
                header_line = 0
                for i, line in enumerate(lines[:10]):
                    stripped = line.strip().strip(sep)
                    if not stripped:
                        continue
                    fields = [f.strip() for f in stripped.split(sep)]
                    non_empty = sum(1 for f in fields
                        if f and not f.replace('/','').replace('-','').replace(' ','').isdigit())
                    if non_empty >= 3 and len(fields) >= 3:
                        header_line = i
                        break

                df = pd.read_csv(
                    io.BytesIO(content), sep=sep, skiprows=header_line,
                    encoding=enc, dtype=str, engine='python',
                    on_bad_lines='skip'
                )
                # Remove colunas e linhas vazias
                df = df.dropna(axis=1, how='all')
                df = df.loc[:, ~df.columns.str.startswith('Unnamed')]
                df = df.dropna(how='all').reset_index(drop=True)
                if len(df) > 0 and len(df.columns) >= 2:
                    return df
            except Exception:
                continue
        raise ValueError("Não foi possível ler o CSV.")

    # Excel (.xlsx / .xls)
    try:
        return pd.read_excel(io.BytesIO(content), engine='openpyxl', dtype=str)
    except Exception:
        pass
    try:
        import tempfile, subprocess, os
        with tempfile.TemporaryDirectory() as tmpdir:
            xls_path = os.path.join(tmpdir, 'input.xls')
            with open(xls_path, 'wb') as f:
                f.write(content)
            subprocess.run(['libreoffice', '--headless', '--convert-to', 'xlsx',
                '--outdir', tmpdir, xls_path], capture_output=True, timeout=60)
            xlsx_files = [f for f in os.listdir(tmpdir) if f.endswith('.xlsx')]
            if xlsx_files:
                return pd.read_excel(os.path.join(tmpdir, xlsx_files[0]), dtype=str)
    except Exception:
        pass
    try:
        return pd.read_excel(io.BytesIO(content), engine='xlrd', dtype=str)
    except Exception as e:
        raise ValueError(f"Formato não suportado: {e}")


async def importar_csv(
    content: bytes,
    filename: str,
    tipo: Optional[str],
    loja_codigo: str,
    loja_nome: Optional[str],
    periodo: str,
    empresa_id: Optional[uuid.UUID],
    db: AsyncSession,
) -> dict:
    """
    Importa CSV financeiro com upsert inteligente.
    tipo: recebidas | pagas | a_receber | a_pagar | extrato
    """
    if not tipo:
        tipo = detectar_tipo_pelo_nome(filename)
    if not tipo:
        raise ValueError(
            f"Não foi possível detectar o tipo pelo nome '{filename}'. "
            f"Use um dos nomes: {', '.join(NOME_TIPO_MAP.keys())}"
        )
    if tipo not in TIPOS_VALIDOS:
        raise ValueError(f"Tipo inválido: '{tipo}'. Válidos: {', '.join(TIPOS_VALIDOS)}")

    df = _read_file(content, filename)
    if df.empty:
        raise ValueError("Arquivo vazio ou formato não reconhecido.")

    # Mapear colunas
    cols = list(df.columns)
    mapeamento = _mapear_colunas(cols)

    # Renomear
    df = df.rename(columns=mapeamento)

    # Buscar existentes (por loja + tipo + periodo) para upsert
    existing_result = await db.execute(
        select(FinLancamento.id, FinLancamento.dados_hash, FinLancamento.codigo)
        .where(and_(
            FinLancamento.loja_codigo == loja_codigo,
            FinLancamento.tipo        == tipo,
            FinLancamento.periodo     == periodo,
        ))
    )
    existing = {(r.codigo or str(i)): (r.id, r.dados_hash) for i, r in enumerate(existing_result)}

    total = len(df)
    inserted = updated = skipped = errors = 0
    erros_msg = []
    BATCH = 300
    to_insert = []
    to_update = []

    for idx, row in df.iterrows():
        try:
            valor = _parse_valor(row.get('valor', 0))

            # Data principal
            dt_princ = (
                _clean(row.get('dt_recebimento')) or
                _clean(row.get('dt_pagamento')) or
                _clean(row.get('dt_vencimento')) or
                _clean(row.get('dt_lancamento'))
            )
            if not dt_princ and valor == 0:
                continue  # linha vazia

            data = {
                'empresa_id':    empresa_id,
                'loja_codigo':   loja_codigo,
                'loja_nome':     loja_nome,
                'tipo':          tipo,
                'periodo':       periodo,
                'codigo':        _clean(row.get('codigo'), 100),
                'cliente':       _clean(row.get('cliente')),
                'fornecedor':    _clean(row.get('fornecedor')),
                'valor':         valor,
                'plano':         _clean(row.get('plano'), 200),
                'parcela':       _clean(row.get('parcela'), 50),
                'conta':         _clean(row.get('conta'), 200),
                'centro_custo':  _clean(row.get('centro_custo'), 200),
                'descricao':     _clean(row.get('descricao'), 1000),
                'observacao':    _clean(row.get('observacao'), 1000),
                'num_documento': _clean(row.get('num_documento'), 100),
                'identificacao': _clean(row.get('identificacao'), 200),
                'dt_lancamento':  _clean(row.get('dt_lancamento'), 30),
                'dt_vencimento':  _clean(row.get('dt_vencimento'), 30),
                'dt_recebimento': _clean(row.get('dt_recebimento'), 30),
                'dt_pagamento':   _clean(row.get('dt_pagamento'), 30),
                'dt_competencia': _clean(row.get('dt_competencia'), 30),
            }
            data['dados_hash'] = _hash_row(data)

            key = data['codigo'] or str(idx)
            if key in existing:
                rec_id, old_hash = existing[key]
                if old_hash != data['dados_hash']:
                    data['id'] = rec_id
                    data['atualizado_em'] = datetime.now(timezone.utc)
                    to_update.append(data)
                    updated += 1
                else:
                    skipped += 1
            else:
                data['id'] = uuid.uuid4()
                data['importado_em'] = datetime.now(timezone.utc)
                data['atualizado_em'] = datetime.now(timezone.utc)
                to_insert.append(data)
                inserted += 1

            if len(to_insert) >= BATCH:
                db.add_all([FinLancamento(**r) for r in to_insert])
                to_insert = []
            if len(to_update) >= BATCH:
                await _batch_update(db, to_update)
                to_update = []

        except Exception as e:
            errors += 1
            erros_msg.append(f"Linha {idx+2}: {str(e)[:100]}")

    if to_insert:
        db.add_all([FinLancamento(**r) for r in to_insert])
    if to_update:
        await _batch_update(db, to_update)

    # Registrar importação
    db.add(FinImportacao(
        empresa_id=empresa_id, loja_codigo=loja_codigo, tipo=tipo,
        periodo=periodo, nome_arquivo=filename,
        total_linhas=total, inseridos=inserted, atualizados=updated,
        ignorados=skipped, erros=errors,
    ))

    await db.flush()

    return {
        'tipo': tipo, 'periodo': periodo,
        'total_arquivo': total,
        'inseridos': inserted, 'atualizados': updated,
        'ignorados': skipped, 'erros': errors,
        'colunas_mapeadas': list(mapeamento.values()),
        'primeiros_erros': erros_msg[:5],
    }


async def _batch_update(db: AsyncSession, rows: list):
    for r in rows:
        rec_id = r.pop('id')
        result = await db.execute(select(FinLancamento).where(FinLancamento.id == rec_id))
        obj = result.scalar_one_or_none()
        if obj:
            for k, v in r.items():
                setattr(obj, k, v)
        r['id'] = rec_id


# ── Stats para o dashboard ───────────────────────────────────
async def get_stats_loja(
    db: AsyncSession,
    loja_codigo: str,
    empresa_id: Optional[uuid.UUID],
    periodo: Optional[str] = None,
) -> dict:
    from sqlalchemy import and_

    def base_q(tipo_val):
        filters = [
            FinLancamento.loja_codigo == loja_codigo,
            FinLancamento.tipo == tipo_val,
        ]
        if empresa_id:
            filters.append(FinLancamento.empresa_id == empresa_id)
        if periodo:
            filters.append(FinLancamento.periodo == periodo)
        return and_(*filters)

    async def total(tipo_val):
        r = await db.execute(
            select(func.sum(FinLancamento.valor), func.count(FinLancamento.id))
            .where(base_q(tipo_val))
        )
        row = r.one()
        return float(row[0] or 0), int(row[1] or 0)

    async def rows(tipo_val, limit=200):
        result = await db.execute(
            select(FinLancamento).where(base_q(tipo_val))
            .order_by(FinLancamento.dt_vencimento.asc().nulls_last())
            .limit(limit)
        )
        return result.scalars().all()

    rec_total, rec_n   = await total('recebidas')
    pag_total, pag_n   = await total('pagas')
    ar_total,  ar_n    = await total('a_receber')
    ap_total,  ap_n    = await total('a_pagar')
    ext_total, ext_n   = await total('extrato')

    ar_rows = await rows('a_receber')
    ap_rows = await rows('a_pagar')
    rec_rows = await rows('recebidas', 100)
    pag_rows = await rows('pagas', 100)

    def serialize(r: FinLancamento) -> dict:
        return {
            'id':            str(r.id),
            'codigo':        r.codigo,
            'cliente':       r.cliente,
            'fornecedor':    r.fornecedor,
            'valor':         r.valor,
            'plano':         r.plano,
            'dt_lancamento': r.dt_lancamento,
            'dt_vencimento': r.dt_vencimento,
            'dt_recebimento': r.dt_recebimento,
            'dt_pagamento':  r.dt_pagamento,
            'conta':         r.conta,
            'descricao':     r.descricao,
        }

    return {
        'kpis': {
            'recebidas': {'total': rec_total, 'n': rec_n},
            'pagas':     {'total': pag_total, 'n': pag_n},
            'a_receber': {'total': ar_total,  'n': ar_n},
            'a_pagar':   {'total': ap_total,  'n': ap_n},
            'extrato':   {'total': ext_total, 'n': ext_n},
            'caixa':     rec_total - pag_total,
        },
        'a_receber': [serialize(r) for r in ar_rows],
        'a_pagar':   [serialize(r) for r in ap_rows],
        'recebidas': [serialize(r) for r in rec_rows],
        'pagas':     [serialize(r) for r in pag_rows],
    }
