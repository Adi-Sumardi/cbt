#!/usr/bin/env bash
# =============================================================================
# update.sh — Update CBT Sekolah ke versi terbaru dari GitHub
# Usage: bash update.sh
# =============================================================================
set -euo pipefail

APP_DIR="/opt/cbt"
COMPOSE="docker compose -f docker-compose.prod.yml"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[→]${NC} $1"; }
fail() { echo -e "${RED}[✘]${NC} $1"; exit 1; }

cd "$APP_DIR" || fail "Direktori $APP_DIR tidak ditemukan. Jalankan deploy.sh dulu."

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        CBT Sekolah — Update Aplikasi                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Pull kode terbaru ─────────────────────────────────────────────────────
info "Pull kode terbaru dari GitHub..."
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [[ "$LOCAL" == "$REMOTE" ]]; then
  warn "Kode sudah up-to-date. Tidak ada yang perlu diupdate."
  read -rp "Paksa rebuild? (y/N): " force
  [[ "$force" =~ ^[Yy]$ ]] || exit 0
fi

git pull origin main
log "Kode berhasil diupdate"

# Tampilkan commit terakhir
echo ""
info "Perubahan terbaru:"
git log --oneline -5
echo ""

# ── 2. Build image baru ──────────────────────────────────────────────────────
info "Build image baru (ini butuh beberapa menit)..."
$COMPOSE build api web
log "Build selesai"

# ── 3. Rolling restart (zero-downtime) ───────────────────────────────────────
info "Restart services..."
$COMPOSE up -d --no-deps api
sleep 5

info "Jalankan migrasi database..."
$COMPOSE exec -T api npx prisma migrate deploy
log "Migrasi selesai"

$COMPOSE up -d --no-deps web
sleep 5

# Pastikan nginx masih jalan
$COMPOSE up -d --no-deps nginx
log "Semua service diperbarui"

# ── 4. Cleanup image lama ────────────────────────────────────────────────────
info "Bersihkan image lama..."
docker image prune -f > /dev/null
log "Cleanup selesai"

# ── 5. Status ────────────────────────────────────────────────────────────────
echo ""
$COMPOSE ps
echo ""
log "Update selesai! Aplikasi berjalan di versi terbaru."
echo ""
