import {
  InboundMessage,
  InboundRoute,
  InboundStats,
  Subaccount,
  APIKey,
  SubaccountStats,
  IngestionWorkerStats,
  BulkInjectResponse,
  WebhookSubscription,
  EventWebhookPayload,
  WebhookStats,
  Template,
  RenderTemplateRequest,
  RenderTemplateResponse,
  DeliverabilityHealthReport,
} from "../types/os";

const getApiBase = (): string => {
  if (typeof window !== "undefined") {
    // If accessing from a remote browser (e.g. AWS EC2, Lightsail, public IP, custom domain)
    if (!process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL.includes("localhost")) {
      if (window.location.hostname && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        return `${window.location.protocol}//${window.location.hostname}:8080`;
      }
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
};

// Dynamic runtime stringifier so all template literals call getApiBase() on the fly
const API_BASE = {
  toString: () => getApiBase(),
};

export async function fetchSystemStatus() {
  const res = await fetch(`${API_BASE}/api/v1/system/status`);
  if (!res.ok) throw new Error("Failed to fetch system status");
  return res.json();
}

export async function fetchNodes() {
  const res = await fetch(`${API_BASE}/api/v1/nodes`);
  if (!res.ok) throw new Error("Failed to fetch nodes");
  return res.json();
}

// --- DOMAINS CRUD ---
export async function fetchDomains() {
  const res = await fetch(`${API_BASE}/api/v1/domains`);
  if (!res.ok) throw new Error("Failed to fetch domains");
  return res.json();
}

export async function addDomain(domain: string) {
  const res = await fetch(`${API_BASE}/api/v1/domains`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain }),
  });
  if (!res.ok) throw new Error("Failed to add domain");
  return res.json();
}

export async function deleteDomain(domainOrId: string) {
  const res = await fetch(`${API_BASE}/api/v1/domains`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain: domainOrId }),
  });
  if (!res.ok) throw new Error("Failed to delete domain");
  return res.json();
}

export async function setPrimaryDomain(domain: string) {
  const res = await fetch(`${API_BASE}/api/v1/domains/primary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain }),
  });
  if (!res.ok) throw new Error("Failed to set primary domain");
  return res.json();
}

export async function verifyDomain(domain: string, selector = "k202611") {
  const res = await fetch(`${API_BASE}/api/v1/domains/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, selector }),
  });
  if (!res.ok) throw new Error("Failed to verify domain");
  return res.json();
}

export async function generateDkimKey(domain: string, selector = "k202611") {
  const res = await fetch(`${API_BASE}/api/v1/dkim/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, selector }),
  });
  if (!res.ok) throw new Error("Failed to generate DKIM key");
  return res.json();
}

export async function syncCloudflareDNS(params: {
  domain: string;
  api_token: string;
  zone_id?: string;
  include_mx?: boolean;
}) {
  const res = await fetch(`${API_BASE}/api/v1/domains/cloudflare/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error || "Failed to sync DNS records to Cloudflare");
  }
  return data;
}

export interface InfrastructureInfo {
  public_ip: string;
  local_ip: string;
  hostname: string;
  smtp_hostname: string;
  environment: string;
  detection_source: string;
  detection_status: string;
  provider_agreed?: string[];
  last_detected_at: string;
  is_explicit: boolean;
  ip_version: string;
  reverse_dns?: string;
  ptr_status: "matched" | "mismatched" | "pending" | "unconfigured";
  ptr_guidance: string;
  suggested_a_record: string;
  suggested_spf: string;
  suggested_mx: string;
}

export async function fetchInfrastructureDetection(): Promise<InfrastructureInfo> {
  const res = await fetch(`${API_BASE}/api/v1/infra/detection`);
  if (!res.ok) throw new Error("Failed to fetch infrastructure detection");
  return res.json();
}

export async function detectInfrastructureNow(): Promise<InfrastructureInfo> {
  const res = await fetch(`${API_BASE}/api/v1/infra/detect-now`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to re-detect infrastructure");
  return res.json();
}

// --- IP POOLS CRUD ---
export async function fetchIPPools() {
  const res = await fetch(`${API_BASE}/api/v1/ippools`);
  if (!res.ok) throw new Error("Failed to fetch IP pools");
  return res.json();
}

export async function addIPPool(name: string, poolType = "transactional", ips: string[] = [], dailyTarget = 1000000) {
  const res = await fetch(`${API_BASE}/api/v1/ippools`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, type: poolType, ips, daily_target: dailyTarget }),
  });
  if (!res.ok) throw new Error("Failed to add IP pool");
  return res.json();
}

export async function updateIPPool(pool: {
  id: string;
  name?: string;
  type?: string;
  ips?: string[];
  warmup_status?: string;
  daily_target?: number;
}) {
  const res = await fetch(`${API_BASE}/api/v1/ippools`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pool),
  });
  if (!res.ok) throw new Error("Failed to update IP pool");
  return res.json();
}

export async function deleteIPPool(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/ippools`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Failed to delete IP pool");
  return res.json();
}

// --- SENDING IPS CRUD ---
export async function fetchSendingIPs() {
  const res = await fetch(`${API_BASE}/api/v1/ips`);
  if (!res.ok) throw new Error("Failed to fetch sending IPs");
  return res.json();
}

export async function addSendingIP(ipData: {
  ip: string;
  pool_id: string;
  reverse_dns?: string;
  weight?: number;
  status?: string;
}) {
  const res = await fetch(`${API_BASE}/api/v1/ips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ipData),
  });
  if (!res.ok) throw new Error("Failed to add sending IP");
  return res.json();
}

export async function updateSendingIP(ipData: {
  ip: string;
  pool_id?: string;
  reverse_dns?: string;
  weight?: number;
  status?: string;
}) {
  const res = await fetch(`${API_BASE}/api/v1/ips`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ipData),
  });
  if (!res.ok) throw new Error("Failed to update sending IP");
  return res.json();
}

export async function deleteSendingIP(ip: string) {
  const res = await fetch(`${API_BASE}/api/v1/ips`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip }),
  });
  if (!res.ok) throw new Error("Failed to delete sending IP");
  return res.json();
}

// --- PHASE 2: IP ROTATION RELIABILITY & TELEMETRY ---
export async function fetchIPSyncStatus() {
  const res = await fetch(`${API_BASE}/api/v1/ips/sync-status`);
  if (!res.ok) throw new Error("Failed to fetch IP sync status");
  return res.json();
}

export async function forceIPSync() {
  const res = await fetch(`${API_BASE}/api/v1/ips/sync-now`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to force IP sync");
  return res.json();
}

export async function fetchIPTelemetry() {
  const res = await fetch(`${API_BASE}/api/v1/ips/telemetry`);
  if (!res.ok) throw new Error("Failed to fetch IP telemetry");
  return res.json();
}

// --- RATE LIMITS & TRAFFIC SHAPING CRUD ---
export async function fetchRateLimits() {
  const res = await fetch(`${API_BASE}/api/v1/shaping`);
  if (!res.ok) throw new Error("Failed to fetch rate limits");
  return res.json();
}

export async function saveRateLimit(rule: {
  domain: string;
  connection_limit: number;
  max_connection_rate: string;
  max_deliveries_per_connection: number;
  max_message_rate: string;
}) {
  const res = await fetch(`${API_BASE}/api/v1/shaping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rule),
  });
  if (!res.ok) throw new Error("Failed to save rate limit rule");
  return res.json();
}

export async function deleteRateLimit(domain: string) {
  const res = await fetch(`${API_BASE}/api/v1/shaping`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain }),
  });
  if (!res.ok) throw new Error("Failed to delete rate limit rule");
  return res.json();
}

// --- QUEUE ACTIONS ---
export async function fetchQueues() {
  const res = await fetch(`${API_BASE}/api/v1/queues`);
  if (!res.ok) throw new Error("Failed to fetch queues");
  return res.json();
}

export async function performQueueAction(queue: string, action: "flush" | "pause" | "resume" | "clear") {
  const res = await fetch(`${API_BASE}/api/v1/queues/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queue, action }),
  });
  if (!res.ok) throw new Error(`Failed to perform action '${action}' on queue`);
  return res.json();
}

// --- MESSAGES CRUD ---
export async function fetchMessages() {
  const res = await fetch(`${API_BASE}/api/v1/messages`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function deleteMessage(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/messages?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete message");
  return res.json();
}

export async function clearAllMessages() {
  const res = await fetch(`${API_BASE}/api/v1/messages?id=all`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to clear messages");
  return res.json();
}

export async function injectTestMessage(from: string, to: string, subject: string, pool = "default") {
  const res = await fetch(`${API_BASE}/api/v1/inject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, pool }),
  });
  if (!res.ok) throw new Error("Failed to inject message");
  return res.json();
}

export async function injectMessage(payload: {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  pool?: string;
  template_id?: string;
  variables?: Record<string, string>;
}) {
  const res = await fetch(`${API_BASE}/api/v1/inject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to inject message");
  }
  return res.json();
}

export async function fetchAnalytics(timeRange = "24h", start?: string, end?: string) {
  const params = new URLSearchParams({ range: timeRange });
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const res = await fetch(`${API_BASE}/api/v1/analytics?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export async function markMessageOpened(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/messages/open?id=${encodeURIComponent(id)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to mark message opened");
  return res.json();
}

export async function fetchKumoLuaPolicy() {
  const res = await fetch(`${API_BASE}/api/v1/kumo/policy.lua`);
  if (!res.ok) throw new Error("Failed to fetch Lua policy");
  return res.text();
}

// --- SMTP CONNECT & RELAY WHITELIST API ---
export async function fetchSmtpInfo() {
  const res = await fetch(`${API_BASE}/api/v1/smtp/info`);
  if (!res.ok) throw new Error("Failed to fetch SMTP host info");
  return res.json();
}

export async function fetchRelayWhitelist() {
  const res = await fetch(`${API_BASE}/api/v1/smtp/whitelist`);
  if (!res.ok) throw new Error("Failed to fetch relay whitelist");
  return res.json();
}

export async function addRelayWhitelist(cidr: string, description: string) {
  const res = await fetch(`${API_BASE}/api/v1/smtp/whitelist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cidr, description }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to add IP/CIDR to relay whitelist");
  }
  return res.json();
}

export async function deleteRelayWhitelist(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/smtp/whitelist?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete whitelist entry");
  return res.json();
}

export async function fetchIncomingConnections() {
  const res = await fetch(`${API_BASE}/api/v1/smtp/connections`);
  if (!res.ok) throw new Error("Failed to fetch incoming connections");
  return res.json();
}

// --- PHASE 3: SUPPRESSIONS & RFC BOUNCE API ---
export async function fetchSuppressions(query = "", reason = "") {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (reason && reason !== "all") params.set("reason", reason);
  const res = await fetch(`${API_BASE}/api/v1/suppressions?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch suppressions");
  return res.json();
}

export async function fetchSuppressionStats() {
  const res = await fetch(`${API_BASE}/api/v1/suppressions/stats`);
  if (!res.ok) throw new Error("Failed to fetch suppression stats");
  return res.json();
}

export async function addSuppression(email: string, reason = "manual", sourceCode = "5.1.1", tenant = "default") {
  const res = await fetch(`${API_BASE}/api/v1/suppressions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, reason, source_code: sourceCode, tenant }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to add suppression entry");
  }
  return res.json();
}

export async function deleteSuppression(idOrEmail: string) {
  const res = await fetch(`${API_BASE}/api/v1/suppressions?id=${encodeURIComponent(idOrEmail)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete suppression entry");
  return res.json();
}

export async function checkSuppression(email: string, tenant = "default") {
  const res = await fetch(`${API_BASE}/api/v1/suppressions/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, tenant }),
  });
  if (!res.ok) throw new Error("Failed to check recipient suppression status");
  return res.json();
}

export async function fetchBounces(limit = 100) {
  const res = await fetch(`${API_BASE}/api/v1/bounces?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch bounce records");
  return res.json();
}

export async function recordBounce(recipient: string, sender: string, rawResponse: string, egressIP = "0.0.0.0") {
  const res = await fetch(`${API_BASE}/api/v1/bounces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient,
      sender,
      raw_response: rawResponse,
      egress_ip: egressIP,
    }),
  });
  if (!res.ok) throw new Error("Failed to record bounce");
  return res.json();
}

// --- PHASE 4: AUTOMATED WARMUP SCHEDULER & MULTI-SPEED THROTTLE API ---
export async function fetchWarmupPlans() {
  const res = await fetch(`${API_BASE}/api/v1/warmup/plans`);
  if (!res.ok) throw new Error("Failed to fetch warmup plans");
  return res.json();
}

export async function fetchWarmupSchedules() {
  const res = await fetch(`${API_BASE}/api/v1/warmup/schedules`);
  if (!res.ok) throw new Error("Failed to fetch warmup schedules");
  return res.json();
}

export async function startWarmupSchedule(payload: {
  target_type: "ip" | "pool";
  target_id: string;
  plan_id: string;
  overflow_action?: string;
  overflow_pool?: string;
  start_day?: number;
}) {
  const res = await fetch(`${API_BASE}/api/v1/warmup/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to start warmup schedule");
  }
  return res.json();
}

export async function pauseWarmupSchedule(targetID: string) {
  const res = await fetch(`${API_BASE}/api/v1/warmup/pause`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_id: targetID }),
  });
  if (!res.ok) throw new Error("Failed to pause warmup schedule");
  return res.json();
}

export async function resumeWarmupSchedule(targetID: string) {
  const res = await fetch(`${API_BASE}/api/v1/warmup/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_id: targetID }),
  });
  if (!res.ok) throw new Error("Failed to resume warmup schedule");
  return res.json();
}

export async function advanceWarmupDay(targetID: string) {
  const res = await fetch(`${API_BASE}/api/v1/warmup/advance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_id: targetID }),
  });
  if (!res.ok) throw new Error("Failed to advance warmup schedule day");
  return res.json();
}

export async function deleteWarmupSchedule(targetID: string) {
  const res = await fetch(`${API_BASE}/api/v1/warmup?target_id=${encodeURIComponent(targetID)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove warmup schedule");
  return res.json();
}

export async function fetchWarmupStats() {
  const res = await fetch(`${API_BASE}/api/v1/warmup/stats`);
  if (!res.ok) throw new Error("Failed to fetch warmup stats");
  return res.json();
}

// --- CAMPAIGN OPERATIONS & REAL DISPATCH API ---

export interface CampaignStep {
  id?: string;
  step_number: number;
  title?: string;
  subject: string;
  body_html: string;
  body_preview?: string;
  delay_days: number;
  delay_hours: number;
  send_days?: "all_days" | "business_days";
  trigger_condition: "immediate" | "no_reply" | "no_open" | "opened_no_click" | "always";
  is_threaded_reply: boolean;
  created_at?: string;
}

export interface IPPool {
  id: string;
  name: string;
  type?: string;
  ips?: any[];
}

export interface CampaignPayload {
  id?: string;
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  reply_to?: string;
  return_path_domain?: string;
  category_tag?: string;
  priority?: "high" | "normal" | "bulk";
  audience: string;
  recipient_count?: number;
  status?: string;
  body_html: string;
  body_preview?: string;
  ip_pool?: string;
  recipients?: string[];
  template_id?: string;
  steps?: CampaignStep[];
  sender_mode?: "single" | "pool";
  mailbox_pool_id?: string;
  rotation_strategy?: "round_robin" | "weighted_round_robin" | "least_recently_used" | "least_utilized";
  send_window_start?: string;
  send_window_end?: string;
  send_window_days?: string;
  jitter_min_seconds?: number;
  jitter_max_seconds?: number;
  daily_cap?: number;
  custom_headers?: Record<string, string>;
  track_opens?: boolean;
  track_clicks?: boolean;
  tracking_domain?: string;
  custom_footer_html?: string;
  unsubscribe_url?: string;
  unsubscribe_text?: string;
  company_address?: string;
  enable_one_click?: boolean;
  enable_branding?: boolean;
}

export async function fetchCampaigns() {
  const res = await fetch(`${API_BASE}/api/v1/campaigns`);
  if (!res.ok) throw new Error("Failed to fetch campaigns");
  return res.json();
}

export async function addCampaign(payload: CampaignPayload) {
  const res = await fetch(`${API_BASE}/api/v1/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create campaign");
  }
  return res.json();
}

export async function updateCampaign(payload: CampaignPayload) {
  const res = await fetch(`${API_BASE}/api/v1/campaigns`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update campaign");
  }
  return res.json();
}

export async function deleteCampaign(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/campaigns?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete campaign");
  return res.json();
}

export async function dispatchCampaign(campaignId: string, recipients?: string[]) {
  const res = await fetch(`${API_BASE}/api/v1/campaigns/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaign_id: campaignId, recipients }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to dispatch campaign");
  }
  return res.json();
}

// --- AUDIENCE CONTACTS DIRECTORY API ---

export interface ContactPayload {
  id?: string;
  email: string;
  name: string;
  company?: string;
  tags?: string[];
  status?: string;
  delivery_health?: string;
}

export async function fetchContacts() {
  const res = await fetch(`${API_BASE}/api/v1/contacts`);
  if (!res.ok) throw new Error("Failed to fetch audience contacts");
  return res.json();
}

export async function addContact(payload: ContactPayload) {
  const res = await fetch(`${API_BASE}/api/v1/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to add contact");
  }
  return res.json();
}

export async function updateContact(payload: ContactPayload) {
  const res = await fetch(`${API_BASE}/api/v1/contacts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update contact");
  }
  return res.json();
}

export async function deleteContact(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/contacts?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete contact");
  return res.json();
}

// --- PRE-FLIGHT SEED DELIVERABILITY API ---

export interface SeedPreflightPayload {
  subject: string;
  from_email: string;
  from_name?: string;
  html_body: string;
}

export async function runPreflightSeedTest(payload: SeedPreflightPayload) {
  const res = await fetch(`${API_BASE}/api/v1/seed/preflight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to run preflight seed test");
  }
  return res.json();
}

// --- PHASE 5: INBOUND MX & RFC 5965 ARF API ---

export async function fetchInboundMessages(
  filter: string = "all",
  query: string = "",
  limit: number = 100
): Promise<InboundMessage[]> {
  const params = new URLSearchParams();
  if (filter && filter !== "all") params.append("filter", filter);
  if (query) params.append("q", query);
  if (limit) params.append("limit", limit.toString());

  const res = await fetch(`${API_BASE}/api/v1/inbound/messages?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch inbound messages");
  return res.json();
}

export async function fetchInboundMessageDetail(id: string): Promise<InboundMessage> {
  const res = await fetch(`${API_BASE}/api/v1/inbound/messages/detail?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Failed to fetch inbound message detail");
  return res.json();
}

export async function deleteInboundMessage(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/inbound/messages?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete inbound message");
  return res.json();
}

export async function clearInboundMessages() {
  const res = await fetch(`${API_BASE}/api/v1/inbound/messages?id=all`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to clear inbound messages");
  return res.json();
}

export async function simulateARFReport(payload: {
  provider: string;
  complaining_rcpt: string;
  sender: string;
  subject: string;
  feedback_type?: string;
}): Promise<InboundMessage> {
  const res = await fetch(`${API_BASE}/api/v1/inbound/simulate-arf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to simulate ARF report");
  }
  return res.json();
}

export async function fetchInboundRoutes(): Promise<InboundRoute[]> {
  const res = await fetch(`${API_BASE}/api/v1/inbound/routes`);
  if (!res.ok) throw new Error("Failed to fetch inbound routes");
  return res.json();
}

export async function addInboundRoute(route: Partial<InboundRoute>): Promise<InboundRoute> {
  const res = await fetch(`${API_BASE}/api/v1/inbound/routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(route),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to add inbound route");
  }
  return res.json();
}

export async function updateInboundRoute(route: Partial<InboundRoute>): Promise<InboundRoute> {
  const res = await fetch(`${API_BASE}/api/v1/inbound/routes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(route),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update inbound route");
  }
  return res.json();
}

export async function deleteInboundRoute(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/inbound/routes?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete inbound route");
  return res.json();
}

export async function fetchInboundStats(): Promise<InboundStats> {
  const res = await fetch(`${API_BASE}/api/v1/inbound/stats`);
  if (!res.ok) throw new Error("Failed to fetch inbound stats");
  return res.json();
}

// --- PHASE 6: SUB-ACCOUNT & MULTI-TENANT RBAC API ---

export async function fetchSubaccounts(): Promise<Subaccount[]> {
  const res = await fetch(`${API_BASE}/api/v1/subaccounts`);
  if (!res.ok) throw new Error("Failed to fetch sub-accounts");
  return res.json();
}

export async function fetchSubaccountDetail(id: string): Promise<Subaccount> {
  const res = await fetch(`${API_BASE}/api/v1/subaccounts/detail?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Failed to fetch sub-account detail");
  return res.json();
}

export async function addSubaccount(sub: Partial<Subaccount>): Promise<Subaccount> {
  const res = await fetch(`${API_BASE}/api/v1/subaccounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create sub-account");
  }
  return res.json();
}

export async function updateSubaccount(sub: Partial<Subaccount>): Promise<Subaccount> {
  const res = await fetch(`${API_BASE}/api/v1/subaccounts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update sub-account");
  }
  return res.json();
}

export async function deleteSubaccount(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/subaccounts?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete sub-account");
  return res.json();
}

export async function fetchSubaccountStats(): Promise<SubaccountStats> {
  const res = await fetch(`${API_BASE}/api/v1/subaccounts/stats`);
  if (!res.ok) throw new Error("Failed to fetch sub-account stats");
  return res.json();
}

export async function fetchAPIKeys(subaccountId?: string): Promise<APIKey[]> {
  const param = subaccountId ? `?subaccount_id=${encodeURIComponent(subaccountId)}` : "";
  const res = await fetch(`${API_BASE}/api/v1/apikeys${param}`);
  if (!res.ok) throw new Error("Failed to fetch API keys");
  return res.json();
}

export async function addAPIKey(key: Partial<APIKey>): Promise<APIKey> {
  const res = await fetch(`${API_BASE}/api/v1/apikeys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(key),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create API key");
  }
  return res.json();
}

export async function revokeAPIKey(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/apikeys/revoke?id=${encodeURIComponent(id)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to revoke API key");
  return res.json();
}

export async function deleteAPIKey(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/apikeys?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete API key");
  return res.json();
}

// --- REDIS STREAM HIGH-VELOCITY INGESTION API ---

export async function fetchIngestStats(): Promise<IngestionWorkerStats> {
  const res = await fetch(`${API_BASE}/api/v1/ingest/stats`);
  if (!res.ok) throw new Error("Failed to fetch ingestion stats");
  return res.json();
}

export async function bulkInjectMessages(req: {
  subaccount_id?: string;
  pool?: string;
  messages: Array<{ from: string; to: string; subject: string; html?: string; text?: string }>;
}): Promise<BulkInjectResponse> {
  const res = await fetch(`${API_BASE}/api/v1/ingest/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to push bulk messages to stream");
  }
  return res.json();
}

// --- PHASE 7: EVENT WEBHOOK STREAMING API ---

export async function fetchWebhookSubscriptions(): Promise<WebhookSubscription[]> {
  const res = await fetch(`${API_BASE}/api/v1/webhooks/subscriptions`);
  if (!res.ok) throw new Error("Failed to fetch webhook subscriptions");
  return res.json();
}

export async function addWebhookSubscription(sub: Partial<WebhookSubscription>): Promise<WebhookSubscription> {
  const res = await fetch(`${API_BASE}/api/v1/webhooks/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to add webhook subscription");
  }
  return res.json();
}

export async function updateWebhookSubscription(sub: Partial<WebhookSubscription>): Promise<WebhookSubscription> {
  const res = await fetch(`${API_BASE}/api/v1/webhooks/subscriptions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update webhook subscription");
  }
  return res.json();
}

export async function deleteWebhookSubscription(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/webhooks/subscriptions?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete webhook subscription");
  return res.json();
}

export async function testWebhookEvent(eventType?: string, recipient?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/webhooks/test-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType, recipient: recipient }),
  });
  if (!res.ok) throw new Error("Failed to trigger test webhook event");
  return res.json();
}

export async function fetchWebhookStats(): Promise<WebhookStats> {
  const res = await fetch(`${API_BASE}/api/v1/webhooks/stats`);
  if (!res.ok) throw new Error("Failed to fetch webhook stats");
  return res.json();
}

export async function fetchWebhookLogs(limit: number = 50): Promise<EventWebhookPayload[]> {
  const res = await fetch(`${API_BASE}/api/v1/webhooks/logs?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch webhook logs");
  return res.json();
}

// --- TEMPLATES & DELIVERABILITY RADAR API ---

export async function fetchTemplates(): Promise<Template[]> {
  const res = await fetch(`${API_BASE}/api/v1/templates`);
  if (!res.ok) throw new Error("Failed to fetch templates");
  return res.json();
}

export async function fetchTemplateDetail(id: string): Promise<Template> {
  const res = await fetch(`${API_BASE}/api/v1/templates/detail?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Failed to fetch template detail");
  return res.json();
}

export async function addTemplate(tmpl: Partial<Template>): Promise<Template> {
  const res = await fetch(`${API_BASE}/api/v1/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tmpl),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to add template");
  }
  return res.json();
}

export async function updateTemplate(tmpl: Partial<Template>): Promise<Template> {
  const res = await fetch(`${API_BASE}/api/v1/templates`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tmpl),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update template");
  }
  return res.json();
}

export async function deleteTemplate(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/templates?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete template");
  return res.json();
}

export async function renderTemplate(req: RenderTemplateRequest): Promise<RenderTemplateResponse> {
  const res = await fetch(`${API_BASE}/api/v1/templates/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to render template");
  }
  return res.json();
}

export async function fetchDeliverabilityHealth(): Promise<DeliverabilityHealthReport> {
  const res = await fetch(`${API_BASE}/api/v1/deliverability/health`);
  if (!res.ok) throw new Error("Failed to fetch deliverability health report");
  return res.json();
}

// --- MAILBOXES, POOLS & ROTATION API ---

export interface Mailbox {
  id: string;
  email: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  department?: string;
  domain: string;
  dkim_selector?: string;
  ip_pool_id: string;
  daily_limit: number;
  hourly_limit: number;
  min_interval_seconds: number;
  daily_sent: number;
  hourly_sent: number;
  last_sent_at?: string;
  enabled: boolean;
  is_verified: boolean;
  health_status: "excellent" | "good" | "warning" | "suspended";
  weight: number;
  credential_ref?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  tls_mode?: string;
  signature_html?: string;
  warmup_enabled: boolean;
  bounce_rate: number;
  spam_rate: number;
  created_at: string;
  updated_at: string;
}

export interface MailboxPool {
  id: string;
  name: string;
  description: string;
  strategy: "round_robin" | "weighted_round_robin" | "least_recently_used" | "least_utilized";
  mailbox_ids: string[];
  daily_capacity: number;
  hourly_capacity: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MailboxRotationSimulation {
  pool_id: string;
  strategy: string;
  assignments: {
    recipient: string;
    mailbox_id: string;
    sender_email: string;
    sender_name: string;
    eligible: boolean;
    reason?: string;
  }[];
  summary_stats: Record<string, number>;
}

export interface AutomationPlaybook {
  id: string;
  name: string;
  description: string;
  category: "b2b_sales" | "saas_onboarding" | "product_launch" | "list_hygiene";
  target_audience: string;
  estimated_days: number;
  steps: CampaignStep[];
  created_at: string;
}

export interface SystemSettings {
  mailbox_rotation_enabled: boolean;
  enforce_sender_continuity: boolean;
  enforce_min_interval: boolean;
  default_rotation_strategy: string;
  default_ip_pool: string;
  require_verified_domain: boolean;
  one_click_unsubscribe: boolean;
  custom_legal_footer: string;
  company_address: string;
  branding_enabled: boolean;
}

export async function fetchMailboxes(): Promise<Mailbox[]> {
  const res = await fetch(`${API_BASE}/api/v1/mailboxes`);
  if (!res.ok) throw new Error("Failed to fetch mailboxes");
  return res.json();
}

export async function addMailbox(mailbox: Partial<Mailbox>): Promise<Mailbox> {
  const res = await fetch(`${API_BASE}/api/v1/mailboxes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mailbox),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to add mailbox");
  }
  return res.json();
}

export async function updateMailbox(mailbox: Partial<Mailbox>): Promise<Mailbox> {
  const res = await fetch(`${API_BASE}/api/v1/mailboxes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mailbox),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update mailbox");
  }
  return res.json();
}

export async function deleteMailbox(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/mailboxes?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete mailbox");
}

export async function fetchMailboxPools(): Promise<MailboxPool[]> {
  const res = await fetch(`${API_BASE}/api/v1/mailbox-pools`);
  if (!res.ok) throw new Error("Failed to fetch mailbox pools");
  return res.json();
}

export async function addMailboxPool(pool: Partial<MailboxPool>): Promise<MailboxPool> {
  const res = await fetch(`${API_BASE}/api/v1/mailbox-pools`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pool),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to add mailbox pool");
  }
  return res.json();
}

export async function updateMailboxPool(pool: Partial<MailboxPool>): Promise<MailboxPool> {
  const res = await fetch(`${API_BASE}/api/v1/mailbox-pools`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pool),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update mailbox pool");
  }
  return res.json();
}

export async function deleteMailboxPool(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/mailbox-pools?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete mailbox pool");
}

export async function simulateMailboxRotation(poolId: string, strategy?: string, recipients?: string[]): Promise<MailboxRotationSimulation> {
  const res = await fetch(`${API_BASE}/api/v1/mailbox-pools/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pool_id: poolId, strategy, recipients }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to simulate mailbox rotation");
  }
  return res.json();
}

export async function fetchPlaybooks(): Promise<AutomationPlaybook[]> {
  const res = await fetch(`${API_BASE}/api/v1/playbooks`);
  if (!res.ok) throw new Error("Failed to fetch automation playbooks");
  return res.json();
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  const res = await fetch(`${API_BASE}/api/v1/settings/system`);
  if (!res.ok) throw new Error("Failed to fetch system settings");
  return res.json();
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const res = await fetch(`${API_BASE}/api/v1/settings/system`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update system settings");
  }
  return res.json();
}

export interface SMTPCredential {
  id: string;
  username: string;
  password?: string;
  description: string;
  pool_id: string;
  enabled: boolean;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export async function fetchSmtpCredentials(): Promise<SMTPCredential[]> {
  const res = await fetch(`${API_BASE}/api/v1/smtp/credentials`);
  if (!res.ok) throw new Error("Failed to fetch SMTP credentials");
  return res.json();
}

export async function addSmtpCredential(cred: {
  username: string;
  password?: string;
  description: string;
  pool_id: string;
}): Promise<SMTPCredential> {
  const res = await fetch(`${API_BASE}/api/v1/smtp/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cred),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create SMTP credential");
  }
  return res.json();
}

export async function deleteSmtpCredential(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/smtp/credentials?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete SMTP credential");
}

export async function toggleSmtpCredential(id: string, enabled: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/smtp/credentials/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, enabled }),
  });
  if (!res.ok) throw new Error("Failed to toggle SMTP credential");
}

export interface SMTPTestResult {
  success: boolean;
  latency_ms: number;
  tls_version?: string;
  message: string;
}

export async function testSmtpConnection(req: {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls_mode?: string;
}): Promise<SMTPTestResult> {
  const res = await fetch(`${API_BASE}/api/v1/smtp/test-connection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to test SMTP connection");
  }
  return res.json();
}

export interface WarmupScheduleProgress {
  mailbox_id: string;
  email: string;
  display_name: string;
  current_limit: number;
  target_limit: number;
  current_day: number;
  total_days: number;
  progress_pct: number;
  strategy: string;
  status: string;
  bounce_rate: number;
  spam_rate: number;
  next_ramp_limit: number;
}

export interface WarmupDaemonSummary {
  total_warming: number;
  total_completed: number;
  total_paused: number;
  schedules: WarmupScheduleProgress[];
  last_evaluated_at: string;
  message?: string;
}

export async function fetchWarmupSummary(): Promise<WarmupDaemonSummary> {
  const res = await fetch(`${API_BASE}/api/v1/warmup/summary`);
  if (!res.ok) throw new Error("Failed to fetch warmup summary");
  return res.json();
}

export async function tickWarmupSchedule(): Promise<WarmupDaemonSummary> {
  const res = await fetch(`${API_BASE}/api/v1/warmup/tick`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to advance warmup schedule");
  return res.json();
}
