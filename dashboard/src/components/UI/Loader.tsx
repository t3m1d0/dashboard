// ============================================================
// Loader — Initial loading screen
// ============================================================
interface LoaderProps {
  isVisible: boolean
}

export function Loader({ isVisible }: LoaderProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 transition-all duration-500"
      style={{
        background: 'var(--bg)',
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {/* Logo / brand */}
      <div className="text-center">
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.8rem',
            letterSpacing: '0.12em',
            color: '#e8edf5',
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          MUNIZ
        </div>
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Strategic Center
        </div>
      </div>

      {/* Progress bar */}
      <div className="overflow-hidden rounded-full" style={{ width: 220, height: 3, background: 'var(--bg-elevated)' }}>
        <div
          className="loader-bar h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)' }}
        />
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Carregando dados…
      </div>
    </div>
  )
}
