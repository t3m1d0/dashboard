"""conferencia_folha tables

Revision ID: 0008_conferencia_folha
Revises: 0007_gente_folha_cols
Create Date: 2026-05-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0008_conferencia_folha'
down_revision = '0007_gente_folha_cols'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # conf_folha_linhas
    op.create_table('conf_folha_linhas',
        sa.Column('id',              postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',      postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('filial_nome',     sa.String(300), nullable=False),
        sa.Column('filial_cnpj',     sa.String(30),  nullable=True),
        sa.Column('competencia',     sa.String(20),  nullable=False),
        sa.Column('mes_nome',        sa.String(20),  nullable=True),
        sa.Column('ano',             sa.BigInteger(), nullable=True),
        sa.Column('nome',            sa.String(300), nullable=False),
        sa.Column('dt_admissao',     sa.String(20),  nullable=True),
        sa.Column('cargo',           sa.String(200), nullable=True),
        sa.Column('pix_cpf',         sa.String(100), nullable=True),
        sa.Column('salario',         sa.Float(),     nullable=True),
        sa.Column('somar_sal',       sa.String(10),  nullable=True),
        sa.Column('liquidez_pct',    sa.Float(),     nullable=True),
        sa.Column('liquidez_val',    sa.Float(),     nullable=True),
        sa.Column('premiacao',       sa.Float(),     nullable=True),
        sa.Column('bonus',           sa.Float(),     nullable=True),
        sa.Column('vlr_ser_pago',    sa.Float(),     nullable=True),
        sa.Column('sal_familia',     sa.Float(),     nullable=True),
        sa.Column('ajuda_custo',     sa.Float(),     nullable=True),
        sa.Column('horas_extra',     sa.Float(),     nullable=True),
        sa.Column('quebra_caixa',    sa.Float(),     nullable=True),
        sa.Column('periculosidade',  sa.Float(),     nullable=True),
        sa.Column('outros_creditos', sa.Float(),     nullable=True),
        sa.Column('total_proventos', sa.Float(),     nullable=True),
        sa.Column('inss',            sa.Float(),     nullable=True),
        sa.Column('irrf',            sa.Float(),     nullable=True),
        sa.Column('vt',              sa.Float(),     nullable=True),
        sa.Column('faltas',          sa.Float(),     nullable=True),
        sa.Column('desc_diversos',   sa.Float(),     nullable=True),
        sa.Column('horas_falta',     sa.Float(),     nullable=True),
        sa.Column('vale_func',       sa.Float(),     nullable=True),
        sa.Column('vale_func_os',    sa.Float(),     nullable=True),
        sa.Column('outros_debitos',  sa.Float(),     nullable=True),
        sa.Column('total_descontos', sa.Float(),     nullable=True),
        sa.Column('liquido',         sa.Float(),     nullable=True),
        sa.Column('dados_hash',      sa.String(64),  nullable=True),
        sa.Column('importado_em',    sa.DateTime(timezone=True), nullable=True),
        sa.Column('atualizado_em',   sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cfl_empresa_filial_comp', 'conf_folha_linhas', ['empresa_id','filial_nome','competencia'])
    op.create_index('ix_cfl_empresa_comp',        'conf_folha_linhas', ['empresa_id','competencia'])
    op.create_index('ix_cfl_filial',              'conf_folha_linhas', ['filial_nome'])
    op.create_index('ix_cfl_competencia',         'conf_folha_linhas', ['competencia'])

    # conf_folha_resumos
    op.create_table('conf_folha_resumos',
        sa.Column('id',                 postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',         postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('filial_nome',        sa.String(300), nullable=False),
        sa.Column('filial_cnpj',        sa.String(30),  nullable=True),
        sa.Column('competencia',        sa.String(20),  nullable=False),
        sa.Column('mes_nome',           sa.String(20),  nullable=True),
        sa.Column('ano',                sa.BigInteger(), nullable=True),
        sa.Column('total_funcionarios', sa.BigInteger(), nullable=True),
        sa.Column('total_salarios',     sa.Float(),     nullable=True),
        sa.Column('total_liquidez',     sa.Float(),     nullable=True),
        sa.Column('total_proventos',    sa.Float(),     nullable=True),
        sa.Column('total_inss',         sa.Float(),     nullable=True),
        sa.Column('total_irrf',         sa.Float(),     nullable=True),
        sa.Column('total_vt',           sa.Float(),     nullable=True),
        sa.Column('total_descontos',    sa.Float(),     nullable=True),
        sa.Column('total_liquido',      sa.Float(),     nullable=True),
        sa.Column('total_vale_func',    sa.Float(),     nullable=True),
        sa.Column('liquidez_loja',      sa.Float(),     nullable=True),
        sa.Column('liquidez_pct',       sa.Float(),     nullable=True),
        sa.Column('importado_em',       sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cfr_empresa_filial_comp', 'conf_folha_resumos', ['empresa_id','filial_nome','competencia'], unique=True)
    op.create_index('ix_cfr_empresa_comp',        'conf_folha_resumos', ['empresa_id','competencia'])

    # conf_folha_importacoes
    op.create_table('conf_folha_importacoes',
        sa.Column('id',           postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',   postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('filial_nome',  sa.String(300), nullable=False),
        sa.Column('competencia',  sa.String(20),  nullable=False),
        sa.Column('mes_nome',     sa.String(20),  nullable=True),
        sa.Column('nome_arquivo', sa.String(300), nullable=False),
        sa.Column('total_linhas', sa.BigInteger(), nullable=True),
        sa.Column('inseridos',    sa.BigInteger(), nullable=True),
        sa.Column('atualizados',  sa.BigInteger(), nullable=True),
        sa.Column('ignorados',    sa.BigInteger(), nullable=True),
        sa.Column('erros',        sa.BigInteger(), nullable=True),
        sa.Column('importado_em', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cfi_empresa', 'conf_folha_importacoes', ['empresa_id'])
    op.create_index('ix_cfi_comp',    'conf_folha_importacoes', ['competencia'])


def downgrade() -> None:
    for idx in ['ix_cfi_comp','ix_cfi_empresa']:
        op.drop_index(idx, 'conf_folha_importacoes')
    op.drop_table('conf_folha_importacoes')
    for idx in ['ix_cfr_empresa_comp','ix_cfr_empresa_filial_comp']:
        op.drop_index(idx, 'conf_folha_resumos')
    op.drop_table('conf_folha_resumos')
    for idx in ['ix_cfl_competencia','ix_cfl_filial','ix_cfl_empresa_comp','ix_cfl_empresa_filial_comp']:
        op.drop_index(idx, 'conf_folha_linhas')
    op.drop_table('conf_folha_linhas')
