// ============================================================
// KPICard — Reusable KPI metric card
// ============================================================
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { calcDelta, formatNumber, getDeltaType } from '@/utils'

interface KPICardProps {
  label: string
  value: number | string
  unit?: string
  previous?: number
  meta?: number
  accentColor?: string
  icon?: React.ReactNode
  invertDelta?: boolean
  decimals?: number
  animationDelay?: number
}

export function KPICard({
  label,
  value,
  unit,
  previous,
  meta,
  accentColor = '#8b5cf6',
  icon,
  invertDelta = false,
  decimals = 0,
  animationDelay = 0,
}: KPICardProps) {
  const numValue = typeof value === 'number' ? value : parseFloat(String(value))
  const delta = previous !== undefined ? calcDelta(numValue, previous) : null
  const deltaType = delta !== null ? getDeltaType(delta, invertDelta) : null

  const metaPct = meta !== undefined && meta > 0 ? (numValue / meta) * 100 : null

  const deltaColors = {
    up:      { bg: 'rgba(16,185,129,0.1)',  text: '#10b981' },
    down:    { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444' },
    neutral: { bg: 'rgba(245,158,11,0.1)',  text: '#f59e0b' },
  }

  const dc = deltaType ? deltaColors[deltaType] : null

  return (
    <div
      className="relative overflow-hidden rounded-2xl transition-all duration-300 cursor-default animate-slide-in"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        padding: '18px 20px',
        animationDelay: `${animationDelay}ms`,
        // @ts-ignore
        '--ca': accentColor,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-card-hover)'
        e.currentTarget.style.borderColor = `${accentColor}55`
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-card)'
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 rounded-t-2xl"
        style={{ height: 3, background: accentColor, opacity: 0.8 }}
      />

      {/* Icon */}
      {icon && (
        <div
          className="flex items-center justify-center rounded-xl mb-3.5"
          style={{
            width: 36,
            height: 36,
            background: `${accentColor}18`,
            color: accentColor,
          }}
        >
          {icon}
        </div>
      )}

      {/* Label */}
      <div
        style={{
          fontSize: '0.7rem',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      {/* Value */}
      <div
        className="flex items-baseline gap-1 mb-2.5"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
      >
        <span style={{ fontSize: '1.9rem', fontWeight: 600, lineHeight: 1 }}>
          {typeof value === 'string' ? value : formatNumber(numValue, decimals)}
        </span>
        {unit && (
          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
            {unit}
          </span>
        )}
      </div>

      {/* Delta badge */}
      {delta !== null && dc && (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{ fontSize: '0.72rem', fontWeight: 600, background: dc.bg, color: dc.text }}
        >
          {deltaType === 'up' ? (
            <TrendingUp size={11} />
          ) : deltaType === 'down' ? (
            <TrendingDown size={11} />
          ) : (
            <Minus size={11} />
          )}
          {Math.abs(delta).toFixed(1)}%
        </span>
      )}

      {/* Meta progress */}
      {metaPct !== null && (
        <div className="mt-2.5">
          <div className="flex justify-between mb-1">
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Meta: {formatNumber(meta!, decimals)}{unit}
            </span>
            <span style={{ fontSize: '0.65rem', color: accentColor, fontWeight: 600 }}>
              {metaPct.toFixed(0)}%
            </span>
          </div>
          <div
            className="rounded-full overflow-hidden"
            style={{ height: 3, background: 'var(--bg-elevated)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(metaPct, 100)}%`,
                background: metaPct >= 100 ? '#10b981' : accentColor,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
