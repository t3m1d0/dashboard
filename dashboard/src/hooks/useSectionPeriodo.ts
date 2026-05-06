// ============================================================
// useSectionPeriodo — Filtro de período por seção
// ============================================================
import { useDashboardStore } from '@/store'
import type { TechSubSection, PeriodoFiltro } from '@/types'

const MESES_FULL = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
]
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export function useSectionPeriodo(secao: TechSubSection) {
  const { periodos, setPeriodoSecao } = useDashboardStore()
  const periodo = periodos[secao]

  const setMes  = (mes: number)    => setPeriodoSecao(secao, { ...periodo, mes, modo: mes === 0 ? 'todos' : 'mes' })
  const setAno  = (ano: number)    => setPeriodoSecao(secao, { ...periodo, ano })
  const setRange = (di: string, df: string) =>
    setPeriodoSecao(secao, { ...periodo, dataInicio: di, dataFim: df, modo: 'range' })
  const setModo = (modo: PeriodoFiltro['modo']) =>
    setPeriodoSecao(secao, { ...periodo, modo, mes: modo === 'todos' ? 0 : periodo.mes || (new Date().getMonth() + 1) })
  const limpar  = () =>
    setPeriodoSecao(secao, { mes: 0, ano: new Date().getFullYear(), modo: 'todos' })

  // Label legível
  const label = (() => {
    if (periodo.modo === 'todos') return `${periodo.ano} — Todos`
    if (periodo.modo === 'range' && periodo.dataInicio && periodo.dataFim) {
      const di = new Date(periodo.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      const df = new Date(periodo.dataFim   + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
      return `${di} → ${df}`
    }
    if (periodo.mes > 0) return `${MESES_SHORT[periodo.mes - 1]}/${periodo.ano}`
    return `${periodo.ano}`
  })()

  // Filtra array de items por campo de data string (YYYY-MM-DD ou ISO)
  const filtrarItems = <T extends Record<string, any>>(
    items: T[],
    campoData: keyof T
  ): T[] => {
    if (periodo.modo === 'todos') return items

    if (periodo.modo === 'range' && periodo.dataInicio && periodo.dataFim) {
      const di = new Date(periodo.dataInicio + 'T00:00:00').getTime()
      const df = new Date(periodo.dataFim    + 'T23:59:59').getTime()
      return items.filter(item => {
        const d = item[campoData]
        if (!d) return false
        const t = new Date(d).getTime()
        return t >= di && t <= df
      })
    }

    // modo 'mes'
    return items.filter(item => {
      const d = item[campoData] as string
      if (!d) return false
      const dt = new Date(d)
      const ok_ano = dt.getFullYear() === periodo.ano
      if (periodo.mes === 0) return ok_ano
      return ok_ano && (dt.getMonth() + 1) === periodo.mes
    })
  }

  // Query params para enviar à API
  const toQueryParams = (): Record<string, string> => {
    if (periodo.modo === 'todos') return { ano: String(periodo.ano) }
    if (periodo.modo === 'range' && periodo.dataInicio && periodo.dataFim) {
      return { data_inicio: periodo.dataInicio, data_fim: periodo.dataFim }
    }
    const params: Record<string, string> = { ano: String(periodo.ano) }
    if (periodo.mes > 0) params.mes = String(periodo.mes)
    return params
  }

  return {
    periodo, label,
    setMes, setAno, setRange, setModo, limpar,
    filtrarItems, toQueryParams,
    MESES_FULL, MESES_SHORT,
  }
}
