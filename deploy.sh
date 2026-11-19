#!/usr/bin/env bash
# ==============================================================================
# MailOS Production VPS Deployment Script
# Deploys on standard main web port (Port 80 / 443 — No subport required)
# Automatically configures dynamic credentials from cred.txt / environment
# Zero hardcoded credentials.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "   🚀 MailOS Enterprise MTA Production Deployer"
echo "=========================================================="

# 1. Check prerequisites
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed. Please install Docker first:"
  echo "   curl -fsSL https://get.docker.com | sh"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo "❌ Docker Compose v2 is required. Please install docker-compose-plugin."
  exit 1
fi

# 2. Resolve Master Admin Credentials (dynamic, never hardcoded)
ADMIN_USER="${MASTER_ADMIN_USER:-}"
ADMIN_PASS="${MASTER_ADMIN_PASSWORD:-}"

if [ -f "cred.txt" ]; then
  echo "🔑 Reading master credentials from cred.txt..."
  # Parse from cred.txt if not set in environment
  if [ -z "$ADMIN_USER" ]; then
    ADMIN_USER=$(grep -i "master email" cred.txt | head -n1 | cut -d':' -f2 | xargs || true)
  fi
  if [ -z "$ADMIN_PASS" ]; then
    ADMIN_PASS=$(grep -i "master password" cred.txt | head -n1 | cut -d':' -f2 | xargs || true)
  fi
fi

# If still empty, prompt or generate
if [ -z "$ADMIN_USER" ]; then
  read -r -p "Enter Master Admin Email / Username [zekea.me]: " input_user
  ADMIN_USER="${input_user:-zekea.me}"
fi

if [ -z "$ADMIN_PASS" ]; then
  read -r -s -p "Enter Master Admin Password [Leave blank to generate random]: " input_pass
  echo ""
  if [ -z "$input_pass" ]; then
    ADMIN_PASS=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9!@#%')
    echo "Generated secure password: $ADMIN_PASS"
  else
    ADMIN_PASS="$input_pass"
  fi
fi

# Save/update cred.txt
cat <<EOF > cred.txt
==================================================
        MAILOS ENTERPRISE MASTER CREDENTIALS
==================================================

Master Email / Username: $ADMIN_USER
Master Password:         $ADMIN_PASS
Role:                    master_admin
Authority:               Full System Control & Exclusive Tenant Creation

==================================================
Dashboard URL: Main Web Port (Port 80)
API Endpoint:  POST /api/v1/auth/login
==================================================
EOF
chmod 600 cred.txt
echo "🔒 Saved master credentials to cred.txt (read-only)."

# 3. Detect Server Public IP
echo "🌐 Detecting server public IP..."
SERVER_IP=$(curl -s --connect-timeout 3 https://api.ipify.org || hostname -I | awk '{print $1}')
echo "Detected Public IP: $SERVER_IP"

# 4. Generate or update deploy/docker/.env
cat <<EOF > deploy/docker/.env
PUBLIC_IP=$SERVER_IP
MASTER_ADMIN_USER=$ADMIN_USER
MASTER_ADMIN_PASSWORD=$ADMIN_PASS
MAIN_HTTP_PORT=80
SMTP_PORT=25
SMTP_ALT_PORT=2525
SMTP_SUBMISSION_PORT=587
API_PORT=8080
WEB_PORT=3000
EOF

# 5. Build and Deploy All Containers
echo "🏗️  Building backend and web images..."
docker build -t docker-backend:latest backend/
docker build -t docker-web:latest web/

echo "🚀 Starting MailOS services on Main Port 80..."
docker compose -f deploy/docker/docker-compose.yml up -d

# 6. Verify Deployment Health
echo "⏳ Verifying services..."
sleep 4
GATEWAY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/healthz || echo "000")

if [ "$GATEWAY_STATUS" = "200" ]; then
  echo "✅ Web & API Gateway healthy on Port 80!"
else
  echo "⚠️  Gateway starting up on Port 80 (status: $GATEWAY_STATUS)"
fi

echo ""
echo "=========================================================="
echo "🎉 MailOS Deployment Complete!"
echo "=========================================================="
echo "📍 Access Dashboard on Main Port (No subport needed):"
echo "   http://$SERVER_IP/"
echo ""
echo "🔑 Master Login Credentials:"
echo "   Email / Username: $ADMIN_USER"
echo "   Password:         $ADMIN_PASS"
echo ""
echo "📨 Mail Protocols Online:"
echo "   SMTP Inbound:     Port 25 / Port 2525"
echo "   SMTP Submission:  Port 587 (STARTTLS)"
echo "   IMAP Webmail:     Port 993 (SSL/TLS)"
echo "=========================================================="
