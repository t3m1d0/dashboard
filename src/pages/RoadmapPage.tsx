// ============================================================
// Roadmap Page
// ============================================================
import { useDashboardStore } from '@/store'
import { PRIORITY_COLORS } from '@/utils'
import type { RoadmapItem } from '@/types'
import { ArrowRight } from 'lucide-react'

const CATEGORY_CONFIG: Record<string, { color: string; gradient: string }> = {
  'Próximas Entregas':      { color: '#3b82f6', gradient: 'rgba(59,130,246,0.08)' },
  'Melhorias Planejadas':   { color: '#8b5cf6', gradient: 'rgba(139,92,246,0.08)' },
  'Projetos Futuros':       { color: '#10b981', gradient: 'rgba(16,185,129,0.08)' },
  'Iniciativas Estratégicas': { color: '#f59e0b', gradient: 'rgba(245,158,11,0.08)' },
}

function RoadmapCard({ item }: { item: RoadmapItem }) {
  const cat  = CATEGORY_CONFIG[item.categoria] || { color: '#8b5cf6', gradient: 'rgba(139,92,246,0.08)' }
  const prio = PRIORITY_COLORS[item.prioridade] || '#6b7280'

  return (
    <div
      className="rounded-2xl p-4 transition-all duration-300 relative overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${cat.color}55`
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: cat.color }} />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2 mt-0.5">
        <h3 style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.35 }}>{item.titulo}</h3>
        <span
          className="rounded-full whitespace-nowrap flex-shrink-0"
          style={{
            fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px',
            background: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}30`
          }}
        >
          {item.prazo}
        </span>
      </div>

      <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
        {item.descricao}
      </p>

      {/* Impact */}
      <div
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 mb-3"
        style={{ background: cat.gradient, border: `1px solid ${cat.color}20` }}
      >
        <ArrowRight size={12} style={{ color: cat.color, flexShrink: 0 }} />
        <span style={{ fontSize: '0.72rem', color: cat.color, fontWeight: 600 }}>{item.impacto}</span>
      </div>

      {/* Priority badge */}
      <span
        className="inline-flex items-center rounded-full"
        style={{
          fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px',
          background: `${prio}15`, color: prio, border: `1px solid ${prio}30`
        }}
      >
        {item.prioridade}
      </span>
    </div>
  )
}

export function RoadmapPage() {
  const { data } = useDashboardStore()
  const { roadmap } = data

  const categories = Array.from(new Set(roadmap.map((r) => r.categoria)))

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
          Roadmap & <span style={{ color: '#8b5cf6' }}>Próximos Passos</span>
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
          Planejamento estratégico e iniciativas futuras
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {categories.map((cat) => {
          const items = roadmap.filter((r) => r.categoria === cat)
          const conf  = CATEGORY_CONFIG[cat] || { color: '#8b5cf6', gradient: '' }

          return (
            <div key={cat}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: conf.color }} />
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{cat}</h2>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span
                  className="rounded-full px-2.5 py-0.5"
                  style={{ fontSize: '0.7rem', fontWeight: 600, background: `${conf.color}15`, color: conf.color }}
                >
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {items.map((item) => (
                  <RoadmapCard key={item.titulo} item={item} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
