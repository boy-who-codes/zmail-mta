package store

import (
	"context"
	"math"
	"strings"
	"time"

	"mailops.io/backend/internal/models"
)

var (
	standardWarmupCurve     = []int{20, 35, 50, 75, 100, 140, 190, 250, 320, 400, 480, 560, 650, 750}
	conservativeWarmupCurve = []int{10, 15, 20, 30, 40, 55, 75, 100, 130, 170, 220, 280, 350, 400}
	aggressiveWarmupCurve   = []int{50, 100, 175, 275, 400, 600, 800}
)

// getRampLimitForDay calculates the daily limit based on strategy and day
func getRampLimitForDay(strategy string, day int, targetLimit int) (int, int) {
	var curve []int
	switch strings.ToLower(strategy) {
	case "conservative":
		curve = conservativeWarmupCurve
	case "aggressive":
		curve = aggressiveWarmupCurve
	default:
		curve = standardWarmupCurve
	}

	totalDays := len(curve)
	if day < 1 {
		day = 1
	}

	var limit int
	if day <= len(curve) {
		limit = curve[day-1]
	} else {
		limit = curve[len(curve)-1]
	}

	if targetLimit > 0 && limit > targetLimit {
		limit = targetLimit
	}

	return limit, totalDays
}

// GetWarmupSummary returns the current state and curves of all warming mailboxes
func (s *Store) GetWarmupSummary() models.WarmupDaemonSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.getWarmupSummaryLocked()
}

func (s *Store) getWarmupSummaryLocked() models.WarmupDaemonSummary {
	var warming, completed, paused int
	schedules := make([]models.WarmupScheduleProgress, 0)

	for _, m := range s.mailboxes {
		if !m.WarmupEnabled {
			continue
		}

		strategy := m.WarmupStrategy
		if strategy == "" {
			strategy = "standard"
		}
		target := m.WarmupTargetLimit
		if target <= 0 {
			target = 400
		}
		day := m.WarmupDay
		if day <= 0 {
			day = 1
		}

		currentLimit, totalDays := getRampLimitForDay(strategy, day, target)
		nextLimit, _ := getRampLimitForDay(strategy, day+1, target)

		status := m.WarmupStatus
		if status == "" {
			status = "active"
		}

		// Reputation check
		if m.BounceRate > 2.0 || m.SpamRate > 0.08 {
			status = "paused_reputation"
			paused++
		} else if currentLimit >= target {
			status = "completed"
			completed++
		} else {
			warming++
		}

		progressPct := math.Min(100.0, (float64(currentLimit)/float64(target))*100.0)

		schedules = append(schedules, models.WarmupScheduleProgress{
			MailboxID:     m.ID,
			Email:         m.Email,
			DisplayName:   m.DisplayName,
			CurrentLimit:  currentLimit,
			TargetLimit:   target,
			CurrentDay:    day,
			TotalDays:     totalDays,
			ProgressPct:   math.Round(progressPct*10) / 10,
			Strategy:      strategy,
			Status:        status,
			BounceRate:    m.BounceRate,
			SpamRate:      m.SpamRate,
			NextRampLimit: nextLimit,
		})
	}

	return models.WarmupDaemonSummary{
		TotalWarming:    warming,
		TotalCompleted:  completed,
		TotalPaused:     paused,
		Schedules:       schedules,
		LastEvaluatedAt: time.Now().UTC(),
	}
}

// TickWarmupSchedule evaluates and increments the daily warmup curve across all eligible mailboxes
func (s *Store) TickWarmupSchedule() models.WarmupDaemonSummary {
	s.mu.Lock()
	defer s.mu.Unlock()

	for id, m := range s.mailboxes {
		if !m.WarmupEnabled {
			continue
		}

		strategy := m.WarmupStrategy
		if strategy == "" {
			strategy = "standard"
		}
		target := m.WarmupTargetLimit
		if target <= 0 {
			target = 400
		}
		if m.WarmupDay <= 0 {
			m.WarmupDay = 1
		}

		// Circuit Breaker: pause if reputation degraded
		if m.BounceRate > 2.0 || m.SpamRate > 0.08 {
			m.WarmupStatus = "paused_reputation"
			s.mailboxes[id] = m
			continue
		}

		// Advance to next day
		nextDay := m.WarmupDay + 1
		newLimit, totalDays := getRampLimitForDay(strategy, nextDay, target)

		m.WarmupDay = nextDay
		m.DailyLimit = newLimit
		m.HourlyLimit = int(math.Max(10, math.Ceil(float64(newLimit)/8.0)))

		if newLimit >= target || nextDay >= totalDays {
			m.WarmupStatus = "completed"
		} else {
			m.WarmupStatus = "active"
		}

		m.UpdatedAt = time.Now().UTC()
		s.mailboxes[id] = m
	}

	s.saveLocked()
	return s.getWarmupSummaryLocked()
}

// StartAutonomousWarmupWorker launches a background goroutine ticking the schedule every 24h
func (s *Store) StartAutonomousWarmupWorker(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = 24 * time.Hour
	}
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				_ = s.TickWarmupSchedule()
			}
		}
	}()
}
