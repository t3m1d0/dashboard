"""movimentacoes_produtos table

Revision ID: 0004_compras
Revises: 0003_sustentacao
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0004_compras'
down_revision = '0003_sustentacao'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('movimentacoes_produtos',
        sa.Column('id',               postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',       postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('id_filial',        sa.BigInteger(), nullable=False),
        sa.Column('nome_filial',      sa.String(300),  nullable=False),
        sa.Column('id_produto',       sa.BigInteger(), nullable=False),
        sa.Column('nome_produto',     sa.String(500),  nullable=False),
        sa.Column('grupo',            sa.String(200),  nullable=True),
        sa.Column('periodo',          sa.String(20),   nullable=True),
        sa.Column('estoque_anterior', sa.Float(),      nullable=True),
        sa.Column('custo_anterior',   sa.Float(),      nullable=True),
        sa.Column('qtd_entrada',      sa.Float(),      nullable=True),
        sa.Column('custo_entrada',    sa.Float(),      nullable=True),
        sa.Column('qtd_saida',        sa.Float(),      nullable=True),
        sa.Column('custo_saida',      sa.Float(),      nullable=True),
        sa.Column('estoque_final',    sa.Float(),      nullable=True),
        sa.Column('custo_final',      sa.Float(),      nullable=True),
        sa.Column('importado_em',     sa.DateTime(timezone=True), nullable=True),
        sa.Column('atualizado_em',    sa.DateTime(timezone=True), nullable=True),
        sa.Column('dados_hash',       sa.String(64),   nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_mp_empresa_filial_produto_periodo',
        'movimentacoes_produtos',
        ['empresa_id', 'id_filial', 'id_produto', 'periodo'], unique=True)
    op.create_index('ix_mp_grupo',   'movimentacoes_produtos', ['grupo'])
    op.create_index('ix_mp_periodo', 'movimentacoes_produtos', ['periodo'])
    op.create_index('ix_mp_empresa', 'movimentacoes_produtos', ['empresa_id'])


def downgrade() -> None:
    op.drop_index('ix_mp_empresa',   'movimentacoes_produtos')
    op.drop_index('ix_mp_periodo',   'movimentacoes_produtos')
    op.drop_index('ix_mp_grupo',     'movimentacoes_produtos')
    op.drop_index('ix_mp_empresa_filial_produto_periodo', 'movimentacoes_produtos')
    op.drop_table('movimentacoes_produtos')
