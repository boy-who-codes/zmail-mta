package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"mailops.io/backend/internal/dkim"
	"mailops.io/backend/internal/dns"
	"mailops.io/backend/internal/ingest"
	"mailops.io/backend/internal/kumo"
	"mailops.io/backend/internal/models"
	"mailops.io/backend/internal/store"
	"mailops.io/backend/internal/webhook"
)

type Server struct {
	store      *store.Store
	workerPool *ingest.WorkerPool
	streamer   *webhook.Streamer
	mux        *http.ServeMux
}

func NewServer(s *store.Store, wp *ingest.WorkerPool, st *webhook.Streamer) *Server {
	srv := &Server{
		store:      s,
		workerPool: wp,
		streamer:   st,
		mux:        http.NewServeMux(),
	}
	srv.registerRoutes()
	return srv
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// CORS Middleware
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	s.mux.ServeHTTP(w, r)
}

func (s *Server) registerRoutes() {
	s.mux.HandleFunc("GET /health", s.handleHealth)
	s.mux.HandleFunc("GET /api/v1/system/status", s.handleSystemStatus)
	s.mux.HandleFunc("GET /api/v1/nodes", s.handleGetNodes)
	s.mux.HandleFunc("GET /api/v1/domains", s.handleGetDomains)
	s.mux.HandleFunc("POST /api/v1/domains", s.handleAddDomain)
	s.mux.HandleFunc("DELETE /api/v1/domains", s.handleDeleteDomain)
	s.mux.HandleFunc("POST /api/v1/domains/primary", s.handleSetPrimaryDomain)
	s.mux.HandleFunc("POST /api/v1/domains/verify", s.handleVerifyDomain)
	s.mux.HandleFunc("POST /api/v1/domains/cloudflare/sync", s.handleCloudflareSync)
	s.mux.HandleFunc("POST /api/v1/dkim/generate", s.handleGenerateDKIM)
	s.mux.HandleFunc("GET /api/v1/infra/detection", s.handleGetInfrastructureDetection)
	s.mux.HandleFunc("POST /api/v1/infra/detect-now", s.handleForceInfrastructureDetection)
	s.mux.HandleFunc("GET /api/v1/ippools", s.handleGetIPPools)
	s.mux.HandleFunc("POST /api/v1/ippools", s.handleAddIPPool)
	s.mux.HandleFunc("PUT /api/v1/ippools", s.handleUpdateIPPool)
	s.mux.HandleFunc("DELETE /api/v1/ippools", s.handleDeleteIPPool)
	s.mux.HandleFunc("GET /api/v1/ips", s.handleGetSendingIPs)
	s.mux.HandleFunc("GET /api/v1/ips/sync-status", s.handleGetIPSyncStatus)
	s.mux.HandleFunc("POST /api/v1/ips/sync-now", s.handleForceIPSync)
	s.mux.HandleFunc("GET /api/v1/ips/telemetry", s.handleGetIPTelemetry)
	s.mux.HandleFunc("POST /api/v1/ips", s.handleAddSendingIP)
	s.mux.HandleFunc("PUT /api/v1/ips", s.handleUpdateSendingIP)
	s.mux.HandleFunc("DELETE /api/v1/ips", s.handleDeleteSendingIP)
	s.mux.HandleFunc("GET /api/v1/shaping", s.handleGetRateLimits)
	s.mux.HandleFunc("POST /api/v1/shaping", s.handleSaveRateLimit)
	s.mux.HandleFunc("DELETE /api/v1/shaping", s.handleDeleteRateLimit)
	s.mux.HandleFunc("GET /api/v1/queues", s.handleGetQueues)
	s.mux.HandleFunc("POST /api/v1/queues/action", s.handleQueueAction)
	s.mux.HandleFunc("POST /api/v1/inject", s.handleInjectMessage)
	s.mux.HandleFunc("GET /api/v1/messages", s.handleGetMessages)
	s.mux.HandleFunc("DELETE /api/v1/messages", s.handleDeleteMessages)
	s.mux.HandleFunc("GET /api/v1/analytics", s.handleGetAnalytics)
	s.mux.HandleFunc("GET /api/v1/kumo/policy.lua", s.handleGetLuaPolicy)
	s.mux.HandleFunc("POST /api/v1/inbound", s.handleInboundMessage)
	s.mux.HandleFunc("POST /api/v1/messages/open", s.handleMarkMessageOpened)
	s.mux.HandleFunc("GET /api/v1/smtp/info", s.handleGetSMTPInfo)
	s.mux.HandleFunc("GET /api/v1/smtp/whitelist", s.handleGetRelayWhitelist)
	s.mux.HandleFunc("POST /api/v1/smtp/whitelist", s.handleAddRelayWhitelist)
	s.mux.HandleFunc("DELETE /api/v1/smtp/whitelist", s.handleDeleteRelayWhitelist)
	s.mux.HandleFunc("GET /api/v1/smtp/connections", s.handleGetIncomingConnections)
	s.mux.HandleFunc("GET /api/v1/suppressions", s.handleGetSuppressions)
	s.mux.HandleFunc("POST /api/v1/suppressions", s.handleAddSuppression)
	s.mux.HandleFunc("DELETE /api/v1/suppressions", s.handleDeleteSuppression)
	s.mux.HandleFunc("GET /api/v1/suppressions/stats", s.handleGetSuppressionStats)
	s.mux.HandleFunc("POST /api/v1/suppressions/check", s.handleCheckSuppression)
	s.mux.HandleFunc("GET /api/v1/bounces", s.handleGetBounces)
	s.mux.HandleFunc("POST /api/v1/bounces", s.handleRecordBounce)

	// Warmup Scheduler Endpoints (Phase 4)
	s.mux.HandleFunc("GET /api/v1/warmup/plans", s.handleGetWarmupPlans)
	s.mux.HandleFunc("GET /api/v1/warmup/schedules", s.handleGetWarmupSchedules)
	s.mux.HandleFunc("POST /api/v1/warmup/start", s.handleStartWarmup)
	s.mux.HandleFunc("POST /api/v1/warmup/pause", s.handlePauseWarmup)
	s.mux.HandleFunc("POST /api/v1/warmup/resume", s.handleResumeWarmup)
	s.mux.HandleFunc("POST /api/v1/warmup/advance", s.handleAdvanceWarmup)
	s.mux.HandleFunc("DELETE /api/v1/warmup", s.handleDeleteWarmup)
	s.mux.HandleFunc("GET /api/v1/warmup/stats", s.handleGetWarmupStats)

	// Campaign Operations Endpoints
	s.mux.HandleFunc("GET /api/v1/campaigns", s.handleGetCampaigns)
	s.mux.HandleFunc("POST /api/v1/campaigns", s.handleAddCampaign)
	s.mux.HandleFunc("PUT /api/v1/campaigns", s.handleUpdateCampaign)
	s.mux.HandleFunc("DELETE /api/v1/campaigns", s.handleDeleteCampaign)
	s.mux.HandleFunc("POST /api/v1/campaigns/dispatch", s.handleDispatchCampaign)

	// Mailbox & Mailbox Rotation Endpoints (Phase 3)
	s.mux.HandleFunc("GET /api/v1/mailboxes", s.handleGetMailboxes)
	s.mux.HandleFunc("POST /api/v1/mailboxes", s.handleAddMailbox)
	s.mux.HandleFunc("PUT /api/v1/mailboxes", s.handleUpdateMailbox)
	s.mux.HandleFunc("DELETE /api/v1/mailboxes", s.handleDeleteMailbox)

	s.mux.HandleFunc("GET /api/v1/mailbox-pools", s.handleGetMailboxPools)
	s.mux.HandleFunc("POST /api/v1/mailbox-pools", s.handleAddMailboxPool)
	s.mux.HandleFunc("PUT /api/v1/mailbox-pools", s.handleUpdateMailboxPool)
	s.mux.HandleFunc("DELETE /api/v1/mailbox-pools", s.handleDeleteMailboxPool)
	s.mux.HandleFunc("POST /api/v1/mailbox-pools/simulate", s.handleSimulateMailboxRotation)

	// Automation Sequence Playbooks
	s.mux.HandleFunc("GET /api/v1/playbooks", s.handleGetPlaybooks)

	// Cluster System Settings & Policies
	s.mux.HandleFunc("GET /api/v1/settings/system", s.handleGetSystemSettings)
	s.mux.HandleFunc("PUT /api/v1/settings/system", s.handleUpdateSystemSettings)

	// SMTP Authentication & Credentials for Outlook / ESMTP Relay
	s.mux.HandleFunc("GET /api/v1/smtp/credentials", s.handleGetSMTPCredentials)
	s.mux.HandleFunc("POST /api/v1/smtp/credentials", s.handleAddSMTPCredential)
	s.mux.HandleFunc("DELETE /api/v1/smtp/credentials", s.handleDeleteSMTPCredential)
	s.mux.HandleFunc("POST /api/v1/smtp/credentials/toggle", s.handleToggleSMTPCredential)
	s.mux.HandleFunc("POST /api/v1/smtp/auth", s.handleAuthenticateSMTP)
	s.mux.HandleFunc("POST /api/v1/smtp/test-connection", s.handleTestSMTPConnection)

	// Autonomous Warmup Scheduler Daemon Endpoints
	s.mux.HandleFunc("GET /api/v1/warmup/summary", s.handleGetWarmupSummary)
	s.mux.HandleFunc("POST /api/v1/warmup/tick", s.handleTickWarmupSchedule)

	// AI Conversational Peer Warmup Network Endpoints
	s.mux.HandleFunc("GET /api/v1/warmup/ai-network/stats", s.handleGetAIWarmupStats)
	s.mux.HandleFunc("GET /api/v1/warmup/ai-network/threads", s.handleGetAIWarmupThreads)
	s.mux.HandleFunc("GET /api/v1/warmup/ai-network/settings", s.handleGetAIWarmupSettings)
	s.mux.HandleFunc("PUT /api/v1/warmup/ai-network/settings", s.handleUpdateAIWarmupSettings)
	s.mux.HandleFunc("POST /api/v1/warmup/ai-network/trigger-round", s.handleTriggerAIWarmupRound)

	// Multi-Step Drip Sequence & Auto-Stop Cadence Endpoints
	s.mux.HandleFunc("GET /api/v1/sequences/leads", s.handleGetSequenceLeads)
	s.mux.HandleFunc("GET /api/v1/sequences/stats", s.handleGetSequenceStats)
	s.mux.HandleFunc("POST /api/v1/sequences/enroll-leads", s.handleEnrollSequenceLeads)
	s.mux.HandleFunc("POST /api/v1/sequences/record-reply", s.handleRecordSequenceReply)
	s.mux.HandleFunc("POST /api/v1/sequences/tick", s.handleTickSequenceCadence)

	// 1-Click Cloudflare DNS Provisioning Endpoint
	s.mux.HandleFunc("POST /api/v1/dns/cloudflare/sync", s.handleCloudflareSync)

	// Real-Time DNS Blacklist (RBL) Watchdog Endpoints
	s.mux.HandleFunc("GET /api/v1/dns/rbl/check", s.handleCheckRBLTarget)
	s.mux.HandleFunc("GET /api/v1/dns/rbl/summary", s.handleGetRBLSummary)

	// Audience & Contacts Directory Endpoints
	s.mux.HandleFunc("GET /api/v1/contacts", s.handleGetContacts)
	s.mux.HandleFunc("POST /api/v1/contacts", s.handleAddContact)
	s.mux.HandleFunc("PUT /api/v1/contacts", s.handleUpdateContact)
	s.mux.HandleFunc("DELETE /api/v1/contacts", s.handleDeleteContact)

	// Real-Time Lead Hygiene & Syntax/MX Verifier Endpoints
	s.mux.HandleFunc("POST /api/v1/verifier/single", s.handleVerifySingleEmail)
	s.mux.HandleFunc("POST /api/v1/verifier/bulk", s.handleVerifyBulkEmails)
	s.mux.HandleFunc("POST /api/v1/verifier/import-clean", s.handleImportCleanLeads)

	// Pre-Flight Seed Placement Simulator Endpoint
	s.mux.HandleFunc("POST /api/v1/seed/preflight", s.handleSeedPreflightTest)

	// Inbound MX & RFC 5965 ARF Processor Endpoints (Phase 5)
	s.mux.HandleFunc("GET /api/v1/inbound/messages", s.handleGetInboundMessages)
	s.mux.HandleFunc("GET /api/v1/inbound/messages/detail", s.handleGetInboundMessageDetail)
	s.mux.HandleFunc("DELETE /api/v1/inbound/messages", s.handleDeleteInboundMessages)
	s.mux.HandleFunc("POST /api/v1/inbound/simulate-arf", s.handleSimulateARF)
	s.mux.HandleFunc("GET /api/v1/inbound/routes", s.handleGetInboundRoutes)
	s.mux.HandleFunc("POST /api/v1/inbound/routes", s.handleAddInboundRoute)
	s.mux.HandleFunc("PUT /api/v1/inbound/routes", s.handleUpdateInboundRoute)
	s.mux.HandleFunc("DELETE /api/v1/inbound/routes", s.handleDeleteInboundRoute)
	s.mux.HandleFunc("GET /api/v1/inbound/stats", s.handleGetInboundStats)

	// Sub-account & Multi-Tenant RBAC Endpoints (Phase 6)
	s.mux.HandleFunc("GET /api/v1/subaccounts", s.handleGetSubaccounts)
	s.mux.HandleFunc("GET /api/v1/subaccounts/detail", s.handleGetSubaccountDetail)
	s.mux.HandleFunc("POST /api/v1/subaccounts", s.handleAddSubaccount)
	s.mux.HandleFunc("PUT /api/v1/subaccounts", s.handleUpdateSubaccount)
	s.mux.HandleFunc("DELETE /api/v1/subaccounts", s.handleDeleteSubaccount)
	s.mux.HandleFunc("GET /api/v1/subaccounts/stats", s.handleGetSubaccountStats)
	s.mux.HandleFunc("GET /api/v1/apikeys", s.handleGetAPIKeys)
	s.mux.HandleFunc("POST /api/v1/apikeys", s.handleAddAPIKey)
	s.mux.HandleFunc("POST /api/v1/apikeys/revoke", s.handleRevokeAPIKey)
	s.mux.HandleFunc("DELETE /api/v1/apikeys", s.handleDeleteAPIKey)

	// Redis Stream High-Velocity Ingestion Bus (Scale to 10M+ emails/day)
	s.mux.HandleFunc("POST /api/v1/ingest/bulk", s.handleBulkIngest)
	s.mux.HandleFunc("GET /api/v1/ingest/stats", s.handleGetIngestStats)

	// Event Webhook Streaming (Phase 7)
	s.mux.HandleFunc("GET /api/v1/webhooks/subscriptions", s.handleGetWebhookSubscriptions)
	s.mux.HandleFunc("POST /api/v1/webhooks/subscriptions", s.handleAddWebhookSubscription)
	s.mux.HandleFunc("PUT /api/v1/webhooks/subscriptions", s.handleUpdateWebhookSubscription)
	s.mux.HandleFunc("DELETE /api/v1/webhooks/subscriptions", s.handleDeleteWebhookSubscription)
	s.mux.HandleFunc("POST /api/v1/webhooks/test-event", s.handleTestWebhookEvent)
	s.mux.HandleFunc("GET /api/v1/webhooks/stats", s.handleGetWebhookStats)
	s.mux.HandleFunc("GET /api/v1/webhooks/logs", s.handleGetWebhookLogs)

	// Templates & Dynamic Handlebars/Liquid Merging
	s.mux.HandleFunc("GET /api/v1/templates", s.handleGetTemplates)
	s.mux.HandleFunc("GET /api/v1/templates/detail", s.handleGetTemplateDetail)
	s.mux.HandleFunc("POST /api/v1/templates", s.handleAddTemplate)
	s.mux.HandleFunc("PUT /api/v1/templates", s.handleUpdateTemplate)
	s.mux.HandleFunc("DELETE /api/v1/templates", s.handleDeleteTemplate)
	s.mux.HandleFunc("POST /api/v1/templates/render", s.handleRenderTemplate)

	// Deliverability Health Radar
	s.mux.HandleFunc("GET /api/v1/deliverability/health", s.handleGetDeliverabilityHealth)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "ok",
		"service": "MAILOPS Control Plane",
		"time":    time.Now().UTC(),
	})
}

func (s *Server) handleSystemStatus(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetSystemStatus())
}

func (s *Server) handleGetNodes(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetNodes())
}

func (s *Server) handleGetDomains(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetDomains())
}

func (s *Server) handleAddDomain(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Domain string `json:"domain"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Domain) == "" {
		http.Error(w, `{"error": "invalid domain name"}`, http.StatusBadRequest)
		return
	}

	cleanDomain := strings.TrimSpace(strings.ToLower(body.Domain))
	cleanDomain = strings.TrimPrefix(cleanDomain, "http://")
	cleanDomain = strings.TrimPrefix(cleanDomain, "https://")
	cleanDomain = strings.Split(cleanDomain, "/")[0]

	// 1. Auto-generate 2048-bit DKIM keypair
	selector := "k202611"
	pubKey := ""
	keypair, err := dkim.GenerateRSAKeyPair(selector, cleanDomain)
	if err == nil && keypair != nil {
		pubKey = keypair.PublicKeyTXT
	}

	// 2. Add domain with generated DKIM, SPF, DMARC, MX
	dom, err := s.store.AddDomainWithDNS(cleanDomain, selector, pubKey)
	if err != nil {
		http.Error(w, `{"error": "failed to add domain"}`, http.StatusInternalServerError)
		return
	}

	// 3. Immediately run live authoritative DNS verification
	ctx, cancel := context.WithTimeout(r.Context(), 4*time.Second)
	defer cancel()
	primaryIP := s.store.GetPrimarySendingIP()
	res, _ := dns.CheckDomain(ctx, cleanDomain, selector, primaryIP)
	if res != nil {
		spfStatus := "invalid"
		if res.SPFValid {
			spfStatus = "valid"
		}
		dkimStatus := "invalid"
		if res.DKIMValid {
			dkimStatus = "valid"
		}
		dmarcStatus := "invalid"
		if res.DMARCValid {
			dmarcStatus = "valid"
		}
		ptrStatus := "invalid"
		if res.PTRValid {
			ptrStatus = "valid"
		}
		s.store.UpdateDomainStatus(cleanDomain, spfStatus, dkimStatus, dmarcStatus, ptrStatus)
		dom.SPFStatus = spfStatus
		dom.DKIMStatus = dkimStatus
		dom.DMARCStatus = dmarcStatus
		dom.PTRStatus = ptrStatus
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(dom)
}

func (s *Server) handleVerifyDomain(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Domain   string `json:"domain"`
		Selector string `json:"selector"`
		IP       string `json:"ip"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Domain == "" {
		http.Error(w, `{"error": "domain is required"}`, http.StatusBadRequest)
		return
	}

	if body.Selector == "" {
		body.Selector = "k202611"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := dns.CheckDomain(ctx, body.Domain, body.Selector, body.IP)
	if err != nil {
		http.Error(w, `{"error": "verification lookup failed"}`, http.StatusInternalServerError)
		return
	}

	spfStatus := "invalid"
	if res.SPFValid {
		spfStatus = "valid"
	}
	dkimStatus := "invalid"
	if res.DKIMValid {
		dkimStatus = "valid"
	}
	dmarcStatus := "invalid"
	if res.DMARCValid {
		dmarcStatus = "valid"
	}
	ptrStatus := "invalid"
	if res.PTRValid {
		ptrStatus = "valid"
	}

	s.store.UpdateDomainStatus(body.Domain, spfStatus, dkimStatus, dmarcStatus, ptrStatus)

	json.NewEncoder(w).Encode(res)
}

func (s *Server) handleGenerateDKIM(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Domain   string `json:"domain"`
		Selector string `json:"selector"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Domain == "" {
		http.Error(w, `{"error": "domain is required"}`, http.StatusBadRequest)
		return
	}
	if body.Selector == "" {
		body.Selector = "k202611"
	}

	keypair, err := dkim.GenerateRSAKeyPair(body.Selector, body.Domain)
	if err != nil {
		http.Error(w, `{"error": "failed to generate DKIM key"}`, http.StatusInternalServerError)
		return
	}
	s.store.UpdateDomainDKIM(body.Domain, body.Selector, keypair.PublicKeyTXT)
	json.NewEncoder(w).Encode(keypair)
}

func (s *Server) handleGetIPPools(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetIPPools())
}

func (s *Server) handleAddIPPool(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string   `json:"name"`
		Type string   `json:"type"`
		IPs  []string `json:"ips"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		http.Error(w, `{"error": "pool name is required"}`, http.StatusBadRequest)
		return
	}
	pool := s.store.AddIPPool(body.Name, body.Type, body.IPs)
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(pool)
}

func (s *Server) handleGetSendingIPs(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetSendingIPs())
}

func (s *Server) handleGetIPSyncStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s.store.GetIPSyncStatus())
}

func (s *Server) handleForceIPSync(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	status, err := s.store.ForceSyncSourcesToml()
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(status)
		return
	}
	json.NewEncoder(w).Encode(status)
}

func (s *Server) handleGetIPTelemetry(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	telemetry := s.store.GetIPTelemetry()
	json.NewEncoder(w).Encode(telemetry)
}

func (s *Server) handleGetQueues(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetQueues())
}

func (s *Server) handleInjectMessage(w http.ResponseWriter, r *http.Request) {
	var req models.InjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.To == "" || req.From == "" {
		http.Error(w, `{"error": "recipient (to) and sender (from) are required"}`, http.StatusBadRequest)
		return
	}

	clientIP := r.RemoteAddr
	if fIP := r.Header.Get("X-Forwarded-For"); fIP != "" {
		clientIP = strings.Split(fIP, ",")[0]
	}
	clientIP = strings.TrimSpace(strings.Split(clientIP, ":")[0])
	authUser := "app-client"

	// Multi-tenant API Key & RBAC authentication (Phase 6)
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		authHeader = r.Header.Get("X-API-Key")
	}
	if authHeader != "" {
		apiKey, subaccount, err := s.store.ValidateAPIKey(authHeader, "mail:send")
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q, "auth_error": true}`, err.Error()), http.StatusUnauthorized)
			return
		}
		authUser = apiKey.Name
		if subaccount != nil {
			// Enforce subaccount domain restriction if defined
			if len(subaccount.AllowedDomains) > 0 {
				senderDomain := ""
				if parts := strings.Split(req.From, "@"); len(parts) == 2 {
					senderDomain = strings.ToLower(parts[1])
				}
				domainAllowed := false
				for _, ad := range subaccount.AllowedDomains {
					if strings.EqualFold(ad, senderDomain) {
						domainAllowed = true
						break
					}
				}
				if !domainAllowed {
					http.Error(w, fmt.Sprintf(`{"error": "sender domain %q is not authorized for sub-account %q"}`, senderDomain, subaccount.Name), http.StatusForbidden)
					return
				}
			}

			// Enforce subaccount quota
			if err := s.store.RecordSubaccountSend(subaccount.ID); err != nil {
				http.Error(w, fmt.Sprintf(`{"error": %q, "quota_exceeded": true}`, err.Error()), http.StatusTooManyRequests)
				return
			}

			// Route to tenant's dedicated IP pool if specified
			if subaccount.DedicatedPool != "" && subaccount.DedicatedPool != "default" && req.Pool == "" {
				req.Pool = subaccount.DedicatedPool
			}
		}
	}

	s.store.RecordIncomingConnection(models.IncomingConnectionLog{
		SourceIP:  clientIP,
		Hostname:  r.Host,
		Port:      8080,
		Protocol:  "HTTP_REST",
		AuthUser:  authUser,
		Status:    "accepted",
		Timestamp: time.Now().UTC(),
		MsgCount:  1,
	})

	// Pre-send suppression circuit breaker (Enterprise-grade IP protection)
	if s.store.IsSuppressed(req.To, req.Pool) {
		http.Error(w, `{"error": "recipient address is suppressed due to previous hard bounce or spam complaint", "suppressed": true}`, http.StatusForbidden)
		return
	}

	// Warmup Quota & Multi-Speed Throttle Check (Phase 4)
	recipientDomain := ""
	if parts := strings.Split(req.To, "@"); len(parts) == 2 {
		recipientDomain = parts[1]
	}
	targetPool := req.Pool
	if targetPool == "" {
		targetPool = "default"
	}
	allowed, overflowAction, overflowPool, warmupReason := s.store.CheckWarmupAllowance(targetPool, recipientDomain)
	if !allowed {
		if overflowAction == "route_overflow_pool" && overflowPool != "" {
			req.Pool = overflowPool
		} else if overflowAction == "hard_reject" {
			http.Error(w, fmt.Sprintf(`{"error": "warmup quota exceeded: %s", "warmup_blocked": true}`, warmupReason), http.StatusTooManyRequests)
			return
		}
	}

	resp, err := s.store.InjectMessage(req)
	if err != nil {
		http.Error(w, `{"error": "message injection failed"}`, http.StatusInternalServerError)
		return
	}

	// Record warmup volume sent
	s.store.RecordWarmupSent(targetPool, recipientDomain)
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(resp)
}

func (s *Server) handleGetMessages(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetMessages())
}

func (s *Server) handleGetAnalytics(w http.ResponseWriter, r *http.Request) {
	rangeParam := r.URL.Query().Get("range")
	startParam := r.URL.Query().Get("start")
	endParam := r.URL.Query().Get("end")
	json.NewEncoder(w).Encode(s.store.GetAnalytics(rangeParam, startParam, endParam))
}

func (s *Server) handleMarkMessageOpened(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		var body struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id = body.ID
	}
	if id == "" {
		http.Error(w, `{"error": "message id is required"}`, http.StatusBadRequest)
		return
	}
	_ = s.store.MarkMessageOpened(id)
	s.streamer.DispatchEvent(models.EventWebhookPayload{
		EventType: "opened",
		MessageID: id,
		Timestamp: time.Now().UTC(),
	})
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"ok": true, "opened": true})
}

func (s *Server) handleGetLuaPolicy(w http.ResponseWriter, r *http.Request) {
	pools := s.store.GetIPPools()
	ips := s.store.GetSendingIPs()
	domains := s.store.GetDomains()

	policyLua := kumo.GenerateLuaPolicy(pools, ips, domains)

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Write([]byte(policyLua))
}

func (s *Server) handleDeleteDomain(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID     string `json:"id"`
		Domain string `json:"domain"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	target := body.ID
	if target == "" {
		target = body.Domain
	}
	if target == "" {
		target = r.URL.Query().Get("id")
	}
	if target == "" {
		target = r.URL.Query().Get("domain")
	}
	if err := s.store.DeleteDomain(target); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleSetPrimaryDomain(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Domain string `json:"domain"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if err := s.store.SetPrimaryDomain(body.Domain); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleUpdateIPPool(w http.ResponseWriter, r *http.Request) {
	var pool models.IPPool
	if err := json.NewDecoder(r.Body).Decode(&pool); err != nil || pool.ID == "" {
		http.Error(w, `{"error": "valid ip pool with id is required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.UpdateIPPool(pool); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(pool)
}

func (s *Server) handleDeleteIPPool(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID string `json:"id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	id := body.ID
	if id == "" {
		id = r.URL.Query().Get("id")
	}
	if err := s.store.DeleteIPPool(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleAddSendingIP(w http.ResponseWriter, r *http.Request) {
	var ip models.SendingIP
	if err := json.NewDecoder(r.Body).Decode(&ip); err != nil || ip.IP == "" {
		http.Error(w, `{"error": "ip is required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.AddSendingIP(ip); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ip)
}

func (s *Server) handleUpdateSendingIP(w http.ResponseWriter, r *http.Request) {
	var ip models.SendingIP
	if err := json.NewDecoder(r.Body).Decode(&ip); err != nil || ip.IP == "" {
		http.Error(w, `{"error": "valid ip is required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.UpdateSendingIP(ip); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(ip)
}

func (s *Server) handleDeleteSendingIP(w http.ResponseWriter, r *http.Request) {
	var body struct {
		IP string `json:"ip"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	ip := body.IP
	if ip == "" {
		ip = r.URL.Query().Get("ip")
	}
	if err := s.store.DeleteSendingIP(ip); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleGetRateLimits(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetRateLimits())
}

func (s *Server) handleSaveRateLimit(w http.ResponseWriter, r *http.Request) {
	var rule models.RateLimit
	if err := json.NewDecoder(r.Body).Decode(&rule); err != nil || rule.Domain == "" {
		http.Error(w, `{"error": "domain is required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.SaveRateLimit(rule); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(rule)
}

func (s *Server) handleDeleteRateLimit(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Domain string `json:"domain"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	domain := body.Domain
	if domain == "" {
		domain = r.URL.Query().Get("domain")
	}
	if err := s.store.DeleteRateLimit(domain); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleQueueAction(w http.ResponseWriter, r *http.Request) {
	var req models.QueueActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Queue == "" || req.Action == "" {
		http.Error(w, `{"error": "queue and action are required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.PerformQueueAction(req.Queue, req.Action); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"queue":   req.Queue,
		"action":  req.Action,
		"message": fmt.Sprintf("Action '%s' completed on queue '%s'", req.Action, req.Queue),
	})
}

func (s *Server) handleDeleteMessages(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		var body struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id = body.ID
	}

	if id == "all" || id == "" {
		_ = s.store.ClearMessages()
		json.NewEncoder(w).Encode(map[string]bool{"success": true, "cleared": true})
		return
	}

	if err := s.store.DeleteMessage(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "id": id})
}

func (s *Server) handleInboundMessage(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ID         string            `json:"id"`
		Sender     string            `json:"sender"`
		Recipient  string            `json:"recipient"`
		Subject    string            `json:"subject"`
		Pool       string            `json:"pool"`
		BodyText   string            `json:"body_text"`
		BodyHTML   string            `json:"body_html"`
		RawHeaders map[string]string `json:"raw_headers"`
		RawMIME    string            `json:"raw_mime"`
		SPFStatus  string            `json:"spf_status"`
		DKIMStatus string            `json:"dkim_status"`
		IsARF      bool              `json:"is_arf"`
		ReceivedAt int64             `json:"received_at"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error": "invalid json payload"}`, http.StatusBadRequest)
		return
	}

	recvTime := time.Now().UTC()
	if payload.ReceivedAt > 0 {
		recvTime = time.Unix(payload.ReceivedAt, 0).UTC()
	}

	// 1. Inbound MX & RFC 5965 ARF processing
	inboundMsg := models.InboundMessage{
		ID:         payload.ID,
		Sender:     payload.Sender,
		Recipient:  payload.Recipient,
		Subject:    payload.Subject,
		BodyText:   payload.BodyText,
		BodyHTML:   payload.BodyHTML,
		RawHeaders: payload.RawHeaders,
		RawMIME:    payload.RawMIME,
		SPFStatus:  payload.SPFStatus,
		DKIMStatus: payload.DKIMStatus,
		IsARF:      payload.IsARF,
		ReceivedAt: recvTime,
	}
	saved, err := s.store.AddInboundEmail(inboundMsg)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
		return
	}

	// 2. Also register in outbound queue if message was relayed
	s.store.AddInboundMessage(payload.ID, payload.Sender, payload.Recipient, payload.Subject, payload.Pool)

	clientIP := r.RemoteAddr
	if fIP := r.Header.Get("X-Forwarded-For"); fIP != "" {
		clientIP = strings.Split(fIP, ",")[0]
	}
	clientIP = strings.TrimSpace(strings.Split(clientIP, ":")[0])
	s.store.RecordIncomingConnection(models.IncomingConnectionLog{
		SourceIP:  clientIP,
		Hostname:  "kumo-smtp-listener",
		Port:      2525,
		Protocol:  "ESMTP",
		AuthUser:  "whitelisted-relay",
		Status:    "relayed",
		Timestamp: time.Now().UTC(),
		MsgCount:  1,
	})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(saved)
}

type cfZoneResponse struct {
	Success bool `json:"success"`
	Errors  []struct {
		Message string `json:"message"`
	} `json:"errors"`
	Result []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"result"`
}

type cfDNSRecordsResponse struct {
	Success bool `json:"success"`
	Errors  []struct {
		Message string `json:"message"`
	} `json:"errors"`
	Result []struct {
		ID      string `json:"id"`
		Type    string `json:"type"`
		Name    string `json:"name"`
		Content string `json:"content"`
	} `json:"result"`
}

func (s *Server) handleCloudflareSync(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Domain    string `json:"domain"`
		APIToken  string `json:"api_token"`
		ZoneID    string `json:"zone_id"`
		IncludeMX bool   `json:"include_mx"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error": "invalid request payload"}`, http.StatusBadRequest)
		return
	}

	cleanDomain := strings.TrimSpace(strings.ToLower(body.Domain))
	cleanDomain = strings.TrimPrefix(cleanDomain, "http://")
	cleanDomain = strings.TrimPrefix(cleanDomain, "https://")
	cleanDomain = strings.Split(cleanDomain, "/")[0]
	apiToken := strings.TrimSpace(body.APIToken)

	if cleanDomain == "" || apiToken == "" {
		http.Error(w, `{"error": "domain and api_token are required"}`, http.StatusBadRequest)
		return
	}

	client := &http.Client{Timeout: 12 * time.Second}
	zoneID := strings.TrimSpace(body.ZoneID)

	// Step 1: Detect Zone ID if not provided
	if zoneID == "" {
		lookupDomain := cleanDomain
		for lookupDomain != "" {
			req, err := http.NewRequestWithContext(r.Context(), "GET", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones?name=%s", lookupDomain), nil)
			if err != nil {
				http.Error(w, `{"error": "failed to build cloudflare request"}`, http.StatusInternalServerError)
				return
			}
			req.Header.Set("Authorization", "Bearer "+apiToken)
			req.Header.Set("Content-Type", "application/json")

			resp, err := client.Do(req)
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error": "cloudflare connection failed: %v"}`, err), http.StatusBadGateway)
				return
			}

			var zResp cfZoneResponse
			_ = json.NewDecoder(resp.Body).Decode(&zResp)
			resp.Body.Close()

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
			http.Error(w, fmt.Sprintf(`{"error": "could not locate cloudflare zone for %s. Verify token permissions (Zone:DNS:Edit)."}`, cleanDomain), http.StatusNotFound)
			return
		}
	}

	// Step 2: Fetch domain configuration from store (or auto-create if missing)
	dom, ok := s.store.GetDomain(cleanDomain)
	if !ok || dom == nil {
		var err error
		dom, err = s.store.AddDomainWithDNS(cleanDomain, "k202611", "")
		if err != nil {
			http.Error(w, `{"error": "failed to register domain in store"}`, http.StatusInternalServerError)
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
			s.store.UpdateDomainDKIM(cleanDomain, selector, kp.PublicKeyTXT)
			dom.DKIMPublicKey = kp.PublicKeyTXT
		}
	}

	// Step 3: Fetch existing DNS records in Cloudflare Zone
	reqList, err := http.NewRequestWithContext(r.Context(), "GET", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records?per_page=100", zoneID), nil)
	if err != nil {
		http.Error(w, `{"error": "failed to query cloudflare dns records"}`, http.StatusInternalServerError)
		return
	}
	reqList.Header.Set("Authorization", "Bearer "+apiToken)
	reqList.Header.Set("Content-Type", "application/json")

	respList, err := client.Do(reqList)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "failed to fetch cloudflare records: %v"}`, err), http.StatusBadGateway)
		return
	}

	var recResp cfDNSRecordsResponse
	_ = json.NewDecoder(respList.Body).Decode(&recResp)
	respList.Body.Close()

	existingMap := make(map[string]string) // key: "TYPE:NAME" -> record ID
	for _, rec := range recResp.Result {
		key := fmt.Sprintf("%s:%s", strings.ToUpper(rec.Type), strings.ToLower(rec.Name))
		existingMap[key] = rec.ID
	}

	// Step 4: Define desired records
	type recordToSync struct {
		Type     string `json:"type"`
		Name     string `json:"name"`
		Content  string `json:"content"`
		TTL      int    `json:"ttl"`
		Priority int    `json:"priority,omitempty"`
	}

	dkimContent := dom.DKIMPublicKey
	if !strings.HasPrefix(dkimContent, "v=DKIM1") {
		dkimContent = fmt.Sprintf("v=DKIM1; k=rsa; p=%s", dkimContent)
	}

	records := []recordToSync{
		{
			Type:    "TXT",
			Name:    fmt.Sprintf("%s._domainkey.%s", selector, cleanDomain),
			Content: dkimContent,
			TTL:     3600,
		},
		{
			Type:    "TXT",
			Name:    cleanDomain,
			Content: dom.SPFRecord,
			TTL:     3600,
		},
		{
			Type:    "TXT",
			Name:    fmt.Sprintf("_dmarc.%s", cleanDomain),
			Content: dom.DMARCRecord,
			TTL:     3600,
		},
	}

	if body.IncludeMX {
		records = append(records, recordToSync{
			Type:     "MX",
			Name:     cleanDomain,
			Content:  fmt.Sprintf("mail.%s", cleanDomain),
			Priority: 10,
			TTL:      3600,
		})
	}

	createdCount := 0
	updatedCount := 0
	var syncErrors []string

	for _, rec := range records {
		recKey := fmt.Sprintf("%s:%s", strings.ToUpper(rec.Type), strings.ToLower(rec.Name))
		existingID, exists := existingMap[recKey]

		recBytes, _ := json.Marshal(rec)

		var cfReq *http.Request
		if exists {
			cfReq, _ = http.NewRequestWithContext(r.Context(), "PUT", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records/%s", zoneID, existingID), bytes.NewReader(recBytes))
		} else {
			cfReq, _ = http.NewRequestWithContext(r.Context(), "POST", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records", zoneID), bytes.NewReader(recBytes))
		}

		cfReq.Header.Set("Authorization", "Bearer "+apiToken)
		cfReq.Header.Set("Content-Type", "application/json")

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
			if exists {
				updatedCount++
			} else {
				createdCount++
			}
		} else if len(resultBody.Errors) > 0 {
			syncErrors = append(syncErrors, fmt.Sprintf("%s %s: %s", rec.Type, rec.Name, resultBody.Errors[0].Message))
		}
	}

	// Trigger authoritative verification
	primaryIP := s.store.GetPrimarySendingIP()
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
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

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":         len(syncErrors) == 0,
		"zone_id":         zoneID,
		"records_created": createdCount,
		"records_updated": updatedCount,
		"errors":          syncErrors,
		"message":         fmt.Sprintf("Successfully synced to Cloudflare (%d created, %d updated)", createdCount, updatedCount),
	})
}

func (s *Server) handleGetInfrastructureDetection(w http.ResponseWriter, r *http.Request) {
	info, err := s.store.GetInfrastructureInfo(false)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(info)
}

func (s *Server) handleForceInfrastructureDetection(w http.ResponseWriter, r *http.Request) {
	info, err := s.store.GetInfrastructureInfo(true)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(info)
}

func (s *Server) handleGetSMTPInfo(w http.ResponseWriter, r *http.Request) {
	host := r.Host
	if fHost := r.Header.Get("X-Forwarded-Host"); fHost != "" {
		host = fHost
	}
	info := s.store.GetHostConnectionInfo(host)
	json.NewEncoder(w).Encode(info)
}

func (s *Server) handleGetRelayWhitelist(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetRelayWhitelist())
}

func (s *Server) handleAddRelayWhitelist(w http.ResponseWriter, r *http.Request) {
	var body struct {
		CIDR        string `json:"cidr"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.CIDR) == "" {
		http.Error(w, `{"error": "cidr or ip is required"}`, http.StatusBadRequest)
		return
	}
	entry, err := s.store.AddRelayWhitelist(body.CIDR, body.Description)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(entry)
}

func (s *Server) handleDeleteRelayWhitelist(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		var body struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id = body.ID
	}
	if id == "" {
		http.Error(w, `{"error": "id is required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.DeleteRelayWhitelist(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleGetIncomingConnections(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetIncomingConnections())
}

func (s *Server) handleGetSuppressions(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	reason := r.URL.Query().Get("reason")
	json.NewEncoder(w).Encode(s.store.GetSuppressions(q, reason))
}

func (s *Server) handleAddSuppression(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email      string `json:"email"`
		Reason     string `json:"reason"`
		SourceCode string `json:"source_code"`
		Tenant     string `json:"tenant"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Email) == "" {
		http.Error(w, `{"error": "valid email is required"}`, http.StatusBadRequest)
		return
	}
	entry, err := s.store.AddSuppression(body.Email, body.Reason, body.SourceCode, body.Tenant)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(entry)
}

func (s *Server) handleDeleteSuppression(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		var body struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id = body.ID
	}
	if id == "" {
		http.Error(w, `{"error": "id or email is required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.DeleteSuppression(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleGetSuppressionStats(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetSuppressionStats())
}

func (s *Server) handleCheckSuppression(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email  string `json:"email"`
		Tenant string `json:"tenant"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Email == "" {
		email := r.URL.Query().Get("email")
		if email != "" {
			body.Email = email
			body.Tenant = r.URL.Query().Get("tenant")
		} else {
			http.Error(w, `{"error": "email is required"}`, http.StatusBadRequest)
			return
		}
	}
	isSuppressed := s.store.IsSuppressed(body.Email, body.Tenant)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"email":      body.Email,
		"suppressed": isSuppressed,
	})
}

func (s *Server) handleRecordBounce(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Recipient   string `json:"recipient"`
		Sender      string `json:"sender"`
		EgressIP    string `json:"egress_ip"`
		RawResponse string `json:"raw_response"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Recipient == "" {
		http.Error(w, `{"error": "recipient is required"}`, http.StatusBadRequest)
		return
	}
	rec, autoSuppressed := s.store.RecordBounce(body.Recipient, body.Sender, body.EgressIP, body.RawResponse)
	s.streamer.DispatchEvent(models.EventWebhookPayload{
		EventType: "bounced",
		Recipient: body.Recipient,
		Sender:    body.Sender,
		MessageID: rec.ID,
		Timestamp: time.Now().UTC(),
		Details: map[string]interface{}{
			"status_code":  rec.StatusCode,
			"bounce_class": rec.BounceClass,
			"suppressed":   autoSuppressed,
		},
	})
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"bounce":          rec,
		"auto_suppressed": autoSuppressed,
	})
}

func (s *Server) handleGetBounces(w http.ResponseWriter, r *http.Request) {
	limit := 100
	json.NewEncoder(w).Encode(s.store.GetBounces(limit))
}

// Warmup Handlers (Phase 4)
func (s *Server) handleGetWarmupPlans(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetWarmupPlans())
}

func (s *Server) handleGetWarmupSchedules(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetWarmupSchedules())
}

func (s *Server) handleStartWarmup(w http.ResponseWriter, r *http.Request) {
	var body struct {
		TargetType     string `json:"target_type"`
		TargetID       string `json:"target_id"`
		PlanID         string `json:"plan_id"`
		OverflowAction string `json:"overflow_action"`
		OverflowPool   string `json:"overflow_pool"`
		StartDay       int    `json:"start_day"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.TargetID == "" {
		http.Error(w, `{"error": "target_id and plan_id are required"}`, http.StatusBadRequest)
		return
	}
	sched, err := s.store.StartWarmupSchedule(body.TargetType, body.TargetID, body.PlanID, body.OverflowAction, body.OverflowPool, body.StartDay)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(sched)
}

func (s *Server) handlePauseWarmup(w http.ResponseWriter, r *http.Request) {
	var body struct {
		TargetID string `json:"target_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.TargetID == "" {
		targetID := r.URL.Query().Get("target_id")
		if targetID != "" {
			body.TargetID = targetID
		} else {
			http.Error(w, `{"error": "target_id is required"}`, http.StatusBadRequest)
			return
		}
	}
	if err := s.store.PauseWarmupSchedule(body.TargetID); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleResumeWarmup(w http.ResponseWriter, r *http.Request) {
	var body struct {
		TargetID string `json:"target_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.TargetID == "" {
		targetID := r.URL.Query().Get("target_id")
		if targetID != "" {
			body.TargetID = targetID
		} else {
			http.Error(w, `{"error": "target_id is required"}`, http.StatusBadRequest)
			return
		}
	}
	if err := s.store.ResumeWarmupSchedule(body.TargetID); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleAdvanceWarmup(w http.ResponseWriter, r *http.Request) {
	var body struct {
		TargetID string `json:"target_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.TargetID == "" {
		targetID := r.URL.Query().Get("target_id")
		if targetID != "" {
			body.TargetID = targetID
		} else {
			http.Error(w, `{"error": "target_id is required"}`, http.StatusBadRequest)
			return
		}
	}
	sched, err := s.store.AdvanceWarmupDay(body.TargetID)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(sched)
}

func (s *Server) handleDeleteWarmup(w http.ResponseWriter, r *http.Request) {
	targetID := r.URL.Query().Get("target_id")
	if targetID == "" {
		var body struct {
			TargetID string `json:"target_id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		targetID = body.TargetID
	}
	if targetID == "" {
		http.Error(w, `{"error": "target_id is required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.DeleteWarmupSchedule(targetID); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleGetWarmupStats(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetWarmupStats())
}


// ============================================================================
// CAMPAIGN HANDLERS
// ============================================================================

func (s *Server) handleGetCampaigns(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetCampaigns())
}

func (s *Server) handleAddCampaign(w http.ResponseWriter, r *http.Request) {
	var cmp models.Campaign
	if err := json.NewDecoder(r.Body).Decode(&cmp); err != nil {
		http.Error(w, `{"error": "invalid campaign payload"}`, http.StatusBadRequest)
		return
	}
	res, err := s.store.AddCampaign(cmp)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res)
}

func (s *Server) handleUpdateCampaign(w http.ResponseWriter, r *http.Request) {
	var cmp models.Campaign
	if err := json.NewDecoder(r.Body).Decode(&cmp); err != nil {
		http.Error(w, `{"error": "invalid campaign payload"}`, http.StatusBadRequest)
		return
	}
	res, err := s.store.UpdateCampaign(cmp)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(res)
}

func (s *Server) handleDeleteCampaign(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		var body struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id = body.ID
	}
	if id == "" {
		http.Error(w, `{"error": "id parameter required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.DeleteCampaign(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleDispatchCampaign(w http.ResponseWriter, r *http.Request) {
	var req models.CampaignDispatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CampaignID == "" {
		http.Error(w, `{"error": "campaign_id is required"}`, http.StatusBadRequest)
		return
	}
	res, err := s.store.DispatchCampaign(req)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(res)
}

// ============================================================================
// CONTACTS HANDLERS
// ============================================================================

func (s *Server) handleGetContacts(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetContacts())
}

func (s *Server) handleAddContact(w http.ResponseWriter, r *http.Request) {
	var ct models.Contact
	if err := json.NewDecoder(r.Body).Decode(&ct); err != nil {
		http.Error(w, `{"error": "invalid contact payload"}`, http.StatusBadRequest)
		return
	}
	res, err := s.store.AddContact(ct)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res)
}

func (s *Server) handleUpdateContact(w http.ResponseWriter, r *http.Request) {
	var ct models.Contact
	if err := json.NewDecoder(r.Body).Decode(&ct); err != nil {
		http.Error(w, `{"error": "invalid contact payload"}`, http.StatusBadRequest)
		return
	}
	res, err := s.store.UpdateContact(ct)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(res)
}

func (s *Server) handleDeleteContact(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		var body struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id = body.ID
	}
	if id == "" {
		http.Error(w, `{"error": "id parameter required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.DeleteContact(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// ============================================================================
// PRE-FLIGHT SEED TEST HANDLER
// ============================================================================

func (s *Server) handleSeedPreflightTest(w http.ResponseWriter, r *http.Request) {
	var req models.SeedPreflightTestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid seed test request"}`, http.StatusBadRequest)
		return
	}
	res, err := s.store.RunSeedPreflightTest(req)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(res)
}

// ============================================================================
// PHASE 5: INBOUND MX RECEIVER & RFC 5965 ARF HANDLERS
// ============================================================================

func (s *Server) handleGetInboundMessages(w http.ResponseWriter, r *http.Request) {
	filter := r.URL.Query().Get("filter")
	q := r.URL.Query().Get("q")
	limitStr := r.URL.Query().Get("limit")
	limit := 100
	if limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil && val > 0 {
			limit = val
		}
	}
	messages := s.store.GetInboundMessages(filter, q, limit)
	json.NewEncoder(w).Encode(messages)
}

func (s *Server) handleGetInboundMessageDetail(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, `{"error": "id parameter required"}`, http.StatusBadRequest)
		return
	}
	msg, err := s.store.GetInboundMessage(id)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(msg)
}

func (s *Server) handleDeleteInboundMessages(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		var body struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id = body.ID
	}
	if id == "" || id == "all" {
		if err := s.store.ClearInboundMessages(); err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]bool{"cleared": true})
		return
	}
	if err := s.store.DeleteInboundMessage(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

type SimulateARFRequest struct {
	Provider        string `json:"provider"`         // "yahoo", "microsoft", "apple", "generic"
	ComplainingRcpt string `json:"complaining_rcpt"` // recipient who marked as spam
	Sender          string `json:"sender"`           // your sender email e.g. "news@yourdomain.com"
	Subject         string `json:"subject"`
	FeedbackType    string `json:"feedback_type"`    // default "abuse"
}

func (s *Server) handleSimulateARF(w http.ResponseWriter, r *http.Request) {
	var req SimulateARFRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid payload"}`, http.StatusBadRequest)
		return
	}
	if req.ComplainingRcpt == "" {
		req.ComplainingRcpt = "subscriber-abuse@example.com"
	}
	if req.Sender == "" {
		req.Sender = "marketing@yourdomain.com"
	}
	if req.Subject == "" {
		req.Subject = "Exclusive Weekly Special Offers"
	}
	if req.FeedbackType == "" {
		req.FeedbackType = "abuse"
	}

	reportingMTA := "mail.mailops.io"
	userAgent := "Yahoo! Mail CFL (Complaints Feedback Loop)"
	feedbackFrom := "feedback-loop@yahoo.com"
	if strings.EqualFold(req.Provider, "microsoft") || strings.EqualFold(req.Provider, "jmrp") {
		userAgent = "Microsoft SNDS / JMRP (Junk Mail Reporting Program)"
		feedbackFrom = "staff-jmrp@microsoft.com"
		reportingMTA = "snds.microsoft.com"
	} else if strings.EqualFold(req.Provider, "apple") || strings.EqualFold(req.Provider, "icloud") {
		userAgent = "Apple iCloud Postmaster Feedback"
		feedbackFrom = "postmaster@icloud.com"
		reportingMTA = "icloud.apple.com"
	}

	nanos := time.Now().UnixNano()
	arfMIME := fmt.Sprintf("From: <%s>\r\nTo: <%s>\r\nSubject: Abuse Report: %s\r\nDate: %s\r\nContent-Type: multipart/report; report-type=feedback-report; boundary=\"BOUNDARY_ARF_%d\"\r\n\r\n--BOUNDARY_ARF_%d\r\nContent-Type: text/plain; charset=\"utf-8\"\r\n\r\nThis is an automated RFC 5965 email abuse / spam complaint report from %s.\r\nThe recipient has flagged your transmission as unsolicited spam.\r\n\r\n--BOUNDARY_ARF_%d\r\nContent-Type: message/feedback-report\r\n\r\nFeedback-Type: %s\r\nUser-Agent: %s\r\nVersion: 1.0\r\nOriginal-Rcpt-To: <%s>\r\nOriginal-Mail-From: <%s>\r\nReporting-MTA: dns; %s\r\nArrival-Date: %s\r\n\r\n--BOUNDARY_ARF_%d\r\nContent-Type: message/rfc822\r\n\r\nFrom: <%s>\r\nTo: <%s>\r\nSubject: %s\r\nMessage-ID: <sim-%d@yourdomain.com>\r\n\r\n(Original Message Body Truncated)\r\n--BOUNDARY_ARF_%d--\r\n",
		feedbackFrom,
		req.Sender,
		req.Subject,
		time.Now().UTC().Format(time.RFC1123Z),
		nanos,
		nanos,
		userAgent,
		nanos,
		req.FeedbackType,
		userAgent,
		req.ComplainingRcpt,
		req.Sender,
		reportingMTA,
		time.Now().UTC().Format(time.RFC1123Z),
		nanos,
		req.Sender,
		req.ComplainingRcpt,
		req.Subject,
		nanos,
		nanos,
	)

	inboundMsg := models.InboundMessage{
		ID:         fmt.Sprintf("arf-sim-%d", nanos),
		Sender:     feedbackFrom,
		Recipient:  req.Sender,
		Subject:    fmt.Sprintf("Abuse Report: %s [%s]", req.Subject, userAgent),
		BodyText:   fmt.Sprintf("RFC 5965 Abuse Report from %s\nComplaining Recipient: %s\nOriginal Sender: %s", userAgent, req.ComplainingRcpt, req.Sender),
		RawMIME:    arfMIME,
		RawHeaders: map[string]string{
			"content-type": "multipart/report; report-type=feedback-report",
			"from":         feedbackFrom,
			"to":           req.Sender,
			"subject":      fmt.Sprintf("Abuse Report: %s", req.Subject),
		},
		SPFStatus:  "pass",
		DKIMStatus: "pass",
		IsARF:      true,
		ReceivedAt: time.Now().UTC(),
	}

	saved, err := s.store.AddInboundEmail(inboundMsg)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(saved)
}

func (s *Server) handleGetInboundRoutes(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetInboundRoutes())
}

func (s *Server) handleAddInboundRoute(w http.ResponseWriter, r *http.Request) {
	var route models.InboundRoute
	if err := json.NewDecoder(r.Body).Decode(&route); err != nil {
		http.Error(w, `{"error": "invalid json payload"}`, http.StatusBadRequest)
		return
	}
	saved, err := s.store.AddInboundRoute(route)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(saved)
}

func (s *Server) handleUpdateInboundRoute(w http.ResponseWriter, r *http.Request) {
	var route models.InboundRoute
	if err := json.NewDecoder(r.Body).Decode(&route); err != nil {
		http.Error(w, `{"error": "invalid json payload"}`, http.StatusBadRequest)
		return
	}
	updated, err := s.store.UpdateInboundRoute(route)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(updated)
}

func (s *Server) handleDeleteInboundRoute(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		var body struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id = body.ID
	}
	if id == "" {
		http.Error(w, `{"error": "id parameter required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.DeleteInboundRoute(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleGetInboundStats(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetInboundStats())
}

// ============================================================================
// PHASE 6: SUB-ACCOUNT & MULTI-TENANT RBAC HANDLERS
// ============================================================================

func (s *Server) handleGetSubaccounts(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetSubaccounts())
}

func (s *Server) handleGetSubaccountDetail(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, `{"error": "id parameter required"}`, http.StatusBadRequest)
		return
	}
	sub, err := s.store.GetSubaccount(id)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(sub)
}

func (s *Server) handleAddSubaccount(w http.ResponseWriter, r *http.Request) {
	var sub models.Subaccount
	if err := json.NewDecoder(r.Body).Decode(&sub); err != nil {
		http.Error(w, `{"error": "invalid json payload"}`, http.StatusBadRequest)
		return
	}
	saved, err := s.store.AddSubaccount(sub)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(saved)
}

func (s *Server) handleUpdateSubaccount(w http.ResponseWriter, r *http.Request) {
	var sub models.Subaccount
	if err := json.NewDecoder(r.Body).Decode(&sub); err != nil {
		http.Error(w, `{"error": "invalid json payload"}`, http.StatusBadRequest)
		return
	}
	updated, err := s.store.UpdateSubaccount(sub)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(updated)
}

func (s *Server) handleDeleteSubaccount(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		var body struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id = body.ID
	}
	if id == "" {
		http.Error(w, `{"error": "id parameter required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.DeleteSubaccount(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleGetSubaccountStats(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetSubaccountStats())
}

func (s *Server) handleGetAPIKeys(w http.ResponseWriter, r *http.Request) {
	subaccountID := r.URL.Query().Get("subaccount_id")
	json.NewEncoder(w).Encode(s.store.GetAPIKeys(subaccountID))
}

func (s *Server) handleAddAPIKey(w http.ResponseWriter, r *http.Request) {
	var key models.APIKey
	if err := json.NewDecoder(r.Body).Decode(&key); err != nil {
		http.Error(w, `{"error": "invalid json payload"}`, http.StatusBadRequest)
		return
	}
	saved, err := s.store.AddAPIKey(key)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(saved)
}

func (s *Server) handleRevokeAPIKey(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		var body struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id = body.ID
	}
	if id == "" {
		http.Error(w, `{"error": "id parameter required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.RevokeAPIKey(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleDeleteAPIKey(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		var body struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id = body.ID
	}
	if id == "" {
		http.Error(w, `{"error": "id parameter required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.DeleteAPIKey(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// ============================================================================
// REDIS STREAM HIGH-VELOCITY INGESTION BUS (10M+ Emails/Day)
// ============================================================================

func (s *Server) handleBulkIngest(w http.ResponseWriter, r *http.Request) {
	var req models.BulkInjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Messages) == 0 {
		http.Error(w, `{"error": "invalid bulk request or empty messages array"}`, http.StatusBadRequest)
		return
	}

	// Validate API Key & Subaccount if provided
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		authHeader = r.Header.Get("X-API-Key")
	}
	if authHeader != "" {
		_, subaccount, err := s.store.ValidateAPIKey(authHeader, "mail:send")
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q, "auth_error": true}`, err.Error()), http.StatusUnauthorized)
			return
		}
		if subaccount != nil {
			req.SubaccountID = subaccount.ID
			if subaccount.DedicatedPool != "" && subaccount.DedicatedPool != "default" && req.Pool == "" {
				req.Pool = subaccount.DedicatedPool
			}
		}
	}

	resp, err := s.workerPool.EnqueueBulk(req)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(resp)
}

func (s *Server) handleGetIngestStats(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.workerPool.GetStats())
}

// ============================================================================
// PHASE 7: EVENT WEBHOOK STREAMING (HMAC-SHA256 SIGNED CALLBACKS)
// ============================================================================

func (s *Server) handleGetWebhookSubscriptions(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetWebhookSubscriptions())
}

func (s *Server) handleAddWebhookSubscription(w http.ResponseWriter, r *http.Request) {
	var sub models.WebhookSubscription
	if err := json.NewDecoder(r.Body).Decode(&sub); err != nil {
		http.Error(w, `{"error": "invalid json payload"}`, http.StatusBadRequest)
		return
	}
	saved, err := s.store.AddWebhookSubscription(sub)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(saved)
}

func (s *Server) handleUpdateWebhookSubscription(w http.ResponseWriter, r *http.Request) {
	var sub models.WebhookSubscription
	if err := json.NewDecoder(r.Body).Decode(&sub); err != nil {
		http.Error(w, `{"error": "invalid json payload"}`, http.StatusBadRequest)
		return
	}
	updated, err := s.store.UpdateWebhookSubscription(sub)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(updated)
}

func (s *Server) handleDeleteWebhookSubscription(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		var body struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id = body.ID
	}
	if id == "" {
		http.Error(w, `{"error": "id parameter required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.DeleteWebhookSubscription(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleTestWebhookEvent(w http.ResponseWriter, r *http.Request) {
	var req struct {
		EventType string `json:"event_type"` // "delivered", "bounced", "opened", "spam_complaint"
		Recipient string `json:"recipient"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.EventType == "" {
		req.EventType = "delivered"
	}
	if req.Recipient == "" {
		req.Recipient = "webhook-test@example.com"
	}

	event := models.EventWebhookPayload{
		EventID:      fmt.Sprintf("evt_test_%d", time.Now().UnixNano()),
		EventType:    req.EventType,
		Timestamp:    time.Now().UTC(),
		MessageID:    fmt.Sprintf("msg-sim-%d", time.Now().UnixNano()),
		Recipient:    req.Recipient,
		Sender:       "notifications@mailops.local",
		Domain:       "example.com",
		Pool:         "default",
		SubaccountID: "global",
		Details: map[string]interface{}{
			"ip":          "127.0.0.1",
			"tls_version": "TLSv1.3",
			"response":    "250 2.0.0 OK: message queued 179485",
		},
	}

	s.streamer.DispatchEvent(event)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"dispatched": true,
		"event":      event,
	})
}

func (s *Server) handleGetWebhookStats(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.streamer.GetStats())
}

func (s *Server) handleGetWebhookLogs(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil && val > 0 {
			limit = val
		}
	}
	json.NewEncoder(w).Encode(s.store.GetWebhookLogs(limit))
}

// ============================================================================
// TEMPLATE ENGINE & DELIVERABILITY HEALTH HANDLERS
// ============================================================================

func (s *Server) handleGetTemplates(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetTemplates())
}

func (s *Server) handleGetTemplateDetail(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, `{"error": "id parameter required"}`, http.StatusBadRequest)
		return
	}
	tmpl, err := s.store.GetTemplate(id)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(tmpl)
}

func (s *Server) handleAddTemplate(w http.ResponseWriter, r *http.Request) {
	var req models.Template
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid template payload"}`, http.StatusBadRequest)
		return
	}
	res, err := s.store.AddTemplate(req)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res)
}

func (s *Server) handleUpdateTemplate(w http.ResponseWriter, r *http.Request) {
	var req models.Template
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid template payload"}`, http.StatusBadRequest)
		return
	}
	res, err := s.store.UpdateTemplate(req)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(res)
}

func (s *Server) handleDeleteTemplate(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		var body struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id = body.ID
	}
	if id == "" {
		http.Error(w, `{"error": "id parameter required"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.DeleteTemplate(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleRenderTemplate(w http.ResponseWriter, r *http.Request) {
	var req models.RenderTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid render request payload"}`, http.StatusBadRequest)
		return
	}
	res, err := s.store.RenderTemplate(req)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(res)
}

func (s *Server) handleGetDeliverabilityHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(s.store.GetDeliverabilityHealth())
}
