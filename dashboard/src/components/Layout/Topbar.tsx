// ============================================================
// Topbar — Header with actions
// ============================================================
import { Sun, Moon, Maximize2, Printer, Menu, Upload } from 'lucide-react'
import { useDashboardStore } from '@/store'
import type { Section } from '@/types'

const SECTION_TITLES: Record<Section, [string, string]> = {
  overview:      ['Visão Geral Executiva', 'Relatório Mensal Consolidado'],
  sustentacao:   ['Equipe de Sustentação', 'Análise de chamados e SLA'],
  desenvolvimento: ['Equipe de Desenvolvimento', 'Board de projetos e entregas'],
  entregas:      ['Entregas Estratégicas', 'Projetos concluídos e impactos'],
  estrategica:   ['Visão Estratégica', 'Valor da TI para o negócio'],
  roadmap:       ['Roadmap & Próximos Passos', 'Planejamento e iniciativas futuras'],
}

interface TopbarProps {
  onUploadClick: () => void
}

export function Topbar({ onUploadClick }: TopbarProps) {
  const { activeSection, isDark, toggleTheme, data, uploadedSources, toggleSidebar } = useDashboardStore()
  const [title, subtitle] = SECTION_TITLES[activeSection]
  const uploadCount = Object.keys(uploadedSources).length

  const handleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  const btnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
      {/* Mobile menu toggle */}
      <button
        className="lg:hidden"
        style={btnStyle}
        onClick={toggleSidebar}
      >
        <Menu size={16} />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 1 }}>
          {data.meta.mes} {data.meta.ano} · {subtitle}
        </div>
      </div>

      {/* Live indicator */}
      <div className="hidden sm:flex items-center gap-2">
        <span className="live-dot" />
        <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
          Ao Vivo
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Upload button */}
        <button
          onClick={onUploadClick}
          className="relative flex items-center gap-1.5 px-3.5 py-2"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            transition: 'all var(--transition)',
          }}
        >
          <Upload size={14} />
          <span className="hidden sm:inline">Importar</span>
          {uploadCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white font-bold"
              style={{
                width: 18,
                height: 18,
                background: 'var(--accent)',
                fontSize: '0.6rem',
                border: '2px solid var(--bg-surface)',
              }}
            >
              {uploadCount}
            </span>
          )}
        </button>

        {/* Theme toggle */}
        <button
          style={btnStyle}
          onClick={toggleTheme}
          title={isDark ? 'Modo Claro' : 'Modo Escuro'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Fullscreen */}
        <button style={btnStyle} onClick={handleFullscreen} title="Tela cheia" className="hidden sm:flex">
          <Maximize2 size={16} />
        </button>

        {/* Print */}
        <button
          style={{
            ...btnStyle,
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            border: 'none',
            color: '#fff',
            gap: 6,
            padding: '0 14px',
            width: 'auto',
            fontSize: '0.82rem',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
          }}
          onClick={() => window.print()}
          title="Exportar PDF"
          className="flex items-center"
        >
          <Printer size={14} />
          <span className="hidden sm:inline">PDF</span>
        </button>
      </div>
    </header>
  )
}
