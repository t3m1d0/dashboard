# ============================================================
# app/routers/conferencia_folha.py
# ============================================================
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc, delete as sa_delete
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.conferencia_folha import (
    ConferenciaFolhaLinha, ConferenciaFolhaResumo, ConferenciaFolhaImportacao
)
from app.services.conferencia_folha_import import importar_conferencia, get_stats

router = APIRouter(prefix="/conferencia-folha", tags=["Conferencia Folha"])

MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@router.post("/import")
async def import_pdf(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(413, f"Máximo {settings.MAX_UPLOAD_SIZE_MB}MB")
    if not (file.filename or '').lower().endswith('.pdf'):
        raise HTTPException(400, "Apenas arquivos PDF são aceitos.")
    try:
        result = await importar_conferencia(content, file.filename or '', current_user.empresa_id, db)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erro ao processar: {str(e)}")
    return result


@router.get("/stats")
async def get_stats_endpoint(
    competencia: Optional[str] = Query(None),
    filial:      Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await get_stats(db, current_user.empresa_id, competencia=competencia, filial=filial)


@router.get("/linhas")
async def list_linhas(
    competencia: Optional[str] = Query(None),
    filial:      Optional[str] = Query(None),
    busca:       Optional[str] = Query(None),
    page:        int = Query(1, ge=1),
    page_size:   int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filters = [ConferenciaFolhaLinha.empresa_id == current_user.empresa_id]
    if competencia: filters.append(ConferenciaFolhaLinha.competencia == competencia)
    if filial:      filters.append(ConferenciaFolhaLinha.filial_nome == filial)
    if busca:       filters.append(ConferenciaFolhaLinha.nome.ilike(f'%{busca}%'))
    base = and_(*filters)

    total = (await db.execute(select(func.count(ConferenciaFolhaLinha.id)).where(base))).scalar()
    rows  = (await db.execute(
        select(ConferenciaFolhaLinha).where(base)
        .order_by(ConferenciaFolhaLinha.nome)
        .offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    return {
        'total': total, 'page': page,
        'items': [_row(r) for r in rows]
    }


@router.get("/competencias")
async def list_competencias(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(
            ConferenciaFolhaResumo.competencia,
            ConferenciaFolhaResumo.mes_nome,
            func.count(ConferenciaFolhaResumo.id).label('filiais'),
            func.sum(ConferenciaFolhaResumo.total_funcionarios).label('func'),
            func.sum(ConferenciaFolhaResumo.total_proventos).label('prov'),
            func.sum(ConferenciaFolhaResumo.total_liquido).label('liq'),
        )
        .where(ConferenciaFolhaResumo.empresa_id == current_user.empresa_id)
        .group_by(ConferenciaFolhaResumo.competencia, ConferenciaFolhaResumo.mes_nome)
        .order_by(ConferenciaFolhaResumo.competencia.desc())
    )
    return [
        {'competencia': r.competencia, 'mes_nome': r.mes_nome,
         'filiais': int(r.filiais or 0), 'funcionarios': int(r.func or 0),
         'proventos': round(float(r.prov or 0), 2), 'liquido': round(float(r.liq or 0), 2)}
        for r in result
    ]


@router.delete("/competencia/{competencia}")
async def delete_competencia(
    competencia: str,
    filial: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    f_l = [ConferenciaFolhaLinha.empresa_id == current_user.empresa_id, ConferenciaFolhaLinha.competencia == competencia]
    f_r = [ConferenciaFolhaResumo.empresa_id == current_user.empresa_id, ConferenciaFolhaResumo.competencia == competencia]
    if filial:
        f_l.append(ConferenciaFolhaLinha.filial_nome == filial)
        f_r.append(ConferenciaFolhaResumo.filial_nome == filial)
    r1 = await db.execute(sa_delete(ConferenciaFolhaLinha).where(and_(*f_l)))
    r2 = await db.execute(sa_delete(ConferenciaFolhaResumo).where(and_(*f_r)))
    await db.flush()
    return {'ok': True, 'linhas': r1.rowcount, 'resumos': r2.rowcount}


@router.get("/importacoes")
async def list_importacoes(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(ConferenciaFolhaImportacao)
        .where(ConferenciaFolhaImportacao.empresa_id == current_user.empresa_id)
        .order_by(desc(ConferenciaFolhaImportacao.importado_em)).limit(100)
    )
    return [
        {'id': str(r.id), 'filial_nome': r.filial_nome, 'competencia': r.competencia,
         'mes_nome': r.mes_nome, 'nome_arquivo': r.nome_arquivo,
         'inseridos': r.inseridos, 'atualizados': r.atualizados,
         'erros': r.erros, 'importado_em': r.importado_em.isoformat()}
        for r in result.scalars().all()
    ]


def _row(r: ConferenciaFolhaLinha) -> dict:
    return {
        'id': str(r.id), 'filial_nome': r.filial_nome, 'competencia': r.competencia,
        'nome': r.nome, 'dt_admissao': r.dt_admissao, 'cargo': r.cargo,
        'pix_cpf': r.pix_cpf, 'salario': r.salario, 'somar_sal': r.somar_sal,
        'liquidez_pct': r.liquidez_pct, 'liquidez_val': r.liquidez_val,
        'premiacao': r.premiacao, 'bonus': r.bonus, 'vlr_ser_pago': r.vlr_ser_pago,
        'sal_familia': r.sal_familia, 'ajuda_custo': r.ajuda_custo,
        'horas_extra': r.horas_extra, 'quebra_caixa': r.quebra_caixa,
        'total_proventos': r.total_proventos,
        'inss': r.inss, 'irrf': r.irrf, 'vt': r.vt, 'faltas': r.faltas,
        'desc_diversos': r.desc_diversos, 'vale_func': r.vale_func,
        'total_descontos': r.total_descontos, 'liquido': r.liquido,
    }
