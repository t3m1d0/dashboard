"""redmine integration tables

Revision ID: 0002_redmine
Revises: 0001_initial
Create Date: 2025-04-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0002_redmine'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('redmine_configs',
        sa.Column('id',                 postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',         postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('url',                sa.String(500),  nullable=False),
        sa.Column('api_key_hash',       sa.Text(),       nullable=False),
        sa.Column('api_key_enc',        sa.Text(),       nullable=False),
        sa.Column('ativo',              sa.Boolean(),    default=True),
        sa.Column('ultimo_sync',        sa.DateTime(timezone=True)),
        sa.Column('sync_interval_min',  sa.Integer(),    default=15),
        sa.Column('criado_em',          sa.DateTime(timezone=True)),
        sa.Column('atualizado_em',      sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('empresa_id'),
    )

    op.create_table('redmine_projetos',
        sa.Column('id',             postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('config_id',      postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',     postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('redmine_id',     sa.Integer(),    nullable=False),
        sa.Column('identificador',  sa.String(100),  nullable=False),
        sa.Column('nome',           sa.String(200),  nullable=False),
        sa.Column('descricao',      sa.Text()),
        sa.Column('ativo',          sa.Boolean(),    default=True),
        sa.Column('sincronizar',    sa.Boolean(),    default=True),
        sa.Column('criado_em',      sa.DateTime(timezone=True)),
        sa.Column('atualizado_em',  sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['config_id'],  ['redmine_configs.id']),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_rm_proj_empresa', 'redmine_projetos', ['empresa_id'])

    op.create_table('redmine_tarefas',
        sa.Column('id',                postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('projeto_id',         postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',         postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('redmine_id',         sa.Integer(),   nullable=False),
        sa.Column('assunto',            sa.String(500), nullable=False),
        sa.Column('descricao',          sa.Text()),
        sa.Column('status',             sa.String(80),  nullable=False),
        sa.Column('status_id',          sa.Integer(),   nullable=False),
        sa.Column('prioridade',         sa.String(50),  nullable=False),
        sa.Column('prioridade_id',      sa.Integer(),   nullable=False),
        sa.Column('tracker',            sa.String(80)),
        sa.Column('responsavel_nome',   sa.String(150)),
        sa.Column('responsavel_id',     sa.Integer()),
        sa.Column('autor_nome',         sa.String(150)),
        sa.Column('categoria',          sa.String(150)),
        sa.Column('versao',             sa.String(100)),
        sa.Column('estimativa_horas',   sa.Float()),
        sa.Column('horas_gastas',       sa.Float()),
        sa.Column('progresso',          sa.Integer(),   default=0),
        sa.Column('tags',               sa.JSON()),
        sa.Column('data_inicio',        sa.String(10)),
        sa.Column('data_prazo',         sa.String(10)),
        sa.Column('data_criacao',       sa.DateTime(timezone=True)),
        sa.Column('data_atualizacao',   sa.DateTime(timezone=True)),
        sa.Column('data_fechamento',    sa.DateTime(timezone=True)),
        sa.Column('atrasada',           sa.Boolean(),   default=False),
        sa.Column('dados_extras',       sa.JSON()),
        sa.Column('sincronizado_em',    sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['projeto_id'], ['redmine_projetos.id']),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_rm_tar_empresa',   'redmine_tarefas', ['empresa_id'])
    op.create_index('ix_rm_tar_status',    'redmine_tarefas', ['status'])
    op.create_index('ix_rm_tar_resp',      'redmine_tarefas', ['responsavel_nome'])
    op.create_index('ix_rm_tar_atrasada',  'redmine_tarefas', ['atrasada'])

    op.create_table('redmine_comentarios',
        sa.Column('id',         postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tarefa_id',  postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('redmine_id', sa.Integer(),   nullable=False),
        sa.Column('autor_nome', sa.String(150), nullable=False),
        sa.Column('autor_id',   sa.Integer()),
        sa.Column('texto',      sa.Text(),      nullable=False),
        sa.Column('criado_em',  sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['tarefa_id'], ['redmine_tarefas.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('redmine_membros',
        sa.Column('id',         postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('redmine_id', sa.Integer(),   nullable=False),
        sa.Column('nome',       sa.String(150), nullable=False),
        sa.Column('login',      sa.String(100)),
        sa.Column('email',      sa.String(150)),
        sa.Column('ativo',      sa.Boolean(),   default=True),
        sa.Column('avatar_url', sa.String(500)),
        sa.Column('criado_em',  sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('redmine_metricas',
        sa.Column('id',                           postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',                   postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('membro_id',                    sa.Integer()),
        sa.Column('membro_nome',                  sa.String(150)),
        sa.Column('periodo',                      sa.String(10), nullable=False),
        sa.Column('tarefas_abertas',              sa.Integer(), default=0),
        sa.Column('tarefas_em_andamento',         sa.Integer(), default=0),
        sa.Column('tarefas_concluidas',           sa.Integer(), default=0),
        sa.Column('tarefas_atrasadas',            sa.Integer(), default=0),
        sa.Column('horas_estimadas',              sa.Float(), default=0),
        sa.Column('horas_gastas',                 sa.Float(), default=0),
        sa.Column('tempo_medio_resolucao_horas',  sa.Float()),
        sa.Column('dados',                        sa.JSON()),
        sa.Column('criado_em',                    sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_rm_met_empresa_periodo', 'redmine_metricas', ['empresa_id', 'periodo'])

    op.create_table('redmine_sync_logs',
        sa.Column('id',             postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('config_id',      postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('empresa_id',     postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo',           sa.String(50)),
        sa.Column('status',         sa.String(20), default='ok'),
        sa.Column('projetos_sync',  sa.Integer(), default=0),
        sa.Column('tarefas_sync',   sa.Integer(), default=0),
        sa.Column('membros_sync',   sa.Integer(), default=0),
        sa.Column('erros',          sa.JSON()),
        sa.Column('duracao_ms',     sa.Integer()),
        sa.Column('criado_em',      sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['config_id'],  ['redmine_configs.id']),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('redmine_sync_logs')
    op.drop_index('ix_rm_met_empresa_periodo', 'redmine_metricas')
    op.drop_table('redmine_metricas')
    op.drop_table('redmine_membros')
    op.drop_table('redmine_comentarios')
    op.drop_index('ix_rm_tar_atrasada', 'redmine_tarefas')
    op.drop_index('ix_rm_tar_resp',     'redmine_tarefas')
    op.drop_index('ix_rm_tar_status',   'redmine_tarefas')
    op.drop_index('ix_rm_tar_empresa',  'redmine_tarefas')
    op.drop_table('redmine_tarefas')
    op.drop_index('ix_rm_proj_empresa', 'redmine_projetos')
    op.drop_table('redmine_projetos')
    op.drop_table('redmine_configs')
