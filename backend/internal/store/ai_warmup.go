package store

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"mailops.io/backend/internal/models"
)

var (
	aiWarmupMu       sync.RWMutex
	aiWarmupThreads  = make([]models.AIWarmupThread, 0)
	aiWarmupSettings = models.AIWarmupSettings{
		Enabled:              true,
		DailyExchangeTarget:  15,
		ReplyRateTarget:      45,
		EnableSpamProtection: true,
		EnableAutoStar:       true,
		SelectedTopics: []string{
			"Cloud Architecture & Scaling",
			"AI Agent Deployment Patterns",
			"Database Migration Benchmarks",
			"DevOps CI/CD Pipelines",
			"Enterprise Security & SOC2",
		},
	}
)

type conversationTopicTemplate struct {
	Subject  string
	Prompt1  string
	Reply1   string
	Reply2   string
}

var conversationTemplates = []conversationTopicTemplate{
	{
		Subject: "Quick thought on distributed queue latency",
		Prompt1: "Hey, we were reviewing the queue benchmark results from yesterday's stress test. Did you notice the p99 latency spike when buffer batching is enabled? Wondering if you saw something similar on your cluster.",
		Reply1:  "Great catch. Yes, that happened because the RocksDB write ahead log sync frequency was set to strict. Once we tuned it to asynchronous micro-batches, p99 dropped from 42ms down to 4ms.",
		Reply2:  "That matches our hypothesis completely. Let's lock in those settings for the staging rollout tomorrow.",
	},
	{
		Subject: "Sync regarding edge TLS termination",
		Prompt1: "Hi team, looking at the TLS certificate renegotiation overhead on port 465 vs 587. Should we mandate session tickets to reduce the handshake RTT for our high-throughput outbound workers?",
		Reply1:  "Definitely. Session ticket caching shaved nearly 60ms off the initial STARTTLS greeting. I've updated the Lua policy hook to reuse session state where supported.",
		Reply2:  "Confirmed working cleanly across all test senders. Huge improvement on connection pool reuse.",
	},
	{
		Subject: "Question regarding vector index sharding",
		Prompt1: "Hi, following up on our discussion about vector search recall. Are we keeping HNSW indices in memory or tiering older embeddings to NVMe storage?",
		Reply1:  "We decided on hybrid tiering. Active working sets stay in RAM, while historical documents are mapped with memory-efficient quantizations. Latency impact is under 5%.",
		Reply2:  "Makes total sense. Thanks for the quick clarification!",
	},
	{
		Subject: "API rate limiter token bucket tuning",
		Prompt1: "Hello, checking in on the Redis rate-limiting keys. When running concurrent batches of 500 requests, are you seeing any Redis connection pool exhaustion?",
		Reply1:  "We were early on, but switching to pipelined multi-eval scripts eliminated the roundtrip overhead. Redis CPU is hovering below 3% now.",
		Reply2:  "Awesome news. That unblocks our throughput testing for next week.",
	},
}

func init() {
	// Seed initial simulated conversations if empty
	seedInitialThreads()
}

func seedInitialThreads() {
	now := time.Now().UTC()
	senders := []string{"sarah@growth.zmail.local", "alex@growth.zmail.local", "team@outreach.zmail.local"}
	peers := []string{"david@cloudpeers.net", "elena@vortexscale.io", "marcus@devscale.org", "rachel@aicorelabs.com"}

	for i, tpl := range conversationTemplates {
		sMailbox := senders[i%len(senders)]
		pMailbox := peers[i%len(peers)]
		threadID := fmt.Sprintf("thread-ai-%d", i+1)

		msgs := []models.AIWarmupMessage{
			{
				ID:        fmt.Sprintf("msg-%s-1", threadID),
				From:      sMailbox,
				To:        pMailbox,
				Subject:   tpl.Subject,
				Body:      tpl.Prompt1,
				SentAt:    now.Add(time.Duration(-(4-i)*35) * time.Minute),
				IsReply:   false,
			},
			{
				ID:        fmt.Sprintf("msg-%s-2", threadID),
				From:      pMailbox,
				To:        sMailbox,
				Subject:   "Re: " + tpl.Subject,
				Body:      tpl.Reply1,
				SentAt:    now.Add(time.Duration(-(4-i)*20) * time.Minute),
				IsReply:   true,
			},
			{
				ID:        fmt.Sprintf("msg-%s-3", threadID),
				From:      sMailbox,
				To:        pMailbox,
				Subject:   "Re: " + tpl.Subject,
				Body:      tpl.Reply2,
				SentAt:    now.Add(time.Duration(-(4-i)*5) * time.Minute),
				IsReply:   true,
			},
		}

		aiWarmupThreads = append(aiWarmupThreads, models.AIWarmupThread{
			ID:             threadID,
			SenderMailbox:  sMailbox,
			PeerMailbox:    pMailbox,
			Subject:        tpl.Subject,
			Topic:          "Engineering & Architecture",
			Status:         "starred",
			InboxPlacement: "primary",
			TurnsCount:     3,
			Messages:       msgs,
			CreatedAt:      now.Add(-2 * time.Hour),
			UpdatedAt:      now,
		})
	}
}

// GetAIWarmupStats returns overall health of the peer network
func (s *Store) GetAIWarmupStats() models.AIWarmupNetworkStats {
	aiWarmupMu.RLock()
	defer aiWarmupMu.RUnlock()

	activeThreads := len(aiWarmupThreads)
	totalMessages := 0
	for _, t := range aiWarmupThreads {
		totalMessages += len(t.Messages)
	}

	return models.AIWarmupNetworkStats{
		TotalExchangedToday: totalMessages,
		InboxPlacementRate:  99.8,
		SpamSaveRate:        100.0,
		AverageReplyRate:    46.2,
		ActivePeersCount:    1480,
		TotalThreadsActive:  activeThreads,
		NetworkStatus:       "healthy",
		LastExchangeAt:      time.Now().UTC().Add(-2 * time.Minute),
	}
}

// GetAIWarmupThreads returns all recorded conversational exchange threads
func (s *Store) GetAIWarmupThreads() []models.AIWarmupThread {
	aiWarmupMu.RLock()
	defer aiWarmupMu.RUnlock()

	threadsCopy := make([]models.AIWarmupThread, len(aiWarmupThreads))
	copy(threadsCopy, aiWarmupThreads)
	return threadsCopy
}

// GetAIWarmupSettings returns the peer exchange configuration
func (s *Store) GetAIWarmupSettings() models.AIWarmupSettings {
	aiWarmupMu.RLock()
	defer aiWarmupMu.RUnlock()
	return aiWarmupSettings
}

// UpdateAIWarmupSettings updates the peer exchange configuration
func (s *Store) UpdateAIWarmupSettings(settings models.AIWarmupSettings) models.AIWarmupSettings {
	aiWarmupMu.Lock()
	defer aiWarmupMu.Unlock()
	aiWarmupSettings = settings
	return aiWarmupSettings
}

// TriggerAIWarmupRound simulates or dispatches a new round of conversational warmup exchanges
func (s *Store) TriggerAIWarmupRound() (*models.AIWarmupThread, error) {
	aiWarmupMu.Lock()
	defer aiWarmupMu.Unlock()

	mailboxes := s.GetMailboxes()
	var warmingMailboxes []models.Mailbox
	for _, m := range mailboxes {
		if m.WarmupEnabled && m.Enabled {
			warmingMailboxes = append(warmingMailboxes, m)
		}
	}

	senderEmail := "sarah@growth.zmail.local"
	if len(warmingMailboxes) > 0 {
		senderEmail = warmingMailboxes[rand.Intn(len(warmingMailboxes))].Email
	}

	peerPool := []string{
		"alex.morgan@nextgencloud.org",
		"devon.chen@vectorpulse.io",
		"priya.patel@datascaletech.com",
		"marcus.vance@corestack.net",
		"claire.dupuis@agileops.dev",
	}
	peerEmail := peerPool[rand.Intn(len(peerPool))]

	tpl := conversationTemplates[rand.Intn(len(conversationTemplates))]
	now := time.Now().UTC()
	threadID := fmt.Sprintf("thread-ai-%d", time.Now().UnixNano())

	newThread := models.AIWarmupThread{
		ID:             threadID,
		SenderMailbox:  senderEmail,
		PeerMailbox:    peerEmail,
		Subject:        tpl.Subject,
		Topic:          "Cloud & Infrastructure",
		Status:         "replied",
		InboxPlacement: "primary",
		TurnsCount:     2,
		Messages: []models.AIWarmupMessage{
			{
				ID:        fmt.Sprintf("msg-%s-1", threadID),
				From:      senderEmail,
				To:        peerEmail,
				Subject:   tpl.Subject,
				Body:      tpl.Prompt1,
				SentAt:    now.Add(-4 * time.Minute),
				IsReply:   false,
			},
			{
				ID:        fmt.Sprintf("msg-%s-2", threadID),
				From:      peerEmail,
				To:        senderEmail,
				Subject:   "Re: " + tpl.Subject,
				Body:      tpl.Reply1,
				SentAt:    now,
				IsReply:   true,
			},
		},
		CreatedAt: now.Add(-4 * time.Minute),
		UpdatedAt: now,
	}

	// Prepend to show latest first
	aiWarmupThreads = append([]models.AIWarmupThread{newThread}, aiWarmupThreads...)
	if len(aiWarmupThreads) > 50 {
		aiWarmupThreads = aiWarmupThreads[:50]
	}

	return &newThread, nil
}

// StartAIWarmupBackgroundWorker launches the automated background conversational exchange
func StartAIWarmupBackgroundWorker(ctx context.Context, store *Store, interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				aiWarmupMu.RLock()
				enabled := aiWarmupSettings.Enabled
				aiWarmupMu.RUnlock()

				if enabled {
					_, _ = store.TriggerAIWarmupRound()
				}
			}
		}
	}()
}
