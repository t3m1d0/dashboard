// ============================================================
// Upload Modal — Import data files
// ============================================================
import { useState, useCallback } from 'react'
import { X, Upload, FileText, CheckCircle, Trash2 } from 'lucide-react'
import { useDashboardStore } from '@/store'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

const DATA_SCHEMAS = [
  { id: 'sustentacao',    label: 'Chamados Sustentação', color: '#3b82f6', desc: 'Dados de tickets e SLA',       formats: ['CSV', 'XLSX'] },
  { id: 'projetos',       label: 'Projetos Dev',         color: '#8b5cf6', desc: 'Board de projetos Kanban',     formats: ['CSV', 'XLSX'] },
  { id: 'kpis',           label: 'KPIs Gerais',          color: '#10b981', desc: 'Indicadores de performance',   formats: ['CSV', 'JSON'] },
  { id: 'roadmap',        label: 'Roadmap',              color: '#f59e0b', desc: 'Planejamento estratégico',     formats: ['CSV', 'XLSX'] },
]

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const { uploadedSources, addUploadedSource, removeUploadedSource } = useDashboardStore()
  const [activeTab, setActiveTab] = useState<'import' | 'status'>('import')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) await handleFile(file)
  }, [selectedType])

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await handleFile(file)
  }

  const handleFile = async (file: File) => {
    if (!selectedType) {
      setError('Selecione um tipo de dado primeiro')
      return
    }
    setIsProcessing(true)
    setError(null)

    // Simulate processing
    await new Promise((r) => setTimeout(r, 1200))

    addUploadedSource(selectedType, {
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      rows: Math.floor(Math.random() * 200) + 50,
    })

    setIsProcessing(false)
    setActiveTab('status')
    showToast(`✅ ${file.name} importado com sucesso!`)
  }

  const showToast = (msg: string) => {
    const t = document.createElement('div')
    t.className = 'toast'
    t.style.borderLeft = '3px solid #10b981'
    t.textContent = msg
    document.body.appendChild(t)
    setTimeout(() => {
      t.style.transition = '0.3s'
      t.style.opacity = '0'
      setTimeout(() => t.remove(), 300)
    }, 3500)
  }

  if (!isOpen) return null

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '12px 18px',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    marginBottom: -1,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottomStyle: 'solid',
    borderBottomWidth: 2,
    borderBottomColor: active ? 'var(--accent)' : 'transparent',
    fontFamily: 'var(--font-body)',
    transition: 'all var(--transition)',
  })

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-5"
      style={{ '--accent': '#8b5cf6' } as React.CSSProperties}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative z-10 w-full animate-panel-in overflow-y-auto"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: 680,
          maxHeight: '88vh',
          boxShadow: 'var(--shadow-lg), 0 0 60px rgba(139,92,246,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex items-center justify-center rounded-xl"
                style={{ width: 32, height: 32, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}
              >
                <Upload size={16} />
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 700 }}>Importar Dados</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Importe arquivos CSV, XLSX ou JSON para atualizar o dashboard
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg transition-all"
            style={{
              width: 32, height: 32,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
          <button style={tabStyle(activeTab === 'import')} onClick={() => setActiveTab('import')}>
            Importar Arquivo
          </button>
          <button style={tabStyle(activeTab === 'status')} onClick={() => setActiveTab('status')}>
            Fontes Ativas
            {Object.keys(uploadedSources).length > 0 && (
              <span className="ml-2 rounded-full px-1.5 py-0.5"
                style={{ fontSize: '0.65rem', background: '#8b5cf6', color: '#fff', fontWeight: 700 }}
              >
                {Object.keys(uploadedSources).length}
              </span>
            )}
          </button>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'import' && (
            <div>
              {/* Step 1: Type selection */}
              <div className="mb-5">
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  1. Selecione o tipo de dado
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {DATA_SCHEMAS.map((schema) => (
                    <button
                      key={schema.id}
                      onClick={() => setSelectedType(schema.id)}
                      className="flex flex-col gap-2 p-3.5 rounded-xl text-left transition-all"
                      style={{
                        background: selectedType === schema.id ? `${schema.color}0D` : 'var(--bg-card)',
                        border: `1px solid ${selectedType === schema.id ? schema.color : 'var(--border)'}`,
                        boxShadow: selectedType === schema.id ? `0 0 0 2px ${schema.color}22` : 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      <div className="flex items-center justify-center rounded-xl"
                        style={{ width: 36, height: 36, background: `${schema.color}18`, color: schema.color }}
                      >
                        <FileText size={16} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {schema.label}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {schema.formats.join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Drop zone */}
              <div className="mb-4">
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  2. Carregue o arquivo
                </div>
                <label
                  className="flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all"
                  style={{
                    border: `2px dashed ${isDragging ? '#8b5cf6' : 'var(--border)'}`,
                    background: isDragging ? 'rgba(139,92,246,0.04)' : 'var(--bg-card)',
                    padding: '36px 24px',
                    textAlign: 'center',
                  }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <input type="file" accept=".csv,.xlsx,.xls,.json" className="hidden" onChange={handleFileInput} />

                  {isProcessing ? (
                    <div className="flex items-center gap-3" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <div className="rounded-full" style={{
                        width: 20, height: 20,
                        border: '2px solid var(--border)',
                        borderTopColor: '#8b5cf6',
                        animation: 'spin 0.7s linear infinite',
                      }} />
                      Processando arquivo...
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center rounded-full mb-4"
                        style={{ width: 56, height: 56, background: 'rgba(139,92,246,0.08)', color: '#8b5cf6' }}
                      >
                        <Upload size={24} />
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Arraste e solte ou{' '}
                        <span style={{ color: '#8b5cf6', fontWeight: 600 }}>clique para selecionar</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {selectedType
                          ? `Aceita: ${DATA_SCHEMAS.find((s) => s.id === selectedType)?.formats.join(', ')}`
                          : 'Selecione um tipo de dado primeiro'}
                      </div>
                    </>
                  )}
                </label>
                {error && (
                  <div className="mt-2 text-center" style={{ fontSize: '0.8rem', color: '#f87171' }}>{error}</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'status' && (
            <div>
              {Object.keys(uploadedSources).length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center"
                  style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}
                >
                  <Upload size={40} style={{ color: 'var(--text-muted)' }} />
                  <div>Nenhum arquivo importado</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Use "Importar Arquivo" para começar
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {Object.entries(uploadedSources).map(([type, info]) => {
                    const schema = DATA_SCHEMAS.find((s) => s.id === type)
                    const dt = new Date(info.uploadedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    return (
                      <div key={type} className="flex items-center gap-3.5 rounded-xl p-3.5"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                      >
                        <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                          style={{ width: 40, height: 40, background: `${schema?.color}18`, color: schema?.color }}
                        >
                          <FileText size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div style={{ fontSize: '0.83rem', fontWeight: 600, marginBottom: 2 }}>
                            {schema?.label || type}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {info.fileName}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {info.rows} registros · {dt}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="rounded-full px-2.5 py-0.5 flex items-center gap-1"
                            style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                          >
                            <CheckCircle size={10} />
                            Ativo
                          </span>
                          <button
                            onClick={() => removeUploadedSource(type)}
                            className="flex items-center justify-center rounded-lg transition-all"
                            style={{
                              width: 28, height: 28,
                              background: 'rgba(239,68,68,0.08)',
                              color: '#f87171',
                              border: '1px solid rgba(239,68,68,0.15)',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
