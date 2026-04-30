// ============================================================
// Visão Estratégica Page
// ============================================================
import { useDashboardStore } from '@/store'
import { formatCurrency, formatNumber } from '@/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis, Cell
} from 'recharts'

function GaugeCard({ label, value, max, color, suffix = '' }: {
  label: string; value: number; max: number; color: string; suffix?: string
}) {
  const pct = Math.min((value / max) * 100, 100)
  const gaugeData = [{ name: label, value: pct }]

  return (
    <div className="rounded-2xl p-4 flex flex-col items-center"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div style={{ width: 100, height: 100, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius={32} outerRadius={44} data={gaugeData} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background dataKey="value" cornerRadius={10} fill={color} angleAxisId={0} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color, lineHeight: 1 }}>
            {value}{suffix}
          </span>
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            de {max}{suffix}
          </span>
        </div>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 6 }}>
        {label}
      </div>
    </div>
  )
}

export function EstrategicaPage() {
  const { data } = useDashboardStore()
  const ve = data.visaoEstrategica

  const chartData = ve.meses.map((m, i) => ({
    mes: m,
    disponibilidade: ve.evolucaoDisponibilidade[i],
  }))

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
          Visão <span style={{ color: '#8b5cf6' }}>Estratégica</span>
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
          Valor da TI para o negócio — impacto e resultados
        </p>
      </div>

      {/* Big number highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Franquias Suportadas', value: ve.franquiasSuportadas, suffix: '', color: '#8b5cf6' },
          { label: 'Disponibilidade',      value: ve.disponibilidadeSistemas, suffix: '%', color: '#10b981' },
          { label: 'Score de Segurança',   value: ve.scoreSeguranca, suffix: '/100', color: '#3b82f6' },
          { label: 'Saúde Infra',          value: ve.saudeInfraestrutura, suffix: '%', color: '#f59e0b' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: item.color }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.2rem', fontWeight: 700, color: item.color, lineHeight: 1, marginBottom: 6 }}>
              {item.value}<span style={{ fontSize: '1rem', opacity: 0.7 }}>{item.suffix}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-12 gap-3.5 mb-5">
        {/* Uptime evolution */}
        <div className="col-span-12 lg:col-span-8 rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Evolução da Disponibilidade</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
            Últimos 6 meses — uptime dos sistemas
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="uptimeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[96, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                formatter={(v: number) => [`${v}%`, 'Disponibilidade']}
              />
              <Area type="monotone" dataKey="disponibilidade" stroke="#10b981" strokeWidth={2.5} fill="url(#uptimeGrad)" dot={{ fill: '#10b981', r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Impact numbers */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          {[
            { label: 'Redução de Custos',      value: formatCurrency(ve.reducaoCustosEstimada),    color: '#10b981' },
            { label: 'Crescimento Operação',   value: `+${ve.crescimentoOperacao}%`,              color: '#8b5cf6' },
            { label: 'Projetos Entregues',     value: ve.projetosEntregues,                       color: '#3b82f6' },
            { label: 'Incidentes Evitados',    value: ve.incidentesCriticosEvitados,              color: '#f59e0b' },
            { label: 'Horas Economizadas',     value: `${ve.horasEconomizidasAutomacao}h`,        color: '#ec4899' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: item.color }} />
              <div className="flex-1">
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: item.color }}>
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gauge row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GaugeCard label="Disponibilidade"   value={ve.disponibilidadeSistemas}    max={100} color="#10b981" suffix="%" />
        <GaugeCard label="Score Segurança"   value={ve.scoreSeguranca}             max={100} color="#3b82f6" />
        <GaugeCard label="Saúde Infra"       value={ve.saudeInfraestrutura}        max={100} color="#f59e0b" suffix="%" />
        <GaugeCard label="Crescimento"       value={ve.crescimentoOperacao}        max={30}  color="#8b5cf6" suffix="%" />
      </div>
    </div>
  )
}
