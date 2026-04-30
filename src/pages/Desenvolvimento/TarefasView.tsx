// ============================================================
// Redmine/TarefasView.tsx — Tela de tarefas (Kanban + Lista + Modal)
// ============================================================
import { useEffect, useState, useCallback } from 'react'
import { useRedmineStore } from '@/store/redmine'
import { RedmineAPI } from '@/services/api'
import { getStatusCor, getPrioridadeCor, getTrackerCor, calcularSLA, formatHoras } from '@/utils/redmine'
import { LayoutGrid, List, Search, X, ChevronRight, Clock, User, Tag, MessageSquare, CalendarDays } from 'lucide-react'
import type { RedmineTarefa } from '@/types'
import { getInitials } from '@/utils'

// ── Modal de detalhes ─────────────────────────────────────────
function TarefaModal({ tarefa, onClose }: { tarefa: RedmineTarefa; onClose: () => void }) {
  const [full, setFull] = useState<RedmineTarefa | null>(null)
  const sla = calcularSLA(tarefa.data_prazo, tarefa.data_fechamento != null)

  useEffect(() => {
    RedmineAPI.getTarefa(tarefa.id).then(setFull).catch(() => {})
  }, [tarefa.id])

  const t = full || tarefa

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div
        className="relative z-10 w-full overflow-y-auto animate-panel-in"
        style={{ maxWidth: 680, maxHeight: '88vh', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {t.tracker && (
                  <span className="rounded-full px-2 py-0.5" style={{ fontSize: '0.62rem', fontWeight: 700, background: `${getTrackerCor(t.tracker)}18`, color: getTrackerCor(t.tracker), border: `1px solid ${getTrackerCor(t.tracker)}30` }}>
                    {t.tracker}
                  </span>
                )}
                <span className="rounded-full px-2 py-0.5" style={{ fontSize: '0.62rem', fontWeight: 700, background: `${getPrioridadeCor(t.prioridade)}15`, color: getPrioridadeCor(t.prioridade) }}>
                  {t.prioridade}
                </span>
                <span className="rounded-full px-2 py-0.5" style={{ fontSize: '0.62rem', fontWeight: 700, background: `${getStatusCor(t.status)}15`, color: getStatusCor(t.status) }}>
                  {t.status}
                </span>
                {t.atrasada && (
                  <span className="rounded-full px-2 py-0.5" style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    ⚠ Atrasada
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.4 }}>{t.assunto}</h2>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                #{t.redmine_id}
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {[
              { icon: <User size={13}/>, label: 'Responsável', value: t.responsavel || '—' },
              { icon: <CalendarDays size={13}/>, label: 'Prazo', value: t.data_prazo || '—', extra: sla.label, extraCor: sla.cor },
              { icon: <Clock size={13}/>, label: 'Horas Gastas', value: formatHoras(t.horas_gastas) },
              { icon: <Clock size={13}/>, label: 'Horas Estimadas', value: formatHoras(t.estimativa_horas) },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-1.5 mb-1" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {item.icon} {item.label}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{item.value}</div>
                {item.extra && <div style={{ fontSize: '0.65rem', color: item.extraCor, marginTop: 1 }}>{item.extra}</div>}
              </div>
            ))}
          </div>

          {/* Progresso */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Progresso</span>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: getStatusCor(t.status) }}>{t.progresso}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${t.progresso}%`, background: getStatusCor(t.status), borderRadius: 99, transition: 'width 0.5s' }} />
            </div>
          </div>

          {/* Descrição */}
          {t.descricao && (
            <div className="mb-4 rounded-xl p-3.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Descrição</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {t.descricao.slice(0, 800)}{t.descricao.length > 800 ? '…' : ''}
              </div>
            </div>
          )}

          {/* Comentários */}
          {t.comentarios && t.comentarios.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={14} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Comentários ({t.comentarios.length})</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {t.comentarios.map(c => (
                  <div key={c.id} className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex items-center justify-center rounded-full text-white font-bold" style={{ width: 22, height: 22, background: '#8b5cf6', fontSize: '0.55rem' }}>
                        {getInitials(c.autor)}
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{c.autor}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.texto}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Card Kanban ───────────────────────────────────────────────
function KanbanCard({ tarefa, onClick }: { tarefa: RedmineTarefa; onClick: () => void }) {
  const sla     = calcularSLA(tarefa.data_prazo, tarefa.data_fechamento != null)
  const color   = getStatusCor(tarefa.status)
  const prioCol = getPrioridadeCor(tarefa.prioridade)

  return (
    <div
      className="rounded-xl p-3 cursor-pointer transition-all duration-200 relative overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}55`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <div className="absolute top-0 left-0 right-0 rounded-t-xl" style={{ height: 2.5, background: prioCol }} />
      {tarefa.tracker && (
        <span style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: getTrackerCor(tarefa.tracker), background: `${getTrackerCor(tarefa.tracker)}18`, padding: '1px 6px', borderRadius: 99, marginBottom: 5, display: 'inline-block' }}>
          {tarefa.tracker}
        </span>
      )}
      <div style={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.35, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {tarefa.assunto}
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {tarefa.responsavel && (
            <div className="flex items-center justify-center rounded-full text-white font-bold" style={{ width: 20, height: 20, background: '#8b5cf6', fontSize: '0.5rem', flexShrink: 0 }}>
              {getInitials(tarefa.responsavel)}
            </div>
          )}
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{tarefa.responsavel || '—'}</span>
        </div>
        {tarefa.data_prazo && (
          <span style={{ fontSize: '0.62rem', color: sla.cor, fontWeight: 600, whiteSpace: 'nowrap' }}>{sla.label}</span>
        )}
      </div>
      {tarefa.progresso > 0 && tarefa.progresso < 100 && (
        <div className="mt-2">
          <div style={{ height: 2, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${tarefa.progresso}%`, background: color, borderRadius: 99 }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── View principal ────────────────────────────────────────────
export function TarefasView() {
  const { filtrosAtivos, setFiltrosAtivos, clearFiltros, viewMode, setViewMode, filtros, tarefaSelecionada, setTarefaSelecionada } = useRedmineStore()
  const [tarefas, setTarefas]   = useState<RedmineTarefa[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [kanban, setKanban]     = useState<Record<string, RedmineTarefa[]>>({})
  const [busca, setBusca]       = useState(filtrosAtivos.busca || '')

  const fetchTarefas = useCallback(async () => {
    setLoading(true)
    try {
      if (viewMode === 'kanban') {
        const board = await RedmineAPI.getKanban(filtrosAtivos as any)
        setKanban(board as Record<string, RedmineTarefa[]>)
      } else {
        const data = await RedmineAPI.getTarefas({ ...filtrosAtivos, page_size: 100 })
        setTarefas(data.items)
        setTotal(data.total)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filtrosAtivos, viewMode])

  useEffect(() => { fetchTarefas() }, [fetchTarefas])

  const selStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', padding: '6px 10px', borderRadius: 8,
    fontSize: '0.78rem', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none',
  }

  const activeFilters = Object.entries(filtrosAtivos).filter(([, v]) => v !== undefined && v !== '')

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        {/* Busca */}
        <div className="relative flex-1" style={{ minWidth: 180 }}>
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar tarefas…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setFiltrosAtivos({ busca })}
            style={{ ...selStyle, paddingLeft: 32, width: '100%' }}
          />
        </div>

        {/* Filtros */}
        {filtros.status.length > 0 && (
          <select style={selStyle} value={filtrosAtivos.status || ''} onChange={e => setFiltrosAtivos({ status: e.target.value || undefined })}>
            <option value="">Status</option>
            {filtros.status.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {filtros.prioridades.length > 0 && (
          <select style={selStyle} value={filtrosAtivos.prioridade || ''} onChange={e => setFiltrosAtivos({ prioridade: e.target.value || undefined })}>
            <option value="">Prioridade</option>
            {filtros.prioridades.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        {filtros.responsaveis.length > 0 && (
          <select style={selStyle} value={filtrosAtivos.responsavel || ''} onChange={e => setFiltrosAtivos({ responsavel: e.target.value || undefined })}>
            <option value="">Responsável</option>
            {filtros.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        {filtros.versoes.length > 0 && (
          <select style={selStyle} value={filtrosAtivos.versao || ''} onChange={e => setFiltrosAtivos({ versao: e.target.value || undefined })}>
            <option value="">Sprint / Versão</option>
            {filtros.versoes.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        )}

        {activeFilters.length > 0 && (
          <button onClick={clearFiltros} className="flex items-center gap-1.5" style={{ ...selStyle, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>
            <X size={13} /> Limpar
          </button>
        )}

        {/* View toggle */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', marginLeft: 'auto' }}>
          {(['kanban', 'lista'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{ padding: '6px 10px', background: viewMode === m ? 'var(--accent)' : 'var(--bg-elevated)', color: viewMode === m ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontFamily: 'var(--font-body)' }}
            >
              {m === 'kanban' ? <LayoutGrid size={14}/> : <List size={14}/>}
              <span className="hidden sm:inline">{m === 'kanban' ? 'Kanban' : 'Lista'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#8b5cf6', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Kanban */}
      {!loading && viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
            {Object.entries(kanban).map(([status, cards]) => {
              const cor = getStatusCor(status)
              return (
                <div key={status} style={{ width: 260, flexShrink: 0 }}>
                  <div className="flex items-center justify-between px-3 py-2 rounded-t-xl" style={{ background: `${cor}15`, borderBottom: `2px solid ${cor}` }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: cor }}>{status}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, background: cor, color: '#fff', borderRadius: 99, padding: '1px 7px' }}>{cards.length}</span>
                  </div>
                  <div className="flex flex-col gap-2 p-2 rounded-b-xl min-h-12" style={{ background: 'var(--bg-surface)', border: `1px solid var(--border)`, borderTop: 'none' }}>
                    {cards.map(t => <KanbanCard key={t.id} tarefa={t} onClick={() => setTarefaSelecionada(t)} />)}
                    {cards.length === 0 && <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Vazio</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista */}
      {!loading && viewMode === 'lista' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Assunto', 'Status', 'Prioridade', 'Responsável', 'Prazo', 'Progresso'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tarefas.map(t => {
                const sla = calcularSLA(t.data_prazo, t.data_fechamento != null)
                return (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setTarefaSelecionada(t)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '8px 14px', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>#{t.redmine_id}</td>
                    <td style={{ padding: '8px 14px', fontSize: '0.8rem', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{t.assunto}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, background: `${getStatusCor(t.status)}15`, color: getStatusCor(t.status), padding: '2px 8px', borderRadius: 99 }}>{t.status}</span>
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, background: `${getPrioridadeCor(t.prioridade)}15`, color: getPrioridadeCor(t.prioridade), padding: '2px 8px', borderRadius: 99 }}>{t.prioridade}</span>
                    </td>
                    <td style={{ padding: '8px 14px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t.responsavel || '—'}</td>
                    <td style={{ padding: '8px 14px', fontSize: '0.72rem', color: sla.cor, fontWeight: 600, whiteSpace: 'nowrap' }}>{sla.label}</td>
                    <td style={{ padding: '8px 14px', minWidth: 80 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${t.progresso}%`, background: getStatusCor(t.status), borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', width: 28, textAlign: 'right' }}>{t.progresso}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {tarefaSelecionada && (
        <TarefaModal tarefa={tarefaSelecionada} onClose={() => setTarefaSelecionada(null)} />
      )}
    </div>
  )
}
