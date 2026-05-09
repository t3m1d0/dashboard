import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DashboardData, Section, TechSubSection, PeriodoFiltro, PeriodosPorSecao } from '@/types'
import defaultData from '@/data/default.json'

interface CurrentUser { id: string; nome: string; email: string; role: string; empresa_id?: string }

const anoAtual  = new Date().getFullYear()
const mesAtual  = new Date().getMonth() + 1

const PERIODO_PADRAO: PeriodoFiltro = { mes: mesAtual, ano: anoAtual, modo: 'mes' }

const PERIODOS_INICIAIS: PeriodosPorSecao = {
  overview:        { ...PERIODO_PADRAO },
  sustentacao:     { ...PERIODO_PADRAO },
  desenvolvimento: { mes: 0, ano: anoAtual, modo: 'todos' },
  entregas:        { ...PERIODO_PADRAO },
  estrategica:     { ...PERIODO_PADRAO },
  roadmap:         { mes: 0, ano: anoAtual, modo: 'todos' },
}

interface DashboardStore {
  data: DashboardData
  setData: (data: Partial<DashboardData>) => void
  resetData: () => void
  currentUser: CurrentUser | null
  setCurrentUser: (user: CurrentUser | null) => void
  activeSection: Section
  setActiveSection: (section: Section) => void
  techSubSection: TechSubSection
  setTechSubSection: (sub: TechSubSection) => void
  techExpanded: boolean
  setTechExpanded: (v: boolean) => void
  comprasSubSection: string
  setComprasSubSection: (sub: string) => void
  financeiroSubSection: string
  setFinanceiroSubSection: (sub: string) => void
  genteSubSection: string
  setGenteSubSection: (sub: string) => void
  conferenciaSubSection: string
  setConferenciaSubSection: (sub: string) => void
  lojaAtiva: any | null        // loja selecionada globalmente
  setLojaAtiva: (loja: any | null) => void
  lojas: any[]                 // cache de lojas
  setLojas: (lojas: any[]) => void
  periodos: PeriodosPorSecao
  setPeriodoSecao: (secao: TechSubSection, p: PeriodoFiltro) => void
  isDark: boolean
  toggleTheme: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  isLoading: boolean
  setLoading: (loading: boolean) => void
  uploadedSources: Record<string, { fileName: string; uploadedAt: string; rows: number }>
  addUploadedSource: (key: string, info: { fileName: string; uploadedAt: string; rows: number }) => void
  removeUploadedSource: (key: string) => void
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      data: defaultData as DashboardData,
      setData: (partial) => set((state) => ({ data: { ...state.data, ...partial } })),
      resetData: () => set({ data: defaultData as DashboardData }),
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      activeSection: 'tecnologia',
      setActiveSection: (section) => set({ activeSection: section }),
      techSubSection: 'overview',
      setTechSubSection: (techSubSection) => set({ techSubSection }),
      techExpanded: true,
      setTechExpanded: (techExpanded) => set({ techExpanded }),
      comprasSubSection: 'movimentacao',
      setComprasSubSection: (comprasSubSection) => set({ comprasSubSection }),
      financeiroSubSection: 'overview',
      setFinanceiroSubSection: (financeiroSubSection) => set({ financeiroSubSection }),
      genteSubSection: 'overview',
      setGenteSubSection: (genteSubSection) => set({ genteSubSection }),
      conferenciaSubSection: 'overview',
      setConferenciaSubSection: (conferenciaSubSection) => set({ conferenciaSubSection }),
      lojaAtiva: null,
      setLojaAtiva: (lojaAtiva) => set({ lojaAtiva }),
      lojas: [],
      setLojas: (lojas) => set({ lojas }),
      periodos: PERIODOS_INICIAIS,
      setPeriodoSecao: (secao, p) =>
        set((state) => ({ periodos: { ...state.periodos, [secao]: p } })),
      isDark: true,
      toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      isLoading: true,
      setLoading: (loading) => set({ isLoading: loading }),
      uploadedSources: {},
      addUploadedSource: (key, info) =>
        set((state) => ({ uploadedSources: { ...state.uploadedSources, [key]: info } })),
      removeUploadedSource: (key) =>
        set((state) => { const next = { ...state.uploadedSources }; delete next[key]; return { uploadedSources: next } }),
    }),
    {
      name: 'muniz-dashboard-store-v2',
      partialize: (state) => ({
        isDark: state.isDark,
        uploadedSources: state.uploadedSources,
        techSubSection: state.techSubSection,
        techExpanded: state.techExpanded,
        periodos: state.periodos,
      }),
    }
  )
)
