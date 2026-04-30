// ============================================================
// Overview Page — Visão Geral Executiva
// ============================================================
import {
  Headphones, BarChart2, CheckCircle, AlertTriangle,
  Users, Building2, Code2, Layers, Star
} from 'lucide-react'
import { KPICard } from '@/components/KPI/KPICard'
import { useDashboardStore } from '@/store'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts'

export function OverviewPage() {
  const { data } = useDashboardStore()
  const { visaoGeral: vg, visaoEstrategica: ve } = data

  const availabilityData = ve.meses.map((m, i) => ({
    mes: m,
    valor: ve.evolucaoDisponibilidade[i],
  }))

  const satisfacaoData = [{ name: 'Satisfação', value: (vg.satisfacaoInterna.valor / 5) * 100 }]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Visão Geral <span style={{ color: '#8b5cf6' }}>Executiva</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            Consolidado de {data.meta.mes} {data.meta.ano} · {data.meta.empresa}
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
        <KPICard
          label="Chamados Atendidos"
          value={vg.chamadosAtendidos.valor}
          previous={vg.chamadosAtendidos.anterior}
          meta={vg.chamadosAtendidos.meta}
          accentColor="#8b5cf6"
          icon={<Headphones size={18} />}
          animationDelay={0}
        />
        <KPICard
          label="SLA Média"
          value={vg.slaMedia.valor}
          unit="%"
          previous={vg.slaMedia.anterior}
          meta={vg.slaMedia.meta}
          accentColor="#3b82f6"
          icon={<BarChart2 size={18} />}
          decimals={1}
          animationDelay={60}
        />
        <KPICard
          label="Resolução 1º Atend."
          value={vg.resolucaoPrimeiroAtendimento.valor}
          unit="%"
          previous={vg.resolucaoPrimeiroAtendimento.anterior}
          meta={vg.resolucaoPrimeiroAtendimento.meta}
          accentColor="#10b981"
          icon={<CheckCircle size={18} />}
          decimals={1}
          animationDelay={120}
        />
        <KPICard
          label="Chamados Críticos"
          value={vg.chamadosCriticos.valor}
          previous={vg.chamadosCriticos.anterior}
          meta={vg.chamadosCriticos.meta}
          accentColor="#ef4444"
          icon={<AlertTriangle size={18} />}
          invertDelta
          animationDelay={180}
        />
        <KPICard
          label="Usuários Atendidos"
          value={vg.usuariosAtendidos.valor}
          previous={vg.usuariosAtendidos.anterior}
          accentColor="#06b6d4"
          icon={<Users size={18} />}
          animationDelay={240}
        />
        <KPICard
          label="Franquias Atendidas"
          value={vg.franquiasAtendidas.valor}
          previous={vg.franquiasAtendidas.anterior}
          accentColor="#f59e0b"
          icon={<Building2 size={18} />}
          animationDelay={300}
        />
        <KPICard
          label="Entregas Dev"
          value={vg.entregasDesenvolvimento.valor}
          previous={vg.entregasDesenvolvimento.anterior}
          accentColor="#ec4899"
          icon={<Code2 size={18} />}
          animationDelay={360}
        />
        <KPICard
          label="Projetos em Andamento"
          value={vg.projetosAndamento.valor}
          previous={vg.projetosAndamento.anterior}
          accentColor="#a78bfa"
          icon={<Layers size={18} />}
          invertDelta
          animationDelay={420}
        />
        <KPICard
          label="Satisfação Interna"
          value={vg.satisfacaoInterna.valor}
          unit="/5"
          previous={vg.satisfacaoInterna.anterior}
          accentColor="#fbbf24"
          icon={<Star size={18} />}
          decimals={1}
          animationDelay={480}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-12 gap-3.5">
        {/* Uptime Evolution */}
        <div
          className="col-span-12 lg:col-span-8 rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>
            Evolução da Disponibilidade
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
            Uptime dos sistemas — últimos 6 meses
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={availabilityData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[96, 100]} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--text-primary)',
                }}
                formatter={(v: number) => [`${v}%`, 'Disponibilidade']}
              />
              <Area type="monotone" dataKey="valor" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorUptime)" dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Strategic numbers */}
        <div
          className="col-span-12 lg:col-span-4 rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>
            Números Estratégicos
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Impacto do mês
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Franquias Suportadas', value: ve.franquiasSuportadas, color: '#8b5cf6', suffix: '' },
              { label: 'Disponibilidade', value: ve.disponibilidadeSistemas, color: '#10b981', suffix: '%' },
              { label: 'Incidentes Evitados', value: ve.incidentesCriticosEvitados, color: '#3b82f6', suffix: '' },
              { label: 'Horas Economizadas', value: ve.horasEconomizidasAutomacao, color: '#f59e0b', suffix: 'h' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-3 text-center"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: item.color,
                    lineHeight: 1,
                    marginBottom: 4,
                  }}
                >
                  {item.value}{item.suffix}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Satisfação score */}
          <div className="mt-3 flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <ResponsiveContainer width={60} height={60}>
              <RadialBarChart innerRadius={22} outerRadius={30} data={satisfacaoData} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={10} fill="#fbbf24" angleAxisId={0} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: '#fbbf24' }}>
                {vg.satisfacaoInterna.valor}<span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/5</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                Satisfação Interna
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
