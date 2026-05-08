// ============================================================
// Global Types — Muniz Strategic Dashboard
// ============================================================

export interface DashboardMeta {
  empresa: string; mes: string; ano: number; geradoEm: string
}
export interface KPIMetric {
  valor: number; anterior: number; meta?: number; escala?: number
}
export interface VisaoGeral {
  chamadosAtendidos: KPIMetric; slaMedia: KPIMetric
  resolucaoPrimeiroAtendimento: KPIMetric; chamadosCriticos: KPIMetric
  usuariosAtendidos: KPIMetric; franquiasAtendidas: KPIMetric
  entregasDesenvolvimento: KPIMetric; projetosAndamento: KPIMetric
  satisfacaoInterna: KPIMetric
}
export interface CategoriaTicket { categoria: string; total: number; cor: string }
export interface Assunto { rank: number; assunto: string; total: number; tendencia: 'up'|'down'|'stable' }
export interface EvolucaoSemanal { semanas: string[]; abertos: number[]; resolvidos: number[]; backlog: number[] }
export interface SLAData { tempoMedioAtendimento: string; tempoMedioResolucao: string; taxaDentroSLA: number; foraDoSLA: number }
export interface Eficiencia { reincidencia: number; chamadosEvitados: number; automacoesImplementadas: number; ganhoOperacionalHoras: number }
export interface Sustentacao {
  porCategoria: CategoriaTicket[]; top15Assuntos: Assunto[]
  evolucaoSemanal: EvolucaoSemanal; sla: SLAData; eficiencia: Eficiencia
}
export type ProjectStatus = 'backlog'|'desenvolvimento'|'homologacao'|'validacao'|'producao'
export type ProjectPriority = 'Baixa'|'Média'|'Alta'|'Crítica'
export interface Projeto {
  id: number; titulo: string; descricao: string; responsavel: string
  prioridade: ProjectPriority; prazo: string; progresso: number
  status: ProjectStatus; tags: string[]
}
export interface EntregaEstrategica {
  titulo: string; descricao: string; impacto: string; areaBeneficiada: string
  ganhoEstimado: string; status: string; data: string; icone: string; cor: string
}
export interface VisaoEstrategica {
  franquiasSuportadas: number; disponibilidadeSistemas: number
  incidentesCriticosEvitados: number; horasEconomizidasAutomacao: number
  reducaoCustosEstimada: number; crescimentoOperacao: number
  projetosEntregues: number; scoreSeguranca: number; saudeInfraestrutura: number
  evolucaoDisponibilidade: number[]; meses: string[]
}
export interface RoadmapItem {
  titulo: string; descricao: string; categoria: string
  prazo: string; prioridade: ProjectPriority; impacto: string
}
export interface DashboardData {
  meta: DashboardMeta; visaoGeral: VisaoGeral; sustentacao: Sustentacao
  desenvolvimento: { projetos: Projeto[] }; entregasEstrategicas: EntregaEstrategica[]
  visaoEstrategica: VisaoEstrategica; roadmap: RoadmapItem[]
}

// ── Navigation ────────────────────────────────────────────────
export type Section = 'tecnologia' | 'compras' | 'marketing' | 'financeiro' | 'rh'
export type TechSubSection = 'overview'|'sustentacao'|'desenvolvimento'|'entregas'|'estrategica'|'roadmap'
export type DevSubSection  = 'dashboard'|'tarefas'|'equipe'|'config'

// ── Filtro de período por seção ───────────────────────────────
export interface PeriodoFiltro {
  mes: number        // 1–12, 0 = todos os meses
  ano: number
  dataInicio?: string  // YYYY-MM-DD opcional (range)
  dataFim?: string     // YYYY-MM-DD opcional (range)
  modo: 'mes' | 'range' | 'todos'
}

export type ComprasSubSection = 'movimentacao'
export type PeriodosPorSecao = Record<TechSubSection, PeriodoFiltro>

// ── Redmine Types ─────────────────────────────────────────────
export interface RedmineConfig {
  id: string; url: string; ativo: boolean
  ultimo_sync: string | null; sync_interval_min: number; configurado: boolean
}
export interface RedmineProjeto {
  id: string; redmine_id: number; identificador: string
  nome: string; descricao?: string; ativo: boolean; sincronizar: boolean
}
export interface RedmineTarefa {
  id: string; redmine_id: number; projeto_id: string; assunto: string
  descricao?: string; status: string; prioridade: string; prioridade_id: number
  tracker?: string; responsavel?: string; responsavel_id?: number
  categoria?: string; versao?: string; estimativa_horas?: number; horas_gastas?: number
  progresso: number; tags: string[]; data_inicio?: string; data_prazo?: string
  data_criacao?: string; data_fechamento?: string; atrasada: boolean
  sincronizado_em: string; comentarios?: RedmineComentario[]
}
export interface RedmineComentario { id: string; autor: string; texto: string; criado_em: string }
export interface RedmineMembro {
  membro_id: number; nome: string; abertas: number; em_andamento: number
  concluidas: number; atrasadas: number; horas_gastas: number
  taxa_conclusao: number; tempo_medio?: number
}
export interface RedmineDashboard {
  configurado: boolean; ultimo_sync: string | null
  kpis: { abertas: number; em_andamento: number; concluidas: number; atrasadas: number; horas_gastas: number; horas_estimadas: number; tempo_medio_resolucao?: number }
  burndown: Array<{ data: string; dia: string; abertas?: number; em_andamento?: number; concluidas?: number; atrasadas?: number }>
  por_status: Array<{ status: string; total: number }>
  por_prioridade: Array<{ prioridade: string; total: number }>
  equipe: RedmineMembro[]; atrasadas: RedmineTarefa[]
}
export interface RedmineFiltros {
  status: string[]; prioridades: string[]; responsaveis: string[]
  versoes: string[]; trackers: string[]
}
