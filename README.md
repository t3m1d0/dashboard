# 🚀 Muniz Strategic Center — Dashboard Executivo v2.0

> Sistema profissional, modular e escalável para gestão executiva de TI.  
> Refatorado de um único arquivo HTML/JS para arquitetura React enterprise.

---

## 📐 Arquitetura

```
src/
├── components/
│   ├── Layout/
│   │   ├── AppShell.tsx       # Shell principal (sidebar + topbar + conteúdo)
│   │   ├── Sidebar.tsx        # Navegação lateral
│   │   └── Topbar.tsx         # Header com ações (tema, export, upload)
│   ├── KPI/
│   │   └── KPICard.tsx        # Card reutilizável de indicador
│   ├── UI/
│   │   └── Loader.tsx         # Tela de carregamento inicial
│   └── Upload/
│       └── UploadModal.tsx    # Modal de importação de dados
├── pages/
│   ├── OverviewPage.tsx       # Visão Geral Executiva
│   ├── SustentacaoPage.tsx    # Chamados, SLA, eficiência
│   ├── DesenvolvimentoPage.tsx# Board Kanban de projetos
│   ├── EntregasPage.tsx       # Entregas estratégicas
│   ├── EstrategicaPage.tsx    # Visão estratégica / valor do TI
│   └── RoadmapPage.tsx        # Roadmap e planejamento
├── store/
│   └── index.ts               # Estado global (Zustand + persist)
├── types/
│   └── index.ts               # TypeScript types completos
├── utils/
│   └── index.ts               # Formatadores, helpers, constantes
├── styles/
│   └── globals.css            # CSS variables + Tailwind base
├── data/
│   └── default.json           # Dados padrão do dashboard
├── App.tsx                    # Root component
└── main.tsx                   # Entry point
```

---

## 🛠 Stack Tecnológica

| Camada       | Tecnologia                                    |
|--------------|-----------------------------------------------|
| Framework    | React 18 + TypeScript                         |
| Build        | Vite 5                                        |
| Estilos      | Tailwind CSS 3 + CSS Variables                |
| Estado       | Zustand (persist middleware)                  |
| Gráficos     | Recharts                                      |
| Ícones       | Lucide React                                  |
| Fontes       | DM Sans + Bebas Neue + JetBrains Mono         |

---

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 18+
- npm 9+

### Desenvolvimento

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Abrir no navegador
# http://localhost:5173
```

### Produção

```bash
# Build otimizado
npm run build

# Pré-visualizar build
npm run preview
```

---

## 🗄 Banco de Dados — Modelagem Inicial (PostgreSQL)

```sql
-- Usuários e autenticação
CREATE TABLE usuarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  senha_hash  TEXT NOT NULL,
  cargo       VARCHAR(80),
  empresa_id  UUID REFERENCES empresas(id),
  permissoes  JSONB DEFAULT '{}',
  ativo       BOOLEAN DEFAULT true,
  criado_em   TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Empresas / franqueador
CREATE TABLE empresas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        VARCHAR(150) NOT NULL,
  slug        VARCHAR(80) UNIQUE NOT NULL,
  plano       VARCHAR(30) DEFAULT 'standard',
  criado_em   TIMESTAMP DEFAULT NOW()
);

-- Franquias
CREATE TABLE franquias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID REFERENCES empresas(id),
  nome        VARCHAR(150) NOT NULL,
  cidade      VARCHAR(100),
  uf          CHAR(2),
  ativo       BOOLEAN DEFAULT true
);

-- Chamados (Sustentação)
CREATE TABLE chamados (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        VARCHAR(200) NOT NULL,
  descricao     TEXT,
  categoria     VARCHAR(80),
  prioridade    VARCHAR(20) DEFAULT 'media',
  status        VARCHAR(30) DEFAULT 'aberto',
  usuario_id    UUID REFERENCES usuarios(id),
  franquia_id   UUID REFERENCES franquias(id),
  sla_prazo     TIMESTAMP,
  resolvido_em  TIMESTAMP,
  criado_em     TIMESTAMP DEFAULT NOW()
);

-- Projetos (Desenvolvimento)
CREATE TABLE projetos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        VARCHAR(200) NOT NULL,
  descricao     TEXT,
  responsavel_id UUID REFERENCES usuarios(id),
  prioridade    VARCHAR(20) DEFAULT 'media',
  prazo         DATE,
  progresso     SMALLINT DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  status        VARCHAR(30) DEFAULT 'backlog',
  empresa_id    UUID REFERENCES empresas(id),
  criado_em     TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- KPIs histórico
CREATE TABLE kpi_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID REFERENCES empresas(id),
  periodo       VARCHAR(20),  -- '2025-04'
  dados         JSONB NOT NULL,
  criado_em     TIMESTAMP DEFAULT NOW()
);

-- Logs de auditoria
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID REFERENCES usuarios(id),
  acao        VARCHAR(100) NOT NULL,
  entidade    VARCHAR(80),
  entidade_id UUID,
  dados       JSONB,
  ip          VARCHAR(45),
  criado_em   TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API Backend — FastAPI (Futuro)

```
/backend
├── main.py                   # Entry point FastAPI
├── /routers
│   ├── auth.py               # Login, JWT, refresh
│   ├── dashboard.py          # KPIs, overview
│   ├── chamados.py           # CRUD chamados
│   ├── projetos.py           # CRUD projetos
│   └── uploads.py            # Parse CSV/XLSX
├── /models
│   ├── usuario.py
│   ├── chamado.py
│   └── projeto.py
├── /services
│   ├── database.py           # SQLAlchemy + Alembic
│   ├── auth.py               # JWT utils
│   └── parser.py             # CSV/XLSX parser
├── requirements.txt
└── Dockerfile
```

### Endpoints principais

```
POST   /auth/login             → JWT token
GET    /dashboard/overview     → KPIs consolidados
GET    /dashboard/sustentacao  → Chamados + SLA
GET    /dashboard/projetos     → Board projetos
POST   /uploads/parse          → Parse arquivo
GET    /kpis/historico         → Série temporal
```

---

## 📦 Escalabilidade — Próximos Passos

- [ ] Autenticação JWT + rotas protegidas
- [ ] Multi-empresa (tenant isolation)
- [ ] API real com FastAPI + PostgreSQL
- [ ] TanStack Query para cache de requisições
- [ ] React Router para rotas dedicadas por seção
- [ ] PWA + Service Worker
- [ ] Notificações em tempo real (WebSocket)
- [ ] Relatórios PDF gerados no servidor
- [ ] Integração Meta Ads API
- [ ] Painel de permissões por usuário

---

## 🎨 Decisões de Design

1. **CSS Variables** — Toda a paleta via variáveis CSS para suporte a temas
2. **Zustand + persist** — Estado global simples, sem boilerplate Redux
3. **Recharts** — Gráficos declarativos, responsivos, bem integrados ao React
4. **Lucide React** — Ícones consistentes e leves (tree-shakeable)
5. **Componentes reutilizáveis** — KPICard, StatusBadge separados e tipados
6. **Separação de responsabilidades** — Pages > Components > Utils/Store

---

*Gerado em Abril/2025 — Muniz Strategic Center*
