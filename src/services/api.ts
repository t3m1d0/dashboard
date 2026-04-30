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
    window.location.href = '/login'
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
  getOverview: () => request<DashboardData>('/dashboard/overview'),
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
