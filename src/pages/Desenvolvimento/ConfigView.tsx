// ============================================================
// Redmine/ConfigView.tsx — Configuração da integração + logs
// ============================================================
import { useState, useEffect } from 'react'
import { RedmineAPI } from '@/services/api'
import { Save, Trash2, RefreshCw, CheckCircle2, AlertTriangle, Settings, Clock } from 'lucide-react'

export function ConfigView() {
  const [url, setUrl]       = useState('')
  const [apiKey, setApiKey] = useState('')
  const [interval, setInterval] = useState(15)
  const [config, setConfig] = useState<any>(null)
  const [logs, setLogs]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
    loadLogs()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const data = await RedmineAPI.getConfig()
      if (data) {
        setConfig(data)
        setUrl(data.url)
        setInterval(data.sync_interval_min)
      }
    } catch (e) {}
    finally { setLoading(false) }
  }

  const loadLogs = async () => {
    try {
      const data = await RedmineAPI.getSyncLogs(10)
      setLogs(data)
    } catch {}
  }

  const handleSave = async () => {
    if (!url || !apiKey) { setError('Preencha a URL e a API Key'); return }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await RedmineAPI.saveConfig({ url, api_key: apiKey, sync_interval_min: interval })
      setSuccess('Configuração salva! Redmine conectado com sucesso.')
      setApiKey('')
      await loadConfig()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Remover integração Redmine?')) return
    setDeleting(true)
    try {
      await RedmineAPI.deleteConfig()
      setConfig(null)
      setUrl('')
      setSuccess('Integração removida')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '9px 12px', fontSize: '0.85rem', color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)', outline: 'none', transition: 'border-color 0.2s',
  }

  return (
    <div className="max-w-2xl">
      {/* Status atual */}
      {config && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl mb-5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
          <div className="flex-1">
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#10b981' }}>Integração ativa</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              {config.url} · Sync a cada {config.sync_interval_min}min
              {config.ultimo_sync && ` · Último sync: ${new Date(config.ultimo_sync).toLocaleString('pt-BR')}`}
            </div>
          </div>
          <button onClick={handleDelete} disabled={deleting}
            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* Formulário */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Settings size={16} style={{ color: '#8b5cf6' }} />
          <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
            {config ? 'Atualizar configuração' : 'Configurar Redmine'}
          </span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              URL do Redmine
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://redmine.suaempresa.com"
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#8b5cf6' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              API Key {config && <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>(deixe em branco para manter a atual)</span>}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={config ? '••••••••••••••• (não alterada)' : 'Sua API Key do Redmine'}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#8b5cf6' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 5 }}>
              Encontre em: Redmine → Minha Conta → Chave de acesso à API
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Intervalo de sincronização (minutos)
            </label>
            <select
              value={interval}
              onChange={e => setInterval(Number(e.target.value))}
              style={inputStyle}
            >
              {[5, 10, 15, 30, 60].map(v => <option key={v} value={v}>{v} minutos</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-3 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.8rem' }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 mt-3 p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.8rem' }}>
            <CheckCircle2 size={14} /> {success}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', border: 'none', fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <RefreshCw size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Save size={14} />}
          {saving ? 'Salvando…' : config ? 'Atualizar' : 'Salvar e conectar'}
        </button>
      </div>

      {/* Logs de sincronização */}
      {logs.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} style={{ color: '#8b5cf6' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Logs de Sincronização</span>
          </div>
          <div className="flex flex-col gap-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="rounded-full" style={{ width: 8, height: 8, flexShrink: 0, background: log.status === 'ok' ? '#10b981' : log.status === 'parcial' ? '#f59e0b' : '#ef4444' }} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{log.tipo} · {log.tarefas_sync} tarefas, {log.projetos_sync} projetos</div>
                  {log.erros?.length > 0 && <div style={{ fontSize: '0.65rem', color: '#f87171', marginTop: 1 }}>{log.erros[0]}</div>}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {log.duracao_ms}ms · {new Date(log.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
