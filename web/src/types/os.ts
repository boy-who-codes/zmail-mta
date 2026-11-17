export type AppId =
  | "campaigns"
  | "mailboxes"
  | "workflows"
  | "analytics"
  | "contacts"
  | "suppressions"
  | "inbound"
  | "subaccounts"
  | "webhooks"
  | "templates"
  | "smtp_connect"
  | "kumomta"
  | "dns"
  | "infrastructure"
  | "sandbox"
  | "ippools"
  | "terminal"
  | "settings";

export interface SuppressionEntry {
  id: string;
  email: string;
  domain: string;
  reason: "hard_bounce" | "soft_bounce" | "spam_complaint" | "unsubscribe" | "manual";
  status: "active" | "cleared";
  source_code?: string;
  created_at: string;
  tenant?: string;
}

export interface BounceRecord {
  id: string;
  recipient: string;
  sender: string;
  egress_ip: string;
  action: "hard_bounce" | "soft_bounce" | "spam_block" | "greylisted" | "fbl_complaint";
  enhanced_code: string;
  smtp_code: number;
  provider: "google" | "yahoo" | "outlook" | "apple" | "generic";
  diagnostic: string;
  auto_suppressed: boolean;
  received_at: string;
}

export interface SuppressionStats {
  total_suppressed: number;
  hard_bounces: number;
  spam_complaints: number;
  unsubscribes: number;
  manual_blocks: number;
}

export interface WarmupPlan {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  ramp_type: string;
  daily_limits: Record<number, number>;
  provider_caps: Record<string, number>;
}

export interface IPWarmupSchedule {
  id: string;
  target_type: "ip" | "pool";
  target_id: string;
  plan_id: string;
  plan_name: string;
  status: "warming" | "paused" | "completed";
  current_day: number;
  total_days: number;
  daily_quota: number;
  sent_today: number;
  provider_sent_today: Record<string, number>;
  started_at: string;
  last_day_rollover: string;
  auto_advance: boolean;
  overflow_action: "route_overflow_pool" | "queue_defer" | "hard_reject";
  overflow_pool?: string;
  throttle_stage: string;
}

export interface WarmupStats {
  active_schedules: number;
  paused_schedules: number;
  completed_schedules: number;
  total_quota_today: number;
  total_sent_today: number;
}

export interface ARFReportDetails {
  feedback_type: string;
  user_agent: string;
  original_recipient: string;
  original_mail_from: string;
  original_message_id?: string;
  arrival_date: string;
  reporting_mta: string;
  auto_suppressed: boolean;
}

export interface InboundMessage {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body_text: string;
  body_html: string;
  raw_headers?: Record<string, string>;
  raw_mime?: string;
  spf_status: string;
  dkim_status: string;
  is_arf: boolean;
  arf_report?: ARFReportDetails;
  matched_route?: string;
  webhook_status: string;
  received_at: string;
}

export interface InboundRoute {
  id: string;
  name: string;
  priority: number;
  pattern: string;
  action: "store" | "webhook" | "forward" | "drop";
  webhook_url?: string;
  forward_to?: string;
  enabled: boolean;
  created_at: string;
}

export interface InboundStats {
  total_inbound: number;
  arf_reports: number;
  webhooks_dispatched: number;
  auto_suppressed_complaints: number;
}

export interface AppDefinition {
  id: AppId;
  title: string;
  shortTitle: string;
  iconName: string;
  category: "Delivery" | "Network" | "Observability" | "System";
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  description: string;
}

export interface WindowInstance {
  id: string; // usually same as appId, or unique for multiple instances
  appId: AppId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  prevBounds?: { x: number; y: number; width: number; height: number };
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "heartbeat";
  appId?: AppId;
  read: boolean;
}

export interface ClusterStatus {
  nodesOnline: number;
  nodesTotal: number;
  throughputMsgSec: number;
  queueDepth: number;
  acceptanceRate: number;
  agentHealthy: boolean;
  heartbeatSync: boolean;
}

export interface Subaccount {
  id: string;
  name: string;
  status: "active" | "suspended" | "disabled";
  dedicated_pool: string;
  allowed_domains: string[];
  hourly_quota: number;
  daily_quota: number;
  sent_today: number;
  sent_total: number;
  last_sent_at?: string;
  created_at: string;
}

export interface APIKey {
  id: string;
  name: string;
  key?: string;
  key_prefix: string;
  subaccount_id: string;
  role: "admin" | "sender" | "analyst" | "custom";
  permissions: string[];
  status: "active" | "revoked";
  last_used_at?: string;
  created_at: string;
}

export interface SubaccountStats {
  total_subaccounts: number;
  active_subaccounts: number;
  active_api_keys: number;
  total_quota_today: number;
  total_sent_today: number;
}

export interface IngestionWorkerStats {
  active_workers: number;
  max_workers: number;
  stream_name: string;
  stream_depth: number;
  total_ingested: number;
  total_processed: number;
  current_throughput_mps: number;
  suppressed_blocked: number;
  quota_blocked: number;
  avg_processing_ms: number;
  redis_connected: boolean;
}

export interface BulkInjectResponse {
  batch_id: string;
  total_queued: number;
  stream: string;
  status: string;
}

export interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  status: "active" | "paused";
  created_at: string;
}

export interface EventWebhookPayload {
  event_id: string;
  event_type: "delivered" | "bounced" | "opened" | "clicked" | "spam_complaint";
  timestamp: string;
  message_id: string;
  recipient: string;
  sender: string;
  domain: string;
  pool: string;
  subaccount_id?: string;
  details?: Record<string, any>;
}

export interface WebhookStats {
  total_subscriptions: number;
  active_subscriptions: number;
  total_dispatched: number;
  total_failed: number;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  html: string;
  text: string;
  variables: string[];
  sample_data?: Record<string, string>;
  version: number;
  updated_at: string;
  created_at: string;
}

export interface RenderTemplateRequest {
  template_id?: string;
  html?: string;
  subject?: string;
  variables: Record<string, string>;
}

export interface RenderTemplateResponse {
  subject: string;
  html: string;
  text: string;
}

export interface DeliverabilityHealthReport {
  overall_score: number;
  compliance_status: string;
  spam_complaint_rate: number;
  spam_threshold: number;
  hard_bounce_rate: number;
  bounce_threshold: number;
  dmarc_enforcement: boolean;
  rfc8058_one_click_unsub: boolean;
  tls13_enforced: boolean;
  recommendations: string[];
  audited_at: string;
}
