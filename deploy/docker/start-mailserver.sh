#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================================="
echo "  MAILOPS Enterprise Custom Mailserver (Docker Stack)     "
echo "=========================================================="

if ! command -v docker &> /dev/null; then
    echo "[-] Docker is not currently active on this system."
    echo "[!] Please run the following command to enable Docker:"
    echo "    sudo apt update && sudo apt install -y docker.io docker-compose-v2"
    echo "    sudo usermod -aG docker \$USER && sudo systemctl start docker"
    exit 1
fi

echo "[+] Pulling and building MAILOPS Mailserver containers..."
docker compose up -d

echo ""
echo "[✓] MAILOPS Custom Mailserver is running:"
echo "    - Inbound SMTP Receiver:      0.0.0.0:25 and 0.0.0.0:2525"
echo "    - KumoMTA Management API:     http://localhost:8000"
echo "    - Traffic Shaping Engine:     Running (kumo-tsa)"
echo "    - Rate-Limiting & Cache:      Running (Redis :6379)"
echo "    - MAILOPS Go Control Plane:   http://localhost:8080"
echo "    - MAILOPS Web Desktop OS:     http://localhost:3000"
echo "=========================================================="
