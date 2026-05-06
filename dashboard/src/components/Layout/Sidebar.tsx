// ============================================================
// Sidebar — Navegação principal com grupos e sub-menus
// ============================================================
import { useState } from 'react'
import { useDashboardStore } from '@/store'
import type { Section, TechSubSection } from '@/types'
import {
  LayoutDashboard, Headphones, Code2, PackageCheck,
  TrendingUp, Map, ChevronDown, BarChart2, Database,
  Users, Cpu, Building2, LogOut
} from 'lucide-react'
import { TokenStore } from '@/services/api'

// ── Configuração dos grupos de navegação ──────────────────────
const GROUPS: {
  id: Section
  label: string
  icon: React.ReactNode
  color: string
  available: boolean
  subs?: { id: TechSubSection; label: string; icon: React.ReactNode }[]
}[] = [
  {
    id: 'tecnologia',
    label: 'Tecnologia',
    icon: <Cpu size={15} />,
    color: '#8b5cf6',
    available: true,
    subs: [
      { id: 'overview',      label: 'Visão Geral',      icon: <LayoutDashboard size={13} /> },
      { id: 'sustentacao',   label: 'Sustentação',       icon: <Headphones size={13} /> },
      { id: 'desenvolvimento', label: 'Desenvolvimento', icon: <Code2 size={13} /> },
      { id: 'entregas',      label: 'Entregas',          icon: <PackageCheck size={13} /> },
      { id: 'estrategica',   label: 'Visão Estratégica', icon: <TrendingUp size={13} /> },
      { id: 'roadmap',       label: 'Roadmap',           icon: <Map size={13} /> },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: <BarChart2 size={15} />,
    color: '#ec4899',
    available: false,
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: <Database size={15} />,
    color: '#f59e0b',
    available: false,
  },
  {
    id: 'rh',
    label: 'RH & Pessoas',
    icon: <Users size={15} />,
    color: '#06b6d4',
    available: false,
  },
]

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
]

export function Sidebar() {
  const {
    activeSection, setActiveSection,
    techSubSection, setTechSubSection,
    techExpanded, setTechExpanded,
    periodo, setPeriodo,
    data, currentUser,
  } = useDashboardStore()

  const handleGroupClick = (group: typeof GROUPS[0]) => {
    if (!group.available) return
    setActiveSection(group.id)
    if (group.id === 'tecnologia') setTechExpanded(!techExpanded)
  }

  const handleSubClick = (sub: TechSubSection) => {
    setActiveSection('tecnologia')
    setTechSubSection(sub)
    if (window.innerWidth <= 900) useDashboardStore.getState().setSidebarOpen(false)
  }

  const handleLogout = () => {
    TokenStore.clear()
    window.dispatchEvent(new CustomEvent('auth:expired'))
  }

  const yearOptions = [2024, 2025, 2026, 2027]

  const navItemBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '9px 20px', fontSize: '0.83rem', fontFamily: 'var(--font-body)',
    cursor: 'pointer', border: 'none', textAlign: 'left', transition: 'all 0.2s',
  }

  return (
    <aside className="flex flex-col h-full" style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Brand */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex flex-col gap-0.5 mb-4">
          <span className="text-white font-bold" style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.08em' }}>
            MUNIZ
          </span>
          <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em' }}>
            STRATEGIC CENTER
          </span>
        </div>

        {/* Filtro de período */}
        <div className="rounded-xl p-3" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)' }}>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Período
          </div>
          <div className="flex gap-2">
            <select
              value={periodo.mes}
              onChange={e => setPeriodo({ ...periodo, mes: Number(e.target.value) })}
              style={{
                flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, padding: '5px 8px', fontSize: '0.72rem', color: '#fff',
                fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value={0}>Todos</option>
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>{m.slice(0, 3)}</option>
              ))}
            </select>
            <select
              value={periodo.ano}
              onChange={e => setPeriodo({ ...periodo, ano: Number(e.target.value) })}
              style={{
                width: 64, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, padding: '5px 6px', fontSize: '0.72rem', color: '#fff',
                fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none',
              }}
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#8b5cf6', marginTop: 6, fontWeight: 600 }}>
            {periodo.mes === 0 ? 'Todos os meses' : `${MESES[periodo.mes - 1]} ${periodo.ano}`}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {GROUPS.map(group => {
          const isActive   = activeSection === group.id
          const isExpanded = isActive && group.subs && techExpanded

          return (
            <div key={group.id}>
              {/* Group header button */}
              <button
                onClick={() => handleGroupClick(group)}
                disabled={!group.available}
                style={{
                  ...navItemBase,
                  color: isActive ? '#fff' : group.available ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                  background: isActive ? `${group.color}18` : 'transparent',
                  borderLeft: `3px solid ${isActive ? group.color : 'transparent'}`,
                  opacity: group.available ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (group.available && !isActive) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = group.available ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <span style={{ color: isActive ? group.color : 'inherit', flexShrink: 0 }}>{group.icon}</span>
                <span style={{ flex: 1, fontWeight: isActive ? 700 : 500 }}>{group.label}</span>

                {!group.available && (
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.07)' }}>
                    Em breve
                  </span>
                )}

                {group.subs && group.available && (
                  <ChevronDown
                    size={13}
                    style={{
                      color: 'rgba(255,255,255,0.3)',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.25s',
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>

              {/* Sub-items */}
              {group.subs && isExpanded && (
                <div
                  style={{
                    borderLeft: `2px solid ${group.color}30`,
                    marginLeft: 28,
                    marginBottom: 4,
                    marginTop: 2,
                  }}
                >
                  {group.subs.map(sub => {
                    const subActive = techSubSection === sub.id && activeSection === 'tecnologia'
                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleSubClick(sub.id)}
                        style={{
                          ...navItemBase,
                          padding: '7px 14px',
                          fontSize: '0.79rem',
                          color: subActive ? '#fff' : 'rgba(255,255,255,0.45)',
                          background: subActive ? `${group.color}15` : 'transparent',
                          borderLeft: `2px solid ${subActive ? group.color : 'transparent'}`,
                          marginLeft: -2,
                          fontWeight: subActive ? 600 : 400,
                        }}
                        onMouseEnter={(e) => {
                          if (!subActive) {
                            e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!subActive) {
                            e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
                            e.currentTarget.style.background = 'transparent'
                          }
                        }}
                      >
                        <span style={{ color: subActive ? group.color : 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{sub.icon}</span>
                        <span>{sub.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5 p-2 rounded-lg">
          <div className="flex items-center justify-center rounded-full flex-shrink-0 text-white font-bold"
            style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', fontSize: '0.7rem' }}>
            {currentUser?.nome?.slice(0,2).toUpperCase() || 'TI'}
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.nome || 'TI Executivo'}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)' }}>
              {data.meta.empresa || 'Grupo Franqueador'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, color: '#f87171', cursor: 'pointer', flexShrink: 0 }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
