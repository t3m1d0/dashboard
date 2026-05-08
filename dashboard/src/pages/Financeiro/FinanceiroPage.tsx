// ============================================================
// pages/Financeiro/FinanceiroPage.tsx
// Embeds muniz_final.html with sub-section navigation
// Sidebar controls which page the iframe shows
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { useDashboardStore } from '@/store'
import { TokenStore } from '@/services/api'
import { Database, RefreshCw } from 'lucide-react'

const API_BASE = (import.meta.env.VITE_API_URL || '/api')

// Map sub-section id -> navPage() call in the HTML
const SUB_TO_PAGE: Record<string, string> = {
  overview:  'overview',
  dre:       'dre',
  cashflow:  'cashflow',
  balancete: 'balancete',
  pdca:      'pdca',
  kpis:      'kpis',
  alertas:   'alertas',
  recpag:    'recpag',
  upload:    'upload',
}

export function FinanceiroPage() {
  const { financeiroSubSection } = useDashboardStore()
  const iframeRef   = useRef<HTMLIFrameElement>(null)
  const [ready, setReady]     = useState(false)
  const [seeded, setSeeded]   = useState<boolean | null>(null)
  const [seeding, setSeeding] = useState(false)

  // Seed check on mount
  useEffect(() => { checkSeed() }, [])

  // Navigate iframe when sub-section changes
  useEffect(() => {
    if (!ready) return
    const page = SUB_TO_PAGE[financeiroSubSection] || 'overview'
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'MUNIZ_NAV', page },
      '*'
    )
  }, [financeiroSubSection, ready])

  const checkSeed = async () => {
    const token = TokenStore.get()
    if (!token) return
    try {
      const r = await fetch(`${API_BASE}/financeiro/lojas`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await r.json()
      setSeeded(Array.isArray(data) && data.length > 0)
    } catch { setSeeded(false) }
  }

  const handleSeed = async () => {
    setSeeding(true)
    const token = TokenStore.get()
    try {
      await fetch(`${API_BASE}/financeiro/seed/rede`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      setSeeded(true)
    } catch (e: any) {
      alert('Erro: ' + e.message)
    } finally { setSeeding(false) }
  }

  const handleIframeLoad = () => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    const token = TokenStore.get()

    // Send auth + config
    iframe.contentWindow.postMessage({
      type:    'MUNIZ_INIT',
      token,
      apiBase: window.location.origin + API_BASE,
      enabled: true,
    }, '*')

    // Navigate to current sub-section
    const page = SUB_TO_PAGE[financeiroSubSection] || 'overview'
    setTimeout(() => {
      iframe.contentWindow?.postMessage({ type: 'MUNIZ_NAV', page }, '*')
    }, 300)

    setReady(true)
  }

  // Listen for messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'MUNIZ_UPLOAD') handleUpload(e.data)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const handleUpload = async (data: any) => {
    const token = TokenStore.get()
    const form = new FormData()
    form.append('file', data.file)
    form.append('loja_codigo', data.loja_codigo)
    form.append('periodo', data.periodo)
    if (data.tipo) form.append('tipo', data.tipo)
    try {
      const r = await fetch(`${API_BASE}/financeiro/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const result = await r.json()
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'MUNIZ_UPLOAD_RESULT', result, requestId: data.requestId }, '*'
      )
    } catch (e: any) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'MUNIZ_UPLOAD_ERROR', error: e.message, requestId: data.requestId }, '*'
      )
    }
  }

  const SUB_TITLES: Record<string, string> = {
    overview:  'Visão Geral', dre: 'DRE', cashflow: 'Fluxo de Caixa',
    balancete: 'Balancete',   pdca: 'PDCA', kpis: 'KPIs',
    alertas:   'Alertas',     recpag: 'A Receber / Pagar', upload: 'Upload',
  }

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3" style={{ flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Financeiro — <span style={{ color: '#cc0000' }}>{SUB_TITLES[financeiroSubSection] || 'Dashboard'}</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            Rede Muniz Autocenter
          </p>
        </div>
        {seeded === false && (
          <button onClick={handleSeed} disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #cc0000, #991b1b)', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: seeding ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}>
            {seeding
              ? <><RefreshCw size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Importando…</>
              : <><Database size={14} /> Importar Estrutura da Rede</>}
          </button>
        )}
        {seeded === true && (
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', padding: '5px 12px', borderRadius: 99 }}>
            ✓ Rede carregada
          </span>
        )}
      </div>

      {/* Iframe — full height, sidebar/topbar of HTML hidden via CSS injection */}
      <div style={{ flex: 1, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', minHeight: '72vh' }}>
        <iframe
          ref={iframeRef}
          src="/financeiro/dashboard.html"
          onLoad={handleIframeLoad}
          style={{ width: '100%', height: '100%', minHeight: '72vh', border: 'none', display: 'block' }}
          title="Dashboard Financeiro"
          sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals allow-popups"
        />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
