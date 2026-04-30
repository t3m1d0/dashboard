// ============================================================
// Sidebar — Main navigation
// ============================================================
import { useDashboardStore } from '@/store'
import type { Section } from '@/types'
import {
  LayoutDashboard, Headphones, Code2, PackageCheck,
  TrendingUp, Map, ChevronLeft, Bot, Shield, Activity,
  GitMerge, BarChart2, Database
} from 'lucide-react'

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode; badge?: number }[] = [
  { id: 'overview',      label: 'Visão Geral',      icon: <LayoutDashboard size={16} /> },
  { id: 'sustentacao',   label: 'Sustentação',       icon: <Headphones size={16} />,  badge: 847 },
  { id: 'desenvolvimento', label: 'Desenvolvimento', icon: <Code2 size={16} />,        badge: 9 },
  { id: 'entregas',      label: 'Entregas',          icon: <PackageCheck size={16} /> },
  { id: 'estrategica',   label: 'Visão Estratégica', icon: <TrendingUp size={16} /> },
  { id: 'roadmap',       label: 'Roadmap',           icon: <Map size={16} /> },
]

export function Sidebar() {
  const { activeSection, setActiveSection, isDark, data } = useDashboardStore()

  const handleNav = (section: Section) => {
    setActiveSection(section)
    if (window.innerWidth <= 900) {
      useDashboardStore.getState().setSidebarOpen(false)
    }
  }

  return (
    <aside
      className="flex flex-col h-full"
      style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
    >
      {/* Brand */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex flex-col gap-1">
          <span
            className="text-white font-bold tracking-wide"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.08em' }}
          >
            MUNIZ
          </span>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>
            STRATEGIC CENTER
          </span>
        </div>

        {/* Month badge */}
        <div
          className="mt-3 px-3 py-2 rounded-lg text-center"
          style={{
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.2)',
            fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.05em',
          }}
        >
          <span style={{ color: '#8b5cf6', display: 'block', fontSize: '0.88rem', fontWeight: 700 }}>
            {data.meta.mes} {data.meta.ano}
          </span>
          Relatório Executivo
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <div
          style={{
            fontSize: '0.62rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.25)',
            padding: '12px 20px 6px',
          }}
        >
          Dashboard
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className="w-full flex items-center gap-2.5 px-5 py-2.5 text-left transition-all"
              style={{
                fontSize: '0.83rem',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                background: isActive ? 'rgba(139,92,246,0.12)' : 'transparent',
                borderLeft: `3px solid ${isActive ? '#8b5cf6' : 'transparent'}`,
                cursor: 'pointer',
                border: 'none',
                fontFamily: 'var(--font-body)',
                transition: 'all var(--transition)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }}>{item.icon}</span>
              <span className="flex-1 whitespace-nowrap">{item.label}</span>
              {item.badge && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: '#8b5cf6',
                    color: '#fff',
                    fontSize: '0.62rem',
                    minWidth: '18px',
                    textAlign: 'center',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}

        {/* Upcoming sections */}
        <div
          style={{
            fontSize: '0.62rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.25)',
            padding: '16px 20px 6px',
          }}
        >
          Em Breve
        </div>

        {[
          { label: 'Marketing', icon: <BarChart2 size={15} /> },
          { label: 'Financeiro', icon: <Database size={15} /> },
          { label: 'RH & Pessoas', icon: <Activity size={15} /> },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2.5 px-5 py-2 opacity-40"
            style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', cursor: 'default' }}
          >
            <span>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <span
              style={{
                fontSize: '0.58rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                padding: '2px 6px',
                borderRadius: '99px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              Soon
            </span>
          </div>
        ))}
      </nav>

      {/* Footer / User */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5 p-2 rounded-lg">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0 text-white font-bold"
            style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
              fontSize: '0.72rem',
            }}
          >
            TI
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
              TI Executivo
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
              {data.meta.empresa}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
