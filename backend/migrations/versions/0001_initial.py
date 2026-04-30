"""initial tables

Revision ID: 0001_initial
Revises: 
Create Date: 2025-04-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── empresas ────────────────────────────────────────────
    op.create_table('empresas',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('nome', sa.String(150), nullable=False),
        sa.Column('slug', sa.String(80), nullable=False),
        sa.Column('plano', sa.String(30), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )

    # ── franquias ────────────────────────────────────────────
    op.create_table('franquias',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('nome', sa.String(150), nullable=False),
        sa.Column('cidade', sa.String(100), nullable=True),
        sa.Column('uf', sa.String(2), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── usuarios ────────────────────────────────────────────
    op.create_table('usuarios',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('nome', sa.String(100), nullable=False),
        sa.Column('email', sa.String(150), nullable=False),
        sa.Column('senha_hash', sa.Text(), nullable=False),
        sa.Column('cargo', sa.String(80), nullable=True),
        sa.Column('role', sa.String(30), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=True),
        sa.Column('ultimo_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )

    # ── chamados ────────────────────────────────────────────
    op.create_table('chamados',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('franquia_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('responsavel_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('titulo', sa.String(200), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('categoria', sa.String(80), nullable=True),
        sa.Column('assunto', sa.String(150), nullable=True),
        sa.Column('prioridade', sa.String(20), nullable=True),
        sa.Column('status', sa.String(30), nullable=True),
        sa.Column('dentro_sla', sa.Boolean(), nullable=True),
        sa.Column('sla_prazo', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolvido_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.ForeignKeyConstraint(['franquia_id'], ['franquias.id']),
        sa.ForeignKeyConstraint(['responsavel_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_chamados_status',    'chamados', ['status'])
    op.create_index('ix_chamados_categoria', 'chamados', ['categoria'])
    op.create_index('ix_chamados_empresa',   'chamados', ['empresa_id'])

    # ── projetos ────────────────────────────────────────────
    op.create_table('projetos',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('responsavel_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('titulo', sa.String(200), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('prioridade', sa.String(20), nullable=True),
        sa.Column('status', sa.String(30), nullable=True),
        sa.Column('progresso', sa.SmallInteger(), nullable=True),
        sa.Column('prazo', sa.String(10), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.ForeignKeyConstraint(['responsavel_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_projetos_status',  'projetos', ['status'])
    op.create_index('ix_projetos_empresa', 'projetos', ['empresa_id'])

    # ── kpi_snapshots ────────────────────────────────────────
    op.create_table('kpi_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('periodo', sa.String(7), nullable=False),
        sa.Column('mes', sa.String(20), nullable=True),
        sa.Column('ano', sa.Integer(), nullable=True),
        sa.Column('dados', sa.JSON(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── uploads ─────────────────────────────────────────────
    op.create_table('uploads',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('usuario_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('empresa_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('tipo', sa.String(50), nullable=False),
        sa.Column('nome_arquivo', sa.String(255), nullable=False),
        sa.Column('caminho', sa.Text(), nullable=False),
        sa.Column('tamanho_bytes', sa.Integer(), nullable=True),
        sa.Column('total_registros', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── audit_logs ───────────────────────────────────────────
    op.create_table('audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('usuario_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('acao', sa.String(100), nullable=False),
        sa.Column('entidade', sa.String(80), nullable=True),
        sa.Column('entidade_id', sa.String(36), nullable=True),
        sa.Column('dados', sa.JSON(), nullable=True),
        sa.Column('ip', sa.String(45), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('uploads')
    op.drop_table('kpi_snapshots')
    op.drop_index('ix_projetos_empresa', 'projetos')
    op.drop_index('ix_projetos_status',  'projetos')
    op.drop_table('projetos')
    op.drop_index('ix_chamados_empresa',   'chamados')
    op.drop_index('ix_chamados_categoria', 'chamados')
    op.drop_index('ix_chamados_status',    'chamados')
    op.drop_table('chamados')
    op.drop_table('usuarios')
    op.drop_table('franquias')
    op.drop_table('empresas')
