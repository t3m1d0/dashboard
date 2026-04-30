// ============================================================
// Global Types — Muniz Strategic Dashboard
// ============================================================

export interface DashboardMeta {
  empresa: string
  mes: string
  ano: number
  geradoEm: string
}

export interface KPIMetric {
  valor: number
  anterior: number
  meta?: number
  escala?: number
}

export interface VisaoGeral {
  chamadosAtendidos: KPIMetric
  slaMedia: KPIMetric
  resolucaoPrimeiroAtendimento: KPIMetric
  chamadosCriticos: KPIMetric
  usuariosAtendidos: KPIMetric
  franquiasAtendidas: KPIMetric
  entregasDesenvolvimento: KPIMetric
  projetosAndamento: KPIMetric
  satisfacaoInterna: KPIMetric
}

export interface CategoriaTicket {
  categoria: string
  total: number
  cor: string
}

export interface Assunto {
  rank: number
  assunto: string
  total: number
  tendencia: 'up' | 'down' | 'stable'
}

export interface EvolucaoSemanal {
  semanas: string[]
  abertos: number[]
  resolvidos: number[]
  backlog: number[]
}

export interface SLAData {
  tempoMedioAtendimento: string
  tempoMedioResolucao: string
  taxaDentroSLA: number
  foraDoSLA: number
}

export interface Eficiencia {
  reincidencia: number
  chamadosEvitados: number
  automacoesImplementadas: number
  ganhoOperacionalHoras: number
}

export interface Sustentacao {
  porCategoria: CategoriaTicket[]
  top15Assuntos: Assunto[]
  evolucaoSemanal: EvolucaoSemanal
  sla: SLAData
  eficiencia: Eficiencia
}

export type ProjectStatus = 'backlog' | 'desenvolvimento' | 'homologacao' | 'validacao' | 'producao'
export type ProjectPriority = 'Baixa' | 'Média' | 'Alta' | 'Crítica'

export interface Projeto {
  id: number
  titulo: string
  descricao: string
  responsavel: string
  prioridade: ProjectPriority
  prazo: string
  progresso: number
  status: ProjectStatus
  tags: string[]
}

export interface EntregaEstrategica {
  titulo: string
  descricao: string
  impacto: string
  areaBeneficiada: string
  ganhoEstimado: string
  status: string
  data: string
  icone: string
  cor: string
}

export interface VisaoEstrategica {
  franquiasSuportadas: number
  disponibilidadeSistemas: number
  incidentesCriticosEvitados: number
  horasEconomizidasAutomacao: number
  reducaoCustosEstimada: number
  crescimentoOperacao: number
  projetosEntregues: number
  scoreSeguranca: number
  saudeInfraestrutura: number
  evolucaoDisponibilidade: number[]
  meses: string[]
}

export interface RoadmapItem {
  titulo: string
  descricao: string
  categoria: string
  prazo: string
  prioridade: ProjectPriority
  impacto: string
}

export interface DashboardData {
  meta: DashboardMeta
  visaoGeral: VisaoGeral
  sustentacao: Sustentacao
  desenvolvimento: { projetos: Projeto[] }
  entregasEstrategicas: EntregaEstrategica[]
  visaoEstrategica: VisaoEstrategica
  roadmap: RoadmapItem[]
}

export type Section = 'overview' | 'sustentacao' | 'desenvolvimento' | 'entregas' | 'estrategica' | 'roadmap'
