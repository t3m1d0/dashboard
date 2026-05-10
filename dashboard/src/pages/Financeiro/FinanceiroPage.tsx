// pages/Financeiro/FinanceiroPage.tsx — reconstruído no padrão do sistema
import { useEffect, useState, useCallback, useRef } from 'react'
import { useDashboardStore } from '@/store'
import { FinanceiroAPI } from '@/services/api'
import { LojaSelectField } from '@/components/UI/LojaSelectField'
import {
  Upload, X, CheckCircle2, AlertTriangle, RefreshCw, FileSpreadsheet,
  Search, ChevronLeft, ChevronRight, Info, DollarSign,
  ArrowUpCircle, ArrowDownCircle
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const fmtBRL = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtNum = (v: number) => (v || 0).toLocaleString('pt-BR')
const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const TIPOS = [
  { id: 'recebidas', label: 'Recebidas',  color: '#10b981' },
  { id: 'pagas',     label: 'Pagas',       color: '#ef4444' },
  { id: 'a_receber', label: 'A Receber',   color: '#3b82f6' },
  { id: 'a_pagar',   label: 'A Pagar',     color: '#f59e0b' },
  { id: 'extrato',   label: 'Extrato',     color: '#8b5cf6' },
]
const SEL: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', padding: '7px 11px', borderRadius: 8,
  fontSize: '0.78rem', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none',
}
const INPUT: React.CSSProperties = {
  ...SEL, cursor: 'text', width: '100%', padding: '8px 12px',
}

// ── Import Modal ──────────────────────────────────────────────
function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { lojasAtivas } = useDashboardStore()
  const [file, setFile]     = useState<File | null>(null)
  const [loja, setLoja]     = useState<any>(lojasAtivas[0] || null)
  const [periodo, setPeriodo] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })
  const [tipo, setTipo]     = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError]   = useState<string | null>(null)
  const [drag, setDrag]     = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const doImport = async () => {
    if (!file || !loja || !periodo) return
    setLoading(true); setError(null)
    try { const r = await FinanceiroAPI.importar(file, loja, periodo, tipo || undefined); setResult(r); onSuccess() }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="relative z-10 w-full" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(204,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cc0000' }}><FileSpreadsheet size={20} /></div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Importar Lançamentos</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>CSV ou Excel — qualquer ERP</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={14} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="rounded-xl p-3" style={{ background: 'rgba(204,0,0,0.05)', border: '1px solid rgba(204,0,0,0.15)' }}>
            <div className="flex items-center gap-2 mb-1"><Info size={13} style={{ color: '#cc0000' }} /><span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cc0000' }}>Tipo detectado pelo nome do arquivo</span></div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              Nomeie: <span style={{ fontFamily: 'var(--font-mono)', color: '#cc0000' }}>recebidas.csv</span> · <span style={{ fontFamily: 'var(--font-mono)', color: '#cc0000' }}>pagas.csv</span> · <span style={{ fontFamily: 'var(--font-mono)', color: '#cc0000' }}>a_receber.csv</span> · <span style={{ fontFamily: 'var(--font-mono)', color: '#cc0000' }}>a_pagar.csv</span> · <span style={{ fontFamily: 'var(--font-mono)', color: '#cc0000' }}>extrato.csv</span>
            </div>
          </div>
          {!result && <LojaSelectField value={loja} onChange={setLoja} label="Loja / Filial" />}
          {!result && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Competência</label>
                <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} style={INPUT} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Tipo (opcional)</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ ...SEL, width: '100%' }}>
                  <option value="">Detectar pelo nome</option>
                  {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>
          )}
          {!result && (
            <label onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setError(null) } }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 20px', borderRadius: 12, border: `2px dashed ${drag ? '#cc0000' : file ? '#10b981' : 'var(--border)'}`, background: drag ? 'rgba(204,0,0,0.04)' : file ? 'rgba(16,185,129,0.04)' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center' }}
              onClick={() => !file && ref.current?.click()}>
              <input ref={ref} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setError(null) } }} />
              {file ? (
                <><CheckCircle2 size={26} style={{ color: '#10b981' }} /><div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>{file.name}</div><button onClick={e => { e.stopPropagation(); e.preventDefault(); setFile(null) }} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Trocar</button></>
              ) : (
                <><div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(204,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cc0000' }}><Upload size={20} /></div><div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Arraste ou <span style={{ color: '#cc0000', fontWeight: 600 }}>clique</span></div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>.csv · .xlsx · .xls</div></>
              )}
            </label>
          )}
          {error && <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.82rem' }}><AlertTriangle size={15} /> {error}</div>}
          {result && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981', marginBottom: 10 }}>✓ {result.tipo?.toUpperCase()} — {result.periodo} — {loja?.nome}</div>
              <div className="grid grid-cols-3 gap-2">
                {[{label:'Inseridos',value:result.inseridos,color:'#10b981'},{label:'Atualizados',value:result.atualizados,color:'#3b82f6'},{label:'Ignorados',value:result.ignorados,color:'#6b7280'}].map(item => (
                  <div key={item.label} className="text-center rounded-lg p-2" style={{ background: 'var(--bg-elevated)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2.5">
            {result ? (
              <><button onClick={() => { setResult(null); setFile(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><RefreshCw size={14} /> Importar outro</button><button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#10b981', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>✓ Fechar</button></>
            ) : (
              <><button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancelar</button>
              <button onClick={doImport} disabled={!file || !loja || !periodo || loading} style={{ flex: 1, padding: '10px', borderRadius: 10, background: file && loja && periodo && !loading ? 'linear-gradient(135deg, #cc0000, #991b1b)' : 'var(--bg-elevated)', border: 'none', color: file && loja && periodo && !loading ? '#fff' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: file && loja && periodo && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {loading ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} /> Importando…</> : <><Upload size={14} /> Importar</>}
              </button></>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Página Principal ──────────────────────────────────────────
export function FinanceiroPage() {
  const { financeiroSubSection, lojasAtivas } = useDashboardStore()
  const [stats, setStats]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [importOpen, setImportOpen] = useState(false)
  const [mesSel, setMesSel]   = useState(0)
  const [anoSel, setAnoSel]   = useState(new Date().getFullYear())
  const [tipoSel, setTipoSel] = useState('')
  const [itens, setItens]     = useState<any>(null)
  const [pageNum, setPageNum] = useState(1)
  const [busca, setBusca]     = useState('')
  const [filialSel, setFilialSel] = useState('')
  const periodoSel = mesSel > 0 ? `${anoSel}-${String(mesSel).padStart(2,'0')}` : ''

  const buildParams = useCallback(() => {
    const p: Record<string,string> = {}
    if (periodoSel) p.periodo = periodoSel
    if (tipoSel) p.tipo = tipoSel
    // filialSel sobrescreve lojasAtivas quando selecionada
    if (filialSel) p.loja_codigo = filialSel
    else if (lojasAtivas.length === 1) p.loja_codigo = lojasAtivas[0].codigo
    else if (lojasAtivas.length > 1) p.lojas = lojasAtivas.map((l:any) => l.codigo).join('||')
    return p
  }, [periodoSel, tipoSel, lojasAtivas, filialSel])

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const data = await FinanceiroAPI.getStats(buildParams())
      setStats(data)
      if (data.periodos?.length > 0 && mesSel === 0) {
        const [ano, mes] = (data.periodos[0].periodo || '').split('-').map(Number)
        if (ano && mes) { setAnoSel(ano); setMesSel(mes) }
      }
    } catch { setStats(null) }
    finally { setLoading(false) }
  }, [buildParams])

  const loadItens = useCallback(async () => {
    const tipo = tipoSel || (financeiroSubSection === 'recpag' ? 'a_receber' : '')
    if (!tipo) return
    const p: Record<string, string|number> = { page: pageNum, page_size: 50 }
    if (periodoSel) p.periodo = periodoSel
    if (filialSel) p.loja_codigo = filialSel
    else if (lojasAtivas.length === 1) p.loja_codigo = lojasAtivas[0].codigo
    if (busca) p.busca = busca
    try { const d = await FinanceiroAPI.getItens(tipo, p); setItens(d) } catch {}
  }, [tipoSel, financeiroSubSection, periodoSel, lojasAtivas, pageNum, busca])

  useEffect(() => { loadStats() }, [mesSel, anoSel, tipoSel, lojasAtivas, filialSel])
  useEffect(() => {
    if (tipoSel || financeiroSubSection === 'recpag') loadItens()
    else setItens(null)
  }, [financeiroSubSection, mesSel, anoSel, tipoSel, lojasAtivas, busca, pageNum, filialSel])

  const periodos = stats?.periodos || []
  const kpis = stats?.kpis || {}
  const hasData = !!(stats && (kpis.recebidas > 0 || kpis.pagas > 0 || kpis.a_receber > 0 || kpis.a_pagar > 0))

  const SUB_LABELS: Record<string,string> = {
    overview:'Visão Geral', dre:'DRE', cashflow:'Fluxo de Caixa',
    balancete:'Balancete', pdca:'PDCA', kpis:'KPIs',
    alertas:'Alertas', recpag:'A Receber / A Pagar', upload:'Upload',
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Financeiro — <span style={{ color: '#cc0000' }}>{SUB_LABELS[financeiroSubSection] || 'Visão Geral'}</span></h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            {filialSel ? (stats?.lojas || []).find((l:any) => l.codigo === filialSel)?.nome || filialSel
              : lojasAtivas.length === 0 ? 'Todas as lojas'
              : lojasAtivas.length === 1 ? lojasAtivas[0].nome
              : `${lojasAtivas.length} lojas selecionadas`}
          </p>
        </div>
        <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #cc0000, #991b1b)', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <Upload size={14} /> Importar CSV
        </button>
      </div>

      {/* Filtro de período */}
      {periodos.length > 0 && (
        <div className="mb-4">
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>Competência — {anoSel}</div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <button onClick={() => setMesSel(0)} style={{ padding: '5px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: mesSel === 0 ? '#cc0000' : 'var(--bg-elevated)', color: mesSel === 0 ? '#fff' : 'var(--text-secondary)', border: `1px solid ${mesSel === 0 ? '#cc0000' : 'var(--border)'}`, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Todos</button>
            {periodos.filter((p:any) => p.periodo?.startsWith(String(anoSel))).sort((a:any,b:any) => a.periodo.localeCompare(b.periodo)).map((p:any) => {
              const mes = parseInt(p.periodo.split('-')[1]); const active = mesSel === mes
              return <button key={p.periodo} onClick={() => setMesSel(mes)} title={`${fmtNum(p.n)} lançamentos`}
                style={{ padding: '5px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: active ? '#cc0000' : 'var(--bg-card)', color: active ? '#fff' : 'var(--text-secondary)', border: `1px solid ${active ? '#cc0000' : 'var(--border)'}`, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
                {MESES[mes]}
              </button>
            })}
            {mesSel > 0 && (
              <button onClick={() => setMesSel(0)}
                style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                ✕ Limpar {MESES[mesSel]}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filtro de tipo */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TIPOS.map(t => (
          <button key={t.id} onClick={() => { setTipoSel(tipoSel === t.id ? '' : t.id); setPageNum(1) }}
            style={{ padding: '5px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: tipoSel === t.id ? t.color : 'var(--bg-elevated)', color: tipoSel === t.id ? '#fff' : 'var(--text-secondary)', border: `1px solid ${tipoSel === t.id ? t.color : 'var(--border)'}`, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
        {tipoSel && <button onClick={() => setTipoSel('')} style={{ ...SEL, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}><X size={12} style={{ display:'inline', marginRight:4 }} />Limpar</button>}
      </div>

      {/* Filtro por filial */}
      {(stats?.lojas?.length > 1) && (
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Filial:</span>
          <button onClick={() => setFilialSel('')}
            style={{ padding: '4px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, background: !filialSel ? '#cc0000' : 'var(--bg-elevated)', color: !filialSel ? '#fff' : 'var(--text-secondary)', border: `1px solid ${!filialSel ? '#cc0000' : 'var(--border)'}`, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Todas
          </button>
          {(stats?.lojas || []).map((l: any) => (
            <button key={l.codigo} onClick={() => setFilialSel(filialSel === l.codigo ? '' : l.codigo)}
              style={{ padding: '4px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, background: filialSel === l.codigo ? '#cc0000' : 'var(--bg-card)', color: filialSel === l.codigo ? '#fff' : 'var(--text-secondary)', border: `1px solid ${filialSel === l.codigo ? '#cc0000' : 'var(--border)'}`, cursor: 'pointer', fontFamily: 'var(--font-body)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={l.nome || l.codigo}>
              {(l.nome || l.codigo)?.length > 22 ? (l.nome || l.codigo).slice(0,20)+'…' : (l.nome || l.codigo)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#cc0000', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ marginLeft: 12, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Carregando…</span>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(204,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cc0000' }}><DollarSign size={32} /></div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Nenhum dado financeiro</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 380 }}>Importe os arquivos CSV de lançamentos financeiros.</p>
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #cc0000, #991b1b)', color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <Upload size={15} /> Importar agora
          </button>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            <div className="col-span-2 lg:col-span-1 rounded-2xl p-4 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: kpis.caixa >= 0 ? '#10b981' : '#ef4444' }} />
              <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Caixa (Rec − Pag)</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: kpis.caixa >= 0 ? '#10b981' : '#ef4444' }}>{fmtBRL(kpis.caixa)}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>Saldo futuro: <span style={{ color: kpis.saldo_futuro >= 0 ? '#3b82f6' : '#f59e0b' }}>{fmtBRL(kpis.saldo_futuro)}</span></div>
            </div>
            {[
              { label:'Recebidas',  val: kpis.recebidas, n: kpis.n_recebidas, color:'#10b981', icon:<ArrowDownCircle size={16} /> },
              { label:'Pagas',      val: kpis.pagas,     n: kpis.n_pagas,     color:'#ef4444', icon:<ArrowUpCircle size={16} /> },
              { label:'A Receber',  val: kpis.a_receber, n: kpis.n_a_receber, color:'#3b82f6', icon:null },
              { label:'A Pagar',    val: kpis.a_pagar,   n: kpis.n_a_pagar,   color:'#f59e0b', icon:null },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: item.color }} />
                <div className="flex items-center justify-between mb-2">
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{item.label}</div>
                  {item.icon && <div style={{ color: item.color, opacity: 0.7 }}>{item.icon}</div>}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: item.color }}>{fmtBRL(item.val)}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{fmtNum(item.n || 0)} lançamentos</div>
              </div>
            ))}
          </div>

          {/* Gráficos */}
          {(stats?.top_clientes?.length > 0 || stats?.top_fornecedores?.length > 0) && !tipoSel && (
            <div className="grid grid-cols-12 gap-3.5 mb-5">
              {stats.top_clientes?.length > 0 && (
                <div className="col-span-12 lg:col-span-6 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Top Clientes — Recebidas</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Por valor recebido</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={stats.top_clientes} layout="vertical" margin={{ right: 10, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => fmtBRL(v)} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={120} tickFormatter={(v:string) => v?.length > 16 ? v.slice(0,14)+'…' : v} />
                      <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} formatter={(v:number) => [fmtBRL(v), 'Recebido']} />
                      <Bar dataKey="total" fill="rgba(16,185,129,0.8)" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {stats.top_fornecedores?.length > 0 && (
                <div className="col-span-12 lg:col-span-6 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Top Fornecedores — Pagas</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Por valor pago</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={stats.top_fornecedores} layout="vertical" margin={{ right: 10, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => fmtBRL(v)} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={120} tickFormatter={(v:string) => v?.length > 16 ? v.slice(0,14)+'…' : v} />
                      <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} formatter={(v:number) => [fmtBRL(v), 'Pago']} />
                      <Bar dataKey="total" fill="rgba(239,68,68,0.8)" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Tabela de lançamentos */}
          {(tipoSel || financeiroSubSection === 'recpag') && (
            <div className="rounded-2xl overflow-hidden mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TIPOS.find(t=>t.id===tipoSel)?.color || '#cc0000' }}>
                  {TIPOS.find(t=>t.id===tipoSel)?.label || 'A Receber'}
                </span>
                <div className="relative ml-auto">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input type="text" placeholder="Buscar..." value={busca} onChange={e => { setBusca(e.target.value); setPageNum(1) }}
                    style={{ ...SEL, paddingLeft: 28, width: 220, padding:'6px 10px 6px 28px' }} />
                </div>
                {itens && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{itens.total?.toLocaleString('pt-BR')} registros</span>}
              </div>
              {!itens ? (
                <div className="flex items-center justify-center py-10" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#cc0000', animation: 'spin 0.7s linear infinite', marginRight: 10 }} />Carregando…
                </div>
              ) : itens.items?.length === 0 ? (
                <div className="flex items-center justify-center py-10" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nenhum lançamento encontrado</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>
                        {['Código','Cliente / Fornecedor','Valor','Vencimento','Recebimento/Pgto','Forma Pgto','Loja'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {itens.items.map((r: any) => {
                          const isRec = ['recebidas','a_receber'].includes(tipoSel || 'a_receber')
                          return (
                            <tr key={r.id} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                              <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.codigo || '—'}</td>
                              <td style={{ padding: '7px 12px', fontSize: '0.78rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.cliente || r.fornecedor || '—'}</td>
                              <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: isRec ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>{fmtBRL(r.valor)}</td>
                              <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.dt_vencimento || '—'}</td>
                              <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.dt_recebimento || r.dt_pagamento || '—'}</td>
                              <td style={{ padding: '7px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.plano || '—'}</td>
                              <td style={{ padding: '7px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.loja_codigo}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Página {pageNum} de {Math.ceil((itens.total||1)/50)}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setPageNum(p => Math.max(1,p-1))} disabled={pageNum===1} style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: pageNum===1?'var(--text-muted)':'var(--text-primary)', cursor: pageNum===1?'not-allowed':'pointer' }}><ChevronLeft size={14} /></button>
                      <button onClick={() => setPageNum(p => p+1)} disabled={pageNum>=Math.ceil((itens.total||1)/50)} style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: pageNum>=Math.ceil((itens.total||1)/50)?'var(--text-muted)':'var(--text-primary)', cursor: pageNum>=Math.ceil((itens.total||1)/50)?'not-allowed':'pointer' }}><ChevronRight size={14} /></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Upload tab */}
          {financeiroSubSection === 'upload' && (
            <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-card)', border: '2px dashed var(--border)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(204,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cc0000', margin: '0 auto 14px' }}><Upload size={26} /></div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 8 }}>Importar Lançamentos Financeiros</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                Suporta CSV e Excel de qualquer ERP. Nomeie o arquivo pelo tipo:<br/>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#cc0000', fontSize: '0.72rem' }}>recebidas · pagas · a_receber · a_pagar · extrato</span>
              </div>
              <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl mx-auto"
                style={{ background: 'linear-gradient(135deg, #cc0000, #991b1b)', color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                <Upload size={15} /> Selecionar arquivo
              </button>
              {periodos.length > 0 && (
                <div className="mt-6 text-left rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', fontSize: '0.82rem', fontWeight: 600 }}>Períodos importados</div>
                  {periodos.map((p:any) => (
                    <div key={p.periodo} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>{p.periodo}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#cc0000' }}>{fmtNum(p.n)} lançamentos</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#10b981' }}>{fmtBRL(p.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onSuccess={() => { loadStats(); setImportOpen(false) }} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
