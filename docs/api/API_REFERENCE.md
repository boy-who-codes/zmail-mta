# MailOps REST API Reference (v1)

The MailOps REST API provides comprehensive programmatic control over the carrier-grade email infrastructure, multi-sender rotation, automated deliverability warmup, DNS verification, and client connectivity.

## Base URL
```
http://localhost:8080/api/v1
```
In production, point all requests to your reverse proxy or public domain endpoint (e.g. `https://api.yourdomain.com/api/v1`).

---

## 1. Mailbox & Pool Management

### List Mailboxes
```http
GET /api/v1/mailboxes
```
Retrieves all authorized sender identities, current quota utilization, and warmup status.

#### Response `200 OK`
```json
[
  {
    "id": "mb_growth_01",
    "email": "sarah@growth.zmail.local",
    "display_name": "Sarah Jenkins",
    "first_name": "Sarah",
    "last_name": "Jenkins",
    "department": "Growth Outbound",
    "domain": "growth.zmail.local",
    "ip_pool_id": "default",
    "daily_limit": 400,
    "hourly_limit": 50,
    "min_interval_seconds": 60,
    "weight": 25,
    "smtp_host": "127.0.0.1",
    "smtp_port": 2525,
    "smtp_user": "sarah@growth.zmail.local",
    "tls_mode": "starttls",
    "warmup_enabled": true,
    "warmup_day": 4,
    "warmup_target_limit": 400,
    "warmup_strategy": "standard",
    "warmup_status": "warming",
    "enabled": true,
    "created_at": "2026-11-17T18:00:00Z"
  }
]
```

---

### Add Mailbox
```http
POST /api/v1/mailboxes
```
Registers a new sender identity and verifies domain ownership.

#### Request Body
```json
{
  "email": "alex@outbound.domain.com",
  "display_name": "Alex Mercer",
  "first_name": "Alex",
  "last_name": "Mercer",
  "department": "Enterprise Sales",
  "domain": "outbound.domain.com",
  "ip_pool_id": "default",
  "daily_limit": 300,
  "hourly_limit": 40,
  "min_interval_seconds": 90,
  "weight": 20,
  "smtp_host": "127.0.0.1",
  "smtp_port": 2525,
  "smtp_user": "alex@outbound.domain.com",
  "tls_mode": "starttls",
  "warmup_enabled": true
}
```

---

### List Mailbox Pools
```http
GET /api/v1/mailbox-pools
```
Retrieves all configured sender pools, strategies, and aggregate throughput capacities.

#### Response `200 OK`
```json
[
  {
    "id": "pool_growth_tier1",
    "name": "Growth Tier 1",
    "description": "High reputation senders for outbound pipeline",
    "strategy": "least_utilized",
    "mailbox_ids": ["mb_growth_01", "mb_growth_02"],
    "daily_capacity": 800,
    "hourly_capacity": 100,
    "enabled": true
  }
]
```

---

### Simulate Rotation Strategy
```http
POST /api/v1/mailbox-pools/simulate
```
Evaluates how a given strategy (`least_utilized`, `round_robin`, `weighted_round_robin`, `least_recently_used`) will distribute messages across recipients, strictly preserving thread continuity.

#### Request Body
```json
{
  "pool_id": "pool_growth_tier1",
  "strategy": "least_utilized"
}
```

---

## 2. SMTP Credentials & Live Handshake Tester

### List SMTP Credentials
```http
GET /api/v1/smtp/credentials
```
Retrieves all active and revoked SMTP auth credentials for external client and CRM binding.

---

### Create SMTP Credential
```http
POST /api/v1/smtp/credentials
```
#### Request Body
```json
{
  "username": "growth_worker_01",
  "password": "StrongPassword123!",
  "description": "Worker thread dispatch auth"
}
```

---

### Test SMTP Connection & Handshake
```http
POST /api/v1/smtp/test-connection
```
Performs an active probe verifying network reachability, direct TLS (port 465) or STARTTLS negotiation (port 587/2525), and PLAIN/LOGIN authentication.

#### Request Body
```json
{
  "host": "127.0.0.1",
  "port": 2525,
  "username": "zmail_master",
  "password": "MasterSecurePassword2026!",
  "tls_mode": "starttls"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "latency_ms": 12,
  "tls_version": "TLS 1.3",
  "message": "Connected and authenticated successfully (zmail-mta ESMTP Service Ready)"
}
```

---

## 3. Autonomous Warmup Engine

### Get Warmup Summary
```http
GET /api/v1/warmup/summary
```
Retrieves real-time progress for all mailboxes enrolled in warmup schedules, including ramp curves and circuit breaker status.

#### Response `200 OK`
```json
{
  "total_warming": 4,
  "total_completed": 2,
  "total_paused": 0,
  "last_evaluated_at": "2026-11-17T18:30:00Z",
  "schedules": [
    {
      "mailbox_id": "mb_growth_01",
      "email": "sarah@growth.zmail.local",
      "display_name": "Sarah Jenkins",
      "current_limit": 60,
      "target_limit": 400,
      "current_day": 4,
      "total_days": 14,
      "progress_pct": 28.57,
      "strategy": "standard",
      "status": "warming",
      "bounce_rate": 0.005,
      "spam_rate": 0.0001,
      "next_ramp_limit": 80
    }
  ]
}
```

---

### Advance Warmup Schedule (+1 Day)
```http
POST /api/v1/warmup/tick
```
Manually triggers or simulates the 24-hour evaluation cycle. Evaluates bounce and spam thresholds, executes circuit breakers if degraded, and increases daily limits according to the ramp curve.

#### Response `200 OK`
```json
{
  "total_warming": 4,
  "total_completed": 2,
  "total_paused": 0,
  "last_evaluated_at": "2026-11-17T18:35:12Z",
  "message": "Warmup schedule advanced by 1 day across 4 mailboxes"
}
```

---

## 4. 1-Click Cloudflare DNS Sync

### Sync & Verify DNS Records
```http
POST /api/v1/domains/cloudflare/sync
POST /api/v1/dns/cloudflare/sync
```
Automatically provisions SPF, DKIM (2048-bit RSA/Ed25519), DMARC (`p=quarantine`), and MX records directly into your Cloudflare DNS zone via the Cloudflare API v4.

#### Request Body
```json
{
  "api_token": "CF_API_TOKEN_XXXXX",
  "zone_id": "9a7b6c5d4e3f2a1b0c",
  "domain": "outbound.company.com",
  "server_ip": "198.51.100.25",
  "dkim_selector": "kumo",
  "dkim_public_key": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
}
```

#### Response `200 OK`
```json
{
  "domain": "outbound.company.com",
  "records_created": 4,
  "spf": "v=spf1 ip4:198.51.100.25 ~all",
  "dmarc": "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@outbound.company.com",
  "mx": "mail.outbound.company.com (Priority 10)",
  "synced_at": "2026-11-17T18:36:00Z"
}
```
