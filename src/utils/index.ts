// ============================================================
// Utilities — formatters, helpers, constants
// ============================================================

/** Format number with BR locale */
export function formatNumber(val: number, decimals = 0): string {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** Format currency BRL */
export function formatCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

/** Calculate delta between current and previous value */
export function calcDelta(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

/** Determine if delta is positive (considering context — lower is sometimes better) */
export function getDeltaType(delta: number, invertPositive = false): 'up' | 'down' | 'neutral' {
  if (Math.abs(delta) < 0.5) return 'neutral'
  if (invertPositive) return delta < 0 ? 'up' : 'down'
  return delta > 0 ? 'up' : 'down'
}

/** Format date to pt-BR */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Get initials from name */
export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

/** Map priority to color */
export const PRIORITY_COLORS: Record<string, string> = {
  'Crítica': '#ef4444',
  'Alta':    '#f59e0b',
  'Média':   '#3b82f6',
  'Baixa':   '#6b7280',
}

/** Map status to config */
export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  backlog:       { label: 'Backlog',       color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  desenvolvimento: { label: 'Em Desenvolvimento', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  homologacao:   { label: 'Homologação',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  validacao:     { label: 'Validação',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  producao:      { label: 'Em Produção',   color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

/** Section navigation config */
export const SECTIONS = [
  { id: 'overview',      label: 'Visão Geral',      icon: 'layout-dashboard' },
  { id: 'sustentacao',   label: 'Sustentação',       icon: 'headphones' },
  { id: 'desenvolvimento', label: 'Desenvolvimento', icon: 'code-2' },
  { id: 'entregas',      label: 'Entregas',          icon: 'package-check' },
  { id: 'estrategica',   label: 'Visão Estratégica', icon: 'trending-up' },
  { id: 'roadmap',       label: 'Roadmap',           icon: 'map' },
] as const

/** Chart default colors */
export const CHART_COLORS = {
  purple:  '#8b5cf6',
  blue:    '#3b82f6',
  emerald: '#10b981',
  amber:   '#f59e0b',
  red:     '#ef4444',
  pink:    '#ec4899',
  cyan:    '#06b6d4',
}

/** Truncate text */
export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}
