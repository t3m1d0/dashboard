// ============================================================
// App.tsx — Root com nova estrutura de navegação
// ============================================================
import { useEffect, useState } from 'react'
import { AppShell }          from '@/components/Layout/AppShell'
import { Loader }            from '@/components/UI/Loader'
import { UploadModal }       from '@/components/Upload/UploadModal'
import { LoginPage }         from '@/pages/LoginPage'
import { useDashboardStore } from '@/store'
import { AuthAPI, TokenStore, DashboardAPI } from '@/services/api'
import type { TechSubSection } from '@/types'

// Pages
import { OverviewPage }        from '@/pages/OverviewPage'
import { SustentacaoPage }     from '@/pages/SustentacaoPage'
import { DesenvolvimentoPage } from '@/pages/DesenvolvimentoPage'
import { EntregasPage }        from '@/pages/EntregasPage'
import { EstrategicaPage }     from '@/pages/EstrategicaPage'
import { RoadmapPage }         from '@/pages/RoadmapPage'

const TECH_PAGES: Record<TechSubSection, React.ReactNode> = {
  overview:        <OverviewPage />,
  sustentacao:     <SustentacaoPage />,
  desenvolvimento: <DesenvolvimentoPage />,
  entregas:        <EntregasPage />,
  estrategica:     <EstrategicaPage />,
  roadmap:         <RoadmapPage />,
}

// Placeholder para módulos futuros
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center animate-fade-in">
      <div className="text-6xl">🚧</div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{label}</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 360 }}>
        Este módulo está em desenvolvimento. Em breve estará disponível com integrações completas.
      </p>
    </div>
  )
}

export default function App() {
  const {
    activeSection, techSubSection,
    isDark, isLoading, setLoading, setData, setCurrentUser,
  } = useDashboardStore()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [authed, setAuthed]         = useState<boolean | null>(null)

  // Tema
  useEffect(() => {
    document.documentElement.className = isDark ? '' : 'light'
  }, [isDark])

  // Auth expired event
  useEffect(() => {
    const handler = () => { setAuthed(false); setLoading(false) }
    window.addEventListener('auth:expired', handler)
    return () => window.removeEventListener('auth:expired', handler)
  }, [])

  // Init
  useEffect(() => {
    const init = async () => {
      const token = TokenStore.get()
      if (!token) { setAuthed(false); setLoading(false); return }
      try {
        const [user, data] = await Promise.all([AuthAPI.me(), DashboardAPI.getOverview()])
        setCurrentUser(user)
        setData(data)
        setAuthed(true)
      } catch {
        TokenStore.clear()
        setAuthed(false)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleLoginSuccess = async () => {
    try {
      const [user, data] = await Promise.all([AuthAPI.me(), DashboardAPI.getOverview()])
      setCurrentUser(user)
      setData(data)
    } catch {}
    setAuthed(true)
  }

  if (authed === null) return <Loader isVisible={true} />
  if (!authed)         return <LoginPage onSuccess={handleLoginSuccess} />

  // Renderizar conteúdo baseado na seção ativa
  const content = (() => {
    if (activeSection === 'tecnologia') {
      return TECH_PAGES[techSubSection] || <OverviewPage />
    }
    if (activeSection === 'marketing')  return <ComingSoon label="Marketing & Growth" />
    if (activeSection === 'financeiro') return <ComingSoon label="Financeiro & DRE" />
    if (activeSection === 'rh')         return <ComingSoon label="RH & Pessoas" />
    return <OverviewPage />
  })()

  return (
    <>
      <Loader isVisible={isLoading} />
      <AppShell onUploadClick={() => setUploadOpen(true)}>
        <div key={`${activeSection}-${techSubSection}`} className="animate-fade-in">
          {content}
        </div>
      </AppShell>
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  )
}
