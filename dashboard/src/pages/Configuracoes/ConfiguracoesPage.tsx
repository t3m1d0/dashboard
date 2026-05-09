// ============================================================
// pages/Configuracoes/ConfiguracoesPage.tsx
// Centro de Serviços Compartilhados — Gestão de Lojas/Filiais
// ============================================================
import { useEffect, useState, useCallback, useRef } from 'react'
import { LojasAPI } from '@/services/api'
import {
  Building2, Upload, Plus, Search, Edit2, Power, X,
  CheckCircle2, AlertTriangle, RefreshCw, FileSpreadsheet,
  MapPin, Hash, Globe, Phone, Mail, User, Info, Save
} from 'lucide-react'

const fmtNum = (v: number) => v.toLocaleString('pt-BR')

const INPUT: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', padding: '8px 12px', borderRadius: 8,
  fontSize: '0.82rem', fontFamily: 'var(--font-body)', outline: 'none', width: '100%',
}
const SEL: React.CSSProperties = { ...INPUT, cursor: 'pointer' }

const GRUPOS = ['MUNIZ AUTO CENTER', 'ADMINISTRATIVO', 'SUB MATRIZ', 'OUTROS']
const UFS    = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
                'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

// ── Modal Import ──────────────────────────────────────────────
function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<any>(null)
  const [error, setError]     = useState<string | null>(null)
  const [drag, setDrag]       = useState(false)
  const ref                   = useRef<HTMLInputElement>(null)

  const doImport = async () => {
    if (!file) return
    setLoading(true); setError(null)
    try { const r = await LojasAPI.importar(file); setResult(r); onSuccess() }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="relative z-10 w-full" style={{ maxWidth: 520, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(107,114,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Importar Planilha de Lojas</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>CÓDIGO · NOME · RAZAO SOCIAL · CPF/CNPJ</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={14} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {!result && (
            <label
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 20px', borderRadius: 12, border: `2px dashed ${drag ? '#6b7280' : file ? '#10b981' : 'var(--border)'}`, background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'center' }}
              onClick={() => !file && ref.current?.click()}
            >
              <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
              {file ? (
                <>
                  <CheckCircle2 size={28} style={{ color: '#10b981' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#10b981' }}>{file.name}</div>
                  <button onClick={e => { e.stopPropagation(); e.preventDefault(); setFile(null) }} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Trocar</button>
                </>
              ) : (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(107,114,128,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}><Upload size={22} /></div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Arraste ou <span style={{ color: '#9ca3af', fontWeight: 600 }}>clique para selecionar</span></div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>.xlsx · .xls · .csv</div>
                </>
              )}
            </label>
          )}
          {error && <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.82rem' }}><AlertTriangle size={15} /> {error}</div>}
          {result && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', marginBottom: 10 }}>✓ Importação concluída</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Inseridas',   value: result.inseridas,   color: '#10b981' },
                  { label: 'Atualizadas', value: result.atualizadas, color: '#3b82f6' },
                  { label: 'Total',       value: result.total_arquivo, color: '#6b7280' },
                ].map(item => (
                  <div key={item.label} className="text-center rounded-lg p-2" style={{ background: 'var(--bg-elevated)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2.5">
            {result ? (
              <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#10b981', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                ✓ Fechar
              </button>
            ) : (
              <>
                <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancelar</button>
                <button onClick={doImport} disabled={!file || loading}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, background: file && !loading ? '#6b7280' : 'var(--bg-elevated)', border: 'none', color: file && !loading ? '#fff' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: file && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {loading ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />Importando…</> : <><Upload size={14} />Importar</>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal Cadastro/Edição de Loja ─────────────────────────────
function LojaModal({ loja, onClose, onSave }: { loja?: any; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    codigo: loja?.codigo || '',
    nome: loja?.nome || '',
    razao_social: loja?.razao_social || '',
    cnpj_cpf: loja?.cnpj_cpf || '',
    uf: loja?.uf || '',
    cidade: loja?.cidade || '',
    grupo: loja?.grupo || 'MUNIZ AUTO CENTER',
    franqueado: loja?.franqueado || '',
    responsavel: loja?.responsavel || '',
    tel: loja?.tel || '',
    email: loja?.email || '',
    observacao: loja?.observacao || '',
    ativa: loja?.ativa !== false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.codigo || !form.nome) { setError('Código e Nome são obrigatórios.'); return }
    setLoading(true); setError(null)
    try {
      if (loja?.id) await LojasAPI.update(loja.id, form)
      else          await LojasAPI.create(form)
      onSave(); onClose()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const field = (label: string, key: string, icon: React.ReactNode, type = 'text') => (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
        {icon} {label}
      </label>
      <input type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)} style={INPUT} />
    </div>
  )

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="relative z-10 w-full overflow-y-auto" style={{ maxWidth: 640, maxHeight: '90vh', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>{loja?.id ? 'Editar Loja' : 'Nova Loja'}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={14} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {field('Código', 'codigo', <Hash size={11} />)}
            {field('Nome da Loja', 'nome', <Building2 size={11} />)}
            {field('Razão Social', 'razao_social', <Building2 size={11} />)}
            {field('CPF / CNPJ', 'cnpj_cpf', <Hash size={11} />)}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                <MapPin size={11} /> UF
              </label>
              <select value={form.uf} onChange={e => set('uf', e.target.value)} style={SEL}>
                <option value="">Selecione</option>
                {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            {field('Cidade', 'cidade', <MapPin size={11} />)}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                <Globe size={11} /> Grupo
              </label>
              <select value={form.grupo} onChange={e => set('grupo', e.target.value)} style={SEL}>
                {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Responsável', 'responsavel', <User size={11} />)}
            {field('Franqueado', 'franqueado', <User size={11} />)}
            {field('Telefone', 'tel', <Phone size={11} />)}
            {field('E-mail', 'email', <Mail size={11} />, 'email')}
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
              <Info size={11} /> Observação
            </label>
            <textarea value={form.observacao} onChange={e => set('observacao', e.target.value)}
              style={{ ...INPUT, minHeight: 60, resize: 'vertical' }} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ativa" checked={form.ativa} onChange={e => set('ativa', e.target.checked)} />
            <label htmlFor="ativa" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>Loja ativa</label>
          </div>
          {error && <div style={{ color: '#f87171', fontSize: '0.8rem', background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
          <div className="flex gap-2.5">
            <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancelar</button>
            <button onClick={handleSave} disabled={loading}
              style={{ flex: 1, padding: '10px', borderRadius: 10, background: !loading ? 'linear-gradient(135deg, #6b7280, #374151)' : 'var(--bg-elevated)', border: 'none', color: !loading ? '#fff' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {loading ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />Salvando…</> : <><Save size={14} />Salvar Loja</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página Principal ──────────────────────────────────────────
export function ConfiguracoesPage() {
  const [lojas, setLojas]           = useState<any[]>([])
  const [stats, setStats]           = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [importOpen, setImportOpen] = useState(false)
  const [editLoja, setEditLoja]     = useState<any>(null)
  const [newLoja, setNewLoja]       = useState(false)
  const [busca, setBusca]           = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState('')
  const [ufFiltro, setUfFiltro]     = useState('')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const PAGE_SIZE = 50

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: PAGE_SIZE }
      if (busca)       params.busca  = busca
      if (grupoFiltro) params.grupo  = grupoFiltro
      if (ufFiltro)    params.uf     = ufFiltro
      const [data, statsData] = await Promise.all([
        LojasAPI.list(params),
        LojasAPI.getStats(),
      ])
      setLojas(data.items || [])
      setTotal(data.total || 0)
      setStats(statsData)
    } catch {}
    finally { setLoading(false) }
  }, [busca, grupoFiltro, ufFiltro, page])

  useEffect(() => { load() }, [load])

  const handleDeactivate = async (id: string) => {
    if (!confirm('Desativar esta loja?')) return
    await LojasAPI.deactivate(id)
    load()
  }

  const grupos = stats?.por_grupo || []
  const ufs    = stats?.por_uf    || []

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Configurações — <span style={{ color: '#9ca3af' }}>Lojas e Filiais</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            {stats ? `${stats.total} lojas cadastradas · ${grupos.length} grupos · ${ufs.length} estados` : 'Carregando…'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <Upload size={14} /> Importar Excel
          </button>
          <button onClick={() => setNewLoja(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #6b7280, #374151)', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <Plus size={14} /> Nova Loja
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {grupos.slice(0, 4).map((g: any) => (
            <div key={g.grupo} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}
              onClick={() => setGrupoFiltro(g.grupo === grupoFiltro ? '' : g.grupo)}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.grupo}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: grupoFiltro === g.grupo ? '#9ca3af' : 'var(--text-primary)' }}>{g.n}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>lojas</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Buscar loja..." value={busca} onChange={e => { setBusca(e.target.value); setPage(1) }}
            style={{ ...INPUT, paddingLeft: 30, width: 240 }} />
        </div>
        <select value={grupoFiltro} onChange={e => { setGrupoFiltro(e.target.value); setPage(1) }} style={{ ...SEL, width: 'auto' }}>
          <option value="">Todos os grupos</option>
          {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={ufFiltro} onChange={e => { setUfFiltro(e.target.value); setPage(1) }} style={{ ...SEL, width: 'auto' }}>
          <option value="">Todos os estados</option>
          {ufs.map((u: any) => <option key={u.uf} value={u.uf}>{u.uf} ({u.n})</option>)}
        </select>
        {(busca || grupoFiltro || ufFiltro) && (
          <button onClick={() => { setBusca(''); setGrupoFiltro(''); setUfFiltro(''); setPage(1) }}
            style={{ ...SEL, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', width: 'auto' }}>
            <X size={12} style={{ display: 'inline', marginRight: 4 }} />Limpar
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', alignSelf: 'center' }}>
          {total.toLocaleString('pt-BR')} lojas
        </span>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#9ca3af', animation: 'spin 0.7s linear infinite', marginRight: 10 }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Carregando…</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Código','Nome','Razão Social','CNPJ/CPF','Grupo','UF','Ações'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lojas.map((l: any) => (
                    <tr key={l.id}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l.codigo}</td>
                      <td style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.nome}>{l.nome}</td>
                      <td style={{ padding: '8px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.razao_social}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{l.cnpj_cpf}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 99, background: 'rgba(107,114,128,0.1)', color: '#9ca3af', fontWeight: 700, whiteSpace: 'nowrap' }}>{l.grupo}</span>
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center' }}>{l.uf || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <div className="flex gap-1.5">
                          <button onClick={() => setEditLoja(l)} title="Editar"
                            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDeactivate(l.id)} title="Desativar"
                            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, cursor: 'pointer', color: '#f87171' }}>
                            <Power size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Página {page} de {Math.ceil(total/PAGE_SIZE)} · {total.toLocaleString('pt-BR')} lojas
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                  style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: page===1?'var(--text-muted)':'var(--text-primary)', cursor: page===1?'not-allowed':'pointer', fontSize: '0.78rem' }}>
                  ‹ Anterior
                </button>
                <button onClick={() => setPage(p => p+1)} disabled={page>=Math.ceil(total/PAGE_SIZE)}
                  style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: page>=Math.ceil(total/PAGE_SIZE)?'var(--text-muted)':'var(--text-primary)', cursor: page>=Math.ceil(total/PAGE_SIZE)?'not-allowed':'pointer', fontSize: '0.78rem' }}>
                  Próxima ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onSuccess={() => { load(); setImportOpen(false) }} />}
      {(editLoja || newLoja) && <LojaModal loja={editLoja} onClose={() => { setEditLoja(null); setNewLoja(false) }} onSave={load} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
