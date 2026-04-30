// ============================================================
// Desenvolvimento Page — Kanban Board
// ============================================================
import { useDashboardStore } from '@/store'
import { PRIORITY_COLORS, STATUS_CONFIG, getInitials, formatDate } from '@/utils'
import type { Projeto, ProjectStatus } from '@/types'
import { useState } from 'react'

const COLUMNS: { id: ProjectStatus; label: string; color: string }[] = [
  { id: 'backlog',       label: 'Backlog',       color: '#6b7280' },
  { id: 'desenvolvimento', label: 'Desenvolvimento', color: '#3b82f6' },
  { id: 'homologacao',   label: 'Homologação',   color: '#8b5cf6' },
  { id: 'validacao',     label: 'Validação',     color: '#f59e0b' },
  { id: 'producao',      label: 'Em Produção',   color: '#10b981' },
]

function ProjectCard({ project }: { project: Projeto }) {
  const prioColor = PRIORITY_COLORS[project.prioridade] || '#6b7280'
  const colColor = STATUS_CONFIG[project.status]?.color || '#6b7280'

  return (
    <div
      className="rounded-xl relative overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        padding: '12px 13px 10px',
        // @ts-ignore
        '--pc': colColor,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)'
        e.currentTarget.style.borderColor = `${colColor}66`
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px ${colColor}22`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = ''
      }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 rounded-t-xl" style={{ height: 3, background: colColor }} />
      {/* Left accent */}
      <div className="absolute top-0.5 left-0 bottom-0" style={{ width: 3, background: `linear-gradient(to bottom, ${colColor}88, transparent)` }} />

      {/* Tags */}
      <div className="flex gap-1 flex-wrap mb-2 pl-1.5">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full"
            style={{
              fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.04em', padding: '2px 7px',
              background: `${colColor}18`, color: colColor, border: `1px solid ${colColor}30`
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Title */}
      <div className="pl-1.5 mb-1" style={{ fontSize: '0.83rem', fontWeight: 700, lineHeight: 1.35 }}>
        {project.titulo}
      </div>

      {/* Description */}
      <div
        className="pl-1.5 mb-2"
        style={{
          fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}
      >
        {project.descricao}
      </div>

      {/* Progress bar */}
      <div className="mb-2.5">
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Progresso</span>
          <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: colColor }}>
            {project.progresso}%
          </span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 3, background: 'var(--bg-elevated)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${project.progresso}%`, background: colColor }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-1.5 pl-1.5">
        {/* Avatar */}
        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0 text-white font-extrabold"
            style={{
              width: 24, height: 24, background: colColor,
              fontSize: '0.56rem', boxShadow: `0 0 0 2px var(--bg-card)`
            }}
          >
            {getInitials(project.responsavel)}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{project.responsavel}</span>
        </div>

        {/* Priority + deadline */}
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full"
            style={{
              fontSize: '0.58rem', fontWeight: 700, padding: '2px 7px',
              background: `${prioColor}15`, color: prioColor, border: `1px solid ${prioColor}30`
            }}
          >
            {project.prioridade}
          </span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {project.prazo.slice(5)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function DesenvolvimentoPage() {
  const { data } = useDashboardStore()
  const { projetos } = data.desenvolvimento
  const [filterPrio, setFilterPrio] = useState<string>('Todos')
  const [filterResp, setFilterResp] = useState<string>('Todos')

  const responsaveis = ['Todos', ...Array.from(new Set(projetos.map((p) => p.responsavel)))]
  const prioridades  = ['Todos', 'Crítica', 'Alta', 'Média', 'Baixa']

  const filtered = projetos.filter((p) => {
    if (filterPrio !== 'Todos' && p.prioridade !== filterPrio) return false
    if (filterResp !== 'Todos' && p.responsavel !== filterResp) return false
    return true
  })

  const selStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '7px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    outline: 'none',
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Equipe de <span style={{ color: '#8b5cf6' }}>Desenvolvimento</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            Board Kanban — {projetos.length} projetos ativos
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select style={selStyle} value={filterPrio} onChange={(e) => setFilterPrio(e.target.value)}>
            {prioridades.map((p) => <option key={p} value={p}>{p === 'Todos' ? 'Prioridade: Todas' : p}</option>)}
          </select>
          <select style={selStyle} value={filterResp} onChange={(e) => setFilterResp(e.target.value)}>
            {responsaveis.map((r) => <option key={r} value={r}>{r === 'Todos' ? 'Responsável: Todos' : r}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(200px, 1fr))`, overflowX: 'auto' }}>
        {COLUMNS.map((col) => {
          const cards = filtered.filter((p) => p.status === col.id)
          return (
            <div
              key={col.id}
              className="flex flex-col rounded-2xl overflow-hidden"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                // @ts-ignore
                '--col-c': col.color,
              }}
            >
              {/* Column header */}
              <div
                className="flex items-center justify-between px-3.5 py-2.5"
                style={{
                  background: `${col.color}12`,
                  borderBottom: `2px solid ${col.color}`,
                }}
              >
                <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: col.color }}>
                  {col.label}
                </span>
                <span
                  className="flex items-center justify-center rounded-full font-extrabold text-white"
                  style={{ background: col.color, fontSize: '0.65rem', minWidth: 20, height: 20, padding: '0 5px' }}
                >
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-2 min-h-20">
                {cards.length === 0 ? (
                  <div className="flex items-center justify-center py-6" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Nenhum projeto
                  </div>
                ) : (
                  cards.map((p) => <ProjectCard key={p.id} project={p} />)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
