package api

import (
	"encoding/json"
	"net/http"

	"mailops.io/backend/internal/models"
)

// handleGetSequenceLeads returns leads enrolled in a campaign cadence
func (s *Server) handleGetSequenceLeads(w http.ResponseWriter, r *http.Request) {
	campaignID := r.URL.Query().Get("campaign_id")
	leads := s.store.GetSequenceLeads(campaignID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(leads)
}

// handleGetSequenceStats returns cadence funnel performance metrics
func (s *Server) handleGetSequenceStats(w http.ResponseWriter, r *http.Request) {
	campaignID := r.URL.Query().Get("campaign_id")
	stats := s.store.GetSequenceStats(campaignID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// handleEnrollSequenceLeads adds new leads (or imports from CSV) into a campaign cadence
func (s *Server) handleEnrollSequenceLeads(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CampaignID string                `json:"campaign_id"`
		Leads      []models.SequenceLead `json:"leads"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.CampaignID == "" {
		req.CampaignID = "camp-enterprise-01"
	}

	enrolled, skipped, err := s.store.ImportAndEnrollLeads(req.CampaignID, req.Leads)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"enrolled": enrolled,
		"skipped":  skipped,
		"message":  "Leads enrolled into visual drip cadence successfully",
	})
}

// handleRecordSequenceReply marks a lead as replied and halts further follow-ups
func (s *Server) handleRecordSequenceReply(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Sender string `json:"sender"`
		Email  string `json:"email"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	target := req.Sender
	if target == "" {
		target = req.Email
	}

	halted, msg := s.store.RecordReplyForLead(target)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"halted":  halted,
		"message": msg,
	})
}

// handleTickSequenceCadence manually triggers or advances cadence follow-up evaluation
func (s *Server) handleTickSequenceCadence(w http.ResponseWriter, r *http.Request) {
	dispatched, err := s.store.TickSequenceCadence()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":              true,
		"dispatched_followups": dispatched,
		"message":              "Sequence follow-ups evaluated and advanced",
	})
}
