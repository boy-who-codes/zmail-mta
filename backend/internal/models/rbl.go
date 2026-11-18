package models

import "time"

// RBLProviderResult details the response from a single DNS Blacklist server
type RBLProviderResult struct {
	Name           string `json:"name"`
	Zone           string `json:"zone"`
	Listed         bool   `json:"listed"`
	ReturnCode     string `json:"return_code,omitempty"`
	Description    string `json:"description"`
	ResponseTimeMs int64  `json:"response_time_ms"`
}

// RBLTargetAudit represents the full blacklist audit outcome for a single IP or domain
type RBLTargetAudit struct {
	Target          string              `json:"target"`
	TargetType      string              `json:"target_type"` // "ip" or "domain"
	IsClean         bool                `json:"is_clean"`
	ListedCount     int                 `json:"listed_count"`
	TotalChecked    int                 `json:"total_checked"`
	ReputationScore int                 `json:"reputation_score"` // 0 to 100
	CheckedAt       time.Time           `json:"checked_at"`
	Providers       []RBLProviderResult `json:"providers"`
}

// RBLAuditSummary is the aggregate report across all system egress IPs and sending domains
type RBLAuditSummary struct {
	OverallClean   bool             `json:"overall_clean"`
	TotalTargets   int              `json:"total_targets"`
	CleanTargets   int              `json:"clean_targets"`
	CheckedAt      time.Time        `json:"checked_at"`
	Audits         []RBLTargetAudit `json:"audits"`
}
