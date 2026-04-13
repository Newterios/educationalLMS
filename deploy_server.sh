#!/bin/bash
# EduLMS Production Deployment Script
# Server: 161.35.202.138 (aitbek.tech)
# Usage: ./deploy_server.sh

set -e

SERVER="161.35.202.138"
USER="root"
REMOTE_DIR="/opt/edulms"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== EduLMS Production Deployment ==="
echo "Server: $SERVER"
echo "Project: $PROJECT_DIR"
echo ""

# ── Step 1: Sync project files to server ──────────────────────────────────────
echo "[1/5] Syncing files to server..."
rsync -avz --progress \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'screenshots' \
  --exclude '*.pdf' \
  --exclude 'web/.next' \
  "$PROJECT_DIR/" "$USER@$SERVER:$REMOTE_DIR/"

# ── Step 2: Ensure Docker + Swarm initialized on server ───────────────────────
echo "[2/5] Checking Docker Swarm on server..."
ssh "$USER@$SERVER" bash <<'REMOTE'
set -e

# Install Docker if missing
if ! command -v docker &>/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  echo "Docker installed."
fi

# Init Swarm if not already
SWARM_STATE=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "inactive")
if [ "$SWARM_STATE" != "active" ]; then
  echo "Initializing Docker Swarm..."
  docker swarm init --advertise-addr $(hostname -I | awk '{print $1}')
  echo "Swarm initialized."
else
  echo "Swarm already active."
fi
REMOTE

# ── Step 3: Build images on server ────────────────────────────────────────────
echo "[3/5] Building service images on server..."
ssh "$USER@$SERVER" bash <<REMOTE
set -e
cd $REMOTE_DIR

# Build all services using prod compose (reuses layers)
docker compose -f docker-compose.prod.yml build --parallel
echo "Images built."
REMOTE

# ── Step 4: Create .env file on server if missing ─────────────────────────────
echo "[4/5] Checking .env file on server..."
ssh "$USER@$SERVER" bash <<REMOTE
set -e
cd $REMOTE_DIR

if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << 'ENVEOF'
POSTGRES_USER=edulms
POSTGRES_PASSWORD=edulms_secret_prod
POSTGRES_DB=edulms
MONGO_USER=edulms
MONGO_PASSWORD=edulms_mongo_prod
MONGO_DB=edulms
REDIS_PASSWORD=edulms_redis_prod
MINIO_ACCESS_KEY=edulms_minio
MINIO_SECRET_KEY=edulms_minio_prod_secret
MINIO_BUCKET=edulms-files
JWT_SECRET=prod-jwt-secret-$(openssl rand -hex 32)
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=168h
SESSION_TIMEOUT=30m
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@edulms.com
SMTP_PASSWORD=changeme
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin_prod_secret
ENVEOF
  echo ".env created."
else
  echo ".env already exists, skipping."
fi
REMOTE

# ── Step 5: Deploy / Update Docker Swarm stack ────────────────────────────────
echo "[5/5] Deploying Docker Swarm stack..."
ssh "$USER@$SERVER" bash <<REMOTE
set -e
cd $REMOTE_DIR

# Load env vars for docker stack deploy
set -a && source .env && set +a

# Tag locally built images with edulms/* names expected by docker-stack.yml
for svc in auth-service user-service course-service assessment-service attendance-service notification-service media-service analytics-service ai-service payment-service; do
  docker tag diplom-\${svc} edulms/\${svc}:latest 2>/dev/null || true
done
docker tag diplom-frontend 2>/dev/null || true

# Tag frontend if it was built
FRONTEND_IMAGE=\$(docker images --format '{{.Repository}}:{{.Tag}}' | grep frontend | head -1)
if [ -n "\$FRONTEND_IMAGE" ]; then
  docker tag "\$FRONTEND_IMAGE" edulms/frontend:latest
fi

# Deploy (or update) the Swarm stack
docker stack deploy \
  --compose-file docker-stack.yml \
  --with-registry-auth \
  --resolve-image always \
  edulms

echo ""
echo "=== Deployment complete ==="
echo ""
echo "Waiting 15s for services to start..."
sleep 15

echo ""
echo "=== Stack status ==="
docker stack services edulms

echo ""
echo "=== Service endpoints ==="
echo "  Website:    http://161.35.202.138:3000"
echo "  API GW:     http://161.35.202.138:8080"
echo "  Prometheus: http://161.35.202.138:9090"
echo "  Grafana:    http://161.35.202.138:3001  (admin / admin_prod_secret)"
REMOTE

echo ""
echo "=== Local deployment complete! ==="
echo "SSH to server: ssh root@161.35.202.138"
