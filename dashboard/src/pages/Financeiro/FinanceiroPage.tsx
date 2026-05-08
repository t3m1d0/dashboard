// ============================================================
// pages/Financeiro/FinanceiroPage.tsx
// Embeds the muniz_final.html dashboard with live API data
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { TokenStore } from '@/services/api'
import { Upload, RefreshCw, Database } from 'lucide-react'

const API_BASE = (import.meta.env.VITE_API_URL || '/api')

export function FinanceiroPage() {
  const iframeRef  = useRef<HTMLIFrameElement>(null)
  const [seeded, setSeeded]   = useState<boolean | null>(null)
  const [seeding, setSeeding] = useState(false)

  // Seed the rede structure on first load
  useEffect(() => {
    checkAndSeed()
  }, [])

  const checkAndSeed = async () => {
    const token = TokenStore.get()
    if (!token) return
    try {
      // Check if lojas already exist
      const r = await fetch(`${API_BASE}/financeiro/lojas?limit=1`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await r.json()
      if (Array.isArray(data) && data.length > 0) {
        setSeeded(true)
      } else {
        setSeeded(false)
      }
    } catch { setSeeded(false) }
  }

  const handleSeed = async () => {
    setSeeding(true)
    const token = TokenStore.get()
    try {
      const r = await fetch(`${API_BASE}/financeiro/seed/rede`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      const data = await r.json()
      setSeeded(true)
      // Reload iframe after seed
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src
      }
    } catch (e: any) {
      alert('Erro ao importar estrutura: ' + e.message)
    } finally { setSeeding(false) }
  }

  // Inject token + API config into the iframe after load
  const handleIframeLoad = () => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return

    const token = TokenStore.get()

    // Inject ERP config and token into the HTML dashboard
    try {
      iframe.contentWindow.postMessage({
        type: 'MUNIZ_INIT',
        token,
        apiBase: window.location.origin + API_BASE,
        enabled: true,
      }, '*')
    } catch (e) {
      console.warn('iframe postMessage failed:', e)
    }
  }

  // Listen for upload requests from iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'MUNIZ_UPLOAD') {
        handleUploadFromIframe(event.data)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const handleUploadFromIframe = async (data: any) => {
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
      iframeRef.current?.contentWindow?.postMessage({
        type: 'MUNIZ_UPLOAD_RESULT',
        result,
        requestId: data.requestId,
      }, '*')
    } catch (e: any) {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'MUNIZ_UPLOAD_ERROR',
        error: e.message,
        requestId: data.requestId,
      }, '*')
    }
  }

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3" style={{ flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Dashboard <span style={{ color: '#cc0000' }}>Financeiro</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            Rede Muniz Autocenter — DRE, Fluxo de Caixa, Balancete, PDCA
          </p>
        </div>

        <div className="flex items-center gap-2">
          {seeded === false && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #cc0000, #991b1b)',
                color: '#fff', border: 'none', fontSize: '0.82rem',
                fontWeight: 600, cursor: seeding ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              {seeding
                ? <><RefreshCw size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Importando estrutura…</>
                : <><Database size={14} /> Importar Estrutura da Rede</>
              }
            </button>
          )}

          {seeded === true && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', fontSize: '0.72rem', fontWeight: 600, color: '#10b981' }}>
              ✓ Estrutura da rede carregada
            </span>
          )}
        </div>
      </div>

      {/* Embedded dashboard */}
      <div style={{
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        position: 'relative',
        minHeight: '75vh',
      }}>
        <iframe
          ref={iframeRef}
          src="/financeiro/dashboard.html"
          onLoad={handleIframeLoad}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            minHeight: '75vh',
            display: 'block',
          }}
          title="Dashboard Financeiro Muniz"
          sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals"
        />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
