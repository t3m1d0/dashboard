"""add admissao situacao to gente_folha

Revision ID: 0007_gente_folha_cols
Revises: 0006_gente
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa

revision = '0007_gente_folha_cols'
down_revision = '0006_gente'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Safe add - only adds if column doesn't exist yet
    from sqlalchemy import inspect, engine_from_config
    from alembic import context
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_cols = [c['name'] for c in inspector.get_columns('gente_folha')]
    with op.batch_alter_table('gente_folha') as batch_op:
        if 'data_admissao' not in existing_cols:
            batch_op.add_column(sa.Column('data_admissao', sa.String(20), nullable=True))
        if 'situacao' not in existing_cols:
            batch_op.add_column(sa.Column('situacao', sa.String(50), nullable=True))
        if 'tipo_contrato' not in existing_cols:
            batch_op.add_column(sa.Column('tipo_contrato', sa.String(100), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('gente_folha') as batch_op:
        batch_op.drop_column('tipo_contrato')
        batch_op.drop_column('situacao')
        batch_op.drop_column('data_admissao')
