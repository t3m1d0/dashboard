// ============================================================
// App.tsx — Root com autenticação + dados da API
// ============================================================
import { useEffect, useState } from 'react'
import { AppShell }        from '@/components/Layout/AppShell'
import { Loader }          from '@/components/UI/Loader'
import { UploadModal }     from '@/components/Upload/UploadModal'
import { LoginPage }       from '@/pages/LoginPage'
import { useDashboardStore } from '@/store'
import { AuthAPI, TokenStore, DashboardAPI } from '@/services/api'

import { OverviewPage }        from '@/pages/OverviewPage'
import { SustentacaoPage }     from '@/pages/SustentacaoPage'
import { DesenvolvimentoPage } from '@/pages/DesenvolvimentoPage'
import { EntregasPage }        from '@/pages/EntregasPage'
import { EstrategicaPage }     from '@/pages/EstrategicaPage'
import { RoadmapPage }         from '@/pages/RoadmapPage'

const PAGE_MAP: Record<string, React.ReactNode> = {
  overview:       <OverviewPage />,
  sustentacao:    <SustentacaoPage />,
  desenvolvimento: <DesenvolvimentoPage />,
  entregas:       <EntregasPage />,
  estrategica:    <EstrategicaPage />,
  roadmap:        <RoadmapPage />,
}

export default function App() {
  const { activeSection, isDark, isLoading, setLoading, setData } = useDashboardStore()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    document.documentElement.className = isDark ? '' : 'light'
  }, [isDark])

  useEffect(() => {
    const init = async () => {
      const token = TokenStore.get()
      if (!token) { setAuthed(false); setLoading(false); return }
      try {
        const data = await DashboardAPI.getOverview()
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
      const data = await DashboardAPI.getOverview()
      setData(data)
    } catch { /* usa dados padrão */ }
    setAuthed(true)
  }

  if (authed === null) return <Loader isVisible={true} />

  if (!authed) {
    return <LoginPage onSuccess={handleLoginSuccess} />
  }

  return (
    <>
      <Loader isVisible={isLoading} />
      <AppShell onUploadClick={() => setUploadOpen(true)}>
        <div key={activeSection} className="animate-fade-in">
          {PAGE_MAP[activeSection]}
        </div>
      </AppShell>
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  )
}
