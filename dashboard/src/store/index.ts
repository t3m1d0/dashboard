// ============================================================
// Store — Global State (Zustand)
// ============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DashboardData, Section, TechSubSection, PeriodoFiltro } from '@/types'
import defaultData from '@/data/default.json'

interface CurrentUser { id: string; nome: string; email: string; role: string; empresa_id?: string }

interface DashboardStore {
  // Data
  data: DashboardData
  setData: (data: Partial<DashboardData>) => void
  resetData: () => void

  // Auth
  currentUser: CurrentUser | null
  setCurrentUser: (user: CurrentUser | null) => void

  // Navigation
  activeSection: Section
  setActiveSection: (section: Section) => void
  techSubSection: TechSubSection
  setTechSubSection: (sub: TechSubSection) => void
  techExpanded: boolean
  setTechExpanded: (v: boolean) => void

  // Período global
  periodo: PeriodoFiltro
  setPeriodo: (p: PeriodoFiltro) => void

  // UI
  isDark: boolean
  toggleTheme: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  isLoading: boolean
  setLoading: (loading: boolean) => void

  // Uploads
  uploadedSources: Record<string, { fileName: string; uploadedAt: string; rows: number }>
  addUploadedSource: (key: string, info: { fileName: string; uploadedAt: string; rows: number }) => void
  removeUploadedSource: (key: string) => void
}

const now = new Date()

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

      periodo: { mes: now.getMonth() + 1, ano: now.getFullYear() },
      setPeriodo: (periodo) => set({ periodo }),

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
      name: 'muniz-dashboard-store',
      partialize: (state) => ({
        isDark:          state.isDark,
        uploadedSources: state.uploadedSources,
        techSubSection:  state.techSubSection,
        techExpanded:    state.techExpanded,
        periodo:         state.periodo,
      }),
    }
  )
)
