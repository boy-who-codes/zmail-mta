package api

import (
	"encoding/json"
	"net/http"
)

// handleGetWarmupSummary returns real-time progression across all warming mailboxes
func (s *Server) handleGetWarmupSummary(w http.ResponseWriter, r *http.Request) {
	summary := s.store.GetWarmupSummary()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

// handleTickWarmupSchedule advances the warmup schedule by 1 evaluation day
func (s *Server) handleTickWarmupSchedule(w http.ResponseWriter, r *http.Request) {
	summary := s.store.TickWarmupSchedule()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}
