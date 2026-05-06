// ============================================================
// SustentacaoPage.tsx — Dashboard baseado em dados reais do banco
// ============================================================
import { useEffect, useState, useCallback, useRef } from 'react'
import { useDashboardStore } from '@/store'
import { useSectionPeriodo } from '@/hooks/useSectionPeriodo'
import { SustentacaoAPI } from '@/services/api'
import { PeriodoSelector } from '@/components/UI/PeriodoSelector'
import {
  TrendingUp, TrendingDown, Minus, Upload, RefreshCw,
  CheckCircle2, Clock, XCircle, AlertTriangle, Users,
  BarChart2, Search, ChevronLeft, ChevronRight, X,
  FileSpreadsheet, Zap
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts'
import { getInitials } from '@/utils'

// ── Cores por situação ────────────────────────────────────────
const SITUACAO_COR: Record<string, string> = {
  'Concluído':   '#10b981',
  'Indeferido':  '#6b7280',
  'Em andamento': '#3b82f6',
  'Pendente':    '#f59e0b',
}
const ASSUNTO_CORES = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316','#a78bfa','#34d399']

// ── Modal de import ───────────────────────────────────────────
function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (r: any) => void }) {
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<any>(null)
  const [error, setError]     = useState<string | null>(null)
  const [drag, setDrag]       = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => { setFile(f); setError(null); setResult(null) }

  const doImport = async () => {
    if (!file) return
    setLoading(true); setError(null)
    try {
      const r = await SustentacaoAPI.importCSV(file)
      setResult(r)
      onSuccess(r)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="relative z-10 w-full overflow-y-auto" style={{ maxWidth: 560, maxHeight: '88vh', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Importar Chamados</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>CSV exportado do sistema de chamados</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Colunas esperadas */}
          <div className="rounded-xl p-3.5" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3b82f6', marginBottom: 8 }}>
              Colunas identificadas no seu CSV:
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {['CÓD TAREFA','ASSUNTO','SITUAÇÃO','TÍTULO DO CHAMADO','ORIGEM','DATA DA DISPONIBILIDADE','DATA DA CONCLUSÃO','USUÁRIO QUE ACEITOU A TAREFA'].map(c => (
                <span key={c} style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 7px', borderRadius: 5, border: '1px solid rgba(59,130,246,0.2)' }}>{c}</span>
              ))}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 8 }}>
              O sistema detecta automaticamente registros novos e alterados — sem duplicar.
            </div>
          </div>

          {/* Drop zone */}
          {!result && (
            <label
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 20px', borderRadius: 12, border: `2px dashed ${drag ? '#3b82f6' : file ? '#10b981' : 'var(--border)'}`, background: drag ? 'rgba(59,130,246,0.04)' : file ? 'rgba(16,185,129,0.04)' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center' }}
              onClick={() => !file && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {file ? (
                <>
                  <CheckCircle2 size={28} style={{ color: '#10b981' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#10b981' }}>{file.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  <button onClick={e => { e.stopPropagation(); e.preventDefault(); setFile(null) }} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Trocar</button>
                </>
              ) : (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}><Upload size={22} /></div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Arraste o CSV ou <span style={{ color: '#3b82f6', fontWeight: 600 }}>clique para selecionar</span></div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Separador: ponto-e-vírgula (;) · Encoding: Latin-1 ou UTF-8</div>
                </>
              )}
            </label>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.82rem' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="p-3.5" style={{ background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', marginBottom: 4 }}>Importação concluída!</div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: 'Inseridos',  value: result.inseridos,  color: '#10b981' },
                    { label: 'Atualizados', value: result.atualizados, color: '#3b82f6' },
                    { label: 'Ignorados',  value: result.ignorados,  color: '#6b7280' },
                  ].map(item => (
                    <div key={item.label} className="text-center rounded-lg p-2.5" style={{ background: 'var(--bg-elevated)' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                  Total no arquivo: {result.total_arquivo} registros
                  {result.erros > 0 && <span style={{ color: '#f59e0b' }}> · {result.erros} com erro</span>}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5">
            {result ? (
              <>
                <button onClick={() => { setResult(null); setFile(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <RefreshCw size={14} /> Importar outro
                </button>
                <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#10b981', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> Fechar
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancelar</button>
                <button onClick={doImport} disabled={!file || loading} style={{ flex: 1, padding: '10px', borderRadius: 10, background: file && !loading ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'var(--bg-elevated)', border: 'none', color: file && !loading ? '#fff' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: file && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {loading ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} /> Importando…</> : <><Upload size={14} /> Importar CSV</>}
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

// ── Página principal ──────────────────────────────────────────
export function SustentacaoPage() {
  const { periodo, toQueryParams, label: periodoLabel } = useSectionPeriodo('sustentacao')
  const [stats, setStats]       = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [importOpen, setImportOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'dashboard'|'lista'>('dashboard')

  // Filtros da lista
  const [filtroSituacao, setFiltroSituacao]   = useState('')
  const [filtroAssunto, setFiltroAssunto]     = useState('')
  const [filtroResp, setFiltroResp]           = useState('')
  const [filtroOrigem, setFiltroOrigem]       = useState('')
  const [busca, setBusca]                     = useState('')
  const [chamados, setChamados]               = useState<any>(null)
  const [pageNum, setPageNum]                 = useState(1)

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const params = toQueryParams()
      const data = await SustentacaoAPI.getStats(Object.keys(params).length > 0 ? params : undefined)
      setStats(data)
    } catch { setStats(null) }
    finally { setLoading(false) }
  }, [periodo.mes, periodo.ano, periodo.dataInicio, periodo.dataFim, periodo.modo])

  const loadChamados = useCallback(async () => {
    const params: Record<string, any> = { ...toQueryParams(), page: pageNum, page_size: 50 }
    if (filtroSituacao) params.situacao   = filtroSituacao
    if (filtroAssunto)  params.assunto    = filtroAssunto
    if (filtroResp)     params.responsavel = filtroResp
    if (filtroOrigem)   params.origem     = filtroOrigem
    if (busca)          params.busca      = busca
    try {
      const data = await SustentacaoAPI.getChamados(params)
      setChamados(data)
    } catch {}
  }, [periodo, filtroSituacao, filtroAssunto, filtroResp, filtroOrigem, busca, pageNum])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { if (viewMode === 'lista') loadChamados() }, [loadChamados, viewMode])

  const selStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', padding: '6px 10px', borderRadius: 8,
    fontSize: '0.78rem', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none',
  }

  const hasData = stats && stats.total > 0

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Equipe de <span style={{ color: '#8b5cf6' }}>Sustentação</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            {hasData ? `${stats.total.toLocaleString('pt-BR')} chamados · ${periodoLabel}` : 'Nenhum dado importado ainda'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {(['dashboard','lista'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding: '6px 12px', background: viewMode === m ? '#8b5cf6' : 'var(--bg-elevated)', color: viewMode === m ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                {m === 'dashboard' ? 'Dashboard' : 'Chamados'}
              </button>
            ))}
          </div>
          <PeriodoSelector secao="sustentacao" />
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <Upload size={14} /> Importar CSV
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#8b5cf6', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ marginLeft: 12, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Carregando…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasData && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Nenhum dado de sustentação</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 360 }}>
              Importe o CSV exportado do seu sistema de chamados para visualizar o dashboard completo.
            </p>
          </div>
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <Upload size={15} /> Importar CSV agora
          </button>
        </div>
      )}

      {/* ── DASHBOARD VIEW ── */}
      {!loading && hasData && viewMode === 'dashboard' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            {[
              { label: 'Total',        value: stats.total,        color: '#8b5cf6', icon: <BarChart2 size={16}/> },
              { label: 'Concluídos',   value: stats.concluidos,   color: '#10b981', icon: <CheckCircle2 size={16}/> },
              { label: 'Em Andamento', value: stats.em_andamento, color: '#3b82f6', icon: <Clock size={16}/> },
              { label: 'Indeferidos',  value: stats.indeferidos,  color: '#6b7280', icon: <XCircle size={16}/> },
              { label: 'Pendentes',    value: stats.pendentes,    color: '#f59e0b', icon: <AlertTriangle size={16}/> },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-4 relative overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: item.color }} />
                <div className="flex items-center justify-center rounded-xl mb-2.5" style={{ width: 32, height: 32, background: `${item.color}18`, color: item.color }}>{item.icon}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.7rem', fontWeight: 700, color: item.color, lineHeight: 1, marginBottom: 4 }}>
                  {item.value.toLocaleString('pt-BR')}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Taxa de conclusão + tempo médio */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Taxa de Conclusão</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.2rem', fontWeight: 700, color: '#10b981', lineHeight: 1, marginBottom: 8 }}>
                {stats.taxa_conclusao}%
              </div>
              <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.taxa_conclusao}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: 99, transition: 'width 0.7s' }} />
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Tempo Médio de Resolução</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.2rem', fontWeight: 700, color: '#3b82f6', lineHeight: 1 }}>
                {stats.tempo_medio_resolucao_horas
                  ? `${stats.tempo_medio_resolucao_horas.toFixed(1)}h`
                  : '—'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>Da abertura até a conclusão</div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-12 gap-3.5 mb-5">
            {/* Top assuntos */}
            <div className="col-span-12 lg:col-span-7 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Top Assuntos</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Chamados por categoria no período</div>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['#', 'Assunto', 'Total', 'Volume'].map(h => (
                        <th key={h} style={{ padding: '0 10px 8px', textAlign: 'left', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_assuntos.map((item: any) => {
                      const max = stats.top_assuntos[0]?.total || 1
                      const pct = (item.total / max) * 100
                      const cor = ASSUNTO_CORES[(item.rank - 1) % ASSUNTO_CORES.length]
                      return (
                        <tr key={item.rank}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                          <td style={{ padding: '7px 10px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 700, color: item.rank <= 3 ? cor : 'var(--text-muted)', background: item.rank <= 3 ? `${cor}20` : 'var(--bg-elevated)', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              {item.rank}
                            </span>
                          </td>
                          <td style={{ padding: '7px 10px', fontSize: '0.8rem', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.assunto}</td>
                          <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600, color: cor }}>{item.total.toLocaleString('pt-BR')}</td>
                          <td style={{ padding: '7px 10px', minWidth: 100 }}>
                            <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 99 }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Por situação — donut */}
            <div className="col-span-12 lg:col-span-5 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Distribuição por Status</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Situação dos chamados</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={Object.entries(stats.por_situacao).map(([k, v]) => ({ name: k, value: v }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75} paddingAngle={3}
                  >
                    {Object.entries(stats.por_situacao).map(([k]) => (
                      <Cell key={k} fill={SITUACAO_COR[k] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 mt-2">
                {Object.entries(stats.por_situacao).map(([k, v]: any) => (
                  <div key={k} className="flex items-center gap-2">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: SITUACAO_COR[k] || '#6b7280', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.75rem', flex: 1 }}>{k}</span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{v.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Técnicos + Origens */}
          <div className="grid grid-cols-12 gap-3.5">
            {/* Por responsável */}
            {stats.por_responsavel?.length > 0 && (
              <div className="col-span-12 lg:col-span-6 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Por Técnico</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Chamados por responsável</div>
                <div className="flex flex-col gap-2">
                  {stats.por_responsavel.slice(0, 8).map((r: any, i: number) => {
                    const max = stats.por_responsavel[0]?.total || 1
                    const cor = ASSUNTO_CORES[i % ASSUNTO_CORES.length]
                    return (
                      <div key={r.nome} className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0" style={{ width: 26, height: 26, background: cor, fontSize: '0.6rem' }}>
                          {getInitials(r.nome)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div style={{ fontSize: '0.75rem', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nome}</div>
                          <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(r.total / max) * 100}%`, background: cor, borderRadius: 99 }} />
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: cor, flexShrink: 0 }}>{r.total}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Por origem */}
            {stats.por_origem?.length > 0 && (
              <div className="col-span-12 lg:col-span-6 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Por Unidade / Franquia</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Chamados por origem</div>
                <div className="flex flex-col gap-2">
                  {stats.por_origem.slice(0, 8).map((r: any, i: number) => {
                    const max = stats.por_origem[0]?.total || 1
                    const cor = ASSUNTO_CORES[(i + 3) % ASSUNTO_CORES.length]
                    return (
                      <div key={r.origem} className="flex items-center gap-2.5">
                        <div className="flex-1 min-w-0">
                          <div style={{ fontSize: '0.75rem', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.origem}</div>
                          <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(r.total / max) * 100}%`, background: cor, borderRadius: 99 }} />
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: cor, flexShrink: 0 }}>{r.total}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── LISTA VIEW ── */}
      {!loading && hasData && viewMode === 'lista' && (
        <>
          {/* Filtros */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Buscar chamado…" value={busca} onChange={e => { setBusca(e.target.value); setPageNum(1) }}
                style={{ ...selStyle, paddingLeft: 30, minWidth: 200 }} />
            </div>
            <select style={selStyle} value={filtroSituacao} onChange={e => { setFiltroSituacao(e.target.value); setPageNum(1) }}>
              <option value="">Situação</option>
              {['Concluído','Em andamento','Indeferido','Pendente'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {stats?.filtros?.assuntos?.length > 0 && (
              <select style={selStyle} value={filtroAssunto} onChange={e => { setFiltroAssunto(e.target.value); setPageNum(1) }}>
                <option value="">Assunto</option>
                {stats.filtros.assuntos.map((a: string) => <option key={a} value={a}>{a}</option>)}
              </select>
            )}
            {stats?.filtros?.responsaveis?.length > 0 && (
              <select style={selStyle} value={filtroResp} onChange={e => { setFiltroResp(e.target.value); setPageNum(1) }}>
                <option value="">Técnico</option>
                {stats.filtros.responsaveis.map((r: string) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            {(filtroSituacao || filtroAssunto || filtroResp || busca) && (
              <button onClick={() => { setFiltroSituacao(''); setFiltroAssunto(''); setFiltroResp(''); setBusca(''); setPageNum(1) }}
                style={{ ...selStyle, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>
                <X size={13} style={{ display: 'inline', marginRight: 4 }} />Limpar
              </button>
            )}
          </div>

          {/* Tabela */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {!chamados ? (
              <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#8b5cf6', animation: 'spin 0.7s linear infinite', marginRight: 10 }} />
                Carregando chamados…
              </div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Cód','Título','Assunto','Técnico','Origem','Status','Abertura','Conclusão'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chamados.items.map((c: any) => (
                      <tr key={c.id}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                        <td style={{ padding: '8px 12px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>#{c.cod_tarefa}</td>
                        <td style={{ padding: '8px 12px', fontSize: '0.78rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.titulo_chamado}>{c.titulo_chamado}</td>
                        <td style={{ padding: '8px 12px', fontSize: '0.75rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{c.assunto}</td>
                        <td style={{ padding: '8px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{c.usuario_responsavel || '—'}</td>
                        <td style={{ padding: '8px 12px', fontSize: '0.72rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{c.origem || '—'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${SITUACAO_COR[c.situacao] || '#6b7280'}18`, color: SITUACAO_COR[c.situacao] || '#6b7280' }}>
                            {c.situacao}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {c.data_disponibilidade ? new Date(c.data_disponibilidade).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {c.data_conclusao ? new Date(c.data_conclusao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : c.data_indeferimento ? new Date(c.data_indeferimento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {chamados.total.toLocaleString('pt-BR')} resultados · página {pageNum} de {Math.ceil(chamados.total / 50)}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum === 1}
                      style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: pageNum === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: pageNum === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                      <ChevronLeft size={14} />
                    </button>
                    <button onClick={() => setPageNum(p => p + 1)} disabled={pageNum >= Math.ceil(chamados.total / 50)}
                      style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: pageNum >= Math.ceil(chamados.total / 50) ? 'var(--text-muted)' : 'var(--text-primary)', cursor: pageNum >= Math.ceil(chamados.total / 50) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Import modal */}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onSuccess={() => { loadStats() }}
        />
      )}
    </div>
  )
}
