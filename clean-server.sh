#!/usr/bin/env bash
# ==============================================================================
# MailOS Production Server Cleaner
# Wipes runtime spools, queues, campaigns, contacts, and logs while PRESERVING
# master account credentials and system network configuration.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "   MailOS Production State Cleaner"
echo "=========================================================="

# 1. Verify master credentials file exists
if [ ! -f "cred.txt" ]; then
  echo "⚠️  cred.txt not found! Creating default master credentials..."
  cat <<'EOF' > cred.txt
==================================================
        MAILOS ENTERPRISE MASTER CREDENTIALS
==================================================

Master Email / Username: zekea.me
Master Password:         zekea@mta#kumo
Role:                    master_admin
Authority:               Full System Control & Exclusive Tenant Creation

==================================================
Dashboard URL: http://localhost:3000
API Endpoint:  POST http://localhost:8080/api/v1/auth/login
==================================================
EOF
fi

echo "🔒 Preserving master admin credentials in cred.txt..."

# 2. Stop running services gracefully
echo "🛑 Stopping services..."
docker compose -f deploy/docker/docker-compose.yml stop || true

# 3. Clean runtime KumoMTA spool and queue files
echo "🧹 Wiping runtime spool queues and spool storage..."
rm -rf deploy/docker/spool/* deploy/docker/logs/* || true
mkdir -p deploy/docker/spool/mail deploy/docker/logs

# 4. Flush Redis cache volume
echo "🧹 Resetting Redis queue cache..."
docker compose -f deploy/docker/docker-compose.yml rm -f -v -s redis || true

# 5. Clean state file to pristine production baseline
echo "📦 Resetting data state to pristine production baseline..."
mkdir -p backend/data
cat <<'EOF' > backend/data/mailops-state.json
{
  "domains": [],
  "ip_pools": [
    {
      "id": "default",
      "name": "default",
      "description": "Default Shared Egress Pool",
      "ips": ["127.0.0.1"],
      "strategy": "round_robin",
      "created_at": "2026-11-19T00:00:00Z"
    }
  ],
  "ips": [
    {
      "ip": "127.0.0.1",
      "rdns": "mail.local",
      "pool": "default",
      "status": "active",
      "reputation_score": 100,
      "added_at": "2026-11-19T00:00:00Z"
    }
  ],
  "rate_limits": [
    {
      "domain": "default",
      "connection_limit": 10,
      "max_connection_rate": "100/min",
      "max_deliveries_per_connection": 100,
      "max_message_rate": "100/s"
    },
    {
      "domain": "gmail.com",
      "connection_limit": 20,
      "max_connection_rate": "50/s",
      "max_deliveries_per_connection": 100,
      "max_message_rate": "50/s"
    },
    {
      "domain": "yahoo.com",
      "connection_limit": 15,
      "max_connection_rate": "30/s",
      "max_deliveries_per_connection": 50,
      "max_message_rate": "30/s"
    },
    {
      "domain": "outlook.com",
      "connection_limit": 20,
      "max_connection_rate": "40/s",
      "max_deliveries_per_connection": 80,
      "max_message_rate": "40/s"
    },
    {
      "domain": "icloud.com",
      "connection_limit": 10,
      "max_connection_rate": "25/s",
      "max_deliveries_per_connection": 50,
      "max_message_rate": "25/s"
    }
  ],
  "whitelist": [
    {
      "id": "wl-1",
      "cidr": "127.0.0.1/32",
      "description": "Local Loopback Interface",
      "created_at": "2026-11-19T00:00:00Z"
    },
    {
      "id": "wl-2",
      "cidr": "10.0.0.0/8",
      "description": "Private Cloud VPC (10.0.0.0/8)",
      "created_at": "2026-11-19T00:00:00Z"
    },
    {
      "id": "wl-3",
      "cidr": "172.16.0.0/12",
      "description": "Docker Subnet (172.16.0.0/12)",
      "created_at": "2026-11-19T00:00:00Z"
    },
    {
      "id": "wl-4",
      "cidr": "192.168.0.0/16",
      "description": "Local Subnet (192.168.0.0/16)",
      "created_at": "2026-11-19T00:00:00Z"
    }
  ],
  "suppressions": [],
  "warmup_schedules": [],
  "campaigns": [],
  "contacts": [],
  "inbound_routes": [],
  "subaccounts": [],
  "api_keys": [],
  "webhooks": [],
  "templates": [],
  "mailboxes": [],
  "mailbox_pools": [],
  "mailbox_assignments": [],
  "system_settings": {
    "mailbox_rotation_enabled": true,
    "enforce_sender_continuity": true,
    "enforce_min_interval": true,
    "default_rotation_strategy": "least_utilized",
    "default_ip_pool": "default",
    "require_verified_domain": true,
    "one_click_unsubscribe": true,
    "custom_legal_footer": "100 Enterprise Way, Suite 400, San Francisco, CA 94107",
    "company_address": "MailOS Infrastructure Group",
    "branding_enabled": true
  },
  "playbooks": [],
  "smtp_credentials": [],
  "inbound_messages": [],
  "bounces": [],
  "messages": []
}
EOF

# 6. Start containers back up
echo "🚀 Starting fresh production services..."
docker compose -f deploy/docker/docker-compose.yml up -d

echo ""
echo "=========================================================="
echo "✅ Server successfully cleaned and reset to fresh production state!"
echo "🔑 Master account preserved in cred.txt"
echo "=========================================================="
