# MailOps — Client Technical Master Documentation & Architecture Audit
### Comprehensive Codebase Analysis, Feature Breakdown & Operational Guide

---

## 1. Executive Answers to Core Questions

### A. Can we autodetect the host and public IP to show real DNS data?
**Yes.** 
In the current codebase:
- In `backend/internal/store/store.go` (`AddDomainWithDNS` and `GetHostConnectionInfo`), the system checks:
  1. `os.Getenv("PUBLIC_IP")`
  2. The active public IP assigned in `s.ips` (IP Pools)
  3. The request's `Host` / `X-Forwarded-Host` header via the HTTP proxy.
  4. Local network interfaces via `getPrimaryIP()`.
- **How to autodetect public IP automatically in production:**
  When deployed on a cloud VPS (AWS, Hetzner, DigitalOcean), container bridge networking makes local interface look like `172.18.0.x`. To automatically detect the host's actual public IP without manual config, the backend can issue a 1-second outbound echo lookup to `https://api.ipify.org` or read the `PUBLIC_IP` environment variable set in `docker-compose.yml`. Once detected, all DNS records (`A` record `mail.<domain> -> <PUBLIC_IP>`, SPF `v=spf1 ip4:<PUBLIC_IP> ~all`, and PTR reverse DNS) immediately reflect the actual server IP across the dashboard rather than placeholders.

---

### B. Where are the instructions to connect 3rd-party services to this SMTP?
The platform has a dedicated built-in application for this called **`SMTP Relay & Senders`** (Component: [web/src/components/apps/SmtpConnectApp.tsx](file:///home/rahul/Desktop/mailops/web/src/components/apps/SmtpConnectApp.tsx)).

Inside this app, you have 4 dedicated tabs:

1. **Connection Parameters (`/api/v1/smtp/info`)**:
   - **SMTP Host**: Your server's public domain or IP (e.g., `mail.yourdomain.com`).
   - **Ports**: 
     - `Port 25`: Standard public MTA-to-MTA transmission.
     - `Port 2525`: Alternate unprivileged submission port (ideal for cloud providers blocking port 25).
     - `Port 587`: Standard submission port with STARTTLS.
   - **Authentication**: Supports `PLAIN`, `LOGIN`, or passwordless `IP_WHITELIST`.
2. **Pre-Generated Code Snippets**:
   Ready-to-copy connection scripts for:
   - **Node.js (Nodemailer)**
   - **Python (smtplib & email.mime)**
   - **PHP (PHPMailer)**
   - **Go (net/smtp)**
   - **cURL / REST API (`POST /api/v1/inject`)**
   - **WordPress**: Configuration values for `WP Mail SMTP` or custom `functions.php`.
3. **IP Whitelisting & Relay Access (`/api/v1/smtp/whitelist`)**:
   - Allows external services, web servers, or internal microservices to send mail **without username/password** simply by whitelisting their IP or CIDR block (e.g. `203.0.113.10/32`, `10.0.0.0/8`).
   - Automatically synchronizes with the MTA's `relay_hosts` table.
4. **Live Incoming Connection Monitor (`/api/v1/smtp/connections`)**:
   - Shows active inbound SMTP connections in real time (client IP, authenticated user, protocol, status, message count).

---

### C. Is there IP Rotation?
**YES. 100% supported, active, and dynamically managed.**
- **How it works**: The platform manages multiple egress IP addresses grouped into **IP Pools** (e.g., `default`, `transactional`, `marketing-bulk`).
- **Dynamic Configuration**: When you add an IP or create an IP Pool in the dashboard ([IpPoolsApp.tsx](file:///home/rahul/Desktop/mailops/web/src/components/apps/IpPoolsApp.tsx)), the Go backend (`syncSourcesTomlLocked` in [store.go](file:///home/rahul/Desktop/mailops/backend/internal/store/store.go#L1126)) dynamically writes the IPs, pools, and assigned weights to `policy/sources.toml`.
- **MTA Outbound Distribution**: The underlying MTA reads `sources.toml` and rotates outgoing TCP connections across the active IPs in that pool using weighted round-robin.

---

### D. Is there Mailbox Rotation?
**Currently: NO.**
- "Mailbox rotation" (often used in cold outbound tools like Instantly or Smartlead to alternate between 20 different sender email inboxes like `sarah@domain1.com`, `sarah@domain2.com` to stay under daily sending limits per mailbox) is **not automated into campaigns**.
- Currently, campaigns and 1-to-1 compose allow you to choose any sender email and verified domain, but each campaign or message uses its configured `From:` address.
- To achieve mailbox separation today, users create separate campaigns or subaccounts for different mailboxes. Automated round-robin mailbox cycling across an audience list can be implemented in the campaign dispatcher.

---

## 2. Dynamic (Dashboard) vs Hardcoded (Config) Matrix

| Feature / Capability | Configurable via Dashboard? | Handled In | Details |
| :--- | :---: | :--- | :--- |
| **1-to-1 Quick Compose** | **YES (100% Dynamic)** | `CampaignsApp.tsx` | Enter recipient, select verified domain, choose IP pool, send immediately via MTA with live delivery receipt. |
| **Mass Broadcast Campaigns** | **YES (100% Dynamic)** | `CampaignsApp.tsx` | 3-mode audience (custom emails, CRM contacts, dynamic tags), Handlebars token personalization, scheduling, and batch dispatch. |
| **Visual DAG Workflows** | **YES (100% Dynamic)** | `WorkflowsApp.tsx` | Interactive canvas: trigger nodes, delay nodes, conditional branches, email nodes, live step execution. |
| **Sending Domains & DNS** | **YES (100% Dynamic)** | `DnsDomainsApp.tsx` | Add domains, live DNS verification (SPF/DKIM/DMARC/PTR), 1-click RSA DKIM generation, 1-click Cloudflare DNS sync. |
| **IP Pools & Dedicated IPs** | **YES (100% Dynamic)** | `IpPoolsApp.tsx` | Add/remove IPs, create pools, assign weights; writes directly to `sources.toml` for live MTA IP rotation. |
| **IP Warmup Automation** | **YES (100% Dynamic)** | `IpPoolsApp.tsx` | Automated daily target escalation plans (e.g. 50/day to 10k/day), pause, resume, manual stage advancement. |
| **MTA Queue Management** | **YES (100% Dynamic)** | `KumoMtaApp.tsx` | Live queue depth by destination ISP (`gmail.com`, `outlook.com`), real-time actions: **Flush Now**, **Pause**, **Resume**, **Purge**. |
| **Traffic Shaping Rate Limits** | **YES (100% Dynamic)** | `KumoMtaApp.tsx` | Set max connection rate, message rate, connection limits per destination domain; auto-generates policy. |
| **Suppression & Blacklist** | **YES (100% Dynamic)** | `SuppressionApp.tsx` | Add/delete emails or wildcard `@domain.com`, reasons (hard bounce, complaint, unsubscribe); enforced at pre-send. |
| **SMTP Relay Whitelist** | **YES (100% Dynamic)** | `SmtpConnectApp.tsx` | Add/remove authorized CIDR ranges (`192.168.1.0/24`) for passwordless relay access. |
| **Email Template Builder** | **YES (100% Dynamic)** | `TemplatesApp.tsx` | HTML/Text editor with live responsive preview, variable chips, and tag categorization. |
| **Audience Contacts CRM** | **YES (100% Dynamic)** | `ContactsApp.tsx` | Add/edit contacts, custom segmentation tags, engagement status tracking. |
| **Subaccounts & Tenancy** | **YES (100% Dynamic)** | `SubaccountsApp.tsx` | Provision isolated client accounts, enforce monthly email quotas, burst limits, and assign dedicated IP pools. |
| **Webhooks & Event Streams** | **YES (100% Dynamic)** | `WebhooksApp.tsx` | Register webhook URLs, secret HMAC keys, subscribe to 9 event types (`delivered`, `bounced`, `opened`, etc.). |
| **Inbound Mail & ARF Loops** | **YES (100% Dynamic)** | `InboundApp.tsx` | Set up inbound routes, parse incoming MIME emails, test RFC 5965 ARF spam complaint processing. |
| **MTA Inbound Listeners** | **Infrastructure (Hardcoded)** | `docker-compose.yml`, `init.lua` | Public listener ports: Port 25, 2525, 8000. Bound at container startup. |
| **Spool Storage Engine** | **Infrastructure (Hardcoded)** | `init.lua` | Uses high-performance RocksDB spooling located at `/var/spool/kumomta/data` and `/var/spool/kumomta/meta`. |
| **Redis Cache Connection** | **Infrastructure (Config)** | `docker-compose.yml` (`REDIS_URL`) | Connects to `redis:6379` for cluster state and rate caching. |
| **Mailbox Rotation (Cold Outbound)**| **Not Implemented** | Dispatcher logic | Senders are selected per campaign or per compose email, not automatically rotated per lead. |

---

## 3. Detailed File-by-File Codebase Audit

### Backend Engine (`backend/`)

#### 1. `backend/cmd/server/main.go`
- **Role**: Backend entry point and microservice bootstrapper.
- **What it does**:
  - Initializes configuration from environment variables (`PORT`, `REDIS_URL`, `KUMO_API`, `KUMO_SMTP`).
  - Initializes the high-performance memory-mapped JSON/Redis state store (`store.NewStore`).
  - Spawns background workers for automated IP warmup schedules and worker pools.
  - Starts the HTTP REST API router on port `8080`.
  - Implements graceful shutdown traps on `SIGINT` / `SIGTERM`.

#### 2. `backend/internal/api/router.go`
- **Role**: Central HTTP REST API router and request handlers (over 2,000 lines).
- **What it does**:
  - Registers all REST endpoints under `/api/v1/...`.
  - Handles CORS preflight and headers (`Access-Control-Allow-Origin: *`).
  - Provides handlers for:
    - Campaign CRUD, preview, and dispatch (`/api/v1/campaigns`, `/api/v1/campaigns/dispatch`).
    - Direct 1-to-1 message injection (`/api/v1/inject`).
    - Domain DNS management, SPF/DKIM validation, and Cloudflare auto-sync (`/api/v1/domains`, `/api/v1/domains/verify`).
    - Egress IP pools and IP address allocation (`/api/v1/ippools`, `/api/v1/ips`).
    - Automated IP warmup lifecycle (`/api/v1/warmup/*`).
    - Real-time queue telemetry and queue actions: flush, pause, resume, purge (`/api/v1/queues`, `/api/v1/queues/action`).
    - MTA node cluster status and RocksDB spool metrics (`/api/v1/nodes`).
    - Traffic shaping rules and dynamic Lua policy retrieval (`/api/v1/ratelimits`, `/api/v1/mta/lua`).
    - Suppression list management and real-time pre-send check (`/api/v1/suppressions`, `/api/v1/suppressions/check`).
    - Contact directory and CRM segmentation (`/api/v1/contacts`).
    - Email template storage (`/api/v1/templates`).
    - Webhook management and automated event triggering (`/api/v1/webhooks`).
    - Subaccount provisioning and quota enforcement (`/api/v1/subaccounts`).
    - Inbound parsing and RFC 5965 ARF feedback loop handling (`/api/v1/inbound/*`).

#### 3. `backend/internal/store/store.go`
- **Role**: Core state store, persistence engine, and business logic coordinator (over 4,100 lines).
- **What it does**:
  - Thread-safe in-memory store protected by `sync.RWMutex` with persistent snapshot serialization to `data/mailops-state.json`.
  - **`DispatchCampaign`**: Resolves campaign recipients, applies Handlebars dynamic token merging (`{{first_name}}`, `{{company}}`), checks the suppression engine circuit breaker, generates personalized RFC 5322 MIME messages, and injects them directly into KumoMTA's ESMTP socket.
  - **`syncSourcesTomlLocked`**: Whenever IPs or IP Pools are added/modified in the UI, this function rewrites `policy/sources.toml` with the exact IP addresses, pool associations, and weights, dynamically enabling live IP rotation.
  - **`syncSuppressionJsonLocked`**: Writes active suppressed emails and wildcard domains to `policy/suppressions.json` for microsecond pre-send rejection by the MTA Lua policy.
  - **`AddDomainWithDNS`**: Automatically generates 1024/2048-bit RSA DKIM key pairs, computes the SPF record, DMARC record, and MX record.
  - **`GetHostConnectionInfo`**: Computes connection parameters, detecting the host domain and public IP for 3rd-party SMTP connectivity.

#### 4. `backend/internal/models/models.go`
- **Role**: Enterprise domain models and JSON schemas (over 540 lines).
- **What it does**:
  - Defines the core data structures: `Campaign`, `QueuedMessage`, `Domain`, `SendingIP`, `IPPool`, `IPWarmupSchedule`, `Contact`, `Template`, `Subaccount`, `Webhook`, `SuppressionEntry`, `InboundRoute`, and `FeedbackReport`.

#### 5. `backend/internal/dns/resolver.go`
- **Role**: Real-time DNS and email authentication verifier.
- **What it does**:
  - Queries authoritative DNS servers for `TXT` records (SPF and DMARC verification).
  - Queries `selector._domainkey.domain.com` for DKIM public key matching.
  - Queries `MX` records to verify mail exchange routing.
  - Performs Reverse DNS (`PTR`) lookups on sending IPs to ensure forward-confirmed reverse DNS (FCrDNS).

#### 6. `backend/internal/dkim/dkim.go`
- **Role**: Cryptographic key generator and DKIM signer.
- **What it does**:
  - Generates secure RSA 2048-bit and 1024-bit private keys using Go's `crypto/rsa` and `crypto/rand`.
  - Formats the corresponding public key into standard DNS TXT record syntax (`v=DKIM1; k=rsa; p=MIIBIjANBg...`).

#### 7. `backend/internal/bounce/classifier.go`
- **Role**: Intelligent bounce code interpreter.
- **What it does**:
  - Parses RFC 3463 and RFC 1893 enhanced status codes (e.g., `5.1.1` User Unknown, `5.7.1` Policy Rejection, `4.4.2` Timeout).
  - Categorizes bounces into `hard_bounce`, `soft_bounce`, `spam_block`, or `greylisted`.
  - Automatically triggers suppression list additions upon hard bounces.

#### 8. `backend/internal/arf/parser.go`
- **Role**: RFC 5965 Abuse Reporting Format (ARF) parser.
- **What it does**:
  - Parses multipart/report emails received from ISP Feedback Loops (Yahoo CFL, Microsoft JMRP).
  - Extracts the complaining recipient, original message ID, arrival date, and abuse category.
  - Automatically suppresses the complaining user to preserve domain reputation.

#### 9. `backend/internal/ingest/worker_pool.go`
- **Role**: High-velocity message ingestion pipeline.
- **What it does**:
  - Multi-threaded worker pool that accepts high-volume API payloads and queues them concurrently without blocking HTTP responses.

#### 10. `backend/internal/redisclient/client.go`
- **Role**: Redis connection manager and distributed state coordinator.
- **What it does**:
  - Connects to Redis 7, handles rate-limit key counters, cluster pub/sub events, and distributed locks.

#### 11. `backend/internal/webhook/streamer.go`
- **Role**: Outgoing webhook dispatcher.
- **What it does**:
  - Dispatches signed HTTP POST payloads to customer endpoints with cryptographic HMAC-SHA256 signatures and automated retry backoffs.

---

### Frontend Web Desktop OS (`web/src/`)

#### 1. `web/src/components/apps/CampaignsApp.tsx`
- **Role**: The primary Campaign, 1-to-1 Compose, and Sequence Workflow command center (over 1,600 lines).
- **Features**:
  - **⚡ 1-to-1 Quick Compose**: Dedicated individual email composer with instant recipient input, contact auto-fill, verified domain selector, optional template loader, HTML/Text mode, live mobile/desktop simulated preview, and direct **"⚡ Send Email Now via MTA"** button with instant receipt confirmation.
  - **📢 Mass Broadcast Campaigns**: Create, edit, and dispatch bulk campaigns. Features 4 modular configuration cards:
    - Card 1: Sender identity, verified domain picker with SPF/DKIM badge, and egress IP pool routing.
    - Card 2: 3-mode audience selector (Custom text list, CRM contact checklist, or dynamic segmentation tag filters).
    - Card 3: Saved template selector with dynamic token chips.
    - Card 4: Schedule settings (Send Immediately vs Scheduled).
  - **🔄 Automated Sequence Workflows**: Seamlessly embeds the interactive Visual DAG Studio directly inside the window so operators can build multi-step drip automations without switching apps.

#### 2. `web/src/components/apps/KumoMtaApp.tsx` (MTA Status)
- **Role**: Real-time MTA Cluster Controller and Queue Inspector.
- **Features**:
  - **Tab 1: Cluster Nodes**: Live CPU load %, RocksDB spool disk capacity (GB used vs total), active queue depth, and host IP.
  - **Tab 2: Outgoing Delivery Queues**: Live destination queues (`gmail.com`, `yahoo.com`, `outlook.com`), ready vs deferred vs bounced counts, and direct queue actions (**Flush Now**, **Pause**, **Resume**, **Clear / Purge**).
  - **Tab 3: Traffic Shaping & Rate Limits**: Domain-level throttling (connection rate, message rate, concurrent connections) with real-time Lua policy synchronization.
  - **Tab 4: Delivery Diagnostics**: Direct raw ESMTP socket injection tester with instant trace IDs.

#### 3. `web/src/components/apps/WorkflowsApp.tsx`
- **Role**: Visual DAG Workflow Sequence Designer (n8n / Customer.io style canvas).
- **Features**:
  - Visual DAG Studio canvas displayed immediately on launch.
  - Interactive nodes: Triggers (Signup, Tag added, API call), Email actions (wired to saved templates & IP pools), Time delays, and Conditional branches.
  - Built-in "Test Step via MTA" card to test-execute individual workflow steps against any recipient.

#### 4. `web/src/components/apps/DnsDomainsApp.tsx`
- **Role**: Sending Domain Authentication and DNS Management.
- **Features**:
  - Real-time DNS status indicators for SPF, DKIM, DMARC, and PTR.
  - 1-click RSA DKIM key pair generator.
  - Automated Cloudflare DNS synchronizer via Cloudflare API token.
  - Primary sending domain selector.

#### 5. `web/src/components/apps/IpPoolsApp.tsx`
- **Role**: Sending IP Management, IP Pools & Automated Warmup.
- **Features**:
  - Create dedicated IP pools (e.g. `transactional`, `marketing`).
  - Assign dedicated IPv4 addresses and weights; dynamically syncs to `sources.toml` for live MTA IP rotation.
  - Automated progressive warmup planner (starts at 50/day and scales to 10k+/day) with pause, resume, and advance controls.

#### 6. `web/src/components/apps/SmtpConnectApp.tsx`
- **Role**: Universal SMTP Relay and 3rd-Party Integration Hub.
- **Features**:
  - Displays SMTP Host, ports (`25`, `2525`, `587`), and authentication methods.
  - Ready-to-copy code snippets for Node.js, Python, PHP, Go, cURL, and WordPress.
  - IP Whitelisting manager for passwordless relay access by CIDR ranges.
  - Real-time incoming connection logs.

#### 7. `web/src/components/apps/TemplatesApp.tsx`
- **Role**: Reusable Email Template Studio.
- **Features**:
  - Visual HTML and Plain Text editor with live desktop/mobile preview.
  - Dynamic token chips (`{{first_name}}`, `{{company}}`, `{{email}}`).
  - Template categorization and cloning.

#### 8. `web/src/components/apps/ContactsApp.tsx`
- **Role**: Audience Directory and CRM Contact Database.
- **Features**:
  - Contact management with search, company affiliation, and custom segmentation tags.
  - Engagement status tracking and bulk tag assignment.

#### 9. `web/src/components/apps/SuppressionApp.tsx`
- **Role**: Pre-Send Reputation Circuit Breaker.
- **Features**:
  - Active suppression list by email address or wildcard `@domain.com`.
  - Categorized by reason: `hard_bounce`, `spam_complaint`, `unsubscribe`.
  - Enforced at pre-send in both the Go dispatcher and MTA Lua policy.

#### 10. `web/src/components/apps/SubaccountsApp.tsx`
- **Role**: Multi-Tenant Subaccount Management.
- **Features**:
  - Provision isolated client or brand workspaces.
  - Enforce monthly email quotas and hourly burst limits.
  - Assign dedicated egress IP pools per subaccount.

#### 11. `web/src/components/apps/WebhooksApp.tsx`
- **Role**: Event-Driven Webhook Subscription Manager.
- **Features**:
  - Register webhook URLs with HMAC signing secrets.
  - Subscribe to specific delivery events (`delivered`, `bounced`, `opened`, `clicked`, `complaint`, `deferred`).
  - Built-in live payload test sender.

#### 12. `web/src/components/apps/AnalyticsApp.tsx`
- **Role**: Real-Time Delivery Performance & Telemetry.
- **Features**:
  - Delivery rates, open rates, click rates, and bounce rate metrics.
  - Destination ISP breakdown (Gmail vs Outlook vs Yahoo deliverability).
  - Hard bounce threshold warning alerts.

#### 13. `web/src/components/apps/InboundApp.tsx`
- **Role**: Inbound Email Parsing & Abuse Feedback Loop Simulator.
- **Features**:
  - Inbound MX mailbox routing rules.
  - RFC 5965 ARF spam complaint simulator to test automated suppression workflows.

#### 14. `web/src/components/os/Desktop.tsx`, `Dock.tsx`, `TopMenuBar.tsx`, `WindowFrame.tsx`
- **Role**: Custom Web Desktop Operating System Shell.
- **Features**:
  - Window manager: dragging, resizing, minimizing, maximizing, stacking z-indexes.
  - Bottom dock with active running indicator dots.
  - Top system menu bar with quick application launch, cluster health pill, and wallpaper switcher.
  - Command palette (<kbd>Cmd</kbd> + <kbd>K</kbd>) for instant navigation.

---

### Infrastructure & Deployment (`deploy/docker/`)

#### 1. `deploy/docker/docker-compose.yml`
- **Role**: Multi-container production deployment definition.
- **Services**:
  1. `kumomta`: High-speed outbound and inbound MTA daemon (`ghcr.io/kumocorp/kumomta:latest`). Exposes ports 25, 2525, 8000.
  2. `kumo-tsa`: Traffic Shaping Automation daemon reading `shaping.toml`.
  3. `redis`: Redis 7 alpine on port 6379 for cluster caching and pub/sub.
  4. `backend`: Go control plane REST API on port 8080.
  5. `web`: Next.js desktop web application on port 3000.

#### 2. `deploy/docker/policy/init.lua`
- **Role**: Core MTA policy script executed by the MTA engine.
- **What it does**:
  - Starts the ESMTP listener on `0.0.0.0:2525` and HTTP API on `0.0.0.0:8000`.
  - Configures **RocksDB** persistent message spooling at `/var/spool/kumomta`.
  - Mounts `sources.toml` for multi-IP egress pools and weighted IP rotation.
  - Mounts `suppressions.json` for microsecond pre-send circuit breaker rejection.
  - Connects to the Traffic Shaping Automation daemon (`kumo-tsa:8008`).

#### 3. `deploy/docker/policy/shaping.toml`
- **Role**: ISP-specific delivery and throttle rules.
- **What it does**:
  - Defines connection concurrency, delivery rates per second, and retry backoffs for Gmail, Yahoo, Outlook, and default domains.

#### 4. `deploy/docker/policy/sources.toml`
- **Role**: Egress IP definitions and pool bindings.
- **What it does**:
  - Dynamically updated by the Go backend (`syncSourcesTomlLocked`).
  - Maps sending IP addresses to IP pools with assigned weights for automated IP rotation.

---

## 4. Lifecycle of an Email Transmission

```
[ User Action / API Request ]
       │
       ▼
1. INGESTION & VALIDATION (Go Backend)
   - Checks recipient syntax
   - Checks Suppression Circuit Breaker (is email hard bounced or unsubscribed?)
   - Validates Sender Domain (is SPF/DKIM configured?)
   - Renders dynamic Handlebars tokens ({{first_name}}, {{company}})
       │
       ▼
2. MTA INJECTION (Port 2525 ESMTP / Port 8000 HTTP API)
   - Pre-send hook checks policy/suppressions.json
   - Resolves assigned Egress IP Pool from campaign/compose header
       │
       ▼
3. SPOOLING & QUEUE SCHEDULING (RocksDB)
   - Message persisted to /var/spool/kumomta/data and /meta
   - Destination MX records resolved via DNS
       │
       ▼
4. TRAFFIC SHAPING & IP ROTATION (TSA & sources.toml)
   - Selects outbound IP from assigned pool via weighted round-robin
   - Enforces ISP rate limit (e.g., 50 msgs/sec for Gmail)
       │
       ▼
5. OUTBOUND TRANSMISSION (ESMTP to Destination MX)
   - Negotiates STARTTLS
   - Signs MIME with 2048-bit RSA DKIM key
   - Delivers message to recipient mailbox provider
       │
       ▼
6. EVENT TELEMETRY & WEBHOOK STREAMING
   - Logs 250 OK or 4xx/5xx bounce response
   - Emits event to Redis PubSub
   - Updates Real-Time Analytics Dashboard
   - Dispatches signed HMAC webhook to external customer endpoint
```
