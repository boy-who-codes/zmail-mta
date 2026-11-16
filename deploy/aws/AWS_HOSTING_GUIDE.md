# AWS Hosting & Production Deployment Guide — ZMAIL (MailOps)

This guide provides a comprehensive walkthrough for deploying **ZMAIL** on **Amazon Web Services (AWS)** using an EC2 instance, Elastic IP, and Docker Compose.

---

## 1. AWS Infrastructure Prerequisites

### Recommended Instance Sizing
* **Development / Testing**: `t3.medium` (2 vCPUs, 4 GB RAM)
* **Production (Up to 1M emails/day)**: `c6i.large` (2 vCPUs, 4 GB RAM) or `c6i.xlarge` (4 vCPUs, 8 GB RAM)
* **High-Throughput Cluster (5M+ emails/day)**: `c6i.2xlarge` (8 vCPUs, 16 GB RAM) with EBS GP3 SSD (3,000 IOPS minimum)
* **Operating System**: **Ubuntu 22.04 LTS** or **Ubuntu 24.04 LTS** (64-bit x86_64)

---

## 2. Step-by-Step AWS Setup Walkthrough

### Step A: Launch an EC2 Instance
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/ec2/).
2. Click **Launch Instance**.
3. **Name**: `zmail-production-mta`
4. **AMI**: Ubuntu Server 24.04 LTS (HVM), SSD Volume Type.
5. **Instance Type**: Select `t3.medium` or `c6i.large`.
6. **Key Pair**: Select or generate your SSH key pair.
7. **Storage**: Configure at least **40 GB GP3** (or 100 GB for heavy spools and logs).

### Step B: Allocate & Associate an Elastic IP
Outbound mail servers require a static public IP:
1. In the left navigation menu, click **Elastic IPs** (under *Network & Security*).
2. Click **Allocate Elastic IP address** $\rightarrow$ **Allocate**.
3. Select your new Elastic IP $\rightarrow$ click **Actions** $\rightarrow$ **Associate Elastic IP address**.
4. Select your newly created `zmail-production-mta` EC2 instance and associate it.

### Step C: Configure Security Group Inbound Rules
In the EC2 Console, navigate to your instance's **Security Group** and add the following rules:

| Type | Port Range | Protocol | Source | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | `22` | TCP | `Your IP / CIDR` | Server Administration |
| **SMTP** | `25` | TCP | `0.0.0.0/0` | Public MX Inbound & Internet Mail Delivery |
| **SMTP Alternate** | `2525` | TCP | `0.0.0.0/0` | Unprivileged SMTP Relay Submission |
| **Custom TCP** | `587` | TCP | `0.0.0.0/0` | Secure ESMTP Submission (STARTTLS) |
| **HTTP** | `80` | TCP | `0.0.0.0/0` | Web UI / Let's Encrypt Challenges |
| **HTTPS** | `443` | TCP | `0.0.0.0/0` | Secure SSL Web Dashboard |
| **Custom TCP** | `3000` | TCP | `0.0.0.0/0` | ZMAIL Desktop OS Dashboard |
| **Custom TCP** | `8080` | TCP | `0.0.0.0/0` | ZMAIL REST Control Plane API |

> [!WARNING]
> Do NOT expose port `6379` (Redis) or port `8000` (MTA Management) to the public internet.

---

## 3. Critical AWS Email Requirements

### Step A: Lift AWS Port 25 Throttling
AWS throttles outbound traffic on Port 25 by default across all accounts to prevent spam.
1. Fill out the official [AWS Port 25 Removal Request Form](https://aws.amazon.com/forms/ec2-email-limit-rdns-request).
2. Enter:
   * **Your Elastic IP address**: `<YOUR_AWS_ELASTIC_IP>`
   * **Reverse DNS Record**: `mail.yourdomain.com`
   * **Use Case Description**: "Enterprise transactional email infrastructure with automated bounce handling, FBL ARF complaints processing, and explicit sender authentication."
3. AWS Support typically approves requests within 12–24 hours.

### Step B: Configure PTR (Reverse DNS)
Once AWS lifts the restriction:
1. Go to **EC2** $\rightarrow$ **Elastic IPs**.
2. Select your Elastic IP $\rightarrow$ click **Actions** $\rightarrow$ **Update reverse DNS**.
3. Set Reverse DNS to: `mail.yourdomain.com`.
4. Verify from your terminal:
   ```bash
   dig -x <YOUR_ELASTIC_IP> +short
   # Output should return: mail.yourdomain.com.
   ```

---

## 4. Deploying ZMAIL on the Instance

Connect to your AWS instance via SSH:
```bash
ssh -i your-key.pem ubuntu@<YOUR_ELASTIC_IP>
```

Clone the repository and run the automated AWS deployment script:
```bash
# 1. Clone repository
git clone https://github.com/your-org/mailops.git /opt/mailops
cd /opt/mailops

# 2. Run the automated deployment script
chmod +x deploy/aws/setup-aws.sh
./deploy/aws/setup-aws.sh
```

---

## 5. DNS Configuration Guide

In your DNS provider (Cloudflare, AWS Route 53, Namecheap, etc.), create:

| Record Type | Host / Name | Target / Value | Priority |
| :--- | :--- | :--- | :--- |
| **A** | `mail` | `<YOUR_AWS_ELASTIC_IP>` | - |
| **MX** | `@` (or subdomain) | `mail.yourdomain.com` | `10` |
| **TXT (SPF)** | `@` | `v=spf1 ip4:<YOUR_AWS_ELASTIC_IP> ~all` | - |
| **TXT (DMARC)** | `_dmarc` | `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@yourdomain.com` | - |
| **TXT (DKIM)** | `mailops._domainkey` | *(Copy the public key generated in Domains & DNS app)* | - |

---

## 6. Verification & Health Monitoring

Once deployed:
1. Open `http://<YOUR_ELASTIC_IP>:3000` in your web browser.
2. In the **Domains & DNS** app, verify the **Detected Server Infrastructure** shows your AWS Elastic IP.
3. In the **IP Pools** app, check the **Outbound IP Verification & Telemetry** tab to monitor live outbound socket bindings and delivery logs.
