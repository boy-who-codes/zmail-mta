package dns

import (
	"context"
	"fmt"
	"net"
	"regexp"
	"strings"
	"time"
)

// RDNSCheckResult represents an exhaustive reverse DNS (PTR) and FCrDNS audit
type RDNSCheckResult struct {
	Target             string    `json:"target"`
	ResolvedIP         string    `json:"resolved_ip"`
	PTRRecords         []string  `json:"ptr_records"`
	PrimaryPTR         string    `json:"primary_ptr"`
	HasPTR             bool      `json:"has_ptr"`
	FCrDNSValid        bool      `json:"fcrdns_valid"`
	FCrDNSForwardIPs   []string  `json:"fcrdns_forward_ips"`
	DomainAligned      bool      `json:"domain_aligned"`
	ExpectedDomain     string    `json:"expected_domain,omitempty"`
	IsGenericISP       bool      `json:"is_generic_isp"`
	ISPPatternDetected string    `json:"isp_pattern_detected,omitempty"`
	ComplianceStatus   string    `json:"compliance_status"` // "compliant" | "warning" | "failing"
	ComplianceScore    int       `json:"compliance_score"`  // 0 - 100
	Diagnostics        []string  `json:"diagnostics"`
	Recommendation     string    `json:"recommendation"`
	CheckedAt          time.Time `json:"checked_at"`
}

var genericISPPatt = regexp.MustCompile(`(?i)(broadband|dynamic|res|dhcp|dip|dsl|cable|pool|home|user|dial|dyn|cust|static-[0-9]+|bc\.googleusercontent\.com|compute\.amazonaws\.com|cloudapp\.azure\.com)`)

// CheckRDNS performs full Reverse DNS & Forward-Confirmed Reverse DNS (FCrDNS) checks
func CheckRDNS(ctx context.Context, target string, expectedDomain string) (*RDNSCheckResult, error) {
	cleanTarget := strings.TrimSpace(target)
	if cleanTarget == "" {
		return nil, fmt.Errorf("target IP address or domain is required")
	}

	res := &RDNSCheckResult{
		Target:           cleanTarget,
		PTRRecords:       make([]string, 0),
		FCrDNSForwardIPs: make([]string, 0),
		Diagnostics:      make([]string, 0),
		CheckedAt:        time.Now().UTC(),
	}

	cleanDomain := strings.TrimSpace(strings.ToLower(expectedDomain))
	cleanDomain = strings.TrimPrefix(cleanDomain, "http://")
	cleanDomain = strings.TrimPrefix(cleanDomain, "https://")
	cleanDomain = strings.Split(cleanDomain, "/")[0]
	res.ExpectedDomain = cleanDomain

	resolver := &net.Resolver{PreferGo: true}

	// 1. Determine if target is an IP or Hostname
	targetIP := net.ParseIP(cleanTarget)
	if targetIP == nil {
		// Target is a hostname - forward resolve to find the sending IP
		ips, err := resolver.LookupIP(ctx, "ip", cleanTarget)
		if err != nil || len(ips) == 0 {
			res.ComplianceStatus = "failing"
			res.ComplianceScore = 0
			res.Diagnostics = append(res.Diagnostics, fmt.Sprintf("❌ Hostname %q could not be resolved to any IP address: %v", cleanTarget, err))
			res.Recommendation = "Ensure the hostname has a valid DNS A record pointed to your server IP."
			return res, nil
		}
		targetIP = ips[0]
		res.Diagnostics = append(res.Diagnostics, fmt.Sprintf("✓ Hostname %q resolved forward to IP %s", cleanTarget, targetIP.String()))
	}

	res.ResolvedIP = targetIP.String()

	// 2. Perform Reverse DNS (PTR) Lookup
	ptrs, err := resolver.LookupAddr(ctx, res.ResolvedIP)
	if err != nil || len(ptrs) == 0 {
		res.HasPTR = false
		res.ComplianceStatus = "failing"
		res.ComplianceScore = 15
		res.Diagnostics = append(res.Diagnostics, fmt.Sprintf("❌ No PTR (reverse DNS) record exists for IP %s (Lookup error: %v)", res.ResolvedIP, err))
		res.Recommendation = fmt.Sprintf("CRITICAL: Set an rDNS / PTR record at your hosting provider pointing %s to your sending hostname (e.g. mail.%s). Google and Yahoo reject all mail from IPs without PTR records.", res.ResolvedIP, func() string {
			if cleanDomain != "" {
				return cleanDomain
			}
			return "yourdomain.com"
		}())
		return res, nil
	}

	res.HasPTR = true
	for _, p := range ptrs {
		clean := strings.TrimSuffix(strings.TrimSpace(p), ".")
		res.PTRRecords = append(res.PTRRecords, clean)
	}
	res.PrimaryPTR = res.PTRRecords[0]
	res.Diagnostics = append(res.Diagnostics, fmt.Sprintf("✓ Reverse DNS (PTR) record found: %s", res.PrimaryPTR))

	// 3. Check for Generic ISP / Residential Hostname Heuristic
	if genericISPPatt.MatchString(res.PrimaryPTR) {
		res.IsGenericISP = true
		res.ISPPatternDetected = genericISPPatt.FindString(res.PrimaryPTR)
		res.Diagnostics = append(res.Diagnostics, fmt.Sprintf("⚠️ PTR hostname %q matches generic or residential ISP pattern (%s)", res.PrimaryPTR, res.ISPPatternDetected))
	} else {
		res.Diagnostics = append(res.Diagnostics, fmt.Sprintf("✓ PTR hostname %q has a custom enterprise naming structure", res.PrimaryPTR))
	}

	// 4. Perform Forward-Confirmed Reverse DNS (FCrDNS) Check
	forwardIPs, fwdErr := resolver.LookupIP(ctx, "ip", res.PrimaryPTR)
	if fwdErr != nil || len(forwardIPs) == 0 {
		res.FCrDNSValid = false
		res.Diagnostics = append(res.Diagnostics, fmt.Sprintf("❌ FCrDNS Failed: PTR hostname %q does not resolve forward to any IP (%v)", res.PrimaryPTR, fwdErr))
	} else {
		for _, fip := range forwardIPs {
			res.FCrDNSForwardIPs = append(res.FCrDNSForwardIPs, fip.String())
			if fip.String() == res.ResolvedIP {
				res.FCrDNSValid = true
			}
		}

		if res.FCrDNSValid {
			res.Diagnostics = append(res.Diagnostics, fmt.Sprintf("✓ FCrDNS Verified: %s resolves forward back to %s (RFC 5321 verified)", res.PrimaryPTR, res.ResolvedIP))
		} else {
			res.Diagnostics = append(res.Diagnostics, fmt.Sprintf("❌ FCrDNS Mismatch: %s resolves to %v, but your sending IP is %s", res.PrimaryPTR, res.FCrDNSForwardIPs, res.ResolvedIP))
		}
	}

	// 5. Check Domain Alignment
	if cleanDomain != "" {
		ptrLower := strings.ToLower(res.PrimaryPTR)
		if strings.HasSuffix(ptrLower, "."+cleanDomain) || ptrLower == cleanDomain {
			res.DomainAligned = true
			res.Diagnostics = append(res.Diagnostics, fmt.Sprintf("✓ Domain Alignment: PTR hostname %q aligns with expected domain %q", res.PrimaryPTR, cleanDomain))
		} else {
			res.DomainAligned = false
			res.Diagnostics = append(res.Diagnostics, fmt.Sprintf("⚠️ Domain Alignment: PTR hostname %q belongs to a different domain than %q", res.PrimaryPTR, cleanDomain))
		}
	} else {
		res.DomainAligned = true
	}

	// 6. Compute Final Score & Compliance Status
	score := 30
	if res.HasPTR {
		score += 30
	}
	if res.FCrDNSValid {
		score += 25
	}
	if !res.IsGenericISP {
		score += 10
	}
	if res.DomainAligned {
		score += 5
	}
	res.ComplianceScore = score

	if res.HasPTR && res.FCrDNSValid && !res.IsGenericISP {
		res.ComplianceStatus = "compliant"
		res.Recommendation = "100% Google & Yahoo Deliverability Compliant. Your Forward-Confirmed Reverse DNS (FCrDNS) is fully verified."
	} else if res.HasPTR && res.FCrDNSValid && res.IsGenericISP {
		res.ComplianceStatus = "warning"
		res.Recommendation = fmt.Sprintf("PTR is forward-confirmed, but the hostname %q appears to be a default cloud or dynamic ISP name. Configure a custom domain PTR (e.g., mail.%s) in your host's control panel to optimize reputation.", res.PrimaryPTR, func() string {
			if cleanDomain != "" {
				return cleanDomain
			}
			return "yourdomain.com"
		}())
	} else if res.HasPTR && !res.FCrDNSValid {
		res.ComplianceStatus = "failing"
		res.Recommendation = fmt.Sprintf("FCrDNS Mismatch: Ensure you add a DNS 'A' record pointing %s back to %s so that forward and reverse DNS match.", res.PrimaryPTR, res.ResolvedIP)
	} else {
		res.ComplianceStatus = "failing"
		res.Recommendation = "Set an rDNS / PTR record in your server host dashboard before attempting to send mail to public inbox providers."
	}

	return res, nil
}
