package api

import (
	"encoding/json"
	"net/http"

	"mailops.io/backend/internal/models"
)

// handleGetAIWarmupStats returns overall health of the peer warmup network
func (s *Server) handleGetAIWarmupStats(w http.ResponseWriter, r *http.Request) {
	stats := s.store.GetAIWarmupStats()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// handleGetAIWarmupThreads returns recorded conversational warmup threads
func (s *Server) handleGetAIWarmupThreads(w http.ResponseWriter, r *http.Request) {
	threads := s.store.GetAIWarmupThreads()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(threads)
}

// handleGetAIWarmupSettings returns configuration for peer exchange
func (s *Server) handleGetAIWarmupSettings(w http.ResponseWriter, r *http.Request) {
	settings := s.store.GetAIWarmupSettings()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

// handleUpdateAIWarmupSettings updates configuration for peer exchange
func (s *Server) handleUpdateAIWarmupSettings(w http.ResponseWriter, r *http.Request) {
	var settings models.AIWarmupSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	updated := s.store.UpdateAIWarmupSettings(settings)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

// handleTriggerAIWarmupRound triggers an immediate conversational exchange round
func (s *Server) handleTriggerAIWarmupRound(w http.ResponseWriter, r *http.Request) {
	thread, err := s.store.TriggerAIWarmupRound()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "AI Warmup peer exchange round completed successfully",
		"thread":  thread,
	})
}
