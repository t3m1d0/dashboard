# ============================================================
# app/services/gente_import.py
# Importação flexível de folha de pagamento
# Detecta colunas automaticamente — adapta a qualquer formato de ERP
# ============================================================
import hashlib, io, uuid, re, json
from datetime import datetime, timezone
from typing import Optional
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, delete as sa_delete

from app.models.gente import GenteFolha, GenteColaborador, GenteImportacao

# ── Meses ────────────────────────────────────────────────────
MESES_MAP = {
    'janeiro':1,'fevereiro':2,'março':3,'marco':3,'abril':4,
    'maio':5,'junho':6,'julho':7,'agosto':8,'setembro':9,
    'outubro':10,'novembro':11,'dezembro':12
}
MESES_NOME = {
    1:'Janeiro',2:'Fevereiro',3:'Março',4:'Abril',5:'Maio',6:'Junho',
    7:'Julho',8:'Agosto',9:'Setembro',10:'Outubro',11:'Novembro',12:'Dezembro'
}

# ── Mapeamento de colunas — preparado para adaptar ao Excel real ──
# Será ATUALIZADO quando o Excel chegar. Por ora cobre os padrões comuns.
COL_MAP = {
    # Identificação
    'matricula': 'matricula', 'matrícula': 'matricula', 'mat': 'matricula',
    'cod_func': 'matricula', 'codigo': 'matricula', 'código': 'matricula',
    'cpf': 'cpf',
    'nome': 'nome', 'funcionario': 'nome', 'funcionário': 'nome',
    'colaborador': 'nome', 'nome_funcionario': 'nome',
    'pis': 'pis', 'pis_pasep': 'pis',

    # Lotação
    'empresa': 'empresa', 'razao_social': 'empresa', 'razão_social': 'empresa',
    'filial': 'filial', 'unidade': 'filial', 'loja': 'filial',
    'departamento': 'departamento', 'depto': 'departamento', 'setor': 'departamento',
    'cargo': 'cargo', 'funcao': 'funcao', 'função': 'funcao',
    'centro_custo': 'centro_custo', 'cc': 'centro_custo', 'ccusto': 'centro_custo',

    # Vínculo
    'situacao': 'situacao', 'situação': 'situacao', 'status': 'situacao',
    'tipo_contrato': 'tipo_contrato', 'vinculo': 'tipo_contrato', 'vínculo': 'tipo_contrato',
    'admissao': 'data_admissao', 'admissão': 'data_admissao', 'dt_admissao': 'data_admissao',

    # Verbas
    'cod_verba': 'verba_codigo', 'codigo_verba': 'verba_codigo',
    'verba': 'verba_nome', 'desc_verba': 'verba_nome', 'descricao_verba': 'verba_nome',
    'tipo_verba': 'verba_tipo', 'tipo': 'verba_tipo',
    'referencia': 'referencia', 'quantidade': 'referencia', 'horas': 'referencia',
    'valor': 'valor', 'vl': 'valor', 'vlr': 'valor', 'vl_verba': 'valor',

    # Totalizadores
    'salario_base': 'salario_base', 'salário_base': 'salario_base',
    'salario': 'salario_base', 'salário': 'salario_base',
    'total_proventos': 'total_proventos', 'proventos': 'total_proventos',
    'total_descontos': 'total_descontos', 'descontos': 'total_descontos',
    'liquido': 'liquido', 'líquido': 'liquido', 'vl_liquido': 'liquido',
    'fgts': 'fgts', 'inss': 'inss', 'irrf': 'irrf', 'ir': 'irrf',
}


def _norm_key(k: str) -> str:
    s = str(k).lower().strip()
    s = re.sub(r'[^a-z0-9]', '_', s)
    s = re.sub(r'_+', '_', s).strip('_')
    return s


def _detect_columns(df: pd.DataFrame) -> dict:
    """
    Detecta colunas automaticamente.
    Retorna mapeamento {col_original: campo_interno}.
    """
    mapeamento = {}
    for col in df.columns:
        if not col or str(col).strip() in ('', 'nan'):
            continue
        norm = _norm_key(col)
        if norm in COL_MAP:
            mapeamento[col] = COL_MAP[norm]
            continue
        # Busca parcial
        for key, campo in COL_MAP.items():
            if key in norm or norm in key:
                mapeamento[col] = campo
                break
    return mapeamento


def _parse_valor(val) -> float:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return 0.0
    s = str(val).strip().replace('R$','').replace('\xa0','').replace(' ','')
    if not s or s in ('-','—','nan',''):
        return 0.0
    if ',' in s and '.' in s:
        return float(s.replace('.','').replace(',','.')) or 0.0
    if ',' in s:
        return float(s.replace(',','.')) or 0.0
    try:
        return float(s) or 0.0
    except:
        return 0.0


def _clean(val, maxlen=300) -> Optional[str]:
    if val is None or str(val).strip() in ('','nan','None'):
        return None
    return str(val).strip()[:maxlen]


def _hash_row(data: dict) -> str:
    fields = '|'.join(str(data.get(k,'')) for k in [
        'nome','competencia','verba_codigo','verba_nome','valor',
        'salario_base','total_proventos','liquido',
    ])
    return hashlib.md5(fields.encode()).hexdigest()


def _extrair_mes_arquivo(filename: str) -> tuple:
    """Extrai mês do nome do arquivo. Ex: Folha_Janeiro.xlsx → (1, 'Janeiro', 2026-01)"""
    nome = (filename or '').lower()
    for ext in ['.xlsx','.xls','.csv']:
        nome = nome.replace(ext,'')
    partes = re.split(r'[_ \-]', nome)
    for parte in reversed(partes):
        if parte in MESES_MAP:
            num = MESES_MAP[parte]
            ano = datetime.now().year
            return num, MESES_NOME[num], f'{ano}-{num:02d}'
    for mes_nome, num in MESES_MAP.items():
        if mes_nome in nome:
            ano = datetime.now().year
            return num, MESES_NOME[num], f'{ano}-{num:02d}'
    return None, None, None


def _read_file(content: bytes, filename: str) -> pd.DataFrame:
    fname = (filename or '').lower()
    if fname.endswith('.csv'):
        for enc in ['utf-8-sig','latin-1','utf-8','cp1252']:
            try:
                return pd.read_csv(io.BytesIO(content), sep=None, engine='python',
                                   encoding=enc, dtype=str, encoding_errors='replace')
            except:
                continue
        raise ValueError("Não foi possível ler o CSV.")
    else:
        # Tenta ler excel — verifica se tem múltiplas abas
        xl = pd.ExcelFile(io.BytesIO(content))
        if len(xl.sheet_names) > 1:
            # Retorna a primeira aba com dados
            for sheet in xl.sheet_names:
                df = xl.parse(sheet, dtype=str)
                if len(df) > 0:
                    return df
        return pd.read_excel(io.BytesIO(content), dtype=str)


async def importar_folha(
    content: bytes,
    filename: str,
    competencia: Optional[str],  # YYYY-MM. Se None, extrai do nome
    empresa_id: Optional[uuid.UUID],
    db: AsyncSession,
) -> dict:
    """
    Importa planilha de folha de pagamento.
    Upsert por (empresa_id + hash do conteúdo da linha).
    Se competencia não fornecida, extrai do nome do arquivo.
    """
    # Detectar competência
    mes_num, mes_nome_str, competencia_auto = _extrair_mes_arquivo(filename)
    if not competencia:
        competencia = competencia_auto
    if not competencia:
        raise ValueError(
            "Não foi possível detectar o mês no nome do arquivo. "
            "Use o formato: Folha_MES.xlsx (ex: Folha_Janeiro.xlsx) "
            "ou informe a competência manualmente."
        )

    # Detectar mês/nome da competência
    if not mes_nome_str and competencia:
        try:
            mes_num = int(competencia.split('-')[1])
            mes_nome_str = MESES_NOME.get(mes_num)
        except:
            pass

    df = _read_file(content, filename)
    if df.empty:
        raise ValueError("Arquivo vazio ou não reconhecido.")

    # Mapear colunas
    mapeamento = _detect_columns(df)

    # Buscar hashes existentes para upsert
    existing_result = await db.execute(
        select(GenteFolha.id, GenteFolha.dados_hash)
        .where(and_(
            GenteFolha.empresa_id == empresa_id,
            GenteFolha.competencia == competencia,
        ))
    )
    existing_hashes = {r.dados_hash: r.id for r in existing_result if r.dados_hash}

    total = len(df)
    inserted = updated = skipped = errors = 0
    erros_msg = []
    to_insert = []
    to_update = []
    BATCH = 500

    for idx, row in df.iterrows():
        try:
            # Aplicar mapeamento
            mapped = {}
            for col, campo in mapeamento.items():
                mapped[campo] = row.get(col)

            nome = _clean(mapped.get('nome'), 300)
            if not nome:
                continue

            data = {
                'empresa_id':      empresa_id,
                'competencia':     competencia,
                'mes_nome':        mes_nome_str,
                'matricula':       _clean(mapped.get('matricula'), 50),
                'cpf':             _clean(mapped.get('cpf'), 14),
                'nome':            nome,
                'pis':             _clean(mapped.get('pis'), 20),
                'empresa':         _clean(mapped.get('empresa'), 200),
                'departamento':    _clean(mapped.get('departamento'), 200),
                'cargo':           _clean(mapped.get('cargo'), 200),
                'funcao':          _clean(mapped.get('funcao'), 200),
                'centro_custo':    _clean(mapped.get('centro_custo'), 200),
                'filial':          _clean(mapped.get('filial'), 200),
                'situacao':        _clean(mapped.get('situacao'), 50),
                'tipo_contrato':   _clean(mapped.get('tipo_contrato'), 100),
                'data_admissao':   _clean(mapped.get('data_admissao'), 20),
                'verba_codigo':    _clean(mapped.get('verba_codigo'), 50),
                'verba_nome':      _clean(mapped.get('verba_nome'), 200),
                'verba_tipo':      _clean(mapped.get('verba_tipo'), 20),
                'referencia':      _parse_valor(mapped.get('referencia')),
                'valor':           _parse_valor(mapped.get('valor')),
                'salario_base':    _parse_valor(mapped.get('salario_base')),
                'total_proventos': _parse_valor(mapped.get('total_proventos')),
                'total_descontos': _parse_valor(mapped.get('total_descontos')),
                'liquido':         _parse_valor(mapped.get('liquido')),
                'fgts':            _parse_valor(mapped.get('fgts')),
                'inss':            _parse_valor(mapped.get('inss')),
                'irrf':            _parse_valor(mapped.get('irrf')),
            }
            data['dados_hash'] = _hash_row(data)

            if data['dados_hash'] in existing_hashes:
                skipped += 1
            else:
                data['id'] = uuid.uuid4()
                data['importado_em'] = datetime.now(timezone.utc)
                data['atualizado_em'] = datetime.now(timezone.utc)
                to_insert.append(data)
                inserted += 1

            if len(to_insert) >= BATCH:
                db.add_all([GenteFolha(**r) for r in to_insert])
                await db.flush()
                to_insert = []

        except Exception as e:
            errors += 1
            erros_msg.append(f"Linha {idx+2}: {str(e)[:100]}")

    if to_insert:
        db.add_all([GenteFolha(**r) for r in to_insert])

    # Upsert colaboradores
    await _upsert_colaboradores(db, empresa_id, competencia)

    # Registrar importação
    db.add(GenteImportacao(
        empresa_id=empresa_id, tipo='folha',
        competencia=competencia, mes_nome=mes_nome_str,
        nome_arquivo=filename,
        total_linhas=total, inseridos=inserted,
        atualizados=updated, ignorados=skipped, erros=errors,
        colunas_detectadas=json.dumps(list(mapeamento.values()), ensure_ascii=False),
    ))

    await db.flush()

    return {
        'competencia': competencia,
        'mes_nome': mes_nome_str,
        'total_arquivo': total,
        'inseridos': inserted,
        'atualizados': updated,
        'ignorados': skipped,
        'erros': errors,
        'colunas_mapeadas': sorted(set(mapeamento.values())),
        'primeiros_erros': erros_msg[:5],
    }


async def _upsert_colaboradores(db, empresa_id, competencia):
    """Sincroniza tabela de colaboradores a partir das linhas importadas."""
    result = await db.execute(
        select(
            GenteFolha.matricula, GenteFolha.cpf, GenteFolha.nome,
            GenteFolha.empresa, GenteFolha.departamento, GenteFolha.cargo,
            GenteFolha.funcao, GenteFolha.centro_custo, GenteFolha.filial,
            GenteFolha.situacao, GenteFolha.tipo_contrato, GenteFolha.data_admissao,
            GenteFolha.salario_base,
        )
        .where(and_(
            GenteFolha.empresa_id == empresa_id,
            GenteFolha.competencia == competencia,
            GenteFolha.nome != None,
        ))
        .distinct()
    )
    rows = result.fetchall()
    for r in rows:
        if not r.nome:
            continue
        key_field = GenteFolha.matricula if r.matricula else GenteFolha.cpf
        key_val   = r.matricula or r.cpf
        if not key_val:
            continue
        existing = (await db.execute(
            select(GenteColaborador).where(and_(
                GenteColaborador.empresa_id == empresa_id,
                GenteColaborador.matricula == r.matricula if r.matricula else GenteColaborador.cpf == r.cpf,
            ))
        )).scalar_one_or_none()

        if existing:
            existing.situacao      = r.situacao or existing.situacao
            existing.cargo         = r.cargo or existing.cargo
            existing.departamento  = r.departamento or existing.departamento
            existing.salario_base  = r.salario_base or existing.salario_base
            existing.atualizado_em = datetime.now(timezone.utc)
        else:
            db.add(GenteColaborador(
                empresa_id=empresa_id,
                matricula=r.matricula, cpf=r.cpf, nome=r.nome,
                empresa=r.empresa, departamento=r.departamento,
                cargo=r.cargo, funcao=r.funcao, centro_custo=r.centro_custo,
                filial=r.filial, situacao=r.situacao,
                tipo_contrato=r.tipo_contrato, data_admissao=r.data_admissao,
                salario_base=r.salario_base or 0,
            ))


# ── Analytics ─────────────────────────────────────────────────

async def get_stats(
    db: AsyncSession,
    empresa_id: Optional[uuid.UUID],
    competencia: Optional[str] = None,
    departamento: Optional[str] = None,
    cargo: Optional[str] = None,
    filial: Optional[str] = None,
) -> dict:
    from sqlalchemy import desc

    filters = []
    if empresa_id:    filters.append(GenteFolha.empresa_id == empresa_id)
    if competencia:   filters.append(GenteFolha.competencia == competencia)
    if departamento:  filters.append(GenteFolha.departamento == departamento)
    if cargo:         filters.append(GenteFolha.cargo == cargo)
    if filial:        filters.append(GenteFolha.filial == filial)

    from sqlalchemy import and_
    base = and_(*filters) if filters else True

    # KPIs principais
    kpi = (await db.execute(
        select(
            func.count(GenteFolha.id.distinct()).label('total_linhas'),
            func.count(GenteFolha.matricula.distinct()).label('total_colab'),
            func.sum(GenteFolha.salario_base).label('massa_salarial'),
            func.sum(GenteFolha.total_proventos).label('total_proventos'),
            func.sum(GenteFolha.total_descontos).label('total_descontos'),
            func.sum(GenteFolha.liquido).label('total_liquido'),
            func.sum(GenteFolha.fgts).label('total_fgts'),
            func.sum(GenteFolha.inss).label('total_inss'),
            func.sum(GenteFolha.irrf).label('total_irrf'),
            func.avg(GenteFolha.salario_base).label('media_salario'),
        ).where(base)
    )).one()

    # Por departamento
    por_depto = (await db.execute(
        select(
            GenteFolha.departamento,
            func.count(GenteFolha.matricula.distinct()).label('colab'),
            func.sum(GenteFolha.salario_base).label('massa'),
            func.sum(GenteFolha.total_proventos).label('proventos'),
            func.sum(GenteFolha.liquido).label('liquido'),
        ).where(base)
        .group_by(GenteFolha.departamento)
        .order_by(desc(func.sum(GenteFolha.salario_base)))
        .limit(20)
    )).fetchall()

    # Por cargo
    por_cargo = (await db.execute(
        select(
            GenteFolha.cargo,
            func.count(GenteFolha.matricula.distinct()).label('colab'),
            func.sum(GenteFolha.salario_base).label('massa'),
            func.avg(GenteFolha.salario_base).label('media'),
        ).where(base)
        .group_by(GenteFolha.cargo)
        .order_by(desc(func.count(GenteFolha.matricula.distinct())))
        .limit(20)
    )).fetchall()

    # Por filial
    por_filial = (await db.execute(
        select(
            GenteFolha.filial,
            func.count(GenteFolha.matricula.distinct()).label('colab'),
            func.sum(GenteFolha.salario_base).label('massa'),
            func.sum(GenteFolha.liquido).label('liquido'),
        ).where(base)
        .group_by(GenteFolha.filial)
        .order_by(desc(func.sum(GenteFolha.salario_base)))
    )).fetchall()

    # Competências disponíveis
    competencias = (await db.execute(
        select(
            GenteFolha.competencia,
            GenteFolha.mes_nome,
            func.count(GenteFolha.matricula.distinct()).label('colab'),
            func.sum(GenteFolha.salario_base).label('massa'),
        )
        .where(GenteFolha.empresa_id == empresa_id)
        .group_by(GenteFolha.competencia, GenteFolha.mes_nome)
        .order_by(GenteFolha.competencia.desc())
    )).fetchall()

    # Filtros disponíveis
    deptos_list = [r[0] for r in (await db.execute(
        select(GenteFolha.departamento).where(base).distinct().order_by(GenteFolha.departamento)
    )) if r[0]]
    cargos_list = [r[0] for r in (await db.execute(
        select(GenteFolha.cargo).where(base).distinct().order_by(GenteFolha.cargo)
    )) if r[0]]
    filiais_list = [r[0] for r in (await db.execute(
        select(GenteFolha.filial).where(base).distinct().order_by(GenteFolha.filial)
    )) if r[0]]

    return {
        'kpis': {
            'total_colaboradores': int(kpi.total_colab or 0),
            'massa_salarial':     round(float(kpi.massa_salarial or 0), 2),
            'total_proventos':    round(float(kpi.total_proventos or 0), 2),
            'total_descontos':    round(float(kpi.total_descontos or 0), 2),
            'total_liquido':      round(float(kpi.total_liquido or 0), 2),
            'total_fgts':         round(float(kpi.total_fgts or 0), 2),
            'total_inss':         round(float(kpi.total_inss or 0), 2),
            'total_irrf':         round(float(kpi.total_irrf or 0), 2),
            'media_salario':      round(float(kpi.media_salario or 0), 2),
        },
        'por_departamento': [
            {'nome': r.departamento or 'N/A', 'colab': int(r.colab or 0),
             'massa': round(float(r.massa or 0), 2), 'proventos': round(float(r.proventos or 0), 2),
             'liquido': round(float(r.liquido or 0), 2)}
            for r in por_depto
        ],
        'por_cargo': [
            {'nome': r.cargo or 'N/A', 'colab': int(r.colab or 0),
             'massa': round(float(r.massa or 0), 2), 'media': round(float(r.media or 0), 2)}
            for r in por_cargo
        ],
        'por_filial': [
            {'nome': r.filial or 'N/A', 'colab': int(r.colab or 0),
             'massa': round(float(r.massa or 0), 2), 'liquido': round(float(r.liquido or 0), 2)}
            for r in por_filial
        ],
        'competencias': [
            {'competencia': r.competencia, 'mes_nome': r.mes_nome,
             'colab': int(r.colab or 0), 'massa': round(float(r.massa or 0), 2)}
            for r in competencias
        ],
        'filtros': {
            'departamentos': deptos_list,
            'cargos': cargos_list,
            'filiais': filiais_list,
        }
    }
