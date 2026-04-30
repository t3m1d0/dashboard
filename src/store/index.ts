// ============================================================
// Store — Global State (Zustand)
// ============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DashboardData, Section } from '@/types'
import defaultData from '@/data/default.json'

interface DashboardStore {
  // Data
  data: DashboardData
  setData: (data: Partial<DashboardData>) => void
  resetData: () => void

  // UI State
  activeSection: Section
  setActiveSection: (section: Section) => void

  isDark: boolean
  toggleTheme: () => void

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  isLoading: boolean
  setLoading: (loading: boolean) => void

  // Uploads tracking
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

      activeSection: 'overview',
      setActiveSection: (section) => set({ activeSection: section }),

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
        set((state) => {
          const next = { ...state.uploadedSources }
          delete next[key]
          return { uploadedSources: next }
        }),
    }),
    {
      name: 'muniz-dashboard-store',
      partialize: (state) => ({
        isDark: state.isDark,
        uploadedSources: state.uploadedSources,
        data: state.data,
      }),
    }
  )
)
