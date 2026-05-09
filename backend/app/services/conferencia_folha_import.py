# ============================================================
# app/services/conferencia_folha_import.py
# Parser do PDF "Conferência de Folha" — Muniz Auto Center
#
# COLUNAS (24 valores por colaborador, posição fixa):
# [00] liquidez_val    [01] liquidez_pct   [02] premiacao
# [03] bonus           [04] vlr_ser_pago   [05] sal_familia
# [06] ajuda_custo     [07] horas_extra    [08] quebra_caixa
# [09] periculosidade  [10] outros_creditos [11] total_proventos
# [12] inss            [13] irrf           [14] vt
# [15] faltas          [16] desc_diversos  [17] horas_falta
# [18] vale_func (Adiant. Salarial)        [19] vale_func_os
# [20] outros_debitos  [21] retencoes      [22] total_descontos
# [23] liquido
# ============================================================
import hashlib, uuid, re, subprocess, os, tempfile
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.models.conferencia_folha import (
    ConferenciaFolhaLinha, ConferenciaFolhaResumo, ConferenciaFolhaImportacao
)

MESES_MAP = {
    'janeiro':1,'fevereiro':2,'março':3,'marco':3,'abril':4,
    'maio':5,'junho':6,'julho':7,'agosto':8,'setembro':9,
    'outubro':10,'novembro':11,'dezembro':12,
}
MESES_NOME = {
    1:'Janeiro',2:'Fevereiro',3:'Março',4:'Abril',5:'Maio',6:'Junho',
    7:'Julho',8:'Agosto',9:'Setembro',10:'Outubro',11:'Novembro',12:'Dezembro'
}

NUM_RE  = re.compile(r'-?[\d]+(?:\.[\d]+)*,[\d]{2}')
DATE_RE = re.compile(r'\d{2}/\d{2}/\d{4}')

SKIP_KW = [
    'Conferência','NOME','ADMISSÃO','CARGO','SOMAR','LIQUIDEZ',
    'PREMIAÇÃO','PROVENTOS','DESCONTOS','Usuário:','Página',
    'VLR A SER','SAL.','FAMÍLIA','CUSTO','EXTRA','CAIXA',
    'CRÉDITOS','INSS','IRRF','FALTA','DÉBITOS','PIX',
    'Raz. Social','CNPJ','Tel:','End.','DT','PER.','OUTROS',
    'LIQUIDEZ DA LOJA','TOTAL LÍQUIDO','TOTAL LIQUIDO',
    'VALE FUNC',
]


def _brl(val) -> float:
    if val is None: return 0.0
    if isinstance(val, (int, float)):
        return float(val) if not (isinstance(val, float) and (val != val)) else 0.0
    s = str(val).strip().replace('R$','').replace('\xa0','').replace(' ','')
    if not s or s in ('-','—',''): return 0.0
    if ',' in s and '.' in s: return float(s.replace('.','').replace(',','.'))
    if ',' in s: return float(s.replace(',','.'))
    try: return float(s)
    except: return 0.0


def _extract_raw(pdf_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        f.write(pdf_bytes); tmp = f.name
    try:
        import shutil
        bin_ = shutil.which('pdftotext') or '/usr/bin/pdftotext'
        r = subprocess.run([bin_, '-raw', tmp, '-'], capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            raise ValueError(f"pdftotext: {r.stderr[:200]}")
        return r.stdout
    finally:
        os.unlink(tmp)


def _extrair_mes_arquivo(filename: str) -> tuple:
    nome = (filename or '').lower()
    for ext in ['.pdf']: nome = nome.replace(ext,'')
    for parte in reversed(re.split(r'[_\-\s]', nome)):
        if parte in MESES_MAP:
            num = MESES_MAP[parte]; ano = datetime.now().year
            return num, MESES_NOME[num], f'{ano}-{num:02d}'
    for k, num in MESES_MAP.items():
        if k in nome:
            ano = datetime.now().year
            return num, MESES_NOME[num], f'{ano}-{num:02d}'
    return None, None, None


def _parse_pdf(text: str, filename: str) -> dict:
    lines = [l.strip() for l in text.split('\n')]
    non_empty = [(i,l) for i,l in enumerate(lines) if l]

    # Cabeçalho
    filial_nome = filial_cnpj = ''
    mes_num = ano = None

    for i, line in non_empty[:15]:
        if not filial_nome and len(line) > 3 and 'CNPJ' not in line and 'Tel:' not in line and 'End.' not in line and 'Raz.' not in line:
            filial_nome = line
        m = re.search(r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}', line)
        if m: filial_cnpj = m.group(0)
        m2 = re.search(r'M[êe]s[:\s]+(\w+)\s+Ano[:\s]+(\d{4})', line, re.IGNORECASE)
        if m2:
            ms = m2.group(1).lower().strip()
            if ms in MESES_MAP:
                mes_num = MESES_MAP[ms]; ano = int(m2.group(2))

    if not mes_num:
        mes_num, _, comp = _extrair_mes_arquivo(filename)
        if comp: ano = int(comp.split('-')[0])

    if not mes_num:
        raise ValueError("Mês não detectado. Use Fechamento_MES.pdf (ex: Fechamento_Abril.pdf).")

    competencia  = f"{ano}-{mes_num:02d}"
    mes_nome_str = MESES_NOME.get(mes_num, str(mes_num))

    # Colaboradores
    colaboradores = []
    liquidez_loja = liquidez_pct = None
    totais_raw    = None
    sal_proximo   = 0.0

    for i, line in non_empty:
        if any(kw in line for kw in SKIP_KW): continue

        # Liquidez da loja (linha "R$ 197.376,21")
        if re.match(r'^R\$\s*[\d.,]+$', line):
            liquidez_loja = _brl(line); continue

        # Percentual  "24,00 %"
        m_pct = re.match(r'^([\d.,]+)\s*%$', line)
        if m_pct: liquidez_pct = _brl(m_pct.group(1)); continue

        # Salário da próxima linha (linha só com um número)
        if re.match(r'^[\d.,]+$', line) and ',' in line and not DATE_RE.search(line):
            sal_proximo = _brl(line); continue

        # Linha de totais (muitos números sem nome)
        nums_line = NUM_RE.findall(line)
        if len(nums_line) > 15 and not DATE_RE.search(line) and not re.match(r'^[A-Za-z]', line):
            totais_raw = line; continue

        # Colaborador: tem data e começa com letra
        if DATE_RE.search(line) and re.match(r'^[A-Za-záàâãéèêíïóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]', line):
            parsed = _parse_colab(line, sal_proximo)
            if parsed:
                colaboradores.append(parsed)
                sal_proximo = 0.0

    return {
        'filial_nome':   filial_nome,
        'filial_cnpj':   filial_cnpj,
        'competencia':   competencia,
        'mes_nome':      mes_nome_str,
        'ano':           ano,
        'colaboradores': colaboradores,
        'totais':        _parse_totais(totais_raw) if totais_raw else {},
        'liquidez_loja': liquidez_loja,
        'liquidez_pct':  liquidez_pct,
    }


def _parse_colab(line: str, salario: float) -> Optional[dict]:
    dates = DATE_RE.findall(line)
    if not dates: return None
    dt = dates[0]
    pos = line.find(dt)
    nome = line[:pos].strip()
    if not nome or len(nome) < 3: return None

    resto = line[pos + len(dt):].strip()

    # Cargo (texto antes de Sim/Não)
    sm = re.search(r'\b(Sim|Não|Nao)\b', resto, re.IGNORECASE)
    if sm:
        cargo    = resto[:sm.start()].strip()
        somar    = sm.group(1)
        resto    = resto[sm.end():].strip()
    else:
        m_c = re.match(r'^([^\d-]+?)\s+(-?[\d])', resto)
        cargo = m_c.group(1).strip() if m_c else ''
        somar = None
        if m_c: resto = resto[len(m_c.group(1)):].strip()

    # PIX/CPF no final
    pix = None
    m_p = re.search(r'(\(?\d{2}\)?\s*\d{4,5}[\s\-]\d{4}|\d{3}\.?\d{3}\.?\d{3}[\-\.]?\d{2}|\d{8,11})$', resto.strip())
    if m_p:
        pix  = m_p.group(0).strip()
        resto = resto[:m_p.start()].strip()

    nums = [_brl(n) for n in NUM_RE.findall(resto)]

    def v(i): return nums[i] if i < len(nums) else 0.0

    # 24 posições fixas conforme mapeamento
    total_descontos = v(22)
    # Se o parser não pegou o total, recalcula
    if total_descontos == 0 and len(nums) >= 22:
        total_descontos = v(12)+v(13)+v(14)+v(15)+v(16)+v(17)+v(18)+v(19)+v(20)+v(21)

    return {
        'nome':           nome,
        'dt_admissao':    dt,
        'cargo':          cargo,
        'salario':        salario,
        'somar_sal':      somar,
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
        'adiantamento_salarial': v(18),   # Vale Func. Empr. → Adiantamento Salarial
        'vale_func_os':   v(19),           # Vale Func. OS
        'outros_debitos': v(20),
        'retencoes':      v(21),           # col21 — sempre 0 neste relatório
        'total_descontos': total_descontos,
        'liquido':        v(23) if len(nums) > 23 else (v(11) - total_descontos),
        'pix_cpf':        pix,
    }


def _parse_totais(line: str) -> dict:
    # L76 (343.891,14 = total liquidez) vem separado
    # L77 tem 23 valores: salarios, liq_pct, premiacao, bonus, vlr_pago, sal_fam,
    #      ajuda, h_extra, qb_caixa, per, out_cred, tot_prov,
    #      inss, irrf, vt, faltas, desc_div, h_falt, adiant_sal, vf_os,
    #      outros, retencoes, tot_desc, liquido
    nums = [_brl(n) for n in NUM_RE.findall(line)]
    def v(i): return nums[i] if i < len(nums) else 0.0

    # A linha de totais tem 23 valores (sem liquidez_val que vem em L76)
    return {
        'total_salarios':        v(0),   # 20.799,40
        'total_premiacao':       v(1),   # 34.705,50
        'total_bonus':           v(2),   # 4.643,96
        'total_vlr_pago':        v(3),   # 48.863,91
        'total_sal_familia':     v(4),   # 0,00
        'total_ajuda_custo':     v(5),   # 500,00
        'total_horas_extra':     v(6),   # 0,00
        'total_quebra_caixa':    v(7),   # 60,00
        'total_periculosidade':  v(8),   # 600,00
        'total_outros_creditos': v(9),   # 0,00
        'total_proventos':       v(10),  # 50.023,91
        'total_inss':            v(11),  # 1.161,30
        'total_irrf':            v(12),  # 0,00
        'total_vt':              v(13),  # 240,00
        'total_faltas':          v(14),  # 0,00
        'total_desc_diversos':   v(15),  # 67,67
        'total_horas_falta':     v(16),  # 0,00
        'total_adiantamento':    v(17),  # 12.100,00
        'total_vale_func_os':    v(18),  # 1.000,00
        'total_outros_debitos':  v(19),  # 0,00
        'total_retencoes':       v(20),  # 0,00
        'total_descontos':       v(21),  # 14.568,97
        'total_liquido':         v(22),  # 35.454,94
    }


def _hash(data: dict) -> str:
    fields = '|'.join(str(data.get(k,'')) for k in [
        'nome','competencia','filial_nome','total_proventos','total_descontos','liquido','inss'
    ])
    return hashlib.md5(fields.encode()).hexdigest()


# ── Import principal ──────────────────────────────────────────

async def importar_conferencia(
    pdf_bytes: bytes,
    filename: str,
    empresa_id,
    db: AsyncSession,
    loja_override: str = None,
    loja_nome_override: str = None,
) -> dict:
    text = _extract_raw(pdf_bytes)
    data = _parse_pdf(text, filename)

    filial_nome  = loja_nome_override or loja_override or data['filial_nome']
    competencia  = data['competencia']
    mes_nome_str = data['mes_nome']

    if not filial_nome:
        raise ValueError("Filial não identificada. Selecione manualmente no campo acima.")

    existing_result = await db.execute(
        select(ConferenciaFolhaLinha.nome, ConferenciaFolhaLinha.dados_hash)
        .where(and_(
            ConferenciaFolhaLinha.empresa_id == empresa_id,
            ConferenciaFolhaLinha.filial_nome == filial_nome,
            ConferenciaFolhaLinha.competencia == competencia,
        ))
    )
    existing = {r.nome: r.dados_hash for r in existing_result}

    total = len(data['colaboradores'])
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
                'inss':           c.get('inss', 0),
                'irrf':           c.get('irrf', 0),
                'vt':             c.get('vt', 0),
                'faltas':         c.get('faltas', 0),
                'desc_diversos':  c.get('desc_diversos', 0),
                'horas_falta':    c.get('horas_falta', 0),
                'vale_func':      c.get('adiantamento_salarial', 0),
                'vale_func_os':   c.get('vale_func_os', 0),
                'outros_debitos': c.get('outros_debitos', 0),
                'total_descontos':c.get('total_descontos', 0),
                'liquido':        c.get('liquido', 0),
            }
            row['dados_hash'] = _hash(row)
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
        'filial': filial_nome, 'competencia': competencia, 'mes_nome': mes_nome_str,
        'total_arquivo': total, 'inseridos': inserted, 'atualizados': updated,
        'ignorados': skipped, 'erros': errors,
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
        'filial_cnpj': data['filial_cnpj'], 'mes_nome': data['mes_nome'], 'ano': data['ano'],
        'total_funcionarios': len(data['colaboradores']),
        'total_salarios':     t.get('total_salarios', 0),
        'total_liquidez':     t.get('total_premiacao', 0),   # campo reutilizado
        'total_proventos':    t.get('total_proventos', 0),
        'total_inss':         t.get('total_inss', 0),
        'total_irrf':         t.get('total_irrf', 0),
        'total_vt':           t.get('total_vt', 0),
        'total_descontos':    t.get('total_descontos', 0),
        'total_liquido':      t.get('total_liquido', 0),
        'total_vale_func':    t.get('total_adiantamento', 0),
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


# ── Analytics ─────────────────────────────────────────────────

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

    # KPIs dos resumos
    kpi = (await db.execute(select(
        func.sum(ConferenciaFolhaResumo.total_funcionarios).label('func'),
        func.sum(ConferenciaFolhaResumo.total_proventos).label('prov'),
        func.sum(ConferenciaFolhaResumo.total_descontos).label('desc'),
        func.sum(ConferenciaFolhaResumo.total_liquido).label('liq'),
        func.sum(ConferenciaFolhaResumo.total_inss).label('inss'),
        func.sum(ConferenciaFolhaResumo.total_irrf).label('irrf'),
        func.sum(ConferenciaFolhaResumo.total_vt).label('vt'),
        func.sum(ConferenciaFolhaResumo.total_vale_func).label('adiant'),
        func.sum(ConferenciaFolhaResumo.liquidez_loja).label('liq_loja'),
    ).where(and_(*filters_r)))).one()

    # Totais de cada desconto individualmente (das linhas)
    totais_desc = (await db.execute(select(
        func.sum(ConferenciaFolhaLinha.inss).label('inss'),
        func.sum(ConferenciaFolhaLinha.irrf).label('irrf'),
        func.sum(ConferenciaFolhaLinha.vt).label('vt'),
        func.sum(ConferenciaFolhaLinha.faltas).label('faltas'),
        func.sum(ConferenciaFolhaLinha.desc_diversos).label('desc_div'),
        func.sum(ConferenciaFolhaLinha.horas_falta).label('h_falta'),
        func.sum(ConferenciaFolhaLinha.vale_func).label('adiant_sal'),
        func.sum(ConferenciaFolhaLinha.vale_func_os).label('vf_os'),
        func.count(ConferenciaFolhaLinha.id.distinct()).filter(
            ConferenciaFolhaLinha.vale_func_os > 0
        ).label('qtd_vf_os'),
        func.sum(ConferenciaFolhaLinha.outros_debitos).label('outros'),
        func.sum(ConferenciaFolhaLinha.total_descontos).label('total_desc'),
        func.sum(ConferenciaFolhaLinha.total_proventos).label('total_prov'),
    ).where(and_(*filters_l)))).one()

    # Por filial
    por_filial = (await db.execute(select(
        ConferenciaFolhaResumo.filial_nome,
        ConferenciaFolhaResumo.total_funcionarios,
        ConferenciaFolhaResumo.total_proventos,
        ConferenciaFolhaResumo.total_descontos,
        ConferenciaFolhaResumo.total_liquido,
        ConferenciaFolhaResumo.total_inss,
        ConferenciaFolhaResumo.total_vale_func,
        ConferenciaFolhaResumo.liquidez_loja,
        ConferenciaFolhaResumo.liquidez_pct,
    ).where(and_(*filters_r))
    .order_by(desc(ConferenciaFolhaResumo.total_proventos)))).fetchall()

    # Por cargo
    por_cargo = (await db.execute(select(
        ConferenciaFolhaLinha.cargo,
        func.count(ConferenciaFolhaLinha.id).label('n'),
        func.sum(ConferenciaFolhaLinha.total_proventos).label('proventos'),
        func.sum(ConferenciaFolhaLinha.total_descontos).label('descontos'),
        func.sum(ConferenciaFolhaLinha.inss).label('inss'),
        func.sum(ConferenciaFolhaLinha.vale_func).label('adiant_sal'),
        func.avg(ConferenciaFolhaLinha.total_proventos).label('media_prov'),
        func.sum(ConferenciaFolhaLinha.liquido).label('liquido'),
    ).where(and_(*filters_l))
    .group_by(ConferenciaFolhaLinha.cargo)
    .order_by(desc(func.count(ConferenciaFolhaLinha.id)))
    .limit(20))).fetchall()

    # Competências
    competencias = (await db.execute(select(
        ConferenciaFolhaResumo.competencia,
        ConferenciaFolhaResumo.mes_nome,
        func.count(ConferenciaFolhaResumo.id).label('filiais'),
        func.sum(ConferenciaFolhaResumo.total_funcionarios).label('func'),
        func.sum(ConferenciaFolhaResumo.total_proventos).label('prov'),
        func.sum(ConferenciaFolhaResumo.total_liquido).label('liq'),
    ).where(ConferenciaFolhaResumo.empresa_id == empresa_id)
    .group_by(ConferenciaFolhaResumo.competencia, ConferenciaFolhaResumo.mes_nome)
    .order_by(ConferenciaFolhaResumo.competencia.desc()))).fetchall()

    filiais_list = [r[0] for r in (await db.execute(
        select(ConferenciaFolhaResumo.filial_nome)
        .where(ConferenciaFolhaResumo.empresa_id == empresa_id)
        .distinct().order_by(ConferenciaFolhaResumo.filial_nome)
    ))]

    def f(v): return round(float(v or 0), 2)

    return {
        'kpis': {
            'total_funcionarios': int(kpi.func or 0),
            'total_proventos':    f(kpi.prov),
            'total_descontos':    f(totais_desc.total_desc),
            'total_liquido':      f(kpi.liq),
            'liquidez_loja':      f(kpi.liq_loja),
            # Descontos detalhados
            'total_inss':         f(totais_desc.inss),
            'total_irrf':         f(totais_desc.irrf),
            'total_vt':           f(totais_desc.vt),
            'total_faltas':       f(totais_desc.faltas),
            'total_desc_diversos':f(totais_desc.desc_div),
            'total_horas_falta':  f(totais_desc.h_falta),
            'total_adiantamento': f(totais_desc.adiant_sal),
            'total_vale_func_os': f(totais_desc.vf_os),
            'qtd_vale_func_os':   int(totais_desc.qtd_vf_os or 0),
            'total_outros':       f(totais_desc.outros),
        },
        'por_filial': [
            {
                'filial': r.filial_nome,
                'funcionarios': int(r.total_funcionarios or 0),
                'proventos': f(r.total_proventos),
                'descontos': f(r.total_descontos),
                'liquido':   f(r.total_liquido),
                'inss':      f(r.total_inss),
                'adiantamento': f(r.total_vale_func),
                'liquidez_loja': f(r.liquidez_loja),
                'liquidez_pct':  f(r.liquidez_pct),
            } for r in por_filial
        ],
        'por_cargo': [
            {
                'cargo':     r.cargo or 'N/A',
                'n':         int(r.n or 0),
                'proventos': f(r.proventos),
                'descontos': f(r.descontos),
                'inss':      f(r.inss),
                'adiant_sal':f(r.adiant_sal),
                'media_prov':f(r.media_prov),
                'liquido':   f(r.liquido),
            } for r in por_cargo
        ],
        'competencias': [
            {
                'competencia': r.competencia, 'mes_nome': r.mes_nome,
                'filiais': int(r.filiais or 0), 'funcionarios': int(r.func or 0),
                'proventos': f(r.prov), 'liquido': f(r.liq),
            } for r in competencias
        ],
        'filtros': {'filiais': filiais_list},
    }
