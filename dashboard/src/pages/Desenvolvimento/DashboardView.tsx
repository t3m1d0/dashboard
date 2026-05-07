// ============================================================
// Redmine/DashboardView.tsx — Dashboard principal do módulo Dev
// ============================================================
import { useEffect, useState } from 'react'
import { useRedmineStore } from '@/store/redmine'
import { RedmineAPI } from '@/services/api'
import { formatHoras } from '@/utils/redmine'
import { RefreshCw, AlertTriangle, Clock, CheckCircle2, TrendingUp, Users, Zap } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const PRIORIDADE_CORES: Record<string, string> = {
  'Urgente': '#ef4444', 'Alta': '#f59e0b',
  'Normal':  '#3b82f6', 'Baixa': '#6b7280', 'Imediata': '#dc2626'
}

function KPIBadge({ label, value, unit = '', color, icon, sub }: any) {
  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden transition-all duration-300"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}55`; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = '' }}
    >
      <div className="absolute top-0 left-0 right-0 rounded-t-2xl" style={{ height: 3, background: color }} />
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center justify-center rounded-xl" style={{ width: 34, height: 34, background: `${color}18`, color }}>
          {icon}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color, lineHeight: 1, marginBottom: 4 }}>
        {value}<span style={{ fontSize: '1rem', opacity: 0.7 }}>{unit}</span>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function DashboardView() {
  const { dashboard, setDashboard, isSyncing, setIsSyncing, setLastSyncResult, setDashboardCachedAt, dashboardCachedAt } = useRedmineStore()
  const [loading, setLoading] = useState(!dashboard)
  const [error, setError]     = useState<string | null>(null)

  const CACHE_TTL = 5 * 60 * 1000 // 5 min

  const loadDashboard = async (force = false) => {
    const now = Date.now()
    if (!force && dashboardCachedAt && (now - dashboardCachedAt) < CACHE_TTL && dashboard) return

    setLoading(true)
    setError(null)
    try {
      const data = await RedmineAPI.getDashboard()
      setDashboard(data)
      setDashboardCachedAt(now)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await RedmineAPI.sync('manual')
      setLastSyncResult(result)
      await loadDashboard(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => { loadDashboard() }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#8b5cf6', animation: 'spin 0.7s linear infinite' }} />
      <span style={{ marginLeft: 12, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Carregando dados…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!dashboard?.configurado) return null // handled by parent

  if (error) return (
    <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
      <AlertTriangle size={18} />
      <span style={{ fontSize: '0.85rem' }}>{error}</span>
      <button onClick={() => loadDashboard(true)} style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#f87171', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
        Tentar novamente
      </button>
    </div>
  )

  const kpis = dashboard.kpis
  // Mostra dias que têm dados reais (abertas não nulo)
  const burndown = dashboard.burndown.filter(d => d.abertas !== null && d.abertas !== undefined)
  // Se não há burndown histórico, mostra mensagem adequada
  const hasBurndown = burndown.length > 0

  return (
    <div>
      {/* Header actions */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {dashboard.ultimo_sync
              ? `Último sync: ${new Date(dashboard.ultimo_sync).toLocaleString('pt-BR')}`
              : 'Nunca sincronizado'}
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all"
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600,
            cursor: isSyncing ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          <RefreshCw size={14} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
          {isSyncing ? 'Sincronizando…' : 'Sincronizar'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPIBadge label="Abertas"      value={kpis.abertas}      color="#6b7280" icon={<Clock size={16}/>} />
        <KPIBadge label="Em Andamento" value={kpis.em_andamento} color="#3b82f6" icon={<TrendingUp size={16}/>} />
        <KPIBadge label="Concluídas"   value={kpis.concluidas}   color="#10b981" icon={<CheckCircle2 size={16}/>} />
        <KPIBadge label="Atrasadas"    value={kpis.atrasadas}    color="#ef4444" icon={<AlertTriangle size={16}/>} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <KPIBadge label="Horas Gastas"    value={kpis.horas_gastas.toFixed(1)} unit="h" color="#8b5cf6" icon={<Zap size={16}/>} sub={`Estimado: ${kpis.horas_estimadas.toFixed(1)}h`} />
        <KPIBadge label="Tempo Médio Resolução" value={kpis.tempo_medio_resolucao ? kpis.tempo_medio_resolucao.toFixed(1) : '—'} unit={kpis.tempo_medio_resolucao ? 'h' : ''} color="#f59e0b" icon={<Clock size={16}/>} />
        <KPIBadge label="Membros na Equipe" value={dashboard.equipe.length} color="#06b6d4" icon={<Users size={16}/>} />
      </div>

      {/* Burndown + Por status */}
      <div className="grid grid-cols-12 gap-3.5 mb-5">
        <div className="col-span-12 lg:col-span-8 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Burndown — 14 dias</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Evolução de tarefas abertas vs. concluídas</div>
          {burndown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={burndown} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gAberto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gConcluido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="abertas"    stroke="#3b82f6" strokeWidth={2} fill="url(#gAberto)"    name="Abertas" connectNulls />
                <Area type="monotone" dataKey="concluidas" stroke="#10b981" strokeWidth={2} fill="url(#gConcluido)" name="Concluídas" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>
              <div>Sincronize periodicamente para acumular histórico</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                O burndown aparece após múltiplos syncs ou quando as tarefas têm datas de criação/conclusão
              </div>
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-4 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 3 }}>Por Prioridade</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Distribuição atual</div>
          {dashboard.por_prioridade.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={dashboard.por_prioridade} dataKey="total" nameKey="prioridade" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {dashboard.por_prioridade.map((entry, i) => (
                    <Cell key={i} fill={PRIORIDADE_CORES[entry.prioridade] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v: any, n: any) => [v, n]} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sem dados</div>
          )}
        </div>
      </div>

      {/* Tarefas Atrasadas */}
      {dashboard.atrasadas.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tarefas Atrasadas</span>
            <span className="rounded-full px-2 py-0.5" style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {dashboard.atrasadas.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {dashboard.atrasadas.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.assunto}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{t.responsavel || '—'} · Prazo: {t.data_prazo}</div>
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(239,68,68,0.2)', whiteSpace: 'nowrap' }}>
                  {t.prioridade}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
