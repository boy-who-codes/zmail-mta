package store

import (
	"os"
	"testing"

	"mailops.io/backend/internal/models"
)

func TestMailboxRotationAndEligibility(t *testing.T) {
	tmpFile := "test-mailbox-state.json"
	defer os.Remove(tmpFile)

	store := NewStore(tmpFile)

	// Add test mailboxes for rotation verification
	mbIDs := []string{"mbx-1", "mbx-2", "mbx-3", "mbx-4"}
	for _, id := range mbIDs {
		store.AddMailbox(models.Mailbox{
			ID:                 id,
			Email:              id + "@test.local",
			Enabled:            true,
			IsVerified:         true,
			DailyLimit:         500,
			HourlyLimit:        50,
			MinIntervalSeconds: 60,
			Weight:             25,
		})
	}

	poolID := "pool-outbound-tier1"
	store.AddMailboxPool(models.MailboxPool{
		ID:         poolID,
		Name:       "Test Pool",
		Strategy:   "round_robin",
		MailboxIDs: mbIDs,
		Enabled:    true,
	})

	// Verify mailboxes
	mailboxes := store.GetMailboxes()
	if len(mailboxes) < 4 {
		t.Fatalf("expected at least 4 mailboxes, got %d", len(mailboxes))
	}

	// Test 1: Round Robin selection across pool
	p, err := store.GetMailboxPool(poolID)
	if err != nil {
		t.Fatalf("failed to get pool: %v", err)
	}
	p.Strategy = "round_robin"
	store.UpdateMailboxPool(*p)

	selectedEmails := make([]string, 0)
	for i := 0; i < 4; i++ {
		mb, _, err := store.SelectMailboxForRecipient(poolID, "test-cmp-1", "lead-"+string(rune('A'+i))+"@example.com")
		if err != nil {
			t.Fatalf("failed to select mailbox: %v", err)
		}
		selectedEmails = append(selectedEmails, mb.Email)
	}

	if len(selectedEmails) != 4 {
		t.Fatalf("expected 4 selections, got %d", len(selectedEmails))
	}

	// Test 2: Sticky sender consistency
	sticky, err := store.GetStickyMailbox("test-cmp-1", "lead-A@example.com")
	if err != nil {
		t.Fatalf("expected sticky assignment for lead-A, got err: %v", err)
	}
	if sticky.SenderEmail != selectedEmails[0] {
		t.Fatalf("sticky sender mismatch: expected %s, got %s", selectedEmails[0], sticky.SenderEmail)
	}

	// Test 3: Simulation
	sim, err := store.SimulateMailboxRotation(poolID, "least_utilized", []string{"r1@test.com", "r2@test.com", "r3@test.com"})
	if err != nil {
		t.Fatalf("simulation failed: %v", err)
	}
	if len(sim.Assignments) != 3 {
		t.Fatalf("expected 3 simulated assignments, got %d", len(sim.Assignments))
	}

	// Test 4: Quota exhaustion guard
	limitedMB := models.Mailbox{
		ID:                 "mbx-quota-test",
		Email:              "exhausted@test.local",
		DisplayName:        "Exhausted Sender",
		DailyLimit:         2,
		DailySent:          2, // already at limit
		HourlyLimit:        10,
		HourlySent:         1,
		MinIntervalSeconds: 0,
		Enabled:            true,
		IsVerified:         true,
	}
	store.AddMailbox(limitedMB)

	singlePool := models.MailboxPool{
		ID:         "pool-exhausted-test",
		Name:       "Exhausted Pool",
		Strategy:   "least_utilized",
		MailboxIDs: []string{"mbx-quota-test"},
		Enabled:    true,
	}
	store.AddMailboxPool(singlePool)

	_, reason, err := store.SelectMailboxForRecipient("pool-exhausted-test", "cmp-test", "target@test.com")
	if err == nil {
		t.Fatalf("expected error due to quota exhaustion, got success")
	}
	if reason != "daily_quota_exhausted" {
		t.Fatalf("expected reason daily_quota_exhausted, got %s", reason)
	}
}
