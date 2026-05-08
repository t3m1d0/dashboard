"""financeiro tables

Revision ID: 0005_financeiro
Revises: 0004_compras
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0005_financeiro'
down_revision = '0004_compras'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # fin_franqueados
    op.create_table('fin_franqueados',
        sa.Column('id',        postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('codigo',    sa.String(20),  nullable=False),
        sa.Column('nome',      sa.String(200), nullable=False),
        sa.Column('cidade',    sa.String(100), nullable=True),
        sa.Column('uf',        sa.String(2),   nullable=True),
        sa.Column('status',    sa.String(20),  nullable=True),
        sa.Column('email',     sa.String(200), nullable=True),
        sa.Column('tel',       sa.String(50),  nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fin_franq_codigo', 'fin_franqueados', ['codigo'], unique=True)

    # fin_regioes
    op.create_table('fin_regioes',
        sa.Column('id',               postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('codigo',           sa.String(20),  nullable=False),
        sa.Column('nome',             sa.String(100), nullable=False),
        sa.Column('franqueado_id',    postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('franqueado_codigo', sa.String(20), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fin_regiao_codigo', 'fin_regioes', ['codigo'], unique=True)

    # fin_lojas
    op.create_table('fin_lojas',
        sa.Column('id',               postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('codigo',           sa.String(20),  nullable=False),
        sa.Column('nome',             sa.String(200), nullable=False),
        sa.Column('cidade',           sa.String(100), nullable=True),
        sa.Column('uf',               sa.String(2),   nullable=True),
        sa.Column('status',           sa.String(20),  nullable=True),
        sa.Column('franqueado_id',    postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('franqueado_codigo', sa.String(20), nullable=False),
        sa.Column('regiao_id',        postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('regiao_codigo',    sa.String(20),  nullable=True),
        sa.Column('criado_em',        sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fin_loja_codigo',      'fin_lojas', ['codigo'], unique=True)
    op.create_index('ix_fin_loja_franqueado',  'fin_lojas', ['franqueado_id'])

    # fin_lancamentos
    op.create_table('fin_lancamentos',
        sa.Column('id',            postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',    postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('loja_id',       postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('loja_codigo',   sa.String(20),   nullable=False),
        sa.Column('loja_nome',     sa.String(200),  nullable=True),
        sa.Column('tipo',          sa.String(30),   nullable=False),
        sa.Column('periodo',       sa.String(20),   nullable=True),
        sa.Column('codigo',        sa.String(100),  nullable=True),
        sa.Column('cliente',       sa.String(300),  nullable=True),
        sa.Column('fornecedor',    sa.String(300),  nullable=True),
        sa.Column('valor',         sa.Float(),      nullable=True),
        sa.Column('plano',         sa.String(200),  nullable=True),
        sa.Column('parcela',       sa.String(50),   nullable=True),
        sa.Column('conta',         sa.String(200),  nullable=True),
        sa.Column('centro_custo',  sa.String(200),  nullable=True),
        sa.Column('descricao',     sa.Text(),       nullable=True),
        sa.Column('observacao',    sa.Text(),       nullable=True),
        sa.Column('num_documento', sa.String(100),  nullable=True),
        sa.Column('identificacao', sa.String(200),  nullable=True),
        sa.Column('dt_lancamento',  sa.String(30),  nullable=True),
        sa.Column('dt_vencimento',  sa.String(30),  nullable=True),
        sa.Column('dt_recebimento', sa.String(30),  nullable=True),
        sa.Column('dt_pagamento',   sa.String(30),  nullable=True),
        sa.Column('dt_competencia', sa.String(30),  nullable=True),
        sa.Column('dados_hash',    sa.String(64),   nullable=True),
        sa.Column('importado_em',  sa.DateTime(timezone=True), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fin_lanc_loja_tipo_periodo', 'fin_lancamentos', ['loja_codigo', 'tipo', 'periodo'])
    op.create_index('ix_fin_lanc_empresa',  'fin_lancamentos', ['empresa_id'])
    op.create_index('ix_fin_lanc_tipo',     'fin_lancamentos', ['tipo'])
    op.create_index('ix_fin_lanc_periodo',  'fin_lancamentos', ['periodo'])
    op.create_index('ix_fin_lanc_dt_venc',  'fin_lancamentos', ['dt_vencimento'])

    # fin_importacoes
    op.create_table('fin_importacoes',
        sa.Column('id',           postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',   postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('loja_codigo',  sa.String(20),  nullable=False),
        sa.Column('tipo',         sa.String(30),  nullable=False),
        sa.Column('periodo',      sa.String(20),  nullable=True),
        sa.Column('nome_arquivo', sa.String(300), nullable=False),
        sa.Column('total_linhas', sa.BigInteger(), nullable=True),
        sa.Column('inseridos',    sa.BigInteger(), nullable=True),
        sa.Column('atualizados',  sa.BigInteger(), nullable=True),
        sa.Column('ignorados',    sa.BigInteger(), nullable=True),
        sa.Column('erros',        sa.BigInteger(), nullable=True),
        sa.Column('importado_em', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fin_imp_empresa',   'fin_importacoes', ['empresa_id'])
    op.create_index('ix_fin_imp_loja_tipo', 'fin_importacoes', ['loja_codigo', 'tipo'])


def downgrade() -> None:
    for idx in ['ix_fin_imp_loja_tipo','ix_fin_imp_empresa']:
        op.drop_index(idx, 'fin_importacoes')
    op.drop_table('fin_importacoes')

    for idx in ['ix_fin_lanc_dt_venc','ix_fin_lanc_periodo','ix_fin_lanc_tipo','ix_fin_lanc_empresa','ix_fin_lanc_loja_tipo_periodo']:
        op.drop_index(idx, 'fin_lancamentos')
    op.drop_table('fin_lancamentos')

    op.drop_index('ix_fin_loja_franqueado', 'fin_lojas')
    op.drop_index('ix_fin_loja_codigo', 'fin_lojas')
    op.drop_table('fin_lojas')

    op.drop_index('ix_fin_regiao_codigo', 'fin_regioes')
    op.drop_table('fin_regioes')

    op.drop_index('ix_fin_franq_codigo', 'fin_franqueados')
    op.drop_table('fin_franqueados')
