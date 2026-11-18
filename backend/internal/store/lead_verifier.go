package store

import (
	"context"
	"net"
	"regexp"
	"strings"
	"sync"
	"time"

	"mailops.io/backend/internal/models"
)

var (
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9.!#$%&'*+/=?^_` + "`" + `{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$`)

	disposableDomains = map[string]bool{
		"mailinator.com":      true,
		"10minutemail.com":    true,
		"guerrillamail.com":   true,
		"tempmail.com":        true,
		"trashmail.com":       true,
		"yopmail.com":         true,
		"sharklasers.com":     true,
		"getairmail.com":      true,
		"dispostable.com":     true,
		"throwawaymail.com":   true,
		"temp-mail.org":       true,
		"burnermail.io":       true,
		"fakeinbox.com":       true,
		"inboxkitten.com":     true,
		"crazymailing.com":    true,
		"generator.email":     true,
	}

	rolePrefixes = map[string]bool{
		"admin":       true,
		"support":     true,
		"info":        true,
		"sales":       true,
		"billing":     true,
		"help":        true,
		"jobs":        true,
		"contact":     true,
		"office":      true,
		"marketing":   true,
		"security":    true,
		"abuse":       true,
		"postmaster":  true,
		"hostmaster":  true,
		"webmaster":   true,
		"team":        true,
		"finance":     true,
		"hr":          true,
	}
)

// VerifySingleEmail executes deep hygiene checks on a single email address
func VerifySingleEmail(email string) models.LeadVerificationResult {
	cleanEmail := strings.TrimSpace(strings.ToLower(email))

	res := models.LeadVerificationResult{
		Email:  cleanEmail,
		Score:  100,
		Status: "valid",
		Reason: "Email verified & ready for outreach",
	}

	// 1. Syntax Verification
	if cleanEmail == "" || !emailRegex.MatchString(cleanEmail) || len(cleanEmail) > 254 {
		res.SyntaxValid = false
		res.Status = "invalid"
		res.Score = 0
		res.Reason = "RFC-5322 Syntax Error / Malformed format"
		return res
	}
	res.SyntaxValid = true

	parts := strings.Split(cleanEmail, "@")
	if len(parts) != 2 {
		res.Status = "invalid"
		res.Score = 0
		res.Reason = "Missing domain part"
		return res
	}
	localPart, domain := parts[0], parts[1]
	res.Domain = domain

	// 2. Disposable / Burner Domain Check
	if disposableDomains[domain] {
		res.IsDisposable = true
		res.Status = "invalid"
		res.Score = 10
		res.Reason = "Disposable / Temporary Burner Email Provider"
		return res
	}

	// 3. Role-Based Account Check
	if rolePrefixes[localPart] {
		res.IsRoleBased = true
		res.Status = "risky"
		res.Score = 70
		res.Reason = "Generic role account (higher spam complaint probability)"
	}

	// 4. Real-time DNS MX Lookup (direct fast public DNS to avoid container resolver delays)
	resolver := &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			d := net.Dialer{Timeout: 4 * time.Second}
			c, err := d.DialContext(ctx, "udp", "1.1.1.1:53")
			if err != nil {
				return d.DialContext(ctx, "udp", "8.8.8.8:53")
			}
			return c, nil
		},
	}
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()

	mxRecords, err := resolver.LookupMX(ctx, domain)
	if err == nil && len(mxRecords) > 0 {
		res.HasMX = true
		for _, mx := range mxRecords {
			res.MXHosts = append(res.MXHosts, strings.TrimSuffix(mx.Host, "."))
		}
	} else {
		// Fallback check: Some valid domains receive mail directly via A record
		ips, ipErr := resolver.LookupIP(ctx, "ip4", domain)
		if ipErr == nil && len(ips) > 0 {
			res.HasMX = true
			res.MXHosts = append(res.MXHosts, domain+" (Direct A Record)")
		} else {
			res.HasMX = false
			res.Status = "invalid"
			res.Score = 5
			res.Reason = "Domain does not have valid MX or Mail Exchange records"
			return res
		}
	}

	return res
}

// BulkVerifyEmails verifies a slice of email addresses concurrently
func BulkVerifyEmails(emails []string) models.BulkVerificationSummary {
	var summary models.BulkVerificationSummary
	if len(emails) == 0 {
		return summary
	}

	results := make([]models.LeadVerificationResult, len(emails))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 15) // max 15 concurrent DNS lookups to avoid rate limiting

	for i, em := range emails {
		wg.Add(1)
		sem <- struct{}{}
		go func(idx int, targetEmail string) {
			defer wg.Done()
			defer func() { <-sem }()
			results[idx] = VerifySingleEmail(targetEmail)
		}(i, em)
	}

	wg.Wait()

	summary.TotalProcessed = len(results)
	summary.Results = results

	for _, r := range results {
		switch r.Status {
		case "valid":
			summary.ValidCount++
		case "risky":
			summary.RiskyCount++
		case "invalid":
			summary.InvalidCount++
		}
	}

	if summary.TotalProcessed > 0 {
		summary.CleanRate = (float64(summary.ValidCount) / float64(summary.TotalProcessed)) * 100
	}

	return summary
}
