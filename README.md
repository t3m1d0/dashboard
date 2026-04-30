# 🚀 Muniz Strategic Center — Sistema Completo v2.0

Dashboard Executivo de TI com backend FastAPI + PostgreSQL + frontend React/TypeScript.

---

## 📁 Estrutura do Repositório

```
/
├── dashboard/              ← Frontend React + Vite + TypeScript
│   ├── src/
│   │   ├── components/     ← Layout, KPI, Upload, UI
│   │   ├── pages/          ← 6 seções do dashboard + Login
│   │   ├── services/       ← Cliente HTTP (api.ts)
│   │   ├── store/          ← Estado global (Zustand)
│   │   ├── types/          ← TypeScript types
│   │   └── utils/          ← Helpers e constantes
│   ├── .env.development    ← VITE_API_URL=http://localhost:8000/api
│   └── .env.production     ← VITE_API_URL=/api
│
├── backend/                ← API FastAPI + SQLAlchemy + PostgreSQL
│   ├── app/
│   │   ├── core/           ← Config, Database, Security (JWT)
│   │   ├── models/         ← SQLAlchemy models (7 tabelas)
│   │   ├── schemas/        ← Pydantic v2 schemas
│   │   ├── services/       ← Regras de negócio
│   │   └── routers/        ← Endpoints REST
│   ├── migrations/         ← Alembic migrations
│   ├── data/               ← default.json (dados iniciais)
│   ├── main.py             ← Entry point FastAPI
│   ├── seed.py             ← Popula banco com dados iniciais
│   ├── deploy.sh           ← Setup completo na VM (rodar 1x)
│   └── update.sh           ← Atualização após git push
│
└── README.md
```

---

## ⚡ Setup Local (Desenvolvimento)

### Pré-requisitos
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+

### 1. Banco de dados
```bash
psql -U postgres
CREATE USER dashboard_user WITH PASSWORD 'senha123';
CREATE DATABASE dashboard_db OWNER dashboard_user;
\q
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Criar .env
cp .env.example .env
# Edite .env com suas credenciais

# Rodar migrations
alembic upgrade head

# Popular banco com dados iniciais
python seed.py

# Iniciar servidor
uvicorn main:app --reload --port 8000
# API Docs: http://localhost:8000/api/docs
```

### 3. Frontend
```bash
cd dashboard
npm install
npm run dev
# App: http://localhost:5173
```

**Login inicial:** `admin@muniz.com` / `Admin@2025!`

---

## 🚀 Deploy na VM Hostinger

### Primeira vez (setup completo)
```bash
# Na VM via SSH
git clone https://github.com/t3m1d0/dashboard.git /var/www/dashboard
cd /var/www/dashboard/backend

# Edite a senha do banco antes de rodar
nano deploy.sh   # linha DB_PASS=

bash deploy.sh
```

### Atualizações futuras
```bash
# Na VM via SSH
bash /opt/dashboard-api/update.sh
```

---

## 🗄 Banco de Dados — Tabelas

| Tabela         | Descrição                              |
|----------------|----------------------------------------|
| `empresas`     | Multi-empresa / franqueador            |
| `franquias`    | Unidades franqueadas                   |
| `usuarios`     | Autenticação + roles (viewer/editor/admin) |
| `chamados`     | Tickets de sustentação + SLA           |
| `projetos`     | Board Kanban com status + progresso    |
| `kpi_snapshots`| Métricas mensais históricas (JSON)     |
| `uploads`      | Rastreamento de arquivos importados    |
| `audit_logs`   | Log de todas as ações dos usuários     |

---

## 🔌 API Endpoints

```
POST   /api/auth/login          → JWT token
GET    /api/auth/me             → Usuário logado
POST   /api/auth/register       → Criar usuário

GET    /api/dashboard/overview  → Payload completo do dashboard

GET    /api/chamados            → Listar chamados (filtros + paginação)
POST   /api/chamados            → Criar chamado
PATCH  /api/chamados/{id}       → Atualizar chamado
GET    /api/chamados/stats      → Estatísticas consolidadas

GET    /api/projetos            → Listar projetos
GET    /api/projetos/kanban     → Board agrupado por status
POST   /api/projetos            → Criar projeto
PATCH  /api/projetos/{id}       → Atualizar projeto
DELETE /api/projetos/{id}       → Remover projeto

GET    /api/kpis/latest         → Snapshot mais recente
GET    /api/kpis/historico      → Histórico de snapshots
POST   /api/kpis                → Criar/atualizar snapshot

POST   /api/uploads             → Upload CSV/XLSX (tipo obrigatório)
GET    /api/uploads             → Listar uploads

GET    /api/health              → Status da API
```

---

## 🔐 Roles e Permissões

| Role         | Acesso                              |
|--------------|-------------------------------------|
| `viewer`     | Leitura apenas                      |
| `editor`     | Criar e editar chamados e projetos  |
| `admin`      | Tudo + gerenciar usuários           |
| `superadmin` | Acesso total multi-empresa          |

---

## 🛠 Stack Completa

| Camada     | Tecnologia                              |
|------------|-----------------------------------------|
| Frontend   | React 18 + TypeScript + Vite 5          |
| Estilos    | Tailwind CSS + CSS Variables            |
| Estado     | Zustand (persist)                       |
| Gráficos   | Recharts                                |
| Backend    | Python 3.11 + FastAPI 0.111             |
| ORM        | SQLAlchemy 2.0 (async)                  |
| Migrations | Alembic                                 |
| Banco      | PostgreSQL 15                           |
| Auth       | JWT (python-jose + passlib/bcrypt)      |
| Servidor   | Nginx + Uvicorn (2 workers)             |
| Process    | systemd                                 |

---

*Muniz Strategic Center © 2025*
