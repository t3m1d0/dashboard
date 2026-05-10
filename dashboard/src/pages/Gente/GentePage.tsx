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
  const { genteSubSection, lojasAtivas } = useDashboardStore()
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
  const [turnover, setTurnover]         = useState<any>(null)
  const [overview, setOverview]         = useState<any>(null)
  const [filialConf, setFilialConf]     = useState('')
  const [filiaisConf, setFiliaisConf]   = useState<any[]>([])
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
      // Global loja filter
      if (lojasAtivas.length > 0 && !filialSel) params.empresa = lojasAtivas.map((l: any) => l.nome).join('||')
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
    if (lojasAtivas.length > 0 && !filialSel) params.empresa = lojasAtivas.map((l: any) => l.nome).join('||')
    if (busca)          params.busca        = busca
    try { const data = await GenteAPI.getItens(params); setItens(data) } catch {}
  }, [competenciaSel, deptoSel, filialSel, cargoSel, busca, pageNum])

  const loadColabs = useCallback(async () => {
    const params: Record<string, string | number> = { page: pageNum, page_size: 50 }
    if (filialConf) {
      // Busca do cadastro (gente_colaboradores) por filial da conferência
      params.filial = filialConf
      if (cargoSel) params.cargo = cargoSel
      if (busca)    params.busca = busca
      try { const data = await GenteAPI.getCadastro(params); setColabs(data) } catch {}
    } else {
      // Busca da folha de pagamento (gente_folha) — CSC
      if (competenciaSel) params.competencia = competenciaSel
      if (deptoSel)       params.empresa     = deptoSel
      if (cargoSel)       params.cargo       = cargoSel
      if (busca)          params.busca       = busca
      try { const data = await GenteAPI.getColaboradoresPorCompetencia(params); setColabs(data) } catch {}
    }
  }, [busca, pageNum, competenciaSel, deptoSel, cargoSel, filialConf])

  // Reload colabs when filialConf changes
  useEffect(() => {
    if (genteSubSection === 'colaboradores') { loadColabs(); loadTurnover() }
  }, [filialConf])

  const loadTurnover = useCallback(async () => {
    const params: Record<string, string> = {}
    if (competenciaSel) params.competencia_atual = competenciaSel
    if (filialConf)     params.filial = filialConf
    try { const data = await GenteAPI.getTurnover(params); setTurnover(data) } catch {}
  }, [competenciaSel, filialConf])

  useEffect(() => {
    loadCompetencias()
    GenteAPI.getFiliais().then(setFiliaisConf).catch(() => {})
  }, [])

  const loadOverview = useCallback(async () => {
    const params: Record<string,string> = {}
    if (competenciaSel) params.competencia = competenciaSel
    try { const d = await GenteAPI.getOverview(params); setOverview(d) } catch {}
  }, [competenciaSel])

  useEffect(() => {
    if (genteSubSection === 'overview') loadOverview()
  }, [genteSubSection, competenciaSel])
  useEffect(() => { loadStats() }, [competenciaSel, deptoSel, filialSel, cargoSel, lojasAtivas])
  useEffect(() => {
    if (genteSubSection === 'folha' || genteSubSection === 'overview') loadItens()
    if (genteSubSection === 'colaboradores') { loadColabs(); loadTurnover() }
    if (genteSubSection === 'colaboradores' && (filialConf !== undefined)) { /* dep tracked */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const hasOverviewData = !!(overview && overview.consolidado && overview.consolidado.total_colaboradores > 0)

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

    if (!hasData && !hasOverviewData && genteSubSection !== 'upload' && genteSubSection !== 'colaboradores' && genteSubSection !== 'overview') return (
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
        return <ColabView colabs={colabs} turnover={turnover} page={pageNum} setPage={setPageNum} busca={busca} setBusca={setBusca} filialConf={filialConf} setFilialConf={setFilialConf} filiais={filiaisConf} />
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
            {hasData ? `${stats.kpis.total_colaboradores} colaboradores CSC · ${competenciaSel || 'todos os períodos'}` : hasOverviewData ? `${overview.consolidado.total_colaboradores} colaboradores · CSC + Filiais` : 'Nenhum dado importado'}
            {lojasAtivas.length > 0 && <span style={{ color: '#06b6d4', marginLeft: 6 }}>· {lojasAtivas.length === 1 ? lojasAtivas[0].nome : lojasAtivas.length + ' lojas'}</span>}
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


// ── Filial Dropdown ───────────────────────────────────────────
function FilialDropdown({ filiais, filialConf, setFilialConf }: any) {
  const [open, setOpen]   = useState(false)
  const [busca, setBusca] = useState('')

  const filtered = (filiais || []).filter((f: any) => {
    const nome = typeof f === 'string' ? f : f.filial
    return !busca || nome.toLowerCase().includes(busca.toLowerCase())
  })

  const label = filialConf
    ? (filialConf.length > 26 ? filialConf.slice(0, 24) + '…' : filialConf)
    : 'CSC — Folha de Pgto.'

  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
        Fonte de dados
      </div>
      <button onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 10, background: filialConf ? 'rgba(6,182,212,0.1)' : 'var(--bg-elevated)', border: `1px solid ${filialConf ? 'rgba(6,182,212,0.4)' : 'var(--border)'}`, color: filialConf ? '#06b6d4' : 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', maxWidth: 320 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {filialConf
          ? <span onClick={e => { e.stopPropagation(); setFilialConf('') }} style={{ fontSize: '0.7rem', marginLeft: 4, opacity: 0.7 }}>✕</span>
          : <span style={{ fontSize: '0.7rem', marginLeft: 4, opacity: 0.5 }}>▾</span>
        }
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => { setOpen(false); setBusca('') }} />
          <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 50, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', width: 360, maxHeight: 420, display: 'flex', flexDirection: 'column' }}>

            {/* Search */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <input autoFocus placeholder="Buscar filial..." value={busca} onChange={e => setBusca(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none' }} />
            </div>

            {/* CSC option */}
            <button onClick={() => { setFilialConf(''); setOpen(false); setBusca('') }}
              style={{ padding: '9px 14px', textAlign: 'left', background: !filialConf ? 'rgba(6,182,212,0.08)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', color: !filialConf ? '#06b6d4' : 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: !filialConf ? 700 : 400, fontFamily: 'var(--font-body)', flexShrink: 0 }}>
              🏢 CSC — Folha de Pgto.
            </button>

            {/* Filiais list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.length === 0
                ? <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Nenhuma filial encontrada</div>
                : filtered.map((f: any) => {
                    const nome = typeof f === 'string' ? f : f.filial
                    const n    = typeof f === 'string' ? null : f.n
                    const active = filialConf === nome
                    return (
                      <button key={nome} onClick={() => { setFilialConf(nome); setOpen(false); setBusca('') }}
                        style={{ width: '100%', padding: '8px 14px', textAlign: 'left', background: active ? 'rgba(6,182,212,0.08)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? 'rgba(6,182,212,0.08)' : 'transparent' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: active ? 600 : 400, color: active ? '#06b6d4' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
                        {n && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>{n} colab.</span>}
                      </button>
                    )
                  })
              }
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Colaboradores view ────────────────────────────────────────
function ColabView({ colabs, turnover, page, setPage, busca, setBusca, filialConf, setFilialConf, filiais }: any) {
  const [tab, setTab] = useState<'ativos'|'contratados'|'desligados'>('ativos')

  const tv = turnover || {}
  const tabStyle = (t: string) => ({
    padding: '6px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
    background: tab === t ? '#06b6d4' : 'var(--bg-elevated)',
    color: tab === t ? '#0a0a0a' : 'var(--text-secondary)',
    border: `1px solid ${tab === t ? '#06b6d4' : 'var(--border)'}`,
    cursor: 'pointer', fontFamily: 'var(--font-body)',
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Seletor de filial — dropdown */}
      <FilialDropdown
        filiais={filiais}
        filialConf={filialConf}
        setFilialConf={setFilialConf}
      />

      {/* Turnover Cards */}
      {tv.competencia_atual && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Headcount Atual',   value: tv.headcount_atual,    sub: tv.competencia_atual,    color: '#06b6d4' },
            { label: 'Variação',          value: (tv.variacao_headcount > 0 ? '+' : '') + tv.variacao_headcount, sub: `vs ${tv.competencia_anterior || '—'}`, color: tv.variacao_headcount > 0 ? '#10b981' : tv.variacao_headcount < 0 ? '#ef4444' : '#6b7280' },
            { label: 'Contratados',       value: tv.contratados,         sub: tv.competencia_atual,    color: '#10b981' },
            { label: 'Desligados',        value: tv.desligados,          sub: tv.competencia_anterior || '—', color: '#ef4444' },
          ].map(item => (
            <div key={item.label} className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: item.color }} />
              <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color: item.color }}>{item.value ?? '—'}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3 }}>{item.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Turnover % */}
      {tv.turnover_pct > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Turnover do Período</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: tv.turnover_pct > 5 ? '#ef4444' : tv.turnover_pct > 3 ? '#f59e0b' : '#10b981' }}>
              {tv.turnover_pct}%
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: 320 }}>
            Fórmula: (Desligados + Contratados) ÷ 2 ÷ Headcount médio × 100<br/>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
              ({tv.desligados} + {tv.contratados}) ÷ 2 ÷ {((tv.headcount_atual + tv.headcount_anterior) / 2).toFixed(0)} × 100
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        <button onClick={() => setTab('ativos')} style={tabStyle('ativos')}>
          Ativos ({tv.headcount_atual ?? colabs?.total ?? '…'})
        </button>
        {(tv.contratados > 0) && (
          <button onClick={() => setTab('contratados')} style={tabStyle('contratados')}>
            🟢 Contratados ({tv.contratados})
          </button>
        )}
        {(tv.desligados > 0) && (
          <button onClick={() => setTab('desligados')} style={tabStyle('desligados')}>
            🔴 Desligados ({tv.desligados})
          </button>
        )}
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Buscar…" value={busca} onChange={e => setBusca(e.target.value)}
            style={{ ...SEL_STYLE, paddingLeft: 28, width: 200, padding: '6px 10px 6px 28px' }} />
        </div>
      </div>

      {/* Lista de contratados/desligados */}
      {(tab === 'contratados' || tab === 'desligados') && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: `1px solid ${tab === 'contratados' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', fontSize: '0.82rem', fontWeight: 600, color: tab === 'contratados' ? '#10b981' : '#ef4444' }}>
            {tab === 'contratados' ? '🟢 Contratados' : '🔴 Desligados'} — {tv.competencia_atual}
          </div>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Matrícula','Nome','Cargo','Empresa','Admissão','Sal. Base','Sal. Bruto','Líquido'].map(h => (
                  <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(tab === 'contratados' ? tv.lista_contratados : tv.lista_desligados)?.map((r: any, i: number) => (
                  <tr key={i} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.matricula}</td>
                    <td style={{ padding: '7px 12px', fontSize: '0.8rem', fontWeight: 500 }}>{r.nome}</td>
                    <td style={{ padding: '7px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{r.cargo}</td>
                    <td style={{ padding: '7px 12px', fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.empresa}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.data_admissao || '—'}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{fmtBRL(r.salario_base)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#f59e0b' }}>{fmtBRL(r.salario_bruto)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#06b6d4', fontWeight: 600 }}>{fmtBRL(r.salario_liquido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabela de ativos */}
      {tab === 'ativos' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {!colabs ? (
            <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#06b6d4', animation: 'spin 0.7s linear infinite', marginRight: 10 }} />Carregando…
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Matrícula','Nome','Cargo','Empresa','Admissão','Sal. Base','Sal. Bruto','Líquido'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {colabs.items?.map((r: any, i: number) => (
                      <tr key={i} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.matricula}</td>
                        <td style={{ padding: '7px 12px', fontSize: '0.8rem', fontWeight: 500 }}>{r.nome}</td>
                        <td style={{ padding: '7px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{r.cargo}</td>
                        <td style={{ padding: '7px 12px', fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.empresa}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.data_admissao || '—'}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{fmtBRL(r.salario_base)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#f59e0b' }}>{fmtBRL(r.salario_bruto)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#06b6d4', fontWeight: 600 }}>{fmtBRL(r.salario_liquido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Página {page} de {Math.ceil((colabs.total||1) / 50)}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p: number) => Math.max(1,p-1))} disabled={page===1}
                    style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: page===1?'var(--text-muted)':'var(--text-primary)', cursor: page===1?'not-allowed':'pointer' }}>
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage((p: number) => p+1)} disabled={page>=Math.ceil((colabs.total||1)/50)}
                    style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: page>=Math.ceil((colabs.total||1)/50)?'var(--text-muted)':'var(--text-primary)', cursor: page>=Math.ceil((colabs.total||1)/50)?'not-allowed':'pointer' }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
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
}// ── Overview view ─────────────────────────────────────────────
function OverviewView({ stats, overview, competenciaSel }: any) {
  const fk = overview?.folha?.kpis || {}
  const ck = overview?.conferencia?.kpis || {}
  const cv = overview?.consolidado || {}
  const porFilial = overview?.conferencia?.por_filial || []
  const porCargo  = overview?.conferencia?.por_cargo || []
  const compsFolha = overview?.folha?.competencias || []
  const compsConf  = overview?.conferencia?.competencias || []

  const hasOverview = !!(overview && (cv.total_colaboradores > 0))

  if (!hasOverview) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}>
        <Users size={28} />
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700 }}>Nenhum dado ainda</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Importe a Folha de Pagamento e/ou PDFs de Conferência de Folha.</div>
    </div>
  )

  const Section = ({ title, color, children }: any) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div style={{ width: 3, height: 18, borderRadius: 2, background: color }} />
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color }}>{title}</span>
      </div>
      {children}
    </div>
  )

  const KpiCard = ({ label, value, sub, color, bold }: any) => (
    <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: color }} />
      <div style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: bold ? '1.5rem' : '1.1rem', fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  )

  return (
    <div className="flex flex-col gap-2">

      {/* ── CONSOLIDADO ── */}
      <Section title="Consolidado — CSC + Filiais" color="#06b6d4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <KpiCard label="Total Colaboradores" value={cv.total_colaboradores?.toLocaleString('pt-BR')} color="#06b6d4" bold />
          <KpiCard label="Total Proventos"     value={fmtBRL(cv.total_proventos)}  color="#10b981" bold />
          <KpiCard label="Total Descontos"     value={fmtBRL(cv.total_descontos)}  color="#ef4444" bold />
          <KpiCard label="Total Líquido"       value={fmtBRL(cv.total_liquido)}    color="#3b82f6" bold />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard label="INSS Total"           value={fmtBRL(cv.total_inss)}          color="#f59e0b" />
          <KpiCard label="VT Total"             value={fmtBRL(cv.total_vt)}            color="#8b5cf6" />
          <KpiCard label="Adiantamento Sal."    value={fmtBRL(cv.total_adiantamento)}  color="#3b82f6" />
          <KpiCard label={`Vale Func. OS (${cv.qtd_vale_func_os} OS)`} value={fmtBRL(cv.total_vale_func_os)} color="#06b6d4" />
          <KpiCard label="Liquidez Loja"        value={fmtBRL(cv.liquidez_loja)}       color="#10b981" />
        </div>
      </Section>

      {/* ── FOLHA DE PAGAMENTO (CSC) ── */}
      {fk.total_colaboradores > 0 && (
        <Section title="Folha de Pagamento — CSC" color="#8b5cf6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <KpiCard label="Colaboradores CSC"  value={fk.total_colaboradores?.toLocaleString('pt-BR')} color="#8b5cf6" />
            <KpiCard label="Massa Salarial"     value={fmtBRL(fk.massa_salarial)}   color="#10b981" />
            <KpiCard label="Total Bruto"        value={fmtBRL(fk.total_bruto)}      color="#f59e0b" />
            <KpiCard label="Total Líquido"      value={fmtBRL(fk.total_liquido)}    color="#3b82f6" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <KpiCard label="Total Descontos"    value={fmtBRL(fk.total_descontos)}  color="#ef4444" />
            <KpiCard label="Média Salário Base" value={fmtBRL(fk.media_salario)}    color="#6b7280" />
            <KpiCard label="Média Líquido"      value={fmtBRL(fk.media_liquido)}    color="#6b7280" />
          </div>
          {/* Histórico competências folha */}
          {compsFolha.length > 1 && (
            <div className="mt-3 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>Histórico por Competência</div>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Competência','Colaboradores','Massa Salarial','Total Bruto','Líquido'].map(h => (
                      <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600, background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {compsFolha.map((c: any) => (
                      <tr key={c.competencia} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600 }}>{c.competencia}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#8b5cf6' }}>{c.colab}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{fmtBRL(c.massa)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#f59e0b' }}>{fmtBRL(c.bruto)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>{fmtBRL(c.liquido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ── CONFERÊNCIA DE FOLHA (FILIAIS) ── */}
      {ck.total_funcionarios > 0 && (
        <Section title="Conferência de Folha — Filiais" color="#f59e0b">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <KpiCard label="Colaboradores Filiais" value={ck.total_funcionarios?.toLocaleString('pt-BR')} color="#f59e0b" />
            <KpiCard label="Total Proventos"        value={fmtBRL(ck.total_proventos)}   color="#10b981" />
            <KpiCard label="Total Descontos"        value={fmtBRL(ck.total_descontos)}   color="#ef4444" />
            <KpiCard label="Total Líquido"          value={fmtBRL(ck.total_liquido)}     color="#3b82f6" />
          </div>

          {/* Por filial */}
          {porFilial.length > 0 && (
            <div className="rounded-2xl overflow-hidden mt-3" style={{ border: '1px solid var(--border)' }}>
              <div style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>Por Filial</div>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Filial','Colab.','Proventos','Descontos','INSS','Adiant. Sal.','Líquido','Liquidez Loja'].map(h => (
                      <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600, background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {porFilial.map((f: any) => (
                      <tr key={f.filial} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                        <td style={{ padding: '7px 12px', fontSize: '0.78rem', fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filial}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#f59e0b', textAlign: 'center' }}>{f.funcionarios}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#10b981' }}>{fmtBRL(f.proventos)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#ef4444' }}>{fmtBRL(f.descontos)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#f59e0b' }}>{fmtBRL(f.inss)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#3b82f6' }}>{fmtBRL(f.adiantamento)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#06b6d4', fontWeight: 600 }}>{fmtBRL(f.liquido)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#10b981' }}>{fmtBRL(f.liquidez_loja)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Por cargo */}
          {porCargo.length > 0 && (
            <div className="rounded-2xl overflow-hidden mt-3" style={{ border: '1px solid var(--border)' }}>
              <div style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>Por Cargo — Filiais</div>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Cargo','Colab.','Proventos','Descontos','INSS','Adiant. Sal.','Líquido'].map(h => (
                      <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600, background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {porCargo.map((c: any) => (
                      <tr key={c.cargo} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                        <td style={{ padding: '7px 12px', fontSize: '0.78rem', fontWeight: 500 }}>{c.cargo}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#f59e0b', textAlign: 'center' }}>{c.n}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#10b981' }}>{fmtBRL(c.proventos)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#ef4444' }}>{fmtBRL(c.descontos || 0)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#f59e0b' }}>{fmtBRL(c.inss || 0)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#3b82f6' }}>{fmtBRL(c.adiant_sal || 0)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#06b6d4', fontWeight: 600 }}>{fmtBRL(c.liquido || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  )
}

// ── Formatadores ──────────────────────────────────────────────
