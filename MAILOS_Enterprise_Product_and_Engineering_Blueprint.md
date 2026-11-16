# MAILOS --- Enterprise Email Infrastructure Platform

## Product, architecture, implementation and screen-behaviour specification

**Product name:** MAILOS\
**Category:** Self-hosted / managed email infrastructure control plane\
**Delivery engine:** ZMAIL Core MTA\
**Primary languages:** Go, Rust, TypeScript\
**Web application:** Next.js\
**Deployment foundation:** Linux + Docker\
**Data foundation:** PostgreSQL + Cloudflare D1 + Cloudflare
R2/B2-compatible object storage\
**Document status:** Product and engineering blueprint\
**Scope:** Full enterprise-grade product specification. This is not an
MVP plan.

------------------------------------------------------------------------

# 1. Product definition

MAILOS is an enterprise email infrastructure operating system. It
provides a unified application for deploying, configuring, operating,
monitoring, securing and analysing real email delivery infrastructure.

MAILOS is not merely an SMTP relay, campaign sender or dashboard placed
over ZMAIL Core MTA. It is a control plane that manages real Linux hosts,
Docker workloads, ZMAIL Core MTA nodes, sending domains, DNS records, IP
addresses, queues, delivery policies, reputation signals, message
events, analytics, customer access and infrastructure lifecycle
operations.

The product must expose meaningful controls over the underlying system.
When an operator restarts a node, changes an egress IP assignment,
updates a ZMAIL Core MTA policy, verifies DNS, drains a queue or changes a rate
limit, MAILOS must perform the corresponding operation against the
actual infrastructure, verify the result and show the observed state.

## 1.1 Product principles

1.  **Real operations, not simulated controls.** Every operational
    control must map to an actual API, agent operation, configuration
    change or documented workflow.
2.  **Observed state is authoritative.** A submitted command is not a
    successful operation. Success is shown only after the target system
    confirms the intended state.
3.  **ZMAIL Core MTA owns delivery.** MAILOS orchestrates and observes
    delivery; it does not implement a competing SMTP delivery engine.
4.  **Linux is a first-class resource.** Hosts, interfaces, storage,
    processes, containers, firewall state, resource usage and service
    health are visible and manageable through a controlled agent.
5.  **Enterprise isolation.** Organizations, tenants, domains,
    credentials, IP pools, data, quotas and audit trails must be
    isolated.
6.  **Safe configuration lifecycle.** Configuration is generated,
    validated, versioned, deployed, observed and reversible.
7.  **Provider-responsible delivery.** Rate limits, warmup and IP
    routing support legitimate consent-based traffic and provider
    requirements. They must never be used to evade filtering, blocklists
    or provider throttling.
8.  **Data lifecycle is explicit.** Hot operational data, queryable
    analytics and long-term archives have separate retention and storage
    policies.
9.  **No fake analytics.** Metrics must be derived from identifiable
    events and their definitions must be documented.
10. **Independent screens.** Every major module is a full application
    area with its own route, navigation context, filters, tables,
    details and workflows. Do not use docked panels or miniature
    dashboard widgets as substitutes for complete screens.

## 1.2 Product boundaries

MAILOS initially focuses on outbound email infrastructure and its
management.

Included: - SMTP delivery infrastructure. - SMTP submission and HTTP
message APIs. - Domain and DNS authentication. - Sending IP and pool
management. - ZMAIL Core MTA nodes, queues, policies and traffic shaping. -
Delivery events and analytics. - Warmup and reputation monitoring. -
Sandbox and testing. - Campaigns and mail merge. - Suppression, consent
and compliance operations. - Infrastructure observability and
security. - Multi-tenant and enterprise administration.

Not part of the initial product boundary: - Full mailbox hosting for end
users. - IMAP/POP3 inbox product. - Calendar and collaboration suite. -
A replacement SMTP delivery engine. - A promise that open tracking
proves a human read a message. - An automatic mechanism for evading
provider controls.

Inbound mail processing, mailbox hosting and collaboration features may
be evaluated as separate future products.

------------------------------------------------------------------------

# 2. What MAILOS borrows from existing products

MAILOS should study established products for proven workflows, not copy
their implementation blindly.

  -----------------------------------------------------------------------
  Reference product       Product ideas to borrow MAILOS implementation
  ----------------------- ----------------------- -----------------------
  ZMAIL Core MTA                 High-performance MTA,   Primary delivery engine
                          queues, egress paths,   managed by MAILOS
                          Lua policies, traffic   
                          shaping, TSA, message   
                          injection and           
                          operational APIs        

  Mailgun                 Sending domains,        Domain, message, API
                          SMTP/API sending,       and event modules
                          message events, logs,   
                          suppression, webhooks   
                          and domain verification 

  Bird                    Deliverability          Reputation and
                          intelligence,           deliverability
                          provider-level          intelligence
                          analytics, sender       
                          reputation, campaign    
                          operations and IP       
                          management              

  Mailtrap                Email sandbox, test     Built-in isolated
                          inbox, HTML preview,    sandbox
                          MIME inspection, test   
                          workflows and debugging 

  Postal                  Self-hosted email       Self-hosted
                          delivery operations,    control-plane product
                          servers, organizations, patterns
                          message logs and IP     
                          pool workflows          

  Prometheus              Metrics collection and  Infrastructure and
                          alerting ecosystem      service metrics

  Grafana                 Operational dashboards  Internal operations and
                          and visual exploration  observability

  Docker                  Container lifecycle,    Workload runtime
                          image management,       
                          resource limits and     
                          deployment model        

  Cloudflare              DNS APIs, D1 and object DNS integration,
                          storage ecosystem       selected edge metadata
                                                  and archival storage

  Mailpit                 Lightweight local SMTP  Local development and
                          capture and development test environment
                          testing                 
  -----------------------------------------------------------------------

## 2.1 What not to copy

-   Do not recreate ZMAIL Core MTA's delivery engine.
-   Do not build a second message spool in Redis, PostgreSQL or
    RabbitMQ.
-   Do not use IP rotation to bypass spam filters, provider limits or
    reputation damage.
-   Do not treat opens as a reliable human-read metric.
-   Do not expose raw shell access as a dashboard feature.
-   Do not make a green status appear before the real system confirms
    success.
-   Do not use a single shared IP pool for unrelated tenants by default.
-   Do not keep all raw event data in PostgreSQL indefinitely.
-   Do not force every customer to use one deployment topology.

------------------------------------------------------------------------

# 3. System architecture

## 3.1 Architectural model

MAILOS has four major planes:

### A. Application and control plane

Responsible for users, organizations, permissions, product APIs,
configuration, billing/usage, workflows and orchestration.

### B. Infrastructure plane

Responsible for Linux hosts, Docker, ZMAIL Core MTA nodes, network interfaces,
storage, firewall, certificates, process health and deployment
lifecycle.

### C. Delivery plane

ZMAIL Core MTA performs SMTP delivery, queue management, retries, routing, DKIM
signing, egress path selection and traffic shaping.

### D. Data and intelligence plane

Collects logs and events, normalizes message lifecycle data, calculates
analytics, monitors reputation and archives long-term records.

## 3.2 High-level component flow

``` mermaid
flowchart TB
    UI["Next.js MAILOS Application"]
    API["Go Control Plane"]
    AUTH["Identity / RBAC / Tenant Policy"]
    CONFIG["Configuration and Deployment Manager"]
    DB[("PostgreSQL")]
    D1[("Cloudflare D1 - selected edge metadata")]
    B2[("Cloudflare B2-compatible object storage - archives")]
    CACHE[("Redis")]
    BROKER["RabbitMQ / Event Bus"]

    AGENT["Go MAILOS Node Agent"]
    DOCKER["Docker Engine"]
    MTA["ZMAIL Core MTA Nodes"]
    TSA["Native Traffic Shaping Automation"]
    HOST["Linux Host: Network / Storage / CPU / Firewall"]

    INGEST["Rust Event Ingestion"]
    ANALYTICS[("ClickHouse - queryable analytics")]
    TRACK["Rust Tracking Service"]
    DNS["DNS Providers / DNS Resolvers"]
    OBS["Prometheus / Vector / OpenTelemetry"]

    UI --> API
    API --> AUTH
    API --> CONFIG
    API --> DB
    API --> D1
    API --> CACHE
    API --> BROKER
    CONFIG --> AGENT
    AGENT --> DOCKER
    DOCKER --> MTA
    AGENT --> HOST
    MTA --> TSA
    MTA --> INGEST
    MTA --> TRACK
    INGEST --> BROKER
    BROKER --> ANALYTICS
    ANALYTICS --> B2
    API --> DNS
    OBS --> AGENT
    ANALYTICS --> API
```

## 3.3 Service ownership

  -----------------------------------------------------------------------
  Component               Language / technology   Owns
  ----------------------- ----------------------- -----------------------
  Web application         Next.js + TypeScript    User experience and
                                                  client-side workflows

  Control plane           Go                      APIs, tenant policy,
                                                  orchestration and
                                                  product logic

  Node agent              Go                      Real Linux and Docker
                                                  operations

  Event ingestion         Rust                    High-throughput event
                                                  intake, parsing and
                                                  normalization

  Tracking service        Rust                    Open/click redirect and
                                                  pixel endpoints, event
                                                  emission

  Campaign worker         Go                      Campaign scheduling,
                                                  recipient expansion and
                                                  submission workflows

  DNS manager             Go                      DNS provider
                                                  integrations and
                                                  verification

  Configuration manager   Go                      MTA configuration
                                                  generation, validation,
                                                  versioning and rollout

  ZMAIL Core MTA                 ZMAIL Core MTA + Lua           SMTP delivery and
                                                  delivery lifecycle

  Analytics               ClickHouse              High-volume analytical
                                                  queries

  Primary relational      PostgreSQL              Authoritative
  database                                        transactional product
                                                  state

  Edge metadata           Cloudflare D1           Carefully selected
                                                  low-volume
                                                  edge/application
                                                  metadata

  Archive/object store    Cloudflare R2 or        Long-term raw events,
                          Backblaze B2            exports, archives and
                                                  large objects

  Cache/coordination      Redis                   Cache, short-lived
                                                  state and coordination

  Application event       RabbitMQ                Asynchronous
  broker                                          application jobs and
                                                  event distribution

  Metrics                 Prometheus              Infrastructure and
                                                  service metrics

  Logs                    Vector                  Log collection and
                                                  forwarding

  Tracing                 OpenTelemetry           Distributed tracing
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 4. Data architecture: PostgreSQL, D1 and B2

The storage choices must have clear responsibilities. D1 and B2 are not
interchangeable with PostgreSQL or ClickHouse.

## 4.1 PostgreSQL --- authoritative operational database

PostgreSQL remains the source of truth for transactional and relational
product state.

Store: - Organizations and tenants. - Users, teams, roles and
permissions. - Nodes and cluster metadata. - Domains and DNS
configuration state. - IP inventory and pool assignments. - SMTP
credentials metadata and API key hashes. - Configuration revisions. -
Campaign definitions and schedules. - Message metadata needed for
operational lookup. - Suppression records and consent evidence. -
Webhook subscriptions and delivery state. - Audit logs and security
events. - Billing plans, quotas and usage summaries. - Retention
policies and archive manifests.

Do not use PostgreSQL as an infinite event warehouse. Apply
partitioning, retention, indexes and archival policies to high-volume
tables.

## 4.2 Cloudflare D1 --- selected edge metadata

D1 is SQLite-based managed database infrastructure. It should be used
only where its deployment model, access patterns and limits make sense.

Potential uses: - Edge-facing configuration snapshots. - Small tenant or
domain lookup datasets needed by edge workers. - Tracking-link routing
metadata. - Public endpoint configuration. - Lightweight regional/edge
lookup tables. - Small idempotency or routing metadata datasets, where
consistency requirements are understood.

D1 must not become the authoritative store for: - High-volume delivery
events. - ZMAIL Core MTA message spool. - Large message bodies or
attachments. - High-write queue state. - Large analytical datasets. -
Core transactional workflows that require PostgreSQL's relational and
operational capabilities.

PostgreSQL remains authoritative. D1 receives deliberate, versioned
projections or edge-optimized copies. Define synchronization, conflict
handling, freshness and fallback behaviour.

If MAILOS runs entirely on a self-hosted Linux installation, D1 is an
optional Cloudflare integration, not a mandatory local dependency. The
product must still work when D1 is not configured.

## 4.3 B2 / object storage --- long-term and large data

Use Backblaze B2 or Cloudflare R2 as S3-compatible object storage,
depending on deployment and commercial requirements.

Store: - Compressed raw SMTP and delivery event archives. - Long-term
structured event exports. - Large log bundles. - Message source/MIME
archives when retention is explicitly enabled. - Campaign import source
files. - Report exports. - Diagnostic bundles. - Backup artifacts. -
Historical analytics snapshots. - Configuration backups and deployment
artifacts. - Large attachments only where product policy permits.

Object storage is not a query database. Use ClickHouse for interactive
analytical queries and object storage for durable, inexpensive
retention.

### Archive lifecycle

1.  Event arrives and is normalized.
2.  Operationally useful event is written to ClickHouse.
3.  Required transactional summary is written to PostgreSQL.
4.  Raw event batch is compressed and written to B2/R2.
5.  Archive manifest is committed to PostgreSQL.
6.  Retention policy expires hot data only after archive verification.
7.  Restore and replay workflows can retrieve archived batches.

Archive objects should include: - Tenant identifier. - Data category. -
Time range. - Schema version. - Compression format. - Object checksum. -
Encryption metadata. - Retention class. - Archive manifest identifier.

Use tenant-aware object key prefixes and encryption. Do not expose
public object URLs for private archives.

## 4.4 ClickHouse --- analytical query store

ClickHouse is strongly recommended for enterprise-scale delivery
analytics.

Store queryable events such as: - Accepted. - Delivered/remote
accepted. - Deferred. - Bounced. - Complained. - Unsubscribed. - Open
pixel requested. - Click redirect visited. - Queue transitions. -
Provider response. - Sending IP attribution. - Campaign attribution. -
Delivery latency.

Partition by event date and use tenant-aware access filters. Design
retention tiers and materialized aggregates.

If ClickHouse is unavailable, buffer events durably and alert. Do not
silently drop delivery events.

## 4.5 Retention classes

  -----------------------------------------------------------------------
  Data class              Primary storage         Retention policy
  ----------------------- ----------------------- -----------------------
  Current configuration   PostgreSQL              While active + audit
                                                  policy

  Credentials/secrets     Secret manager /        Rotation and deletion
                          encrypted metadata      policy

  Recent message lookup   PostgreSQL              Configurable
                                                  operational window

  High-volume events      ClickHouse              Configurable hot window

  Raw event archive       B2/R2                   Contract and compliance
                                                  policy

  Large diagnostic        B2/R2                   Short-lived by default
  bundles                                         

  Metrics                 Prometheus              Operational retention

  Logs                    Vector to selected log  Tiered retention
                          store / B2 archive      

  Campaign source files   B2/R2                   Customer policy

  Audit logs              PostgreSQL + immutable  Long-term policy
                          archive                 
  -----------------------------------------------------------------------

Never assume that all data should be retained forever. Provide
organization-level retention controls, legal holds where required and
verified deletion workflows.

------------------------------------------------------------------------

# 5. Linux and Docker infrastructure control

This is a core differentiator. The dashboard must control real Linux
infrastructure through an authenticated node agent.

## 5.1 MAILOS Node Agent

The Go agent runs on each managed Linux host. It communicates with the
control plane over authenticated TLS/mTLS and reports observed state.

### Host inventory and observation

-   Hostname and machine identity.
-   Operating system and kernel.
-   CPU model, core count and utilization.
-   Memory total, available and utilization.
-   Disk devices, partitions, mount points and usage.
-   Network interfaces and throughput.
-   IP addresses and routes.
-   Process and service health.
-   Docker daemon health.
-   Container inventory and resource usage.
-   Clock synchronization status.
-   Host uptime.
-   Certificate expiry observations.

### Permitted infrastructure operations

-   Register and de-register nodes.
-   Deploy approved container workloads.
-   Pull and verify approved images.
-   Start, stop and restart containers.
-   Inspect container health and logs.
-   Apply container resource limits.
-   Drain a node before maintenance.
-   Validate mounted storage.
-   Inspect IP/interface state.
-   Apply approved network configuration plans.
-   Inspect firewall state.
-   Apply approved firewall changes with safeguards.
-   Install or renew approved certificates.
-   Deploy versioned ZMAIL Core MTA configuration.
-   Run documented ZMAIL Core MTA health and diagnostic operations.

### Security requirements

-   Agent identity and certificate rotation.
-   mTLS.
-   Signed, expiring operation requests.
-   Strict allowlisted operation types.
-   No arbitrary shell command API.
-   No public Docker socket.
-   No unrestricted Docker socket mount into the control plane.
-   Per-operation authorization.
-   Audit records.
-   Rate limits and replay protection.
-   Safe rollback for configuration and network changes.
-   Agent update signing and version verification.

The agent may need narrowly scoped privileged capabilities. Document and
minimize them. Do not run every application container as privileged or
root.

## 5.2 Docker management

MAILOS must expose actual Docker state: - Containers and images. -
Running, stopped, restarting and unhealthy states. - Container logs. -
CPU and memory usage. - Restart count. - Health checks. - Image version
and digest. - Mounts and persistent volumes. - Network attachments. -
Resource limits. - Deployment history.

A container action must be executed through the agent and Docker Engine
API, then verified against observed container state.

## 5.3 Host networking

IP management must distinguish: 1. IP exists in MAILOS inventory. 2. IP
is assigned to a node. 3. IP is configured on a Linux interface. 4. IP
is routable and usable. 5. IP is selected by ZMAIL Core MTA egress
configuration. 6. IP has verified PTR/rDNS and appropriate forward
mapping.

Do not mark an IP ready merely because an operator entered it in a form.

Public IP provisioning and PTR/rDNS often require provider-side
configuration. MAILOS can guide and verify; it cannot claim to control a
provider's network unless an integration actually supports that
operation.

## 5.4 Firewall and network safety

-   Use nftables on supported Linux distributions.
-   Generate and validate a complete ruleset before applying it.
-   Preserve management access during updates.
-   Use timed rollback for risky remote firewall changes.
-   Require explicit approval for operations that can disconnect a node.
-   Audit before/after state.
-   Never expose arbitrary firewall command input.

------------------------------------------------------------------------

# 6. ZMAIL Core MTA integration

ZMAIL Core MTA is the delivery engine. MAILOS manages it through supported
interfaces and versioned configuration.

## 6.1 ZMAIL Core MTA responsibilities

-   SMTP delivery.
-   SMTP listeners and message injection.
-   Queue and spool lifecycle.
-   Delivery retry behaviour.
-   Egress path selection.
-   Source IP selection.
-   DKIM signing.
-   SMTP response processing.
-   Lua policy execution.
-   Traffic shaping.
-   Provider-specific delivery policies.
-   Delivery logs and operational status.

## 6.2 MAILOS responsibilities

-   Node and cluster lifecycle.
-   ZMAIL Core MTA deployment.
-   Configuration generation and versioning.
-   Configuration validation.
-   Policy templates and safe overrides.
-   Domain and tenant mapping.
-   IP pool orchestration.
-   Traffic-shaping policy management.
-   Queue visibility and controlled operations.
-   Event collection and analytics.
-   Alerts and diagnostics.
-   Audit and rollback.

## 6.3 Configuration management lifecycle

Never edit the live ZMAIL Core MTA configuration directly from a browser
request.

1.  Operator changes a setting.
2.  Go control plane checks authorization and policy.
3.  Configuration manager creates a proposed revision.
4.  Generator renders the required Lua/TOML/config files.
5.  Static validation runs.
6.  ZMAIL Core MTA-specific validation runs where supported.
7.  Diff is shown to the operator.
8.  Revision is stored immutably.
9.  Approved deployment is sent to the node agent.
10. Agent writes files atomically and applies the documented
    reload/restart procedure.
11. Runtime health and effective configuration are checked.
12. Revision is marked active only after verification.
13. Failure triggers a safe rollback where possible.
14. Full operation is audited.

Support: - Revision history. - Diff view. - Validation errors. -
Per-node deployment status. - Staged rollout. - Canary node. -
Rollback. - Configuration drift detection. - Desired state versus
observed state.

## 6.4 ZMAIL Core MTA management screens

-   MTA overview.
-   Nodes and clusters.
-   SMTP listeners.
-   Egress paths.
-   IP source configuration.
-   Lua policy management.
-   Traffic shaping.
-   TSA status.
-   Queue inspection.
-   Message inspection.
-   Configuration revisions.
-   Runtime diagnostics.
-   Logs and SMTP responses.

Use supported ZMAIL Core MTA APIs, documented CLI operations, configuration
interfaces and structured logs. Do not rely on scraping undocumented
internal state.

------------------------------------------------------------------------

# 7. Complete product modules and features

## 7.1 Infrastructure Center

### Purpose

Manage every Linux node and Docker workload participating in MAILOS.

### Features

-   Node enrollment and certificate issuance.
-   Node inventory and grouping.
-   Multi-region and location metadata.
-   Node health.
-   CPU, memory, disk and network metrics.
-   Docker container management.
-   Image and version management.
-   Resource limits.
-   Persistent volume visibility.
-   Container logs.
-   Host logs.
-   Maintenance mode.
-   Drain and rejoin workflows.
-   Node deployment history.
-   Agent version and health.
-   Configuration drift.
-   Host security posture.
-   Backup and restore status.

### Screens

1.  Infrastructure Overview.
2.  Nodes.
3.  Node Details.
4.  Containers.
5.  Container Details.
6.  Images.
7.  Storage and Volumes.
8.  Network Interfaces.
9.  Firewall.
10. Host Processes and Services.
11. Deployment History.
12. Maintenance Operations.
13. Agent Management.

### Screen behaviour

-   The node list shows observed health, last check-in, OS, region,
    resource utilization, assigned roles and active alerts.
-   Opening a node navigates to a full Node Details route, not a dock or
    small overlay.
-   Node Details provides separate sections for overview, resources,
    containers, network, storage, logs, configuration, security and
    history.
-   Restart, drain, maintenance and removal actions require confirmation
    and permission checks.
-   Resource charts use real agent or host metrics with timestamps and
    data freshness.
-   Missing telemetry is shown as unavailable/stale, never as zero.
-   Container actions show requested state and observed state
    separately.
-   Node removal checks dependencies, active queues, cluster membership
    and data/spool ownership before allowing the operation.

## 7.2 SMTP & API Center

### Purpose

Manage SMTP access and application-level message submission.

### Features

-   SMTP endpoints.
-   Submission ports and TLS policy.
-   SMTP authentication credentials.
-   Credential scopes.
-   Credential rotation and revocation.
-   API keys.
-   API key scopes and expiry.
-   Tenant sending quotas.
-   Per-credential quotas.
-   Sender identities.
-   Message injection API.
-   SMTP connection logs.
-   Authentication failure monitoring.
-   Rate limit policy.
-   Message-ID lookup.
-   Submission diagnostics.
-   SDK and integration documentation.

### Screens

1.  SMTP Overview.
2.  SMTP Endpoints.
3.  Credentials.
4.  Credential Details.
5.  API Keys.
6.  Sender Identities.
7.  Submission Logs.
8.  API Usage.
9.  SMTP Diagnostics.
10. Integration Guide.

### Screen behaviour

-   Show the real endpoint, port, TLS mode and authentication method for
    each configured environment.
-   Display secrets only once at creation; store hashes or encrypted
    secret references as appropriate.
-   Credential details show scopes, owner, creation time, last use, last
    source and expiry.
-   Rotation creates a replacement credential before revoking the old
    one.
-   Submission logs allow filtering by tenant, credential, time, result,
    source and message ID.
-   API usage is calculated from actual accepted requests, not frontend
    estimates.
-   Documentation examples are generated from the selected endpoint and
    credential type without exposing live secrets.

## 7.3 Domain & DNS Center

### Purpose

Configure and verify sending-domain authentication and routing
prerequisites.

### Features

-   Add and verify sending domains.
-   Domain ownership verification.
-   SPF generation and verification.
-   DKIM key generation and rotation.
-   DMARC generation and analysis.
-   MX diagnostics where relevant.
-   A/AAAA checks.
-   PTR/rDNS verification.
-   Forward-confirmed reverse DNS checks.
-   Return-path configuration.
-   Custom tracking domain.
-   DNS provider integrations.
-   Cloudflare DNS API integration.
-   Manual DNS instructions.
-   Propagation checks.
-   Record history.
-   DNS health alerts.
-   Domain status and dependency map.

### Screens

1.  Domain Overview.
2.  Domain Directory.
3.  Add Domain.
4.  Domain Details.
5.  DNS Records.
6.  DKIM Keys.
7.  SPF Analysis.
8.  DMARC Analysis.
9.  PTR and Reverse DNS.
10. Tracking Domains.
11. DNS Provider Connections.
12. Verification History.

### Screen behaviour

-   Adding a domain creates a pending domain record and a verification
    workflow.
-   Each DNS record displays expected value, observed value, record
    type, lookup time, status and exact mismatch.
-   DNS checks distinguish authoritative answers, recursive resolver
    results and propagation uncertainty.
-   DKIM private keys are protected as secrets and never shown again
    after creation.
-   Key rotation supports overlapping selectors and a controlled
    transition period.
-   Domain readiness is derived from required checks and policy, not
    manually toggled.
-   A degraded domain explains which records failed and which sending
    capabilities are affected.
-   DNS publishing requires an authorized provider connection or
    explicit manual confirmation.

## 7.4 IP & Egress Management

### Purpose

Manage sending IP inventory, egress paths, pools and reputation
isolation.

### Features

-   IP inventory.
-   IPv4 and IPv6 metadata.
-   Provider and region.
-   Host/node assignment.
-   Linux interface verification.
-   PTR/rDNS verification.
-   Forward DNS verification.
-   Egress source mapping.
-   IP pools.
-   Tenant-to-pool assignment.
-   Weighted distribution.
-   Per-IP limits.
-   Pool health.
-   Provider performance.
-   Reputation history.
-   Blocklist monitoring.
-   Quarantine and reactivation.
-   IP lifecycle and decommissioning.
-   Dedicated IP assignment.
-   IP ownership evidence.

### Screens

1.  IP Overview.
2.  IP Inventory.
3.  IP Details.
4.  IP Pools.
5.  Pool Details.
6.  Egress Paths.
7.  Tenant Assignments.
8.  Reputation.
9.  Blocklist Monitoring.
10. IP Health History.
11. IP Lifecycle.

### Screen behaviour

-   IP inventory distinguishes configured, assigned, observed, routable,
    verified and active states.
-   Pool details show actual member IPs, distribution policy, assigned
    tenants and current traffic.
-   Distribution weights are validated and shown as intended policy
    versus observed traffic.
-   Quarantining an IP prevents new assignments and triggers a
    controlled routing policy update.
-   Existing queues are handled through a safe drain/rebind plan where
    supported.
-   Reassignment requires checks for tenant ownership, active messages,
    DNS, PTR and policy compatibility.
-   Reputation is a composite diagnostic, not a claim that MAILOS has
    access to a provider's private reputation score.
-   External blocklist results show source, timestamp and confidence.

IP routing must not be used to evade provider filtering, throttling or
blocklists. Rotation is controlled distribution across legitimate
configured infrastructure, with reputation isolation and provider
compliance.

## 7.5 Delivery & Queue Center

### Purpose

Expose real ZMAIL Core MTA queue and message lifecycle operations.

### Features

-   Queue overview.
-   Ready, scheduled and deferred messages.
-   Queue age.
-   Queue depth.
-   Queue throughput.
-   Retry inspection.
-   SMTP response classification.
-   Destination provider grouping.
-   Message inspection.
-   Queue suspension/resumption.
-   Controlled message rebinding.
-   Drain operations.
-   Delivery latency.
-   Queue health alerts.
-   Message trace.
-   Node attribution.
-   Spool capacity monitoring.

### Screens

1.  Queue Overview.
2.  Queue Directory.
3.  Queue Details.
4.  Message Search.
5.  Message Details.
6.  Delivery Trace.
7.  Deferred Messages.
8.  SMTP Response Explorer.
9.  Queue Operations.
10. Spool Health.

### Screen behaviour

-   Queue counts come from ZMAIL Core MTA's supported operational interfaces
    and are timestamped.
-   Search supports message ID, recipient/domain where permitted,
    tenant, campaign, time and result.
-   Message Details shows lifecycle events, current state, destination,
    selected egress path/IP, attempts and SMTP responses.
-   Message content is access-controlled and hidden by default.
-   Rebind, suspend, resume and drain actions explain scope and impact
    before execution.
-   Queue operations show operation progress and actual result.
-   Spool warnings include node, filesystem, capacity, growth trend and
    remediation guidance.
-   No screen invents a delivery result when the receiving server has
    not provided one.

## 7.6 Traffic Shaping & Rate Limits

### Purpose

Manage safe delivery throughput and provider-specific policy.

### Features

-   Global limits.
-   Tenant limits.
-   Domain limits.
-   IP limits.
-   IP-pool limits.
-   Provider-specific shaping.
-   Connection concurrency.
-   Connection creation rate.
-   Messages per connection.
-   Messages per second/hour/day.
-   Queue priority.
-   Retry policy.
-   Deferral handling.
-   ZMAIL Core MTA TSA integration.
-   Policy versioning.
-   Policy simulation/validation.
-   Policy history.
-   Alert thresholds.

### Screens

1.  Traffic Overview.
2.  Global Policies.
3.  Provider Policies.
4.  Tenant Limits.
5.  Domain Limits.
6.  IP Limits.
7.  Pool Limits.
8.  TSA Status.
9.  Policy Editor.
10. Policy History.

### Screen behaviour

-   Every policy shows its scope, owner, effective value, source, last
    update and target nodes.
-   The editor validates conflicts between global, tenant, domain, IP
    and provider limits.
-   The UI shows which rule wins when multiple policies apply.
-   Changes are versioned and deployed through the configuration
    manager.
-   Provider responses and deferral trends are visible beside policy
    settings.
-   Automatic adjustment requires guardrails, explainable reasons,
    limits and audit records.
-   Policies must reduce traffic when provider feedback indicates
    throttling or reputation deterioration.
-   No policy may be designed to bypass provider controls.

## 7.7 Warmup & Reputation Center

### Purpose

Manage responsible onboarding of new sending IPs and domains, with
evidence-based progression.

### Features

-   IP warmup plans.
-   Domain warmup plans.
-   Warmup schedule.
-   Daily and hourly targets.
-   Provider distribution.
-   Actual versus planned volume.
-   Engagement and complaint signals where available.
-   Bounce and deferral thresholds.
-   Automatic pause.
-   Manual pause/resume.
-   Warmup history.
-   Readiness checklist.
-   Reputation diagnostics.
-   Blocklist alerts.
-   Provider-specific health trends.

### Screens

1.  Warmup Overview.
2.  Warmup Plans.
3.  Create Warmup Plan.
4.  Warmup Details.
5.  IP Reputation.
6.  Domain Reputation.
7.  Provider Health.
8.  Warmup History.
9.  Reputation Alerts.

### Screen behaviour

-   A warmup plan requires a verified domain, configured IP, correct
    authentication and an approved traffic source.
-   Planned volume is illustrative until sufficient delivery evidence
    exists.
-   Progression is adaptive and may remain flat or decrease.
-   Complaint, bounce, deferral and provider response thresholds can
    pause a plan.
-   A paused plan explains the exact trigger and required operator
    action.
-   Warmup must use real, permission-based recipients and genuine
    traffic. No artificial engagement or fake recipient activity.
-   Do not promise inbox placement or a guaranteed reputation score.

## 7.8 Analytics & Deliverability Intelligence

### Purpose

Provide drillable, event-backed operational and customer analytics.

### Features

-   Accepted messages.
-   Remote accepted/delivered events.
-   Deferred messages.
-   Hard and soft bounces.
-   Complaints.
-   Unsubscribes.
-   Opens.
-   Clicks.
-   Delivery latency percentiles.
-   Queue latency.
-   SMTP response codes.
-   Provider analytics.
-   Domain analytics.
-   IP analytics.
-   Pool analytics.
-   Tenant analytics.
-   Campaign analytics.
-   Time comparisons.
-   Export.
-   Scheduled reports.
-   Retention and archive status.

### Screens

1.  Analytics Overview.
2.  Delivery Analytics.
3.  Provider Analytics.
4.  Domain Analytics.
5.  IP Analytics.
6.  Pool Analytics.
7.  Tenant Analytics.
8.  Campaign Analytics.
9.  SMTP Response Analytics.
10. Latency Analytics.
11. Reports.
12. Data Export.

### Screen behaviour

-   Every metric has a documented definition, source event, time basis
    and known limitations.
-   Filters include time range, tenant, domain, IP, pool, provider,
    campaign and event type.
-   Charts support drill-down to the underlying messages or event
    sample.
-   Comparisons use the same timezone and denominator.
-   Ingestion lag and missing-data indicators are visible.
-   Open rate is explicitly labelled as an imperfect proxy because
    privacy proxies and automated image fetching can inflate it.
-   Delivery means remote server acceptance when that is the available
    evidence; it does not guarantee inbox placement or human visibility.
-   Export jobs run asynchronously and produce access-controlled archive
    objects.

## 7.9 Mail Sandbox & Testing

### Purpose

Provide safe email development and diagnostics inspired by Mailtrap and
Mailpit.

### Features

-   Isolated SMTP capture endpoint.
-   Sandbox inboxes.
-   Test projects.
-   Test credentials.
-   HTML preview.
-   Plain-text preview.
-   Raw MIME source.
-   Header inspection.
-   Attachment inspection.
-   Authentication checks.
-   Spam scoring integration.
-   Template preview.
-   Test recipient simulation.
-   Bounce/defer simulation.
-   API testing.
-   Message comparison.
-   Test history.

### Screens

1.  Sandbox Overview.
2.  Sandbox Projects.
3.  Sandbox Inboxes.
4.  Inbox Details.
5.  Message Preview.
6.  Raw MIME Inspector.
7.  Header Inspector.
8.  Spam Test.
9.  Template Test.
10. Test API Credentials.
11. Test History.

### Screen behaviour

-   Sandbox traffic is captured and cannot reach real recipients.
-   Sandbox credentials are separate from production credentials.
-   Each captured message shows headers, MIME parts, HTML, text and
    attachments.
-   HTML preview is isolated to prevent active content from accessing
    the application.
-   Test messages can be compared by headers, body and rendering.
-   Spam testing shows the test engine/version and explains that a score
    is diagnostic, not a deliverability guarantee.
-   Simulated bounces are clearly marked as simulated and never counted
    as real provider events.

## 7.10 Campaigns & Mail Merge

### Purpose

Support legitimate transactional and permission-based campaign
workflows.

### Features

-   CSV and XLSX import.
-   Field mapping.
-   Duplicate detection.
-   Address validation.
-   Contact lists.
-   Segments.
-   Consent source and timestamp.
-   Custom fields.
-   Template library.
-   HTML and text content.
-   Personalization variables.
-   Preview per recipient.
-   Test send.
-   Scheduling.
-   Throttling.
-   Unsubscribe management.
-   Suppression checks.
-   Bounce handling.
-   Campaign event analytics.
-   Import/export history.

### Screens

1.  Campaign Overview.
2.  Campaign Directory.
3.  Campaign Details.
4.  Create Campaign.
5.  Audience Lists.
6.  Audience Details.
7.  Import Contacts.
8.  Field Mapping.
9.  Segments.
10. Template Library.
11. Template Editor.
12. Preview.
13. Schedule.
14. Campaign Delivery.
15. Campaign Analytics.
16. Unsubscribe Center.

### Screen behaviour

-   Import validates file type, encoding, column mapping, duplicates and
    invalid addresses before committing contacts.
-   Consent source and timestamp are required for marketing audiences.
-   The recipient preview renders the actual personalized output for
    selected rows.
-   Test sends use approved test destinations or sandbox.
-   Campaign launch shows audience count, exclusions, suppression count,
    schedule, sending domain, IP pool and rate policy.
-   Launch requires permission and an explicit confirmation.
-   Unsubscribe and complaint events update suppression state before
    later sends.
-   Campaign cancellation stops future submission while accurately
    reporting messages already accepted by ZMAIL Core MTA.
-   Transactional and marketing traffic are separated by policy and
    access controls.

## 7.11 Message Tracking

### Purpose

Provide controlled engagement tracking and attribution.

### Features

-   Tracking domains.
-   Open pixel endpoint.
-   Click redirect endpoint.
-   Signed tracking tokens.
-   Campaign attribution.
-   Message attribution.
-   Link validation.
-   Bot/proxy classification where possible.
-   Privacy controls.
-   Tracking disablement per tenant/campaign.
-   Retention controls.

### Screens

1.  Tracking Overview.
2.  Tracking Domains.
3.  Link Analytics.
4.  Open Analytics.
5.  Tracking Events.
6.  Privacy Settings.

### Screen behaviour

-   Tracking tokens are opaque, signed and scoped.
-   Redirects validate destinations and prevent open redirects.
-   Tracking domains require DNS and TLS verification.
-   Open and click data is labelled as observed requests, not proof of
    human intent.
-   Known privacy proxy and bot patterns are classified cautiously.
-   Recipient IP addresses are not retained by default for engagement
    tracking.
-   Tenant policy can disable tracking and configure retention.
-   Tracking endpoints are isolated from the control plane and protected
    against abuse.

## 7.12 Automation & Webhooks

### Purpose

Let customers and operators react to infrastructure and message events.

### Features

-   Event subscriptions.
-   Signed webhooks.
-   Secret rotation.
-   Delivery retries.
-   Exponential backoff.
-   Dead-letter queue.
-   Replay.
-   Event filtering.
-   Automation workflows.
-   Bounce suppression automation.
-   Complaint suppression automation.
-   Infrastructure alerts.
-   Campaign triggers.
-   Workflow history.

### Screens

1.  Automation Overview.
2.  Workflow Directory.
3.  Workflow Builder.
4.  Workflow Details.
5.  Webhook Endpoints.
6.  Webhook Details.
7.  Delivery Attempts.
8.  Replay Center.
9.  Event Catalog.
10. Automation Logs.

### Screen behaviour

-   Workflow steps have typed inputs and outputs.
-   Every execution records trigger, steps, result, timing and errors.
-   Webhook payloads are signed and include event IDs for idempotency.
-   Failed deliveries retry according to policy and eventually enter a
    dead-letter state.
-   Replay is permission-controlled and clearly marked.
-   Sensitive message content is excluded from payloads by default.
-   Automation cannot silently override tenant, consent or suppression
    policy.

## 7.13 Monitoring & Alerting

### Purpose

Expose infrastructure and delivery health with actionable diagnostics.

### Features

-   Host health.
-   Docker health.
-   ZMAIL Core MTA health.
-   Queue depth.
-   Queue age.
-   Spool capacity.
-   SMTP listener health.
-   CPU/memory/disk/network.
-   Event ingestion lag.
-   Database health.
-   Broker health.
-   DNS failures.
-   TLS/certificate expiry.
-   IP health.
-   Provider deferrals.
-   Bounce and complaint spikes.
-   Alert routing.
-   Alert acknowledgement.
-   Escalation policies.
-   Maintenance windows.

### Screens

1.  Monitoring Overview.
2.  Service Health.
3.  Host Metrics.
4.  ZMAIL Core MTA Metrics.
5.  Queue Monitoring.
6.  Event Pipeline.
7.  Database Monitoring.
8.  Alert Directory.
9.  Alert Details.
10. Notification Policies.
11. Maintenance Windows.
12. Incident History.

### Screen behaviour

-   Alerts include severity, source, first-seen time, last-seen time,
    affected resources and diagnostic evidence.
-   Alert acknowledgement does not resolve the underlying condition.
-   Recovery is based on observed metrics and health checks.
-   Maintenance windows suppress only configured alert classes and
    remain auditable.
-   Dashboards show telemetry freshness and scrape/ingestion gaps.
-   Operators can navigate from alert to affected node, queue, IP,
    domain or provider.

## 7.14 Security & Compliance Center

### Purpose

Manage access, isolation, secrets, evidence and compliance workflows.

### Features

-   Organization and tenant management.
-   RBAC.
-   SSO integration.
-   MFA.
-   API key scopes.
-   SMTP credential rotation.
-   Secret manager integration.
-   Encryption key management.
-   IP allowlisting.
-   Audit logs.
-   Login history.
-   Session management.
-   Data retention.
-   Data export.
-   Deletion requests.
-   Legal hold support.
-   Consent records.
-   Suppression evidence.
-   Security alerts.

### Screens

1.  Security Overview.
2.  Organizations.
3.  Users.
4.  Teams.
5.  Roles and Permissions.
6.  SSO.
7.  MFA.
8.  API Security.
9.  Secrets.
10. Audit Logs.
11. Sessions.
12. IP Allowlist.
13. Data Retention.
14. Data Requests.
15. Compliance Reports.

### Screen behaviour

-   Permission checks occur in the API, not only in the frontend.
-   High-risk operations require step-up authentication or approval.
-   Audit records are append-only from the application perspective.
-   Secret values are never returned in ordinary list or detail APIs.
-   Access revocation takes effect promptly across sessions and
    credentials.
-   Data deletion respects legal holds and records the outcome.
-   Tenant data access is enforced in every service and analytics query.

## 7.15 Enterprise Administration & Billing

### Purpose

Support enterprise customers, internal operators, quotas and commercial
operations.

### Features

-   Organizations.
-   Multiple teams.
-   Tenant plans.
-   Usage metering.
-   Message quotas.
-   IP allocation.
-   Node allocation.
-   Dedicated infrastructure.
-   Invoice data export.
-   Cost allocation.
-   Usage alerts.
-   Service limits.
-   Support access controls.
-   Contract-specific retention.
-   Tenant suspension and recovery.

### Screens

1.  Enterprise Overview.
2.  Organization Directory.
3.  Organization Details.
4.  Plans and Entitlements.
5.  Usage.
6.  Quotas.
7.  Cost Allocation.
8.  Dedicated Infrastructure.
9.  Support Access.
10. Billing Exports.

### Screen behaviour

-   Usage is calculated from immutable or reconcilable source events.
-   Quota enforcement occurs before submission and is rechecked at
    relevant processing boundaries.
-   Enterprise support access is time-limited, approved and audited.
-   Suspension stops new submission while preserving safe queue and data
    handling.
-   Dedicated resources show actual node/IP assignments and ownership.

## 7.16 Backup & Disaster Recovery

### Features

-   PostgreSQL backup.
-   ClickHouse backup/snapshot.
-   ZMAIL Core MTA configuration backup.
-   Spool recovery plan.
-   Object storage archive verification.
-   Encryption key backup policy.
-   Restore testing.
-   Recovery point objective (RPO) configuration.
-   Recovery time objective (RTO) tracking.
-   Disaster recovery runbooks.
-   Node replacement workflow.
-   Cluster recovery.

### Screens

1.  Backup Overview.
2.  Backup Policies.
3.  Backup Jobs.
4.  Backup Details.
5.  Restore Jobs.
6.  Restore Validation.
7.  Disaster Recovery.
8.  Recovery Readiness.
9.  Backup Audit.

### Screen behaviour

-   A backup is successful only after its artifact and checksum are
    verified.
-   Restore workflows show target, overwrite impact and recovery point
    before execution.
-   Spool recovery is treated separately from database restoration.
-   Recovery drills record actual duration and data loss observed.
-   Backup encryption and key availability are verified.
-   A green backup status must not imply that a restore has been tested.

------------------------------------------------------------------------

# 8. Application navigation and screen architecture

MAILOS is a standalone application named **MAILOS**. It should feel like
a native, Mac-inspired desktop productivity application in its
interaction conventions, while remaining a web application built with
Next.js.

This section specifies behaviour and information architecture. Visual design,
tokens, typography, and component styling are specified in
`DESIGN-mailos.md` (featuring a high-precision near-black surface ladder
inspired by Linear, clean code windows inspired by Resend, and a rare subtle
signature accent `#ff69b4` for heartbeat pulses, favorite bookmarks, and
milestone celebrations).

## 8.1 Navigation rules

-   Each major module has a dedicated top-level route.
-   Each major list has a full-page directory screen.
-   Each resource has a full-page details screen.
-   Creation and editing workflows use dedicated routes for substantial
    tasks.
-   Do not use docked panels as the primary destination for a module.
-   Do not compress major modules into small dashboard cards.
-   Do not use a single mega-page with every setting.
-   Preserve filters, sorting and pagination when navigating back to a
    directory.
-   Support deep links to resources, events, logs and configuration
    revisions.
-   Provide breadcrumbs and clear parent-child relationships.
-   Keep global search available across authorized resources.
-   Use command search for navigation and permitted actions, not as a
    replacement for complete screens.
-   Support keyboard navigation, shortcuts and focus management.
-   Long-running operations must continue independently of the current
    screen.
-   Notifications should link to the full resource or operation screen.
-   The interface must support responsive layouts, but complex
    operational screens should retain complete functionality on desktop.

## 8.2 Main application areas

``` text
MAILOS
├── Home
│   ├── System Overview
│   ├── Activity
│   └── Notifications
│
├── Infrastructure
│   ├── Overview
│   ├── Nodes
│   ├── Clusters
│   ├── Containers
│   ├── Images
│   ├── Storage
│   ├── Networking
│   ├── Firewall
│   └── Deployments
│
├── SMTP
│   ├── Overview
│   ├── Endpoints
│   ├── Credentials
│   ├── API Keys
│   ├── Sender Identities
│   └── Submission Logs
│
├── Domains & DNS
│   ├── Domains
│   ├── DNS Records
│   ├── DKIM
│   ├── SPF
│   ├── DMARC
│   ├── PTR / rDNS
│   └── Tracking Domains
│
├── IP & Egress
│   ├── IP Inventory
│   ├── IP Pools
│   ├── Egress Paths
│   ├── Assignments
│   └── Reputation
│
├── Delivery
│   ├── Queues
│   ├── Messages
│   ├── Delivery Traces
│   ├── SMTP Responses
│   └── Spool Health
│
├── Traffic Management
│   ├── Global Policies
│   ├── Provider Policies
│   ├── Tenant Limits
│   ├── IP Limits
│   └── TSA
│
├── Deliverability
│   ├── Warmup
│   ├── Reputation
│   ├── Provider Health
│   └── Blocklists
│
├── Messaging
│   ├── Campaigns
│   ├── Audiences
│   ├── Templates
│   ├── Mail Merge
│   └── Unsubscribes
│
├── Tracking
│   ├── Overview
│   ├── Opens
│   ├── Clicks
│   └── Tracking Domains
│
├── Testing
│   ├── Sandbox
│   ├── Inboxes
│   ├── MIME Inspector
│   ├── Spam Tests
│   └── Template Tests
│
├── Automation
│   ├── Workflows
│   ├── Webhooks
│   ├── Event Catalog
│   └── Replay
│
├── Analytics
│   ├── Overview
│   ├── Delivery
│   ├── Providers
│   ├── Domains
│   ├── IPs
│   ├── Campaigns
│   └── Reports
│
├── Monitoring
│   ├── Services
│   ├── Metrics
│   ├── Logs
│   ├── Alerts
│   └── Incidents
│
├── Security
│   ├── Users
│   ├── Teams
│   ├── Roles
│   ├── SSO / MFA
│   ├── Secrets
│   ├── Audit Logs
│   └── Retention
│
├── Administration
│   ├── Organizations
│   ├── Plans
│   ├── Usage
│   ├── Quotas
│   └── Dedicated Resources
│
└── System
    ├── Configuration
    ├── Integrations
    ├── Backups
    ├── Disaster Recovery
    ├── Agent Management
    └── System Settings
```

## 8.3 Home screen behaviour

The Home screen is an operational summary, not a replacement for module
screens.

It should show: - Overall platform health. - Active nodes and unhealthy
nodes. - ZMAIL Core MTA cluster health. - Current queue backlog. - Recent
delivery throughput. - Event ingestion freshness. - Active incidents and
alerts. - Domains requiring attention. - IPs under quarantine. - Recent
configuration deployments. - Recent operator actions. - Long-running
jobs.

Each item links to its full module screen. Summary values must be
sourced from live or timestamped backend data.

## 8.4 Global search behaviour

Search across: - Nodes. - Containers. - Domains. - IPs. - IP pools. -
Message IDs. - Campaigns. - SMTP credentials by label, never secret. -
Configuration revisions. - Alerts. - Audit events. - Webhooks.

Search results must respect tenant and role permissions. Sensitive
recipient and message data must not leak through search snippets.

## 8.5 Operation centre

All long-running actions should be available in a dedicated Operations
screen.

Track: - Deployment. - Configuration apply. - DNS verification. - IP
provisioning checks. - Queue drain. - Backup. - Restore. - Campaign
submission. - Archive export. - Bulk import. - Node maintenance.

Each operation shows: - Operation ID. - Requester. - Target resource. -
Requested action. - Current step. - Progress where measurable. - Start
and end time. - Result. - Error details. - Retry eligibility. - Audit
reference.

Do not claim percentage progress when the underlying operation cannot
report meaningful progress.

------------------------------------------------------------------------

# 9. API architecture

## 9.1 API conventions

-   Versioned REST API, for example `/api/v1`.
-   OpenAPI specification.
-   Typed request and response schemas.
-   Consistent error envelope.
-   Pagination and filtering.
-   Idempotency keys for create/submit operations.
-   Request correlation IDs.
-   Rate limiting.
-   Tenant-aware authorization.
-   Audit context.
-   Explicit asynchronous job responses.
-   Webhook signatures.
-   Backward-compatible API evolution.

## 9.2 Main API groups

``` text
/api/v1/auth
/api/v1/organizations
/api/v1/users
/api/v1/roles
/api/v1/nodes
/api/v1/containers
/api/v1/clusters
/api/v1/deployments
/api/v1/operations
/api/v1/smtp/endpoints
/api/v1/smtp/credentials
/api/v1/api-keys
/api/v1/domains
/api/v1/dns
/api/v1/dkim
/api/v1/ips
/api/v1/ip-pools
/api/v1/egress
/api/v1/queues
/api/v1/messages
/api/v1/traffic-policies
/api/v1/warmup
/api/v1/reputation
/api/v1/campaigns
/api/v1/audiences
/api/v1/templates
/api/v1/sandbox
/api/v1/tracking
/api/v1/events
/api/v1/webhooks
/api/v1/analytics
/api/v1/alerts
/api/v1/audit
/api/v1/backups
/api/v1/retention
```

## 9.3 Node agent protocol

The control plane should send typed operation requests, not arbitrary
shell commands.

Example conceptual operation:

``` json
{
  "operation_id": "op_...",
  "node_id": "node_...",
  "type": "container.restart",
  "resource_id": "container_...",
  "requested_by": "user_...",
  "issued_at": "ISO-8601",
  "expires_at": "ISO-8601",
  "idempotency_key": "...",
  "parameters": {}
}
```

The agent validates: - Signature and identity. - Expiry. - Operation
allowlist. - Resource ownership. - Local preconditions. - Duplicate
operation state. - Required approval.

It returns: - Accepted/rejected. - Execution state. - Observed result. -
Error classification. - Start/end timestamps. - Relevant diagnostic
reference.

The agent must not accept arbitrary command strings or arbitrary paths
from API callers.

------------------------------------------------------------------------

# 10. Event architecture

## 10.1 Event sources

-   ZMAIL Core MTA structured logs and supported event outputs.
-   ZMAIL Core MTA operational APIs.
-   Node Agent telemetry.
-   Docker events and metrics.
-   DNS verification workers.
-   Tracking endpoints.
-   Campaign workers.
-   Webhook delivery workers.
-   Security and audit systems.

## 10.2 Event processing pipeline

1.  Receive event.
2.  Authenticate source.
3.  Validate schema.
4.  Assign event ID and source metadata.
5.  Normalize timestamp and tenant attribution.
6.  Deduplicate using stable event identity.
7.  Persist to durable broker or ingestion buffer.
8.  Write queryable event to ClickHouse.
9.  Update relevant PostgreSQL operational projections.
10. Archive raw event batch to B2/R2.
11. Update alert and automation consumers.

## 10.3 Event quality

-   At-least-once delivery is acceptable if consumers are idempotent.
-   Do not assume exactly-once delivery across distributed services.
-   Preserve source event IDs.
-   Record ingestion time and source event time separately.
-   Detect late and out-of-order events.
-   Keep schema versions.
-   Dead-letter malformed events.
-   Provide replay tooling.
-   Monitor ingestion lag and dropped-event counters.

## 10.4 Event categories

``` text
message.accepted
message.delivered
message.deferred
message.bounced
message.complained
message.unsubscribed
message.opened
message.clicked

queue.created
queue.suspended
queue.resumed
queue.drained
queue.backlog_alert

node.registered
node.unhealthy
node.recovered
container.started
container.stopped
container.restarted

dns.verification_started
dns.verified
dns.failed

ip.assigned
ip.quarantined
ip.reactivated

configuration.proposed
configuration.validated
configuration.applied
configuration.rolled_back

campaign.created
campaign.scheduled
campaign.started
campaign.paused
campaign.completed

backup.completed
backup.failed
restore.started
restore.completed
```

------------------------------------------------------------------------

# 11. Reliability, scaling and disaster recovery

## 11.1 High availability

-   Multiple control-plane instances behind a load balancer.
-   PostgreSQL high-availability strategy.
-   Redis availability strategy.
-   RabbitMQ quorum queues where appropriate.
-   ClickHouse replication and backup strategy.
-   Multiple ZMAIL Core MTA nodes.
-   Independent persistent spool per MTA node.
-   Agent reconnect and command reconciliation.
-   Durable event buffering.
-   DNS/provider integration retries.
-   Health-based node eligibility.
-   Controlled rolling deployments.

## 11.2 Failure behaviour

  -----------------------------------------------------------------------
  Failure                             Required behaviour
  ----------------------------------- -----------------------------------
  Dashboard unavailable               Existing MTA delivery continues

  Control plane unavailable           Existing ZMAIL Core MTA configuration and
                                      queues remain operational

  Node agent disconnected             Show stale state; do not claim
                                      operations succeeded

  ZMAIL Core MTA node unhealthy              Mark node unhealthy and execute
                                      configured failover/drain policy

  PostgreSQL unavailable              Block unsafe configuration
                                      mutations; existing MTA delivery
                                      continues

  Redis unavailable                   Degrade cache/coordination features
                                      safely

  RabbitMQ unavailable                Buffer critical events durably or
                                      apply backpressure

  ClickHouse unavailable              Preserve events in durable
                                      ingestion buffer and alert

  B2 unavailable                      Keep verified local/archive backlog
                                      and retry

  DNS provider unavailable            Show integration outage; do not
                                      mark DNS verified

  Tracking service unavailable        Delivery continues; tracking may be
                                      degraded
  -----------------------------------------------------------------------

## 11.3 Deployment models

MAILOS should support: 1. Single-host installation for evaluation and
small deployments. 2. Multi-host Docker deployment. 3. Dedicated MTA
nodes with separate control/data services. 4. Multi-region control plane
and delivery infrastructure. 5. Customer-managed self-hosted deployment.
6. Managed MAILOS deployment operated by the vendor.

The application must not assume that all components share one Linux
host.

## 11.4 Resource isolation

-   Separate MTA spool storage from logs and analytics.
-   Apply container CPU/memory limits.
-   Set disk capacity alerts.
-   Protect PostgreSQL from analytics-heavy workloads.
-   Protect ClickHouse from unbounded queries.
-   Limit campaign expansion concurrency.
-   Limit event ingestion memory.
-   Apply per-tenant quotas.
-   Isolate dedicated customer infrastructure where contracted.

------------------------------------------------------------------------

# 12. Security, privacy and responsible delivery

## 12.1 Authentication and authorization

-   Secure session management.
-   MFA.
-   Enterprise SSO.
-   RBAC and resource scopes.
-   Tenant-level authorization.
-   API key scopes.
-   SMTP credential scopes.
-   Service identities.
-   Agent identities.
-   Credential rotation.
-   Session revocation.

## 12.2 Secrets

-   Never store plaintext passwords or API secrets.
-   Use a secret manager or envelope encryption.
-   Keep DKIM private keys protected.
-   Never expose private keys in normal API responses.
-   Rotate service credentials.
-   Audit secret access.
-   Separate encryption keys from encrypted data.
-   Protect backup keys and recovery procedures.

## 12.3 Email compliance

-   Require legitimate sending authority.
-   Enforce suppression lists.
-   Support unsubscribe mechanisms for applicable marketing messages.
-   Record consent source and timestamp.
-   Process complaints and hard bounces promptly.
-   Separate transactional and marketing streams.
-   Enforce tenant limits.
-   Detect abuse patterns.
-   Provide account suspension workflows.
-   Preserve evidence needed for customer and compliance investigations.

## 12.4 Tracking privacy

-   Make tracking configurable.
-   Do not represent opens as proof of human reading.
-   Minimize collection of recipient IP and location.
-   Apply retention controls.
-   Use secure signed tracking tokens.
-   Prevent open redirects.
-   Respect customer and applicable legal requirements.

------------------------------------------------------------------------

# 13. Testing and quality requirements

MAILOS is infrastructure software. Tests must verify actual system
behaviour, not just whether components render.

## 13.1 Unit tests

-   Policy validation.
-   Permission checks.
-   Configuration generation.
-   Event parsing.
-   Deduplication.
-   Rate-limit evaluation.
-   DNS record parsing.
-   Warmup state transitions.
-   Retention policy evaluation.

## 13.2 Integration tests

-   Go API with PostgreSQL.
-   API with Redis.
-   Event ingestion with RabbitMQ.
-   Analytics writes to ClickHouse.
-   B2/R2 archive writes and reads.
-   Cloudflare DNS integration.
-   Docker agent operations.
-   ZMAIL Core MTA message injection.
-   ZMAIL Core MTA configuration deployment.
-   ZMAIL Core MTA log/event ingestion.

## 13.3 End-to-end tests

-   Register a Linux node.
-   Deploy ZMAIL Core MTA.
-   Verify container and process health.
-   Add a domain and verify DNS.
-   Configure DKIM.
-   Configure an egress IP.
-   Submit a test message to a controlled recipient.
-   Verify ZMAIL Core MTA acceptance.
-   Verify remote SMTP acceptance where observable.
-   Verify event ingestion.
-   Verify analytics.
-   Verify archive.
-   Restart a node and observe state reconciliation.
-   Roll back an invalid configuration.
-   Capture a sandbox message without delivering it externally.

## 13.4 Failure tests

-   Kill the agent.
-   Stop Docker.
-   Fill a test filesystem.
-   Disconnect RabbitMQ.
-   Make ClickHouse unavailable.
-   Fail an object-storage request.
-   Return DNS SERVFAIL.
-   Reject ZMAIL Core MTA configuration.
-   Simulate SMTP deferrals and bounces.
-   Interrupt configuration deployment.
-   Test restore from backup.

## 13.5 UI functional tests

Every visible control must be tested for: - Correct action. - Correct
permission. - Loading state. - Empty state. - Error state. - Success
state based on confirmed result. - Persistence after reload. -
Navigation and back behaviour. - Search and filters. - Pagination. -
Accessibility and keyboard use. - No dead buttons. - No fake charts or
hardcoded metrics. - No incomplete detail screens. - No missing
destructive-action confirmation.

------------------------------------------------------------------------

# 14. Operational definitions and metric semantics

Use consistent definitions throughout MAILOS.

  -----------------------------------------------------------------------
  Metric                              Definition
  ----------------------------------- -----------------------------------
  Submitted                           Application accepted the request

  MTA accepted                        ZMAIL Core MTA accepted the message for
                                      processing

  Remote accepted                     Receiving SMTP server accepted the
                                      message

  Delivered                           MAILOS observed the defined remote
                                      acceptance event

  Deferred                            Temporary remote delivery failure
                                      or retry condition

  Bounced                             Permanent failure according to
                                      normalized classification

  Complaint                           Complaint feedback received from a
                                      supported source

  Open                                Tracking pixel request observed

  Click                               Tracking redirect request observed

  Queue latency                       Time between queue entry and
                                      delivery attempt, according to
                                      event definitions

  Delivery latency                    Time between defined submission
                                      point and remote acceptance

  Ingestion lag                       Difference between event occurrence
                                      and analytics availability

  Warmup progress                     Actual eligible volume compared
                                      with the current approved plan
  -----------------------------------------------------------------------

Do not use "inbox placement" unless actual inbox placement measurement
exists. A successful SMTP response does not prove inbox placement.

------------------------------------------------------------------------

# 15. Implementation workstreams

This is a full-product delivery plan, not an MVP scope reduction.
Workstreams can overlap once their interfaces and data contracts are
stable.

## Workstream A --- Platform foundation

-   Repository and build system.
-   Go control plane.
-   Next.js application shell.
-   PostgreSQL schema and migrations.
-   Authentication and RBAC.
-   API conventions.
-   Audit framework.
-   Operations/job framework.

## Workstream B --- Linux infrastructure

-   Go node agent.
-   Agent enrollment and identity.
-   Docker API integration.
-   Host telemetry.
-   Container lifecycle.
-   Storage and network inspection.
-   Safe firewall operations.
-   Node deployment workflows.

## Workstream C --- ZMAIL Core MTA

-   Container packaging.
-   Persistent spool.
-   Configuration templates.
-   Lua policy generation.
-   Validation and rollout.
-   Cluster/node registration.
-   Queue and message inspection.
-   Traffic shaping and TSA integration.
-   Structured event collection.

## Workstream D --- Domains and IPs

-   DNS provider abstraction.
-   Cloudflare integration.
-   DNS verification.
-   DKIM key lifecycle.
-   IP inventory.
-   Host assignment checks.
-   Egress path configuration.
-   IP pools.
-   PTR/rDNS diagnostics.

## Workstream E --- Data platform

-   Event contracts.
-   Rust ingestion.
-   RabbitMQ integration.
-   ClickHouse schema.
-   Deduplication and replay.
-   B2/R2 archival.
-   Retention and restore.
-   Data quality monitoring.

## Workstream F --- Deliverability

-   Provider classification.
-   Traffic shaping policies.
-   Warmup workflows.
-   Reputation diagnostics.
-   Suppression and complaint handling.
-   Alert thresholds.
-   Automated pause controls.

## Workstream G --- Developer and messaging platform

-   SMTP/API submission.
-   Credentials.
-   Campaigns.
-   Contact imports.
-   Templates.
-   Sandbox.
-   MIME inspection.
-   Webhooks.
-   SDKs and documentation.

## Workstream H --- Enterprise operations

-   SSO and MFA.
-   Organization management.
-   Usage and quotas.
-   Audit and compliance.
-   Backups.
-   Disaster recovery.
-   Multi-region support.
-   Support access and operational tooling.

## Workstream I --- Application screens

Implement every screen listed in Section 8 and the module-specific
screen inventories. Each screen must be connected to real APIs and
complete workflows. Avoid placeholder pages and static sample analytics
in production.

------------------------------------------------------------------------

# 16. Engineering acceptance criteria

A feature is complete only when all applicable criteria are satisfied:

1.  It has a dedicated route and full screen where specified.
2.  It has a documented API contract.
3.  It has a permission model.
4.  It persists the correct data.
5.  It interacts with the real underlying service where required.
6.  It distinguishes desired state from observed state.
7.  It has loading, empty, error, stale and success states.
8.  It has audit logging for sensitive operations.
9.  It has unit and integration tests.
10. It has operational metrics and logs.
11. It has retry and failure handling.
12. It has documentation.
13. It has no dead controls or fake data.
14. It respects tenant boundaries.
15. It has a recovery or rollback strategy for destructive/configuration
    operations.

A frontend-only implementation does not satisfy an infrastructure
feature.

------------------------------------------------------------------------

# 17. Important architectural decisions to lock

  -----------------------------------------------------------------------
  Decision                            Direction
  ----------------------------------- -----------------------------------
  Product identity                    MAILOS

  Product category                    Enterprise email infrastructure
                                      operating system

  Delivery engine                     ZMAIL Core MTA

  Control plane                       Go

  Linux agent                         Go

  Event ingestion                     Rust

  Tracking service                    Rust

  Frontend                            Next.js + TypeScript

  Primary database                    PostgreSQL

  Edge metadata                       Cloudflare D1, optional and
                                      selective

  Long-term large-data storage        Backblaze B2 or Cloudflare R2

  Analytical database                 ClickHouse

  Cache                               Redis

  Application broker                  RabbitMQ

  Container runtime                   Docker

  MTA configuration                   Lua and ZMAIL Core MTA-supported
                                      configuration

  Metrics                             Prometheus

  Logs                                Vector

  Tracing                             OpenTelemetry

  DNS                                 Provider integrations plus
                                      independent verification

  Sandbox                             Dedicated capture service, Mailpit
                                      for development

  Deployment                          Docker-based, multi-host capable

  UI information architecture         Full independent screens per major
                                      module; no docked replacement
                                      screens

  Visual design system                Defined in DESIGN-mailos.md:
                                      Near-black surface ladder (#010102),
                                      lavender-blue primary (#5e6ad2), and
                                      rare signature accent (#ff69b4)
                                      for heartbeats and milestones

  Operational model                   Desired state, observed state,
                                      audited operations
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 18. Official technical references

Use current official documentation during implementation. Verify the
exact ZMAIL Core MTA version and API behaviour before relying on a particular
endpoint or configuration field.

-   ZMAIL Core MTA documentation: https://docs.zmail-mta.com/
-   ZMAIL Core MTA GitHub: https://github.com/mailops/mta
-   Docker Engine API: https://docs.docker.com/engine/api/
-   PostgreSQL documentation: https://www.postgresql.org/docs/
-   Cloudflare D1: https://developers.cloudflare.com/d1/
-   Cloudflare R2: https://developers.cloudflare.com/r2/
-   Backblaze B2: https://www.backblaze.com/docs/cloud-storage
-   ClickHouse documentation: https://clickhouse.com/docs
-   RabbitMQ documentation: https://www.rabbitmq.com/docs
-   Redis documentation: https://redis.io/docs/
-   Prometheus documentation: https://prometheus.io/docs/
-   Vector documentation: https://vector.dev/docs/
-   OpenTelemetry: https://opentelemetry.io/docs/
-   Next.js documentation: https://nextjs.org/docs
-   Mailgun documentation: https://documentation.mailgun.com/
-   Bird: https://bird.com/
-   Mailtrap documentation: https://docs.mailtrap.io/
-   Postal: https://docs.postalserver.io/
-   Mailpit: https://mailpit.axllent.org/

------------------------------------------------------------------------

# 19. Final product statement

MAILOS is a complete email infrastructure operating system built around
ZMAIL Core MTA.

It combines: - The delivery performance and operational primitives of
ZMAIL Core MTA. - The developer APIs, message logs and domain workflows of
Mailgun. - The deliverability and campaign intelligence patterns of
Bird. - The sandbox and debugging experience of Mailtrap. - The
self-hosted infrastructure philosophy of Postal. - Real Linux and Docker
management through a secure Go agent. - High-throughput event processing
with Rust. - A Next.js application with complete, independent
operational screens. - PostgreSQL for authoritative product state. - D1
for selected edge metadata where useful. - B2/R2 for large and long-term
object data. - ClickHouse for queryable event analytics.

The defining requirement is that MAILOS must operate the actual
infrastructure. It must deploy and manage real ZMAIL Core MTA nodes, inspect
real queues, verify real DNS, observe real IP configuration, collect
real events, archive real data and report actual outcomes.

**MAILOS is not a dashboard sitting above an SMTP server. It is the
control plane, management system and operational interface for the email
infrastructure itself.**
