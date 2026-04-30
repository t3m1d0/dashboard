#!/bin/bash
# ============================================================
# update.sh — Atualiza o sistema após git push
# Execute na VM: bash /opt/dashboard-api/update.sh
# ============================================================
set -e

APP_DIR="/var/www/dashboard"
BACKEND_DIR="/opt/dashboard-api"

echo "🔄 Atualizando Muniz Strategic Center..."

# Pull código
cd "$APP_DIR"
git pull origin main
echo "✅ Código atualizado"

# Rebuild frontend
echo "🔨 Building frontend..."
npm install --silent
npm run build
chown -R www-data:www-data dist
echo "✅ Frontend buildado"

# Atualizar dependências backend
echo "🐍 Atualizando backend..."
cd "$BACKEND_DIR"
source venv/bin/activate
pip install -q -r requirements.txt

# Restart API
systemctl restart dashboard-api
sleep 2
systemctl is-active dashboard-api && echo "✅ API reiniciada" || echo "⚠️ Erro na API"

# Reload Nginx
nginx -t && systemctl reload nginx
echo "✅ Nginx recarregado"

echo ""
echo "🚀 Atualização concluída!"
