package models

import "time"

// CampaignStep defines an action in the unified campaign timeline
type CampaignStep struct {
	ID               string    `json:"id"`
	StepNumber       int       `json:"step_number"` // 1 = initial broadcast, 2+ = automated follow-ups
	Title            string    `json:"title"`       // e.g. "Step 1: Benchmark Outreach", "Step 2: Case Study Bump"
	Subject          string    `json:"subject"`
	BodyHTML         string    `json:"body_html"`
	BodyPreview      string    `json:"body_preview"`
	DelayDays        int       `json:"delay_days"`        // delay from previous step
	DelayHours       int       `json:"delay_hours"`       // additional delay hours
	SendDays         string    `json:"send_days"`         // "all_days" | "business_days"
	TriggerCondition string    `json:"trigger_condition"` // "immediate", "no_reply", "no_open", "opened_no_click", "always"
	IsThreadedReply  bool      `json:"is_threaded_reply"` // Send as Re: in same conversation with In-Reply-To
	CreatedAt        time.Time `json:"created_at"`
}

// AutomationPlaybook represents a pre-made high-deliverability sequence blueprint
type AutomationPlaybook struct {
	ID             string         `json:"id"`
	Name           string         `json:"name"`
	Description    string         `json:"description"`
	Category       string         `json:"category"`        // "b2b_sales", "saas_onboarding", "product_launch", "list_hygiene"
	TargetAudience string         `json:"target_audience"` // e.g. "Enterprise CTOs, VPs of Eng"
	EstimatedDays  int            `json:"estimated_days"`
	Steps          []CampaignStep `json:"steps"`
	CreatedAt      time.Time      `json:"created_at"`
}
