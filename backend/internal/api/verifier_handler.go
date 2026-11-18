package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"mailops.io/backend/internal/models"
	"mailops.io/backend/internal/store"
)

// handleVerifySingleEmail validates a single email with real-time MX & hygiene checks
func (s *Server) handleVerifySingleEmail(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	res := store.VerifySingleEmail(req.Email)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

// handleVerifyBulkEmails validates a batch of email addresses concurrently
func (s *Server) handleVerifyBulkEmails(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Emails []string `json:"emails"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	summary := store.BulkVerifyEmails(req.Emails)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

// handleImportCleanLeads imports verified clean leads directly into the Contacts store
func (s *Server) handleImportCleanLeads(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Leads []models.LeadVerificationResult `json:"leads"`
		List  string                          `json:"list"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.List == "" {
		req.List = "Verified Clean Leads"
	}

	imported := 0
	for _, l := range req.Leads {
		if l.Status == "valid" {
			local := strings.Split(l.Email, "@")[0]
			c := models.Contact{
				ID:             "ct-" + time.Now().Format("20060102150405") + "-" + local,
				Email:          l.Email,
				Name:           strings.Title(local),
				Company:        strings.Title(strings.Split(l.Domain, ".")[0]),
				Tags:           []string{req.List, "Verified Clean"},
				Status:         "subscribed",
				DeliveryHealth: "optimal",
				SentCount:      0,
				OpenRate:       0,
				LastActive:     "Just Verified",
				CreatedAt:      time.Now(),
			}
			s.store.AddContact(c)
			imported++
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"imported": imported,
		"message":  "Clean verified contacts added to audience successfully",
	})
}
