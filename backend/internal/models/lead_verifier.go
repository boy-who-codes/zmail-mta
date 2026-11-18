package models

// LeadVerificationResult holds validation details for a single email address
type LeadVerificationResult struct {
	Email        string   `json:"email"`
	Domain       string   `json:"domain"`
	SyntaxValid  bool     `json:"syntax_valid"`
	HasMX        bool     `json:"has_mx"`
	MXHosts      []string `json:"mx_hosts"`
	IsDisposable bool     `json:"is_disposable"`
	IsRoleBased  bool     `json:"is_role_based"`
	Status       string   `json:"status"` // "valid", "risky", "invalid"
	Reason       string   `json:"reason"`
	Score        int      `json:"score"` // 0 to 100
}

// BulkVerificationSummary holds the outcome of a batch lead hygiene run
type BulkVerificationSummary struct {
	TotalProcessed int                      `json:"total_processed"`
	ValidCount     int                      `json:"valid_count"`
	RiskyCount     int                      `json:"risky_count"`
	InvalidCount   int                      `json:"invalid_count"`
	CleanRate      float64                  `json:"clean_rate"`
	Results        []LeadVerificationResult `json:"results"`
}
