// ============================================================
// Redmine — constants, helpers, color maps
// ============================================================

export const PRIORIDADE_CORES: Record<string, string> = {
  'Urgente':  '#ef4444',
  'Alta':     '#f59e0b',
  'Normal':   '#3b82f6',
  'Baixa':    '#6b7280',
  'Imediata': '#dc2626',
}

export const STATUS_CORES: Record<string, string> = {
  'Novo':           '#6b7280',
  'Nova':           '#6b7280',
  'Em andamento':   '#3b82f6',
  'In Progress':    '#3b82f6',
  'Resolvido':      '#10b981',
  'Resolvida':      '#10b981',
  'Fechado':        '#8b5cf6',
  'Fechada':        '#8b5cf6',
  'Rejeitado':      '#ef4444',
  'Em revisão':     '#f59e0b',
  'Aguardando':     '#f97316',
}

export const TRACKER_CORES: Record<string, string> = {
  'Bug':       '#ef4444',
  'Feature':   '#8b5cf6',
  'Task':      '#3b82f6',
  'Suporte':   '#06b6d4',
  'Melhoria':  '#10b981',
}

export function getPrioridadeCor(prioridade: string): string {
  return PRIORIDADE_CORES[prioridade] || '#6b7280'
}

export function getStatusCor(status: string): string {
  return STATUS_CORES[status] || '#6b7280'
}

export function getTrackerCor(tracker?: string): string {
  if (!tracker) return '#6b7280'
  return TRACKER_CORES[tracker] || '#8b5cf6'
}

export function formatHoras(horas?: number | null): string {
  if (!horas) return '—'
  if (horas < 1) return `${Math.round(horas * 60)}min`
  return `${horas.toFixed(1)}h`
}

export function calcularSLA(data_prazo?: string | null, fechado = false): {
  label: string; cor: string; urgente: boolean
} {
  if (!data_prazo || fechado) return { label: '—', cor: 'var(--text-muted)', urgente: false }
  const hoje  = new Date()
  const prazo = new Date(data_prazo)
  const diff  = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0)   return { label: `${Math.abs(diff)}d atrasado`, cor: '#ef4444', urgente: true }
  if (diff === 0) return { label: 'Vence hoje', cor: '#f59e0b', urgente: true }
  if (diff <= 3)  return { label: `${diff}d restantes`, cor: '#f59e0b', urgente: false }
  return { label: `${diff}d restantes`, cor: '#10b981', urgente: false }
}

export function isStatusConcluido(status: string): boolean {
  return ['Fechado', 'Fechada', 'Resolvido', 'Resolvida', 'Rejected'].includes(status)
}

// Agrupa tarefas por responsável para gráfico de produtividade
export function agruparPorResponsavel(tarefas: any[]): Record<string, number> {
  return tarefas.reduce((acc, t) => {
    const key = t.responsavel || 'Sem responsável'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}
