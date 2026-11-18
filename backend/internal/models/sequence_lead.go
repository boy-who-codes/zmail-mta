package models

import "time"

// SequenceLead tracks an individual prospect progressing through a multi-step drip sequence
type SequenceLead struct {
	ID                string    `json:"id"`
	CampaignID        string    `json:"campaign_id"`
	Email             string    `json:"email"`
	FirstName         string    `json:"first_name"`
	LastName          string    `json:"last_name"`
	Company           string    `json:"company"`
	CurrentStep       int       `json:"current_step"` // 1 = initial email sent, 2 = step 2 sent, etc.
	TotalSteps        int       `json:"total_steps"`
	Status            string    `json:"status"` // "active", "replied", "bounced", "unsubscribed", "completed"
	PinnedSenderEmail string    `json:"pinned_sender_email"` // Strict thread continuity
	OriginalMessageID string    `json:"original_message_id"` // For In-Reply-To header
	OriginalSubject   string    `json:"original_subject"`
	LastStepSentAt    time.Time `json:"last_step_sent_at"`
	NextStepDueAt     time.Time `json:"next_step_due_at"`
	RepliedAt         time.Time `json:"replied_at,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

// SequenceEngineStats provides aggregate progress metrics for a campaign cadence
type SequenceEngineStats struct {
	CampaignID        string  `json:"campaign_id"`
	TotalLeads        int     `json:"total_leads"`
	ActiveInSequence  int     `json:"active_in_sequence"`
	RepliedCount      int     `json:"replied_count"`
	ReplyRate         float64 `json:"reply_rate"`
	CompletedCount    int     `json:"completed_count"`
	BouncedCount      int     `json:"bounced_count"`
	AutoStopActive    bool    `json:"auto_stop_active"`
	NextScheduledStep string  `json:"next_scheduled_step,omitempty"`
}
