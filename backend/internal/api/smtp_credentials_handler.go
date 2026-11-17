package api

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"

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

type loginAuth struct {
	username, password string
}

func LoginAuth(username, password string) smtp.Auth {
	return &loginAuth{username, password}
}

func (a *loginAuth) Start(server *smtp.ServerInfo) (string, []byte, error) {
	return "LOGIN", []byte(a.username), nil
}

func (a *loginAuth) Next(fromServer []byte, more bool) ([]byte, error) {
	if more {
		return []byte(a.password), nil
	}
	return nil, nil
}

// handleTestSMTPConnection performs a real-time TCP ping, STARTTLS handshake, and authentication check
func (s *Server) handleTestSMTPConnection(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Host     string `json:"host"`
		Port     int    `json:"port"`
		Username string `json:"username"`
		Password string `json:"password"`
		TLSMode  string `json:"tls_mode"` // "starttls", "tls", "none"
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	host := strings.TrimSpace(req.Host)
	port := req.Port

	if host == "" || host == "127.0.0.1" || host == "localhost" {
		if kumoSMTP := os.Getenv("KUMO_SMTP"); kumoSMTP != "" {
			parts := strings.Split(kumoSMTP, ":")
			host = parts[0]
			if len(parts) > 1 && port <= 0 {
				if p, err := strconv.Atoi(parts[1]); err == nil {
					port = p
				}
			}
		} else if host == "" {
			host = "127.0.0.1"
		}
	}
	if port <= 0 {
		port = 587
	}

	addr := fmt.Sprintf("%s:%d", host, port)
	start := time.Now()

	// 1. Establish TCP connection with 5s timeout
	dialer := &net.Dialer{Timeout: 5 * time.Second}
	var rawConn net.Conn
	var err error
	var tlsVersion string

	if port == 465 || strings.EqualFold(req.TLSMode, "tls") {
		tlsConfig := &tls.Config{
			InsecureSkipVerify: true,
			ServerName:         host,
		}
		rawConn, err = tls.DialWithDialer(dialer, "tcp", addr, tlsConfig)
		tlsVersion = "TLS (Direct)"
	} else {
		rawConn, err = dialer.Dial("tcp", addr)
	}

	if err != nil {
		latency := time.Since(start).Milliseconds()
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":    false,
			"latency_ms": latency,
			"message":    fmt.Sprintf("Connection failed to %s: %v", addr, err),
		})
		return
	}
	defer rawConn.Close()

	// 2. Initialize SMTP Client
	client, err := smtp.NewClient(rawConn, host)
	if err != nil {
		latency := time.Since(start).Milliseconds()
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":    false,
			"latency_ms": latency,
			"message":    fmt.Sprintf("Failed to initialize SMTP protocol: %v", err),
		})
		return
	}
	defer client.Close()

	// 3. Negotiate STARTTLS if requested/supported
	if port != 465 && !strings.EqualFold(req.TLSMode, "none") {
		if ok, _ := client.Extension("STARTTLS"); ok {
			tlsConfig := &tls.Config{
				InsecureSkipVerify: true,
				ServerName:         host,
			}
			if err := client.StartTLS(tlsConfig); err != nil {
				latency := time.Since(start).Milliseconds()
				json.NewEncoder(w).Encode(map[string]interface{}{
					"success":    false,
					"latency_ms": latency,
					"message":    fmt.Sprintf("STARTTLS handshake failed: %v", err),
				})
				return
			}
			tlsVersion = "STARTTLS (TLS 1.3 / 1.2)"
		}
	}

	// 4. Test Authentication if credentials provided
	username := strings.TrimSpace(req.Username)
	password := strings.TrimSpace(req.Password)
	if username != "" && password != "" {
		// Try PLAIN auth first
		auth := smtp.PlainAuth("", username, password, host)
		if err := client.Auth(auth); err != nil {
			// Fallback to LOGIN auth
			loginAuth := LoginAuth(username, password)
			if loginErr := client.Auth(loginAuth); loginErr != nil {
				latency := time.Since(start).Milliseconds()
				json.NewEncoder(w).Encode(map[string]interface{}{
					"success":    false,
					"latency_ms": latency,
					"message":    fmt.Sprintf("Authentication failed for user '%s': %v", username, loginErr),
				})
				return
			}
		}
	}

	latency := time.Since(start).Milliseconds()
	msg := fmt.Sprintf("Connected to %s and verified in %dms", addr, latency)
	if username != "" {
		msg = fmt.Sprintf("Authenticated as '%s' on %s in %dms", username, addr, latency)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"latency_ms":  latency,
		"tls_version": tlsVersion,
		"message":     msg,
	})
}
