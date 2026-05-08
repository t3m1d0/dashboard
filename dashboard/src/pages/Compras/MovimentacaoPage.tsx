// ============================================================
// pages/Compras/MovimentacaoPage.tsx
// Dashboard de Movimentação de Produtos — Módulo de Compras
// ============================================================
import { useEffect, useState, useCallback, useRef } from 'react'
import { ComprasAPI } from '@/services/api'
import {
  Upload, RefreshCw, CheckCircle2, AlertTriangle, X,
  Package, TrendingUp, TrendingDown, Layers, Building2,
  ChevronLeft, ChevronRight, Search, FileSpreadsheet,
  BarChart2, List, Info
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

// ── Formatadores ──────────────────────────────────────────────
const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtNum  = (v: number) => Math.round(v).toLocaleString('pt-BR')
const fmtDec  = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })

// ── Classificação dos 3 filtros ──────────────────────────────
// Padrão de medida de pneu: 175 70 14, 185/65 R15, etc.
const PNEU_MEDIDA_RE = /\b\d{3}[\s/]\d{2}[\s/R]?\d{2}\b/i

// Grupos administrativos (aceita variações)
const ADMIN_GRUPO_KEYWORDS = [
  'MATERIAIS APLICADOS', 'INSUMO', 'UNIFORME',
  'HIGIENE', 'COPA', 'COZINHA', 'FERRAMENTA', 'ESCRITORIO', 'ESCRITÓRIO',
  'MATERIAL DE ESCRITOR', 'MATERIAL DE OBRA',
]

type FiltroView = 'todos' | 'pneus' | 'pecas' | 'administrativo'

function isPneu(grupo: string, nome: string): boolean {
  const g = grupo.toUpperCase()
  const n = nome.toUpperCase()
  if (g.includes('PNEU') || n.includes('PNEU')) return true
  if (PNEU_MEDIDA_RE.test(g) || PNEU_MEDIDA_RE.test(n)) return true
  return false
}

function isAdministrativo(grupo: string): boolean {
  const g = grupo.toUpperCase()
  return ADMIN_GRUPO_KEYWORDS.some(kw => g.includes(kw.toUpperCase()))
}

function classificar(grupo: string, nome: string): FiltroView {
  if (isAdministrativo(grupo)) return 'administrativo'
  if (isPneu(grupo, nome)) return 'pneus'
  return 'pecas'
}

// ── Cores ─────────────────────────────────────────────────────
const CORES = ['#f59e0b','#3b82f6','#10b981','#8b5cf6','#ef4444','#06b6d4','#ec4899','#f97316','#84cc16','#a78bfa']

// ── Modal de import ───────────────────────────────────────────
function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (r: any) => void }) {
  const [file, setFile]       = useState<File | null>(null)
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<any>(null)
  const [error, setError]     = useState<string | null>(null)
  const [drag, setDrag]       = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)

  const doImport = async () => {
    if (!file || !periodo.trim()) return
    setLoading(true); setError(null)
    try {
      const r = await ComprasAPI.importar(file, periodo.trim())
      setResult(r)
      onSuccess(r)
    } catch (e: any) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', fontSize: '0.85rem',
    color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none', width: '100%',
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="relative z-10 w-full overflow-y-auto"
        style={{ maxWidth: 560, maxHeight: '90vh', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Importar Movimentação</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Excel / CSV de movimentação de produtos</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Colunas esperadas */}
          <div className="rounded-xl p-3.5" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>Colunas reconhecidas no arquivo:</div>
            <div className="flex gap-1.5 flex-wrap">
              {['ID FILIAL','NOME FILIAL','ID PRODUTO','NOME PRODUTO','GRUPO',
                'ESTOQUE ANTERIOR','QTD ENTRADA','CUSTO TOTAL ENTRADA R$',
                'QTD SAÍDA','CUSTO TOTAL SAÍDA R$','ESTOQUE FINAL','CUSTO TOTAL FINAL R$'
              ].map(c => (
                <span key={c} style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '1px 6px', borderRadius: 5 }}>{c}</span>
              ))}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Upsert por <strong style={{ color: 'var(--text-secondary)' }}>ID FILIAL + ID PRODUTO + Período</strong> — sem duplicar ao reimportar.
            </div>
          </div>

          {/* Período */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Período / Referência
            </label>
            <input
              style={inputStyle}
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              placeholder="Ex: 2026-05 ou Maio 2026"
            />
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Identifica o snapshot — permite comparar períodos diferentes
            </div>
          </div>

          {/* Drop zone */}
          {!result && (
            <label
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setError(null) } }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 20px', borderRadius: 12, border: `2px dashed ${drag ? '#f59e0b' : file ? '#10b981' : 'var(--border)'}`, background: drag ? 'rgba(245,158,11,0.04)' : file ? 'rgba(16,185,129,0.04)' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center' }}
              onClick={() => !file && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setError(null) } }} />
              {file ? (
                <>
                  <CheckCircle2 size={28} style={{ color: '#10b981' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#10b981' }}>{file.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  <button onClick={e => { e.stopPropagation(); e.preventDefault(); setFile(null) }} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Trocar</button>
                </>
              ) : (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><Upload size={22} /></div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Arraste o arquivo ou <span style={{ color: '#f59e0b', fontWeight: 600 }}>clique para selecionar</span></div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>.xlsx · .xls · .csv — máx. 20MB</div>
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
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="p-3.5" style={{ background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', marginBottom: 10 }}>Importação concluída! Período: {result.periodo}</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Inseridos',   value: result.inseridos,  color: '#10b981' },
                    { label: 'Atualizados', value: result.atualizados, color: '#3b82f6' },
                    { label: 'Ignorados',   value: result.ignorados,  color: '#6b7280' },
                  ].map(item => (
                    <div key={item.label} className="text-center rounded-lg p-2.5" style={{ background: 'var(--bg-elevated)' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                  Total no arquivo: {result.total_arquivo?.toLocaleString('pt-BR')} registros
                  {result.erros > 0 && <span style={{ color: '#f59e0b' }}> · {result.erros} com erro</span>}
                </div>
              </div>
            </div>
          )}

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
                <button onClick={doImport} disabled={!file || !periodo || loading}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, background: file && periodo && !loading ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'var(--bg-elevated)', border: 'none', color: file && periodo && !loading ? '#fff' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: file && periodo && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {loading ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} /> Importando…</> : <><Upload size={14} /> Importar Agora</>}
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
export function MovimentacaoPage() {
  const [stats, setStats]           = useState<any>(null)
  const [periodos, setPeriodos]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [importOpen, setImportOpen] = useState(false)
  const [viewMode, setViewMode]     = useState<'dashboard' | 'lista'>('dashboard')

  // Filtros
  const [periodoSel, setPeriodoSel] = useState('')
  const [grupoSel, setGrupoSel]     = useState('')
  const [filialSel, setFilialSel]   = useState('')
  const [busca, setBusca]           = useState('')

  // Lista
  const [itens, setItens]           = useState<any>(null)
  const [pageNum, setPageNum]       = useState(1)
  const [detalheProd, setDetalheProd] = useState<any>(null)
  const [filtroView, setFiltroView]   = useState<FiltroView>('todos')

  const loadPeriodos = useCallback(async () => {
    try {
      const data = await ComprasAPI.getPeriodos()
      setPeriodos(data)
      if (data.length > 0 && !periodoSel) {
        setPeriodoSel(data[0].periodo)
      }
    } catch {}
  }, [])

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (periodoSel)               params.periodo   = periodoSel
      if (grupoSel)                 params.grupo     = grupoSel
      if (filialSel)                params.filial    = filialSel
      if (filtroView !== 'todos')   params.categoria = filtroView
      const data = await ComprasAPI.getStats(Object.keys(params).length > 0 ? params : undefined)
      setStats(data)
    } catch { setStats(null) }
    finally { setLoading(false) }
  }, [periodoSel, grupoSel, filialSel])

  const loadItens = useCallback(async () => {
    const params: Record<string, string | number> = { page: pageNum, page_size: 50 }
    if (periodoSel)             params.periodo   = periodoSel
    if (grupoSel)               params.grupo     = grupoSel
    if (filialSel)              params.filial    = filialSel
    if (busca)                  params.busca     = busca
    if (filtroView !== 'todos') params.categoria = filtroView
    try {
      const data = await ComprasAPI.getItens(params)
      setItens(data)
    } catch {}
  }, [periodoSel, grupoSel, filialSel, busca, pageNum])

  useEffect(() => { loadPeriodos() }, [])
  useEffect(() => { if (periodoSel !== undefined) loadStats() }, [periodoSel, grupoSel, filialSel, filtroView])
  useEffect(() => { if (viewMode === 'lista') loadItens() }, [viewMode, periodoSel, grupoSel, filialSel, busca, pageNum, filtroView])

  const hasData = stats && stats.kpis && stats.kpis.total > 0

  const selStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', padding: '7px 11px', borderRadius: 8,
    fontSize: '0.78rem', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none',
  }

  const CHART_OPTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Movimentação de <span style={{ color: '#f59e0b' }}>Produtos</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            {hasData
              ? `${stats.kpis.n_filiais} filiais · ${stats.kpis.n_produtos.toLocaleString('pt-BR')} produtos · ${stats.kpis.n_grupos} grupos`
              : 'Nenhum dado importado ainda'}
            {periodoSel && <span style={{ color: '#f59e0b', marginLeft: 6 }}>· {periodoSel}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle view */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {(['dashboard', 'lista'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding: '6px 12px', background: viewMode === m ? '#f59e0b' : 'var(--bg-elevated)', color: viewMode === m ? '#0a0a0a' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                {m === 'dashboard' ? 'Dashboard' : 'Produtos'}
              </button>
            ))}
          </div>
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <Upload size={14} /> Importar Excel
          </button>
        </div>
      </div>

      {/* Filtro de categoria */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { id: 'todos',          label: '🔍 Todos',          desc: 'Visão completa'                     },
          { id: 'pneus',          label: '🔵 Pneus',          desc: 'Por nome "PNEU" ou medida'          },
          { id: 'pecas',          label: '🔧 Peças / Serviços', desc: 'Excluindo pneus e administrativos' },
          { id: 'administrativo', label: '📦 Administrativo',  desc: 'Ferramentas, uniformes, escritório' },
        ] as const).map(opt => (
          <button
            key={opt.id}
            onClick={() => { setFiltroView(opt.id); setPageNum(1) }}
            title={opt.desc}
            style={{
              padding: '7px 16px', borderRadius: 10,
              background: filtroView === opt.id
                ? opt.id === 'pneus' ? '#3b82f6'
                : opt.id === 'pecas' ? '#10b981'
                : opt.id === 'administrativo' ? '#8b5cf6'
                : '#f59e0b'
                : 'var(--bg-elevated)',
              color: filtroView === opt.id ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${filtroView === opt.id ? 'transparent' : 'var(--border)'}`,
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)', transition: 'all 0.2s',
              boxShadow: filtroView === opt.id ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {opt.label}
          </button>
        ))}
        {filtroView !== 'todos' && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
            {filtroView === 'pneus' ? 'Produtos com "PNEU" no nome ou grupo, ou medidas como 175 70 14'
            : filtroView === 'pecas' ? 'Peças, serviços e produtos — excluindo pneus e administrativos'
            : 'FERRAMENTAS · UNIFORMES · HIGIENE · COPA E COZINHA · MATERIAL DE ESCRITÓRIO · INSUMOS'}
          </span>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {periodos.length > 0 && (
          <select style={selStyle} value={periodoSel} onChange={e => setPeriodoSel(e.target.value)}>
            <option value="">Todos os períodos</option>
            {periodos.map((p: any) => (
              <option key={p.periodo} value={p.periodo}>
                {p.periodo} ({p.registros.toLocaleString('pt-BR')} registros)
              </option>
            ))}
          </select>
        )}
        {stats?.filtros?.grupos?.length > 0 && (
          <select style={selStyle} value={grupoSel} onChange={e => { setGrupoSel(e.target.value); setPageNum(1) }}>
            <option value="">Todos os grupos</option>
            {stats.filtros.grupos.map((g: string) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
        {stats?.filtros?.filiais?.length > 0 && (
          <select style={selStyle} value={filialSel} onChange={e => { setFilialSel(e.target.value); setPageNum(1) }}>
            <option value="">Todas as filiais</option>
            {stats.filtros.filiais.map((f: string) => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
        {(grupoSel || filialSel) && (
          <button onClick={() => { setGrupoSel(''); setFilialSel(''); setPageNum(1) }}
            style={{ ...selStyle, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>
            <X size={13} style={{ display: 'inline', marginRight: 4 }} />Limpar
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#f59e0b', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ marginLeft: 12, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Carregando…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasData && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
            <Package size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Nenhum dado de movimentação</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 380 }}>
              Importe o arquivo Excel de movimentação de produtos para visualizar o dashboard completo com estoque, entradas, saídas e custos por filial.
            </p>
          </div>
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <Upload size={15} /> Importar Excel agora
          </button>
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {!loading && hasData && viewMode === 'dashboard' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Custo Total Estoque', value: fmtBRL(stats.kpis.custo_final), color: '#f59e0b', big: true },
              { label: 'Itens em Estoque',    value: fmtNum(stats.kpis.estoque_final), color: '#3b82f6' },
              { label: 'Custo Entradas',      value: fmtBRL(stats.kpis.custo_entrada), color: '#10b981' },
              { label: 'Custo Saídas',        value: fmtBRL(stats.kpis.custo_saida), color: '#8b5cf6' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-4 relative overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: item.color }} />
                <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: item.big ? '1.3rem' : '1.6rem', fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Métricas secundárias */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Filiais',          value: stats.kpis.n_filiais,  color: '#6b7280' },
              { label: 'Produtos',         value: stats.kpis.n_produtos.toLocaleString('pt-BR'), color: '#6b7280' },
              { label: 'Grupos',           value: stats.kpis.n_grupos,   color: '#6b7280' },
              { label: 'Est. Negativo',    value: stats.kpis.estoque_negativo, color: stats.kpis.estoque_negativo > 0 ? '#ef4444' : '#10b981' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-12 gap-3.5 mb-5">
            {/* Top filiais */}
            <div className="col-span-12 lg:col-span-7 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Top Filiais — Custo de Estoque</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Custo total do estoque final por filial</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.por_filial.slice(0, 15)} layout="vertical"
                  margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={fmtBRL} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={130}
                    tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + '…' : v} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [fmtBRL(v), 'Custo Estoque']} />
                  <Bar dataKey="custo" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                    {stats.por_filial.slice(0, 15).map((_: any, i: number) => (
                      <Cell key={i} fill={`rgba(245,158,11,${0.9 - i * 0.04})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top grupos */}
            <div className="col-span-12 lg:col-span-5 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Top Grupos</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Custo estoque por categoria</div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={stats.por_grupo.slice(0, 8)} dataKey="custo" nameKey="grupo"
                    cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                    {stats.por_grupo.slice(0, 8).map((_: any, i: number) => (
                      <Cell key={i} fill={CORES[i % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [fmtBRL(v), 'Custo']} />
                  <Legend formatter={(v: string) => v.length > 20 ? v.slice(0, 18) + '…' : v}
                    iconSize={10} wrapperStyle={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Entradas vs Saídas */}
          <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Entradas vs Saídas — Top 10 Filiais</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Comparativo de custo por filial</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.por_filial.slice(0, 10)} margin={{ top: 0, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="nome" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} angle={-35} textAnchor="end" interval={0}
                  tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 12) + '…' : v} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={fmtBRL} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number, name: string) => [fmtBRL(v), name]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '0.72rem', paddingTop: 8 }} />
                <Bar dataKey="custo_entrada" name="Custo Entrada" fill="rgba(16,185,129,0.8)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="custo_saida"   name="Custo Saída"   fill="rgba(139,92,246,0.8)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="custo"         name="Custo Final"   fill="rgba(245,158,11,0.8)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top produtos */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between p-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Top 20 Produtos por Custo de Estoque</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>Clique para ver detalhes</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['#', 'Produto', 'Grupo', 'Filiais', 'Estoque', 'Custo Final', 'Entradas', 'Saídas'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.top_produtos.map((p: any, i: number) => (
                    <tr key={p.id} style={{ cursor: 'pointer' }}
                      onClick={() => setDetalheProd(p)}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: i < 3 ? '#f59e0b' : 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px', fontSize: '0.8rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.nome}>{p.nome}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>{p.grupo}</span>
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textAlign: 'center' }}>{p.n_filiais}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: p.estoque < 0 ? '#ef4444' : 'var(--text-secondary)' }}>{fmtNum(p.estoque)}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: '#f59e0b' }}>{fmtBRL(p.custo)}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#10b981' }}>+{fmtNum(p.entrada)}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#8b5cf6' }}>-{fmtNum(p.saida)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── LISTA VIEW ── */}
      {!loading && hasData && viewMode === 'lista' && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Buscar produto…" value={busca}
                onChange={e => { setBusca(e.target.value); setPageNum(1) }}
                style={{ ...selStyle, paddingLeft: 30, minWidth: 200 }} />
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {!itens ? (
              <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#f59e0b', animation: 'spin 0.7s linear infinite', marginRight: 10 }} />
                Carregando…
              </div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Produto','Grupo','Filial','Período','Est. Anterior','Qtd Entrada','Custo Entrada','Qtd Saída','Custo Saída','Est. Final','Custo Final'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {itens.items.map((r: any) => (
                      <tr key={r.id}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                        <td style={{ padding: '7px 12px', fontSize: '0.78rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.nome_produto}>{r.nome_produto}</td>
                        <td style={{ padding: '7px 12px' }}><span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 99, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontWeight: 700 }}>{r.grupo}</span></td>
                        <td style={{ padding: '7px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nome_filial}</td>
                        <td style={{ padding: '7px 12px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{r.periodo}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textAlign: 'right' }}>{fmtNum(r.estoque_anterior)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textAlign: 'right', color: '#10b981' }}>+{fmtNum(r.qtd_entrada)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textAlign: 'right', color: '#10b981' }}>{fmtBRL(r.custo_entrada)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textAlign: 'right', color: '#8b5cf6' }}>-{fmtNum(r.qtd_saida)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textAlign: 'right', color: '#8b5cf6' }}>{fmtBRL(r.custo_saida)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textAlign: 'right', color: r.estoque_final < 0 ? '#ef4444' : 'var(--text-secondary)' }}>{fmtNum(r.estoque_final)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>{fmtBRL(r.custo_final)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {itens.total.toLocaleString('pt-BR')} resultados · página {pageNum} de {Math.ceil(itens.total / 50)}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum === 1}
                      style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: pageNum === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: pageNum === 1 ? 'not-allowed' : 'pointer' }}>
                      <ChevronLeft size={14} />
                    </button>
                    <button onClick={() => setPageNum(p => p + 1)} disabled={pageNum >= Math.ceil(itens.total / 50)}
                      style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: pageNum >= Math.ceil(itens.total / 50) ? 'var(--text-muted)' : 'var(--text-primary)', cursor: pageNum >= Math.ceil(itens.total / 50) ? 'not-allowed' : 'pointer' }}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Detalhe produto (modal simples) */}
      {detalheProd && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={() => setDetalheProd(null)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="relative z-10 w-full" style={{ maxWidth: 500, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div style={{ fontSize: '0.65rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{detalheProd.grupo}</div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{detalheProd.nome}</h3>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>ID: {detalheProd.id} · {detalheProd.n_filiais} filial(is)</div>
              </div>
              <button onClick={() => setDetalheProd(null)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={13} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Estoque Final', value: fmtNum(detalheProd.estoque), color: detalheProd.estoque < 0 ? '#ef4444' : '#f59e0b' },
                { label: 'Custo Final',  value: fmtBRL(detalheProd.custo), color: '#f59e0b' },
                { label: 'Qtd Entradas', value: `+${fmtNum(detalheProd.entrada)}`, color: '#10b981' },
                { label: 'Qtd Saídas',   value: `-${fmtNum(detalheProd.saida)}`,  color: '#8b5cf6' },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 5 }}>{item.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onSuccess={() => { loadPeriodos(); loadStats() }}
        />
      )}
    </div>
  )
}
