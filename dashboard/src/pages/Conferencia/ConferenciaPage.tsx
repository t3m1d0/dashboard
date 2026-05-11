// ============================================================
// pages/Conferencia/ConferenciaPage.tsx
// Conferência de Folha — upload PDF por filial, dashboard completo
// ============================================================
import { useEffect, useState, useCallback, useRef } from 'react'
import { useDashboardStore } from '@/store'
import { ConferenciaAPI } from '@/services/api'
import { LojaSelectField } from '@/components/UI/LojaSelectField'
import {
  Upload, X, CheckCircle2, AlertTriangle, RefreshCw,
  FileText, Trash2, Search, ChevronLeft, ChevronRight,
  Info, TrendingUp, DollarSign, Building2, Users, Percent
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

const fmtBRL = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtNum = (v: number) => Math.round(v || 0).toLocaleString('pt-BR')
const fmtPct = (v: number) => `${(v || 0).toFixed(1)}%`

const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const CORES = ['#f59e0b','#3b82f6','#10b981','#8b5cf6','#ef4444','#06b6d4','#ec4899','#f97316']

const SEL: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', padding: '7px 11px', borderRadius: 8,
  fontSize: '0.78rem', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none',
}

// ── Import Modal ──────────────────────────────────────────────
function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (r: any) => void }) {
  const [file, setFile]       = useState<File | null>(null)
  const [loja, setLoja]       = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<any>(null)
  const [error, setError]     = useState<string | null>(null)
  const [drag, setDrag]       = useState(false)
  const ref                   = useRef<HTMLInputElement>(null)

  const doImport = async () => {
    if (!file) return
    setLoading(true); setError(null)
    try {
      const r = await ConferenciaAPI.importar(file, loja || undefined)
      setResult(r); onSuccess(r)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="relative z-10 w-full" style={{ maxWidth: 560, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Importar Conferência de Folha</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>PDF gerado pelo sistema — por filial</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Info size={13} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b' }}>Detecção automática</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              O sistema extrai automaticamente: <strong style={{ color: 'var(--text-primary)' }}>filial, CNPJ, mês/ano</strong> e todos os dados de cada colaborador.<br/>
              Importe um PDF por filial. Pode importar múltiplos PDFs do mesmo mês.
            </div>
          </div>

          {/* Loja — confirma ou sobrescreve o que está no PDF */}
          {!result && (
            <LojaSelectField
              value={loja} onChange={setLoja}
              label="Filial (confirme ou sobrescreva o do PDF)"
              required={false}
              placeholder="Detectado automaticamente do PDF..."
            />
          )}

          {!result && (
            <label
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setError(null) } }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 20px', borderRadius: 12, border: `2px dashed ${drag ? '#f59e0b' : file ? '#10b981' : 'var(--border)'}`, background: drag ? 'rgba(245,158,11,0.04)' : file ? 'rgba(16,185,129,0.04)' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center' }}
              onClick={() => !file && ref.current?.click()}
            >
              <input ref={ref} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setError(null) } }} />
              {file ? (
                <>
                  <CheckCircle2 size={28} style={{ color: '#10b981' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#10b981' }}>{file.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{(file.size/1024).toFixed(1)} KB</div>
                  <button onClick={e => { e.stopPropagation(); e.preventDefault(); setFile(null) }} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Trocar</button>
                </>
              ) : (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><Upload size={22} /></div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Arraste ou <span style={{ color: '#f59e0b', fontWeight: 600 }}>clique para selecionar</span></div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Apenas .PDF</div>
                </>
              )}
            </label>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.82rem' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          {result && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981', marginBottom: 10 }}>
                ✓ {result.filial} — {result.mes_nome} {result.competencia?.split('-')[0]}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Colaboradores', value: result.total_arquivo, color: '#10b981' },
                  { label: 'Inseridos',     value: result.inseridos,     color: '#3b82f6' },
                  { label: 'Erros',         value: result.erros,         color: result.erros > 0 ? '#ef4444' : '#6b7280' },
                ].map(item => (
                  <div key={item.label} className="text-center rounded-lg p-2" style={{ background: 'var(--bg-elevated)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {result.liquidez_loja > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Liquidez da loja: <strong style={{ color: '#f59e0b' }}>{fmtBRL(result.liquidez_loja)}</strong>
                  {result.liquidez_pct > 0 && <span style={{ color: '#f59e0b', marginLeft: 6 }}>({result.liquidez_pct}%)</span>}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2.5">
            {result ? (
              <>
                <button onClick={() => { setResult(null); setFile(null) }}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <RefreshCw size={14} /> Importar outra filial
                </button>
                <button onClick={onClose}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#10b981', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> Fechar
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancelar</button>
                <button onClick={doImport} disabled={!file || loading}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, background: file && !loading ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'var(--bg-elevated)', border: 'none', color: file && !loading ? '#fff' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: file && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {loading ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} /> Processando PDF…</> : <><Upload size={14} /> Importar PDF</>}
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

// ── Página Principal ──────────────────────────────────────────
export function ConferenciaPage() {
  const { conferenciaSubSection, lojasAtivas } = useDashboardStore()
  const [stats, setStats]           = useState<any>(null)
  const [competencias, setCompetencias] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [importOpen, setImportOpen] = useState(false)

  const [mesSel, setMesSel]         = useState(0)
  const [anoSel, setAnoSel]         = useState(new Date().getFullYear())
  const [filialSel, setFilialSel]   = useState('')
  const [deleting, setDeleting]     = useState(false)

  const [linhas, setLinhas]         = useState<any>(null)
  const [pageNum, setPageNum]       = useState(1)
  const [busca, setBusca]           = useState('')

  // Quando 'Todos', usa a competência mais recente (não soma tudo)
  const competenciaSel = mesSel > 0
    ? `${anoSel}-${String(mesSel).padStart(2,'0')}`
    : (competencias.length > 0 ? competencias[0].competencia : '')

  const loadCompetencias = useCallback(async () => {
    try {
      const data = await ConferenciaAPI.getCompetencias()
      setCompetencias(data)
      if (data.length > 0) {
        const [ano, mes] = data[0].competencia.split('-').map(Number)
        setAnoSel(ano || new Date().getFullYear())
        setMesSel(mes || 0)
      }
    } catch {}
  }, [])

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string,string> = {}
      if (competenciaSel) params.competencia = competenciaSel
      // Use local filial filter OR global loja selector
      const filialFilter = filialSel || (lojasAtivas.length === 1 ? lojasAtivas[0].nome : '')
      if (filialFilter)   params.filial      = filialFilter
      else if (lojasAtivas.length > 1) params.filiais = lojasAtivas.map((l: any) => l.nome).join('||')
      const data = await ConferenciaAPI.getStats(Object.keys(params).length > 0 ? params : undefined)
      setStats(data)
    } catch { setStats(null) }
    finally { setLoading(false) }
  }, [competenciaSel, filialSel])

  const loadLinhas = useCallback(async () => {
    const params: Record<string, string | number> = { page: pageNum, page_size: 50 }
    if (competenciaSel) params.competencia = competenciaSel
    const filialLFilter = filialSel || (lojasAtivas.length === 1 ? lojasAtivas[0].nome : '')
    if (filialLFilter)  params.filial      = filialLFilter
    if (busca)          params.busca       = busca
    try { const data = await ConferenciaAPI.getLinhas(params); setLinhas(data) } catch {}
  }, [competenciaSel, filialSel, busca, pageNum])

  useEffect(() => { loadCompetencias() }, [])
  useEffect(() => { loadStats() }, [competenciaSel, filialSel, lojasAtivas])
  useEffect(() => {
    if (conferenciaSubSection === 'colaboradores') loadLinhas()
  }, [conferenciaSubSection, competenciaSel, filialSel, busca, pageNum])

  const handleDelete = async () => {
    if (!competenciaSel) return
    const label = `${MESES[mesSel]} ${anoSel}${filialSel ? ' — ' + filialSel : ''}`
    if (!confirm(`Excluir dados de ${label}?\n\nEsta ação não pode ser desfeita.`)) return
    setDeleting(true)
    try {
      await ConferenciaAPI.deleteCompetencia(competenciaSel, filialSel || undefined)
      setMesSel(0); setFilialSel('')
      await loadCompetencias(); await loadStats()
    } catch (e: any) { alert('Erro: ' + e.message) }
    finally { setDeleting(false) }
  }

  const hasData = !!(stats && stats.kpis && stats.kpis.total_funcionarios > 0)
  const kpis    = stats?.kpis || {}
  const porFilial = stats?.por_filial || []
  const porCargo  = stats?.por_cargo  || []

  const SUB_LABELS: Record<string,string> = {
    overview: 'Visão Geral', filiais: 'Por Filial',
    colaboradores: 'Colaboradores', upload: 'Upload PDF',
  }

  const renderBody = () => {
    if (loading) return (
      <div className="flex items-center justify-center py-24">
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#f59e0b', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ marginLeft: 12, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Carregando…</span>
      </div>
    )
    if (!hasData && conferenciaSubSection !== 'upload') return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
          <FileText size={32} />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Nenhum PDF importado</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 380 }}>
          Importe o PDF de Conferência de Folha de cada filial. O sistema detecta automaticamente a filial e o mês.
        </p>
        <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <Upload size={15} /> Importar PDF
        </button>
      </div>
    )

    if (conferenciaSubSection === 'upload') return <UploadView onImport={() => setImportOpen(true)} competencias={competencias} onDelete={handleDelete} deleting={deleting} />

    if (conferenciaSubSection === 'colaboradores') return (
      <ColabView linhas={linhas} page={pageNum} setPage={setPageNum} busca={busca} setBusca={setBusca} />
    )

    // overview + filiais
    return (
      <>
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Colaboradores',   value: fmtNum(kpis.total_funcionarios), color: '#f59e0b', icon: <Users size={16} /> },
            { label: 'Total Proventos', value: fmtBRL(kpis.total_proventos),    color: '#10b981', icon: <TrendingUp size={16} /> },
            { label: 'Total Descontos', value: fmtBRL(kpis.total_descontos),    color: '#ef4444', icon: <DollarSign size={16} /> },
            { label: 'Total Líquido',   value: fmtBRL(kpis.total_liquido),      color: '#3b82f6', icon: <DollarSign size={16} /> },
          ].map(item => (
            <div key={item.label} className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: item.color }} />
              <div className="flex items-center justify-between mb-2">
                <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{item.label}</div>
                <div style={{ color: item.color, opacity: 0.7 }}>{item.icon}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Descontos detalhados */}
        <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 14 }}>Detalhamento de Descontos</div>
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'INSS',               value: fmtBRL(kpis.total_inss || 0),          color: '#f59e0b' },
              { label: 'IRRF',               value: fmtBRL(kpis.total_irrf || 0),          color: '#ec4899' },
              { label: 'VT',                 value: fmtBRL(kpis.total_vt || 0),            color: '#8b5cf6' },
              { label: 'Faltas',             value: fmtBRL(kpis.total_faltas || 0),        color: '#ef4444' },
              { label: 'Desc. Diversos',     value: fmtBRL(kpis.total_desc_diversos || 0), color: '#6b7280' },
              { label: 'Horas Falta',        value: fmtBRL(kpis.total_horas_falta || 0),   color: '#ef4444' },
              { label: 'Adiantamento Sal.',  value: fmtBRL(kpis.total_adiantamento || 0),  color: '#3b82f6' },
              { label: `Vale Func. OS (${kpis.qtd_vale_func_os || 0} OS)`, value: fmtBRL(kpis.total_vale_func_os || 0), color: '#06b6d4' },
              { label: 'Outros Débitos',     value: fmtBRL(kpis.total_outros || 0),        color: '#6b7280' },
              { label: 'TOTAL DESCONTOS',    value: fmtBRL(kpis.total_descontos || 0),     color: '#ef4444', bold: true },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: `1px solid ${(item as any).bold ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: (item as any).bold ? 700 : 600, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico por filial */}
        {porFilial.length > 0 && (
          <div className="grid grid-cols-12 gap-3.5 mb-5">
            <div className="col-span-12 lg:col-span-7 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Proventos vs Líquido por Filial</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Comparativo de valores</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={porFilial} layout="vertical" margin={{ right: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => fmtBRL(v)} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="filial" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={150}
                    tickFormatter={(v: string) => v?.length > 20 ? v.slice(0,18)+'…' : v} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number, name: string) => [fmtBRL(v), name === 'proventos' ? 'Proventos' : 'Líquido']} />
                  <Bar dataKey="proventos" name="proventos" fill="rgba(245,158,11,0.8)" radius={[0,4,4,0]} />
                  <Bar dataKey="liquido"   name="liquido"   fill="rgba(59,130,246,0.8)"  radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela por filial */}
            <div className="col-span-12 lg:col-span-5 rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Detalhamento por Filial</div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Filial','Func.','Proventos','Líquido','Liquidez'].map(h => (
                        <th key={h} style={{ padding: '7px 10px', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {porFilial.map((f: any, i: number) => (
                      <tr key={i} onClick={() => setFilialSel(f.filial === filialSel ? '' : f.filial)}
                        style={{ cursor: 'pointer', background: filialSel === f.filial ? 'rgba(245,158,11,0.06)' : '' }}
                        onMouseEnter={e => { if (filialSel !== f.filial) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                        onMouseLeave={e => { if (filialSel !== f.filial) (e.currentTarget as HTMLElement).style.background = '' }}>
                        <td style={{ padding: '7px 10px', fontSize: '0.72rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.filial}>{f.filial}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#f59e0b', textAlign: 'center' }}>{f.funcionarios}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{fmtBRL(f.proventos)}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#3b82f6' }}>{fmtBRL(f.liquido)}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#10b981' }}>
                          {f.liquidez_loja > 0 ? fmtBRL(f.liquidez_loja) : '—'}
                          {f.liquidez_pct > 0 && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{fmtPct(f.liquidez_pct)}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Por cargo */}
        {porCargo.length > 0 && (
          <div className="rounded-2xl overflow-hidden mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Por Cargo</div>
            </div>
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Cargo','Colab.','Proventos','Descontos','INSS','Adiant. Sal.','Líquido'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {porCargo.map((c: any, i: number) => (
                    <tr key={i} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                      <td style={{ padding: '8px 14px', fontSize: '0.8rem' }}>{c.cargo}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#f59e0b', textAlign: 'center' }}>{c.n}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#10b981' }}>{fmtBRL(c.proventos)}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#ef4444' }}>{fmtBRL(c.descontos || 0)}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#f59e0b' }}>{fmtBRL(c.inss || 0)}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#3b82f6' }}>{fmtBRL(c.adiant_sal || 0)}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: '#06b6d4' }}>{fmtBRL(c.liquido || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Conferência de Folha — <span style={{ color: '#f59e0b' }}>{SUB_LABELS[conferenciaSubSection] || 'Visão Geral'}</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            {hasData
              ? `${kpis.total_funcionarios} colaboradores · ${porFilial.length} filiais${competenciaSel ? ' · ' + competenciaSel : ''}`
              : 'Importe os PDFs de Conferência de Folha por filial'}
            {lojasAtivas.length > 0 && <span style={{ color: '#f59e0b', marginLeft: 6 }}>· {lojasAtivas.length === 1 ? lojasAtivas[0].nome : lojasAtivas.length + ' lojas'}</span>}
          </p>
        </div>
        <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <Upload size={14} /> Importar PDF
        </button>
      </div>

      {/* Filtro por mês */}
      {competencias.length > 0 && (
        <div className="mb-4">
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>Competência — {anoSel}</div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <button onClick={() => setMesSel(0)}
              style={{ padding: '5px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: mesSel === 0 ? '#f59e0b' : 'var(--bg-elevated)', color: mesSel === 0 ? '#0a0a0a' : 'var(--text-secondary)', border: `1px solid ${mesSel === 0 ? '#f59e0b' : 'var(--border)'}`, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Recente
            </button>
            {competencias
              .filter((c: any) => c.competencia?.startsWith(String(anoSel)))
              .sort((a: any, b: any) => a.competencia.localeCompare(b.competencia))
              .map((c: any) => {
                const mes = parseInt(c.competencia.split('-')[1])
                const active = mesSel === mes
                return (
                  <button key={c.competencia} onClick={() => setMesSel(mes)}
                    title={`${c.filiais} filial(is) · ${c.funcionarios} colaboradores`}
                    style={{ padding: '5px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: active ? '#f59e0b' : 'var(--bg-card)', color: active ? '#0a0a0a' : 'var(--text-secondary)', border: `1px solid ${active ? '#f59e0b' : 'var(--border)'}`, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    {c.mes_nome || MESES[mes]}
                    {c.filiais > 1 && <span style={{ fontSize: '0.62rem', marginLeft: 5, opacity: 0.7 }}>({c.filiais})</span>}
                  </button>
                )
              })}
            {mesSel > 0 && (
              <button onClick={handleDelete} disabled={deleting}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', opacity: deleting ? 0.6 : 1 }}>
                {deleting ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(248,113,113,0.3)', borderTopColor: '#f87171', animation: 'spin 0.7s linear infinite' }} /> Excluindo…</> : <><Trash2 size={13} /> Limpar {MESES[mesSel]}</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filtro por filial */}
      {hasData && (stats?.filtros?.filiais?.length || 0) > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <select style={SEL} value={filialSel} onChange={e => setFilialSel(e.target.value)}>
            <option value="">Todas as filiais ({stats.filtros.filiais.length})</option>
            {stats.filtros.filiais.map((f: string) => <option key={f} value={f}>{f}</option>)}
          </select>
          {filialSel && (
            <button onClick={() => setFilialSel('')}
              style={{ ...SEL, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>
              <X size={12} style={{ display: 'inline', marginRight: 4 }} />Limpar
            </button>
          )}
        </div>
      )}

      {renderBody()}

      {importOpen && (
        <ImportModal onClose={() => setImportOpen(false)} onSuccess={() => { loadCompetencias(); loadStats() }} />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Colaboradores view ────────────────────────────────────────
function ColabView({ linhas, page, setPage, busca, setBusca }: any) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative" style={{ maxWidth: 280 }}>
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Buscar colaborador…" value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '7px 10px 7px 30px', borderRadius: 8, fontSize: '0.78rem', fontFamily: 'var(--font-body)', outline: 'none', width: 260 }} />
        </div>
        {linhas && <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{linhas.total?.toLocaleString('pt-BR')} registros</span>}
      </div>
      {!linhas ? (
        <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#f59e0b', animation: 'spin 0.7s linear infinite', marginRight: 10 }} />Carregando…
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Colaborador','Cargo','Filial','Admissão','Proventos','INSS','Adiant.Sal','Descontos','Líquido','PIX/CPF'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.items.map((r: any) => (
                  <tr key={r.id} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                    <td style={{ padding: '7px 12px', fontSize: '0.8rem', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</td>
                    <td style={{ padding: '7px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.cargo}</td>
                    <td style={{ padding: '7px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.filial_nome}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.dt_admissao}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#f59e0b' }}>{fmtBRL(r.total_proventos)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#ef4444' }}>{r.inss > 0 ? fmtBRL(r.inss) : '—'}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#ec4899' }}>{r.irrf > 0 ? fmtBRL(r.irrf) : '—'}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#ef4444' }}>{fmtBRL(r.total_descontos)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6' }}>{fmtBRL(r.liquido)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.pix_cpf || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Página {page} de {Math.ceil(linhas.total/50)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p: number) => Math.max(1,p-1))} disabled={page===1}
                style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: page===1?'var(--text-muted)':'var(--text-primary)', cursor: page===1?'not-allowed':'pointer' }}>
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage((p: number) => p+1)} disabled={page>=Math.ceil(linhas.total/50)}
                style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: page>=Math.ceil(linhas.total/50)?'var(--text-muted)':'var(--text-primary)', cursor: page>=Math.ceil(linhas.total/50)?'not-allowed':'pointer' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Upload view ───────────────────────────────────────────────
function UploadView({ onImport, competencias, onDelete, deleting }: any) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-card)', border: '2px dashed var(--border)' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', margin: '0 auto 14px' }}>
          <FileText size={26} />
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 6 }}>Importar PDF de Conferência de Folha</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 16, maxWidth: 380, margin: '0 auto 16px' }}>
          Um PDF por filial. O sistema detecta automaticamente filial, CNPJ e mês/ano do cabeçalho.
        </div>
        <button onClick={onImport} className="flex items-center gap-2 px-6 py-2.5 rounded-xl mx-auto"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <Upload size={15} /> Selecionar PDF
        </button>
      </div>
      {competencias.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Competências Importadas</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Competência','Filiais','Funcionários','Proventos','Líquido','Ações'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competencias.map((c: any) => (
                <tr key={c.competencia} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{c.mes_nome}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>{c.competencia}</span>
                  </td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#f59e0b' }}>{c.filiais}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{c.funcionarios}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{fmtBRL(c.proventos)}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#3b82f6' }}>{fmtBRL(c.liquido)}</td>
                  <td style={{ padding: '9px 14px' }}>
                    <button onClick={onDelete} disabled={deleting}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '0.72rem', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}>
                      <Trash2 size={11} /> Limpar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
