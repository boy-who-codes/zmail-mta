package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"mailops.io/backend/internal/models"
)

// Master Admin configuration as specified
const (
	MasterAdminUsername = "zekea.me"
	MasterAdminPassword = "zekea@mta#kumo"
	AuthHMACSecretKey   = "mailops-enterprise-gdm-session-signing-secret-key-2026"
)

// GenerateAuthToken creates a tamper-proof HMAC-SHA256 signed bearer token
func GenerateAuthToken(user models.AuthUser) (string, error) {
	if user.ExpiresAt == 0 {
		user.ExpiresAt = time.Now().Add(7 * 24 * time.Hour).Unix()
	}
	payloadBytes, err := json.Marshal(user)
	if err != nil {
		return "", err
	}
	payloadB64 := base64.RawURLEncoding.EncodeToString(payloadBytes)

	mac := hmac.New(sha256.New, []byte(AuthHMACSecretKey))
	mac.Write([]byte(payloadB64))
	sigB64 := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return payloadB64 + "." + sigB64, nil
}

// ValidateAuthToken verifies token signature and expiration
func ValidateAuthToken(tokenStr string) (*models.AuthUser, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 2 {
		return nil, fmt.Errorf("malformed authentication token")
	}

	payloadB64 := parts[0]
	sigB64 := parts[1]

	mac := hmac.New(sha256.New, []byte(AuthHMACSecretKey))
	mac.Write([]byte(payloadB64))
	expectedSig := mac.Sum(nil)

	actualSig, err := base64.RawURLEncoding.DecodeString(sigB64)
	if err != nil || !hmac.Equal(actualSig, expectedSig) {
		return nil, fmt.Errorf("invalid token cryptographic signature")
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return nil, fmt.Errorf("invalid token payload encoding")
	}

	var user models.AuthUser
	if err := json.Unmarshal(payloadBytes, &user); err != nil {
		return nil, fmt.Errorf("invalid token payload json")
	}

	if time.Now().Unix() > user.ExpiresAt {
		return nil, fmt.Errorf("authentication token has expired")
	}

	return &user, nil
}

// authenticateRequest extracts and validates the caller's session token
func (s *Server) authenticateRequest(r *http.Request) (*models.AuthUser, error) {
	// 1. Authorization header: "Bearer <token>"
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
		token := strings.TrimSpace(authHeader[7:])
		if token != "" {
			return ValidateAuthToken(token)
		}
	}

	// 2. X-Auth-Token header
	if token := r.Header.Get("X-Auth-Token"); token != "" {
		return ValidateAuthToken(token)
	}

	// 3. Query param for downloads/webhooks
	if token := r.URL.Query().Get("token"); token != "" {
		return ValidateAuthToken(token)
	}

	// 4. Session Cookie
	if cookie, err := r.Cookie("mailops_session"); err == nil && cookie.Value != "" {
		return ValidateAuthToken(cookie.Value)
	}

	return nil, fmt.Errorf("no authorization token provided")
}

// handleAuthLogin processes login for both Master Admin (zekea.me) and Tenants
func (s *Server) handleAuthLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req models.AuthLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	cleanUser := strings.TrimSpace(strings.ToLower(req.Username))

	// 1. Check Master Admin Credentials
	if (cleanUser == MasterAdminUsername || cleanUser == "admin@"+MasterAdminUsername) && req.Password == MasterAdminPassword {
		authUser := models.AuthUser{
			Role:             "master_admin",
			Username:         MasterAdminUsername,
			Name:             "Master Administrator",
			CanManageTenants: true,
			ExpiresAt:        time.Now().Add(7 * 24 * time.Hour).Unix(),
		}

		token, err := GenerateAuthToken(authUser)
		if err != nil {
			http.Error(w, `{"error": "Failed to generate session token"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.AuthResponse{
			Token:            token,
			Role:             authUser.Role,
			Username:         authUser.Username,
			Name:             authUser.Name,
			CanManageTenants: authUser.CanManageTenants,
		})
		return
	}

	// 2. Check Tenant Credentials
	sub, err := s.store.VerifyTenantLogin(req.Username, req.Password)
	if err == nil && sub != nil {
		authUser := models.AuthUser{
			Role:             "tenant",
			Username:         sub.Email,
			Name:             sub.Name,
			TenantID:         sub.ID,
			DedicatedPool:    sub.DedicatedPool,
			AllowedDomains:   sub.AllowedDomains,
			CanManageTenants: false,
			ExpiresAt:        time.Now().Add(7 * 24 * time.Hour).Unix(),
		}

		token, err := GenerateAuthToken(authUser)
		if err != nil {
			http.Error(w, `{"error": "Failed to generate session token"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.AuthResponse{
			Token:            token,
			Role:             authUser.Role,
			Username:         authUser.Username,
			Name:             authUser.Name,
			TenantID:         authUser.TenantID,
			DedicatedPool:    authUser.DedicatedPool,
			AllowedDomains:   authUser.AllowedDomains,
			CanManageTenants: authUser.CanManageTenants,
		})
		return
	}

	// Invalid credentials
	http.Error(w, `{"error": "Invalid username/email or password"}`, http.StatusUnauthorized)
}

// handleAuthMe returns current session details based on bearer token
func (s *Server) handleAuthMe(w http.ResponseWriter, r *http.Request) {
	user, err := s.authenticateRequest(r)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.AuthResponse{
		Role:             user.Role,
		Username:         user.Username,
		Name:             user.Name,
		TenantID:         user.TenantID,
		DedicatedPool:    user.DedicatedPool,
		AllowedDomains:   user.AllowedDomains,
		CanManageTenants: user.CanManageTenants,
	})
}
