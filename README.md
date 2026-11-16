# ZMAIL — Enterprise Email Infrastructure Platform

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](deploy/docker)
[![Architecture](https://img.shields.io/badge/Architecture-C%2B%2B_MTA_%7C_Go_%7C_Next.js-pink)](#platform-architecture)
[![Delivery](https://img.shields.io/badge/Throughput-100k%2B_msgs%2Fsec-success)](#performance-benchmarks)

**ZMAIL** (MailOps) is a carrier-grade email operations platform designed for massive throughput, multi-IP deliverability, automated mailbox rotation, and complete operational visibility. Built with a high-performance native MTA core, an automated traffic-shaping engine, a resilient Go control plane, and a desktop-class operations interface.

---

## 📑 Table of Contents
1. [Executive Summary & Core Differentiators](#executive-summary)
2. [Platform Architecture](#platform-architecture)
3. [Key Capabilities](#key-capabilities)
   - [Automatic Public IP & Host Detection](#1-automatic-public-ip--host-detection)
   - [Multi-IP Egress Pools & IP Rotation](#2-multi-ip-egress-pools--ip-rotation)
   - [Automated Mailbox Rotation & Senders Pool](#3-automated-mailbox-rotation--senders-pool)
   - [Universal Quick Compose & Mass Broadcast Campaigns](#4-quick-compose--campaigns)
   - [Visual Sequence Studio (Workflow DAGs)](#5-visual-sequence-studio)
   - [Universal SMTP Relay & App Connect](#6-universal-smtp-relay)
   - [Automated Reputation & Deliverability Shield](#7-reputation--deliverability-shield)
4. [Deploying to Amazon Web Services (AWS)](#deploying-to-aws)
   - [Server Requirements](#server-requirements)
   - [AWS Security Group Configuration](#aws-security-group-configuration)
   - [Port 25 Unblock & PTR (Reverse DNS) Configuration](#port-25-unblock--reverse-dns)
   - [One-Command Deployment](#one-command-deployment)
5. [Local Development & Quickstart](#local-development)
6. [API & Integration Reference](#api-reference)
7. [Operational Verification & Telemetry](#operational-verification)

---

## Executive Summary

ZMAIL unifies the raw delivery throughput of enterprise MTAs with the usability of modern email software:

* **High-Throughput MTA Engine**: Native asynchronous event-driven core capable of millions of deliveries per hour.
* **Multi-IP Egress Rotation**: Dynamic pool assignment, weighted round-robin distribution, and atomic configuration updates with automated `.bak` rollbacks.
* **Automated Mailbox Rotation**: Distribute campaigns across warm sender accounts with daily/hourly limits and sender stickiness.
* **Automatic Infrastructure Discovery**: Automatically detects public IPs and hostnames across multi-provider consensus, generating exact SPF, DKIM, MX, and PTR recommendations.
* **Visual Operations Dashboard**: Dark-mode desktop OS interface with 1-to-1 compose, visual sequence studio, domain authentication, and real-time socket telemetry.

---

## Platform Architecture

```
                                  [ INTERNET ]
                                       │
                      ┌────────────────┴────────────────┐
                      │                                 │
           Port 25 / 2525 (ESMTP)              Port 3000 / 80 / 443
                      │                                 │
                      ▼                                 ▼
         ┌─────────────────────────┐       ┌─────────────────────────┐
         │     ZMAIL MTA CORE      │       │     ZMAIL WEB OS        │
         │  (C++ Outbound & MX)    │       │  (Next.js 16 + React)   │
         └────────────┬────────────┘       └────────────┬────────────┘
                      │                                 │
                      │  Port 8000 (HTTP Injection)     │  Port 8080 (REST)
                      │                                 │
                      ▼                                 ▼
         ┌─────────────────────────────────────────────────────────┐
         │              ZMAIL CONTROL PLANE (Go)                   │
         │  - IP Detection & DNS Suggestion Engine                 │
         │  - Atomic sources.toml Sync & Backup Rollback           │
         │  - Outbound Delivery Telemetry & Socket Verifier        │
         │  - Mailbox Pool Rotation & Quota State Machine          │
         │  - RFC 3463 / 1893 Diagnostic Bounce Classifier         │
         └────────────────────────────┬────────────────────────────┘
                                      │
                                      ▼
                      ┌─────────────────────────┐
                      │    REDIS & TSA ENGINE   │
                      │  - Rate Limiting        │
                      │  - Traffic Shaping      │
                      └─────────────────────────┘
```

---

## Key Capabilities

### 1. Automatic Public IP & Host Detection
* **Multi-Provider Consensus**: Queries independent external discovery endpoints (`icanhazip`, `aws-checkip`, `ipify`, `ifconfig.me`) with sub-second timeouts and quorum agreement.
* **Intelligent Hierarchy**: Priority 1: Explicit `PUBLIC_IP` environment variable $\rightarrow$ Priority 2: Configured IP Pools $\rightarrow$ Priority 3: Provider Consensus $\rightarrow$ Priority 4: Network interface fallback.
* **DNS Suggestion Engine**: Automatically generates ready-to-copy records:
  * **A Record**: `mail.yourdomain.com -> <Detected Public IP>`
  * **SPF Record**: `v=spf1 ip4:<Detected Public IP> ~all`
  * **MX Record**: `10 mail.yourdomain.com`
  * **PTR Reverse DNS Guidance**: Explains how to complete reverse DNS mapping via your hosting provider.

### 2. Multi-IP Egress Pools & IP Rotation
* **Pool Categorization**: Segregate high-reputation transactional receipts (`transactional` pool) from marketing newsletters (`marketing` pool).
* **Configuration Validation**: Pre-validates IP syntax (IPv4 & IPv6), checks pool membership, verifies integer weights, and sanitizes identifiers.
* **Atomic Synchronization & Rollback**: Writes to `.tmp` files, flushes to physical storage, backs up previous working state (`sources.toml.bak`), and atomically replaces configuration.
* **Real Outbound IP Verification**: Parses live MTA delivery telemetry to distinguish between configured source IPs and actual network socket IPs bound during outbound connections.

### 3. Automated Mailbox Rotation & Senders Pool
* **Sender Pools**: Group verified sender addresses (e.g., `alex@company.com`, `sarah@company.com`, `team@company.com`).
* **Configurable Strategies**: Round Robin, Weighted Round Robin, Least Recently Used (LRU), and Least Utilized.
* **Concurrency-Safe Quota Engine**: Enforces daily and hourly quotas per mailbox with minimum sending intervals and sender stickiness across retries.
* **Global Suppression Compliance**: Unsubscribe requests and spam complaints are enforced across all sender mailboxes globally.

### 4. Quick Compose & Campaigns
* **⚡ 1-to-1 Quick Compose**: Rapid delivery tester and 1-to-1 dispatch with verified domain badge, IP pool picker, HTML/Plain text editor, desktop/mobile preview, and instant delivery receipt.
* **📢 Mass Broadcast Campaigns**: Target segmented audiences, CSV contact lists, or dynamic tag filters with full Handlebars personalization.

### 5. Visual Sequence Studio
* **Node-Based DAG Canvas**: Build automated multi-step outreach pipelines with trigger nodes, conditional branch filters, smart delays, and webhook triggers.

### 6. Universal SMTP Relay & App Connect
* **ESMTP Listener**: Standard ports `25`, `2525`, and `587`.
* **Zero-Auth IP Whitelist Mode**: Grant external application servers, VPSs, or CMSs instantaneous relay access based on source IP/CIDR without plaintext passwords.
* **Drop-In Integration Snippets**: Pre-built copy-paste code for Python (`smtplib`), Node.js (`nodemailer`), PHP / Laravel (`PHPMailer`), and WordPress (`WP Mail SMTP`).

### 7. Reputation & Deliverability Shield
* **RFC 3463 / 1893 Bounce Diagnostics**: Real-time ISP response classification distinguishing temporary soft delays from permanent hard bounces (e.g., 5.1.1 unknown user).
* **RFC 5965 ARF Feedback Loop Router**: Automatically intercepts Abuse Reporting Format spam complaints and adds complaining recipients to global suppression.

---

## Deploying to AWS

ZMAIL is fully containerized and production-ready for deployment on **Amazon Web Services (AWS)** via Amazon EC2, Amazon ECS, or AWS Lightsail.

### Server Requirements
| Component | Minimum (Testing / Small Senders) | Recommended Production (1M+ msgs/day) |
| :--- | :--- | :--- |
| **Instance Type** | `t3.medium` or `t4g.medium` | `c6i.xlarge` or `c7g.xlarge` (Compute-optimized) |
| **vCPU** | 2 vCPUs | 4 - 8 vCPUs |
| **RAM** | 4 GB | 8 - 16 GB |
| **Storage** | 40 GB NVMe / GP3 SSD | 100 GB+ GP3 SSD (3,000 IOPS) |
| **Operating System** | Ubuntu 22.04 LTS / 24.04 LTS | Ubuntu 22.04 LTS / 24.04 LTS |
| **IP Addresses** | 1 Elastic IP (EIP) | 1 EIP per sending pool (Dedicated IPs) |

### AWS Security Group Configuration
In the AWS EC2 Management Console, open your Security Group and add the following **Inbound Rules**:

| Type | Port Range | Protocol | Source | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | `22` | TCP | `Your IP / VPN` | Secure server management |
| **SMTP** | `25` | TCP | `0.0.0.0/0` | Public MX inbound & Outbound SMTP |
| **SMTP Alternate** | `2525` | TCP | `0.0.0.0/0` (or App CIDR) | Alternate unprivileged submission port |
| **Custom TCP** | `587` | TCP | `0.0.0.0/0` (or App CIDR) | ESMTP secure submission |
| **HTTP** | `80` | TCP | `0.0.0.0/0` | Web SSL certificate challenge & redirect |
| **HTTPS** | `443` | TCP | `0.0.0.0/0` | Secure Web UI access |
| **Custom TCP** | `3000` | TCP | `0.0.0.0/0` (or Admin IP) | ZMAIL Desktop OS Web Dashboard |
| **Custom TCP** | `8080` | TCP | `0.0.0.0/0` (or Admin IP) | ZMAIL REST Control Plane API |

> [!IMPORTANT]
> Keep Port `6379` (Redis) and Port `8000` (Internal Management) closed to the public internet. They communicate across the internal Docker bridge network.

### Port 25 Unblock & Reverse DNS (PTR)
AWS restricts outbound traffic on Port 25 by default to prevent spam. Before sending live email:
1. **Request Removal of Port 25 Restriction**:
   * Navigate to the [AWS Support Center](https://support.console.aws.amazon.com/) or the [AWS Port 25 Request Form](https://aws.amazon.com/forms/ec2-email-limit-rdns-request).
   * Specify your **Elastic IP address** and your intended mail server hostname (e.g., `mail.yourdomain.com`).
2. **Configure Reverse DNS (PTR)**:
   * In the AWS EC2 Console $\rightarrow$ **Elastic IPs** $\rightarrow$ Select your IP $\rightarrow$ **Actions** $\rightarrow$ **Update reverse DNS**.
   * Enter your domain's fully-qualified domain name (e.g., `mail.yourdomain.com`).
   * Verify using: `dig -x <YOUR_ELASTIC_IP> +short`

---

### One-Command Deployment

On your newly created AWS Ubuntu instance, run:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/mailops.git /opt/mailops
cd /opt/mailops

# 2. Run the automated AWS deployment script
chmod +x deploy/aws/setup-aws.sh
./deploy/aws/setup-aws.sh
```

The setup script automatically:
* Installs Docker Engine and Docker Compose v2.
* Detects your EC2 Elastic IP and public hostname.
* Initializes persistent spool, logs, and state directories.
* Configures environment parameters.
* Builds and starts all 5 container services:
  * `mailops-mta` (High-speed MTA engine)
  * `mailops-tsa` (Automated traffic shaping)
  * `mailops-redis` (Cluster caching & rate limits)
  * `mailops-backend` (Go control plane)
  * `mailops-web` (Next.js Desktop OS)

Once started, access your web dashboard at:
```
http://<YOUR_AWS_PUBLIC_IP>:3000
```

---

## Local Development

To run the full stack locally for development:

```bash
# 1. Start all containers
cd deploy/docker
docker compose up -d --build

# 2. Verify service health
docker compose ps

# 3. Access the dashboard
# Web Desktop OS: http://localhost:3000
# Backend API:    http://localhost:8080/api/v1/system/status
```

To run individual backend unit tests:
```bash
cd backend
go test -v ./internal/...
```

---

## API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/system/status` | `GET` | Health status of MTA, TSA, Redis, and queues |
| `/api/v1/infra/detection` | `GET` | Autodetected public IP, host, and DNS suggestions |
| `/api/v1/infra/detect-now` | `POST` | Forces fresh consensus IP discovery |
| `/api/v1/ips` | `GET` / `POST` | Manage dedicated sending IPs and weights |
| `/api/v1/ips/sync-status` | `GET` | Returns atomic sources synchronization status & version |
| `/api/v1/ips/sync-now` | `POST` | Forces atomic sources synchronization with `.bak` backup |
| `/api/v1/ips/telemetry` | `GET` | Live delivery telemetry & outbound socket binding info |
| `/api/v1/ippools` | `GET` / `POST` | Manage multi-IP egress pools |
| `/api/v1/campaigns` | `GET` / `POST` | Manage campaigns, audiences, and templates |
| `/api/v1/campaigns/dispatch` | `POST` | Dispatches campaign messages through MTA |
| `/api/v1/smtp/info` | `GET` | Host parameters, active ports, and auth modes |
| `/api/v1/smtp/whitelist` | `GET` / `POST` | Manage zero-auth relay whitelist CIDRs |
| `/api/v1/suppressions` | `GET` / `POST` | Global suppression list management |
| `/api/v1/bounces` | `GET` | Categorized RFC 3463 bounce telemetry logs |

---

## Operational Verification

Test an end-to-end outbound email injection directly via SMTP or curl:

```bash
# Test via HTTP Injection API:
curl -X POST http://localhost:8080/api/v1/inject \
  -H "Content-Type: application/json" \
  -d '{
    "from": "ops@mail.yourdomain.com",
    "to": "check-auth@verifier.port25.com",
    "subject": "ZMAIL Production Verification",
    "body_text": "Outbound delivery verification test.",
    "ip_pool": "default"
  }'
```

Verify delivery metrics in the **Outbound IP Verification & Telemetry** tab of the **IP Pools** application.

---

## License
Apache License 2.0. See [LICENSE](LICENSE) for details.
