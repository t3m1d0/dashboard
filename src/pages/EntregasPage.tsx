// ============================================================
// Entregas Estratégicas Page
// ============================================================
import { useDashboardStore } from '@/store'
import { formatDate } from '@/utils'
import {
  Bot, Shield, Activity, GitMerge, BarChart2, Database,
  CheckCircle2, Clock
} from 'lucide-react'

const ICON_MAP: Record<string, React.ReactNode> = {
  bot:          <Bot size={22} />,
  shield:       <Shield size={22} />,
  activity:     <Activity size={22} />,
  'git-merge':  <GitMerge size={22} />,
  'bar-chart-2': <BarChart2 size={22} />,
  database:     <Database size={22} />,
}

const IMPACT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'Alto':    { label: 'Alto Impacto',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  'Crítico': { label: 'Impacto Crítico', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  'Médio':   { label: 'Médio Impacto',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
}

export function EntregasPage() {
  const { data } = useDashboardStore()
  const entregas = data.entregasEstrategicas

  const concluidas   = entregas.filter((e) => e.status === 'Concluído').length
  const emValidacao  = entregas.filter((e) => e.status === 'Em validação').length

  return (
    <div className="animate-fade-in">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Entregas <span style={{ color: '#8b5cf6' }}>Estratégicas</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            Projetos concluídos e em validação — {data.meta.mes} {data.meta.ano}
          </p>
        </div>

        {/* Summary pills */}
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}
          >
            <CheckCircle2 size={14} />
            {concluidas} Concluídas
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}
          >
            <Clock size={14} />
            {emValidacao} Em Validação
          </span>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {entregas.map((entrega) => {
          const impact = IMPACT_CONFIG[entrega.impacto] || IMPACT_CONFIG['Médio']
          const isConcluida = entrega.status === 'Concluído'
          const icon = ICON_MAP[entrega.icone] || <Activity size={22} />

          return (
            <div
              key={entrega.titulo}
              className="rounded-2xl relative overflow-hidden transition-all duration-300"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '18px 20px' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${entrega.cor}55`
                e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.3)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {/* Top gradient bar */}
              <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: entrega.cor }} />

              {/* Header */}
              <div className="flex items-start justify-between gap-2.5 mb-2.5">
                <div
                  className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{ width: 44, height: 44, background: `${entrega.cor}18`, color: entrega.cor }}
                >
                  {icon}
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  {/* Status badge */}
                  <span
                    className="rounded-full flex items-center gap-1"
                    style={{
                      fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '0.05em', padding: '3px 10px',
                      background: isConcluida ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                      color: isConcluida ? '#10b981' : '#f59e0b',
                      border: `1px solid ${isConcluida ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                    }}
                  >
                    {isConcluida ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                    {entrega.status}
                  </span>

                  {/* Impact badge */}
                  <span
                    className="rounded-full"
                    style={{
                      fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px',
                      background: impact.bg, color: impact.color,
                    }}
                  >
                    {impact.label}
                  </span>
                </div>
              </div>

              {/* Title & desc */}
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.35, marginBottom: 5 }}>
                {entrega.titulo}
              </h3>
              <p
                style={{
                  fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                }}
              >
                {entrega.descricao}
              </p>

              {/* Gain highlight */}
              <div
                className="rounded-lg px-3 py-2 mb-3 flex items-center gap-2"
                style={{ background: `${entrega.cor}10`, border: `1px solid ${entrega.cor}20` }}
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: entrega.cor }}>
                  ✦ {entrega.ganhoEstimado}
                </span>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t pt-3"
                style={{ borderColor: 'var(--border)', flexWrap: 'wrap', gap: 6 }}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex items-center justify-center rounded-full text-white font-extrabold flex-shrink-0"
                    style={{ width: 26, height: 26, background: entrega.cor, fontSize: '0.62rem' }}
                  >
                    TI
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {entrega.areaBeneficiada}
                  </span>
                </div>
                <span style={{ fontSize: '0.67rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {formatDate(entrega.data)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
