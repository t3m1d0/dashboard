// ============================================================
// ImportacaoSustentacao.tsx
// Modal de importação de dados para a página de Sustentação
// ============================================================
import { useState, useCallback, useRef } from 'react'
import { SustentacaoUploadAPI, DashboardAPI } from '@/services/api'
import { useDashboardStore } from '@/store'
import {
  X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Info, Download, ChevronRight, BarChart2, List, RefreshCw
} from 'lucide-react'

type Modo = 'chamados' | 'kpis'

interface ImportResult {
  total_importado: number
  nome_arquivo: string
  resultado: {
    tipo: string
    importados: number
    erros?: number
    por_categoria?: Record<string, number>
    por_status?: Record<string, number>
    colunas_mapeadas?: string[]
    primeiros_erros?: string[]
  }
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ImportacaoSustentacao({ isOpen, onClose, onSuccess }: Props) {
  const { setData } = useDashboardStore()
  const [modo, setModo]           = useState<Modo>('chamados')
  const [isDragging, setDragging] = useState(false)
  const [file, setFile]           = useState<File | null>(null)
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<ImportResult | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [template, setTemplate]   = useState<any>(null)
  const [showTemplate, setShowTemplate] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null); setResult(null); setError(null); setShowTemplate(false)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); setResult(null); setError(null) }
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setResult(null); setError(null) }
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await SustentacaoUploadAPI.upload(file, modo)
      setResult(res)
      // Refetch dashboard data
      DashboardAPI.getOverview().then(setData).catch(() => {})
      onSuccess?.()
    } catch (e: any) {
      setError(e.message || 'Erro ao importar')
    } finally {
      setLoading(false)
    }
  }

  const loadTemplate = async () => {
    try {
      const t = await SustentacaoUploadAPI.getTemplate(modo)
      setTemplate(t)
      setShowTemplate(true)
    } catch {}
  }

  if (!isOpen) return null

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '7px 12px', fontSize: '0.82rem',
    color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none',
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />

      <div
        className="relative z-10 w-full overflow-y-auto"
        style={{
          maxWidth: 620, maxHeight: '90vh',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Importar Dados de Sustentação</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Excel (.xlsx) ou CSV com dados de chamados ou KPIs mensais
              </div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">

          {/* Modo selector */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Tipo de dados
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { id: 'chamados', icon: <List size={18}/>, label: 'Chamados Individuais', desc: 'Registros linha a linha de tickets' },
                { id: 'kpis',     icon: <BarChart2 size={18}/>, label: 'KPIs Mensais', desc: 'Totais e métricas por mês' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setModo(opt.id); reset() }}
                  className="flex flex-col gap-2 p-3.5 rounded-xl text-left transition-all"
                  style={{
                    background: modo === opt.id ? 'rgba(59,130,246,0.08)' : 'var(--bg-card)',
                    border: `1px solid ${modo === opt.id ? '#3b82f6' : 'var(--border)'}`,
                    boxShadow: modo === opt.id ? '0 0 0 2px rgba(59,130,246,0.15)' : 'none',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  <div style={{ color: modo === opt.id ? '#3b82f6' : 'var(--text-secondary)' }}>{opt.icon}</div>
                  <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Template guide */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={showTemplate ? () => setShowTemplate(false) : loadTemplate}
              className="w-full flex items-center gap-2.5 p-3"
              style={{ background: 'var(--bg-elevated)', cursor: 'pointer', border: 'none', fontFamily: 'var(--font-body)' }}
            >
              <Info size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1, textAlign: 'left' }}>
                Ver colunas esperadas para {modo === 'chamados' ? 'Chamados' : 'KPIs Mensais'}
              </span>
              <ChevronRight size={13} style={{ color: 'var(--text-muted)', transform: showTemplate ? 'rotate(90deg)' : '', transition: '0.2s' }} />
            </button>

            {showTemplate && template && (
              <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex flex-col gap-2.5">
                  {/* Obrigatórias */}
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Obrigatórias
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {template.colunas_obrigatorias?.map((c: string) => (
                        <span key={c} style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)' }}>{c}</span>
                      ))}
                    </div>
                  </div>
                  {/* Opcionais */}
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Opcionais
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {template.colunas_opcionais?.map((c: string) => (
                        <span key={c} style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', background: 'var(--bg-card)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>{c}</span>
                      ))}
                    </div>
                  </div>
                  {/* Exemplo */}
                  {template.exemplo && (
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Exemplo de linha
                      </div>
                      <div className="rounded-lg overflow-x-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                          <thead>
                            <tr>
                              {Object.keys(template.exemplo[0] || {}).map((k: string) => (
                                <th key={k} style={{ padding: '5px 8px', textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 700, whiteSpace: 'nowrap' }}>{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {template.exemplo.slice(0, 2).map((row: any, i: number) => (
                              <tr key={i}>
                                {Object.values(row).map((v: any, j: number) => (
                                  <td key={j} style={{ padding: '5px 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{String(v)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    💡 Os nomes das colunas não precisam ser exatos — o sistema reconhece variações em português.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drop zone */}
          {!result && (
            <div>
              <label
                className="flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${isDragging ? '#3b82f6' : file ? '#10b981' : 'var(--border)'}`,
                  background: isDragging ? 'rgba(59,130,246,0.04)' : file ? 'rgba(16,185,129,0.04)' : 'var(--bg-card)',
                  padding: '28px 20px', textAlign: 'center',
                }}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !file && inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />

                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 size={28} style={{ color: '#10b981' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>{file.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {(file.size / 1024).toFixed(0)} KB
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); e.preventDefault(); setFile(null); setError(null) }}
                      style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Trocar arquivo
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center rounded-full"
                      style={{ width: 48, height: 48, background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>
                      <Upload size={22} />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Arraste o arquivo ou <span style={{ color: '#3b82f6', fontWeight: 600 }}>clique para selecionar</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      .xlsx · .xls · .csv — máx. {settings?.MAX_UPLOAD_SIZE_MB || 10}MB
                    </div>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: '0.8rem' }}>{error}</div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="flex items-center gap-2.5 p-3.5"
                style={{ background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                    {result.total_importado} registro{result.total_importado !== 1 ? 's' : ''} importado{result.total_importado !== 1 ? 's' : ''}!
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{result.nome_arquivo}</div>
                </div>
              </div>

              <div className="p-3.5">
                {/* Colunas mapeadas */}
                {result.resultado.colunas_mapeadas && result.resultado.colunas_mapeadas.length > 0 && (
                  <div className="mb-3">
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 6 }}>Colunas reconhecidas:</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {result.resultado.colunas_mapeadas.map(c => (
                        <span key={c} style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '1px 7px', borderRadius: 4 }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Por categoria */}
                {result.resultado.por_categoria && Object.keys(result.resultado.por_categoria).length > 0 && (
                  <div className="mb-3">
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 6 }}>Por categoria:</div>
                    <div className="flex flex-col gap-1">
                      {Object.entries(result.resultado.por_categoria).slice(0, 5).map(([cat, count]) => (
                        <div key={cat} className="flex items-center gap-2">
                          <div style={{ flex: 1, height: 4, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(count / result.total_importado) * 100}%`, background: '#3b82f6', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{cat}: <strong>{count}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Erros */}
                {(result.resultado.erros || 0) > 0 && (
                  <div className="p-2.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#f59e0b' }}>
                      ⚠ {result.resultado.erros} linha{result.resultado.erros !== 1 ? 's' : ''} com erro (ignorada{result.resultado.erros !== 1 ? 's' : ''})
                    </div>
                    {result.resultado.primeiros_erros?.map((e, i) => (
                      <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{e}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5">
            {result ? (
              <>
                <button onClick={reset} className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 justify-center"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  <RefreshCw size={14} /> Importar outro
                </button>
                <button onClick={onClose} className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 justify-center"
                  style={{ background: '#10b981', color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  <CheckCircle2 size={14} /> Concluir
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose}
                  style={{ padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Cancelar
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl flex-1 justify-center"
                  style={{
                    background: file && !loading ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'var(--bg-elevated)',
                    color: file && !loading ? '#fff' : 'var(--text-muted)',
                    border: 'none', fontSize: '0.85rem', fontWeight: 600,
                    cursor: file && !loading ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--font-body)',
                    boxShadow: file && !loading ? '0 4px 14px rgba(59,130,246,0.3)' : 'none',
                  }}
                >
                  {loading
                    ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} /> Importando…</>
                    : <><Upload size={15} /> Importar Agora</>
                  }
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// Hack: expose settings for display
const settings = { MAX_UPLOAD_SIZE_MB: 10 }
