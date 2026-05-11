// ============================================================
// EstrategicaPage.tsx — Visão Estratégica
// Dados automáticos do Redmine + edição manual dos demais
// ============================================================
import { useState, useEffect } from 'react'
import { useDashboardStore } from '@/store'
import { formatCurrency } from '@/utils'
import { RedmineAPI, KPIsAPI } from '@/services/api'
import { Edit3, Save, X, RefreshCw, CheckCircle2 } from 'lucide-react'
import { PeriodoSelector } from '@/components/UI/PeriodoSelector'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts'

function GaugeCard({ label, value, max, color, suffix = '' }: {
  label: string; value: number; max: number; color: string; suffix?: string
}) {
  const pct = Math.min(max > 0 ? (value / max) * 100 : 0, 100)
  return (
    <div className="rounded-2xl p-4 flex flex-col items-center"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div style={{ width: 100, height: 100, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius={32} outerRadius={44} data={[{ name: label, value: pct }]} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background dataKey="value" cornerRadius={10} fill={color} angleAxisId={0} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color, lineHeight: 1 }}>{value}{suffix}</span>
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>de {max}{suffix}</span>
        </div>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 6 }}>{label}</div>
    </div>
  )
}

export function EstrategicaPage() {
  const { data, setData } = useDashboardStore()
  const ve = data.visaoEstrategica

  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saveOk, setSaveOk]     = useState(false)
  const [rmSnap, setRmSnap]     = useState<any>(null)

  const [form, setForm] = useState({
    franquiasSuportadas:      ve.franquiasSuportadas    || 0,
    disponibilidadeSistemas:  ve.disponibilidadeSistemas || 0,
    reducaoCustosEstimada:    ve.reducaoCustosEstimada  || 0,
    crescimentoOperacao:      ve.crescimentoOperacao    || 0,
    scoreSeguranca:           ve.scoreSeguranca         || 0,
    saudeInfraestrutura:      ve.saudeInfraestrutura    || 0,
    mes:                      data.meta.mes || '',
    ano:                      data.meta.ano || new Date().getFullYear(),
    meses:                    (ve.meses || []).join(', '),
    evolucaoDisponibilidade:  (ve.evolucaoDisponibilidade || []).join(', '),
  })

  useEffect(() => {
    RedmineAPI.getDashboard().then(setRmSnap).catch(() => {})
  }, [])

  // Mescla Redmine + manual
  const merged = {
    ...ve,
    projetosEntregues:          rmSnap?.kpis?.concluidas            ?? ve.projetosEntregues,
    incidentesCriticosEvitados: rmSnap?.kpis?.atrasadas             ?? ve.incidentesCriticosEvitados,
    horasEconomizidasAutomacao: rmSnap?.kpis?.horas_gastas          ?? ve.horasEconomizidasAutomacao,
    // Automático do banco
    franquiasSuportadas:        rmSnap?.franquias_ativas             || form.franquiasSuportadas,
    disponibilidadeSistemas:    rmSnap?.sla_sustentacao              || form.disponibilidadeSistemas,
    crescimentoOperacao:        rmSnap?.crescimento_chamados         ?? form.crescimentoOperacao,
    // Manual (sem fonte automática ainda)
    reducaoCustosEstimada:      form.reducaoCustosEstimada,
    scoreSeguranca:             form.scoreSeguranca,
    saudeInfraestrutura:        form.saudeInfraestrutura,
  }

  const chartData = (form.meses ? form.meses.split(',').map((m: string) => m.trim()).filter(Boolean) : []).map((m: string, i: number) => ({
    mes: m,
    disponibilidade: parseFloat((form.evolucaoDisponibilidade || '').split(',')[i] || '0'),
  }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const mesesArr = form.meses.split(',').map((s: string) => s.trim()).filter(Boolean)
      const evolArr  = form.evolucaoDisponibilidade.split(',').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n))
      const novaVE   = { ...merged, meses: mesesArr, evolucaoDisponibilidade: evolArr }
      const periodo  = `${form.ano}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

      await KPIsAPI.upsert({
        periodo, mes: form.mes, ano: form.ano,
        dados: { ...data, meta: { ...data.meta, mes: form.mes, ano: form.ano }, visaoEstrategica: novaVE },
      })

      setData({ meta: { ...data.meta, mes: form.mes, ano: form.ano }, visaoEstrategica: novaVE })
      setSaveOk(true)
      setTimeout(() => { setSaveOk(false); setEditOpen(false) }, 1500)
    } catch (e: any) {
      alert('Erro ao salvar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', fontSize: '0.85rem',
    color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none',
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Visão <span style={{ color: '#8b5cf6' }}>Estratégica</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            Valor da TI para o negócio
            {rmSnap?.configurado && <span style={{ color: '#10b981' }}> · Redmine conectado ✓</span>}
          </p>
        </div>
        <PeriodoSelector secao="estrategica" />
        <button onClick={() => setEditOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <Edit3 size={14} /> Editar Indicadores
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Franquias Suportadas', value: merged.franquiasSuportadas,         color: '#8b5cf6', suffix: '', auto: !!rmSnap?.franquias_ativas },
          { label: 'Disponibilidade',      value: merged.disponibilidadeSistemas,     color: '#10b981', suffix: '%' },
          { label: 'Score Segurança',      value: merged.scoreSeguranca,              color: '#3b82f6', suffix: '/100' },
          { label: 'Saúde da Infra',       value: merged.saudeInfraestrutura,         color: '#f59e0b', suffix: '%' },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: item.color }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: item.color, lineHeight: 1, marginBottom: 6 }}>
              {item.value}<span style={{ fontSize: '1rem', opacity: 0.7 }}>{item.suffix}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.label}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>manual</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3.5 mb-5">
        {/* Gráfico uptime */}
        <div className="col-span-12 lg:col-span-8 rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Evolução da Disponibilidade</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Histórico de uptime</div>
          {chartData.length > 0 ? (
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
                <YAxis domain={[90, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Disponibilidade']} />
                <Area type="monotone" dataKey="disponibilidade" stroke="#10b981" strokeWidth={2.5} fill="url(#uptimeGrad)" dot={{ fill: '#10b981', r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 rounded-xl"
              style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border)' }}>
              <div className="text-center">
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Sem histórico de disponibilidade</div>
                <PeriodoSelector secao="estrategica" />
        <button onClick={() => setEditOpen(true)}
                  style={{ fontSize: '0.78rem', color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  + Adicionar dados
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Números do Redmine */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-2.5">
          {[
            { label: 'Redução de Custos',   value: formatCurrency(merged.reducaoCustosEstimada),    color: '#10b981', src: 'manual' },
            { label: 'Crescimento',          value: `+${merged.crescimentoOperacao}%`,               color: '#8b5cf6', src: 'manual' },
            { label: 'Projetos Entregues',   value: merged.projetosEntregues,                        color: '#3b82f6', src: 'Redmine' },
            { label: 'Atrasadas',            value: merged.incidentesCriticosEvitados,               color: '#f59e0b', src: 'Redmine' },
            { label: 'Horas em Projetos',    value: `${Math.round(merged.horasEconomizidasAutomacao || 0)}h`, color: '#ec4899', src: 'Redmine' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: item.color }} />
              <div className="flex-1">
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: item.color }}>{item.value}</div>
              </div>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 99, border: '1px solid var(--border)' }}>
                {item.src}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GaugeCard label="Disponibilidade" value={merged.disponibilidadeSistemas} max={100} color="#10b981" suffix="%" />
        <GaugeCard label="Score Segurança" value={merged.scoreSeguranca}          max={100} color="#3b82f6" />
        <GaugeCard label="Saúde Infra"     value={merged.saudeInfraestrutura}     max={100} color="#f59e0b" suffix="%" />
        <GaugeCard label="Crescimento"     value={merged.crescimentoOperacao}     max={30}  color="#8b5cf6" suffix="%" />
      </div>

      {/* Modal edição */}
      {editOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={() => setEditOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
          <div className="relative z-10 w-full overflow-y-auto"
            style={{ maxWidth: 580, maxHeight: '88vh', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Editar Indicadores Estratégicos</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Campos "Redmine" são preenchidos automaticamente
                </div>
              </div>
              <button onClick={() => setEditOpen(false)}
                style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={14} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mês</label>
                  <input style={inputStyle} value={form.mes} onChange={e => setForm(f => ({ ...f, mes: e.target.value }))} placeholder="Ex: Maio" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ano</label>
                  <input style={inputStyle} type="number" value={form.ano} onChange={e => setForm(f => ({ ...f, ano: parseInt(e.target.value) || 2025 }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'franquiasSuportadas',    label: 'Franquias Suportadas' },
                  { key: 'disponibilidadeSistemas', label: 'Disponibilidade (%)' },
                  { key: 'reducaoCustosEstimada',   label: 'Redução de Custos (R$)' },
                  { key: 'crescimentoOperacao',     label: 'Crescimento Operação (%)' },
                  { key: 'scoreSeguranca',          label: 'Score Segurança (0-100)' },
                  { key: 'saudeInfraestrutura',     label: 'Saúde Infra (%)' },
                ].map(item => (
                  <div key={item.key}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {item.label}
                    </label>
                    <input style={inputStyle} type="number" value={(form as any)[item.key]}
                      onChange={e => setForm(f => ({ ...f, [item.key]: parseFloat(e.target.value) || 0 }))} />
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Meses do gráfico (vírgula)
                </label>
                <input style={inputStyle} value={form.meses} onChange={e => setForm(f => ({ ...f, meses: e.target.value }))} placeholder="Nov, Dez, Jan, Fev, Mar, Abr" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Disponibilidade por mês % (vírgula)
                </label>
                <input style={inputStyle} value={form.evolucaoDisponibilidade} onChange={e => setForm(f => ({ ...f, evolucaoDisponibilidade: e.target.value }))} placeholder="97.2, 98.1, 98.8, 99.1, 99.4, 99.7" />
              </div>

              {/* Campos automáticos */}
              {rmSnap?.configurado && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#8b5cf6', marginBottom: 8, fontWeight: 600 }}>
                    ✦ Preenchidos automaticamente pelo Redmine
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Projetos Entregues',  value: rmSnap?.kpis?.concluidas ?? 0 },
                      { label: 'Tarefas Atrasadas',   value: rmSnap?.kpis?.atrasadas  ?? 0 },
                      { label: 'Horas em Projetos',   value: `${Math.round(rmSnap?.kpis?.horas_gastas || 0)}h` },
                      { label: 'Chamados (sustent.)', value: rmSnap?.chamados_total ?? 0 },
                      { label: 'SLA Sustentação',     value: `${rmSnap?.sla_sustentacao ?? 0}%` },
                      { label: 'Franquias Ativas',    value: rmSnap?.franquias_ativas ?? 0 },
                    ].map(item => (
                      <div key={item.label} className="text-center rounded-lg p-2" style={{ background: 'var(--bg-elevated)' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: '#8b5cf6' }}>{item.value}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleSave} disabled={saving}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold"
                style={{ background: saveOk ? '#10b981' : 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', border: 'none', fontSize: '0.88rem', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}>
                {saving ? <RefreshCw size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> : saveOk ? <CheckCircle2 size={15} /> : <Save size={15} />}
                {saving ? 'Salvando…' : saveOk ? 'Salvo com sucesso!' : 'Salvar Indicadores'}
              </button>
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  )
}
