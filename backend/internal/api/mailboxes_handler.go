package api

import (
	"encoding/json"
	"net/http"

	"mailops.io/backend/internal/models"
)

func (s *Server) handleGetMailboxes(w http.ResponseWriter, r *http.Request) {
	mailboxes := s.store.GetMailboxes()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(mailboxes)
}

func (s *Server) handleAddMailbox(w http.ResponseWriter, r *http.Request) {
	var m models.Mailbox
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	created, err := s.store.AddMailbox(m)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(created)
}

func (s *Server) handleUpdateMailbox(w http.ResponseWriter, r *http.Request) {
	var m models.Mailbox
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	updated, err := s.store.UpdateMailbox(m)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

func (s *Server) handleDeleteMailbox(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "missing mailbox id", http.StatusBadRequest)
		return
	}

	if err := s.store.DeleteMailbox(id); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleGetMailboxPools(w http.ResponseWriter, r *http.Request) {
	pools := s.store.GetMailboxPools()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pools)
}

func (s *Server) handleAddMailboxPool(w http.ResponseWriter, r *http.Request) {
	var p models.MailboxPool
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	created, err := s.store.AddMailboxPool(p)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(created)
}

func (s *Server) handleUpdateMailboxPool(w http.ResponseWriter, r *http.Request) {
	var p models.MailboxPool
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	updated, err := s.store.UpdateMailboxPool(p)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

func (s *Server) handleDeleteMailboxPool(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "missing pool id", http.StatusBadRequest)
		return
	}

	if err := s.store.DeleteMailboxPool(id); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type simulateRotationReq struct {
	PoolID     string   `json:"pool_id"`
	Strategy   string   `json:"strategy"`
	Recipients []string `json:"recipients"`
}

func (s *Server) handleSimulateMailboxRotation(w http.ResponseWriter, r *http.Request) {
	var req simulateRotationReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	sim, err := s.store.SimulateMailboxRotation(req.PoolID, req.Strategy, req.Recipients)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sim)
}

func (s *Server) handleGetPlaybooks(w http.ResponseWriter, r *http.Request) {
	playbooks := s.store.GetPlaybooks()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(playbooks)
}

func (s *Server) handleGetSystemSettings(w http.ResponseWriter, r *http.Request) {
	settings := s.store.GetSystemSettings()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

func (s *Server) handleUpdateSystemSettings(w http.ResponseWriter, r *http.Request) {
	var settings models.SystemSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	updated := s.store.UpdateSystemSettings(settings)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

func (s *Server) handleBatchAddMailboxes(w http.ResponseWriter, r *http.Request) {
	var req models.BatchAddMailboxesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	added, failed, err := s.store.BatchAddMailboxes(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(models.BatchAddMailboxesResponse{
		Added:   added,
		Failed:  failed,
		Message: "Batch mailbox provisioning completed",
	})
}
