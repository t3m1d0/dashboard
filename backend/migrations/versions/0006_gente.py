"""gente_e_gestao tables

Revision ID: 0006_gente
Revises: 0005_financeiro
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0006_gente'
down_revision = '0005_financeiro'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # gente_colaboradores
    op.create_table('gente_colaboradores',
        sa.Column('id',            postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',    postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('matricula',     sa.String(50),  nullable=True),
        sa.Column('cpf',           sa.String(14),  nullable=True),
        sa.Column('nome',          sa.String(300), nullable=False),
        sa.Column('pis',           sa.String(20),  nullable=True),
        sa.Column('empresa',       sa.String(200), nullable=True),
        sa.Column('departamento',  sa.String(200), nullable=True),
        sa.Column('cargo',         sa.String(200), nullable=True),
        sa.Column('funcao',        sa.String(200), nullable=True),
        sa.Column('centro_custo',  sa.String(200), nullable=True),
        sa.Column('filial',        sa.String(200), nullable=True),
        sa.Column('tipo_contrato', sa.String(100), nullable=True),
        sa.Column('situacao',      sa.String(50),  nullable=True),
        sa.Column('data_admissao', sa.String(20),  nullable=True),
        sa.Column('data_demissao', sa.String(20),  nullable=True),
        sa.Column('salario_base',  sa.Float(),     nullable=True),
        sa.Column('importado_em',  sa.DateTime(timezone=True), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gc_empresa_matricula', 'gente_colaboradores', ['empresa_id', 'matricula'])
    op.create_index('ix_gc_empresa_cpf',       'gente_colaboradores', ['empresa_id', 'cpf'])
    op.create_index('ix_gc_empresa',           'gente_colaboradores', ['empresa_id'])
    op.create_index('ix_gc_situacao',          'gente_colaboradores', ['situacao'])

    # gente_folha
    op.create_table('gente_folha',
        sa.Column('id',              postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',      postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('competencia',     sa.String(20),  nullable=False),
        sa.Column('mes_nome',        sa.String(20),  nullable=True),
        sa.Column('matricula',       sa.String(50),  nullable=True),
        sa.Column('cpf',             sa.String(14),  nullable=True),
        sa.Column('nome',            sa.String(300), nullable=False),
        sa.Column('pis',             sa.String(20),  nullable=True),
        sa.Column('empresa',         sa.String(200), nullable=True),
        sa.Column('departamento',    sa.String(200), nullable=True),
        sa.Column('cargo',           sa.String(200), nullable=True),
        sa.Column('funcao',          sa.String(200), nullable=True),
        sa.Column('centro_custo',    sa.String(200), nullable=True),
        sa.Column('filial',          sa.String(200), nullable=True),
        sa.Column('situacao',        sa.String(50),  nullable=True),
        sa.Column('tipo_contrato',   sa.String(100), nullable=True),
        sa.Column('data_admissao',   sa.String(20),  nullable=True),
        sa.Column('verba_codigo',    sa.String(50),  nullable=True),
        sa.Column('verba_nome',      sa.String(200), nullable=True),
        sa.Column('verba_tipo',      sa.String(20),  nullable=True),
        sa.Column('referencia',      sa.Float(),     nullable=True),
        sa.Column('valor',           sa.Float(),     nullable=True),
        sa.Column('salario_base',    sa.Float(),     nullable=True),
        sa.Column('total_proventos', sa.Float(),     nullable=True),
        sa.Column('total_descontos', sa.Float(),     nullable=True),
        sa.Column('liquido',         sa.Float(),     nullable=True),
        sa.Column('fgts',            sa.Float(),     nullable=True),
        sa.Column('inss',            sa.Float(),     nullable=True),
        sa.Column('irrf',            sa.Float(),     nullable=True),
        sa.Column('dados_hash',      sa.String(64),  nullable=True),
        sa.Column('importado_em',    sa.DateTime(timezone=True), nullable=True),
        sa.Column('atualizado_em',   sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gf_empresa_competencia', 'gente_folha', ['empresa_id', 'competencia'])
    op.create_index('ix_gf_empresa_matricula',   'gente_folha', ['empresa_id', 'matricula', 'competencia'])
    op.create_index('ix_gf_empresa',             'gente_folha', ['empresa_id'])
    op.create_index('ix_gf_competencia',         'gente_folha', ['competencia'])
    op.create_index('ix_gf_cargo',               'gente_folha', ['cargo'])
    op.create_index('ix_gf_departamento',        'gente_folha', ['departamento'])

    # gente_importacoes
    op.create_table('gente_importacoes',
        sa.Column('id',                 postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',         postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('tipo',               sa.String(30),  nullable=False),
        sa.Column('competencia',        sa.String(20),  nullable=True),
        sa.Column('mes_nome',           sa.String(20),  nullable=True),
        sa.Column('nome_arquivo',       sa.String(300), nullable=False),
        sa.Column('total_linhas',       sa.BigInteger(), nullable=True),
        sa.Column('inseridos',          sa.BigInteger(), nullable=True),
        sa.Column('atualizados',        sa.BigInteger(), nullable=True),
        sa.Column('ignorados',          sa.BigInteger(), nullable=True),
        sa.Column('erros',              sa.BigInteger(), nullable=True),
        sa.Column('colunas_detectadas', sa.Text(),       nullable=True),
        sa.Column('importado_em',       sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gi_empresa',    'gente_importacoes', ['empresa_id'])
    op.create_index('ix_gi_competencia','gente_importacoes', ['competencia'])


def downgrade() -> None:
    for idx in ['ix_gi_competencia','ix_gi_empresa']:
        op.drop_index(idx, 'gente_importacoes')
    op.drop_table('gente_importacoes')

    for idx in ['ix_gf_departamento','ix_gf_cargo','ix_gf_competencia','ix_gf_empresa','ix_gf_empresa_matricula','ix_gf_empresa_competencia']:
        op.drop_index(idx, 'gente_folha')
    op.drop_table('gente_folha')

    for idx in ['ix_gc_situacao','ix_gc_empresa','ix_gc_empresa_cpf','ix_gc_empresa_matricula']:
        op.drop_index(idx, 'gente_colaboradores')
    op.drop_table('gente_colaboradores')
