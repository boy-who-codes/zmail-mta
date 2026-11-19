package ipdetect

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"mailops.io/backend/internal/models"
)

type Provider struct {
	Name string
	URL  string
}

var DefaultProviders = []Provider{
	{Name: "ipify", URL: "https://api.ipify.org"},
	{Name: "ifconfig.me", URL: "https://ifconfig.me/ip"},
	{Name: "icanhazip", URL: "https://icanhazip.com"},
	{Name: "aws-checkip", URL: "https://checkip.amazonaws.com"},
}

type Detector struct {
	mu             sync.RWMutex
	providers      []Provider
	httpClient     *http.Client
	cachedInfo     *models.InfrastructureInfo
	cacheExpiresAt time.Time
	cacheTTL       time.Duration
}

func NewDetector(providers ...Provider) *Detector {
	if len(providers) == 0 {
		providers = DefaultProviders
	}
	return &Detector{
		providers: providers,
		httpClient: &http.Client{
			Timeout: 2500 * time.Millisecond,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 3 {
					return fmt.Errorf("stopped after 3 redirects")
				}
				// Prevent SSRF to internal network via redirects
				host := req.URL.Hostname()
				if ip := net.ParseIP(host); ip != nil && !IsPublicIP(ip) {
					return fmt.Errorf("redirect to private address blocked")
				}
				return nil
			},
		},
		cacheTTL: 15 * time.Minute,
	}
}

// IsPublicIP verifies whether an IP is a globally routable public address (rejecting private, loopback, CGNAT, etc.)
func IsPublicIP(ip net.IP) bool {
	if ip == nil {
		return false
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() || ip.IsUnspecified() {
		return false
	}

	// Additional Carrier Grade NAT (100.64.0.0/10) check for IPv4
	if v4 := ip.To4(); v4 != nil {
		if v4[0] == 100 && (v4[1]&0xc0 == 64) {
			return false
		}
		// Documentation blocks (RFC 5737)
		if v4[0] == 192 && v4[1] == 0 && v4[2] == 2 {
			return false
		}
		if v4[0] == 198 && (v4[1] == 51 && v4[2] == 100) {
			return false
		}
		if v4[0] == 203 && (v4[1] == 0 && v4[2] == 113) {
			return false
		}
	}
	return true
}

func (d *Detector) GetCached() *models.InfrastructureInfo {
	d.mu.RLock()
	defer d.mu.RUnlock()
	if d.cachedInfo != nil && time.Now().Before(d.cacheExpiresAt) {
		copyInfo := *d.cachedInfo
		return &copyInfo
	}
	return nil
}

// Detect gathers server infrastructure details according to strict priority order
func (d *Detector) Detect(ctx context.Context, configuredIPs []string, primaryDomain string, forceRefresh bool) (*models.InfrastructureInfo, error) {
	if !forceRefresh {
		if cached := d.GetCached(); cached != nil {
			return cached, nil
		}
	}

	hostname, _ := os.Hostname()
	isHexContainer := func(h string) bool {
		if len(h) != 12 && len(h) != 64 {
			return false
		}
		for _, c := range h {
			if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
				return false
			}
		}
		return true
	}

	sysHost := os.Getenv("SYSTEM_HOSTNAME")
	if sysHost != "" {
		hostname = sysHost
	} else if isHexContainer(hostname) {
		if primaryDomain != "" {
			hostname = fmt.Sprintf("mail.%s", primaryDomain)
		} else {
			hostname = "mailops-mta"
		}
	} else if hostname == "" {
		hostname = "mailops-mta"
	}

	localIP := getLocalInterfaceIP()
	smtpHostname := os.Getenv("SMTP_HOSTNAME")
	if smtpHostname == "" {
		if primaryDomain != "" {
			smtpHostname = fmt.Sprintf("mail.%s", primaryDomain)
		} else if !isHexContainer(hostname) {
			smtpHostname = hostname
		} else {
			smtpHostname = "mail.zekea.me"
		}
	}

	envName := os.Getenv("MAILOPS_ENV")
	if envName == "" {
		if _, err := os.Stat("/.dockerenv"); err == nil {
			envName = "docker_container"
		} else {
			envName = "bare_metal_or_vps"
		}
	}

	info := &models.InfrastructureInfo{
		LocalIP:         localIP,
		Hostname:        hostname,
		SMTPHostname:    smtpHostname,
		Environment:     envName,
		LastDetectedAt:  time.Now().UTC(),
		PTRGuidance:     "PTR records must be created through your VPS/hosting provider control panel (pointing your public IP to your SMTP hostname).",
	}

	// 1. PRIORITY 1: Explicit PUBLIC_IP environment variable
	if envPublicIP := strings.TrimSpace(os.Getenv("PUBLIC_IP")); envPublicIP != "" {
		parsed := net.ParseIP(envPublicIP)
		if parsed != nil && IsPublicIP(parsed) {
			info.PublicIP = envPublicIP
			info.DetectionSource = "environment_variable"
			info.DetectionStatus = "verified"
			info.IsExplicit = true
			if parsed.To4() != nil {
				info.IPVersion = "IPv4"
			} else {
				info.IPVersion = "IPv6"
			}
			d.finalizeDNS(info, primaryDomain)
			d.cacheResult(info)
			return info, nil
		}
	}

	// 2. PRIORITY 2: Configured Infrastructure Public IP
	for _, confIP := range configuredIPs {
		clean := strings.TrimSpace(confIP)
		parsed := net.ParseIP(clean)
		if parsed != nil && IsPublicIP(parsed) {
			info.PublicIP = clean
			info.DetectionSource = "configured_infrastructure"
			info.DetectionStatus = "verified"
			info.IsExplicit = true
			if parsed.To4() != nil {
				info.IPVersion = "IPv4"
			} else {
				info.IPVersion = "IPv6"
			}
			d.finalizeDNS(info, primaryDomain)
			d.cacheResult(info)
			return info, nil
		}
	}

	// 3. PRIORITY 3: Multi-Provider Discovery with Quorum Consensus
	discoveredIP, agreedProviders := d.queryProvidersConsensus(ctx)
	if discoveredIP != "" {
		parsed := net.ParseIP(discoveredIP)
		info.PublicIP = discoveredIP
		info.DetectionSource = "provider_consensus"
		info.DetectionStatus = "verified"
		info.ProviderAgreed = agreedProviders
		info.IsExplicit = false
		if parsed.To4() != nil {
			info.IPVersion = "IPv4"
		} else {
			info.IPVersion = "IPv6"
		}
		d.finalizeDNS(info, primaryDomain)
		d.cacheResult(info)
		return info, nil
	}

	// 4. PRIORITY 4: Validated Network Interface Fallback
	if localIP != "" {
		parsed := net.ParseIP(localIP)
		info.PublicIP = localIP
		info.DetectionSource = "interface_fallback"
		info.DetectionStatus = "fallback_private"
		info.IsExplicit = false
		if parsed != nil && parsed.To4() != nil {
			info.IPVersion = "IPv4"
		} else {
			info.IPVersion = "IPv6"
		}
	} else {
		info.PublicIP = "127.0.0.1"
		info.DetectionSource = "loopback_fallback"
		info.DetectionStatus = "degraded"
		info.IPVersion = "IPv4"
	}

	d.finalizeDNS(info, primaryDomain)
	d.cacheResult(info)
	return info, nil
}

func (d *Detector) queryProvidersConsensus(ctx context.Context) (string, []string) {
	type result struct {
		provider string
		ip       string
		err      error
	}

	results := make(chan result, len(d.providers))
	var wg sync.WaitGroup

	for _, p := range d.providers {
		wg.Add(1)
		go func(prov Provider) {
			defer wg.Done()
			reqCtx, cancel := context.WithTimeout(ctx, 2200*time.Millisecond)
			defer cancel()

			req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, prov.URL, nil)
			if err != nil {
				results <- result{provider: prov.Name, err: err}
				return
			}
			req.Header.Set("User-Agent", "MailOps-IPDetect/1.0")

			resp, err := d.httpClient.Do(req)
			if err != nil {
				results <- result{provider: prov.Name, err: err}
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				results <- result{provider: prov.Name, err: fmt.Errorf("status %d", resp.StatusCode)}
				return
			}

			body, err := io.ReadAll(io.LimitReader(resp.Body, 128))
			if err != nil {
				results <- result{provider: prov.Name, err: err}
				return
			}

			candidate := strings.TrimSpace(string(body))
			parsed := net.ParseIP(candidate)
			if parsed == nil || !IsPublicIP(parsed) {
				results <- result{provider: prov.Name, err: fmt.Errorf("invalid or non-public ip: %s", candidate)}
				return
			}

			results <- result{provider: prov.Name, ip: parsed.String()}
		}(p)
	}

	wg.Wait()
	close(results)

	// Count votes per valid public IP
	votes := make(map[string][]string)
	for r := range results {
		if r.err == nil && r.ip != "" {
			votes[r.ip] = append(votes[r.ip], r.provider)
		}
	}

	// Consensus selection: IP with >= 2 votes, or highest single valid vote if network degraded
	var bestIP string
	var bestProviders []string
	for ip, provs := range votes {
		if len(provs) >= 2 {
			return ip, provs
		}
		if len(provs) > len(bestProviders) {
			bestIP = ip
			bestProviders = provs
		}
	}

	if len(bestProviders) >= 1 {
		return bestIP, bestProviders
	}
	return "", nil
}

func (d *Detector) finalizeDNS(info *models.InfrastructureInfo, primaryDomain string) {
	if primaryDomain == "" {
		primaryDomain = "yourdomain.com"
	}

	info.SuggestedARecord = fmt.Sprintf("mail.%s -> %s", primaryDomain, info.PublicIP)
	if info.IPVersion == "IPv6" {
		info.SuggestedSPF = fmt.Sprintf("v=spf1 ip6:%s ~all", info.PublicIP)
	} else {
		info.SuggestedSPF = fmt.Sprintf("v=spf1 ip4:%s ~all", info.PublicIP)
	}
	info.SuggestedMX = fmt.Sprintf("10 mail.%s", primaryDomain)

	// Live PTR Check (Reverse DNS verification)
	if parsed := net.ParseIP(info.PublicIP); parsed != nil && IsPublicIP(parsed) {
		names, err := net.LookupAddr(info.PublicIP)
		if err == nil && len(names) > 0 {
			info.ReverseDNS = strings.TrimSuffix(names[0], ".")
			expectedHost := strings.ToLower(info.SMTPHostname)
			resolvedHost := strings.ToLower(info.ReverseDNS)
			if resolvedHost == expectedHost || strings.HasSuffix(resolvedHost, primaryDomain) {
				info.PTRStatus = "matched"
			} else {
				info.PTRStatus = "mismatched"
			}
		} else {
			info.PTRStatus = "unconfigured"
		}
	} else {
		info.PTRStatus = "unconfigured"
	}
}

func (d *Detector) cacheResult(info *models.InfrastructureInfo) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.cachedInfo = info
	d.cacheExpiresAt = time.Now().Add(d.cacheTTL)
}

func getLocalInterfaceIP() string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return ""
	}
	for _, i := range ifaces {
		if i.Flags&net.FlagLoopback != 0 || i.Flags&net.FlagUp == 0 {
			continue
		}
		addrs, err := i.Addrs()
		if err != nil {
			continue
		}
		for _, a := range addrs {
			var ip net.IP
			switch v := a.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip != nil && !ip.IsLoopback() && ip.To4() != nil {
				return ip.String()
			}
		}
	}
	return ""
}
