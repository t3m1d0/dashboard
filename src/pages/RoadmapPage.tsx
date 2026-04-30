// ============================================================
// RoadmapPage.tsx — Roadmap derivado do Redmine (ao vivo)
// Fallback para JSON estático se Redmine não configurado
// ============================================================
import { useEffect, useState, useMemo } from 'react'
import { useDashboardStore } from '@/store'
import { RedmineEntregasAPI } from '@/services/api'
import { PRIORITY_COLORS } from '@/utils'
import { ArrowRight, CheckCircle2, Clock, AlertTriangle, User, GitBranch, TrendingUp, Map, RefreshCw, Folder } from 'lucide-react'

const CATEGORIA_CONFIG: Record<string, { color: string; bg: string }> = {
  'Próximas Entregas':      { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)'  },
  'Melhorias Planejadas':   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  'Projetos Futuros':       { color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  'Iniciativas Estratégicas': { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  'Atrasado':               { color: '#ef4444', bg: 'rgba(239,68,68,0.08)'   },
  'Sem Prazo':              { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
}

// ── Card do roadmap (Redmine) ─────────────────────────────────
function RoadmapCardRedmine({ item }: { item: any }) {
  const prio  = PRIORITY_COLORS[item.prioridade] || '#6b7280'
  const cfg   = CATEGORIA_CONFIG[item.categoria] || { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' }
  const cor   = item.cor || cfg.color

  // Dias até o prazo
  const diasRestantes = (() => {
    if (!item.prazo || item.prazo === '—') return null
    const diff = Math.ceil((new Date(item.prazo).getTime() - Date.now()) / 86400000)
    return diff
  })()

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden transition-all duration-300 flex flex-col"
      style={{ background: 'var(--bg-card)', border: `1px solid ${item.atrasada ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${cor}55`
        e.currentTarget.style.transform   = 'translateY(-2px)'
        e.currentTarget.style.boxShadow   = '0 8px 24px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = item.atrasada ? 'rgba(239,68,68,0.3)' : 'var(--border)'
        e.currentTarget.style.transform   = 'translateY(0)'
        e.currentTarget.style.boxShadow   = 'none'
      }}
    >
      <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: cor }} />

      {/* Título + prazo */}
      <div className="flex items-start justify-between gap-2 mb-2 mt-0.5">
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.35, flex: 1 }}>{item.titulo}</h3>
        {item.prazo && item.prazo !== '—' && (
          <span className="rounded-full whitespace-nowrap flex-shrink-0"
            style={{ fontSize: '0.63rem', fontWeight: 700, padding: '3px 9px',
              background: item.atrasada ? 'rgba(239,68,68,0.12)' : `${cor}15`,
              color: item.atrasada ? '#ef4444' : cor,
              border: `1px solid ${item.atrasada ? 'rgba(239,68,68,0.25)' : `${cor}30`}` }}>
            {item.atrasada ? `⚠ ${item.prazo}` : item.prazo}
          </span>
        )}
      </div>

      {/* Descrição */}
      <p style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {item.descricao}
      </p>

      {/* Projeto / impacto */}
      <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 mb-3"
        style={{ background: cfg.bg, border: `1px solid ${cor}20` }}>
        <Folder size={11} style={{ color: cor, flexShrink: 0 }} />
        <span style={{ fontSize: '0.7rem', color: cor, fontWeight: 600 }}>{item.impacto || item.projeto}</span>
      </div>

      {/* Progresso (se > 0) */}
      {item.progresso > 0 && (
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Progresso</span>
            <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: cor, fontWeight: 700 }}>{item.progresso}%</span>
          </div>
          <div style={{ height: 3, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${item.progresso}%`, background: cor, borderRadius: 99 }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 flex-wrap gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full" style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', background: `${prio}15`, color: prio, border: `1px solid ${prio}30` }}>
            {item.prioridade}
          </span>
          {item.tracker && (
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 99 }}>
              {item.tracker}
            </span>
          )}
        </div>
        {item.responsavel && (
          <div className="flex items-center gap-1">
            <User size={10} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)' }}>{item.responsavel.split(' ')[0]}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Card legado (JSON estático) ───────────────────────────────
function RoadmapCardLegacy({ item }: { item: any }) {
  const cfg  = CATEGORIA_CONFIG[item.categoria] || { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' }
  const prio = PRIORITY_COLORS[item.prioridade] || '#6b7280'

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden transition-all duration-300"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${cfg.color}55`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: cfg.color }} />
      <div className="flex items-start justify-between gap-2 mb-2 mt-0.5">
        <h3 style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.35 }}>{item.titulo}</h3>
        <span className="rounded-full whitespace-nowrap flex-shrink-0"
          style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
          {item.prazo}
        </span>
      </div>
      <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>{item.descricao}</p>
      <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 mb-3" style={{ background: cfg.bg, border: `1px solid ${cfg.color}20` }}>
        <ArrowRight size={12} style={{ color: cfg.color, flexShrink: 0 }} />
        <span style={{ fontSize: '0.72rem', color: cfg.color, fontWeight: 600 }}>{item.impacto}</span>
      </div>
      <span className="inline-flex items-center rounded-full" style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', background: `${prio}15`, color: prio, border: `1px solid ${prio}30` }}>
        {item.prioridade}
      </span>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export function RoadmapPage() {
  const { data } = useDashboardStore()
  const [redmineData, setRedmineData] = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [filtroSprint, setFiltroSprint] = useState('')
  const [filtroPrio, setFiltroPrio]     = useState('')
  const [filtroResp, setFiltroResp]     = useState('')

  useEffect(() => {
    RedmineEntregasAPI.getRoadmap()
      .then(setRedmineData)
      .catch(() => setRedmineData({ configurado: false, items: [], sprints: [] }))
      .finally(() => setLoading(false))
  }, [])

  const isRedmine   = redmineData?.configurado === true
  const rawItems    = isRedmine ? (redmineData?.items || []) : data.roadmap
  const sprints     = redmineData?.sprints || []

  // Responsáveis únicos para filtro
  const responsaveis = useMemo(() =>
    [...new Set(rawItems.filter((i: any) => i.responsavel).map((i: any) => i.responsavel))],
    [rawItems]
  )

  // Aplicar filtros
  const items = useMemo(() => rawItems.filter((i: any) => {
    if (filtroSprint && i.versao !== filtroSprint) return false
    if (filtroPrio   && i.prioridade !== filtroPrio) return false
    if (filtroResp   && i.responsavel !== filtroResp) return false
    return true
  }), [rawItems, filtroSprint, filtroPrio, filtroResp])

  // Categorias em ordem lógica
  const ORDEM_CATS = ['Atrasado', 'Próximas Entregas', 'Melhorias Planejadas', 'Projetos Futuros', 'Iniciativas Estratégicas', 'Sem Prazo']
  const categorias = useMemo(() => {
    const found: string[] = [...new Set<string>(items.map((i: any) => i.categoria as string))]
    // Se Redmine: ordenar por ORDEM_CATS + sprints customizadas no topo
    if (isRedmine) {
      const predefined = ORDEM_CATS.filter(c => found.includes(c))
      const custom     = found.filter(c => !ORDEM_CATS.includes(c)).sort()
      return [...custom, ...predefined]
    }
    return found
  }, [items, isRedmine])

  const selStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', padding: '7px 11px', borderRadius: 8,
    fontSize: '0.78rem', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none',
  }

  const totalAtrasadas = isRedmine ? items.filter((i: any) => i.atrasada).length : 0

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Roadmap & <span style={{ color: '#8b5cf6' }}>Próximos Passos</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            {isRedmine
              ? `${items.length} tarefas em aberto · Redmine ao vivo${redmineData?.ultimo_sync ? ` · ${new Date(redmineData.ultimo_sync).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}`
              : 'Planejamento estratégico e iniciativas futuras'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {totalAtrasadas > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.72rem', fontWeight: 600, color: '#ef4444' }}>
              <AlertTriangle size={12} /> {totalAtrasadas} atrasada{totalAtrasadas > 1 ? 's' : ''}
            </span>
          )}
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: isRedmine ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
              border: `1px solid ${isRedmine ? 'rgba(16,185,129,0.25)' : 'rgba(107,114,128,0.25)'}`,
              fontSize: '0.72rem', fontWeight: 600, color: isRedmine ? '#10b981' : '#6b7280' }}>
            {isRedmine ? <><CheckCircle2 size={12}/> Redmine ao vivo</> : <><Clock size={12}/> Dados estáticos</>}
          </span>
        </div>
      </div>

      {/* Filtros (só Redmine) */}
      {isRedmine && !loading && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {sprints.length > 0 && (
            <select style={selStyle} value={filtroSprint} onChange={e => setFiltroSprint(e.target.value)}>
              <option value="">Todas as sprints</option>
              {sprints.map((s: any) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <select style={selStyle} value={filtroPrio} onChange={e => setFiltroPrio(e.target.value)}>
            <option value="">Prioridade</option>
            {['Crítica','Alta','Média','Baixa'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {responsaveis.length > 0 && (
            <select style={selStyle} value={filtroResp} onChange={e => setFiltroResp(e.target.value)}>
              <option value="">Responsável</option>
              {responsaveis.map((r: string) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          {(filtroSprint || filtroPrio || filtroResp) && (
            <button onClick={() => { setFiltroSprint(''); setFiltroPrio(''); setFiltroResp('') }}
              style={{ ...selStyle, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>
              Limpar
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#8b5cf6', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ marginLeft: 12, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Carregando roadmap…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Conteúdo */}
      {!loading && (
        <div className="flex flex-col gap-8">
          {categorias.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Map size={40} style={{ color: 'var(--text-muted)' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Nenhuma tarefa encontrada para os filtros selecionados
              </div>
            </div>
          )}

          {categorias.map(cat => {
            const catItems: any[] = items.filter((i: any) => i.categoria === cat)
            if (catItems.length === 0) return null
            const cfg = CATEGORIA_CONFIG[cat] || { color: '#8b5cf6', bg: '' }

            return (
              <div key={cat}>
                {/* Category header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{cat}</h2>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, background: `${cfg.color}15`, color: cfg.color, padding: '2px 10px', borderRadius: 99 }}>
                    {catItems.length} {catItems.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {catItems.map((item: any) =>
                    isRedmine
                      ? <RoadmapCardRedmine key={item.id || item.titulo} item={item} />
                      : <RoadmapCardLegacy  key={item.titulo}             item={item} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
