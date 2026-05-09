// ============================================================
// pages/Gente/GentePage.tsx — Módulo Gente e Gestão
// ============================================================
import { useEffect, useState, useCallback, useRef } from 'react'
import { useDashboardStore } from '@/store'
import { GenteAPI } from '@/services/api'
import { ConferenciaPage } from '@/pages/Conferencia/ConferenciaPage'
import { LojaSelectField } from '@/components/UI/LojaSelectField'

import {
  Upload, X, CheckCircle2, AlertTriangle, RefreshCw,
  FileSpreadsheet, Users, Trash2, Search, ChevronLeft,
  ChevronRight, Info, TrendingUp, DollarSign, UserCheck,
  Building2, Briefcase, Calendar, BarChart3
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'

// ── Formatadores ──────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtNum = (v: number) => Math.round(v).toLocaleString('pt-BR')

const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const CORES = ['#06b6d4','#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#f97316','#84cc16','#a78bfa']

const SEL_STYLE: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', padding: '7px 11px', borderRadius: 8,
  fontSize: '0.78rem', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none',
}

// ── Modal de Import ───────────────────────────────────────────
function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile]       = useState<File | null>(null)
  const [loja, setLoja]       = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<any>(null)
  const [error, setError]     = useState<string | null>(null)
  const [drag, setDrag]       = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)

  const doImport = async () => {
    if (!file) return
    if (!loja) { setError('Selecione a loja de destino.'); return }
    setLoading(true); setError(null)
    try {
      const r = await GenteAPI.importar(file, undefined, loja)
      setResult(r); onSuccess()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="relative z-10 w-full" style={{ maxWidth: 560, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Importar Folha de Pagamento</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Excel ou CSV — mês detectado pelo nome do arquivo</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Info */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Info size={13} style={{ color: '#06b6d4', flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#06b6d4' }}>Mês detectado automaticamente pelo nome do arquivo</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Nomeie como <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#06b6d4' }}>Folha_Janeiro.xlsx</span>, <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#06b6d4' }}>Folha_Fevereiro.xlsx</span> etc.<br/>
              Colunas mapeadas automaticamente a qualquer formato de ERP.<br/>
              Importação incremental — registros já existentes são ignorados.
            </div>
          </div>

          {/* Loja de destino */}
          {!result && (
            <LojaSelectField value={loja} onChange={setLoja} label="Filial / Loja de destino" />
          )}

          {/* Drop zone */}
          {!result && (
            <label
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setError(null) } }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 20px', borderRadius: 12, border: `2px dashed ${drag ? '#06b6d4' : file ? '#10b981' : 'var(--border)'}`, background: drag ? 'rgba(6,182,212,0.04)' : file ? 'rgba(16,185,129,0.04)' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center' }}
              onClick={() => !file && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setError(null) } }} />
              {file ? (
                <>
                  <CheckCircle2 size={28} style={{ color: '#10b981' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#10b981' }}>{file.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  <button onClick={e => { e.stopPropagation(); e.preventDefault(); setFile(null) }} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Trocar arquivo</button>
                </>
              ) : (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}><Upload size={22} /></div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Arraste ou <span style={{ color: '#06b6d4', fontWeight: 600 }}>clique para selecionar</span></div>
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
              <div className="p-4" style={{ background: 'rgba(16,185,129,0.08)' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981', marginBottom: 12 }}>
                  ✓ Importação concluída — {result.mes_nome} {result.competencia?.split('-')[0]}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Inseridos',  value: result.inseridos,  color: '#10b981' },
                    { label: 'Ignorados',  value: result.ignorados,  color: '#6b7280' },
                    { label: 'Erros',      value: result.erros,      color: result.erros > 0 ? '#ef4444' : '#6b7280' },
                  ].map(item => (
                    <div key={item.label} className="text-center rounded-lg p-2.5" style={{ background: 'var(--bg-elevated)' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                {result.colunas_mapeadas?.length > 0 && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Colunas detectadas: <span style={{ color: 'var(--text-secondary)' }}>{result.colunas_mapeadas.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2.5">
            {result ? (
              <>
                <button onClick={() => { setResult(null); setFile(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <RefreshCw size={14} /> Importar outro mês
                </button>
                <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#10b981', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> Fechar
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancelar</button>
                <button onClick={doImport} disabled={!file || loading}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, background: file && !loading ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'var(--bg-elevated)', border: 'none', color: file && !loading ? '#fff' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: file && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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

// ── Página Principal ──────────────────────────────────────────
export function GentePage() {
  const { genteSubSection } = useDashboardStore()
  const [stats, setStats]               = useState<any>(null)
  const [competencias, setCompetencias] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [importOpen, setImportOpen]     = useState(false)

  // Filtros
  const [compSel, setCompSel]           = useState('')
  const [anoSel, setAnoSel]             = useState(new Date().getFullYear())
  const [mesSel, setMesSel]             = useState(0)
  const [deptoSel, setDeptoSel]         = useState('')
  const [filialSel, setFilialSel]       = useState('')
  const [cargoSel, setCargoSel]         = useState('')

  // Lista
  const [itens, setItens]               = useState<any>(null)
  const [colabs, setColabs]             = useState<any>(null)
  const [pageNum, setPageNum]           = useState(1)
  const [busca, setBusca]               = useState('')
  const [deleting, setDeleting]         = useState(false)

  const competenciaSel = mesSel > 0 ? `${anoSel}-${String(mesSel).padStart(2,'0')}` : compSel

  const loadCompetencias = useCallback(async () => {
    try {
      const data = await GenteAPI.getCompetencias()
      setCompetencias(data)
      if (data.length > 0 && !compSel) {
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
      if (competenciaSel) params.competencia  = competenciaSel
      if (deptoSel)       params.departamento = deptoSel
      if (filialSel)      params.filial       = filialSel
      if (cargoSel)       params.cargo        = cargoSel
      const data = await GenteAPI.getStats(Object.keys(params).length > 0 ? params : undefined)
      setStats(data)
    } catch { setStats(null) }
    finally { setLoading(false) }
  }, [competenciaSel, deptoSel, filialSel, cargoSel])

  const loadItens = useCallback(async () => {
    const params: Record<string, string | number> = { page: pageNum, page_size: 50 }
    if (competenciaSel) params.competencia  = competenciaSel
    if (deptoSel)       params.departamento = deptoSel
    if (filialSel)      params.filial       = filialSel
    if (cargoSel)       params.cargo        = cargoSel
    if (busca)          params.busca        = busca
    try { const data = await GenteAPI.getItens(params); setItens(data) } catch {}
  }, [competenciaSel, deptoSel, filialSel, cargoSel, busca, pageNum])

  const loadColabs = useCallback(async () => {
    const params: Record<string, string | number> = { page: pageNum, page_size: 50 }
    if (busca) params.busca = busca
    try { const data = await GenteAPI.getColaboradores(params); setColabs(data) } catch {}
  }, [busca, pageNum])

  useEffect(() => { loadCompetencias() }, [])
  useEffect(() => { loadStats() }, [competenciaSel, deptoSel, filialSel, cargoSel])
  useEffect(() => {
    if (genteSubSection === 'folha' || genteSubSection === 'overview') loadItens()
    if (genteSubSection === 'colaboradores') loadColabs()
  }, [genteSubSection, competenciaSel, deptoSel, filialSel, cargoSel, busca, pageNum])

  const handleDelete = async () => {
    if (!competenciaSel) return
    const mesNome = MESES[mesSel] || competenciaSel
    if (!confirm(`Excluir todos os dados de ${mesNome}?\n\nEsta ação não pode ser desfeita.`)) return
    setDeleting(true)
    try {
      await GenteAPI.deleteCompetencia(competenciaSel)
      setMesSel(0)
      await loadCompetencias()
      await loadStats()
    } catch (e: any) { alert('Erro: ' + e.message) }
    finally { setDeleting(false) }
  }

  const hasData = !!(stats && stats.kpis && (stats.kpis.total_colaboradores > 0 || stats.kpis.massa_salarial > 0))

  // ── Sub-sections ─────────────────────────────────────────
  const renderContent = () => {
    // Conferência de Folha é módulo próprio — renderiza sempre, independente do estado do Gente
    if (genteSubSection === 'conferencia') return <ConferenciaPage />

    if (loading) return (
      <div className="flex items-center justify-center py-24">
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#06b6d4', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ marginLeft: 12, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Carregando…</span>
      </div>
    )

    if (!hasData && genteSubSection !== 'upload') return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}>
          <Users size={32} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Nenhum dado importado</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 380 }}>
            Importe a planilha de folha de pagamento para visualizar o dashboard completo.
            Nomeie o arquivo como <strong>Folha_Janeiro.xlsx</strong>.
          </p>
        </div>
        <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <Upload size={15} /> Importar Folha
        </button>
      </div>
    )

    switch (genteSubSection) {
      case 'overview':
      case 'indicadores':
        return <OverviewView stats={stats} competencias={competencias} />
      case 'folha':
        return <FolhaView itens={itens} page={pageNum} setPage={setPageNum} busca={busca} setBusca={setBusca} />
      case 'colaboradores':
        return <ColabView colabs={colabs} page={pageNum} setPage={setPageNum} busca={busca} setBusca={setBusca} />
      case 'ferias':
        return <FeriasView stats={stats} />
      case 'upload':
        return <UploadView onImport={() => setImportOpen(true)} competencias={competencias} onDelete={handleDelete} deleting={deleting} compSel={competenciaSel} mesSel={mesSel} />
      default:
        return <OverviewView stats={stats} competencias={competencias} />
    }
  }

  const SUB_LABELS: Record<string,string> = {
    overview: 'Visão Geral', folha: 'Folha de Pagamento', colaboradores: 'Colaboradores',
    conferencia: 'Conferência de Folha', ferias: 'Férias / Afastamentos',
    indicadores: 'Indicadores RH', upload: 'Upload',
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Gente e Gestão — <span style={{ color: '#06b6d4' }}>{SUB_LABELS[genteSubSection] || 'Visão Geral'}</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            {hasData ? `${stats.kpis.total_colaboradores} colaboradores · ${competenciaSel || 'todos os períodos'}` : 'Nenhum dado importado'}
          </p>
        </div>
        {genteSubSection !== 'conferencia' && (
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <Upload size={14} /> Importar Folha
          </button>
        )}
      </div>

      {/* Filtro por mês — oculto na conferência */}
      {competencias.length > 0 && genteSubSection !== 'conferencia' && (
        <div className="mb-4">
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>
            Competência — {anoSel}
          </div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <button onClick={() => setMesSel(0)}
              style={{ padding: '5px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: mesSel === 0 ? '#06b6d4' : 'var(--bg-elevated)', color: mesSel === 0 ? '#0a0a0a' : 'var(--text-secondary)', border: `1px solid ${mesSel === 0 ? '#06b6d4' : 'var(--border)'}`, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Todos
            </button>
            {competencias
              .filter((c: any) => c.competencia?.startsWith(String(anoSel)))
              .sort((a: any, b: any) => a.competencia.localeCompare(b.competencia))
              .map((c: any) => {
                const mes = parseInt(c.competencia.split('-')[1])
                const active = mesSel === mes
                return (
                  <button key={c.competencia} onClick={() => setMesSel(mes)}
                    title={`${c.colab} colaboradores · ${c.massa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}`}
                    style={{ padding: '5px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: active ? '#06b6d4' : 'var(--bg-card)', color: active ? '#0a0a0a' : 'var(--text-secondary)', border: `1px solid ${active ? '#06b6d4' : 'var(--border)'}`, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
                    {c.mes_nome || MESES[mes]}
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

      {/* Filtros secundários */}
      {hasData && genteSubSection !== 'conferencia' && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {(stats?.filtros?.departamentos?.length || 0) > 0 && (
            <select style={SEL_STYLE} value={deptoSel} onChange={e => { setDeptoSel(e.target.value); setPageNum(1) }}>
              <option value="">Todos os departamentos</option>
              {stats.filtros.departamentos.map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          {(stats?.filtros?.empresas?.length || 0) > 1 && (
            <select style={SEL_STYLE} value={filialSel} onChange={e => { setFilialSel(e.target.value); setPageNum(1) }}>
              <option value="">Todas as empresas</option>
              {stats.filtros.empresas.map((f: string) => <option key={f} value={f}>{f}</option>)}
            </select>
          )}
          {(stats?.filtros?.cargos?.length || 0) > 0 && (
            <select style={SEL_STYLE} value={cargoSel} onChange={e => { setCargoSel(e.target.value); setPageNum(1) }}>
              <option value="">Todos os cargos</option>
              {stats.filtros.cargos.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {(deptoSel || filialSel || cargoSel) && (
            <button onClick={() => { setDeptoSel(''); setFilialSel(''); setCargoSel(''); setPageNum(1) }}
              style={{ ...SEL_STYLE, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>
              <X size={12} style={{ display: 'inline', marginRight: 4 }} />Limpar
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {renderContent()}

      {importOpen && genteSubSection !== 'conferencia' && <ImportModal onClose={() => setImportOpen(false)} onSuccess={() => { loadCompetencias(); loadStats() }} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Overview / Indicadores ────────────────────────────────────
function OverviewView({ stats, competencias }: { stats: any; competencias: any[] }) {
  if (!stats || !stats.kpis) return null
  const k = stats.kpis
  const porDepto  = stats.por_departamento || []
  const porCargo  = stats.por_cargo        || []
  const compsEvo  = stats.competencias     || []

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Colaboradores',   value: fmtNum(k.total_colaboradores), color: '#06b6d4', icon: <Users size={16} /> },
          { label: 'Massa Salarial',  value: fmtBRL(k.massa_salarial),       color: '#3b82f6', icon: <DollarSign size={16} /> },
          { label: 'Total Líquido',   value: fmtBRL(k.total_liquido),        color: '#10b981', icon: <TrendingUp size={16} /> },
          { label: 'Média Líquida',   value: fmtBRL(k.media_liquido || 0),   color: '#8b5cf6', icon: <BarChart3 size={16} /> },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: item.color }} />
            <div className="flex items-center justify-between mb-2">
              <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{item.label}</div>
              <div style={{ color: item.color, opacity: 0.7 }}>{item.icon}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.35rem', fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Bruto vs Descontos */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Total Bruto',     value: fmtBRL(k.total_bruto || 0),    color: '#f59e0b' },
          { label: 'Total Descontos', value: fmtBRL(k.total_descontos || 0), color: '#ef4444' },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Placeholder encargos */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'FGTS',  value: k.total_fgts ? fmtBRL(k.total_fgts) : '—', color: '#f59e0b' },
          { label: 'INSS',  value: k.total_inss ? fmtBRL(k.total_inss) : '—', color: '#ef4444' },
          { label: 'IRRF',  value: k.total_irrf ? fmtBRL(k.total_irrf) : '—', color: '#ec4899' },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-12 gap-3.5 mb-5">
        {/* Por departamento */}
        <div className="col-span-12 lg:col-span-7 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Massa Salarial por Departamento</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Top 10</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={porDepto.slice(0,10)} layout="vertical" margin={{ right: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => fmtBRL(v)} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={120}
                tickFormatter={(v: string) => v?.length > 16 ? v.slice(0,14)+'…' : v} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, name: string) => [fmtBRL(v), name === 'massa' ? 'Massa Salarial' : 'Líquido']} />
              <Bar dataKey="massa" fill="#06b6d4" radius={[0,4,4,0]}>
                {porDepto.slice(0,10).map((_: any, i: number) => (
                  <Cell key={i} fill={`rgba(6,182,212,${0.9 - i * 0.06})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Por filial */}
        <div className="col-span-12 lg:col-span-5 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Colaboradores por Filial</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Distribuição</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={(stats.por_filial || []).slice(0,8)} dataKey="colab" nameKey="nome"
                cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3}>
                {(stats.por_filial || []).slice(0,8).map((_: any, i: number) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [v, 'Colaboradores']} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}
                formatter={(v: string) => v?.length > 18 ? v.slice(0,16)+'…' : v} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evolução mensal */}
      {compsEvo.length > 1 && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Evolução da Massa Salarial</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Por competência</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={[...compsEvo].reverse()} margin={{ right: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="mes_nome" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => fmtBRL(v)} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [fmtBRL(v), 'Massa Salarial']} />
              <Line type="monotone" dataKey="massa" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top cargos */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Distribuição por Cargo</div>
        </div>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Cargo','Colaboradores','Massa Salarial','Média Salarial'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {porCargo.map((c: any, i: number) => (
                <tr key={i} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                  <td style={{ padding: '8px 14px', fontSize: '0.8rem' }}>{c.nome}</td>
                  <td style={{ padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#06b6d4' }}>{c.colab}</td>
                  <td style={{ padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{fmtBRL(c.massa)}</td>
                  <td style={{ padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#8b5cf6' }}>{fmtBRL(c.media)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ── Folha view ────────────────────────────────────────────────
function FolhaView({ itens, page, setPage, busca, setBusca }: any) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative flex-1" style={{ maxWidth: 280 }}>
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Buscar colaborador…" value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ ...SEL_STYLE, paddingLeft: 30, width: '100%' }} />
        </div>
        {itens && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{itens.total?.toLocaleString('pt-BR')} registros</span>}
      </div>
      {!itens ? (
        <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#06b6d4', animation: 'spin 0.7s linear infinite', marginRight: 10 }} />Carregando…
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Matrícula','Colaborador','Departamento','Cargo','Admissão','Sal. Base','Sal. Bruto','Descontos','Líquido'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.items.map((r: any) => (
                  <tr key={r.id} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.matricula}</td>
                    <td style={{ padding: '7px 12px', fontSize: '0.8rem', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</td>
                    <td style={{ padding: '7px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.departamento}</td>
                    <td style={{ padding: '7px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.cargo}</td>
                    <td style={{ padding: '7px 12px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.filial}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{r.salario_base ? fmtBRL(r.salario_base) : '—'}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#10b981' }}>{r.total_proventos ? fmtBRL(r.total_proventos) : '—'}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#ef4444' }}>{r.total_descontos ? fmtBRL(r.total_descontos) : '—'}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: '#06b6d4' }}>{r.liquido ? fmtBRL(r.liquido) : '—'}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#f59e0b' }}>{r.fgts ? fmtBRL(r.fgts) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Página {page} de {Math.ceil(itens.total / 50)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p: number) => Math.max(1, p-1))} disabled={page === 1}
                style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage((p: number) => p+1)} disabled={page >= Math.ceil(itens.total/50)}
                style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: page >= Math.ceil(itens.total/50) ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page >= Math.ceil(itens.total/50) ? 'not-allowed' : 'pointer' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Colaboradores view ────────────────────────────────────────
function ColabView({ colabs, page, setPage, busca, setBusca }: any) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative" style={{ maxWidth: 280 }}>
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Buscar colaborador…" value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ ...SEL_STYLE, paddingLeft: 30, width: 260 }} />
        </div>
        {colabs && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{colabs.total?.toLocaleString('pt-BR')} colaboradores</span>}
      </div>
      {!colabs ? (
        <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#06b6d4', animation: 'spin 0.7s linear infinite', marginRight: 10 }} />Carregando…
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Matrícula','Nome','Cargo','Departamento','Filial','Admissão','Situação','Salário Base'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colabs.items.map((r: any) => (
                  <tr key={r.id} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.matricula}</td>
                    <td style={{ padding: '7px 12px', fontSize: '0.8rem', fontWeight: 500 }}>{r.nome}</td>
                    <td style={{ padding: '7px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{r.cargo}</td>
                    <td style={{ padding: '7px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{r.departamento}</td>
                    <td style={{ padding: '7px 12px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.filial}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.data_admissao}</td>
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: r.situacao?.toLowerCase().includes('ativo') ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', color: r.situacao?.toLowerCase().includes('ativo') ? '#10b981' : '#6b7280' }}>
                        {r.situacao || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#06b6d4', fontWeight: 600 }}>{r.salario_base ? fmtBRL(r.salario_base) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Página {page} de {Math.ceil(colabs.total / 50)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p: number) => Math.max(1,p-1))} disabled={page===1}
                style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: page===1?'var(--text-muted)':'var(--text-primary)', cursor: page===1?'not-allowed':'pointer' }}>
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage((p: number) => p+1)} disabled={page>=Math.ceil(colabs.total/50)}
                style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: page>=Math.ceil(colabs.total/50)?'var(--text-muted)':'var(--text-primary)', cursor: page>=Math.ceil(colabs.total/50)?'not-allowed':'pointer' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Férias placeholder ────────────────────────────────────────
function FeriasView({ stats }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}>
        <Calendar size={28} />
      </div>
      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Férias e Afastamentos</h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 340 }}>
        Esta aba será preenchida automaticamente quando o relatório de folha incluir colunas de férias e afastamentos.
      </p>
    </div>
  )
}

// ── Upload / Histórico ────────────────────────────────────────
function UploadView({ onImport, competencias, onDelete, deleting, compSel, mesSel }: any) {
  return (
    <div className="flex flex-col gap-5">
      {/* Import card */}
      <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-card)', border: '2px dashed var(--border)' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4', margin: '0 auto 14px' }}>
          <Upload size={26} />
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 6 }}>Importar Folha de Pagamento</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 16, maxWidth: 380, margin: '0 auto 16px' }}>
          Nomeie o arquivo como <strong>Folha_MES.xlsx</strong> — o sistema detecta o mês automaticamente.
          Importação incremental — registros já existentes são ignorados.
        </div>
        <button onClick={onImport} className="flex items-center gap-2 px-6 py-2.5 rounded-xl mx-auto"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <Upload size={15} /> Selecionar arquivo
        </button>
      </div>

      {/* Competências importadas */}
      {competencias.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Competências Importadas</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Competência','Colaboradores','Massa Salarial','Líquido','Ações'].map(h => (
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
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#06b6d4' }}>{c.colab}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{fmtBRL(c.massa)}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#10b981' }}>{fmtBRL(c.liquido)}</td>
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
