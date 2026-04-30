// ============================================================
// Sustentação Page
// ============================================================
import { useDashboardStore } from '@/store'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts'

export function SustentacaoPage() {
  const { data } = useDashboardStore()
  const { sustentacao: s } = data

  const weeklyData = s.evolucaoSemanal.semanas.map((sem, i) => ({
    sem,
    Abertos: s.evolucaoSemanal.abertos[i],
    Resolvidos: s.evolucaoSemanal.resolvidos[i],
    Backlog: s.evolucaoSemanal.backlog[i],
  }))

  const tendIcon = (t: string) => {
    if (t === 'up')     return <TrendingUp size={13} style={{ color: '#ef4444' }} />
    if (t === 'down')   return <TrendingDown size={13} style={{ color: '#10b981' }} />
    return <Minus size={13} style={{ color: '#f59e0b' }} />
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
          Equipe de <span style={{ color: '#8b5cf6' }}>Sustentação</span>
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
          Análise de chamados, SLA e eficiência operacional
        </p>
      </div>

      {/* SLA highlight row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Dentro do SLA', value: `${s.sla.taxaDentroSLA}%`, color: '#10b981' },
          { label: 'Fora do SLA',   value: `${s.sla.foraDoSLA}%`,    color: '#ef4444' },
          { label: 'Tempo Médio Atendimento', value: s.sla.tempoMedioAtendimento, color: '#3b82f6' },
          { label: 'Tempo Médio Resolução',   value: s.sla.tempoMedioResolucao,   color: '#8b5cf6' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl p-4 text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color: item.color, lineHeight: 1, marginBottom: 5 }}>
              {item.value}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-12 gap-3.5 mb-5">
        {/* Por categoria */}
        <div className="col-span-12 lg:col-span-5 rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Chamados por Categoria</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Total do mês</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={s.porCategoria} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="categoria" type="category" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {s.porCategoria.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Evolução semanal */}
        <div className="col-span-12 lg:col-span-7 rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Evolução Semanal</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Abertos vs. Resolvidos vs. Backlog</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="sem" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Line type="monotone" dataKey="Abertos"    stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Resolvidos" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Backlog"    stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Efficiency + Top assuntos */}
      <div className="grid grid-cols-12 gap-3.5">
        {/* Eficiência */}
        <div className="col-span-12 lg:col-span-4 rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Eficiência Operacional</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Indicadores de qualidade</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Reincidência', value: `${s.eficiencia.reincidencia}%`, color: '#ef4444' },
              { label: 'Chamados Evitados', value: s.eficiencia.chamadosEvitados, color: '#10b981' },
              { label: 'Automações', value: s.eficiencia.automacoesImplementadas, color: '#8b5cf6' },
              { label: 'Horas Ganhas', value: `${s.eficiencia.ganhoOperacionalHoras}h`, color: '#f59e0b' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-3 text-center"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: item.color, lineHeight: 1, marginBottom: 4 }}>
                  {item.value}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 15 assuntos */}
        <div className="col-span-12 lg:col-span-8 rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Top 15 Assuntos</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 12 }}>Chamados por assunto no mês</div>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'Assunto', 'Total', 'Volume', 'Tend.'].map((h) => (
                    <th key={h} style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0 10px 8px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.top15Assuntos.map((item) => {
                  const max = s.top15Assuntos[0].total
                  const pct = (item.total / max) * 100
                  return (
                    <tr key={item.rank}>
                      <td style={{ padding: '7px 10px', fontSize: '0.7rem' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 600,
                          color: item.rank <= 3 ? '#8b5cf6' : 'var(--text-muted)',
                          background: item.rank <= 3 ? 'rgba(139,92,246,0.15)' : 'var(--bg-elevated)',
                          borderRadius: '50%', width: 22, height: 22,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {item.rank}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>{item.assunto}</td>
                      <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>{item.total}</td>
                      <td style={{ padding: '7px 10px', minWidth: 100 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: '#8b5cf6', borderRadius: 99 }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '7px 10px' }}>{tendIcon(item.tendencia)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
