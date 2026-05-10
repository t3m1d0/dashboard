# ============================================================
# app/routers/gente.py — Módulo Gente e Gestão
# ============================================================
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc, delete as sa_delete
from typing import Optional
import uuid, os

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.gente import GenteFolha, GenteColaborador, GenteImportacao
from app.services.gente_import import importar_folha, get_stats

router = APIRouter(prefix="/gente", tags=["Gente e Gestão"])

MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

# ── Import ────────────────────────────────────────────────────
@router.post("/folha/import")
async def import_folha(
    file: UploadFile = File(...),
    competencia:  Optional[str] = Form(None),
    loja_codigo:  Optional[str] = Form(None),
    loja_nome:    Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(413, f"Máximo {settings.MAX_UPLOAD_SIZE_MB}MB")
    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in ('.xlsx', '.xls', '.csv'):
        raise HTTPException(400, "Use .xlsx, .xls ou .csv")
    try:
        resultado = await importar_folha(
            content, file.filename or '',
            competencia, current_user.empresa_id, db
        )
        if loja_codigo: resultado['loja_codigo'] = loja_codigo
        if loja_nome:   resultado['loja_nome']   = loja_nome
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erro: {str(e)}")
    return resultado


# ── Stats / Dashboard ─────────────────────────────────────────
@router.get("/folha/stats")
async def get_folha_stats(
    competencia:  Optional[str] = Query(None),
    departamento: Optional[str] = Query(None),
    cargo:        Optional[str] = Query(None),
    filial:       Optional[str] = Query(None),
    empresa:      Optional[str] = Query(None),  # múltiplas separadas por ||
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # empresa filter (múltiplas lojas)
    filial_final = filial or (empresa.split('||')[0] if empresa else None)
    return await get_stats(
        db, current_user.empresa_id,
        competencia=competencia, departamento=departamento,
        cargo=cargo, filial=filial_final,
    )


# ── Listagem de linhas da folha ───────────────────────────────
@router.get("/folha/itens")
async def list_folha_itens(
    competencia:  Optional[str] = Query(None),
    departamento: Optional[str] = Query(None),
    cargo:        Optional[str] = Query(None),
    filial:       Optional[str] = Query(None),
    busca:        Optional[str] = Query(None),
    page:         int = Query(1, ge=1),
    page_size:    int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filters = [GenteFolha.empresa_id == current_user.empresa_id]
    if competencia:  filters.append(GenteFolha.competencia  == competencia)
    if departamento: filters.append(GenteFolha.departamento == departamento)
    if cargo:        filters.append(GenteFolha.cargo        == cargo)
    if filial:       filters.append(GenteFolha.filial       == filial)
    if busca:        filters.append(GenteFolha.nome.ilike(f'%{busca}%'))
    base = and_(*filters)

    total = (await db.execute(select(func.count(GenteFolha.id)).where(base))).scalar()
    rows  = (await db.execute(
        select(GenteFolha).where(base)
        .order_by(GenteFolha.nome)
        .offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    return {
        'total': total, 'page': page,
        'items': [_serialize_folha(r) for r in rows]
    }


# ── Colaboradores ─────────────────────────────────────────────
@router.get("/colaboradores")
async def list_colaboradores(
    busca:   Optional[str] = Query(None),
    situacao: Optional[str] = Query(None),
    page:    int = Query(1, ge=1),
    page_size: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filters = [GenteColaborador.empresa_id == current_user.empresa_id]
    if situacao: filters.append(GenteColaborador.situacao == situacao)
    if busca:    filters.append(GenteColaborador.nome.ilike(f'%{busca}%'))
    base = and_(*filters)

    total = (await db.execute(select(func.count(GenteColaborador.id)).where(base))).scalar()
    rows  = (await db.execute(
        select(GenteColaborador).where(base)
        .order_by(GenteColaborador.nome)
        .offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    return {
        'total': total, 'page': page,
        'items': [
            {
                'id': str(r.id), 'matricula': r.matricula, 'cpf': r.cpf,
                'nome': r.nome, 'cargo': r.cargo, 'departamento': r.departamento,
                'filial': r.filial, 'empresa': r.empresa, 'situacao': r.situacao,
                'tipo_contrato': r.tipo_contrato, 'data_admissao': r.data_admissao,
                'salario_base': r.salario_base,
            }
            for r in rows
        ]
    }


# ── Competências importadas ───────────────────────────────────
@router.get("/folha/competencias")
async def list_competencias(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(
            GenteFolha.competencia,
            GenteFolha.mes_nome,
            func.count(GenteFolha.matricula.distinct()).label('colab'),
            func.sum(GenteFolha.salario_base).label('massa'),
            func.sum(GenteFolha.liquido).label('liquido'),
        )
        .where(GenteFolha.empresa_id == current_user.empresa_id)
        .group_by(GenteFolha.competencia, GenteFolha.mes_nome)
        .order_by(GenteFolha.competencia.desc())
    )
    return [
        {
            'competencia': r.competencia, 'mes_nome': r.mes_nome,
            'colab': int(r.colab or 0),
            'massa': round(float(r.massa or 0), 2),
            'liquido': round(float(r.liquido or 0), 2),
        }
        for r in result
    ]


# ── Delete competência ────────────────────────────────────────
@router.delete("/folha/competencia/{competencia}")
async def delete_competencia(
    competencia: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        sa_delete(GenteFolha).where(and_(
            GenteFolha.empresa_id == current_user.empresa_id,
            GenteFolha.competencia == competencia,
        ))
    )
    await db.flush()
    return {'ok': True, 'removidos': result.rowcount}


# ── Histórico de importações ──────────────────────────────────
@router.get("/importacoes")
async def list_importacoes(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(GenteImportacao)
        .where(GenteImportacao.empresa_id == current_user.empresa_id)
        .order_by(desc(GenteImportacao.importado_em))
        .limit(50)
    )
    rows = result.scalars().all()
    return [
        {
            'id': str(r.id), 'competencia': r.competencia, 'mes_nome': r.mes_nome,
            'nome_arquivo': r.nome_arquivo, 'total_linhas': r.total_linhas,
            'inseridos': r.inseridos, 'ignorados': r.ignorados, 'erros': r.erros,
            'importado_em': r.importado_em.isoformat(),
        }
        for r in rows
    ]


def _serialize_folha(r: GenteFolha) -> dict:
    return {
        'id': str(r.id), 'competencia': r.competencia, 'mes_nome': r.mes_nome,
        'matricula': r.matricula, 'cpf': r.cpf, 'nome': r.nome,
        'empresa': r.empresa, 'departamento': r.departamento,
        'cargo': r.cargo, 'filial': r.filial,
        'verba_codigo': r.verba_codigo, 'verba_nome': r.verba_nome,
        'referencia': r.referencia, 'valor': r.valor,
        'salario_base': r.salario_base, 'total_proventos': r.total_proventos,
        'total_descontos': r.total_descontos, 'liquido': r.liquido,
        'fgts': r.fgts, 'inss': r.inss, 'irrf': r.irrf,
        'situacao': r.situacao,
    }
