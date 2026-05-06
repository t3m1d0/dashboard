// ============================================================
// DesenvolvimentoPage.tsx — Módulo completo de Dev com Redmine
// ============================================================
import { useEffect, useState } from 'react'
import { LayoutDashboard, ListTodo, Users, Settings, Zap } from 'lucide-react'
import { PeriodoSelector } from '@/components/UI/PeriodoSelector'
import { useRedmineStore } from '@/store/redmine'
import { RedmineAPI } from '@/services/api'
import type { DevSubSection } from '@/types'
import { DashboardView } from './Desenvolvimento/DashboardView'
import { TarefasView }   from './Desenvolvimento/TarefasView'
import { EquipeView }    from './Desenvolvimento/EquipeView'
import { ConfigView }    from './Desenvolvimento/ConfigView'

const TABS: { id: DevSubSection; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard',  icon: <LayoutDashboard size={15} /> },
  { id: 'tarefas',   label: 'Tarefas',    icon: <ListTodo size={15} /> },
  { id: 'equipe',    label: 'Equipe',     icon: <Users size={15} /> },
  { id: 'config',    label: 'Configurar', icon: <Settings size={15} /> },
]

function SetupPrompt({ onConfig }: { onConfig: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="flex items-center justify-center rounded-2xl" style={{ width: 64, height: 64, background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
        <Zap size={32} />
      </div>
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Integre com o Redmine</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 380 }}>
          Conecte sua instância do Redmine para visualizar tarefas, métricas da equipe e dashboards em tempo real.
        </p>
      </div>
      <button onClick={onConfig} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', border: 'none', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}>
        <Settings size={15} /> Configurar Redmine
      </button>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Compatível com Redmine 4.x e 5.x · API Key necessária</p>
    </div>
  )
}

export function DesenvolvimentoPage() {
  const { subSection, setSubSection, dashboard, setDashboard, setProjetos, setFiltros, dashboardCachedAt, setDashboardCachedAt } = useRedmineStore()
  const [configChecked, setConfigChecked] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const [cfg, projs, filts] = await Promise.allSettled([
          RedmineAPI.getConfig(), RedmineAPI.getProjetos(), RedmineAPI.getFiltros(),
        ])
        if (projs.status === 'fulfilled') setProjetos(projs.value)
        if (filts.status === 'fulfilled') setFiltros(filts.value)
        const isConfigured = cfg.status === 'fulfilled' && cfg.value?.configurado
        if (isConfigured) {
          const now = Date.now()
          if (!dashboardCachedAt || (now - dashboardCachedAt) > 5 * 60 * 1000) {
            try { const dash = await RedmineAPI.getDashboard(); setDashboard(dash); setDashboardCachedAt(now) } catch {}
          }
        }
      } catch {} finally { setConfigChecked(true) }
    }
    init()
  }, [])

  const isConfigured = dashboard?.configurado ?? false

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
    fontSize: '0.82rem', fontWeight: 600,
    color: active ? '#fff' : 'var(--text-secondary)',
    background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
    borderBottom: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
    borderBottomStyle: 'solid', borderBottomWidth: 2,
    borderBottomColor: active ? '#8b5cf6' : 'transparent',
    marginBottom: -1, cursor: 'pointer', fontFamily: 'var(--font-body)',
    transition: 'all 0.2s', whiteSpace: 'nowrap',
  })

  return (
    <div className="animate-fade-in">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Equipe de <span style={{ color: '#8b5cf6' }}>Desenvolvimento</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            Gestão integrada via Redmine · {isConfigured ? 'Conectado ✓' : 'Não configurado'}
            {isConfigured && dashboard?.ultimo_sync && (
              <span style={{ color: 'var(--text-muted)' }}>
                {' '}· {new Date(dashboard.ultimo_sync).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
      </div>

      {isConfigured && <div className="flex justify-end mb-2"><PeriodoSelector secao="desenvolvimento" /></div>}
      <div className="flex mb-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setSubSection(tab.id)} style={tabStyle(subSection === tab.id)}>
            {tab.icon}<span>{tab.label}</span>
          </button>
        ))}
      </div>

      {!configChecked ? (
        <div className="flex items-center justify-center py-20">
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#8b5cf6', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : subSection === 'config' ? <ConfigView />
        : !isConfigured        ? <SetupPrompt onConfig={() => setSubSection('config')} />
        : subSection === 'dashboard' ? <DashboardView />
        : subSection === 'tarefas'   ? <TarefasView />
        : subSection === 'equipe'    ? <EquipeView />
        : null}
    </div>
  )
}
