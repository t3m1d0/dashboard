// ============================================================
// RoadmapPage.tsx — Roadmap derivado do Redmine (ao vivo)
// Fallback para JSON estático se Redmine não configurado
// ============================================================
import { useEffect, useState, useMemo } from 'react'
import { useDashboardStore } from '@/store'
import { PeriodoSelector } from '@/components/UI/PeriodoSelector'
import { useSectionPeriodo } from '@/hooks/useSectionPeriodo'
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
function RoadmapCardRedmine({ item, onSelect }: { item: any; onSelect: (i: any) => void }) {
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
      style={{ background: 'var(--bg-card)', border: `1px solid ${item.atrasada ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`, cursor: 'pointer' }}
      onClick={() => onSelect(item)}
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
  const { filtrarItems, toQueryParams, periodo } = useSectionPeriodo('roadmap')
  const [redmineData, setRedmineData] = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [filtroSprint, setFiltroSprint] = useState('')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [filtroPrio, setFiltroPrio]     = useState('')
  const [filtroResp, setFiltroResp]     = useState('')

  useEffect(() => {
    setLoading(true)
    RedmineEntregasAPI.getRoadmap()
      .then(setRedmineData)
      .catch(() => setRedmineData({ configurado: false, items: [], sprints: [] }))
      .finally(() => setLoading(false))
  }, [])

  const isRedmine   = redmineData?.configurado === true
  const allRoadmap  = isRedmine ? (redmineData?.items || []) : data.roadmap
  const rawItems    = filtrarItems(allRoadmap, 'prazo')
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
          <PeriodoSelector secao="roadmap" />
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
                      ? <RoadmapCardRedmine key={item.id || item.titulo} item={item} onSelect={setSelectedItem} />
                      : <RoadmapCardLegacy  key={item.titulo}             item={item} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {selectedItem && <TicketModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  )
}


// ── Modal de detalhes do ticket ───────────────────────────────
function TicketModal({ item, onClose }: { item: any; onClose: () => void }) {
  const [detail, setDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!item?.id) return
    setLoadingDetail(true)
    import('@/services/api').then(({ RedmineEntregasAPI }) => {
      RedmineEntregasAPI.getTicket(item.id)
        .then(setDetail)
        .catch(() => setDetail(null))
        .finally(() => setLoadingDetail(false))
    })
  }, [item?.id])

  const d = detail || item  // use detail if loaded, fallback to item

  const sc: Record<string,string> = {
    'Fazendo':'#3b82f6','A testar':'#8b5cf6','Aguardando Build':'#f59e0b',
    'A fazer':'#6b7280','Concluída':'#10b981','Rejeitado':'#ef4444','Cancelado':'#ef4444','Não entregue':'#ef4444'
  }
  const pc: Record<string,string> = { 'Urgente':'#ef4444','Alta':'#f59e0b','Normal':'#3b82f6','Baixa':'#6b7280' }
  const statusColor = sc[d.status] || '#6b7280'
  const prioColor   = pc[d.prioridade] || '#6b7280'

  const fmtDate = (s: string | null) => {
    if (!s) return null
    try {
      return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return s }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      onClick={onClose} onWheel={e => e.stopPropagation()}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
      <div className="relative z-10 w-full" style={{ maxWidth: 680, maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>{d.status}</span>
                {d.prioridade && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: `${prioColor}15`, color: prioColor }}>{d.prioridade}</span>}
                {d.tipo || d.tracker ? <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{d.tipo || d.tracker}</span> : null}
                {d.redmine_id && <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>#{d.redmine_id}</span>}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.3 }}>{d.titulo}</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16 }}>✕</button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4" style={{ overscrollBehavior: 'contain' }}>

          {/* Info grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[
              { label: 'Projeto',      value: d.projeto },
              { label: 'Responsável',  value: d.responsavel },
              { label: 'Sprint',       value: d.versao || d.sprint || null },
              { label: 'Estimativa',   value: d.estimativa_horas || d.horas_estimadas ? `${d.estimativa_horas || d.horas_estimadas}h` : null },
              { label: 'Horas Gastas', value: d.horas_gastas ? `${d.horas_gastas}h` : null },
              { label: 'Prazo',        value: d.data_prazo || d.prazo || null },
            ].filter(x => x.value).map(({ label, value }) => (
              <div key={label} className="rounded-xl p-2.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Progresso */}
          {(d.progresso || 0) > 0 && (
            <div>
              <div className="flex justify-between mb-1.5">
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Progresso</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: statusColor }}>{d.progresso}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${d.progresso}%`, background: statusColor, borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
            </div>
          )}

          {/* Datas */}
          <div className="rounded-xl p-3.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Histórico de Datas</div>
            <div className="flex flex-col gap-2">
              {[
                { label: '🟢 Criado em',      value: fmtDate(d.data_criacao) },
                { label: '✏️ Atualizado em',  value: fmtDate(d.data_atualizacao) },
                { label: '✅ Finalizado em',   value: fmtDate(d.data_fechamento) },
                { label: '📅 Prazo',           value: d.data_prazo || d.prazo || null },
                { label: '🔄 Sincronizado',    value: fmtDate(d.sincronizado_em) },
              ].filter(x => x.value).map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Descrição */}
          {d.descricao && d.descricao !== '—' && (
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Descrição</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto' }}>{d.descricao}</div>
            </div>
          )}

          {/* Tags */}
          {(d.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {d.tags.map((t: string) => (
                <span key={t} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{t}</span>
              ))}
            </div>
          )}

          {/* Comentários */}
          {loadingDetail && (
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#8b5cf6', animation: 'spin 0.7s linear infinite' }} />
              Carregando histórico…
            </div>
          )}
          {!loadingDetail && detail?.comentarios?.length > 0 && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
                Comentários ({detail.comentarios.length})
              </div>
              <div className="flex flex-col gap-2.5">
                {detail.comentarios.map((c: any, i: number) => (
                  <div key={i} className="rounded-xl p-3.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b5cf6' }}>{c.autor}</span>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{fmtDate(c.criado_em)}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{c.texto}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!loadingDetail && detail && detail.comentarios?.length === 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Nenhum comentário registrado</div>
          )}
        </div>
      </div>
    </div>
  )
}
