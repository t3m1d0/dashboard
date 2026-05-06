// ============================================================
// Topbar — Header com breadcrumb e ações
// ============================================================
import { Sun, Moon, Maximize2, Printer, Menu, Upload } from 'lucide-react'
import { useDashboardStore } from '@/store'
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

interface TopbarProps { onUploadClick: () => void }

export function Topbar({ onUploadClick }: TopbarProps) {
  const {
    activeSection, techSubSection,
    isDark, toggleTheme,
    uploadedSources, toggleSidebar,
  } = useDashboardStore()

  const [title, subtitle] = activeSection === 'tecnologia'
    ? SUB_TITLES[techSubSection]
    : ['Em Breve', 'Módulo em desenvolvimento']

  const uploadCount   = Object.keys(uploadedSources).length

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
        {/* Upload */}
        <button
          onClick={onUploadClick}
          className="relative flex items-center gap-1.5 px-3.5 py-2"
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
            fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)', transition: 'all var(--transition)',
          }}
        >
          <Upload size={14} />
          <span className="hidden sm:inline">Importar</span>
          {uploadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white font-bold"
              style={{ width: 18, height: 18, background: 'var(--accent)', fontSize: '0.6rem', border: '2px solid var(--bg-surface)' }}>
              {uploadCount}
            </span>
          )}
        </button>

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
    </header>
  )
}
