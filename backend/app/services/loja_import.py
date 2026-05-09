# ============================================================
# app/services/loja_import.py
# Import e gestão do cadastro de lojas do CSC Muniz
# ============================================================
import io, uuid, re
from datetime import datetime, timezone
from typing import Optional
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.loja import Loja

# UFs válidas do Brasil
UFS_BR = {
    'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
    'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
}


def _detectar_uf(nome: str) -> Optional[str]:
    """Extrai UF do nome da loja. Ex: 'MUNIZ AUTO CENTER - CASCAVEL PR' → 'PR'"""
    if not nome: return None
    # Padrão: " XX " ou " XX)" ou "- CIDADE XX" no final
    m = re.search(r'\b([A-Z]{2})\b', nome.upper())
    if m and m.group(1) in UFS_BR:
        return m.group(1)
    # Tenta extrair de padrões como "BA (novo)" ou "SE (Consulta)"
    m2 = re.search(r'\b([A-Z]{2})\s*[\(\[]', nome.upper())
    if m2 and m2.group(1) in UFS_BR:
        return m2.group(1)
    return None


def _detectar_grupo(nome: str) -> str:
    """Classifica a loja em grupo."""
    n = str(nome).upper().strip()
    if 'MUNIZ AUTO CENTER' in n:
        return 'MUNIZ AUTO CENTER'
    if any(k in n for k in ['ADMINISTRATIVO', 'ADM', 'MBG', 'FOCUS ADM']):
        return 'ADMINISTRATIVO'
    if 'SUB MATRIZ' in n or 'SUBMATRIZ' in n:
        return 'SUB MATRIZ'
    if any(k in n for k in ['FRANCHISING', 'FRANQUIA', 'CRM', 'EMPREITA']):
        return 'OUTROS'
    return 'OUTROS'


def _clean(val, maxlen=300) -> Optional[str]:
    if val is None: return None
    s = str(val).strip().replace('\t', ' ')
    if s in ('', 'nan', 'None'): return None
    return s[:maxlen]


async def importar_lojas_excel(
    content: bytes,
    filename: str,
    empresa_id: Optional[uuid.UUID],
    db: AsyncSession,
) -> dict:
    """
    Importa planilha de lojas.
    Colunas esperadas: CÓDIGO, NOME, RAZAO SOCIAL, CPF/CNPJ
    Upsert por (empresa_id, codigo).
    """
    try:
        df = pd.read_excel(io.BytesIO(content), dtype=str)
    except Exception as e:
        raise ValueError(f"Erro ao ler arquivo: {e}")

    # Normalizar nomes de colunas
    df.columns = [str(c).strip().upper() for c in df.columns]

    # Mapear colunas flexivelmente
    col_map = {}
    for col in df.columns:
        c = col.upper()
        if 'CÓD' in c or 'COD' in c or c == 'CÓDIGO' or c == 'CODIGO': col_map['codigo'] = col
        elif 'NOME' in c and 'RAZAO' not in c and 'SOCIAL' not in c: col_map['nome'] = col
        elif 'RAZAO' in c or 'SOCIAL' in c: col_map['razao_social'] = col
        elif 'CPF' in c or 'CNPJ' in c: col_map['cnpj_cpf'] = col

    if 'codigo' not in col_map or 'nome' not in col_map:
        raise ValueError(f"Colunas obrigatórias (CÓDIGO e NOME) não encontradas. Encontradas: {list(df.columns)}")

    # Buscar existentes
    existing_result = await db.execute(
        select(Loja.codigo, Loja.id).where(Loja.empresa_id == empresa_id)
    )
    existing = {r.codigo: r.id for r in existing_result}

    total = len(df)
    inserted = updated = skipped = 0

    for _, row in df.iterrows():
        codigo = _clean(row.get(col_map['codigo']))
        nome   = _clean(row.get(col_map['nome']))
        if not codigo or not nome: continue

        razao_social = _clean(row.get(col_map.get('razao_social', ''), ''))
        cnpj_cpf     = _clean(row.get(col_map.get('cnpj_cpf', ''), ''))
        uf           = _detectar_uf(nome)
        grupo        = _detectar_grupo(nome)

        data = {
            'empresa_id':   empresa_id,
            'codigo':       codigo,
            'nome':         nome,
            'razao_social': razao_social,
            'cnpj_cpf':     cnpj_cpf,
            'uf':           uf,
            'grupo':        grupo,
            'ativa':        True,
        }

        if codigo in existing:
            res = await db.execute(select(Loja).where(Loja.id == existing[codigo]))
            obj = res.scalar_one_or_none()
            if obj:
                obj.nome         = nome
                obj.razao_social = razao_social
                obj.cnpj_cpf     = cnpj_cpf
                obj.uf           = uf
                obj.grupo        = grupo
                obj.atualizado_em = datetime.now(timezone.utc)
                updated += 1
        else:
            db.add(Loja(**data))
            inserted += 1

    await db.flush()

    return {
        'total_arquivo': total,
        'inseridas':     inserted,
        'atualizadas':   updated,
        'ignoradas':     skipped,
    }


async def get_lojas_stats(db: AsyncSession, empresa_id) -> dict:
    from sqlalchemy import func
    result = await db.execute(
        select(
            Loja.grupo,
            func.count(Loja.id).label('n'),
        )
        .where(and_(Loja.empresa_id == empresa_id, Loja.ativa == True))
        .group_by(Loja.grupo)
        .order_by(func.count(Loja.id).desc())
    )
    por_grupo = [{'grupo': r.grupo, 'n': int(r.n)} for r in result]

    ufs_result = await db.execute(
        select(Loja.uf, func.count(Loja.id).label('n'))
        .where(and_(Loja.empresa_id == empresa_id, Loja.ativa == True, Loja.uf != None))
        .group_by(Loja.uf).order_by(func.count(Loja.id).desc())
    )
    por_uf = [{'uf': r.uf, 'n': int(r.n)} for r in ufs_result]

    total = sum(g['n'] for g in por_grupo)
    return {'total': total, 'por_grupo': por_grupo, 'por_uf': por_uf}
