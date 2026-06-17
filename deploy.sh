#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Setup CBT Sekolah di VPS Ubuntu dari nol
# Usage  : sudo bash deploy.sh
# Domain : cbt.adilabs.id
# Repo   : https://github.com/Adi-Sumardi/cbt.git
# =============================================================================
set -euo pipefail

DOMAIN="cbt.adilabs.id"
EMAIL="adisumardi888@gmail.com"
REPO="https://github.com/Adi-Sumardi/cbt.git"
APP_DIR="/opt/cbt"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[→]${NC} $1"; }
fail() { echo -e "${RED}[✘]${NC} $1"; exit 1; }

# ── Root check ───────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && fail "Jalankan sebagai root: sudo bash deploy.sh"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        CBT Sekolah — Deploy ke VPS                  ║"
echo "║  Domain : $DOMAIN                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
warn "Script ini akan MENGHAPUS semua file di $APP_DIR dan reset VPS ini."
read -rp "Lanjutkan? (y/N): " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Dibatalkan."; exit 0; }

# ── 1. Update sistem ─────────────────────────────────────────────────────────
info "Update paket sistem..."
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx ufw fail2ban

# ── 2. Install Docker ────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Install Docker..."
  curl -fsSL https://get.docker.com | bash
  systemctl enable --now docker
  log "Docker terinstall: $(docker --version)"
else
  log "Docker sudah ada: $(docker --version)"
fi

# Docker Compose (plugin)
if ! docker compose version &>/dev/null; then
  info "Install Docker Compose plugin..."
  apt-get install -y -qq docker-compose-plugin
fi
log "Docker Compose: $(docker compose version)"

# ── 3. Firewall (UFW) ────────────────────────────────────────────────────────
info "Konfigurasi firewall..."
ufw --force reset > /dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log "UFW aktif"

# ── 4. Clone / update repo ───────────────────────────────────────────────────
info "Clone repository..."
rm -rf "$APP_DIR"
git clone "$REPO" "$APP_DIR"
cd "$APP_DIR"
log "Repo di-clone ke $APP_DIR"

# ── 5. Buat file .env ────────────────────────────────────────────────────────
if [[ ! -f "$APP_DIR/.env" ]]; then
  info "Membuat file .env dengan secret yang di-generate..."

  PG_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
  REDIS_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
  JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
  NEXTAUTH_SECRET=$(openssl rand -base64 64 | tr -d '\n')

  cat > "$APP_DIR/.env" <<EOF
# ─── PostgreSQL ──────────────────────────────────
POSTGRES_DB=cbt
POSTGRES_USER=cbt_user
POSTGRES_PASSWORD=${PG_PASS}

# ─── Redis ───────────────────────────────────────
REDIS_PASSWORD=${REDIS_PASS}

# ─── NestJS API ──────────────────────────────────
DATABASE_URL=postgresql://cbt_user:${PG_PASS}@postgres:5432/cbt
REDIS_URL=redis://:${REDIS_PASS}@redis:6379
JWT_SECRET=${JWT_SECRET}
PORT=3001
WEB_URL=https://${DOMAIN}
NODE_ENV=production

# ─── Next.js ─────────────────────────────────────
NEXT_PUBLIC_API_URL=https://${DOMAIN}
NEXT_PUBLIC_WS_URL=https://${DOMAIN}
API_URL=http://api:3001
NEXTAUTH_URL=https://${DOMAIN}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
EOF
  chmod 600 "$APP_DIR/.env"
  log ".env dibuat dengan password acak (simpan file ini!)"
  warn "Password DB  : ${PG_PASS}"
  warn "Password Redis: ${REDIS_PASS}"
else
  warn ".env sudah ada, dipakai yang existing"
fi

# ── 6. Build & start container ───────────────────────────────────────────────
info "Build Docker images (ini butuh waktu 5-10 menit)..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml build --no-cache

info "Jalankan semua service..."
docker compose -f docker-compose.prod.yml up -d

info "Tunggu database siap..."
sleep 15

info "Jalankan migrasi database..."
docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy

info "Jalankan seeder data awal..."
docker compose -f docker-compose.prod.yml exec -T api npx prisma db seed || warn "Seeder skip (data mungkin sudah ada)"

log "Semua container berjalan"
docker compose -f docker-compose.prod.yml ps

# ── 7. Konfigurasi Nginx host (HTTP dulu untuk certbot) ──────────────────────
info "Konfigurasi Nginx untuk domain $DOMAIN..."

cat > /etc/nginx/sites-available/cbt <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Proxy ke Docker app
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/cbt /etc/nginx/sites-enabled/cbt
rm -f /etc/nginx/sites-enabled/default

mkdir -p /var/www/certbot
nginx -t && systemctl reload nginx
log "Nginx aktif untuk HTTP"

# ── 8. SSL dengan Let's Encrypt ──────────────────────────────────────────────
info "Mendapatkan SSL certificate untuk $DOMAIN..."
certbot certonly --nginx \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN"

# Update nginx config dengan HTTPS
cat > /etc/nginx/sites-available/cbt <<NGINX
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/${DOMAIN}/chain.pem;

    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # Proxy ke Docker app
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass \$http_upgrade;

        # Timeout untuk WebSocket
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;

        # Upload limit
        client_max_body_size 20m;
    }
}
NGINX

nginx -t && systemctl reload nginx
log "HTTPS aktif dengan SSL!"

# ── 9. Auto-renewal cert ─────────────────────────────────────────────────────
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -
log "Auto-renewal SSL dikonfigurasi (setiap hari jam 03:00)"

# ── 10. Setup auto-start on reboot ───────────────────────────────────────────
cat > /etc/systemd/system/cbt.service <<SYSTEMD
[Unit]
Description=CBT Sekolah Application
Requires=docker.service
After=docker.service network.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${APP_DIR}
ExecStart=docker compose -f docker-compose.prod.yml up -d
ExecStop=docker compose -f docker-compose.prod.yml down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable cbt.service
log "Auto-start service terdaftar"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║           Deploy BERHASIL! 🎉                       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
log "Aplikasi berjalan di: https://${DOMAIN}"
log "Admin login: admin@cbt.local / admin123"
log "Guru login : budi@cbt.local  / guru123"
echo ""
warn "PENTING: Simpan file .env di tempat aman!"
warn "File .env ada di: ${APP_DIR}/.env"
echo ""
info "Perintah berguna:"
echo "  cd ${APP_DIR}"
echo "  docker compose -f docker-compose.prod.yml ps        # status container"
echo "  docker compose -f docker-compose.prod.yml logs -f   # lihat log"
echo "  bash ${APP_DIR}/update.sh                           # update ke versi terbaru"
echo ""
