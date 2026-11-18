package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"mailops.io/backend/internal/store"
)

// handleCheckRBLTarget performs real-time DNSBL checks for an IP or sending domain
func (s *Server) handleCheckRBLTarget(w http.ResponseWriter, r *http.Request) {
	target := strings.TrimSpace(r.URL.Query().Get("target"))
	targetType := strings.TrimSpace(r.URL.Query().Get("type"))

	if target == "" {
		http.Error(w, "missing 'target' parameter", http.StatusBadRequest)
		return
	}

	audit := store.CheckTargetRBL(target, targetType)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(audit)
}

// handleGetRBLSummary scans all system sending IPs and domains and returns an aggregate report
func (s *Server) handleGetRBLSummary(w http.ResponseWriter, r *http.Request) {
	summary := s.store.AuditSystemRBL()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}
