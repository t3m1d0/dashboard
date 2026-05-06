// ============================================================
// PeriodoSelector — Seletor de período por seção
// Aparece no header de cada página, independente por seção
// ============================================================
import { useState } from 'react'
import { Calendar, ChevronDown, X, RotateCcw } from 'lucide-react'
import type { TechSubSection } from '@/types'
import { useSectionPeriodo } from '@/hooks/useSectionPeriodo'

interface PeriodoSelectorProps {
  secao: TechSubSection
}

const ANOS = [2023, 2024, 2025, 2026, 2027]

export function PeriodoSelector({ secao }: PeriodoSelectorProps) {
  const { periodo, label, setMes, setAno, setRange, setModo, limpar, MESES_FULL } = useSectionPeriodo(secao)
  const [open, setOpen]         = useState(false)
  const [rangeInicio, setRI]    = useState(periodo.dataInicio || '')
  const [rangeFim, setRF]       = useState(periodo.dataFim    || '')

  const hasFiltro = periodo.modo !== 'todos'

  const applyRange = () => {
    if (rangeInicio && rangeFim) {
      setRange(rangeInicio, rangeFim)
      setOpen(false)
    }
  }

  const selectMes = (mes: number) => {
    setMes(mes)
    setOpen(false)
  }

  const selectModo = (modo: 'mes' | 'range' | 'todos') => {
    setModo(modo)
    if (modo !== 'range') setOpen(false)
  }

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
    fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)',
    border: '1px solid var(--border)', transition: 'all 0.2s',
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          ...btnBase,
          background: hasFiltro ? 'rgba(139,92,246,0.1)' : 'var(--bg-elevated)',
          borderColor: hasFiltro ? 'rgba(139,92,246,0.35)' : 'var(--border)',
          color: hasFiltro ? '#8b5cf6' : 'var(--text-secondary)',
        }}
      >
        <Calendar size={13} />
        <span>{label}</span>
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
        {hasFiltro && (
          <span
            onClick={(e) => { e.stopPropagation(); limpar(); setOpen(false) }}
            style={{ marginLeft: 2, color: '#8b5cf6', display: 'flex', alignItems: 'center' }}
            title="Limpar filtro"
          >
            <X size={11} />
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              width: 300,
              animation: 'fadeIn 0.15s ease',
            }}
          >
            {/* Modo tabs */}
            <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
              {([
                { id: 'mes',   label: 'Por Mês' },
                { id: 'range', label: 'Intervalo' },
                { id: 'todos', label: 'Todos' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => selectModo(tab.id)}
                  style={{
                    flex: 1, padding: '9px 0', fontSize: '0.75rem', fontWeight: 600,
                    background: periodo.modo === tab.id ? 'rgba(139,92,246,0.1)' : 'transparent',
                    color: periodo.modo === tab.id ? '#8b5cf6' : 'var(--text-secondary)',
                    border: 'none', borderBottom: `2px solid ${periodo.modo === tab.id ? '#8b5cf6' : 'transparent'}`,
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-3">
              {/* Ano selector — sempre visível */}
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Ano:</span>
                <div className="flex gap-1 flex-wrap">
                  {ANOS.map(a => (
                    <button
                      key={a}
                      onClick={() => setAno(a)}
                      style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                        background: periodo.ano === a ? '#8b5cf6' : 'var(--bg-card)',
                        color: periodo.ano === a ? '#fff' : 'var(--text-secondary)',
                        border: `1px solid ${periodo.ano === a ? '#8b5cf6' : 'var(--border)'}`,
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modo: mês */}
              {periodo.modo === 'mes' && (
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Selecione o mês
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => selectMes(0)}
                      style={{
                        gridColumn: '1 / -1', padding: '5px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                        background: periodo.mes === 0 ? '#8b5cf6' : 'var(--bg-card)',
                        color: periodo.mes === 0 ? '#fff' : 'var(--text-secondary)',
                        border: `1px solid ${periodo.mes === 0 ? '#8b5cf6' : 'var(--border)'}`,
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                      }}
                    >
                      Todos os meses
                    </button>
                    {MESES_FULL.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => selectMes(i + 1)}
                        style={{
                          padding: '5px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                          background: periodo.mes === i + 1 ? '#8b5cf6' : 'var(--bg-card)',
                          color: periodo.mes === i + 1 ? '#fff' : 'var(--text-secondary)',
                          border: `1px solid ${periodo.mes === i + 1 ? '#8b5cf6' : 'var(--border)'}`,
                          cursor: 'pointer', fontFamily: 'var(--font-body)',
                        }}
                      >
                        {m.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modo: range */}
              {periodo.modo === 'range' && (
                <div className="flex flex-col gap-2.5">
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Intervalo de datas
                  </div>
                  <div className="flex flex-col gap-2">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>Data início</label>
                      <input
                        type="date"
                        value={rangeInicio}
                        onChange={e => setRI(e.target.value)}
                        style={{
                          width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
                          borderRadius: 6, padding: '6px 10px', fontSize: '0.82rem',
                          color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>Data fim</label>
                      <input
                        type="date"
                        value={rangeFim}
                        onChange={e => setRF(e.target.value)}
                        style={{
                          width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
                          borderRadius: 6, padding: '6px 10px', fontSize: '0.82rem',
                          color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none',
                        }}
                      />
                    </div>
                    <button
                      onClick={applyRange}
                      disabled={!rangeInicio || !rangeFim}
                      style={{
                        padding: '8px', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem',
                        background: rangeInicio && rangeFim ? '#8b5cf6' : 'var(--bg-elevated)',
                        color: rangeInicio && rangeFim ? '#fff' : 'var(--text-muted)',
                        border: 'none', cursor: rangeInicio && rangeFim ? 'pointer' : 'not-allowed',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      Aplicar Intervalo
                    </button>
                  </div>
                </div>
              )}

              {/* Modo: todos */}
              {periodo.modo === 'todos' && (
                <div className="text-center py-3">
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Exibindo todos os dados de {periodo.ano}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Selecione "Por Mês" ou "Intervalo" para filtrar
                  </div>
                </div>
              )}
            </div>

            {/* Footer com limpar */}
            {(periodo.modo !== 'todos') && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '8px 12px' }}>
                <button
                  onClick={() => { limpar(); setOpen(false) }}
                  className="flex items-center gap-1.5 w-full justify-center"
                  style={{ padding: '6px', borderRadius: 6, fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  <RotateCcw size={11} /> Limpar filtro
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
