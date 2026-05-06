"""chamados_sustentacao table

Revision ID: 0003_sustentacao
Revises: 0002_redmine
Create Date: 2026-05-06
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0003_sustentacao'
down_revision = '0002_redmine'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('chamados_sustentacao',
        sa.Column('id',                   postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',           postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('cod_tarefa',           sa.BigInteger(), nullable=False),
        sa.Column('cod_chamado',          sa.BigInteger(), nullable=False),
        sa.Column('descricao_tarefa',     sa.Text(), nullable=True),
        sa.Column('assunto',              sa.String(300), nullable=False),
        sa.Column('setor',                sa.String(200), nullable=True),
        sa.Column('titulo_chamado',       sa.String(500), nullable=False),
        sa.Column('usuario_solicitante',  sa.String(300), nullable=True),
        sa.Column('origem',               sa.String(300), nullable=True),
        sa.Column('situacao',             sa.String(50),  nullable=False),
        sa.Column('usuario_responsavel',  sa.String(300), nullable=True),
        sa.Column('data_disponibilidade', sa.DateTime(timezone=True), nullable=True),
        sa.Column('data_aceitacao',       sa.DateTime(timezone=True), nullable=True),
        sa.Column('data_conclusao',       sa.DateTime(timezone=True), nullable=True),
        sa.Column('data_indeferimento',   sa.DateTime(timezone=True), nullable=True),
        sa.Column('importado_em',         sa.DateTime(timezone=True), nullable=True),
        sa.Column('atualizado_em',        sa.DateTime(timezone=True), nullable=True),
        sa.Column('dados_hash',           sa.String(64), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cs_empresa_cod_tarefa', 'chamados_sustentacao', ['empresa_id', 'cod_tarefa'], unique=True)
    op.create_index('ix_cs_data_disponibilidade', 'chamados_sustentacao', ['data_disponibilidade'])
    op.create_index('ix_cs_situacao',    'chamados_sustentacao', ['situacao'])
    op.create_index('ix_cs_assunto',     'chamados_sustentacao', ['assunto'])
    op.create_index('ix_cs_responsavel', 'chamados_sustentacao', ['usuario_responsavel'])


def downgrade() -> None:
    op.drop_index('ix_cs_responsavel',        'chamados_sustentacao')
    op.drop_index('ix_cs_assunto',            'chamados_sustentacao')
    op.drop_index('ix_cs_situacao',           'chamados_sustentacao')
    op.drop_index('ix_cs_data_disponibilidade', 'chamados_sustentacao')
    op.drop_index('ix_cs_empresa_cod_tarefa', 'chamados_sustentacao')
    op.drop_table('chamados_sustentacao')
