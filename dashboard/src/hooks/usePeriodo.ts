import { useDashboardStore } from '@/store'
export function usePeriodo() {
  const { techSubSection, periodos, setPeriodoSecao } = useDashboardStore()
  const periodo = periodos[techSubSection as keyof typeof periodos] || { tipo: 'mes', label: 'Este mês' }
  const setPeriodo = (p: any) => setPeriodoSecao(techSubSection as any, p)
  return { periodo, setPeriodo }
}
