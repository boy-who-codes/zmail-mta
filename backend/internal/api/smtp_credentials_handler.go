package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"mailops.io/backend/internal/models"
)

// handleGetSMTPCredentials returns all configured SMTP submission credentials
func (s *Server) handleGetSMTPCredentials(w http.ResponseWriter, r *http.Request) {
	creds := s.store.GetSMTPCredentials()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(creds)
}

// handleAddSMTPCredential creates a new SMTP username/password
func (s *Server) handleAddSMTPCredential(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username    string `json:"username"`
		Password    string `json:"password,omitempty"`
		Description string `json:"description"`
		PoolID      string `json:"pool_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	created, err := s.store.AddSMTPCredential(req.Username, req.Password, req.Description, req.PoolID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(created)
}

// handleDeleteSMTPCredential removes an SMTP user
func (s *Server) handleDeleteSMTPCredential(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "missing credential id", http.StatusBadRequest)
		return
	}

	if err := s.store.DeleteSMTPCredential(id); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted", "id": id})
}

// handleToggleSMTPCredential toggles enabled/disabled state
func (s *Server) handleToggleSMTPCredential(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID      string `json:"id"`
		Enabled bool   `json:"enabled"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := s.store.ToggleSMTPCredential(req.ID, req.Enabled); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"status": "updated", "id": req.ID, "enabled": req.Enabled})
}

// handleAuthenticateSMTP handles internal verification from KumoMTA Lua hooks (AUTH LOGIN / AUTH PLAIN)
func (s *Server) handleAuthenticateSMTP(w http.ResponseWriter, r *http.Request) {
	var req models.SMTPAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.SMTPAuthResponse{
			Authenticated: false,
			Message:       "Malformed authentication payload",
		})
		return
	}

	ok, pool, err := s.store.AuthenticateSMTP(req.Username, req.Password)
	w.Header().Set("Content-Type", "application/json")

	if !ok || err != nil {
		errMsg := "Authentication failed"
		if err != nil {
			errMsg = err.Error()
		}
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(models.SMTPAuthResponse{
			Authenticated: false,
			Username:      strings.TrimSpace(req.Username),
			Message:       errMsg,
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(models.SMTPAuthResponse{
		Authenticated: true,
		Username:      strings.TrimSpace(req.Username),
		Pool:          pool,
		Message:       "Authentication successful",
	})
}
