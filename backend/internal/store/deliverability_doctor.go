package store

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"net/textproto"
	"os"
	"strings"
	"sync"
	"time"

	"mailops.io/backend/internal/ipdetect"
	"mailops.io/backend/internal/models"
)

// RunOutboundPreflight runs a comprehensive battery of non-destructive live network probes
// to detect if outbound email can actually be delivered to the internet.
func (s *Store) RunOutboundPreflight(ctx context.Context) (*models.OutboundPreflightReport, error) {
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), 7*time.Second)
		defer cancel()
	}

	report := &models.OutboundPreflightReport{
		TestedAt: time.Now().UTC(),
	}

	var wg sync.WaitGroup

	// 1. Concurrent Port 25 Outbound Egress Probes
	wg.Add(1)
	go func() {
		defer wg.Done()
		targets := []struct {
			Host     string
			Provider string
		}{
			{Host: "aspmx.l.google.com:25", Provider: "Google Workspace / Gmail MX"},
			{Host: "mta5.am0.yahoodns.net:25", Provider: "Yahoo Mail MX"},
			{Host: "mx1.mail.icloud.com:25", Provider: "Apple iCloud Mail MX"},
		}

		var targetWg sync.WaitGroup
		targetResults := make([]models.PortTargetTest, len(targets))

		for idx, t := range targets {
			targetWg.Add(1)
			go func(i int, host, prov string) {
				defer targetWg.Done()
				t0 := time.Now()
				res := models.PortTargetTest{
					Target:   host,
					Provider: prov,
				}

				dialer := net.Dialer{Timeout: 3 * time.Second}
				conn, err := dialer.DialContext(ctx, "tcp", host)
				res.LatencyMs = time.Since(t0).Milliseconds()
				if err != nil {
					res.Connected = false
					res.Error = err.Error()
					targetResults[i] = res
					return
				}
				defer conn.Close()

				res.Connected = true
				_ = conn.SetReadDeadline(time.Now().Add(1500 * time.Millisecond))
				reader := bufio.NewReader(conn)
				banner, readErr := reader.ReadString('\n')
				if readErr == nil {
					res.Banner = strings.TrimSpace(banner)
				}
				targetResults[i] = res
			}(idx, t.Host, t.Provider)
		}
		targetWg.Wait()

		anyOpen := false
		var fastestLatency int64 = 99999
		for _, tr := range targetResults {
			if tr.Connected {
				anyOpen = true
				if tr.LatencyMs < fastestLatency {
					fastestLatency = tr.LatencyMs
				}
			}
		}

		if !anyOpen {
			fastestLatency = 0
		}

		report.Port25Status = models.Port25Check{
			IsOpen:    anyOpen,
			LatencyMs: fastestLatency,
			Targets:   targetResults,
		}
		if !anyOpen {
			report.Port25Status.ErrorMessage = "Outbound TCP connection to port 25 timed out or was rejected across all major public MX destinations."
		}
	}()

	// 2. KumoMTA Local Engine Health Probe
	wg.Add(1)
	go func() {
		defer wg.Done()
		smtpTarget := os.Getenv("KUMO_SMTP")
		if smtpTarget == "" {
			smtpTarget = "127.0.0.1:2525"
		}

		t0 := time.Now()
		check := models.KumoMTACheck{
			Endpoint: smtpTarget,
		}

		dialer := net.Dialer{Timeout: 2 * time.Second}
		conn, err := dialer.DialContext(ctx, "tcp", smtpTarget)
		check.LatencyMs = time.Since(t0).Milliseconds()
		if err != nil {
			check.IsHealthy = false
			check.Error = fmt.Sprintf("KumoMTA listener unreachable: %v", err)
			report.KumoMTAStatus = check
			return
		}
		defer conn.Close()

		_ = conn.SetReadDeadline(time.Now().Add(1500 * time.Millisecond))
		tp := textproto.NewConn(conn)
		code, banner, err := tp.ReadResponse(220)
		if err != nil {
			check.IsHealthy = false
			check.Error = fmt.Sprintf("Failed reading KumoMTA banner (code %d): %v", code, err)
			report.KumoMTAStatus = check
			return
		}

		check.IsHealthy = true
		check.Banner = fmt.Sprintf("%d %s", code, banner)
		report.KumoMTAStatus = check
	}()

	// 3. Public IP, rDNS (PTR), and Blacklist Probes
	wg.Add(1)
	go func() {
		defer wg.Done()
		info, _ := s.GetInfrastructureInfo(false)
		pubIP := ""
		if info != nil && info.PublicIP != "" {
			pubIP = info.PublicIP
		} else {
			s.mu.RLock()
			for _, ip := range s.ips {
				if ip.Status == "active" && ipdetect.IsPublicIP(net.ParseIP(ip.IP)) {
					pubIP = ip.IP
					break
				}
			}
			s.mu.RUnlock()
		}

		report.PublicIP = pubIP
		parsedIP := net.ParseIP(pubIP)
		report.IsPublicIP = ipdetect.IsPublicIP(parsedIP)

		rdns := models.ReverseDNSCheck{
			IP: pubIP,
		}

		if report.IsPublicIP && pubIP != "" {
			names, err := net.LookupAddr(pubIP)
			if err == nil && len(names) > 0 {
				cleanName := strings.TrimSuffix(names[0], ".")
				rdns.PTRHostname = cleanName
				rdns.IsConfigured = true

				forwardIPs, fErr := net.LookupIP(cleanName)
				if fErr == nil {
					for _, fip := range forwardIPs {
						if fip.String() == pubIP {
							rdns.ForwardConfirmed = true
							break
						}
					}
				}
				if !rdns.ForwardConfirmed {
					rdns.Issues = append(rdns.Issues, fmt.Sprintf("PTR '%s' does not forward-resolve back to '%s' (Forward-Confirmed Reverse DNS failure)", cleanName, pubIP))
				}
			} else {
				rdns.Issues = append(rdns.Issues, "No PTR (Reverse DNS) record configured for this public egress IP. Gmail & Yahoo will flag or reject outbound dispatches.")
			}

			// Blacklist lookup
			report.BlacklistStatus = s.checkDNSBL(pubIP)
		} else {
			rdns.Issues = append(rdns.Issues, "Private or loopback IP detected. Egress requires a public static IPv4 address.")
			report.BlacklistStatus = []models.BlacklistCheck{
				{RBL: "zen.spamhaus.org", Listed: false, Details: "Skipped (Private / Local IP)"},
				{RBL: "bl.spamcop.net", Listed: false, Details: "Skipped (Private / Local IP)"},
				{RBL: "bbl.barracudacentral.org", Listed: false, Details: "Skipped (Private / Local IP)"},
			}
		}

		report.ReverseDNS = rdns
	}()

	// 4. Configured Domains Health Check
	wg.Add(1)
	go func() {
		defer wg.Done()
		s.mu.RLock()
		defer s.mu.RUnlock()

		var domainChecks []models.DomainPreflightCheck
		for _, d := range s.domains {
			dc := models.DomainPreflightCheck{
				Domain:     d.DomainName,
				SPFValid:   strings.Contains(d.SPFRecord, "v=spf1"),
				DKIMValid:  d.DKIMPublicKey != "",
				DMARCValid: strings.Contains(strings.ToLower(d.DMARCRecord), "v=dmarc1"),
				MXValid:    strings.TrimSpace(d.MXRecord) != "",
			}

			if !dc.SPFValid {
				dc.Issues = append(dc.Issues, "SPF record is missing or invalid.")
			}
			if !dc.DKIMValid {
				dc.Issues = append(dc.Issues, "DKIM keypair is not generated.")
			}
			if !dc.DMARCValid {
				dc.Issues = append(dc.Issues, "DMARC policy is missing.")
			}
			if !dc.MXValid {
				dc.Issues = append(dc.Issues, "MX record is missing; inbound replies and bounces cannot be received.")
			}

			domainChecks = append(domainChecks, dc)
		}
		report.DomainHealth = domainChecks
	}()

	wg.Wait()

	// 5. Synthesize Overall Status and Actionable Recommendations
	s.evaluatePreflightHealth(report)

	return report, nil
}

func (s *Store) checkDNSBL(ipStr string) []models.BlacklistCheck {
	parts := strings.Split(ipStr, ".")
	if len(parts) != 4 {
		return nil
	}
	reversed := fmt.Sprintf("%s.%s.%s.%s", parts[3], parts[2], parts[1], parts[0])

	rbls := []struct {
		Name string
		Zone string
	}{
		{Name: "Spamhaus ZEN", Zone: "zen.spamhaus.org"},
		{Name: "SpamCop BL", Zone: "bl.spamcop.net"},
		{Name: "Barracuda BRBL", Zone: "bbl.barracudacentral.org"},
	}

	results := make([]models.BlacklistCheck, len(rbls))
	var wg sync.WaitGroup

	for i, rbl := range rbls {
		wg.Add(1)
		go func(idx int, name, zone string) {
			defer wg.Done()
			query := fmt.Sprintf("%s.%s", reversed, zone)
			ips, err := net.LookupIP(query)
			if err == nil && len(ips) > 0 {
				results[idx] = models.BlacklistCheck{
					RBL:     name,
					Listed:  true,
					Details: fmt.Sprintf("Listed (Response: %s). Dispatches will likely be rejected.", ips[0].String()),
				}
			} else {
				results[idx] = models.BlacklistCheck{
					RBL:     name,
					Listed:  false,
					Details: "Clean (Not listed)",
				}
			}
		}(i, rbl.Name, rbl.Zone)
	}

	wg.Wait()
	return results
}

func (s *Store) evaluatePreflightHealth(report *models.OutboundPreflightReport) {
	var recs []string
	isBlocked := false
	isDegraded := false

	// Critical Gate 1: Local KumoMTA
	if !report.KumoMTAStatus.IsHealthy {
		isBlocked = true
		recs = append(recs, "CRITICAL: Internal KumoMTA ESMTP service on port 2525 is unreachable. Ensure the mailops-mta service is running.")
	}

	// Critical Gate 2: Outbound Port 25
	if !report.Port25Status.IsOpen {
		isBlocked = true
		recs = append(recs, "CRITICAL: Outbound Port 25 is firewalled by your hosting provider or network. Outbound dispatches to Gmail, Outlook, and Yahoo will time out. Request Port 25 unblocking from your provider, or attach an authenticated outbound relay on Port 587.")
	}

	// Gate 3: Reverse DNS (PTR)
	if report.IsPublicIP {
		if !report.ReverseDNS.IsConfigured {
			isDegraded = true
			recs = append(recs, "WARNING: Reverse DNS (PTR) is missing for your egress IP. Google and Yahoo require forward-confirmed rDNS matching your HELO hostname.")
		} else if !report.ReverseDNS.ForwardConfirmed {
			isDegraded = true
			recs = append(recs, "WARNING: Reverse DNS forward confirmation (FCrDNS) failed. The PTR hostname does not resolve back to your egress IP.")
		}
	}

	// Gate 4: Blacklists
	for _, bl := range report.BlacklistStatus {
		if bl.Listed {
			isDegraded = true
			recs = append(recs, fmt.Sprintf("WARNING: Public IP is listed on %s. Deliverability to major mailbox providers will suffer severe inbox penalties.", bl.RBL))
		}
	}

	// Gate 5: Sending Domains
	if len(report.DomainHealth) == 0 {
		isDegraded = true
		recs = append(recs, "INFO: No sender domains configured yet. Add your primary sending domain in DNS & Domains.")
	} else {
		for _, d := range report.DomainHealth {
			if !d.SPFValid || !d.DKIMValid || !d.DMARCValid {
				isDegraded = true
				recs = append(recs, fmt.Sprintf("WARNING: Domain '%s' has unconfigured DNS authentication records (SPF, DKIM, or DMARC).", d.Domain))
			}
		}
	}

	if isBlocked {
		report.OverallStatus = "blocked"
		report.CanSendOutbound = false
		report.Summary = "Outbound email delivery is BLOCKED. Outbound Port 25 or local MTA listener is unreachable."
	} else if isDegraded {
		report.OverallStatus = "degraded"
		report.CanSendOutbound = true
		report.Summary = "Outbound email can be transmitted, but deliverability is DEGRADED due to rDNS, blacklist, or DNS authentication issues."
	} else {
		report.OverallStatus = "ready"
		report.CanSendOutbound = true
		report.Summary = "All outbound egress pipes, Port 25 connectivity, reverse DNS, and MTA listeners are 100% operational."
		recs = append(recs, "All preflight deliverability checks passed. System is fully primed for high-reputation outbound delivery.")
	}

	report.ActionableRecommendations = recs
}

// RunCanaryProbe injects an instantaneous, non-spam deliverability probe to verify end-to-end spooling
func (s *Store) RunCanaryProbe(req models.CanaryProbeRequest) (*models.CanaryProbeResult, error) {
	recipient := strings.TrimSpace(req.Recipient)
	if recipient == "" || !strings.Contains(recipient, "@") {
		return nil, fmt.Errorf("valid recipient email address is required")
	}

	fromDomain := strings.TrimSpace(req.FromDomain)
	if fromDomain == "" {
		s.mu.RLock()
		for _, d := range s.domains {
			if fromDomain == "" {
				fromDomain = d.DomainName
			}
			if d.IsPrimary {
				fromDomain = d.DomainName
				break
			}
		}
		s.mu.RUnlock()
	}
	if fromDomain == "" {
		fromDomain = "mailops.local"
	}

	sender := fmt.Sprintf("canary-probe@%s", fromDomain)
	injectReq := models.InjectRequest{
		From:    sender,
		To:      recipient,
		Subject: fmt.Sprintf("Canary Deliverability Diagnostic Probe [%s]", time.Now().Format("15:04:05")),
		Text:    fmt.Sprintf("MailOps Deliverability Doctor Canary Probe sent at %s to verify TCP ESMTP egress and spool delivery.", time.Now().UTC().Format(time.RFC3339)),
		HTML:    fmt.Sprintf("<p><strong>MailOps Deliverability Doctor Canary Probe</strong></p><p>Dispatched at: <code>%s</code></p><p>Egress test from: <code>%s</code></p>", time.Now().UTC().Format(time.RFC3339), sender),
	}

	resp, err := s.InjectMessage(injectReq)
	if err != nil {
		return &models.CanaryProbeResult{
			Success:   false,
			Recipient: recipient,
			Response:  fmt.Sprintf("Injection failed: %v", err),
			SentAt:    time.Now().UTC(),
		}, nil
	}

	return &models.CanaryProbeResult{
		Success:   resp.Success,
		MessageID: resp.MessageID,
		Recipient: recipient,
		Queue:     resp.Queue,
		Response:  resp.Details,
		SentAt:    time.Now().UTC(),
	}, nil
}
