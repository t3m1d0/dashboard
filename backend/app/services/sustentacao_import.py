# ============================================================
# app/services/sustentacao_import.py
# Importação inteligente do CSV — upsert por cod_tarefa
# ============================================================
import hashlib
import pandas as pd
from datetime import datetime, timezone
from typing import Optional
import uuid
import io

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.sustentacao import ChamadoSustentacao


DATE_FORMATS = [
    "%d/%m/%Y %H:%M:%S",
    "%d/%m/%Y %H:%M",
    "%d/%m/%Y",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d",
]


def _parse_date(val) -> Optional[datetime]:
    if not val or str(val).strip() in ("", "nan", "NaN", "NaT"):
        return None
    s = str(val).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_id(val) -> Optional[int]:
    try:
        return int(float(str(val).strip()))
    except Exception:
        return None


def _extract_nome(val: Optional[str]) -> Optional[str]:
    """Extrai nome limpo de strings como '5776 - sabrina.paranagua - Sabrina Sabino da Silva'"""
    if not val or str(val).strip() in ("", "nan"):
        return None
    s = str(val).strip()
    parts = s.split(" - ")
    if len(parts) >= 3:
        return parts[-1].strip()
    if len(parts) == 2:
        return parts[-1].strip()
    return s


def _extract_origem(val: Optional[str]) -> Optional[str]:
    """Extrai nome da unidade/franquia de '777004 - MUNIZ AUTO CENTER - PARANAGUA'"""
    if not val or str(val).strip() in ("", "nan"):
        return None
    s = str(val).strip()
    parts = s.split(" - ")
    if len(parts) >= 2:
        return " - ".join(parts[1:]).strip()
    return s


def _hash_row(row: dict) -> str:
    """Hash MD5 dos campos relevantes para detectar alterações."""
    key_fields = [
        str(row.get("situacao", "")),
        str(row.get("data_conclusao", "")),
        str(row.get("data_indeferimento", "")),
        str(row.get("data_aceitacao", "")),
        str(row.get("usuario_responsavel", "")),
    ]
    return hashlib.md5("|".join(key_fields).encode()).hexdigest()


def _read_csv(content: bytes) -> pd.DataFrame:
    """Lê o CSV com fallback de encoding."""
    for enc in ["latin-1", "utf-8-sig", "utf-8", "cp1252"]:
        try:
            df = pd.read_csv(
                io.BytesIO(content),
                sep=";",
                encoding=enc,
                encoding_errors="replace",
                dtype=str,
            )
            # Remove coluna unnamed
            df = df.loc[:, ~df.columns.str.startswith("Unnamed")]
            return df
        except Exception:
            continue
    raise ValueError("Não foi possível ler o arquivo CSV.")


async def importar_csv(
    content: bytes,
    empresa_id: Optional[uuid.UUID],
    db: AsyncSession,
) -> dict:
    """
    Importa chamados do CSV com upsert inteligente.
    - Novos registros → INSERT
    - Existentes com dados alterados → UPDATE
    - Existentes sem alteração → SKIP
    Retorna estatísticas do processo.
    """
    df = _read_csv(content)

    # Validar colunas obrigatórias
    required = {"CÓD TAREFA", "ASSUNTO", "SITUAÇÃO", "TÍTULO DO CHAMADO"}
    missing  = required - set(df.columns)
    if missing:
        raise ValueError(f"Colunas obrigatórias ausentes: {missing}. Colunas encontradas: {list(df.columns)}")

    total     = len(df)
    inserted  = 0
    updated   = 0
    skipped   = 0
    errors    = []

    # Buscar todos os cod_tarefa existentes da empresa de uma vez (batch)
    existing_result = await db.execute(
        select(ChamadoSustentacao.cod_tarefa, ChamadoSustentacao.id, ChamadoSustentacao.dados_hash)
        .where(ChamadoSustentacao.empresa_id == empresa_id)
    )
    existing = {row.cod_tarefa: (row.id, row.dados_hash) for row in existing_result}

    # Processar em batches de 500 para não travar o DB
    BATCH = 500
    rows_to_insert = []
    rows_to_update = []

    for idx, row in df.iterrows():
        try:
            cod_tarefa = _parse_id(row.get("CÓD TAREFA"))
            if not cod_tarefa:
                continue

            cod_chamado = _parse_id(row.get("CÓD CHAMADO")) or 0

            data = {
                "cod_tarefa":          cod_tarefa,
                "cod_chamado":         cod_chamado,
                "empresa_id":          empresa_id,
                "descricao_tarefa":    str(row.get("DESCRIÇÃO DA TAREFA", "") or "")[:2000] or None,
                "assunto":             str(row.get("ASSUNTO", "")).strip()[:300],
                "setor":               str(row.get("SETOR", "") or "").strip()[:200] or None,
                "titulo_chamado":      str(row.get("TÍTULO DO CHAMADO", "")).strip()[:500],
                "usuario_solicitante": _extract_nome(row.get("USUÁRIO SOLICITANTE")),
                "origem":              _extract_origem(row.get("ORIGEM")),
                "situacao":            str(row.get("SITUAÇÃO", "")).strip(),
                "usuario_responsavel": _extract_nome(row.get("USUÁRIO QUE ACEITOU A TAREFA")),
                "data_disponibilidade": _parse_date(row.get("DATA DA DISPONIBILIDADE")),
                "data_aceitacao":       _parse_date(row.get("DATA DA ACEITAÇÃO")),
                "data_conclusao":       _parse_date(row.get("DATA DA CONCLUSÃO")),
                "data_indeferimento":   _parse_date(row.get("DATA DO INDEFERIMENTO")),
            }
            data["dados_hash"] = _hash_row(data)

            if cod_tarefa in existing:
                rec_id, old_hash = existing[cod_tarefa]
                if old_hash != data["dados_hash"]:
                    data["id"]             = rec_id
                    data["atualizado_em"]  = datetime.now(timezone.utc)
                    rows_to_update.append(data)
                    updated += 1
                else:
                    skipped += 1
            else:
                data["id"]           = uuid.uuid4()
                data["importado_em"] = datetime.now(timezone.utc)
                data["atualizado_em"] = datetime.now(timezone.utc)
                rows_to_insert.append(data)
                inserted += 1

            # Flush em batches
            if len(rows_to_insert) >= BATCH:
                await _batch_insert(db, rows_to_insert)
                rows_to_insert = []
            if len(rows_to_update) >= BATCH:
                await _batch_update(db, rows_to_update)
                rows_to_update = []

        except Exception as e:
            errors.append(f"Linha {idx + 2}: {str(e)[:100]}")

    # Flush restantes
    if rows_to_insert:
        await _batch_insert(db, rows_to_insert)
    if rows_to_update:
        await _batch_update(db, rows_to_update)

    await db.flush()

    return {
        "total_arquivo":  total,
        "inseridos":      inserted,
        "atualizados":    updated,
        "ignorados":      skipped,
        "erros":          len(errors),
        "primeiros_erros": errors[:5],
    }


async def _batch_insert(db: AsyncSession, rows: list):
    if not rows:
        return
    db.add_all([ChamadoSustentacao(**r) for r in rows])


async def _batch_update(db: AsyncSession, rows: list):
    for r in rows:
        rec_id = r.pop("id")
        result = await db.execute(
            select(ChamadoSustentacao).where(ChamadoSustentacao.id == rec_id)
        )
        obj = result.scalar_one_or_none()
        if obj:
            for k, v in r.items():
                setattr(obj, k, v)
        r["id"] = rec_id  # restore


# ── Queries analíticas para o dashboard ──────────────────────

async def get_stats(
    db: AsyncSession,
    empresa_id: Optional[uuid.UUID],
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
) -> dict:
    """Estatísticas completas para o dashboard de sustentação."""
    from sqlalchemy import extract, desc

    base_filters = []
    if empresa_id:
        base_filters.append(ChamadoSustentacao.empresa_id == empresa_id)

    # Filtro de período
    if data_inicio and data_fim:
        di = datetime.strptime(data_inicio, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        df_ = datetime.strptime(data_fim,   "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        base_filters.append(ChamadoSustentacao.data_disponibilidade >= di)
        base_filters.append(ChamadoSustentacao.data_disponibilidade <= df_)
    elif ano:
        base_filters.append(extract("year", ChamadoSustentacao.data_disponibilidade) == ano)
        if mes:
            base_filters.append(extract("month", ChamadoSustentacao.data_disponibilidade) == mes)

    from sqlalchemy import and_
    base = and_(*base_filters) if base_filters else True

    # Totais por situação
    sit_result = await db.execute(
        select(ChamadoSustentacao.situacao, func.count(ChamadoSustentacao.id).label("total"))
        .where(base)
        .group_by(ChamadoSustentacao.situacao)
    )
    por_situacao = {r.situacao: r.total for r in sit_result}

    total       = sum(por_situacao.values())
    concluidos  = por_situacao.get("Concluído", 0)
    indeferidos = por_situacao.get("Indeferido", 0)
    em_andamento = por_situacao.get("Em andamento", 0)
    pendentes   = por_situacao.get("Pendente", 0)

    # Top assuntos
    assunto_result = await db.execute(
        select(ChamadoSustentacao.assunto, func.count(ChamadoSustentacao.id).label("total"))
        .where(base)
        .group_by(ChamadoSustentacao.assunto)
        .order_by(desc(func.count(ChamadoSustentacao.id)))
        .limit(15)
    )
    top_assuntos = [
        {"rank": i+1, "assunto": r.assunto, "total": r.total, "tendencia": "stable"}
        for i, r in enumerate(assunto_result)
    ]

    # Por responsável (técnico)
    resp_result = await db.execute(
        select(ChamadoSustentacao.usuario_responsavel, func.count(ChamadoSustentacao.id).label("total"))
        .where(and_(base, ChamadoSustentacao.usuario_responsavel.isnot(None)))
        .group_by(ChamadoSustentacao.usuario_responsavel)
        .order_by(desc(func.count(ChamadoSustentacao.id)))
        .limit(20)
    )
    por_responsavel = [{"nome": r.usuario_responsavel, "total": r.total} for r in resp_result]

    # Por origem (franquia)
    orig_result = await db.execute(
        select(ChamadoSustentacao.origem, func.count(ChamadoSustentacao.id).label("total"))
        .where(and_(base, ChamadoSustentacao.origem.isnot(None)))
        .group_by(ChamadoSustentacao.origem)
        .order_by(desc(func.count(ChamadoSustentacao.id)))
        .limit(15)
    )
    por_origem = [{"origem": r.origem, "total": r.total} for r in orig_result]

    # Evolução semanal (últimas 4 semanas dentro do filtro)
    semanas_result = await db.execute(text("""
        SELECT
            TO_CHAR(DATE_TRUNC('week', data_disponibilidade), 'DD/MM') as semana,
            COUNT(*) FILTER (WHERE situacao NOT IN ('Concluído','Indeferido')) as abertos,
            COUNT(*) FILTER (WHERE situacao IN ('Concluído','Indeferido')) as resolvidos
        FROM chamados_sustentacao
        WHERE data_disponibilidade IS NOT NULL
        GROUP BY DATE_TRUNC('week', data_disponibilidade)
        ORDER BY DATE_TRUNC('week', data_disponibilidade) DESC
        LIMIT 4
    """))
    semanas_raw = list(reversed(semanas_result.fetchall()))
    evolucao = {
        "semanas":   [r[0] for r in semanas_raw],
        "abertos":   [r[1] for r in semanas_raw],
        "resolvidos": [r[2] for r in semanas_raw],
        "backlog":   [0] * len(semanas_raw),
    }

    # Tempo médio de resolução (em horas)
    tempo_result = await db.execute(
        select(func.avg(
            func.extract("epoch", ChamadoSustentacao.data_conclusao - ChamadoSustentacao.data_disponibilidade) / 3600
        ))
        .where(and_(base, ChamadoSustentacao.data_conclusao.isnot(None)))
    )
    tempo_medio_h = tempo_result.scalar()

    # Taxa de conclusão
    taxa_conclusao = round(concluidos / total * 100, 1) if total > 0 else 0

    # Últimos filtros disponíveis
    assuntos_list = await db.execute(
        select(ChamadoSustentacao.assunto).distinct()
        .where(base).order_by(ChamadoSustentacao.assunto).limit(100)
    )
    responsaveis_list = await db.execute(
        select(ChamadoSustentacao.usuario_responsavel).distinct()
        .where(and_(base, ChamadoSustentacao.usuario_responsavel.isnot(None)))
        .order_by(ChamadoSustentacao.usuario_responsavel).limit(100)
    )
    origens_list = await db.execute(
        select(ChamadoSustentacao.origem).distinct()
        .where(and_(base, ChamadoSustentacao.origem.isnot(None)))
        .order_by(ChamadoSustentacao.origem).limit(100)
    )

    return {
        "total":          total,
        "concluidos":     concluidos,
        "indeferidos":    indeferidos,
        "em_andamento":   em_andamento,
        "pendentes":      pendentes,
        "taxa_conclusao": taxa_conclusao,
        "tempo_medio_resolucao_horas": round(tempo_medio_h, 1) if tempo_medio_h else None,
        "top_assuntos":   top_assuntos,
        "por_responsavel": por_responsavel,
        "por_origem":     por_origem,
        "evolucao_semanal": evolucao,
        "por_situacao":   por_situacao,
        "filtros": {
            "assuntos":      [r[0] for r in assuntos_list if r[0]],
            "responsaveis":  [r[0] for r in responsaveis_list if r[0]],
            "origens":       [r[0] for r in origens_list if r[0]],
        }
    }
