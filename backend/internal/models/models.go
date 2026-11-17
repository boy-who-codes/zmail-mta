package models

import "time"

// Node represents a managed Linux host running KumoMTA
type Node struct {
	ID          string    `json:"id"`
	Hostname    string    `json:"hostname"`
	IP          string    `json:"ip"`
	Region      string    `json:"region"`
	SpoolUsedGB float64   `json:"spool_used_gb"`
	SpoolCapGB  float64   `json:"spool_cap_gb"`
	CPUPercent  float64   `json:"cpu_percent"`
	MemoryUsed  float64   `json:"memory_used_gb"`
	MemoryTotal float64   `json:"memory_total_gb"`
	QueueDepth  int       `json:"queue_depth"`
	Status      string    `json:"status"` // "online", "maintenance", "unhealthy"
	AgentSync   bool      `json:"agent_sync"`
	LastSeen    time.Time `json:"last_seen"`
}

// Domain represents a sending domain with authentication records
type Domain struct {
	ID             string    `json:"id"`
	DomainName     string    `json:"domain_name"`
	IsPrimary      bool      `json:"is_primary"`
	SPFStatus      string    `json:"spf_status"`      // "valid", "invalid", "pending"
	DKIMStatus     string    `json:"dkim_status"`     // "valid", "invalid", "pending"
	DMARCStatus    string    `json:"dmarc_status"`    // "valid", "invalid", "pending"
	PTRStatus      string    `json:"ptr_status"`      // "valid", "invalid", "pending"
	AssignedPoolID string    `json:"assigned_pool_id"`
	DKIMSelector   string    `json:"dkim_selector"`
	DKIMPublicKey  string    `json:"dkim_public_key"`
	SPFRecord      string    `json:"spf_record,omitempty"`
	DMARCRecord    string    `json:"dmarc_record,omitempty"`
	MXRecord       string    `json:"mx_record,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	VerifiedAt     time.Time `json:"verified_at"`
}

// SendingIP represents a dedicated IPv4/IPv6 address
type SendingIP struct {
	IP             string  `json:"ip"`
	Interface      string  `json:"interface"`
	PoolID         string  `json:"pool_id"`
	ReverseDNS     string  `json:"reverse_dns"`
	ReputationScore int    `json:"reputation_score"` // 0 - 100
	Weight         float64 `json:"weight"`
	Status         string  `json:"status"` // "active", "quarantine", "warmup"
}

// IPPool represents a grouped egress pool with rate policies
type IPPool struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Type         string   `json:"type"` // "transactional", "marketing", "quarantine"
	IPs          []string `json:"ips"`
	WarmupStatus string   `json:"warmup_status"` // "complete", "in_progress", "paused"
	WarmupDay    int      `json:"warmup_day"`
	DailyTarget  int64    `json:"daily_target"`
	DailySent    int64    `json:"daily_sent"`
}

// DestinationQueue represents outgoing messages grouped by mailbox provider
type DestinationQueue struct {
	DomainName   string `json:"domain_name"`
	ReadyCount   int    `json:"ready_count"`
	DeferredCount int   `json:"deferred_count"`
	OldestSec    int    `json:"oldest_sec"`
	ThrottleRule string `json:"throttle_rule"`
}

// QueuedMessage represents an individual email in the delivery pipeline
type QueuedMessage struct {
	ID          string    `json:"id"`
	Recipient   string    `json:"recipient"`
	Sender      string    `json:"sender"`
	Subject     string    `json:"subject"`
	Domain      string    `json:"domain"`
	EgressIP    string    `json:"egress_ip"`
	Status      string    `json:"status"` // "waiting_to_send", "delivered", "temporarily_delayed", "bounced"
	Attempts    int       `json:"attempts"`
	LastAttempt time.Time `json:"last_attempt"`
	CreatedAt   time.Time `json:"created_at"`
	Response    string    `json:"response,omitempty"`
	HTML        string    `json:"html,omitempty"`
	Text        string    `json:"text,omitempty"`
	Pool        string    `json:"pool,omitempty"`
	IsOpened    bool      `json:"is_opened,omitempty"`
	Placement   string    `json:"placement,omitempty"` // "inbox", "spam", "bounced"
}

// InjectRequest is the body for POST /api/v1/inject
type InjectRequest struct {
	From       string            `json:"from"`
	To         string            `json:"to"`
	Subject    string            `json:"subject"`
	HTML       string            `json:"html,omitempty"`
	Text       string            `json:"text,omitempty"`
	Pool       string            `json:"pool,omitempty"`
	TemplateID string            `json:"template_id,omitempty"`
	Variables  map[string]string `json:"variables,omitempty"`
}

// InjectResponse is the outcome of a message submission
type InjectResponse struct {
	Success   bool   `json:"success"`
	MessageID string `json:"message_id"`
	Queue     string `json:"queue"`
	Status    string `json:"status"`
	Details   string `json:"details"`
}

// AnalyticsSummary represents deliverability performance metrics
type AnalyticsSummary struct {
	DeliverySuccessRate float64            `json:"delivery_success_rate"`
	ThroughputMsgSec    int                `json:"throughput_msg_sec"`
	BounceRate          float64            `json:"bounce_rate"`
	OpenRate            float64            `json:"open_rate"`
	InboxRate           float64            `json:"inbox_rate"`
	SpamRate            float64            `json:"spam_rate"`
	AverageLatencyMs    int                `json:"average_latency_ms"`
	TotalSentToday      int64              `json:"total_sent_today"`
	DeliveredCount      int64              `json:"delivered_count"`
	InboxCount          int64              `json:"inbox_count"`
	SpamCount           int64              `json:"spam_count"`
	BouncedCount        int64              `json:"bounced_count"`
	OpenedCount         int64              `json:"opened_count"`
	HourlyDistribution  []int64            `json:"hourly_distribution"`
	ProviderBreakdown   map[string]float64 `json:"provider_breakdown"`
	Outcomes            map[string]int64   `json:"outcomes"`
}

// RateLimit represents a traffic shaping configuration rule for an email destination
type RateLimit struct {
	Domain                     string `json:"domain"`
	ConnectionLimit            int    `json:"connection_limit"`
	MaxConnectionRate          string `json:"max_connection_rate"`
	MaxDeliveriesPerConnection int    `json:"max_deliveries_per_connection"`
	MaxMessageRate             string `json:"max_message_rate"`
}

// QueueActionRequest represents an administrative action on a destination queue
type QueueActionRequest struct {
	Queue  string `json:"queue"`
	Action string `json:"action"` // "flush", "pause", "resume", "clear"
}

// SystemStatus represents top-level platform and server health
type SystemStatus struct {
	Status           string `json:"status"` // "healthy", "degraded", "offline"
	NodesOnline      int    `json:"nodes_online"`
	NodesTotal       int    `json:"nodes_total"`
	ThroughputMsgSec int    `json:"throughput_msg_sec"`
	QueueDepthTotal  int    `json:"queue_depth_total"`
	AcceptanceRate   float64 `json:"acceptance_rate"`
	ServerSync       bool   `json:"server_sync"`
	Version          string `json:"version"`
}

// RelayWhitelistEntry represents an authorized client IP or CIDR block
type RelayWhitelistEntry struct {
	ID          string    `json:"id"`
	CIDR        string    `json:"cidr"`        // e.g. "203.0.113.50/32", "10.0.0.0/8", "127.0.0.1"
	Description string    `json:"description"` // e.g. "Production Laravel Web App", "Mautic Node"
	CreatedAt   time.Time `json:"created_at"`
	LastSeen    time.Time `json:"last_seen,omitempty"`
}

// IncomingConnectionLog represents an observed client connection to the SMTP relay or injection API
type IncomingConnectionLog struct {
	ID        string    `json:"id"`
	SourceIP  string    `json:"source_ip"`
	Hostname  string    `json:"hostname"`
	Port      int       `json:"port"`
	Protocol  string    `json:"protocol"` // "ESMTP", "ESMTPS", "HTTP_REST"
	AuthUser  string    `json:"auth_user"`
	Status    string    `json:"status"` // "accepted", "relayed", "whitelisted", "authenticated", "rejected"
	Timestamp time.Time `json:"timestamp"`
	MsgCount  int       `json:"msg_count"`
}

// HostConnectionInfo holds real-time listener and host connection parameters
type HostConnectionInfo struct {
	DetectedHost   string   `json:"detected_host"`
	PrimaryIP      string   `json:"primary_ip"`
	SMTPPorts      []int    `json:"smtp_ports"`
	APIEndpoint    string   `json:"api_endpoint"`
	KumoEndpoint   string   `json:"kumo_endpoint"`
	AuthMechanisms []string `json:"auth_mechanisms"`
}

// SuppressionEntry represents an email address or wildcard domain blocked from delivery
type SuppressionEntry struct {
	ID         string    `json:"id"`
	Email      string    `json:"email"`
	Domain     string    `json:"domain"`
	Reason     string    `json:"reason"`      // "hard_bounce", "spam_complaint", "unsubscribe", "manual"
	Status     string    `json:"status"`      // "active", "released"
	SourceCode string    `json:"source_code"` // e.g. "550 5.1.1 User unknown"
	CreatedAt  time.Time `json:"created_at"`
	Tenant     string    `json:"tenant"`      // "global" or pool/tenant ID
}

// BounceRecord represents an analyzed delivery bounce event
type BounceRecord struct {
	ID             string    `json:"id"`
	Recipient      string    `json:"recipient"`
	Sender         string    `json:"sender"`
	Domain         string    `json:"domain"`
	EgressIP       string    `json:"egress_ip"`
	StatusCode     string    `json:"status_code"`  // "5.1.1", "5.7.1", "4.2.2"
	BounceClass    string    `json:"bounce_class"` // "hard_bounce", "soft_bounce", "spam_block", "greylisted", "fbl_complaint"
	RawResponse    string    `json:"raw_response"`
	Provider       string    `json:"provider"` // "google", "yahoo", "outlook", "apple", "generic"
	Timestamp      time.Time `json:"timestamp"`
	AutoSuppressed bool      `json:"auto_suppressed"`
}

// SuppressionStats holds summary counts for suppression and bounce operations
type SuppressionStats struct {
	TotalSuppressed int `json:"total_suppressed"`
	HardBounces     int `json:"hard_bounces"`
	SpamComplaints  int `json:"spam_complaints"`
	Unsubscribes    int `json:"unsubscribes"`
	ManualBlocks    int `json:"manual_blocks"`
}

// WarmupPlan defines a graduated volume ramp curve over multiple days
type WarmupPlan struct {
	ID           string             `json:"id"`
	Name         string             `json:"name"`
	Description  string             `json:"description"`
	DurationDays int                `json:"duration_days"`
	RampType     string             `json:"ramp_type"` // "graduated", "exponential", "linear"
	DailyLimits  map[int]int64      `json:"daily_limits"`
	ProviderCaps map[string]float64 `json:"provider_caps"` // e.g. "gmail.com": 0.35, "yahoo.com": 0.25
}

// IPWarmupSchedule represents an active automated warmup schedule for an IP or Pool
type IPWarmupSchedule struct {
	ID                string           `json:"id"`
	TargetType        string           `json:"target_type"` // "ip" or "pool"
	TargetID          string           `json:"target_id"`   // e.g. "192.0.2.1" or "pool-1"
	PlanID            string           `json:"plan_id"`
	PlanName          string           `json:"plan_name"`
	Status            string           `json:"status"` // "warming", "paused", "completed"
	CurrentDay        int              `json:"current_day"`
	TotalDays         int              `json:"total_days"`
	DailyQuota        int64            `json:"daily_quota"`
	SentToday         int64            `json:"sent_today"`
	ProviderSentToday map[string]int64 `json:"provider_sent_today"`
	StartedAt         time.Time        `json:"started_at"`
	LastDayRollover   time.Time        `json:"last_day_rollover"`
	AutoAdvance       bool             `json:"auto_advance"`
	OverflowAction    string           `json:"overflow_action"` // "route_overflow_pool", "queue_defer", "hard_reject"
	OverflowPool      string           `json:"overflow_pool,omitempty"`
	ThrottleStage     string           `json:"throttle_stage"` // "Stage 1: Cold Initiation", "Stage 2: Graduated", etc.
}

// WarmupStats holds high-level metrics for active warmup pipelines
type WarmupStats struct {
	ActiveSchedules   int   `json:"active_schedules"`
	PausedSchedules   int   `json:"paused_schedules"`
	CompletedSchedules int  `json:"completed_schedules"`
	TotalQuotaToday   int64 `json:"total_quota_today"`
	TotalSentToday    int64 `json:"total_sent_today"`
}

// Campaign represents an email broadcast campaign
type Campaign struct {
	ID                string            `json:"id"`
	Name              string            `json:"name"`
	Subject           string            `json:"subject"`
	FromName          string            `json:"from_name"`
	FromEmail         string            `json:"from_email"`
	ReplyTo           string            `json:"reply_to,omitempty"`
	ReturnPathDomain  string            `json:"return_path_domain,omitempty"`
	CategoryTag       string            `json:"category_tag,omitempty"` // e.g. "[Q4-Enterprise]", "[Warmup]"
	Priority          string            `json:"priority,omitempty"`     // "high", "normal", "bulk"
	Audience          string            `json:"audience"`
	RecipientCount    int               `json:"recipient_count"`
	Status            string            `json:"status"` // "draft", "scheduled", "sending", "completed", "paused"
	SentCount         int               `json:"sent_count"`
	OpenRate          float64           `json:"open_rate"`
	ClickRate         float64           `json:"click_rate"`
	ScheduledAt       string            `json:"scheduled_at,omitempty"`
	CreatedAt         time.Time         `json:"created_at"`
	BodyHTML          string            `json:"body_html"`
	BodyPreview       string            `json:"body_preview"`
	IPPool            string            `json:"ip_pool,omitempty"`
	Recipients        []string          `json:"recipients,omitempty"`
	TemplateID        string            `json:"template_id,omitempty"`
	Steps             []CampaignStep    `json:"steps,omitempty"`             // Unified timeline steps
	SenderMode        string            `json:"sender_mode,omitempty"`       // "single" | "pool"
	MailboxPoolID     string            `json:"mailbox_pool_id,omitempty"`   // assigned pool if mode=="pool"
	RotationStrategy  string            `json:"rotation_strategy,omitempty"` // "round_robin" | "weighted_round_robin" | "least_recently_used" | "least_utilized"
	SendWindowStart   string            `json:"send_window_start,omitempty"` // e.g. "09:00"
	SendWindowEnd     string            `json:"send_window_end,omitempty"`   // e.g. "17:00"
	SendWindowDays    string            `json:"send_window_days,omitempty"`  // "business_days" | "all_days"
	JitterMinSeconds  int               `json:"jitter_min_seconds,omitempty"`
	JitterMaxSeconds  int               `json:"jitter_max_seconds,omitempty"`
	DailyCap          int               `json:"daily_cap,omitempty"`
	CustomHeaders     map[string]string `json:"custom_headers,omitempty"`
	TrackOpens        bool              `json:"track_opens"`
	TrackClicks       bool              `json:"track_clicks"`
	TrackingDomain    string            `json:"tracking_domain,omitempty"`
	CustomFooterHTML  string            `json:"custom_footer_html,omitempty"`
	UnsubscribeURL    string            `json:"unsubscribe_url,omitempty"`
	UnsubscribeText   string            `json:"unsubscribe_text,omitempty"`
	CompanyAddress    string            `json:"company_address,omitempty"`
	EnableOneClick    bool              `json:"enable_one_click,omitempty"`
	EnableBranding    bool              `json:"enable_branding,omitempty"`
}

// Mailbox represents an authorized sender identity within a rotation pool
type Mailbox struct {
	ID                 string    `json:"id"`
	Email              string    `json:"email"`
	DisplayName        string    `json:"display_name"`
	FirstName          string    `json:"first_name,omitempty"`
	LastName           string    `json:"last_name,omitempty"`
	Department         string    `json:"department,omitempty"`
	Domain             string    `json:"domain"`
	DKIMSelector       string    `json:"dkim_selector,omitempty"`
	IPPoolID           string    `json:"ip_pool_id"`
	DailyLimit         int       `json:"daily_limit"`
	HourlyLimit        int       `json:"hourly_limit"`
	MinIntervalSeconds int       `json:"min_interval_seconds"`
	DailySent          int       `json:"daily_sent"`
	HourlySent         int       `json:"hourly_sent"`
	LastSentAt         time.Time `json:"last_sent_at"`
	Enabled            bool      `json:"enabled"`
	IsVerified         bool      `json:"is_verified"`
	HealthStatus       string    `json:"health_status"` // "excellent", "good", "warning", "suspended"
	Weight             int       `json:"weight"`        // 1-100 for weighted round robin
	CredentialRef      string    `json:"credential_ref,omitempty"` // encrypted key reference or "system_internal"
	SMTPHost           string    `json:"smtp_host,omitempty"`
	SMTPPort           int       `json:"smtp_port,omitempty"`
	SMTPUser           string    `json:"smtp_user,omitempty"`
	TLSMode            string    `json:"tls_mode,omitempty"` // "starttls", "tls13", "opportunistic"
	SignatureHTML      string    `json:"signature_html,omitempty"`
	WarmupEnabled      bool      `json:"warmup_enabled"`
	BounceRate         float64   `json:"bounce_rate"`
	SpamRate           float64   `json:"spam_rate"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// MailboxPool groups multiple mailboxes for automated sender rotation
type MailboxPool struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	Strategy       string    `json:"strategy"` // "round_robin", "weighted_round_robin", "least_recently_used", "least_utilized"
	MailboxIDs     []string  `json:"mailbox_ids"`
	DailyCapacity  int       `json:"daily_capacity"`
	HourlyCapacity int       `json:"hourly_capacity"`
	Enabled        bool      `json:"enabled"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// MailboxAssignment tracks persistent recipient-to-mailbox bindings for sender consistency across retries
type MailboxAssignment struct {
	CampaignID        string    `json:"campaign_id"`
	Recipient         string    `json:"recipient"`
	MailboxID         string    `json:"mailbox_id"`
	SenderEmail       string    `json:"sender_email"`
	SenderName        string    `json:"sender_name"`
	OriginalMessageID string    `json:"original_message_id,omitempty"`
	AssignedAt        time.Time `json:"assigned_at"`
}

// MailboxRotationSimulation provides preview data of recipient distributions
type MailboxRotationSimulation struct {
	PoolID       string                       `json:"pool_id"`
	Strategy     string                       `json:"strategy"`
	Assignments  []RecipientMailboxSimulation `json:"assignments"`
	SummaryStats map[string]int               `json:"summary_stats"`
}

// RecipientMailboxSimulation details a simulated recipient dispatch
type RecipientMailboxSimulation struct {
	Recipient   string `json:"recipient"`
	MailboxID   string `json:"mailbox_id"`
	SenderEmail string `json:"sender_email"`
	SenderName  string `json:"sender_name"`
	Eligible    bool   `json:"eligible"`
	Reason      string `json:"reason,omitempty"`
}

// SystemSettings provides cluster-wide operational defaults and master toggles
type SystemSettings struct {
	MailboxRotationEnabled   bool   `json:"mailbox_rotation_enabled"` // Master toggle for mailbox rotation
	EnforceSenderContinuity  bool   `json:"enforce_sender_continuity"` // Prohibits rotation in follow-up steps
	EnforceMinInterval       bool   `json:"enforce_min_interval"`
	DefaultRotationStrategy  string `json:"default_rotation_strategy"`
	DefaultIPPool            string `json:"default_ip_pool"`
	RequireVerifiedDomain    bool   `json:"require_verified_domain"`
	OneClickUnsubscribe      bool   `json:"one_click_unsubscribe"`
	CustomLegalFooter        string `json:"custom_legal_footer"`
	CompanyAddress           string `json:"company_address"`
	BrandingEnabled          bool   `json:"branding_enabled"`
}

// CampaignDispatchRequest requests execution of a campaign broadcast
type CampaignDispatchRequest struct {
	CampaignID string   `json:"campaign_id"`
	Recipients []string `json:"recipients,omitempty"`
}

// CampaignDispatchResponse provides execution results of a campaign
type CampaignDispatchResponse struct {
	CampaignID      string `json:"campaign_id"`
	Status          string `json:"status"`
	SentCount       int    `json:"sent_count"`
	SuppressedCount int    `json:"suppressed_count"`
	Message         string `json:"message"`
}

// Contact represents an audience subscriber
type Contact struct {
	ID             string    `json:"id"`
	Email          string    `json:"email"`
	Name           string    `json:"name"`
	Company        string    `json:"company,omitempty"`
	Tags           []string  `json:"tags"`
	Status         string    `json:"status"` // "subscribed", "unsubscribed", "bounced", "suppressed"
	DeliveryHealth string    `json:"delivery_health"` // "optimal", "caution", "risk"
	SentCount      int       `json:"sent_count"`
	OpenRate       float64   `json:"open_rate"`
	LastActive     string    `json:"last_active"`
	CreatedAt      time.Time `json:"created_at"`
}

// SeedPreflightTestRequest requests inbox placement simulation
type SeedPreflightTestRequest struct {
	Subject   string `json:"subject"`
	FromEmail string `json:"from_email"`
	FromName  string `json:"from_name"`
	HTMLBody  string `json:"html_body"`
}

// SeedISPResult details predicted placement per mailbox provider
type SeedISPResult struct {
	Provider       string  `json:"provider"`
	PredictedInbox float64 `json:"predicted_inbox"`
	PredictedSpam  float64 `json:"predicted_spam"`
	PredictedLost  float64 `json:"predicted_lost"`
	Status         string  `json:"status"`
	Details        string  `json:"details"`
}

// SeedPreflightTestResponse is the simulation outcome
type SeedPreflightTestResponse struct {
	OverallSpamScore float64         `json:"overall_spam_score"`
	PlacementStatus  string          `json:"placement_status"`
	SPFValid         bool            `json:"spf_valid"`
	DKIMValid        bool            `json:"dkim_valid"`
	DMARCValid       bool            `json:"dmarc_valid"`
	SpamTriggers     []string        `json:"spam_triggers"`
	ISPBreakdown     []SeedISPResult `json:"isp_breakdown"`
	Timestamp        time.Time       `json:"timestamp"`
}

// InboundMessage represents an email received by KumoMTA MX listener
type InboundMessage struct {
	ID            string            `json:"id"`
	Sender        string            `json:"sender"`
	Recipient     string            `json:"recipient"`
	Subject       string            `json:"subject"`
	BodyText      string            `json:"body_text"`
	BodyHTML      string            `json:"body_html"`
	RawHeaders    map[string]string `json:"raw_headers,omitempty"`
	RawMIME       string            `json:"raw_mime,omitempty"`
	SPFStatus     string            `json:"spf_status"`  // "pass", "fail", "neutral", "none"
	DKIMStatus    string            `json:"dkim_status"` // "pass", "fail", "none"
	IsARF         bool              `json:"is_arf"`
	ARFReport     *ARFReportDetails `json:"arf_report,omitempty"`
	MatchedRoute  string            `json:"matched_route,omitempty"`
	WebhookStatus string            `json:"webhook_status"` // "none", "dispatched", "failed"
	ReceivedAt    time.Time         `json:"received_at"`
}

// ARFReportDetails contains parsed RFC 5965 Abuse Reporting Format fields
type ARFReportDetails struct {
	FeedbackType      string    `json:"feedback_type"` // "abuse", "opt-out", "fraud", "virus"
	UserAgent         string    `json:"user_agent"`
	OriginalRecipient string    `json:"original_recipient"`
	OriginalMailFrom  string    `json:"original_mail_from"`
	OriginalMessageID string    `json:"original_message_id,omitempty"`
	ArrivalDate       time.Time `json:"arrival_date"`
	ReportingMTA      string    `json:"reporting_mta"`
	AutoSuppressed    bool      `json:"auto_suppressed"`
}

// InboundRoute defines pattern-matching and webhook dispatch rules for inbound mail
type InboundRoute struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Priority   int       `json:"priority"`
	Pattern    string    `json:"pattern"` // e.g. "*@*", "@domain.com", "support+*@domain.com"
	Action     string    `json:"action"`  // "store", "webhook", "forward", "drop"
	WebhookURL string    `json:"webhook_url,omitempty"`
	ForwardTo  string    `json:"forward_to,omitempty"`
	Enabled    bool      `json:"enabled"`
	CreatedAt  time.Time `json:"created_at"`
}

// InboundStats holds aggregate metrics for inbound MX traffic and feedback loops
type InboundStats struct {
	TotalInbound             int `json:"total_inbound"`
	ARFReports               int `json:"arf_reports"`
	WebhooksDispatched       int `json:"webhooks_dispatched"`
	AutoSuppressedComplaints int `json:"auto_suppressed_complaints"`
}

// Subaccount represents an enterprise tenant or customer sub-account (Bird/SendGrid/Mailgun parity)
type Subaccount struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Status         string    `json:"status"`          // "active", "suspended", "disabled"
	DedicatedPool  string    `json:"dedicated_pool"`  // Egress pool ID or "default"
	AllowedDomains []string  `json:"allowed_domains"` // Empty means any verified domain
	HourlyQuota    int       `json:"hourly_quota"`    // 0 = unlimited
	DailyQuota     int       `json:"daily_quota"`     // 0 = unlimited
	SentToday      int       `json:"sent_today"`
	SentTotal      int       `json:"sent_total"`
	LastSentAt     time.Time `json:"last_sent_at,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// APIKey represents a scoped credential for API injection and management
type APIKey struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Key          string    `json:"key"`          // e.g. "mops_live_..."
	KeyPrefix    string    `json:"key_prefix"`   // e.g. "mops_live_ab12..." for safe UI display
	SubaccountID string    `json:"subaccount_id"`// "global" or specific tenant ID
	Role         string    `json:"role"`         // "admin", "sender", "analyst", "custom"
	Permissions  []string  `json:"permissions"`  // ["mail:send", "analytics:read", "suppressions:read", "suppressions:write", "domains:read", "domains:write"]
	Status       string    `json:"status"`       // "active", "revoked"
	LastUsedAt   time.Time `json:"last_used_at,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// SubaccountStats holds aggregate metrics for multi-tenant accounts
type SubaccountStats struct {
	TotalSubaccounts  int `json:"total_subaccounts"`
	ActiveSubaccounts int `json:"active_subaccounts"`
	ActiveAPIKeys     int `json:"active_api_keys"`
	TotalQuotaToday   int `json:"total_quota_today"`
	TotalSentToday    int `json:"total_sent_today"`
}

// BulkInjectRequest allows pushing high-volume email batches into the Redis stream
type BulkInjectRequest struct {
	SubaccountID string          `json:"subaccount_id,omitempty"`
	Pool         string          `json:"pool,omitempty"`
	Messages     []InjectRequest `json:"messages"`
}

// BulkInjectResponse acknowledges stream buffering
type BulkInjectResponse struct {
	BatchID     string `json:"batch_id"`
	TotalQueued int    `json:"total_queued"`
	Stream      string `json:"stream"`
	Status      string `json:"status"` // "buffered"
}

// IngestionWorkerStats reports high-velocity ingestion pipeline health
type IngestionWorkerStats struct {
	ActiveWorkers        int     `json:"active_workers"`
	MaxWorkers           int     `json:"max_workers"`
	StreamName           string  `json:"stream_name"`
	StreamDepth          int64   `json:"stream_depth"`
	TotalIngested        int64   `json:"total_ingested"`
	TotalProcessed       int64   `json:"total_processed"`
	CurrentThroughputMPS float64 `json:"current_throughput_mps"` // msgs per second
	SuppressedBlocked    int64   `json:"suppressed_blocked"`
	QuotaBlocked         int64   `json:"quota_blocked"`
	AvgProcessingMs      float64 `json:"avg_processing_ms"`
	RedisConnected       bool    `json:"redis_connected"`
}

// WebhookSubscription represents an HTTP callback destination for delivery events (Phase 7)
type WebhookSubscription struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	Secret    string    `json:"secret"` // HMAC-SHA256 signature secret
	Events    []string  `json:"events"` // ["delivered", "bounced", "opened", "clicked", "spam_complaint"]
	Status    string    `json:"status"` // "active", "paused"
	CreatedAt time.Time `json:"created_at"`
}

// EventWebhookPayload represents the structured webhook delivery payload sent to subscriber endpoints
type EventWebhookPayload struct {
	EventID      string                 `json:"event_id"`
	EventType    string                 `json:"event_type"` // "delivered", "bounced", "opened", "clicked", "spam_complaint"
	Timestamp    time.Time              `json:"timestamp"`
	MessageID    string                 `json:"message_id"`
	Recipient    string                 `json:"recipient"`
	Sender       string                 `json:"sender"`
	Domain       string                 `json:"domain"`
	Pool         string                 `json:"pool"`
	SubaccountID string                 `json:"subaccount_id,omitempty"`
	Details      map[string]interface{} `json:"details,omitempty"`
}

// WebhookStats holds aggregate metrics for Phase 7 webhook dispatches
type WebhookStats struct {
	TotalSubscriptions  int   `json:"total_subscriptions"`
	ActiveSubscriptions int   `json:"active_subscriptions"`
	TotalDispatched     int64 `json:"total_dispatched"`
	TotalFailed         int64 `json:"total_failed"`
}

// Template represents a reusable email template with variable merge tokens (SendGrid/Mailgun parity)
type Template struct {
	ID         string            `json:"id"`
	Name       string            `json:"name"`
	Subject    string            `json:"subject"`
	HTML       string            `json:"html"`
	Text       string            `json:"text"`
	Variables  []string          `json:"variables"` // extracted dynamic tags, e.g. ["first_name", "company", "cta_url"]
	SampleData map[string]string `json:"sample_data,omitempty"`
	Version    int               `json:"version"`
	UpdatedAt  time.Time         `json:"updated_at"`
	CreatedAt  time.Time         `json:"created_at"`
}

// RenderTemplateRequest holds template ID or raw content with variable map
type RenderTemplateRequest struct {
	TemplateID string            `json:"template_id,omitempty"`
	HTML       string            `json:"html,omitempty"`
	Subject    string            `json:"subject,omitempty"`
	Variables  map[string]string `json:"variables"`
}

// RenderTemplateResponse returns the merged HTML and subject
type RenderTemplateResponse struct {
	Subject string `json:"subject"`
	HTML    string `json:"html"`
	Text    string `json:"text"`
}

// DeliverabilityHealthReport provides continuous Google/Yahoo Postmaster compliance auditing
type DeliverabilityHealthReport struct {
	OverallScore         int       `json:"overall_score"`         // 0 - 100
	ComplianceStatus     string    `json:"compliance_status"`     // "Fully Compliant", "Warning", "Critical Non-Compliance"
	SpamComplaintRate    float64   `json:"spam_complaint_rate"`    // e.g. 0.02%
	SpamThreshold        float64   `json:"spam_threshold"`        // 0.10%
	HardBounceRate       float64   `json:"hard_bounce_rate"`      // e.g. 0.45%
	BounceThreshold      float64   `json:"bounce_threshold"`     // 2.00%
	DMARCEnforcement     bool      `json:"dmarc_enforcement"`     // true if p=reject or quarantine
	RFC8058OneClickUnsub bool      `json:"rfc8058_one_click_unsub"`
	TLS13Enforced        bool      `json:"tls13_enforced"`
	Recommendations      []string  `json:"recommendations"`
	AuditedAt            time.Time `json:"audited_at"`
}

// InfrastructureInfo details auto-detected server host and networking configuration
type InfrastructureInfo struct {
	PublicIP         string    `json:"public_ip"`
	LocalIP          string    `json:"local_ip"`
	Hostname         string    `json:"hostname"`
	SMTPHostname     string    `json:"smtp_hostname"`
	Environment      string    `json:"environment"`
	DetectionSource  string    `json:"detection_source"` // "environment_variable", "configured_ip", "provider_consensus", "interface_fallback"
	DetectionStatus  string    `json:"detection_status"` // "verified", "cached", "degraded", "fallback"
	ProviderAgreed   []string  `json:"provider_agreed,omitempty"`
	LastDetectedAt   time.Time `json:"last_detected_at"`
	IsExplicit       bool      `json:"is_explicit"`
	IPVersion        string    `json:"ip_version"` // "IPv4", "IPv6"
	ReverseDNS       string    `json:"reverse_dns,omitempty"`
	PTRStatus        string    `json:"ptr_status"` // "matched", "mismatched", "pending", "unconfigured"
	PTRGuidance      string    `json:"ptr_guidance"`
	SuggestedARecord string    `json:"suggested_a_record"`
	SuggestedSPF     string    `json:"suggested_spf"`
	SuggestedMX      string    `json:"suggested_mx"`
}

// SMTPCredential represents an authenticated user for SMTP submission (ports 587, 2525, 25)
type SMTPCredential struct {
	ID           string     `json:"id"`
	Username     string     `json:"username"`
	Password     string     `json:"password,omitempty"`
	PasswordHash string     `json:"password_hash,omitempty"`
	Description  string     `json:"description"`
	PoolID       string     `json:"pool_id"`
	Enabled      bool       `json:"enabled"`
	LastUsedAt   *time.Time `json:"last_used_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// SMTPAuthRequest is sent by KumoMTA Lua hooks (AUTH LOGIN / AUTH PLAIN)
type SMTPAuthRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// SMTPAuthResponse is returned to KumoMTA Lua hooks
type SMTPAuthResponse struct {
	Authenticated bool   `json:"authenticated"`
	Username      string `json:"username,omitempty"`
	Pool          string `json:"pool,omitempty"`
	Message       string `json:"message,omitempty"`
}
