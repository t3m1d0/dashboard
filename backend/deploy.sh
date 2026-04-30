#!/bin/bash
# ============================================================
# deploy.sh — Setup completo na VM Hostinger
# Execute: bash deploy.sh
# ============================================================
set -e

echo "╔══════════════════════════════════════╗"
echo "║  Muniz Strategic Center — Deploy     ║"
echo "╚══════════════════════════════════════╝"

# ── Variáveis — AJUSTE ANTES DE RODAR ──
DB_NAME="dashboard_db"
DB_USER="dashboard_user"
DB_PASS="Mun1zT3ch#@!"
APP_DIR="/var/www/dashboard"
BACKEND_DIR="/opt/dashboard-api"
REPO="https://github.com/t3m1d0/dashboard.git"

# ────────────────────────────────────────
echo ""
echo "▶ 1/8 Atualizando sistema..."
apt update -qq && apt upgrade -y -qq
apt install -y -qq git nginx python3 python3-pip python3-venv curl

# ── Node.js 20 ──
echo "▶ 2/8 Instalando Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo "   Node: $(node -v) | npm: $(npm -v)"

# ── PostgreSQL ──
echo "▶ 3/8 Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Criar banco e usuário
echo "   Criando banco de dados..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
echo "   ✅ Banco: $DB_NAME | Usuário: $DB_USER"

# ── Clone repositório ──
echo "▶ 4/8 Clonando repositório..."
if [ -d "$APP_DIR/.git" ]; then
  echo "   Repositório já existe — fazendo pull..."
  cd "$APP_DIR" && git pull
else
  git clone "$REPO" "$APP_DIR"
fi

# ── Build Frontend ──
echo "▶ 5/8 Build do Frontend..."
cd "$APP_DIR"
echo "VITE_API_URL=/api" > .env.production
npm install --silent
npm run build
chown -R www-data:www-data dist
echo "   ✅ Frontend buildado em $APP_DIR/dist"

# ── Backend Python ──
echo "▶ 6/8 Configurando Backend FastAPI..."
mkdir -p "$BACKEND_DIR"
cp -r "$APP_DIR/backend/"* "$BACKEND_DIR/" 2>/dev/null || echo "   (pasta backend não encontrada no repo — copie manualmente)"

cd "$BACKEND_DIR"
python3 -m venv venv
source venv/bin/activate
pip install -q -r requirements.txt

# Criar .env
if [ ! -f ".env" ]; then
  SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  VM_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")
  cat > .env << ENVEOF
APP_NAME=Muniz Strategic Center
APP_VERSION=2.0.0
DEBUG=false
SECRET_KEY=$SECRET
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
DATABASE_URL=postgresql+asyncpg://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
DATABASE_SYNC_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
ALLOWED_ORIGINS=http://$VM_IP,http://localhost:5173
UPLOAD_DIR=/opt/dashboard-api/uploads
MAX_UPLOAD_SIZE_MB=10
ENVEOF
  echo "   ✅ .env criado com SECRET_KEY gerada automaticamente"
fi

# Copiar data.json padrão
mkdir -p data
cp "$APP_DIR/src/data/default.json" data/default.json 2>/dev/null || true

# Seed banco
echo "   Executando seed inicial..."
python3 seed.py || echo "   (seed já executado ou erro — verifique manualmente)"

# ── Systemd service ──
echo "▶ 7/8 Criando serviço systemd..."
cat > /etc/systemd/system/dashboard-api.service << SVCEOF
[Unit]
Description=Muniz Dashboard API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$BACKEND_DIR
Environment=PATH=$BACKEND_DIR/venv/bin
ExecStart=$BACKEND_DIR/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable dashboard-api
systemctl start dashboard-api
sleep 2
systemctl is-active dashboard-api && echo "   ✅ API rodando na porta 8000" || echo "   ⚠️  Verifique: journalctl -u dashboard-api -n 20"

# ── Nginx ──
echo "▶ 8/8 Configurando Nginx..."
VM_IP=$(curl -s ifconfig.me 2>/dev/null || echo "_")

cat > /etc/nginx/sites-available/dashboard << NGXEOF
server {
    listen 80;
    server_name $VM_IP _;

    # Frontend React (SPA)
    root $APP_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Assets com cache longo
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API — proxy para FastAPI
    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }

    # Uploads (servidos diretamente)
    location /uploads/ {
        alias /opt/dashboard-api/uploads/;
        expires 7d;
    }

    # Gzip
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # Segurança
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    client_max_body_size 15M;
}
NGXEOF

ln -sf /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ Deploy concluído!                             ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Frontend:  http://$VM_IP                        ║"
echo "║  API Docs:  http://$VM_IP/api/docs               ║"
echo "║  Health:    http://$VM_IP/api/health             ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Login:     admin@muniz.com                      ║"
echo "║  Senha:     Admin@2025!  ← TROQUE!               ║"
echo "╚══════════════════════════════════════════════════╝"
