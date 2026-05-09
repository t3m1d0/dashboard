# ============================================================
# app/services/conferencia_folha_import.py
# Parser do PDF "Conferência de Folha" da Muniz Auto Center
# ============================================================
import hashlib, uuid, re, subprocess, os, tempfile
from datetime import datetime, timezone
from typing import Optional, List
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


def _parse_brl(val: str) -> float:
    """R$ 1.234,56  →  1234.56"""
    if not val: return 0.0
    s = str(val).strip().replace('R$','').replace('\xa0','').replace(' ','')
    if not s or s in ('-','—','',): return 0.0
    if ',' in s and '.' in s:
        return float(s.replace('.','').replace(',','.'))
    if ',' in s:
        return float(s.replace(',','.'))
    try: return float(s)
    except: return 0.0


def _extract_text(pdf_bytes: bytes) -> str:
    """Extrai texto do PDF com layout preservado via pdftotext."""
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        f.write(pdf_bytes)
        tmp = f.name
    try:
        result = subprocess.run(
            ['pdftotext', '-layout', tmp, '-'],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            raise ValueError(f"pdftotext falhou: {result.stderr[:200]}")
        return result.stdout
    finally:
        os.unlink(tmp)


def _parse_pdf(text: str) -> dict:
    """
    Parseia o texto extraído do PDF de Conferência de Folha.
    Retorna dict com filial, competencia, linhas e totais.
    """
    lines = text.split('\n')

    # ── Extrair cabeçalho ────────────────────────────────
    filial_nome = ''
    filial_cnpj = ''
    mes_num = None
    ano     = None

    for line in lines[:15]:
        stripped = line.strip()
        if not stripped: continue

        # Nome da filial (primeira linha não vazia)
        if not filial_nome and len(stripped) > 5 and 'CNPJ' not in stripped:
            filial_nome = stripped

        # CNPJ
        cnpj_m = re.search(r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}', stripped)
        if cnpj_m:
            filial_cnpj = cnpj_m.group(0)

        # Mês/Ano: "Mês: Abril Ano: 2026" ou "Competência: 04/2026"
        mes_m = re.search(r'M[êe]s[:\s]+(\w+)\s+Ano[:\s]+(\d{4})', stripped, re.IGNORECASE)
        if mes_m:
            mes_str = mes_m.group(1).lower().strip()
            if mes_str in MESES_MAP:
                mes_num = MESES_MAP[mes_str]
                ano     = int(mes_m.group(2))

        # Alternativa: "Competência: 04/2026"
        comp_m = re.search(r'Compet[êe]ncia[:\s]+(\d{1,2})/(\d{4})', stripped, re.IGNORECASE)
        if comp_m:
            mes_num = int(comp_m.group(1))
            ano     = int(comp_m.group(2))

    if not mes_num:
        # Tenta extrair do nome do arquivo (não disponível aqui — fallback)
        ano = datetime.now().year
        mes_num = datetime.now().month

    competencia  = f"{ano}-{mes_num:02d}"
    mes_nome_str = MESES_NOME.get(mes_num, str(mes_num))

    # ── Encontrar linha do header ─────────────────────────
    header_idx = None
    for i, line in enumerate(lines):
        if 'LIQUIDEZ' in line.upper() and 'PREMIA' in line.upper():
            header_idx = i
            break
        if 'TOTAL PROVENTOS' in line.upper():
            header_idx = i
            break

    if header_idx is None:
        raise ValueError("Não foi possível encontrar o cabeçalho das colunas no PDF.")

    # ── Parsear linhas de dados ───────────────────────────
    # O texto é extraído com layout, então cada colaborador ocupa 1 linha longa
    colaboradores = []
    totais_linha  = None
    liquidez_loja = None
    liquidez_pct  = None

    # Encontrar a área de dados: depois do header até os totais
    data_started = False
    for i, line in enumerate(lines):
        if i <= header_idx:
            continue

        stripped = line.strip()
        if not stripped:
            continue

        # Detectar linha de totais (começa com número grande ou "Usuário:")
        if stripped.startswith('Usuário:') or stripped.startswith('Data de Emissão:'):
            break

        # Liquidez da loja
        liq_m = re.search(r'LIQUIDEZ DA LOJA\s+(R\$\s*[\d.,]+)', stripped, re.IGNORECASE)
        if liq_m:
            liquidez_loja = _parse_brl(liq_m.group(1))
            pct_m = re.search(r'(\d+,\d+)\s*%', stripped)
            if pct_m:
                liquidez_pct = _parse_brl(pct_m.group(1))
            continue

        # Linha de total (muitos números consecutivos sem nome)
        nums_in_line = re.findall(r'[\d.,]+', stripped)
        if len(nums_in_line) > 10 and not re.match(r'[A-Za-záàâãéèêíïóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]', stripped):
            totais_linha = stripped
            continue

        # Linha de colaborador: começa com nome (letra maiúscula ou minúscula)
        if re.match(r'^[A-Za-záàâãéèêíïóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]', stripped):
            parsed = _parse_colaborador_line(stripped)
            if parsed:
                colaboradores.append(parsed)

    # ── Parsear totalizadores ─────────────────────────────
    totais = _parse_totais(totais_linha) if totais_linha else {}

    return {
        'filial_nome':   filial_nome.strip(),
        'filial_cnpj':   filial_cnpj,
        'competencia':   competencia,
        'mes_nome':      mes_nome_str,
        'ano':           ano,
        'colaboradores': colaboradores,
        'totais':        totais,
        'liquidez_loja': liquidez_loja,
        'liquidez_pct':  liquidez_pct,
    }


# Padrão de data dd/mm/yyyy
_DATE_RE = re.compile(r'\d{2}/\d{2}/\d{4}')
# Padrão de valor numérico BRL: 1.234,56 ou 266,67 ou 0,00
_NUM_RE  = re.compile(r'-?[\d]+(?:\.[\d]+)*,[\d]{2}')
# PIX/CPF no final da linha
_PIX_RE  = re.compile(r'[\(\d][\d\.\-\s\(\)]+$')


def _parse_colaborador_line(line: str) -> Optional[dict]:
    """
    Parseia uma linha de colaborador do PDF.
    Formato:
      NOME  DD/MM/YYYY  CARGO  SAL  SIM/NÃO  LIQ%  LIQ_VAL  PREM  BONUS
      VLR_PAGO  SAL_FAM  AJ_CUSTO  H_EX  QB_CAIXA  PER  OUT_CRED
      TOT_PROV  INSS  IRRF  VT  FALT  DESC_DIV  H_FALT  VF  VF_OS
      OUTROS  TOT_DEB  TOT_DESC  LIQUIDO  PIX
    """
    # Extrair data de admissão
    dates = _DATE_RE.findall(line)
    if not dates:
        return None
    dt_admissao = dates[0]

    # Extrair todos os valores numéricos BRL da linha
    # Mas primeiro removemos o nome e a data
    pos_date = line.find(dt_admissao)
    nome     = line[:pos_date].strip()
    resto    = line[pos_date + len(dt_admissao):].strip()

    if not nome or len(nome) < 3:
        return None

    # Extrair cargo (texto antes dos números)
    cargo_m = re.match(r'^([A-Za-záàâãéèêíïóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ\s\-\d]+?)\s{2,}', resto)
    cargo    = cargo_m.group(1).strip() if cargo_m else ''
    if cargo_m:
        resto = resto[cargo_m.end():]

    # Sim/Não
    somar_sal = None
    sm = re.search(r'\b(Sim|Não|Nao)\b', resto, re.IGNORECASE)
    if sm:
        somar_sal = sm.group(1)
        resto = resto[sm.end():].strip()

    # Extrair PIX/CPF do final da linha (se houver)
    pix_cpf = None
    pix_m = re.search(r'(\(?\d{2}\)?\s*\d{4,5}[\s\-]\d{4}|\d{3}\.?\d{3}\.?\d{3}[\-\.]?\d{2}|\d{8,11})$', resto.strip())
    if pix_m:
        pix_cpf = pix_m.group(0).strip()
        resto   = resto[:pix_m.start()].strip()

    # Extrair todos os valores numéricos restantes
    nums = _NUM_RE.findall(resto)
    vals = [_parse_brl(n) for n in nums]

    # Estrutura esperada de valores (posição → campo):
    # [0]=liquidez_val [1]=liquidez_pct [2]=premiacao [3]=bonus [4]=vlr_ser_pago
    # [5]=sal_familia [6]=ajuda_custo [7]=horas_extra [8]=quebra_caixa
    # [9]=periculosidade [10]=outros_creditos [11]=total_proventos
    # [12]=inss [13]=irrf [14]=vt [15]=faltas [16]=desc_diversos
    # [17]=horas_falta [18]=vale_func [19]=vale_func_os [20]=outros_debitos
    # [21]=total_descontos [22]=liquido
    # (Salário pode aparecer antes de liquidez_val)

    def v(idx, default=0.0):
        return vals[idx] if idx < len(vals) else default

    # O salário vem antes da data na linha original — buscar antes
    sal_m = _NUM_RE.search(line[:pos_date + len(dt_admissao) + len(cargo or '') + 20])
    salario = 0.0
    if sal_m:
        txt_before = line[:pos_date]
        sal_nums   = _NUM_RE.findall(txt_before + ' ' + (cargo or ''))
        if not sal_nums:
            # salario pode ser o primeiro numero depois do cargo
            pass

    # Remonta tentando identificar o salário do lado do cargo
    # Salário está na sequência: CARGO  SALARIO  Sim/Não
    sal_cargo_m = re.search(r'([\d]+(?:\.[\d]+)*,\d{2})\s+(?:Sim|Não|Nao)', line, re.IGNORECASE)
    if sal_cargo_m:
        salario = _parse_brl(sal_cargo_m.group(1))

    return {
        'nome':           nome.strip(),
        'dt_admissao':    dt_admissao,
        'cargo':          cargo.strip() if cargo else '',
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
        'total_descontos':v(21) if len(vals) > 21 else 0.0,
        'liquido':        v(22) if len(vals) > 22 else (v(11) - v(21) if len(vals) > 21 else 0.0),
        'pix_cpf':        pix_cpf,
    }


def _parse_totais(line: str) -> dict:
    nums = _NUM_RE.findall(line)
    vals = [_parse_brl(n) for n in nums]
    def v(i): return vals[i] if i < len(vals) else 0.0
    return {
        'total_salarios':  v(0),
        'total_liquidez':  v(1),
        'total_proventos': v(2),
        'total_inss':      v(4),
        'total_irrf':      v(5),
        'total_vt':        v(6),
        'total_descontos': v(7) if len(vals) > 10 else 0.0,
        'total_liquido':   vals[-1] if vals else 0.0,
        'total_vale_func': v(8) if len(vals) > 8 else 0.0,
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
    empresa_id: Optional[uuid.UUID],
    db: AsyncSession,
) -> dict:
    """
    Importa PDF de Conferência de Folha.
    Upsert por (empresa_id, filial_nome, competencia, nome).
    """
    text = _extract_text(pdf_bytes)
    data = _parse_pdf(text)

    filial_nome  = data['filial_nome']
    competencia  = data['competencia']
    mes_nome_str = data['mes_nome']
    ano          = data['ano']

    # Buscar existentes
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
                'ano':           ano,
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
                        for k, v in row.items(): setattr(obj, k, v)
                        obj.atualizado_em = datetime.now(timezone.utc)
                        updated += 1
                    else:
                        row['id'] = uuid.uuid4()
                        row['importado_em'] = row['atualizado_em'] = datetime.now(timezone.utc)
                        to_insert.append(row)
                        inserted += 1
                else:
                    skipped += 1
            else:
                row['id'] = uuid.uuid4()
                row['importado_em'] = row['atualizado_em'] = datetime.now(timezone.utc)
                to_insert.append(row)
                inserted += 1

        except Exception as e:
            errors += 1
            erros_msg.append(f"{c.get('nome','?')}: {str(e)[:100]}")

    if to_insert:
        db.add_all([ConferenciaFolhaLinha(**r) for r in to_insert])

    # Upsert resumo
    await _upsert_resumo(db, empresa_id, filial_nome, data)

    # Registrar importação
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
        'liquidez_loja': data.get('liquidez_loja'),
        'liquidez_pct':  data.get('liquidez_pct'),
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
        'liquidez_loja':      data.get('liquidez_loja'),
        'liquidez_pct':       data.get('liquidez_pct'),
    }
    if obj:
        for k, v in vals.items(): setattr(obj, k, v)
    else:
        db.add(ConferenciaFolhaResumo(
            id=uuid.uuid4(), empresa_id=empresa_id,
            filial_nome=filial_nome, competencia=data['competencia'],
            **vals
        ))


# ── Analytics ─────────────────────────────────────────────────

async def get_stats(db, empresa_id, competencia=None, filial=None):
    from sqlalchemy import desc, and_

    filters_r = [ConferenciaFolhaResumo.empresa_id == empresa_id]
    filters_l = [ConferenciaFolhaLinha.empresa_id == empresa_id]
    if competencia:
        filters_r.append(ConferenciaFolhaResumo.competencia == competencia)
        filters_l.append(ConferenciaFolhaLinha.competencia == competencia)
    if filial:
        filters_r.append(ConferenciaFolhaResumo.filial_nome == filial)
        filters_l.append(ConferenciaFolhaLinha.filial_nome == filial)

    # KPIs agregados dos resumos
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

    # Por filial
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

    # Por cargo (das linhas)
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

    # Competências disponíveis
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

    # Listas para filtros
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
