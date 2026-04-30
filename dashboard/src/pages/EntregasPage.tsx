// ============================================================
// EntregasPage.tsx — Entregas derivadas do Redmine (ao vivo)
// Fallback para JSON estático se Redmine não configurado
// ============================================================
import { useEffect, useState, useMemo } from 'react'
import { useDashboardStore } from '@/store'
import { RedmineEntregasAPI } from '@/services/api'
import { formatDate } from '@/utils'
import {
  CheckCircle2, Clock, RefreshCw, AlertTriangle, ExternalLink,
  User, Folder, Timer, Bug, Star, TrendingUp, Headphones,
  CheckSquare, GitBranch, Zap, Package
} from 'lucide-react'

// ── Icon map expandido para trackers do Redmine ───────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  'bug':          <Bug size={20} />,
  'star':         <Star size={20} />,
  'check-square': <CheckSquare size={20} />,
  'trending-up':  <TrendingUp size={20} />,
  'headphones':   <Headphones size={20} />,
  'git-merge':    <GitBranch size={20} />,
  'activity':     <Zap size={20} />,
  'database':     <Package size={20} />,
  'bot':          <Zap size={20} />,
  'shield':       <CheckCircle2 size={20} />,
  'bar-chart-2':  <TrendingUp size={20} />,
}

const IMPACT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'Crítico': { label: 'Impacto Crítico', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  'Alto':    { label: 'Alto Impacto',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  'Médio':   { label: 'Médio Impacto',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  'Baixo':   { label: 'Baixo Impacto',   color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

// ── Card individual ───────────────────────────────────────────
function EntregaCard({ entrega, isRedmine }: { entrega: any; isRedmine: boolean }) {
  const impact = IMPACT_CONFIG[entrega.impacto] || IMPACT_CONFIG['Médio']
  const icon   = ICON_MAP[entrega.icone] || <CheckSquare size={20} />
  const cor    = entrega.cor || '#8b5cf6'

  const dataFormatada = (() => {
    try { return formatDate(entrega.data) } catch { return entrega.data }
  })()

  return (
    <div
      className="rounded-2xl relative overflow-hidden transition-all duration-300 flex flex-col"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '18px 20px' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${cor}55`
        e.currentTarget.style.boxShadow   = '0 8px 28px rgba(0,0,0,0.3)'
        e.currentTarget.style.transform   = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow   = 'none'
        e.currentTarget.style.transform   = 'translateY(0)'
      }}
    >
      {/* Barra top */}
      <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: cor }} />

      {/* Header */}
      <div className="flex items-start justify-between gap-2.5 mb-3">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 42, height: 42, background: `${cor}18`, color: cor }}>
          {icon}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-full flex items-center gap-1"
            style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
              padding: '3px 10px', background: 'rgba(16,185,129,0.12)', color: '#10b981',
              border: '1px solid rgba(16,185,129,0.25)' }}>
            <CheckCircle2 size={9} /> Concluído
          </span>
          <span className="rounded-full" style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', background: impact.bg, color: impact.color }}>
            {impact.label}
          </span>
          {isRedmine && entrega.tracker && (
            <span className="rounded-full" style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 7px', background: `${cor}12`, color: cor, border: `1px solid ${cor}25` }}>
              {entrega.tracker}
            </span>
          )}
        </div>
      </div>

      {/* Título e descrição */}
      <h3 style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.35, marginBottom: 5 }}>
        {entrega.titulo}
      </h3>
      <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
        {entrega.descricao}
      </p>

      {/* Ganho */}
      <div className="rounded-lg px-3 py-2 mb-3 flex items-center gap-2"
        style={{ background: `${cor}10`, border: `1px solid ${cor}20` }}>
        <Timer size={12} style={{ color: cor, flexShrink: 0 }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cor }}>{entrega.ganhoEstimado}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-3 flex-wrap gap-2"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <Folder size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
            {entrega.areaBeneficiada}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isRedmine && entrega.responsavel && (
            <div className="flex items-center gap-1">
              <User size={11} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{entrega.responsavel.split(' ')[0]}</span>
            </div>
          )}
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {dataFormatada}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Filtros ───────────────────────────────────────────────────
function FilterBar({ projetos, trackers, filtro, setFiltro }: any) {
  const selStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', padding: '7px 11px',
    borderRadius: 8, fontSize: '0.78rem', fontFamily: 'var(--font-body)',
    cursor: 'pointer', outline: 'none',
  }
  return (
    <div className="flex gap-2 flex-wrap">
      {projetos.length > 1 && (
        <select style={selStyle} value={filtro.projeto} onChange={e => setFiltro((f: any) => ({ ...f, projeto: e.target.value }))}>
          <option value="">Todos os projetos</option>
          {projetos.map((p: string) => <option key={p} value={p}>{p}</option>)}
        </select>
      )}
      {trackers.length > 1 && (
        <select style={selStyle} value={filtro.tracker} onChange={e => setFiltro((f: any) => ({ ...f, tracker: e.target.value }))}>
          <option value="">Todos os tipos</option>
          {trackers.map((t: string) => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
      <select style={selStyle} value={filtro.impacto} onChange={e => setFiltro((f: any) => ({ ...f, impacto: e.target.value }))}>
        <option value="">Todos os impactos</option>
        {['Crítico', 'Alto', 'Médio', 'Baixo'].map(i => <option key={i} value={i}>{i}</option>)}
      </select>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export function EntregasPage() {
  const { data } = useDashboardStore()
  const [redmineData, setRedmineData] = useState<{ configurado: boolean; items: any[] } | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [filtro, setFiltro]           = useState({ projeto: '', tracker: '', impacto: '' })

  useEffect(() => {
    RedmineEntregasAPI.getEntregas({ limit: 50 })
      .then(setRedmineData)
      .catch(() => setRedmineData({ configurado: false, items: [] }))
      .finally(() => setLoading(false))
  }, [])

  // Fonte de dados: Redmine se configurado, JSON estático como fallback
  const isRedmine  = redmineData?.configurado === true
  const rawItems   = isRedmine ? (redmineData?.items || []) : data.entregasEstrategicas

  // Opções de filtro dinâmicas
  const projetos = useMemo(() => [...new Set(rawItems.map((e: any) => e.areaBeneficiada || e.projeto).filter(Boolean))], [rawItems])
  const trackers = useMemo(() => [...new Set(rawItems.map((e: any) => e.tracker).filter(Boolean))], [rawItems])

  // Aplicar filtros
  const entregas = useMemo(() => rawItems.filter((e: any) => {
    if (filtro.projeto && (e.areaBeneficiada || e.projeto) !== filtro.projeto) return false
    if (filtro.tracker && e.tracker !== filtro.tracker) return false
    if (filtro.impacto && e.impacto !== filtro.impacto) return false
    return true
  }), [rawItems, filtro])

  const totalConcluidas = entregas.length

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Entregas <span style={{ color: '#8b5cf6' }}>Estratégicas</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            {isRedmine
              ? `Tarefas concluídas via Redmine — dados ao vivo`
              : `${data.meta.mes} ${data.meta.ano} · Dados estáticos`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Badge fonte */}
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: isRedmine ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
              border: `1px solid ${isRedmine ? 'rgba(16,185,129,0.25)' : 'rgba(107,114,128,0.25)'}`,
              fontSize: '0.72rem', fontWeight: 600,
              color: isRedmine ? '#10b981' : '#6b7280',
            }}>
            {isRedmine ? <><CheckCircle2 size={12}/> Redmine ao vivo</> : <><Clock size={12}/> Dados estáticos</>}
          </span>
          {/* Contador */}
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', fontSize: '0.72rem', fontWeight: 600, color: '#8b5cf6' }}>
            <CheckCircle2 size={12} /> {totalConcluidas} entrega{totalConcluidas !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Filtros */}
      {!loading && (
        <div className="mb-4">
          <FilterBar projetos={projetos} trackers={trackers} filtro={filtro} setFiltro={setFiltro} />
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl mb-4"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.82rem' }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#8b5cf6', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ marginLeft: 12, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Carregando entregas…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Grid de cards */}
      {!loading && entregas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Package size={40} style={{ color: 'var(--text-muted)' }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {isRedmine ? 'Nenhuma tarefa concluída encontrada' : 'Sem entregas disponíveis'}
          </div>
          {filtro.projeto || filtro.tracker || filtro.impacto ? (
            <button onClick={() => setFiltro({ projeto: '', tracker: '', impacto: '' })}
              style={{ fontSize: '0.78rem', color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Limpar filtros
            </button>
          ) : null}
        </div>
      )}

      {!loading && entregas.length > 0 && (
        <>
          {/* Agrupado por projeto quando Redmine */}
          {isRedmine ? (
            (() => {
              const porProjeto: Record<string, any[]> = {}
              entregas.forEach((e: any) => {
                const key = e.areaBeneficiada || e.projeto || 'Outros'
                if (!porProjeto[key]) porProjeto[key] = []
                porProjeto[key].push(e)
              })
              return Object.entries(porProjeto).map(([projeto, items]) => (
                <div key={projeto} className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <Folder size={14} style={{ color: '#8b5cf6' }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{projeto}</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    <span style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: 600,
                      background: 'rgba(139,92,246,0.1)', padding: '2px 8px', borderRadius: 99 }}>
                      {items.length} entrega{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                    {items.map((e: any) => <EntregaCard key={e.id || e.titulo} entrega={e} isRedmine={true} />)}
                  </div>
                </div>
              ))
            })()
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
              {entregas.map((e: any) => <EntregaCard key={e.titulo} entrega={e} isRedmine={false} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
