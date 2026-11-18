package api

import (
	"encoding/json"
	"net/http"
	"strings"
)

func (s *Server) handleGetKumoLiveQueues(w http.ResponseWriter, r *http.Request) {
	queues, err := s.store.GetLiveKumoQueues(r.Context())
	if err != nil {
		// Fallback to empty array if Kumo is warming up
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(queues)
}

func (s *Server) handleGetKumoSuspensions(w http.ResponseWriter, r *http.Request) {
	rules, err := s.store.GetKumoSuspensions(r.Context())
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rules)
}

func (s *Server) handleGetKumoBounces(w http.ResponseWriter, r *http.Request) {
	rules, err := s.store.GetKumoBounces(r.Context())
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rules)
}

func (s *Server) handleSuspendKumoDomain(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Domain   string `json:"domain"`
		Reason   string `json:"reason"`
		Duration string `json:"duration"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Domain) == "" {
		http.Error(w, `{"error": "domain is required"}`, http.StatusBadRequest)
		return
	}

	res, err := s.store.SuspendKumoDomain(r.Context(), body.Domain, body.Reason, body.Duration)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func (s *Server) handleResumeKumoDomain(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Domain string `json:"domain"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Domain) == "" {
		http.Error(w, `{"error": "domain is required"}`, http.StatusBadRequest)
		return
	}

	if err := s.store.ResumeKumoDomain(r.Context(), body.Domain); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleBounceKumoDomain(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Domain   string `json:"domain"`
		Reason   string `json:"reason"`
		Duration string `json:"duration"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Domain) == "" {
		http.Error(w, `{"error": "domain is required"}`, http.StatusBadRequest)
		return
	}

	res, err := s.store.BounceKumoDomain(r.Context(), body.Domain, body.Reason, body.Duration)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}
