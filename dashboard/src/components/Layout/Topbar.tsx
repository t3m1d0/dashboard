// ============================================================
// Topbar — Header com breadcrumb e ações
// ============================================================
import { Sun, Moon, Maximize2, Printer, Menu } from 'lucide-react'
import React from 'react'
import { useDashboardStore } from '@/store'
import { LojasAPI } from '@/services/api'
import { Building2, X, ChevronDown } from 'lucide-react'
import { useSectionPeriodo } from '@/hooks/useSectionPeriodo'
import type { TechSubSection } from '@/types'

const SUB_TITLES: Record<TechSubSection, [string, string]> = {
  overview:        ['Visão Geral',          'Relatório consolidado'],
  sustentacao:     ['Sustentação',          'Chamados e SLA'],
  desenvolvimento: ['Desenvolvimento',      'Projetos e Redmine'],
  entregas:        ['Entregas',             'Projetos concluídos'],
  estrategica:     ['Visão Estratégica',    'Valor da TI para o negócio'],
  roadmap:         ['Roadmap',              'Planejamento futuro'],
}

interface TopbarProps {}

// ── Seletor global de loja ────────────────────────────────────
function LojaSelector() {
  const { lojaAtiva, setLojaAtiva, lojas, setLojas } = useDashboardStore()
  const [open, setOpen]   = React.useState(false)
  const [busca, setBusca] = React.useState('')
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    if (!loaded) {
      import('@/services/api').then(({ LojasAPI }) => {
        LojasAPI.list({ page_size: 500 })
          .then((r: any) => { setLojas(r.items || []); setLoaded(true) })
          .catch(() => {})
      })
    }
  }, [loaded])

  const filtered = lojas.filter((l: any) =>
    !busca || l.nome.toLowerCase().includes(busca.toLowerCase()) ||
    String(l.codigo).includes(busca)
  )

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 10, background: lojaAtiva ? 'rgba(245,158,11,0.1)' : 'var(--bg-elevated)', border: `1px solid ${lojaAtiva ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`, color: lojaAtiva ? '#f59e0b' : 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
      >
        <Building2 size={13} />
        <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lojaAtiva ? lojaAtiva.nome : 'Todas as lojas'}
        </span>
        {lojaAtiva
          ? <X size={12} onClick={e => { e.stopPropagation(); setLojaAtiva(null) }} />
          : <ChevronDown size={12} />
        }
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 50, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', width: 340, maxHeight: 480, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <input autoFocus placeholder="Buscar loja..." value={busca} onChange={e => setBusca(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none' }} />
            </div>
            <button onClick={() => { setLojaAtiva(null); setOpen(false); setBusca('') }}
              style={{ padding: '10px 14px', textAlign: 'left', background: !lojaAtiva ? 'rgba(245,158,11,0.08)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', color: !lojaAtiva ? '#f59e0b' : 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: !lojaAtiva ? 700 : 400, fontFamily: 'var(--font-body)', flexShrink: 0 }}>
              🏢 Todas as lojas ({lojas.length})
            </button>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.slice(0, 100).map((l: any) => (
                <button key={l.id} onClick={() => { setLojaAtiva(l); setOpen(false); setBusca('') }}
                  style={{ width: '100%', padding: '8px 14px', textAlign: 'left', background: lojaAtiva?.id === l.id ? 'rgba(245,158,11,0.08)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = lojaAtiva?.id === l.id ? 'rgba(245,158,11,0.08)' : 'transparent' }}
                >
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 500, color: lojaAtiva?.id === l.id ? '#f59e0b' : 'var(--text-primary)' }}>{l.nome}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>{l.cnpj_cpf}{l.uf ? ' · ' + l.uf : ''}</div>
                  </div>
                  {l.uf && <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-muted)', flexShrink: 0 }}>{l.uf}</span>}
                </button>
              ))}
              {filtered.length > 100 && (
                <div style={{ padding: '8px 14px', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>Use a busca para refinar ({filtered.length} resultados)</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


export function Topbar({}: TopbarProps) {
  const {
    activeSection, techSubSection,
    isDark, toggleTheme, toggleSidebar,
  } = useDashboardStore()

  const [title, subtitle] = (() => {
    if (activeSection === 'tecnologia') return SUB_TITLES[techSubSection]
    if (activeSection === 'compras')    return ['Movimentação', 'Compras e estoque por filial']
    if (activeSection === 'financeiro') return ['Dashboard Financeiro', 'DRE · Fluxo de Caixa · Balancete · PDCA']
    if (activeSection === 'gente')         return ['Gente e Gestão', 'Folha · Colaboradores · Férias · Indicadores RH']
    if (activeSection === 'configuracoes')  return ['Configurações', 'Lojas · Filiais · Cadastros']
    return ['Em Breve', 'Módulo em desenvolvimento']
  })()


  const btnStyle: React.CSSProperties = {
    width: 36, height: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition)',
    flexShrink: 0,
  }

  return (
    <header
      className="flex items-center gap-3.5 px-6 sticky top-0 z-50"
      style={{
        height: 'var(--topbar-height)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Mobile menu */}
      <button className="lg:hidden" style={btnStyle} onClick={toggleSidebar}>
        <Menu size={16} />
      </button>

      {/* Breadcrumb + title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {activeSection === 'tecnologia' && (
            <>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tecnologia</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/</span>
            </>
          )}
          {activeSection === 'financeiro' && (
            <>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Financeiro</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/</span>
            </>
          )}
          {activeSection === 'gente' && (
            <>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gente e Gestão</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/</span>
            </>
          )}
          {activeSection === 'compras' && (
            <>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Compras</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/</span>
            </>
          )}
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          {subtitle}
        </div>
      </div>

      {/* Live indicator */}
      <div className="hidden sm:flex items-center gap-2">
        <span className="live-dot" />
        <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Ao Vivo</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button style={btnStyle} onClick={toggleTheme} title={isDark ? 'Modo Claro' : 'Modo Escuro'}>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button style={btnStyle} onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.() }} className="hidden sm:flex">
          <Maximize2 size={16} />
        </button>

        <button
          className="flex items-center gap-1.5"
          style={{ ...btnStyle, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none', color: '#fff', width: 'auto', padding: '0 14px', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-body)' }}
          onClick={() => window.print()}
        >
          <Printer size={14} />
          <span className="hidden sm:inline">PDF</span>
        </button>
      </div>

      {/* Seletor global de loja */}
      <LojaSelector />
    </header>
  )
}
