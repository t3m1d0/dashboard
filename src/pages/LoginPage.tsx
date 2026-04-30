// ============================================================
// LoginPage — Autenticação do usuário
// ============================================================
import { useState } from 'react'
import { AuthAPI, TokenStore } from '@/services/api'
import { useDashboardStore } from '@/store'
import { Eye, EyeOff, LogIn } from 'lucide-react'

interface LoginPageProps {
  onSuccess: () => void
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await AuthAPI.login(email, password)
      TokenStore.set(res.access_token)
      useDashboardStore.getState().setCurrentUser(res.usuario)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    transition: 'border-color var(--transition)',
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 70%)',
        }}
      />

      <div
        className="w-full relative animate-fade-in"
        style={{ maxWidth: 400 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '3rem',
              letterSpacing: '0.12em',
              color: 'var(--text-primary)',
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            MUNIZ
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Strategic Center
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>
            Bem-vindo de volta
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
            Acesse o painel executivo de TI
          </p>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="mb-4">
              <label
                style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)' }}
              />
            </div>

            {/* Senha */}
            <div className="mb-6">
              <label
                style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={(e) => { e.target.style.borderColor = '#8b5cf6' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-lg px-3 py-2 mb-4 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold transition-all"
              style={{
                background: loading ? 'rgba(139,92,246,0.5)' : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                color: '#fff',
                border: 'none',
                fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)',
                boxShadow: '0 2px 8px rgba(139,92,246,0.3)',
              }}
            >
              {loading ? (
                <div
                  className="rounded-full"
                  style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }}
                />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center mt-4" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {new Date().getFullYear()} · Muniz Strategic Center
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
