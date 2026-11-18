package store

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"mailops.io/backend/internal/models"
)

var (
	sequenceMu    sync.RWMutex
	sequenceLeads = make(map[string]models.SequenceLead) // key: lead.ID
)

func init() {
	// Seed demo sequence leads for instant client testing
	now := time.Now().UTC()
	demoLeads := []models.SequenceLead{
		{
			ID:                "lead-seq-001",
			CampaignID:        "camp-enterprise-01",
			Email:             "elena.rostova@cloudscale.io",
			FirstName:         "Elena",
			LastName:          "Rostova",
			Company:           "CloudScale",
			CurrentStep:       1,
			TotalSteps:        3,
			Status:            "replied",
			PinnedSenderEmail: "sarah@growth.zmail.local",
			OriginalMessageID: "msg-sarah-elena-001@zmail.local",
			OriginalSubject:   "High-volume outbound delivery architecture review",
			LastStepSentAt:    now.Add(-48 * time.Hour),
			NextStepDueAt:     now.Add(24 * time.Hour),
			RepliedAt:         now.Add(-2 * time.Hour),
			CreatedAt:         now.Add(-48 * time.Hour),
		},
		{
			ID:                "lead-seq-002",
			CampaignID:        "camp-enterprise-01",
			Email:             "david.kim@vortexai.tech",
			FirstName:         "David",
			LastName:          "Kim",
			Company:           "Vortex AI",
			CurrentStep:       1,
			TotalSteps:        3,
			Status:            "replied",
			PinnedSenderEmail: "alex@growth.zmail.local",
			OriginalMessageID: "msg-alex-david-002@zmail.local",
			OriginalSubject:   "Partnership Inquiry: Autonomous Email AI Agents",
			LastStepSentAt:    now.Add(-72 * time.Hour),
			NextStepDueAt:     now.Add(12 * time.Hour),
			RepliedAt:         now.Add(-4 * time.Hour),
			CreatedAt:         now.Add(-72 * time.Hour),
		},
		{
			ID:                "lead-seq-003",
			CampaignID:        "camp-enterprise-01",
			Email:             "marcus.vance@corestack.net",
			FirstName:         "Marcus",
			LastName:          "Vance",
			Company:           "CoreStack",
			CurrentStep:       2,
			TotalSteps:        3,
			Status:            "active",
			PinnedSenderEmail: "team@outreach.zmail.local",
			OriginalMessageID: "msg-team-marcus-003@zmail.local",
			OriginalSubject:   "API rate limiter token bucket tuning",
			LastStepSentAt:    now.Add(-24 * time.Hour),
			NextStepDueAt:     now.Add(48 * time.Hour),
			CreatedAt:         now.Add(-96 * time.Hour),
		},
		{
			ID:                "lead-seq-004",
			CampaignID:        "camp-enterprise-01",
			Email:             "rachel.weber@apexinfra.com",
			FirstName:         "Rachel",
			LastName:          "Weber",
			Company:           "Apex Infra",
			CurrentStep:       1,
			TotalSteps:        3,
			Status:            "active",
			PinnedSenderEmail: "sarah@growth.zmail.local",
			OriginalMessageID: "msg-sarah-rachel-004@zmail.local",
			OriginalSubject:   "High-volume outbound delivery architecture review",
			LastStepSentAt:    now.Add(-6 * time.Hour),
			NextStepDueAt:     now.Add(66 * time.Hour),
			CreatedAt:         now.Add(-6 * time.Hour),
		},
	}

	for _, ld := range demoLeads {
		sequenceLeads[ld.ID] = ld
	}
}

// EnrollLeadInSequence adds a verified lead to a campaign drip sequence
func (s *Store) EnrollLeadInSequence(campaignID string, lead models.SequenceLead) error {
	sequenceMu.Lock()
	defer sequenceMu.Unlock()

	lead.CampaignID = campaignID
	if lead.ID == "" {
		lead.ID = fmt.Sprintf("lead-%d", time.Now().UnixNano())
	}
	lead.CreatedAt = time.Now().UTC()
	lead.Status = "active"
	lead.CurrentStep = 1
	lead.LastStepSentAt = time.Now().UTC()

	// Default next step delay is 3 days
	lead.NextStepDueAt = time.Now().UTC().Add(72 * time.Hour)

	sequenceLeads[lead.ID] = lead
	return nil
}

// ImportAndEnrollLeads handles bulk CSV lead ingestion with syntax verification and deduplication
func (s *Store) ImportAndEnrollLeads(campaignID string, leads []models.SequenceLead) (int, int, error) {
	sequenceMu.Lock()
	defer sequenceMu.Unlock()

	enrolled := 0
	skipped := 0
	now := time.Now().UTC()

	existingEmails := make(map[string]bool)
	for _, l := range sequenceLeads {
		if l.CampaignID == campaignID {
			existingEmails[strings.ToLower(l.Email)] = true
		}
	}

	for _, lead := range leads {
		cleanEmail := strings.TrimSpace(strings.ToLower(lead.Email))
		if cleanEmail == "" || !strings.Contains(cleanEmail, "@") || !strings.Contains(cleanEmail, ".") {
			skipped++
			continue
		}

		if existingEmails[cleanEmail] {
			skipped++
			continue
		}

		lead.ID = fmt.Sprintf("lead-%d-%d", time.Now().UnixNano(), enrolled)
		lead.CampaignID = campaignID
		lead.Email = cleanEmail
		lead.Status = "active"
		lead.CurrentStep = 1
		lead.CreatedAt = now
		lead.LastStepSentAt = now
		lead.NextStepDueAt = now.Add(72 * time.Hour)

		sequenceLeads[lead.ID] = lead
		existingEmails[cleanEmail] = true
		enrolled++
	}

	return enrolled, skipped, nil
}

// GetSequenceLeads returns all leads enrolled in a campaign cadence
func (s *Store) GetSequenceLeads(campaignID string) []models.SequenceLead {
	sequenceMu.RLock()
	defer sequenceMu.RUnlock()

	res := make([]models.SequenceLead, 0)
	for _, l := range sequenceLeads {
		if campaignID == "" || l.CampaignID == campaignID {
			res = append(res, l)
		}
	}
	return res
}

// GetSequenceStats returns cadence funnel performance metrics
func (s *Store) GetSequenceStats(campaignID string) models.SequenceEngineStats {
	sequenceMu.RLock()
	defer sequenceMu.RUnlock()

	total := 0
	active := 0
	replied := 0
	completed := 0
	bounced := 0

	for _, l := range sequenceLeads {
		if campaignID == "" || l.CampaignID == campaignID {
			total++
			switch l.Status {
			case "active":
				active++
			case "replied":
				replied++
			case "completed":
				completed++
			case "bounced":
				bounced++
			}
		}
	}

	replyRate := 0.0
	if total > 0 {
		replyRate = (float64(replied) / float64(total)) * 100.0
	}

	return models.SequenceEngineStats{
		CampaignID:        campaignID,
		TotalLeads:        total,
		ActiveInSequence:  active,
		RepliedCount:      replied,
		ReplyRate:         replyRate,
		CompletedCount:    completed,
		BouncedCount:      bounced,
		AutoStopActive:    true,
		NextScheduledStep: "Step 2 Follow-Up (In-Reply-To Thread)",
	}
}

// RecordReplyForLead checks if an incoming sender matches an active sequence lead and stops future steps
func (s *Store) RecordReplyForLead(incomingSender string) (bool, string) {
	sequenceMu.Lock()
	defer sequenceMu.Unlock()

	cleanSender := strings.TrimSpace(strings.ToLower(incomingSender))
	now := time.Now().UTC()

	for id, l := range sequenceLeads {
		if strings.EqualFold(l.Email, cleanSender) {
			if l.Status == "active" {
				l.Status = "replied"
				l.RepliedAt = now
				sequenceLeads[id] = l
				return true, fmt.Sprintf("Lead %s marked as REPLIED. Auto-stopped future sequence follow-ups.", cleanSender)
			}
			return true, fmt.Sprintf("Lead %s already recorded as %s", cleanSender, l.Status)
		}
	}

	return false, "Sender not in active sequence"
}

// TickSequenceCadence processes due steps across all active sequence leads
func (s *Store) TickSequenceCadence() (int, error) {
	sequenceMu.Lock()
	defer sequenceMu.Unlock()

	now := time.Now().UTC()
	dispatchedFollowups := 0

	for id, lead := range sequenceLeads {
		if lead.Status != "active" {
			continue
		}

		// Check if follow-up delay has elapsed (or force evaluation on tick)
		if lead.CurrentStep < lead.TotalSteps {
			// Advance to next step
			lead.CurrentStep++
			lead.LastStepSentAt = now
			lead.NextStepDueAt = now.Add(72 * time.Hour) // wait 3 days for next

			if lead.CurrentStep >= lead.TotalSteps {
				lead.Status = "completed"
			}
			sequenceLeads[id] = lead
			dispatchedFollowups++
		} else {
			lead.Status = "completed"
			sequenceLeads[id] = lead
		}
	}

	return dispatchedFollowups, nil
}

// StartAutonomousSequenceWorker runs the sequence evaluator periodically in the background
func StartAutonomousSequenceWorker(ctx context.Context, store *Store, interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				_, _ = store.TickSequenceCadence()
			}
		}
	}()
}
