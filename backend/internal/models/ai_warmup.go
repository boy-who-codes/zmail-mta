package models

import "time"

// AIWarmupThread represents an ongoing or completed conversational AI email exchange
type AIWarmupThread struct {
	ID             string              `json:"id"`
	SenderMailbox  string              `json:"sender_mailbox"`
	PeerMailbox    string              `json:"peer_mailbox"`
	Subject        string              `json:"subject"`
	Topic          string              `json:"topic"`
	Status         string              `json:"status"` // "delivered", "replied", "saved_from_spam", "starred"
	InboxPlacement string              `json:"inbox_placement"` // "primary", "updates"
	TurnsCount     int                 `json:"turns_count"`
	Messages       []AIWarmupMessage   `json:"messages"`
	CreatedAt      time.Time           `json:"created_at"`
	UpdatedAt      time.Time           `json:"updated_at"`
}

// AIWarmupMessage represents an individual message turn inside a warmup thread
type AIWarmupMessage struct {
	ID        string    `json:"id"`
	From      string    `json:"from"`
	To        string    `json:"to"`
	Subject   string    `json:"subject"`
	Body      string    `json:"body"`
	SentAt    time.Time `json:"sent_at"`
	IsReply   bool      `json:"is_reply"`
}

// AIWarmupNetworkStats provides high-level metrics on peer exchange reputation
type AIWarmupNetworkStats struct {
	TotalExchangedToday int       `json:"total_exchanged_today"`
	InboxPlacementRate float64   `json:"inbox_placement_rate"` // e.g. 99.8%
	SpamSaveRate       float64   `json:"spam_save_rate"`       // e.g. 100%
	AverageReplyRate   float64   `json:"average_reply_rate"`   // e.g. 46.5%
	ActivePeersCount   int       `json:"active_peers_count"`
	TotalThreadsActive int       `json:"total_threads_active"`
	NetworkStatus      string    `json:"network_status"` // "healthy", "degraded", "optimizing"
	LastExchangeAt     time.Time `json:"last_exchange_at"`
}

// AIWarmupSettings configures peer exchange behavior
type AIWarmupSettings struct {
	Enabled               bool     `json:"enabled"`
	DailyExchangeTarget   int      `json:"daily_exchange_target"`
	ReplyRateTarget       int      `json:"reply_rate_target"` // 30-60%
	EnableSpamProtection  bool     `json:"enable_spam_protection"`
	EnableAutoStar        bool     `json:"enable_auto_star"`
	SelectedTopics        []string `json:"selected_topics"`
}
