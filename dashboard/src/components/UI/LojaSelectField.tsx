// ============================================================
// components/UI/LojaSelectField.tsx
// Campo reutilizável de seleção de loja para modais de import
// ============================================================
import { useState, useEffect, useRef } from 'react'
import { useDashboardStore } from '@/store'
import { LojasAPI } from '@/services/api'
import { Building2, Search, ChevronDown, X } from 'lucide-react'

interface Props {
  value: any | null        // loja selecionada { id, nome, codigo, cnpj_cpf, uf }
  onChange: (loja: any | null) => void
  label?: string
  required?: boolean
  placeholder?: string
}

export function LojaSelectField({
  value, onChange,
  label = 'Filial / Loja',
  required = true,
  placeholder = 'Selecione a loja...',
}: Props) {
  const { lojaAtiva, lojas: lojasStore, setLojas } = useDashboardStore()
  const [open, setOpen]   = useState(false)
  const [busca, setBusca] = useState('')
  const [lojas, setLojas2] = useState<any[]>(lojasStore)
  const ref               = useRef<HTMLDivElement>(null)

  // Pre-select lojaAtiva if available and no value set
  useEffect(() => {
    if (lojaAtiva && !value) onChange(lojaAtiva)
  }, [lojaAtiva])

  // Load lojas if not in store
  useEffect(() => {
    if (lojasStore.length > 0) {
      setLojas2(lojasStore)
    } else {
      LojasAPI.list({ page_size: 500 })
        .then((r: any) => {
          const items = r.items || []
          setLojas2(items)
          setLojas(items)
        })
        .catch(() => {})
    }
  }, [lojasStore.length])

  const filtered = lojas.filter(l =>
    !busca ||
    l.nome.toLowerCase().includes(busca.toLowerCase()) ||
    String(l.codigo).includes(busca) ||
    (l.cnpj_cpf || '').includes(busca)
  )

  const INPUT: React.CSSProperties = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', padding: '8px 12px', borderRadius: 8,
    fontSize: '0.82rem', fontFamily: 'var(--font-body)', outline: 'none', width: '100%',
  }

  return (
    <div ref={ref}>
      <label style={{
        display: 'block', fontSize: '0.72rem', fontWeight: 700,
        color: 'var(--text-secondary)', textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: 6,
      }}>
        <Building2 size={11} style={{ display: 'inline', marginRight: 5 }} />
        {label} {required && <span style={{ color: '#f87171' }}>*</span>}
      </label>

      <div style={{ position: 'relative' }}>
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{
            ...INPUT, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, cursor: 'pointer', textAlign: 'left',
            borderColor: value ? 'rgba(245,158,11,0.4)' : 'var(--border)',
            background: value ? 'rgba(245,158,11,0.04)' : 'var(--bg-elevated)',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: value ? '#f59e0b' : 'var(--text-muted)', fontWeight: value ? 600 : 400 }}>
            {value ? value.nome : placeholder}
          </span>
          <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
            {value && (
              <X size={12} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); onChange(null) }} />
            )}
            <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
          </div>
        </button>

        {/* Dropdown */}
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
            <div style={{
              position: 'absolute', top: '105%', left: 0, right: 0, zIndex: 99,
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 12, boxShadow: 'var(--shadow-lg)',
              maxHeight: 320, display: 'flex', flexDirection: 'column',
            }}>
              {/* Search */}
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    autoFocus
                    placeholder="Buscar loja..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    style={{ ...INPUT, paddingLeft: 26, fontSize: '0.78rem', padding: '6px 10px 6px 26px' }}
                  />
                </div>
              </div>

              {/* List */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Nenhuma loja encontrada
                  </div>
                ) : (
                  filtered.slice(0, 80).map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => { onChange(l); setOpen(false); setBusca('') }}
                      style={{
                        width: '100%', padding: '8px 12px', textAlign: 'left',
                        background: value?.id === l.id ? 'rgba(245,158,11,0.08)' : 'transparent',
                        border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = value?.id === l.id ? 'rgba(245,158,11,0.08)' : 'transparent' }}
                    >
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 500, color: value?.id === l.id ? '#f59e0b' : 'var(--text-primary)' }}>
                          {l.nome}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>
                          Cód: {l.codigo} · {l.cnpj_cpf || '—'}{l.uf ? ' · ' + l.uf : ''}
                        </div>
                      </div>
                      {l.uf && (
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {l.uf}
                        </span>
                      )}
                    </button>
                  ))
                )}
                {filtered.length > 80 && (
                  <div style={{ padding: '8px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {filtered.length} resultados — use a busca para refinar
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Info sobre loja selecionada */}
      {value && (
        <div style={{ marginTop: 5, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          {value.razao_social && <span>{value.razao_social} · </span>}
          {value.cnpj_cpf && <span style={{ fontFamily: 'var(--font-mono)' }}>{value.cnpj_cpf}</span>}
        </div>
      )}
    </div>
  )
}
