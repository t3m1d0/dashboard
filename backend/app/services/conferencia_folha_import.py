# ============================================================
# app/services/conferencia_folha_import.py
# Parser do PDF "Conferência de Folha" — Muniz Auto Center
#
# Formato do arquivo: Fechamento_MES.pdf
# Extração: pdftotext -raw (uma linha por colaborador)
#
# Estrutura dos dados por colaborador (linha RAW):
#   NOME  DD/MM/YYYY  CARGO  Sim|Não  LIQ%  LIQ_VAL  PREM  BONUS
#   VLR_PAGO  SAL_FAM  AJ_CUSTO  H_EX  QB_CAIXA  PER  OUT_CRED
#   TOT_PROV  INSS  IRRF  VT  FALT  DESC_DIV  H_FALT  VF  VF_OS
#   OUTROS  TOT_DEB  TOT_DESC  LIQUIDO  PIX
#
# O SALÁRIO vem na linha ANTERIOR à linha do colaborador.
# ============================================================
import hashlib, uuid, re, subprocess, os, tempfile
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, delete as sa_delete

from app.models.conferencia_folha import (
    ConferenciaFolhaLinha, ConferenciaFolhaResumo, ConferenciaFolhaImportacao
)

MESES_MAP = {
    'janeiro':1,'fevereiro':2,'março':3,'marco':3,'abril':4,
    'maio':5,'junho':6,'julho':7,'agosto':8,'setembro':9,
    'outubro':10,'novembro':11,'dezembro':12,
    'jan':1,'fev':2,'mar':3,'abr':4,'mai':5,'jun':6,
    'jul':7,'ago':8,'set':9,'out':10,'nov':11,'dez':12,
}
MESES_NOME = {
    1:'Janeiro',2:'Fevereiro',3:'Março',4:'Abril',5:'Maio',6:'Junho',
    7:'Julho',8:'Agosto',9:'Setembro',10:'Outubro',11:'Novembro',12:'Dezembro'
}
_NUM_RE  = re.compile(r'-?[\d]+(?:\.[\d]+)*,[\d]{2}')
_DATE_RE = re.compile(r'\d{2}/\d{2}/\d{4}')


def _extrair_mes_arquivo(filename: str) -> tuple:
    """
    Extrai mês do nome do arquivo.
    Formato esperado: Fechamento_MES.pdf
    Ex: Fechamento_Abril.pdf → (4, 'Abril', '2026-04')
    """
    nome = (filename or '').lower()
    for ext in ['.pdf', '.PDF']: nome = nome.replace(ext, '')
    partes = re.split(r'[_\-\s]', nome)
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


def _parse_brl(val) -> float:
    if not val: return 0.0
    s = str(val).strip().replace('R$','').replace('\xa0','').replace(' ','')
    if not s or s in ('-','—',''): return 0.0
    if ',' in s and '.' in s:
        return float(s.replace('.','').replace(',','.'))
    if ',' in s:
        return float(s.replace(',','.'))
    try: return float(s)
    except: return 0.0


def _extract_text_raw(pdf_bytes: bytes) -> str:
    """Extrai texto via pdftotext -raw (uma linha por parágrafo)."""
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        f.write(pdf_bytes)
        tmp = f.name
    try:
        result = subprocess.run(
            ['pdftotext', '-raw', tmp, '-'],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            raise ValueError(f"pdftotext falhou: {result.stderr[:200]}")
        return result.stdout
    finally:
        os.unlink(tmp)


def _parse_pdf(text: str, filename: str) -> dict:
    lines = [l.strip() for l in text.split('\n')]
    non_empty = [(i, l) for i, l in enumerate(lines) if l]

    # ── Cabeçalho ────────────────────────────────────────
    filial_nome = ''
    filial_cnpj = ''
    mes_num = ano = None

    for i, line in non_empty[:15]:
        # Nome da filial (primeira linha)
        if not filial_nome and len(line) > 3 and 'CNPJ' not in line and 'Tel:' not in line:
            filial_nome = line

        # CNPJ
        m = re.search(r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}', line)
        if m: filial_cnpj = m.group(0)

        # Mês/Ano: "Mês: Abril Ano: 2026"
        m = re.search(r'M[êe]s[:\s]+(\w+)\s+Ano[:\s]+(\d{4})', line, re.IGNORECASE)
        if m:
            ms = m.group(1).lower().strip()
            if ms in MESES_MAP:
                mes_num = MESES_MAP[ms]
                ano     = int(m.group(2))

    # Fallback: extrair do nome do arquivo
    if not mes_num:
        mes_num_f, mes_nome_f, comp_f = _extrair_mes_arquivo(filename)
        if mes_num_f:
            mes_num = mes_num_f
            ano     = int(comp_f.split('-')[0]) if comp_f else datetime.now().year

    if not mes_num:
        raise ValueError(
            "Não foi possível detectar o mês. "
            "Use o formato Fechamento_MES.pdf (ex: Fechamento_Abril.pdf)."
        )

    competencia  = f"{ano}-{mes_num:02d}"
    mes_nome_str = MESES_NOME.get(mes_num, str(mes_num))

    # ── Parsear colaboradores ─────────────────────────────
    # No modo -raw, o salário aparece na linha ANTES do colaborador
    colaboradores = []
    liquidez_loja = liquidez_pct = None
    totais_raw    = None
    salario_proximo = 0.0

    for i, line in non_empty:
        # Pular cabeçalho e headers de coluna
        if any(kw in line for kw in [
            'Conferência', 'NOME', 'ADMISSÃO', 'CARGO', 'SOMAR', 'LIQUIDEZ',
            'PREMIAÇÃO', 'PROVENTOS', 'DESCONTOS', 'Usuário:', 'Página',
            'VLR A SER', 'SAL.', 'FAMÍLIA', 'CUSTO', 'EXTRA', 'CAIXA',
            'CRÉDITOS', 'INSS', 'IRRF', 'FALTA', 'DÉBITOS', 'PIX',
            'Raz. Social', 'CNPJ', 'Tel:', 'End.', 'DT', 'PER.',
        ]):
            continue

        # Liquidez da loja
        if 'LIQUIDEZ DA LOJA' in line:
            continue
        if re.match(r'^R\$\s*[\d.,]+$', line):
            val = _parse_brl(line)
            if val > 1000:
                liquidez_loja = val
            continue

        # Percentual de liquidez (ex: "24,00 %")
        m_pct = re.match(r'^([\d.,]+)\s*%$', line)
        if m_pct:
            liquidez_pct = _parse_brl(m_pct.group(1))
            continue

        # Total líquido (ex: "TOTAL LÍQUIDO R$ 35.454,94")
        if 'TOTAL LÍQUIDO' in line or 'TOTAL LIQUIDO' in line:
            m = re.search(r'R\$\s*([\d.,]+)', line)
            if m: liquidez_loja = liquidez_loja or 0  # already set
            continue

        # Linha de totais (começa com número grande)
        if re.match(r'^[\d.,]+$', line) and ',' in line:
            # Pode ser salário da próxima linha ou total
            val = _parse_brl(line)
            # Totais têm muitos números na linha seguinte
            salario_proximo = val
            continue

        # Linha de totalizador multi-valor
        nums_in_line = _NUM_RE.findall(line)
        if len(nums_in_line) > 8 and not _DATE_RE.search(line) and not re.match(r'^[A-Za-z]', line):
            totais_raw = line
            continue

        # Linha de colaborador: contém data DD/MM/YYYY
        if _DATE_RE.search(line):
            parsed = _parse_colaborador_raw(line, salario_proximo)
            if parsed:
                colaboradores.append(parsed)
                salario_proximo = 0.0  # reset
            continue

    totais = _parse_totais_raw(totais_raw) if totais_raw else {}

    return {
        'filial_nome':   filial_nome,
        'filial_cnpj':   filial_cnpj,
        'competencia':   competencia,
        'mes_nome':      mes_nome_str,
        'ano':           ano,
        'colaboradores': colaboradores,
        'totais':        totais,
        'liquidez_loja': liquidez_loja,
        'liquidez_pct':  liquidez_pct,
    }


def _parse_colaborador_raw(line: str, salario: float) -> Optional[dict]:
    """
    Parseia linha do colaborador no formato -raw.
    Ex: "Antonio Carmelo Gonçalves 27/04/2026 Mecanico Não -204,51 0,00 ... 246,67 (43)98492-8753"
    """
    # Extrair data
    dates = _DATE_RE.findall(line)
    if not dates: return None
    dt = dates[0]

    pos_dt = line.find(dt)
    nome   = line[:pos_dt].strip()
    if not nome or len(nome) < 3: return None

    resto = line[pos_dt + len(dt):].strip()

    # Extrair cargo (texto antes de Sim/Não)
    sm = re.search(r'\b(Sim|Não|Nao)\b', resto, re.IGNORECASE)
    if sm:
        cargo     = resto[:sm.start()].strip()
        resto     = resto[sm.end():].strip()
        somar_sal = sm.group(1)
    else:
        # Tenta extrair cargo até o primeiro número
        m_cargo = re.match(r'^([^\d-]+?)\s+(-?[\d])', resto)
        cargo     = m_cargo.group(1).strip() if m_cargo else ''
        somar_sal = None
        if m_cargo: resto = resto[m_cargo.start(1) + len(m_cargo.group(1)):].strip()

    # Extrair PIX/CPF do final
    pix_cpf = None
    m_pix = re.search(
        r'(\(?\d{2}\)?\s*\d{4,5}[\s\-]\d{4}|\d{3}\.?\d{3}\.?\d{3}[\-\.]?\d{2}|\d{8,11})$',
        resto.strip()
    )
    if m_pix:
        pix_cpf = m_pix.group(0).strip()
        resto   = resto[:m_pix.start()].strip()

    # Todos os números da linha
    nums = [_parse_brl(n) for n in _NUM_RE.findall(resto)]

    def v(idx): return nums[idx] if idx < len(nums) else 0.0

    # Posições esperadas:
    # [0]=liquidez_val [1]=liquidez_pct [2]=premiacao [3]=bonus [4]=vlr_ser_pago
    # [5]=sal_familia [6]=ajuda_custo [7]=horas_extra [8]=quebra_caixa
    # [9]=periculosidade [10]=outros_creditos [11]=total_proventos
    # [12]=inss [13]=irrf [14]=vt [15]=faltas [16]=desc_diversos
    # [17]=horas_falta [18]=vale_func [19]=vale_func_os [20]=outros
    # [21]=total_descontos [22]=liquido
    return {
        'nome':           nome,
        'dt_admissao':    dt,
        'cargo':          cargo,
        'salario':        salario,
        'somar_sal':      somar_sal,
        'liquidez_val':   v(0),
        'liquidez_pct':   v(1),
        'premiacao':      v(2),
        'bonus':          v(3),
        'vlr_ser_pago':   v(4),
        'sal_familia':    v(5),
        'ajuda_custo':    v(6),
        'horas_extra':    v(7),
        'quebra_caixa':   v(8),
        'periculosidade': v(9),
        'outros_creditos':v(10),
        'total_proventos':v(11),
        'inss':           v(12),
        'irrf':           v(13),
        'vt':             v(14),
        'faltas':         v(15),
        'desc_diversos':  v(16),
        'horas_falta':    v(17),
        'vale_func':      v(18),
        'vale_func_os':   v(19),
        'outros_debitos': v(20),
        'total_descontos':v(21) if len(nums) > 21 else 0.0,
        'liquido':        v(22) if len(nums) > 22 else (v(11) - v(21) if len(nums) > 21 else 0.0),
        'pix_cpf':        pix_cpf,
    }


def _parse_totais_raw(line: str) -> dict:
    nums = [_parse_brl(n) for n in _NUM_RE.findall(line)]
    def v(i): return nums[i] if i < len(nums) else 0.0
    return {
        'total_salarios':  v(0),
        'total_liquidez':  v(1),
        'total_proventos': v(2),
        'total_inss':      v(4) if len(nums) > 4 else 0.0,
        'total_irrf':      v(5) if len(nums) > 5 else 0.0,
        'total_vt':        v(6) if len(nums) > 6 else 0.0,
        'total_descontos': nums[-3] if len(nums) > 3 else 0.0,
        'total_liquido':   nums[-1] if nums else 0.0,
        'total_vale_func': v(8) if len(nums) > 8 else 0.0,
    }


def _hash_colab(data: dict) -> str:
    fields = '|'.join(str(data.get(k,'')) for k in [
        'nome','competencia','filial_nome','total_proventos','liquido','inss'
    ])
    return hashlib.md5(fields.encode()).hexdigest()


# ── Import principal ──────────────────────────────────────────

async def importar_conferencia(
    pdf_bytes: bytes,
    filename: str,
    empresa_id,
    db: AsyncSession,
) -> dict:
    text = _extract_text_raw(pdf_bytes)
    data = _parse_pdf(text, filename)

    filial_nome  = data['filial_nome']
    competencia  = data['competencia']
    mes_nome_str = data['mes_nome']

    if not filial_nome:
        raise ValueError("Não foi possível identificar a filial no PDF.")

    # Buscar existentes para upsert
    existing_result = await db.execute(
        select(ConferenciaFolhaLinha.nome, ConferenciaFolhaLinha.dados_hash)
        .where(and_(
            ConferenciaFolhaLinha.empresa_id == empresa_id,
            ConferenciaFolhaLinha.filial_nome == filial_nome,
            ConferenciaFolhaLinha.competencia == competencia,
        ))
    )
    existing = {r.nome: r.dados_hash for r in existing_result}

    total    = len(data['colaboradores'])
    inserted = updated = skipped = errors = 0
    erros_msg = []
    to_insert = []

    for c in data['colaboradores']:
        try:
            row = {
                'empresa_id':    empresa_id,
                'filial_nome':   filial_nome,
                'filial_cnpj':   data['filial_cnpj'],
                'competencia':   competencia,
                'mes_nome':      mes_nome_str,
                'ano':           data['ano'],
                'nome':          c['nome'],
                'dt_admissao':   c.get('dt_admissao'),
                'cargo':         c.get('cargo'),
                'pix_cpf':       c.get('pix_cpf'),
                'salario':       c.get('salario', 0),
                'somar_sal':     c.get('somar_sal'),
                'liquidez_pct':  c.get('liquidez_pct', 0),
                'liquidez_val':  c.get('liquidez_val', 0),
                'premiacao':     c.get('premiacao', 0),
                'bonus':         c.get('bonus', 0),
                'vlr_ser_pago':  c.get('vlr_ser_pago', 0),
                'sal_familia':   c.get('sal_familia', 0),
                'ajuda_custo':   c.get('ajuda_custo', 0),
                'horas_extra':   c.get('horas_extra', 0),
                'quebra_caixa':  c.get('quebra_caixa', 0),
                'periculosidade':c.get('periculosidade', 0),
                'outros_creditos':c.get('outros_creditos', 0),
                'total_proventos':c.get('total_proventos', 0),
                'inss':          c.get('inss', 0),
                'irrf':          c.get('irrf', 0),
                'vt':            c.get('vt', 0),
                'faltas':        c.get('faltas', 0),
                'desc_diversos': c.get('desc_diversos', 0),
                'horas_falta':   c.get('horas_falta', 0),
                'vale_func':     c.get('vale_func', 0),
                'vale_func_os':  c.get('vale_func_os', 0),
                'outros_debitos':c.get('outros_debitos', 0),
                'total_descontos':c.get('total_descontos', 0),
                'liquido':       c.get('liquido', 0),
            }
            row['dados_hash'] = _hash_colab(row)
            nome = row['nome']

            if nome in existing:
                if existing[nome] != row['dados_hash']:
                    res = await db.execute(select(ConferenciaFolhaLinha).where(and_(
                        ConferenciaFolhaLinha.empresa_id == empresa_id,
                        ConferenciaFolhaLinha.filial_nome == filial_nome,
                        ConferenciaFolhaLinha.competencia == competencia,
                        ConferenciaFolhaLinha.nome == nome,
                    )))
                    obj = res.scalar_one_or_none()
                    if obj:
                        for k, vv in row.items(): setattr(obj, k, vv)
                        obj.atualizado_em = datetime.now(timezone.utc); updated += 1
                    else:
                        row['id'] = uuid.uuid4()
                        row['importado_em'] = row['atualizado_em'] = datetime.now(timezone.utc)
                        to_insert.append(row); inserted += 1
                else: skipped += 1
            else:
                row['id'] = uuid.uuid4()
                row['importado_em'] = row['atualizado_em'] = datetime.now(timezone.utc)
                to_insert.append(row); inserted += 1

        except Exception as e:
            errors += 1
            erros_msg.append(f"{c.get('nome','?')}: {str(e)[:100]}")

    if to_insert:
        db.add_all([ConferenciaFolhaLinha(**r) for r in to_insert])

    await _upsert_resumo(db, empresa_id, filial_nome, data)
    db.add(ConferenciaFolhaImportacao(
        empresa_id=empresa_id, filial_nome=filial_nome,
        competencia=competencia, mes_nome=mes_nome_str,
        nome_arquivo=filename, total_linhas=total,
        inseridos=inserted, atualizados=updated,
        ignorados=skipped, erros=errors,
    ))
    await db.flush()

    return {
        'filial':        filial_nome,
        'competencia':   competencia,
        'mes_nome':      mes_nome_str,
        'total_arquivo': total,
        'inseridos':     inserted,
        'atualizados':   updated,
        'ignorados':     skipped,
        'erros':         errors,
        'liquidez_loja': data.get('liquidez_loja', 0),
        'liquidez_pct':  data.get('liquidez_pct', 0),
        'primeiros_erros': erros_msg[:5],
    }


async def _upsert_resumo(db, empresa_id, filial_nome, data):
    res = await db.execute(select(ConferenciaFolhaResumo).where(and_(
        ConferenciaFolhaResumo.empresa_id == empresa_id,
        ConferenciaFolhaResumo.filial_nome == filial_nome,
        ConferenciaFolhaResumo.competencia == data['competencia'],
    )))
    obj = res.scalar_one_or_none()
    t   = data.get('totais', {})
    vals = {
        'filial_cnpj':        data['filial_cnpj'],
        'mes_nome':           data['mes_nome'],
        'ano':                data['ano'],
        'total_funcionarios': len(data['colaboradores']),
        'total_salarios':     t.get('total_salarios', 0),
        'total_liquidez':     t.get('total_liquidez', 0),
        'total_proventos':    t.get('total_proventos', 0),
        'total_inss':         t.get('total_inss', 0),
        'total_irrf':         t.get('total_irrf', 0),
        'total_vt':           t.get('total_vt', 0),
        'total_descontos':    t.get('total_descontos', 0),
        'total_liquido':      t.get('total_liquido', 0),
        'total_vale_func':    t.get('total_vale_func', 0),
        'liquidez_loja':      data.get('liquidez_loja', 0),
        'liquidez_pct':       data.get('liquidez_pct', 0),
    }
    if obj:
        for k, v in vals.items(): setattr(obj, k, v)
    else:
        db.add(ConferenciaFolhaResumo(
            id=uuid.uuid4(), empresa_id=empresa_id,
            filial_nome=filial_nome, competencia=data['competencia'], **vals
        ))


async def get_stats(db, empresa_id, competencia=None, filial=None):
    from sqlalchemy import desc

    filters_r = [ConferenciaFolhaResumo.empresa_id == empresa_id]
    filters_l = [ConferenciaFolhaLinha.empresa_id == empresa_id]
    if competencia:
        filters_r.append(ConferenciaFolhaResumo.competencia == competencia)
        filters_l.append(ConferenciaFolhaLinha.competencia == competencia)
    if filial:
        filters_r.append(ConferenciaFolhaResumo.filial_nome == filial)
        filters_l.append(ConferenciaFolhaLinha.filial_nome == filial)

    kpi = (await db.execute(select(
        func.sum(ConferenciaFolhaResumo.total_funcionarios).label('total_func'),
        func.sum(ConferenciaFolhaResumo.total_proventos).label('total_prov'),
        func.sum(ConferenciaFolhaResumo.total_descontos).label('total_desc'),
        func.sum(ConferenciaFolhaResumo.total_liquido).label('total_liq'),
        func.sum(ConferenciaFolhaResumo.total_inss).label('total_inss'),
        func.sum(ConferenciaFolhaResumo.total_irrf).label('total_irrf'),
        func.sum(ConferenciaFolhaResumo.total_vt).label('total_vt'),
        func.sum(ConferenciaFolhaResumo.total_vale_func).label('total_vf'),
        func.sum(ConferenciaFolhaResumo.liquidez_loja).label('liquidez_loja'),
    ).where(and_(*filters_r)))).one()

    por_filial = (await db.execute(select(
        ConferenciaFolhaResumo.filial_nome,
        ConferenciaFolhaResumo.total_funcionarios,
        ConferenciaFolhaResumo.total_proventos,
        ConferenciaFolhaResumo.total_liquido,
        ConferenciaFolhaResumo.total_descontos,
        ConferenciaFolhaResumo.total_inss,
        ConferenciaFolhaResumo.liquidez_loja,
        ConferenciaFolhaResumo.liquidez_pct,
    ).where(and_(*filters_r))
    .order_by(desc(ConferenciaFolhaResumo.total_proventos)))).fetchall()

    por_cargo = (await db.execute(select(
        ConferenciaFolhaLinha.cargo,
        func.count(ConferenciaFolhaLinha.id).label('n'),
        func.sum(ConferenciaFolhaLinha.total_proventos).label('proventos'),
        func.avg(ConferenciaFolhaLinha.total_proventos).label('media'),
        func.sum(ConferenciaFolhaLinha.liquido).label('liquido'),
    ).where(and_(*filters_l))
    .group_by(ConferenciaFolhaLinha.cargo)
    .order_by(desc(func.count(ConferenciaFolhaLinha.id)))
    .limit(15))).fetchall()

    competencias = (await db.execute(select(
        ConferenciaFolhaResumo.competencia,
        ConferenciaFolhaResumo.mes_nome,
        func.count(ConferenciaFolhaResumo.id).label('filiais'),
        func.sum(ConferenciaFolhaResumo.total_funcionarios).label('funcionarios'),
        func.sum(ConferenciaFolhaResumo.total_proventos).label('proventos'),
        func.sum(ConferenciaFolhaResumo.total_liquido).label('liquido'),
    ).where(ConferenciaFolhaResumo.empresa_id == empresa_id)
    .group_by(ConferenciaFolhaResumo.competencia, ConferenciaFolhaResumo.mes_nome)
    .order_by(ConferenciaFolhaResumo.competencia.desc()))).fetchall()

    filiais_list = [r[0] for r in (await db.execute(
        select(ConferenciaFolhaResumo.filial_nome)
        .where(ConferenciaFolhaResumo.empresa_id == empresa_id)
        .distinct().order_by(ConferenciaFolhaResumo.filial_nome)
    ))]

    return {
        'kpis': {
            'total_funcionarios': int(kpi.total_func or 0),
            'total_proventos':    round(float(kpi.total_prov or 0), 2),
            'total_descontos':    round(float(kpi.total_desc or 0), 2),
            'total_liquido':      round(float(kpi.total_liq or 0), 2),
            'total_inss':         round(float(kpi.total_inss or 0), 2),
            'total_irrf':         round(float(kpi.total_irrf or 0), 2),
            'total_vt':           round(float(kpi.total_vt or 0), 2),
            'total_vale_func':    round(float(kpi.total_vf or 0), 2),
            'liquidez_loja':      round(float(kpi.liquidez_loja or 0), 2),
        },
        'por_filial': [
            {
                'filial': r.filial_nome,
                'funcionarios': int(r.total_funcionarios or 0),
                'proventos': round(float(r.total_proventos or 0), 2),
                'liquido': round(float(r.total_liquido or 0), 2),
                'descontos': round(float(r.total_descontos or 0), 2),
                'inss': round(float(r.total_inss or 0), 2),
                'liquidez_loja': round(float(r.liquidez_loja or 0), 2),
                'liquidez_pct': round(float(r.liquidez_pct or 0), 2),
            } for r in por_filial
        ],
        'por_cargo': [
            {
                'cargo': r.cargo or 'N/A',
                'n': int(r.n or 0),
                'proventos': round(float(r.proventos or 0), 2),
                'media': round(float(r.media or 0), 2),
                'liquido': round(float(r.liquido or 0), 2),
            } for r in por_cargo
        ],
        'competencias': [
            {
                'competencia': r.competencia,
                'mes_nome': r.mes_nome,
                'filiais': int(r.filiais or 0),
                'funcionarios': int(r.funcionarios or 0),
                'proventos': round(float(r.proventos or 0), 2),
                'liquido': round(float(r.liquido or 0), 2),
            } for r in competencias
        ],
        'filtros': {'filiais': filiais_list},
    }
