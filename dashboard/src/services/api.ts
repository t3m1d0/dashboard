// ============================================================
// src/services/api.ts — Cliente HTTP para o backend FastAPI
// ============================================================
import type { DashboardData } from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// ── Token management ─────────────────────────────────────────
export const TokenStore = {
  get: () => localStorage.getItem('access_token'),
  set: (t: string) => localStorage.setItem('access_token', t),
  clear: () => localStorage.removeItem('access_token'),
}

// ── HTTP client ───────────────────────────────────────────────
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = TokenStore.get()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    TokenStore.clear()
    // Dispara evento para o App.tsx tratar o logout sem redirecionar
    window.dispatchEvent(new CustomEvent('auth:expired'))
    throw new Error('Sessão expirada')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Erro ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Auth ─────────────────────────────────────────────────────
export const AuthAPI = {
  login: (email: string, password: string) =>
    request<{ access_token: string; usuario: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<any>('/auth/me'),
}

// ── Dashboard ─────────────────────────────────────────────────
export const DashboardAPI = {
  getOverview: (params?: Record<string, string | number>) => {
    const q = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params as any).toString()
      : ''
    return request<DashboardData>(`/dashboard/overview${q}`)
  },
}

// ── Chamados ─────────────────────────────────────────────────
export const ChamadosAPI = {
  list: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return request<{ total: number; items: any[] }>(`/chamados${q}`)
  },
  create: (data: any) =>
    request('/chamados', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/chamados/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  stats: () => request<any>('/chamados/stats'),
}

// ── Projetos ─────────────────────────────────────────────────
export const ProjetosAPI = {
  list: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ total: number; items: any[] }>(`/projetos${q}`)
  },
  kanban: () => request<Record<string, any[]>>('/projetos/kanban'),
  create: (data: any) =>
    request('/projetos', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/projetos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/projetos/${id}`, { method: 'DELETE' }),
}

// ── KPIs ─────────────────────────────────────────────────────
export const KPIsAPI = {
  latest:    () => request<any>('/kpis/latest'),
  historico: () => request<any[]>('/kpis/historico'),
  upsert:    (data: any) => request('/kpis', { method: 'POST', body: JSON.stringify(data) }),
}

// ── Uploads ──────────────────────────────────────────────────
export const UploadsAPI = {
  upload: (file: File, tipo: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('tipo', tipo)
    const token = TokenStore.get()
    return fetch(`${BASE_URL}/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then((r) => r.json())
  },
  list: () => request<any[]>('/uploads'),
}

// ── Redmine ───────────────────────────────────────────────────
export const RedmineAPI = {
  getConfig: () => request<any>('/redmine/config'),

  saveConfig: (data: { url: string; api_key: string; sync_interval_min: number }) =>
    request('/redmine/config', { method: 'POST', body: JSON.stringify(data) }),

  deleteConfig: () => request('/redmine/config', { method: 'DELETE' }),

  sync: (tipo = 'manual', force_full = false) =>
    request<any>(`/redmine/sync?tipo=${tipo}&force_full=${force_full}`, { method: 'POST' }),

  getSyncLogs: (limit = 20) => request<any[]>(`/redmine/sync/logs?limit=${limit}`),

  getProjetos: () => request<any[]>('/redmine/projetos'),

  updateProjeto: (id: string, sincronizar: boolean) =>
    request(`/redmine/projetos/${id}?sincronizar=${sincronizar}`, { method: 'PATCH' }),

  getDashboard: () => request<any>('/redmine/dashboard'),

  getTarefas: (params?: Record<string, string | number | boolean>) => {
    const q = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return request<any>(`/redmine/tarefas${q}`)
  },

  getKanban: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<Record<string, any[]>>(`/redmine/tarefas/kanban${q}`)
  },

  getTarefa: (id: string) => request<any>(`/redmine/tarefas/${id}`),

  getFiltros: () => request<any>('/redmine/filtros'),
}

// ── Redmine — Entregas e Roadmap ──────────────────────────────
export const RedmineEntregasAPI = {
  getEntregas: (params?: Record<string, string | number>) => {
    const q = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params as any).toString()
      : ''
    return request<{ configurado: boolean; items: any[] }>(`/redmine/entregas${q}`)
  },
  getRoadmap: (params?: Record<string, string | number>) => {
    const q = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params as any).toString()
      : ''
    return request<{ configurado: boolean; items: any[]; sprints: string[]; ultimo_sync: string | null }>(`/redmine/roadmap${q}`)
  },
}

// ── Upload Sustentação ────────────────────────────────────────
export const SustentacaoUploadAPI = {
  upload: (file: File, modo: 'chamados' | 'kpis') => {
    const form = new FormData()
    form.append('file', file)
    form.append('modo', modo)
    const token = TokenStore.get()
    return fetch(`${BASE_URL}/uploads/sustentacao`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (r) => {
      if (r.status === 401) { TokenStore.clear(); window.dispatchEvent(new CustomEvent('auth:expired')); throw new Error('Sessão expirada') }
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || `Erro ${r.status}`)
      return data
    })
  },
  getTemplate: (modo: 'chamados' | 'kpis') =>
    request<any>(`/uploads/sustentacao/template?modo=${modo}`),
  listUploads: () => request<any[]>('/uploads'),
}

// ── Sustentação — dados reais do banco ───────────────────────
export const SustentacaoAPI = {
  getStats: (params?: Record<string, string | number>) => {
    const q = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params as any).toString() : ''
    return request<any>(`/sustentacao/stats${q}`)
  },
  getChamados: (params?: Record<string, string | number>) => {
    const q = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params as any).toString() : ''
    return request<any>(`/sustentacao/chamados${q}`)
  },
  importCSV: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const token = TokenStore.get()
    return fetch(`${BASE_URL}/sustentacao/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (r) => {
      if (r.status === 401) { TokenStore.clear(); window.dispatchEvent(new CustomEvent('auth:expired')); throw new Error('Sessão expirada') }
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || `Erro ${r.status}`)
      return data
    })
  },
}

// ── Compras — Movimentação de Produtos ───────────────────────
export const ComprasAPI = {
  getStats: (params?: Record<string, string>) => {
    const q = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString() : ''
    return request<any>(`/compras/movimentacao/stats${q}`)
  },
  getItens: (params?: Record<string, string | number>) => {
    const q = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params as any).toString() : ''
    return request<any>(`/compras/movimentacao/itens${q}`)
  },
  getPeriodos: () => request<any[]>('/compras/movimentacao/periodos'),
  deletePeriodo: (periodo: string) =>
    request<any>(`/compras/movimentacao/periodo/${encodeURIComponent(periodo)}`, { method: 'DELETE' }),
  importar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const token = TokenStore.get()
    return fetch(`${BASE_URL}/compras/movimentacao/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (r) => {
      if (r.status === 401) { TokenStore.clear(); window.dispatchEvent(new CustomEvent('auth:expired')); throw new Error('Sessão expirada') }
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || `Erro ${r.status}`)
      return data
    })
  },
}

// ── Gente e Gestão ───────────────────────────────────────────
export const GenteAPI = {
  getStats: (params?: Record<string, string>) => {
    const q = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString() : ''
    return request<any>(`/gente/folha/stats${q}`)
  },
  getItens: (params?: Record<string, string | number>) => {
    const q = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params as any).toString() : ''
    return request<any>(`/gente/folha/itens${q}`)
  },
  getCompetencias: () => request<any[]>('/gente/folha/competencias'),
  getColaboradores: (params?: Record<string, string | number>) => {
    const q = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params as any).toString() : ''
    return request<any>(`/gente/colaboradores${q}`)
  },
  getImportacoes: () => request<any[]>('/gente/importacoes'),
  deleteCompetencia: (competencia: string) =>
    request<any>(`/gente/folha/competencia/${encodeURIComponent(competencia)}`, { method: 'DELETE' }),
  importar: (file: File, competencia?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (competencia) form.append('competencia', competencia)
    const token = TokenStore.get()
    return fetch(`${BASE_URL}/gente/folha/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (r) => {
      if (r.status === 401) { TokenStore.clear(); window.dispatchEvent(new CustomEvent('auth:expired')); throw new Error('Sessão expirada') }
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || `Erro ${r.status}`)
      return data
    })
  },
}
