// ============================================================
// App — Root component with routing and theme
// ============================================================
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/Layout/AppShell'
import { Loader } from '@/components/UI/Loader'
import { UploadModal } from '@/components/Upload/UploadModal'
import { useDashboardStore } from '@/store'

// Pages
import { OverviewPage }       from '@/pages/OverviewPage'
import { SustentacaoPage }    from '@/pages/SustentacaoPage'
import { DesenvolvimentoPage } from '@/pages/DesenvolvimentoPage'
import { EntregasPage }       from '@/pages/EntregasPage'
import { EstrategicaPage }    from '@/pages/EstrategicaPage'
import { RoadmapPage }        from '@/pages/RoadmapPage'

const PAGE_MAP = {
  overview:      <OverviewPage />,
  sustentacao:   <SustentacaoPage />,
  desenvolvimento: <DesenvolvimentoPage />,
  entregas:      <EntregasPage />,
  estrategica:   <EstrategicaPage />,
  roadmap:       <RoadmapPage />,
}

export default function App() {
  const { activeSection, isDark, isLoading, setLoading } = useDashboardStore()
  const [uploadOpen, setUploadOpen] = useState(false)

  // Hide loader after mount
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.className = isDark ? '' : 'light'
  }, [isDark])

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
