package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"mailops.io/backend/internal/dkim"
	"mailops.io/backend/internal/dns"
	"mailops.io/backend/internal/store"
)

// CloudflareCredentials holds resolved credentials for Cloudflare API
type CloudflareCredentials struct {
	APIToken string `json:"api_token,omitempty"`
	APIKey   string `json:"api_key,omitempty"`
	Email    string `json:"email,omitempty"`
	Source   string `json:"source,omitempty"`
}

// GetCloudflareCredentials resolves Cloudflare credentials from store, environment, or cred.txt
func GetCloudflareCredentials(s *store.Store) CloudflareCredentials {
	// 1. Check Store system settings
	if s != nil {
		tok, key, email := s.GetCloudflareConfig()
		if tok != "" || (key != "" && email != "") {
			authType := "token"
			if key != "" && email != "" {
				authType = "global_key"
			}
			return CloudflareCredentials{
				APIToken: tok,
				APIKey:   key,
				Email:    email,
				Source:   "system_store_" + authType,
			}
		}
	}

	// 2. Check Environment Variables
	envTok := strings.TrimSpace(os.Getenv("CLOUDFLARE_API_TOKEN"))
	envKey := strings.TrimSpace(os.Getenv("CLOUDFLARE_API_KEY"))
	envEmail := strings.TrimSpace(os.Getenv("CLOUDFLARE_EMAIL"))
	if envTok != "" || (envKey != "" && envEmail != "") {
		return CloudflareCredentials{
			APIToken: envTok,
			APIKey:   envKey,
			Email:    envEmail,
			Source:   "environment",
		}
	}

	// 3. Check cred.txt
	candidatePaths := []string{
		"cred.txt",
		"/app/cred.txt",
		"/app/data/cred.txt",
		"data/cred.txt",
		"../cred.txt",
		"../../cred.txt",
	}

	for _, path := range candidatePaths {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		lines := strings.Split(string(data), "\n")
		var cfTok, cfKey, cfEmail string
		for _, line := range lines {
			line = strings.TrimSpace(line)
			lower := strings.ToLower(line)
			if strings.HasPrefix(lower, "cloudflare_api_token=") || strings.HasPrefix(lower, "cloudflare token:") {
				parts := strings.SplitN(line, "=", 2)
				if len(parts) != 2 {
					parts = strings.SplitN(line, ":", 2)
				}
				if len(parts) == 2 {
					cfTok = strings.TrimSpace(parts[1])
				}
			} else if strings.HasPrefix(lower, "cloudflare_api_key=") || strings.HasPrefix(lower, "cloudflare api key:") {
				parts := strings.SplitN(line, "=", 2)
				if len(parts) != 2 {
					parts = strings.SplitN(line, ":", 2)
				}
				if len(parts) == 2 {
					cfKey = strings.TrimSpace(parts[1])
				}
			} else if strings.HasPrefix(lower, "cloudflare_email=") || strings.HasPrefix(lower, "cloudflare email:") {
				parts := strings.SplitN(line, "=", 2)
				if len(parts) != 2 {
					parts = strings.SplitN(line, ":", 2)
				}
				if len(parts) == 2 {
					cfEmail = strings.TrimSpace(parts[1])
				}
			}
		}
		if cfTok != "" || (cfKey != "" && cfEmail != "") {
			return CloudflareCredentials{
				APIToken: cfTok,
				APIKey:   cfKey,
				Email:    cfEmail,
				Source:   "cred.txt",
			}
		}
	}

	return CloudflareCredentials{}
}

func applyCFApiAuth(req *http.Request, creds CloudflareCredentials) {
	if creds.Email != "" && creds.APIKey != "" {
		req.Header.Set("X-Auth-Email", creds.Email)
		req.Header.Set("X-Auth-Key", creds.APIKey)
	} else if creds.APIToken != "" {
		req.Header.Set("Authorization", "Bearer "+creds.APIToken)
	} else if creds.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+creds.APIKey)
	}
	req.Header.Set("Content-Type", "application/json")
}

// handleCloudflareStatus checks if pre-configured Cloudflare credentials are ready for zero-key sync
func (s *Server) handleCloudflareStatus(w http.ResponseWriter, r *http.Request) {
	creds := GetCloudflareCredentials(s.store)
	configured := creds.APIToken != "" || (creds.APIKey != "" && creds.Email != "")

	authType := "none"
	if creds.APIToken != "" {
		authType = "api_token"
	} else if creds.APIKey != "" && creds.Email != "" {
		authType = "global_key"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"configured": configured,
		"auth_type":  authType,
		"email":      creds.Email,
		"source":     creds.Source,
	})
}

// handleCloudflareSaveCredentials saves credentials to store and updates cred.txt
func (s *Server) handleCloudflareSaveCredentials(w http.ResponseWriter, r *http.Request) {
	var body struct {
		APIToken string `json:"api_token"`
		APIKey   string `json:"api_key"`
		Email    string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error": "invalid payload"}`, http.StatusBadRequest)
		return
	}

	tok := strings.TrimSpace(body.APIToken)
	key := strings.TrimSpace(body.APIKey)
	email := strings.TrimSpace(body.Email)

	if tok == "" && (key == "" || email == "") {
		http.Error(w, `{"error": "either API Token or Email + Global API Key is required"}`, http.StatusBadRequest)
		return
	}

	s.store.SetCloudflareConfig(tok, key, email)

	// Persist to cred.txt if writable
	candidatePaths := []string{"cred.txt", "/app/cred.txt", "../cred.txt"}
	for _, p := range candidatePaths {
		if content, err := os.ReadFile(p); err == nil {
			str := string(content)
			if !strings.Contains(str, "Cloudflare API Token") && !strings.Contains(str, "CLOUDFLARE_") {
				var toAppend string
				if tok != "" {
					toAppend = fmt.Sprintf("\nCloudflare API Token: %s\n", tok)
				} else {
					toAppend = fmt.Sprintf("\nCloudflare Email: %s\nCloudflare API Key: %s\n", email, key)
				}
				_ = os.WriteFile(p, []byte(str+toAppend), 0600)
			}
			break
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Cloudflare credentials saved. Zero-key 1-click sync is now active.",
	})
}

type cfZoneResult struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type cfZoneResp struct {
	Success bool           `json:"success"`
	Errors  []cfAPIError   `json:"errors"`
	Result  []cfZoneResult `json:"result"`
}

type cfDNSRecordResult struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Name     string `json:"name"`
	Content  string `json:"content"`
	TTL      int    `json:"ttl"`
	Priority int    `json:"priority,omitempty"`
	Proxied  bool   `json:"proxied"`
}

type cfDNSRecordsResp struct {
	Success bool                `json:"success"`
	Errors  []cfAPIError        `json:"errors"`
	Result  []cfDNSRecordResult `json:"result"`
}

type cfAPIError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// handleCloudflareSync executes full DNS synchronization to Cloudflare
func (s *Server) handleCloudflareSync(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Domain    string `json:"domain"`
		APIToken  string `json:"api_token"`
		APIKey    string `json:"api_key"`
		Email     string `json:"email"`
		ZoneID    string `json:"zone_id"`
		IncludeMX bool   `json:"include_mx"`
		IncludeA  bool   `json:"include_a"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error": "invalid request payload"}`, http.StatusBadRequest)
		return
	}

	cleanDomain := strings.TrimSpace(strings.ToLower(body.Domain))
	cleanDomain = strings.TrimPrefix(cleanDomain, "http://")
	cleanDomain = strings.TrimPrefix(cleanDomain, "https://")
	cleanDomain = strings.Split(cleanDomain, "/")[0]

	if cleanDomain == "" {
		http.Error(w, `{"error": "target domain is required"}`, http.StatusBadRequest)
		return
	}

	// 1. Resolve Cloudflare Credentials (request payload > store/env/cred.txt)
	creds := CloudflareCredentials{
		APIToken: strings.TrimSpace(body.APIToken),
		APIKey:   strings.TrimSpace(body.APIKey),
		Email:    strings.TrimSpace(body.Email),
	}

	if creds.APIToken == "" && (creds.APIKey == "" || creds.Email == "") {
		saved := GetCloudflareCredentials(s.store)
		if saved.APIToken != "" || (saved.APIKey != "" && saved.Email != "") {
			creds = saved
		} else {
			http.Error(w, `{"error": "Cloudflare credentials not found. Enter an API token or configure Cloudflare once for zero-key sync."}`, http.StatusUnauthorized)
			return
		}
	}

	client := &http.Client{Timeout: 15 * time.Second}
	zoneID := strings.TrimSpace(body.ZoneID)

	// 2. Discover Zone ID if not explicitly specified
	if zoneID == "" {
		lookupDomain := cleanDomain
		for lookupDomain != "" {
			req, err := http.NewRequestWithContext(r.Context(), "GET", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones?name=%s", lookupDomain), nil)
			if err != nil {
				http.Error(w, `{"error": "failed to build cloudflare request"}`, http.StatusInternalServerError)
				return
			}
			applyCFApiAuth(req, creds)

			resp, err := client.Do(req)
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error": "Cloudflare connection error: %v"}`, err), http.StatusBadGateway)
				return
			}

			var zResp cfZoneResp
			_ = json.NewDecoder(resp.Body).Decode(&zResp)
			resp.Body.Close()

			if len(zResp.Errors) > 0 && !zResp.Success {
				errMsg := zResp.Errors[0].Message
				http.Error(w, fmt.Sprintf(`{"error": "Cloudflare authentication failed: %s"}`, errMsg), http.StatusUnauthorized)
				return
			}

			if zResp.Success && len(zResp.Result) > 0 {
				zoneID = zResp.Result[0].ID
				break
			}

			parts := strings.Split(lookupDomain, ".")
			if len(parts) > 2 {
				lookupDomain = strings.Join(parts[1:], ".")
			} else {
				break
			}
		}

		if zoneID == "" {
			http.Error(w, fmt.Sprintf(`{"error": "Cloudflare zone not found for %s. Verify domain is active in your Cloudflare account."}`, cleanDomain), http.StatusNotFound)
			return
		}
	}

	// 3. Ensure Domain exists in MailOS store with DKIM keypair
	dom, ok := s.store.GetDomain(cleanDomain)
	if !ok || dom == nil {
		var err error
		dom, err = s.store.AddDomainWithDNS(cleanDomain, "k202611", "")
		if err != nil {
			http.Error(w, `{"error": "failed to initialize domain in store"}`, http.StatusInternalServerError)
			return
		}
	}

	selector := dom.DKIMSelector
	if selector == "" {
		selector = "k202611"
	}
	if dom.DKIMPublicKey == "" {
		kp, err := dkim.GenerateRSAKeyPair(selector, cleanDomain)
		if err == nil && kp != nil {
			s.store.UpdateDomainDKIM(cleanDomain, selector, kp.PublicKeyTXT, kp.PrivateKeyPEM)
			dom.DKIMPublicKey = kp.PublicKeyTXT
		}
	}

	primaryIP := s.store.GetPrimarySendingIP()
	if primaryIP == "" {
		primaryIP = "127.0.0.1"
	}

	// 4. Fetch existing DNS records in Cloudflare Zone
	reqList, err := http.NewRequestWithContext(r.Context(), "GET", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records?per_page=100", zoneID), nil)
	if err != nil {
		http.Error(w, `{"error": "failed to query Cloudflare zone records"}`, http.StatusInternalServerError)
		return
	}
	applyCFApiAuth(reqList, creds)

	respList, err := client.Do(reqList)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "failed to fetch Cloudflare records: %v"}`, err), http.StatusBadGateway)
		return
	}

	var recResp cfDNSRecordsResp
	_ = json.NewDecoder(respList.Body).Decode(&recResp)
	respList.Body.Close()

	// Categorize existing records
	var existingSPFID string
	var existingSPFContent string
	var existingDKIMID string
	var existingDMARCID string
	var existingMXID string
	var existingAID string

	dkimSubdomain := strings.ToLower(fmt.Sprintf("%s._domainkey.%s", selector, cleanDomain))
	dmarcSubdomain := strings.ToLower(fmt.Sprintf("_dmarc.%s", cleanDomain))
	mailSubdomain := strings.ToLower(fmt.Sprintf("mail.%s", cleanDomain))

	for _, r := range recResp.Result {
		nameClean := strings.ToLower(strings.TrimSuffix(r.Name, "."))
		switch strings.ToUpper(r.Type) {
		case "TXT":
			if nameClean == cleanDomain && strings.HasPrefix(r.Content, "v=spf1") {
				existingSPFID = r.ID
				existingSPFContent = r.Content
			} else if nameClean == dkimSubdomain {
				existingDKIMID = r.ID
			} else if nameClean == dmarcSubdomain {
				existingDMARCID = r.ID
			}
		case "MX":
			if nameClean == cleanDomain && (strings.Contains(r.Content, "mail.") || r.Priority == 10) {
				existingMXID = r.ID
			}
		case "A":
			if nameClean == mailSubdomain {
				existingAID = r.ID
			}
		}
	}

	// 5. Construct Records to Synchronize
	type recordToSync struct {
		Type       string `json:"type"`
		Name       string `json:"name"`
		Content    string `json:"content"`
		TTL        int    `json:"ttl"`
		Priority   int    `json:"priority,omitempty"`
		Proxied    bool   `json:"proxied"`
		ExistingID string `json:"-"`
	}

	// DKIM Record
	dkimContent := dom.DKIMPublicKey
	if !strings.HasPrefix(dkimContent, "v=DKIM1") {
		dkimContent = fmt.Sprintf("v=DKIM1; k=rsa; p=%s", dkimContent)
	}

	// Smart SPF Record: Merge ip4 mechanism if existing SPF exists
	spfContent := dom.SPFRecord
	if spfContent == "" {
		spfContent = fmt.Sprintf("v=spf1 ip4:%s ~all", primaryIP)
	}
	if existingSPFContent != "" && !strings.Contains(existingSPFContent, primaryIP) {
		if strings.Contains(existingSPFContent, "~all") {
			spfContent = strings.Replace(existingSPFContent, "~all", fmt.Sprintf("ip4:%s ~all", primaryIP), 1)
		} else if strings.Contains(existingSPFContent, "-all") {
			spfContent = strings.Replace(existingSPFContent, "-all", fmt.Sprintf("ip4:%s -all", primaryIP), 1)
		} else {
			spfContent = fmt.Sprintf("%s ip4:%s", existingSPFContent, primaryIP)
		}
	}

	// DMARC Record
	dmarcContent := dom.DMARCRecord
	if dmarcContent == "" {
		dmarcContent = fmt.Sprintf("v=DMARC1; p=reject; pct=100; rua=mailto:dmarc-reports@%s", cleanDomain)
	}

	records := []recordToSync{
		{
			Type:       "TXT",
			Name:       fmt.Sprintf("%s._domainkey", selector),
			Content:    dkimContent,
			TTL:        3600,
			Proxied:    false,
			ExistingID: existingDKIMID,
		},
		{
			Type:       "TXT",
			Name:       "@",
			Content:    spfContent,
			TTL:        3600,
			Proxied:    false,
			ExistingID: existingSPFID,
		},
		{
			Type:       "TXT",
			Name:       "_dmarc",
			Content:    dmarcContent,
			TTL:        3600,
			Proxied:    false,
			ExistingID: existingDMARCID,
		},
		{
			Type:       "A",
			Name:       "mail",
			Content:    primaryIP,
			TTL:        3600,
			Proxied:    false,
			ExistingID: existingAID,
		},
	}

	if body.IncludeMX {
		records = append(records, recordToSync{
			Type:       "MX",
			Name:       "@",
			Content:    fmt.Sprintf("mail.%s", cleanDomain),
			Priority:   10,
			TTL:        3600,
			Proxied:    false,
			ExistingID: existingMXID,
		})
	}

	// 6. Push / Update records in Cloudflare Zone
	createdCount := 0
	updatedCount := 0
	var syncErrors []string

	for _, rec := range records {
		recPayload := map[string]interface{}{
			"type":    rec.Type,
			"name":    rec.Name,
			"content": rec.Content,
			"ttl":     rec.TTL,
			"proxied": rec.Proxied,
		}
		if rec.Priority > 0 {
			recPayload["priority"] = rec.Priority
		}

		recBytes, _ := json.Marshal(recPayload)
		var cfReq *http.Request
		if rec.ExistingID != "" {
			cfReq, _ = http.NewRequestWithContext(r.Context(), "PUT", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records/%s", zoneID, rec.ExistingID), bytes.NewReader(recBytes))
		} else {
			cfReq, _ = http.NewRequestWithContext(r.Context(), "POST", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records", zoneID), bytes.NewReader(recBytes))
		}

		applyCFApiAuth(cfReq, creds)
		cfResp, err := client.Do(cfReq)
		if err != nil {
			syncErrors = append(syncErrors, fmt.Sprintf("%s %s: %v", rec.Type, rec.Name, err))
			continue
		}

		var resultBody struct {
			Success bool `json:"success"`
			Errors  []struct {
				Message string `json:"message"`
			} `json:"errors"`
		}
		_ = json.NewDecoder(cfResp.Body).Decode(&resultBody)
		cfResp.Body.Close()

		if resultBody.Success {
			if rec.ExistingID != "" {
				updatedCount++
			} else {
				createdCount++
			}
		} else if len(resultBody.Errors) > 0 {
			// Ignore benign duplicates if already identical
			if strings.Contains(strings.ToLower(resultBody.Errors[0].Message), "already exists") {
				updatedCount++
			} else {
				syncErrors = append(syncErrors, fmt.Sprintf("%s %s: %s", rec.Type, rec.Name, resultBody.Errors[0].Message))
			}
		}
	}

	// 7. Trigger Live Verification Check
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()
		time.Sleep(1 * time.Second)
		res, _ := dns.CheckDomain(ctx, cleanDomain, selector, primaryIP)
		if res != nil {
			spf := "invalid"
			if res.SPFValid {
				spf = "valid"
			}
			dkim := "invalid"
			if res.DKIMValid {
				dkim = "valid"
			}
			dmarc := "invalid"
			if res.DMARCValid {
				dmarc = "valid"
			}
			ptr := "invalid"
			if res.PTRValid {
				ptr = "valid"
			}
			s.store.UpdateDomainStatus(cleanDomain, spf, dkim, dmarc, ptr)
		}
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":         len(syncErrors) == 0,
		"zone_id":         zoneID,
		"records_created": createdCount,
		"records_updated": updatedCount,
		"errors":          syncErrors,
		"message":         fmt.Sprintf("Synchronized to Cloudflare (%d created, %d updated)", createdCount, updatedCount),
	})
}
