#!/usr/bin/env bash
# ==============================================================================
# ZMAIL / MailOps — AWS Production Deployment & Initialization Script
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "  ______  __  __          _____ _      "
echo " |___  / |  \/  |   /\   |_   _| |     "
echo "    / /  | \  / |  /  \    | | | |     "
echo "   / /   | |\/| | / /\ \   | | | |     "
echo "  / /__ _| |  | |/ ____ \ _| |_| |____ "
echo " /_____(_)_|  |_/_/    \_\_____|______|"
echo -e "${NC}"
echo -e "${BOLD}Enterprise Mail Operations Platform — AWS Deployment Setup${NC}\n"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCKER_DIR="${ROOT_DIR}/deploy/docker"

# 1. Verify / Install Docker Engine & Compose
echo -e "${CYAN}[1/5] Checking Docker & Docker Compose installation...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}Docker is not installed. Installing Docker Engine...${NC}"
  if command -v apt-get &> /dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y -qq apt-transport-https ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  else
    echo -e "${RED}Please install Docker Engine before running this script.${NC}"
    exit 1
  fi
fi

# Ensure current user can run docker without sudo
if ! docker ps &> /dev/null; then
  echo -e "${YELLOW}Adding $USER to docker group...${NC}"
  sudo usermod -aG docker "$USER" || true
fi

# 2. AWS EC2 Public IP & Metadata Discovery (IMDSv2 + External Consensus)
echo -e "${CYAN}[2/5] Detecting AWS EC2 Public Infrastructure...${NC}"
AWS_PUBLIC_IP=""

# Try IMDSv2 token
IMDS_TOKEN=$(curl -s --max-time 2 -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60" 2>/dev/null || true)
if [ -n "$IMDS_TOKEN" ]; then
  AWS_PUBLIC_IP=$(curl -s --max-time 2 -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" "http://169.254.169.254/latest/meta-data/public-ipv4" 2>/dev/null || true)
fi

# Fallback to external multi-provider consensus if IMDSv2 not active
if [ -z "$AWS_PUBLIC_IP" ]; then
  AWS_PUBLIC_IP=$(curl -s --max-time 3 https://icanhazip.com 2>/dev/null || curl -s --max-time 3 https://checkip.amazonaws.com 2>/dev/null || true)
  AWS_PUBLIC_IP=$(echo "$AWS_PUBLIC_IP" | tr -d '[:space:]')
fi

echo -e "  Detected Public IP: ${GREEN}${AWS_PUBLIC_IP:-Unknown}${NC}"

# 3. Initialize Required Directories & State
echo -e "${CYAN}[3/5] Initializing persistent data volumes...${NC}"
mkdir -p "${ROOT_DIR}/backend/data"
mkdir -p "${DOCKER_DIR}/spool"
mkdir -p "${DOCKER_DIR}/logs"
mkdir -p "${DOCKER_DIR}/policy"

# Ensure proper permissions for MTA kumod (uid 1000/systemd)
chmod -R 777 "${DOCKER_DIR}/spool" "${DOCKER_DIR}/logs" "${ROOT_DIR}/backend/data" 2>/dev/null || true

# 4. Prepare Environment Configuration
echo -e "${CYAN}[4/5] Configuring environment parameters...${NC}"
ENV_FILE="${DOCKER_DIR}/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp "${DOCKER_DIR}/.env.example" "$ENV_FILE"
  if [ -n "$AWS_PUBLIC_IP" ]; then
    sed -i "s/^PUBLIC_IP=.*/PUBLIC_IP=${AWS_PUBLIC_IP}/" "$ENV_FILE"
  fi
  echo -e "  Generated fresh configuration at: ${CYAN}${ENV_FILE}${NC}"
fi

# 5. Build and Launch Containers
echo -e "${CYAN}[5/5] Building and starting ZMAIL containers...${NC}"

# Verify required Dockerfiles exist before starting build
if [ ! -f "${ROOT_DIR}/backend/Dockerfile" ]; then
  echo -e "${RED}Error: ${ROOT_DIR}/backend/Dockerfile not found!${NC}"
  exit 1
fi

if [ ! -f "${ROOT_DIR}/web/Dockerfile" ]; then
  echo -e "${YELLOW}Warning: ${ROOT_DIR}/web/Dockerfile not found. Checking git submodules...${NC}"
  cd "${ROOT_DIR}" && git submodule update --init --recursive 2>/dev/null || true
  if [ ! -f "${ROOT_DIR}/web/Dockerfile" ]; then
    echo -e "${RED}Error: ${ROOT_DIR}/web/Dockerfile is still missing. Please run 'git pull' or verify your repository clone.${NC}"
    exit 1
  fi
fi

cd "${DOCKER_DIR}"
docker compose up -d --build

echo -e "\n${GREEN}${BOLD}✓ ZMAIL Platform successfully deployed!${NC}\n"

echo -e "${BOLD}Access Information:${NC}"
echo -e "  • Web Dashboard OS: ${CYAN}http://${AWS_PUBLIC_IP:-localhost}:3000${NC}"
echo -e "  • REST API Control: ${CYAN}http://${AWS_PUBLIC_IP:-localhost}:8080${NC}"
echo -e "  • Inbound/Outbound SMTP: Ports ${YELLOW}25${NC}, ${YELLOW}587${NC}, and ${YELLOW}2525${NC}\n"

echo -e "${BOLD}AWS Deployment Next Steps:${NC}"
echo -e "  1. ${YELLOW}Security Groups${NC}: Ensure ports 25, 587, 2525, 3000, and 8080 are allowed in AWS Security Groups."
echo -e "  2. ${YELLOW}Port 25 Unblock${NC}: Request AWS Support to lift the port 25 throttle on Elastic IP ${AWS_PUBLIC_IP}."
echo -e "  3. ${YELLOW}Reverse DNS (PTR)${NC}: Set PTR record in AWS EC2 Console -> Elastic IPs -> Actions -> Update reverse DNS."
echo -e "  4. ${YELLOW}DNS Records${NC}: In the ZMAIL dashboard, open 'Domains & DNS' to see suggested A, MX, and SPF records."
