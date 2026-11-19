package store

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"mailops.io/backend/internal/models"
)

// initDefaultPlaybooksLocked preloads battle-tested sequence playbooks
func (s *Store) initDefaultPlaybooksLocked() {
	if len(s.playbooks) > 0 {
		return
	}

	p1 := models.AutomationPlaybook{
		ID:             "playbook-cold-b2b",
		Name:           "High-Deliverability Enterprise Cold Cadence",
		Description:    "3-step benchmark sequence with automatic threading, context bumps, and deliverability safeguards.",
		Category:       "b2b_sales",
		TargetAudience: "Enterprise CTOs, VPs of Eng, Technical Founders",
		EstimatedDays:  7,
		Steps: []models.CampaignStep{
			{
				ID:               "step-1",
				StepNumber:       1,
				Title:            "Step 1: 2026 Deliverability Index",
				Subject:          "2026 Enterprise Email Authentication & Deliverability Index for {{company}}",
				BodyHTML:         "<p>Hi {{first_name}},</p><p>We recently analyzed post-2024 DMARC and Yahoo/Google inbox placement metrics across 40M enterprise emails. We noticed that several domains in the {{company}} sector experienced soft-deferral cascades on port 25.</p><p>We put together a tailored benchmark showing the exact SPF/DKIM alignment and dedicated IP warmup curves required for 99.4% primary inbox placement.</p><p>Would you like me to send over the benchmark executive summary?</p><p>Best regards,<br>{{sender_name}}</p>",
				BodyPreview:      "We recently analyzed post-2024 DMARC and Yahoo/Google inbox placement metrics across 40M enterprise emails...",
				DelayDays:        0,
				DelayHours:       0,
				SendDays:         "business_days",
				TriggerCondition: "immediate",
				IsThreadedReply:  false,
				CreatedAt:        time.Now().UTC(),
			},
			{
				ID:               "step-2",
				StepNumber:       2,
				Title:            "Step 2: Relevant Case Study & Benchmark Bump",
				Subject:          "Re: 2026 Enterprise Email Authentication & Deliverability Index for {{company}}",
				BodyHTML:         "<p>Hi {{first_name}},</p><p>Quick follow-up on my note from earlier this week. One of our recent fintech partners reduced spam complaint rates to &lt;0.01% within 14 days by implementing automated mailbox pooling and reverse DNS verification.</p><p>Happy to share their anonymized audit blueprint if helpful for {{company}}.</p><p>Best,<br>{{sender_name}}</p>",
				BodyPreview:      "Quick follow-up on my note from earlier this week. One of our recent fintech partners reduced spam complaints...",
				DelayDays:        3,
				DelayHours:       0,
				SendDays:         "business_days",
				TriggerCondition: "no_reply",
				IsThreadedReply:  true,
				CreatedAt:        time.Now().UTC(),
			},
			{
				ID:               "step-3",
				StepNumber:       3,
				Title:            "Step 3: Polite Breakup & Permission to Close",
				Subject:          "Re: 2026 Enterprise Email Authentication & Deliverability Index for {{company}}",
				BodyHTML:         "<p>Hi {{first_name}},</p><p>I realize you are likely heads down on critical engineering initiatives. I won't crowd your inbox any further.</p><p>If email infrastructure, IP warmup, or Yahoo/Google deliverability compliance becomes a priority later this quarter, feel free to reconnect.</p><p>Wishing you and {{company}} continued success,<br>{{sender_name}}</p>",
				BodyPreview:      "I realize you are likely heads down on critical engineering initiatives. I won't crowd your inbox any further...",
				DelayDays:        4,
				DelayHours:       0,
				SendDays:         "business_days",
				TriggerCondition: "no_reply",
				IsThreadedReply:  true,
				CreatedAt:        time.Now().UTC(),
			},
		},
		CreatedAt: time.Now().UTC(),
	}

	p2 := models.AutomationPlaybook{
		ID:             "playbook-saas-onboarding",
		Name:           "SaaS Product Onboarding & Activation Cadence",
		Description:    "4-step developer onboarding sequence ensuring new organizations configure SMTP, verify DKIM, and launch safely.",
		Category:       "saas_onboarding",
		TargetAudience: "New Trial Organizations & Platform Developers",
		EstimatedDays:  14,
		Steps: []models.CampaignStep{
			{
				ID:               "ob-1",
				StepNumber:       1,
				Title:            "Step 1: Cluster Credentials & Quickstart",
				Subject:          "Welcome to ZMAIL — Your Dedicated SMTP Injection Endpoint",
				BodyHTML:         "<h2>Welcome aboard, {{first_name}}!</h2><p>Your dedicated organization tenant is provisioned and ready for injection.</p><p><strong>SMTP Host:</strong> 127.0.0.1:2525 (or ports 25, 587)<br><strong>REST Gateway:</strong> http://localhost:8080/api/v1</p><p>Next step: verify your custom sending domain in the Domains &amp; DNS app.</p>",
				BodyPreview:      "Your dedicated organization tenant is provisioned and ready for injection...",
				DelayDays:        0,
				DelayHours:       0,
				SendDays:         "all_days",
				TriggerCondition: "immediate",
				IsThreadedReply:  false,
				CreatedAt:        time.Now().UTC(),
			},
			{
				ID:               "ob-2",
				StepNumber:       2,
				Title:            "Step 2: DNS & DKIM Verification Checklist",
				Subject:          "Action Required: Complete SPF & DKIM Alignment for {{company}}",
				BodyHTML:         "<p>Hi {{first_name}},</p><p>We noticed your domain verification is still pending. To guarantee your outbound messages bypass the spam box, add your generated 2048-bit DKIM TXT record to your DNS provider.</p><p>Visit your dashboard to copy your exact DNS records in one click.</p>",
				BodyPreview:      "We noticed your domain verification is still pending. To guarantee your outbound messages bypass spam...",
				DelayDays:        2,
				DelayHours:       0,
				SendDays:         "all_days",
				TriggerCondition: "no_reply",
				IsThreadedReply:  true,
				CreatedAt:        time.Now().UTC(),
			},
			{
				ID:               "ob-3",
				StepNumber:       3,
				Title:            "Step 3: Dedicated IP Warmup Walkthrough",
				Subject:          "Best Practices: How to Safely Warm Up Your New Egress IPs",
				BodyHTML:         "<p>Hi {{first_name}},</p><p>Before ramping up to 50k+ daily volume, start with an automated IP warmup schedule. Our engine gradually doubles daily sending caps while monitoring real-time bounce and complaint feedback loops.</p>",
				BodyPreview:      "Before ramping up to 50k+ daily volume, start with an automated IP warmup schedule...",
				DelayDays:        5,
				DelayHours:       0,
				SendDays:         "business_days",
				TriggerCondition: "always",
				IsThreadedReply:  true,
				CreatedAt:        time.Now().UTC(),
			},
		},
		CreatedAt: time.Now().UTC(),
	}

	p3 := models.AutomationPlaybook{
		ID:             "playbook-list-hygiene",
		Name:           "Re-engagement & Automated List Hygiene Cadence",
		Description:    "2-step opt-in verification that automatically purges dormant contacts to keep domain reputation spotless.",
		Category:       "list_hygiene",
		TargetAudience: "Inactive subscribers (>90 days without open)",
		EstimatedDays:  7,
		Steps: []models.CampaignStep{
			{
				ID:               "hy-1",
				StepNumber:       1,
				Title:            "Step 1: Still Want to Hear From Us?",
				Subject:          "Quick question about your {{company}} email preferences",
				BodyHTML:         "<p>Hi {{first_name}},</p><p>We want to ensure we are only sending content you genuinely find valuable. If you'd like to stay subscribed to our product updates and deliverability insights, simply click below:</p><p><a href=\"{{cta_url}}\">Yes, keep me updated</a></p><p>If not, no worries at all—you don't need to do anything and we'll automatically remove you next week.</p>",
				BodyPreview:      "We want to ensure we are only sending content you genuinely find valuable...",
				DelayDays:        0,
				DelayHours:       0,
				SendDays:         "all_days",
				TriggerCondition: "immediate",
				IsThreadedReply:  false,
				CreatedAt:        time.Now().UTC(),
			},
			{
				ID:               "hy-2",
				StepNumber:       2,
				Title:            "Step 2: Automated Unsubscribe Notice",
				Subject:          "You have been safely unsubscribed from ZMAIL updates",
				BodyHTML:         "<p>Hi {{first_name}},</p><p>As promised, since we haven't heard from you, we have safely unsubscribed {{email}} to keep your inbox clean.</p><p>If this was a mistake, you can re-subscribe anytime from our homepage.</p>",
				BodyPreview:      "As promised, since we haven't heard from you, we have safely unsubscribed you...",
				DelayDays:        7,
				DelayHours:       0,
				SendDays:         "all_days",
				TriggerCondition: "no_reply",
				IsThreadedReply:  true,
				CreatedAt:        time.Now().UTC(),
			},
		},
		CreatedAt: time.Now().UTC(),
	}

	s.playbooks[p1.ID] = p1
	s.playbooks[p2.ID] = p2
	s.playbooks[p3.ID] = p3
}

// initDefaultMailboxesLocked initializes mailbox storage (no mock mailboxes for production)
func (s *Store) initDefaultMailboxesLocked() {
	return
}

// GetMailboxes returns all configured sender mailboxes
func (s *Store) GetMailboxes() []models.Mailbox {
	s.mu.RLock()
	defer s.mu.RUnlock()

	res := make([]models.Mailbox, 0, len(s.mailboxes))
	for _, m := range s.mailboxes {
		res = append(res, m)
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Email < res[j].Email
	})
	return res
}

// GetMailbox returns a single mailbox by ID
func (s *Store) GetMailbox(id string) (*models.Mailbox, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	m, ok := s.mailboxes[id]
	if !ok {
		return nil, fmt.Errorf("mailbox %s not found", id)
	}
	return &m, nil
}

// AddMailbox registers a new sender mailbox with encrypted credential reference
func (s *Store) AddMailbox(m models.Mailbox) (*models.Mailbox, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if m.Email == "" {
		return nil, fmt.Errorf("mailbox email is required")
	}

	// Check duplicates
	for _, existing := range s.mailboxes {
		if strings.EqualFold(existing.Email, m.Email) {
			return nil, fmt.Errorf("mailbox with email %s already exists", m.Email)
		}
	}

	if m.ID == "" {
		b := make([]byte, 4)
		rand.Read(b)
		m.ID = fmt.Sprintf("mbx-%s", hex.EncodeToString(b))
	}

	if m.DailyLimit <= 0 {
		m.DailyLimit = 300
	}
	if m.HourlyLimit <= 0 {
		m.HourlyLimit = 40
	}
	if m.MinIntervalSeconds <= 0 {
		m.MinIntervalSeconds = 60
	}
	if m.Weight <= 0 {
		m.Weight = 25
	}
	if m.HealthStatus == "" {
		m.HealthStatus = "excellent"
	}
	if m.CredentialRef == "" {
		m.CredentialRef = fmt.Sprintf("vault:enc_sec_%s", m.ID)
	}
	if m.Domain == "" {
		parts := strings.Split(m.Email, "@")
		if len(parts) == 2 {
			m.Domain = parts[1]
		}
	}
	m.Enabled = true
	m.IsVerified = true
	m.CreatedAt = time.Now().UTC()
	m.UpdatedAt = time.Now().UTC()

	s.mailboxes[m.ID] = m
	s.saveLocked()
	return &m, nil
}

// UpdateMailbox modifies mailbox quotas, status, and sending parameters
func (s *Store) UpdateMailbox(m models.Mailbox) (*models.Mailbox, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, ok := s.mailboxes[m.ID]
	if !ok {
		return nil, fmt.Errorf("mailbox %s not found", m.ID)
	}

	if m.DisplayName != "" {
		existing.DisplayName = m.DisplayName
	}
	if m.FirstName != "" {
		existing.FirstName = m.FirstName
	}
	if m.LastName != "" {
		existing.LastName = m.LastName
	}
	if m.Department != "" {
		existing.Department = m.Department
	}
	if m.DailyLimit > 0 {
		existing.DailyLimit = m.DailyLimit
	}
	if m.HourlyLimit > 0 {
		existing.HourlyLimit = m.HourlyLimit
	}
	if m.MinIntervalSeconds > 0 {
		existing.MinIntervalSeconds = m.MinIntervalSeconds
	}
	if m.Weight > 0 {
		existing.Weight = m.Weight
	}
	if m.IPPoolID != "" {
		existing.IPPoolID = m.IPPoolID
	}
	if m.HealthStatus != "" {
		existing.HealthStatus = m.HealthStatus
	}
	if m.SignatureHTML != "" {
		existing.SignatureHTML = m.SignatureHTML
	}
	existing.Enabled = m.Enabled
	existing.WarmupEnabled = m.WarmupEnabled
	existing.UpdatedAt = time.Now().UTC()

	s.mailboxes[existing.ID] = existing
	s.saveLocked()
	return &existing, nil
}

// DeleteMailbox removes a mailbox and cleans pool references
func (s *Store) DeleteMailbox(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.mailboxes[id]; !ok {
		return fmt.Errorf("mailbox %s not found", id)
	}

	delete(s.mailboxes, id)

	// Clean references from pools
	for pID, pool := range s.mailboxPools {
		newIDs := make([]string, 0, len(pool.MailboxIDs))
		for _, mID := range pool.MailboxIDs {
			if mID != id {
				newIDs = append(newIDs, mID)
			}
		}
		pool.MailboxIDs = newIDs
		s.mailboxPools[pID] = pool
	}

	s.saveLocked()
	return nil
}

// GetMailboxPools returns all configured mailbox pools
func (s *Store) GetMailboxPools() []models.MailboxPool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	res := make([]models.MailboxPool, 0, len(s.mailboxPools))
	for _, p := range s.mailboxPools {
		// Calculate current aggregate capacity
		daily := 0
		hourly := 0
		for _, mID := range p.MailboxIDs {
			if mb, exists := s.mailboxes[mID]; exists && mb.Enabled {
				daily += mb.DailyLimit
				hourly += mb.HourlyLimit
			}
		}
		p.DailyCapacity = daily
		p.HourlyCapacity = hourly
		res = append(res, p)
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Name < res[j].Name
	})
	return res
}

// GetMailboxPool returns a single pool by ID
func (s *Store) GetMailboxPool(id string) (*models.MailboxPool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	p, ok := s.mailboxPools[id]
	if !ok {
		return nil, fmt.Errorf("mailbox pool %s not found", id)
	}
	return &p, nil
}

// AddMailboxPool creates a new pool grouping mailboxes
func (s *Store) AddMailboxPool(p models.MailboxPool) (*models.MailboxPool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if p.Name == "" {
		return nil, fmt.Errorf("pool name is required")
	}

	if p.ID == "" {
		b := make([]byte, 4)
		rand.Read(b)
		p.ID = fmt.Sprintf("pool-%s", hex.EncodeToString(b))
	}

	if p.Strategy == "" {
		p.Strategy = "least_utilized"
	}
	p.Enabled = true
	p.CreatedAt = time.Now().UTC()
	p.UpdatedAt = time.Now().UTC()

	s.mailboxPools[p.ID] = p
	s.saveLocked()
	return &p, nil
}

// UpdateMailboxPool updates pool configuration and strategy
func (s *Store) UpdateMailboxPool(p models.MailboxPool) (*models.MailboxPool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, ok := s.mailboxPools[p.ID]
	if !ok {
		return nil, fmt.Errorf("mailbox pool %s not found", p.ID)
	}

	if p.Name != "" {
		existing.Name = p.Name
	}
	if p.Description != "" {
		existing.Description = p.Description
	}
	if p.Strategy != "" {
		existing.Strategy = p.Strategy
	}
	if p.MailboxIDs != nil {
		existing.MailboxIDs = p.MailboxIDs
	}
	existing.Enabled = p.Enabled
	existing.UpdatedAt = time.Now().UTC()

	s.mailboxPools[existing.ID] = existing
	s.saveLocked()
	return &existing, nil
}

// DeleteMailboxPool removes a pool
func (s *Store) DeleteMailboxPool(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.mailboxPools[id]; !ok {
		return fmt.Errorf("mailbox pool %s not found", id)
	}

	delete(s.mailboxPools, id)
	s.saveLocked()
	return nil
}

// SelectMailboxForRecipient executes concurrency-safe rotation, quota checks, and atomic quota reservation
func (s *Store) SelectMailboxForRecipient(poolID, campaignID, recipient string) (*models.Mailbox, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.selectMailboxForRecipientLocked(poolID, campaignID, recipient)
}

func (s *Store) selectMailboxForRecipientLocked(poolID, campaignID, recipient string) (*models.Mailbox, string, error) {
	pool, ok := s.mailboxPools[poolID]
	if !ok {
		return nil, "pool_not_found", fmt.Errorf("mailbox pool %s does not exist", poolID)
	}
	if !pool.Enabled {
		return nil, "pool_disabled", fmt.Errorf("mailbox pool %s is disabled", pool.Name)
	}

	now := time.Now().UTC()

	// 1. Gather all mailboxes in pool and filter eligibility
	type eligibleCandidate struct {
		mb          models.Mailbox
		ratio       float64
		lastSentSec float64
	}

	candidates := make([]eligibleCandidate, 0)
	var rejectionReason string

	for _, mID := range pool.MailboxIDs {
		mb, exists := s.mailboxes[mID]
		if !exists || !mb.Enabled {
			continue
		}
		if s.systemSettings.RequireVerifiedDomain && !mb.IsVerified {
			rejectionReason = "domain_unverified"
			continue
		}
		if mb.DailySent >= mb.DailyLimit {
			rejectionReason = "daily_quota_exhausted"
			continue
		}
		if mb.HourlySent >= mb.HourlyLimit {
			rejectionReason = "hourly_quota_exhausted"
			continue
		}
		if s.systemSettings.EnforceMinInterval && mb.MinIntervalSeconds > 0 && !mb.LastSentAt.IsZero() {
			elapsed := now.Sub(mb.LastSentAt).Seconds()
			if elapsed < float64(mb.MinIntervalSeconds) {
				rejectionReason = "min_interval_throttle"
				continue
			}
		}

		ratio := 0.0
		if mb.DailyLimit > 0 {
			ratio = float64(mb.DailySent) / float64(mb.DailyLimit)
		}
		lastSentSec := 999999.0
		if !mb.LastSentAt.IsZero() {
			lastSentSec = now.Sub(mb.LastSentAt).Seconds()
		}

		candidates = append(candidates, eligibleCandidate{
			mb:          mb,
			ratio:       ratio,
			lastSentSec: lastSentSec,
		})
	}

	if len(candidates) == 0 {
		if rejectionReason == "" {
			rejectionReason = "no_mailboxes_in_pool"
		}
		return nil, rejectionReason, fmt.Errorf("no eligible mailboxes available in pool (reason: %s)", rejectionReason)
	}

	// 2. Apply Strategy
	var selected models.Mailbox

	strategy := pool.Strategy
	if strategy == "" {
		strategy = "least_utilized"
	}

	switch strategy {
	case "round_robin":
		idx := s.mailboxRotationIndex[poolID]
		selected = candidates[idx%len(candidates)].mb
		s.mailboxRotationIndex[poolID] = (idx + 1) % len(candidates)

	case "least_recently_used":
		// Pick candidate with largest lastSentSec (longest inactive)
		sort.Slice(candidates, func(i, j int) bool {
			return candidates[i].lastSentSec > candidates[j].lastSentSec
		})
		selected = candidates[0].mb

	case "weighted_round_robin":
		totalWeight := 0
		for _, c := range candidates {
			w := c.mb.Weight
			if w <= 0 {
				w = 1
			}
			totalWeight += w
		}
		if totalWeight <= 0 {
			selected = candidates[0].mb
		} else {
			idx := s.mailboxRotationIndex[poolID] % totalWeight
			running := 0
			found := false
			for _, c := range candidates {
				w := c.mb.Weight
				if w <= 0 {
					w = 1
				}
				running += w
				if idx < running {
					selected = c.mb
					found = true
					break
				}
			}
			if !found {
				selected = candidates[0].mb
			}
			s.mailboxRotationIndex[poolID]++
		}

	case "least_utilized":
		fallthrough
	default:
		// Pick candidate with lowest utilization ratio
		sort.Slice(candidates, func(i, j int) bool {
			return candidates[i].ratio < candidates[j].ratio
		})
		selected = candidates[0].mb
	}

	// 3. Atomic Quota Reservation
	selected.DailySent++
	selected.HourlySent++
	selected.LastSentAt = now
	s.mailboxes[selected.ID] = selected

	// 4. Save Sticky Assignment
	if campaignID != "" && recipient != "" {
		s.mailboxAssignments[campaignID+":"+recipient] = models.MailboxAssignment{
			CampaignID:  campaignID,
			Recipient:   recipient,
			MailboxID:   selected.ID,
			SenderEmail: selected.Email,
			SenderName:  selected.DisplayName,
			AssignedAt:  now,
		}
	}

	s.saveLocked()
	return &selected, "", nil
}

// GetStickyMailbox retrieves the previously assigned sender mailbox for follow-up continuity
func (s *Store) GetStickyMailbox(campaignID, recipient string) (*models.MailboxAssignment, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	assignment, exists := s.mailboxAssignments[campaignID+":"+recipient]
	if !exists {
		return nil, fmt.Errorf("no prior mailbox assignment found for recipient %s in campaign %s", recipient, campaignID)
	}
	return &assignment, nil
}

// SimulateMailboxRotation generates a simulated recipient distribution across pool mailboxes
func (s *Store) SimulateMailboxRotation(poolID, strategy string, recipients []string) (*models.MailboxRotationSimulation, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	pool, ok := s.mailboxPools[poolID]
	if !ok {
		return nil, fmt.Errorf("pool %s not found", poolID)
	}

	if strategy == "" {
		strategy = pool.Strategy
	}

	if len(recipients) == 0 {
		recipients = []string{
			"lead-1@acme-corp.com",
			"lead-2@global-logistics.test",
			"lead-3@stripe-connect.test",
			"lead-4@uber-freight.test",
			"lead-5@databricks-lake.test",
			"lead-6@snowflake-cloud.test",
			"lead-7@hashicorp-vault.test",
			"lead-8@figma-design.test",
			"lead-9@github-actions.test",
			"lead-10@openai-scale.test",
		}
	}

	sim := &models.MailboxRotationSimulation{
		PoolID:       poolID,
		Strategy:     strategy,
		Assignments:  make([]models.RecipientMailboxSimulation, 0, len(recipients)),
		SummaryStats: make(map[string]int),
	}

	// Make shadow copy of mailboxes for simulation without modifying live state
	type simMB struct {
		id         string
		email      string
		name       string
		dailySent  int
		dailyLimit int
		weight     int
		lastSent   time.Time
	}

	shadow := make([]*simMB, 0)
	for _, mID := range pool.MailboxIDs {
		if mb, exists := s.mailboxes[mID]; exists && mb.Enabled {
			shadow = append(shadow, &simMB{
				id:         mb.ID,
				email:      mb.Email,
				name:       mb.DisplayName,
				dailySent:  mb.DailySent,
				dailyLimit: mb.DailyLimit,
				weight:     mb.Weight,
				lastSent:   mb.LastSentAt,
			})
		}
	}

	if len(shadow) == 0 {
		return nil, fmt.Errorf("pool has no enabled mailboxes")
	}

	rotCounter := 0

	for _, recip := range recipients {
		var picked *simMB

		switch strategy {
		case "round_robin":
			picked = shadow[rotCounter%len(shadow)]
			rotCounter++

		case "least_recently_used":
			sort.Slice(shadow, func(i, j int) bool {
				return shadow[i].lastSent.Before(shadow[j].lastSent)
			})
			picked = shadow[0]
			picked.lastSent = time.Now().UTC()

		case "weighted_round_robin":
			totalW := 0
			for _, m := range shadow {
				w := m.weight
				if w <= 0 {
					w = 1
				}
				totalW += w
			}
			idx := rotCounter % totalW
			running := 0
			for _, m := range shadow {
				w := m.weight
				if w <= 0 {
					w = 1
				}
				running += w
				if idx < running {
					picked = m
					break
				}
			}
			if picked == nil {
				picked = shadow[0]
			}
			rotCounter++

		case "least_utilized":
			fallthrough
		default:
			sort.Slice(shadow, func(i, j int) bool {
				rI := float64(shadow[i].dailySent) / math.Max(1.0, float64(shadow[i].dailyLimit))
				rJ := float64(shadow[j].dailySent) / math.Max(1.0, float64(shadow[j].dailyLimit))
				return rI < rJ
			})
			picked = shadow[0]
			picked.dailySent++
		}

		sim.Assignments = append(sim.Assignments, models.RecipientMailboxSimulation{
			Recipient:   recip,
			MailboxID:   picked.id,
			SenderEmail: picked.email,
			SenderName:  picked.name,
			Eligible:    true,
		})
		sim.SummaryStats[picked.email]++
	}

	return sim, nil
}

// GetSystemSettings returns cluster-wide sending and rotation policies
func (s *Store) GetSystemSettings() models.SystemSettings {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.systemSettings
}

// UpdateSystemSettings updates operational policies
func (s *Store) UpdateSystemSettings(settings models.SystemSettings) models.SystemSettings {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.systemSettings = settings
	s.saveLocked()
	return s.systemSettings
}

// GetPlaybooks returns all built-in sequence templates
func (s *Store) GetPlaybooks() []models.AutomationPlaybook {
	s.mu.RLock()
	defer s.mu.RUnlock()

	res := make([]models.AutomationPlaybook, 0, len(s.playbooks))
	for _, pb := range s.playbooks {
		res = append(res, pb)
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Name < res[j].Name
	})
	return res
}
