// ============================================================
// src/store/redmine.ts — Estado do módulo Redmine
// ============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RedmineDashboard, RedmineProjeto, RedmineTarefa, RedmineFiltros, DevSubSection } from '@/types'

interface RedmineFiltrosAtivos {
  projeto_id?: string; status?: string; prioridade?: string
  responsavel?: string; versao?: string; atrasadas?: boolean; busca?: string
}

interface RedmineStore {
  subSection: DevSubSection
  setSubSection: (s: DevSubSection) => void
  dashboard: RedmineDashboard | null
  setDashboard: (d: RedmineDashboard) => void
  projetos: RedmineProjeto[]
  setProjetos: (p: RedmineProjeto[]) => void
  filtros: RedmineFiltros
  setFiltros: (f: RedmineFiltros) => void
  filtrosAtivos: RedmineFiltrosAtivos
  setFiltrosAtivos: (f: Partial<RedmineFiltrosAtivos>) => void
  clearFiltros: () => void
  tarefaSelecionada: RedmineTarefa | null
  setTarefaSelecionada: (t: RedmineTarefa | null) => void
  isSyncing: boolean
  setIsSyncing: (v: boolean) => void
  lastSyncResult: { status: string; tarefas_sync: number; erros: string[] } | null
  setLastSyncResult: (r: any) => void
  viewMode: 'kanban' | 'lista'
  setViewMode: (m: 'kanban' | 'lista') => void
  dashboardCachedAt: number | null
  setDashboardCachedAt: (t: number) => void
}

export const useRedmineStore = create<RedmineStore>()(
  persist(
    (set) => ({
      subSection: 'dashboard',
      setSubSection: (subSection: DevSubSection) => set({ subSection }),
      dashboard: null,
      setDashboard: (dashboard: RedmineDashboard) => set({ dashboard }),
      projetos: [],
      setProjetos: (projetos: RedmineProjeto[]) => set({ projetos }),
      filtros: { status: [], prioridades: [], responsaveis: [], versoes: [], trackers: [] },
      setFiltros: (filtros: RedmineFiltros) => set({ filtros }),
      filtrosAtivos: {},
      setFiltrosAtivos: (f: Partial<RedmineFiltrosAtivos>) =>
        set((state: RedmineStore) => ({ filtrosAtivos: { ...state.filtrosAtivos, ...f } })),
      clearFiltros: () => set({ filtrosAtivos: {} }),
      tarefaSelecionada: null,
      setTarefaSelecionada: (tarefaSelecionada: RedmineTarefa | null) => set({ tarefaSelecionada }),
      isSyncing: false,
      setIsSyncing: (isSyncing: boolean) => set({ isSyncing }),
      lastSyncResult: null,
      setLastSyncResult: (lastSyncResult: any) => set({ lastSyncResult }),
      viewMode: 'kanban',
      setViewMode: (viewMode: 'kanban' | 'lista') => set({ viewMode }),
      dashboardCachedAt: null,
      setDashboardCachedAt: (dashboardCachedAt: number) => set({ dashboardCachedAt }),
    }),
    {
      name: 'muniz-redmine-store',
      partialize: (state: RedmineStore) => ({
        subSection: state.subSection,
        viewMode: state.viewMode,
        filtrosAtivos: state.filtrosAtivos,
      }),
    }
  )
)
