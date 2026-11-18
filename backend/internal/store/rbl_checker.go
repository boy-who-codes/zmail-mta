package store

import (
	"context"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"mailops.io/backend/internal/models"
)

type rblDefinition struct {
	Name        string
	Zone        string
	TargetType  string // "ip", "domain", or "both"
	Description string
}

var ipRBLProviders = []rblDefinition{
	{
		Name:        "Spamhaus ZEN",
		Zone:        "zen.spamhaus.org",
		TargetType:  "ip",
		Description: "Spamhaus combined blocklist (SBL, XBL, CSS, PBL)",
	},
	{
		Name:        "Barracuda BRBL",
		Zone:        "b.barracudacentral.org",
		TargetType:  "ip",
		Description: "Barracuda Reputation Network blacklist",
	},
	{
		Name:        "SpamCop BL",
		Zone:        "bl.spamcop.net",
		TargetType:  "ip",
		Description: "SpamCop real-time spam reporter blocklist",
	},
	{
		Name:        "SORBS DNSBL",
		Zone:        "dnsbl.sorbs.net",
		TargetType:  "ip",
		Description: "Spam and Open Relay Blocking System",
	},
	{
		Name:        "Mailspike IP",
		Zone:        "bl.mailspike.net",
		TargetType:  "ip",
		Description: "Mailspike reputation real-time IP list",
	},
	{
		Name:        "Composite CBL",
		Zone:        "cbl.abuseat.org",
		TargetType:  "ip",
		Description: "Composite Blocking List (trojans, botnets, proxies)",
	},
	{
		Name:        "PSBL Surriel",
		Zone:        "psbl.surriel.com",
		TargetType:  "ip",
		Description: "Passive Spam Block List (zero false positive target)",
	},
}

var domainRBLProviders = []rblDefinition{
	{
		Name:        "Spamhaus DBL",
		Zone:        "dbl.spamhaus.org",
		TargetType:  "domain",
		Description: "Spamhaus Domain Blocklist (phishing, malware, spam domains)",
	},
	{
		Name:        "SURBL Multi",
		Zone:        "multi.surbl.org",
		TargetType:  "domain",
		Description: "SURBL aggregated suspicious and spam URI domains",
	},
	{
		Name:        "SEM URIBL",
		Zone:        "uribl.spameatingmonkey.net",
		TargetType:  "domain",
		Description: "Spam Eating Monkey domain blocklist",
	},
}

// CheckTargetRBL queries all appropriate DNSBL providers for a given IP or domain
func CheckTargetRBL(target string, targetType string) models.RBLTargetAudit {
	cleanTarget := strings.TrimSpace(strings.ToLower(target))
	isIP := false
	parsedIP := net.ParseIP(cleanTarget)
	if parsedIP != nil {
		isIP = true
		targetType = "ip"
	} else if targetType == "" {
		targetType = "domain"
	}

	var providersToCheck []rblDefinition
	if isIP || targetType == "ip" {
		providersToCheck = ipRBLProviders
	} else {
		providersToCheck = domainRBLProviders
	}

	resolver := &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			d := net.Dialer{Timeout: 3 * time.Second}
			c, err := d.DialContext(ctx, "udp", "1.1.1.1:53")
			if err != nil {
				return d.DialContext(ctx, "udp", "8.8.8.8:53")
			}
			return c, nil
		},
	}

	var wg sync.WaitGroup
	results := make([]models.RBLProviderResult, len(providersToCheck))

	for i, prov := range providersToCheck {
		wg.Add(1)
		go func(idx int, p rblDefinition) {
			defer wg.Done()
			start := time.Now()

			var queryHost string
			if isIP {
				// Reverse IPv4 octets: 1.2.3.4 -> 4.3.2.1.<zone>
				v4 := parsedIP.To4()
				if v4 != nil {
					queryHost = fmt.Sprintf("%d.%d.%d.%d.%s", v4[3], v4[2], v4[1], v4[0], p.Zone)
				} else {
					// Fallback for raw IP string
					octets := strings.Split(cleanTarget, ".")
					if len(octets) == 4 {
						queryHost = fmt.Sprintf("%s.%s.%s.%s.%s", octets[3], octets[2], octets[1], octets[0], p.Zone)
					} else {
						queryHost = fmt.Sprintf("%s.%s", cleanTarget, p.Zone)
					}
				}
			} else {
				queryHost = fmt.Sprintf("%s.%s", cleanTarget, p.Zone)
			}

			ctx, cancel := context.WithTimeout(context.Background(), 3500*time.Millisecond)
			defer cancel()

			ips, err := resolver.LookupIP(ctx, "ip4", queryHost)
			elapsed := time.Since(start).Milliseconds()

			res := models.RBLProviderResult{
				Name:           p.Name,
				Zone:           p.Zone,
				ResponseTimeMs: elapsed,
			}

			if err != nil || len(ips) == 0 {
				// Clean - NXDOMAIN or lookup error
				res.Listed = false
				res.Description = "Clean / Not Listed"
			} else {
				ipStr := ips[0].String()
				// Check for Spamhaus / RBL open resolver response codes (e.g. 127.255.255.X = query limit)
				if strings.HasPrefix(ipStr, "127.255.255.") {
					res.Listed = false
					res.ReturnCode = ipStr
					res.Description = "Clean (Public DNS query rate limit returned)"
				} else {
					res.Listed = true
					res.ReturnCode = ipStr
					res.Description = fmt.Sprintf("Blacklisted (Code: %s)", ipStr)
				}
			}

			results[idx] = res
		}(i, prov)
	}

	wg.Wait()

	listedCount := 0
	for _, r := range results {
		if r.Listed {
			listedCount++
		}
	}

	totalChecked := len(results)
	score := 100
	if totalChecked > 0 && listedCount > 0 {
		deduction := (listedCount * 100) / totalChecked
		if deduction > 100 {
			deduction = 100
		}
		score = 100 - deduction
	}

	return models.RBLTargetAudit{
		Target:          cleanTarget,
		TargetType:      targetType,
		IsClean:         listedCount == 0,
		ListedCount:     listedCount,
		TotalChecked:    totalChecked,
		ReputationScore: score,
		CheckedAt:       time.Now().UTC(),
		Providers:       results,
	}
}

// AuditSystemRBL scans all active sending domains and egress IPs in the system
func (s *Store) AuditSystemRBL() models.RBLAuditSummary {
	var targets []struct {
		target     string
		targetType string
	}

	// 1. Collect Domains
	domains := s.GetDomains()
	for _, d := range domains {
		if d.DomainName != "" {
			targets = append(targets, struct {
				target     string
				targetType string
			}{target: d.DomainName, targetType: "domain"})
		}
	}

	// 2. Collect IPs
	ips := s.GetSendingIPs()
	for _, ip := range ips {
		if ip.IP != "" && ip.IP != "127.0.0.1" {
			targets = append(targets, struct {
				target     string
				targetType string
			}{target: ip.IP, targetType: "ip"})
		}
	}

	// Fallback if no sending IPs or domains exist yet: provide sample egress IP
	if len(targets) == 0 {
		targets = append(targets, struct {
			target     string
			targetType string
		}{target: "mailops.io", targetType: "domain"})
	}

	var wg sync.WaitGroup
	audits := make([]models.RBLTargetAudit, len(targets))

	for i, t := range targets {
		wg.Add(1)
		go func(idx int, target string, tType string) {
			defer wg.Done()
			audits[idx] = CheckTargetRBL(target, tType)
		}(i, t.target, t.targetType)
	}

	wg.Wait()

	cleanTargets := 0
	for _, a := range audits {
		if a.IsClean {
			cleanTargets++
		}
	}

	return models.RBLAuditSummary{
		OverallClean: cleanTargets == len(audits),
		TotalTargets: len(audits),
		CleanTargets: cleanTargets,
		CheckedAt:    time.Now().UTC(),
		Audits:       audits,
	}
}
