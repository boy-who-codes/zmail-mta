package store

import (
	"testing"
)

func TestAutonomousWarmupDaemon(t *testing.T) {
	s := NewStore("")

	// Check initial summary
	summary := s.GetWarmupSummary()
	t.Logf("Initial warming mailboxes: %d", summary.TotalWarming)

	// Tick warmup
	advanced := s.TickWarmupSchedule()
	t.Logf("Advanced warmup schedules: %d", len(advanced.Schedules))

	// Verify day increment on warming mailboxes
	for _, sched := range advanced.Schedules {
		if sched.Status == "active" {
			if sched.CurrentDay < 2 {
				t.Errorf("expected day >= 2 after tick, got %d", sched.CurrentDay)
			}
			if sched.CurrentLimit <= 0 {
				t.Errorf("expected positive limit, got %d", sched.CurrentLimit)
			}
		}
	}
}
