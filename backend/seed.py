#!/usr/bin/env python3
# ============================================================
# seed.py — Popula o banco com dados iniciais
# ============================================================
import asyncio
import json
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.core.database import Base
from app.models import Empresa, Usuario, KPISnapshot
from app.core.security import hash_password
from datetime import datetime, timezone


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Tabelas criadas")

    async with SessionLocal() as db:
        # Empresa
        empresa = Empresa(nome="Grupo Franqueador", slug="grupo-franqueador", plano="enterprise")
        db.add(empresa)
        await db.flush()
        print(f"✅ Empresa criada: {empresa.nome} ({empresa.id})")

        # Admin user
        admin = Usuario(
            nome="Administrador TI",
            email="admin@muniz.com",
            senha_hash=hash_password("Admin@2025!"),
            cargo="Gestor de TI",
            role="admin",
            empresa_id=empresa.id,
        )
        db.add(admin)
        await db.flush()
        print(f"✅ Usuário admin criado: {admin.email}")
        print(f"   Senha inicial: Admin@2025!  ← TROQUE APÓS O PRIMEIRO LOGIN")

        # KPI Snapshot com dados padrão
        data_path = os.path.join(os.path.dirname(__file__), "data/default.json")
        if os.path.exists(data_path):
            with open(data_path) as f:
                default = json.load(f)
            snapshot = KPISnapshot(
                empresa_id=empresa.id,
                periodo="2025-04",
                mes="Abril",
                ano=2025,
                dados=default,
            )
            db.add(snapshot)
            print("✅ KPI snapshot inicial importado")

        await db.commit()
        print("\n🚀 Seed concluído com sucesso!")
        print(f"   Acesse: http://SEU_IP/api/docs")
        print(f"   Login: admin@muniz.com / Admin@2025!")


if __name__ == "__main__":
    asyncio.run(seed())
