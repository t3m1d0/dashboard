// ============================================================
// usePeriodo — Hook para filtro de período global
// ============================================================
import { useDashboardStore } from '@/store'

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
]

export function usePeriodo() {
  const { periodo, setPeriodo } = useDashboardStore()

  const label = periodo.mes === 0
    ? `${periodo.ano} — Todos os meses`
    : `${MESES[periodo.mes - 1]} de ${periodo.ano}`

  const periodoParam = periodo.mes === 0
    ? { ano: periodo.ano }
    : { mes: periodo.mes, ano: periodo.ano }

  // Filtra array de itens por campo de data (YYYY-MM-DD ou ISO)
  const filtrarPorData = <T extends Record<string, any>>(
    items: T[],
    campoData: keyof T
  ): T[] => {
    if (periodo.mes === 0) {
      return items.filter(item => {
        const d = item[campoData] as string
        if (!d) return true
        return new Date(d).getFullYear() === periodo.ano
      })
    }
    return items.filter(item => {
      const d = item[campoData] as string
      if (!d) return true
      const dt = new Date(d)
      return dt.getFullYear() === periodo.ano && dt.getMonth() + 1 === periodo.mes
    })
  }

  return { periodo, setPeriodo, label, periodoParam, filtrarPorData }
}
