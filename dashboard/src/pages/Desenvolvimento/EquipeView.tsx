// ============================================================
// Redmine/EquipeView.tsx — Produtividade da equipe
// ============================================================
import { useState, useEffect } from 'react'
import { useRedmineStore } from '@/store/redmine'
import { RedmineAPI } from '@/services/api'
import { getInitials } from '@/utils'
import { formatHoras } from '@/utils/redmine'
import { Trophy, Clock, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const RANKING_CORES = ['#f59e0b', '#94a3b8', '#b45309', '#8b5cf6', '#3b82f6']
const AVATAR_CORES  = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444']

function MembroCard({ membro, rank }: { membro: any; rank: number }) {
  const cor    = AVATAR_CORES[(rank - 1) % AVATAR_CORES.length]
  const rankCor = RANKING_CORES[rank - 1] || '#6b7280'
  const total  = membro.abertas + membro.em_andamento + membro.concluidas
  const cargaPct = total > 0 ? Math.round(((membro.abertas + membro.em_andamento) / total) * 100) : 0

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden transition-all duration-300"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${cor}55`; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = '' }}
    >
      {/* Rank badge */}
      <div className="absolute top-3 right-3 flex items-center justify-center rounded-full font-extrabold" style={{ width: 28, height: 28, background: rank <= 3 ? rankCor : 'var(--bg-elevated)', color: rank <= 3 ? '#fff' : 'var(--text-muted)', fontSize: '0.72rem' }}>
        {rank <= 3 ? <Trophy size={13} /> : `#${rank}`}
      </div>

      {/* Avatar + nome */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center rounded-full text-white font-extrabold flex-shrink-0" style={{ width: 44, height: 44, background: `linear-gradient(135deg, ${cor}, ${cor}99)`, fontSize: '0.85rem', boxShadow: `0 0 0 3px ${cor}30` }}>
          {getInitials(membro.nome)}
        </div>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{membro.nome}</div>
          <div className="flex items-center gap-1" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 1 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: cargaPct > 80 ? '#ef4444' : cargaPct > 50 ? '#f59e0b' : '#10b981', flexShrink: 0 }} />
            {cargaPct > 80 ? 'Alta carga' : cargaPct > 50 ? 'Carga moderada' : 'Carga normal'}
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: 'Concluídas',   value: membro.concluidas,   color: '#10b981', icon: <CheckCircle2 size={11}/> },
          { label: 'Em andamento', value: membro.em_andamento, color: '#3b82f6', icon: <TrendingUp size={11}/> },
          { label: 'Atrasadas',    value: membro.atrasadas,    color: '#ef4444', icon: <AlertTriangle size={11}/> },
          { label: 'Horas gastas', value: formatHoras(membro.horas_gastas), color: '#8b5cf6', icon: <Clock size={11}/> },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-center gap-1 mb-1" style={{ color: item.color }}>
              {item.icon}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: item.color, lineHeight: 1 }}>
              {item.value}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Taxa de conclusão */}
      <div>
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Taxa de conclusão</span>
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: cor, fontWeight: 700 }}>{membro.taxa_conclusao}%</span>
        </div>
        <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${membro.taxa_conclusao}%`, background: `linear-gradient(90deg, ${cor}, ${cor}99)`, borderRadius: 99, transition: 'width 0.7s' }} />
        </div>
      </div>

      {membro.tempo_medio && (
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
          Tempo médio resolução: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{formatHoras(membro.tempo_medio)}</span>
        </div>
      )}
    </div>
  )
}

export function EquipeView() {
  const { dashboard: storeDashboard } = useRedmineStore()
  const [mesSel, setMesSel]     = useState(0)
  const [anoSel, setAnoSel]     = useState(new Date().getFullYear())
  const [filtrado, setFiltrado] = useState<any>(null)
  const [loading, setLoading]   = useState(false)

  const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  useEffect(() => {
    if (mesSel === 0) { setFiltrado(null); return }
    setLoading(true)
    const params: Record<string,string> = { ano: String(anoSel), mes: String(mesSel) }
    RedmineAPI.getDashboard(params)
      .then(setFiltrado)
      .catch(() => setFiltrado(null))
      .finally(() => setLoading(false))
  }, [mesSel, anoSel])

  const dashboard = filtrado || storeDashboard
  const equipe = dashboard?.equipe || []

  if (equipe.length === 0 && !loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Trophy size={40} style={{ color: 'var(--text-muted)' }} />
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sincronize para ver métricas da equipe</div>
    </div>
  )

  // Dados para o gráfico comparativo
  const chartData = equipe.slice(0, 8).map(m => ({
    nome: m.nome.split(' ')[0],
    concluidas:   m.concluidas,
    em_andamento: m.em_andamento,
    atrasadas:    m.atrasadas,
  }))

  return (
    <div>
      {/* Filtro de mês */}
      <div className="mb-5">
        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>
          Competência — {anoSel}
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <button onClick={() => setMesSel(0)}
            style={{ padding: '5px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: mesSel === 0 ? '#8b5cf6' : 'var(--bg-elevated)', color: mesSel === 0 ? '#fff' : 'var(--text-secondary)', border: `1px solid ${mesSel === 0 ? '#8b5cf6' : 'var(--border)'}`, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Todos
          </button>
          {MESES.slice(1).map((m, i) => {
            const mes = i + 1
            const active = mesSel === mes
            return (
              <button key={mes} onClick={() => setMesSel(mes)}
                style={{ padding: '5px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: active ? '#8b5cf6' : 'var(--bg-card)', color: active ? '#fff' : 'var(--text-secondary)', border: `1px solid ${active ? '#8b5cf6' : 'var(--border)'}`, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
                {m}
              </button>
            )
          })}
          {mesSel > 0 && (
            <button onClick={() => setMesSel(0)}
              style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              ✕ Limpar {MESES[mesSel]}
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#8b5cf6', animation: 'spin 0.7s linear infinite' }} />
          Carregando dados de {MESES[mesSel]}…
        </div>
      )}

      {/* Ranking cards */}
      <div className="mb-6">
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
          🏆 Ranking de Produtividade {mesSel > 0 ? `— ${MESES[mesSel]}/${anoSel}` : ''}
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {equipe.map((m, i) => <MembroCard key={m.membro_id} membro={m} rank={i + 1} />)}
        </div>
      </div>

      {/* Gráfico comparativo */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Comparativo da Equipe</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Tarefas por desenvolvedor</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="nome" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="concluidas"   name="Concluídas"   fill="#10b981" radius={[3,3,0,0]} />
            <Bar dataKey="em_andamento" name="Em andamento" fill="#3b82f6" radius={[3,3,0,0]} />
            <Bar dataKey="atrasadas"    name="Atrasadas"    fill="#ef4444" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
