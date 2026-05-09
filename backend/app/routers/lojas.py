# ============================================================
# app/routers/lojas.py — Cadastro de Lojas (CSC Muniz)
# ============================================================
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.loja import Loja
from app.services.loja_import import importar_lojas_excel, get_lojas_stats

router = APIRouter(prefix="/lojas", tags=["Lojas"])


@router.get("")
async def list_lojas(
    busca:  Optional[str] = Query(None),
    grupo:  Optional[str] = Query(None),
    uf:     Optional[str] = Query(None),
    ativa:  Optional[bool] = Query(True),
    page:   int = Query(1, ge=1),
    page_size: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filters = [Loja.empresa_id == current_user.empresa_id]
    if ativa is not None: filters.append(Loja.ativa == ativa)
    if grupo:  filters.append(Loja.grupo == grupo)
    if uf:     filters.append(Loja.uf    == uf)
    if busca:
        q = f'%{busca}%'
        filters.append(or_(
            Loja.nome.ilike(q),
            Loja.razao_social.ilike(q),
            Loja.cnpj_cpf.ilike(q),
            Loja.codigo.ilike(q),
        ))
    base = and_(*filters)

    total = (await db.execute(select(func.count(Loja.id)).where(base))).scalar()
    rows  = (await db.execute(
        select(Loja).where(base)
        .order_by(Loja.nome)
        .offset((page-1)*page_size).limit(page_size)
    )).scalars().all()

    return {
        'total': total, 'page': page,
        'items': [_serialize(r) for r in rows]
    }


@router.get("/grupos")
async def list_grupos(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Loja.grupo, func.count(Loja.id).label('n'))
        .where(and_(Loja.empresa_id == current_user.empresa_id, Loja.ativa == True))
        .group_by(Loja.grupo).order_by(func.count(Loja.id).desc())
    )
    return [{'grupo': r.grupo, 'n': int(r.n)} for r in result]


@router.get("/stats")
async def stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await get_lojas_stats(db, current_user.empresa_id)


@router.get("/{loja_id}")
async def get_loja(
    loja_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    res = await db.execute(
        select(Loja).where(and_(
            Loja.empresa_id == current_user.empresa_id,
            Loja.id == uuid.UUID(loja_id),
        ))
    )
    loja = res.scalar_one_or_none()
    if not loja: raise HTTPException(404, "Loja não encontrada")
    return _serialize(loja)


@router.post("")
async def create_loja(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Verificar código duplicado
    existing = (await db.execute(
        select(Loja).where(and_(
            Loja.empresa_id == current_user.empresa_id,
            Loja.codigo == str(data.get('codigo', '')),
        ))
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(409, f"Loja com código {data['codigo']} já existe.")

    from app.services.loja_import import _detectar_uf, _detectar_grupo
    nome  = str(data.get('nome', '')).strip()
    loja  = Loja(
        empresa_id=current_user.empresa_id,
        codigo=str(data.get('codigo', '')).strip(),
        nome=nome,
        razao_social=data.get('razao_social'),
        cnpj_cpf=data.get('cnpj_cpf'),
        uf=data.get('uf') or _detectar_uf(nome),
        cidade=data.get('cidade'),
        endereco=data.get('endereco'),
        grupo=data.get('grupo') or _detectar_grupo(nome),
        franqueado=data.get('franqueado'),
        tel=data.get('tel'),
        email=data.get('email'),
        responsavel=data.get('responsavel'),
        observacao=data.get('observacao'),
        ativa=data.get('ativa', True),
    )
    db.add(loja)
    await db.flush()
    return _serialize(loja)


@router.put("/{loja_id}")
async def update_loja(
    loja_id: str,
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    res = await db.execute(
        select(Loja).where(and_(
            Loja.empresa_id == current_user.empresa_id,
            Loja.id == uuid.UUID(loja_id),
        ))
    )
    loja = res.scalar_one_or_none()
    if not loja: raise HTTPException(404, "Loja não encontrada")

    for field in ['nome','razao_social','cnpj_cpf','uf','cidade','endereco',
                  'grupo','franqueado','tel','email','responsavel','observacao','ativa']:
        if field in data:
            setattr(loja, field, data[field])
    await db.flush()
    return _serialize(loja)


@router.delete("/{loja_id}")
async def deactivate_loja(
    loja_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    res = await db.execute(
        select(Loja).where(and_(
            Loja.empresa_id == current_user.empresa_id,
            Loja.id == uuid.UUID(loja_id),
        ))
    )
    loja = res.scalar_one_or_none()
    if not loja: raise HTTPException(404)
    loja.ativa = False
    await db.flush()
    return {'ok': True}


@router.post("/import")
async def import_excel(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    content = await file.read()
    try:
        result = await importar_lojas_excel(
            content, file.filename or '', current_user.empresa_id, db
        )
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erro: {str(e)}")
    return result


def _serialize(r: Loja) -> dict:
    return {
        'id': str(r.id), 'codigo': r.codigo, 'nome': r.nome,
        'razao_social': r.razao_social, 'cnpj_cpf': r.cnpj_cpf,
        'uf': r.uf, 'cidade': r.cidade, 'endereco': r.endereco,
        'grupo': r.grupo, 'subgrupo': r.subgrupo, 'franqueado': r.franqueado,
        'tel': r.tel, 'email': r.email, 'responsavel': r.responsavel,
        'observacao': r.observacao, 'ativa': r.ativa,
        'atualizado_em': r.atualizado_em.isoformat() if r.atualizado_em else None,
    }
