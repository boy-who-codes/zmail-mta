package store

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"mailops.io/backend/internal/models"
)

// initDefaultSMTPCredentialsLocked seeds initial credentials for Outlook and ESMTP clients if empty
func (s *Store) initDefaultSMTPCredentialsLocked() {
	if len(s.smtpCredentials) > 0 {
		return
	}

	initialCreds := []models.SMTPCredential{
		{
			ID:           "smtp-cred-master",
			Username:     "zmail_master",
			Password:     "zmail_live_sec_2026",
			PasswordHash: hashPassword("zmail_live_sec_2026"),
			Description:  "Primary Outlook / ESMTP Relay Submission User",
			PoolID:       "default",
			Enabled:      true,
			CreatedAt:    time.Now().UTC().Add(-72 * time.Hour),
			UpdatedAt:    time.Now().UTC(),
		},
		{
			ID:           "smtp-cred-outbound",
			Username:     "outbound@zmail.local",
			Password:     "outbound_prod_key_994",
			PasswordHash: hashPassword("outbound_prod_key_994"),
			Description:  "Growth & Cold Cadence Outbound Relay",
			PoolID:       "pool-outbound-tier1",
			Enabled:      true,
			CreatedAt:    time.Now().UTC().Add(-48 * time.Hour),
			UpdatedAt:    time.Now().UTC(),
		},
	}

	for _, c := range initialCreds {
		s.smtpCredentials[c.ID] = c
	}
}

// hashPassword produces a deterministic SHA-256 hash for secure credential storage
func hashPassword(p string) string {
	h := sha256.Sum256([]byte(p))
	return hex.EncodeToString(h[:])
}

// generateSecureToken creates a readable cryptographic password if none was provided
func generateSecureToken(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return fmt.Sprintf("zmail_%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(bytes)
}

// GetSMTPCredentials returns all configured SMTP submission credentials
func (s *Store) GetSMTPCredentials() []models.SMTPCredential {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]models.SMTPCredential, 0, len(s.smtpCredentials))
	for _, c := range s.smtpCredentials {
		// Do not expose raw PasswordHash in client output
		clone := c
		clone.PasswordHash = ""
		out = append(out, clone)
	}
	return out
}

// AddSMTPCredential creates a new SMTP user with assigned egress pool
func (s *Store) AddSMTPCredential(username, password, description, poolID string) (*models.SMTPCredential, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cleanUser := strings.TrimSpace(username)
	if cleanUser == "" {
		return nil, errors.New("smtp username cannot be empty")
	}

	// Check for duplicates
	for _, c := range s.smtpCredentials {
		if strings.EqualFold(c.Username, cleanUser) {
			return nil, fmt.Errorf("smtp username '%s' is already in use", cleanUser)
		}
	}

	rawPass := strings.TrimSpace(password)
	if rawPass == "" {
		rawPass = "zm_" + generateSecureToken(12)
	}

	if poolID == "" {
		poolID = "default"
	}

	id := fmt.Sprintf("smtp-cred-%s", generateSecureToken(6))
	now := time.Now().UTC()

	cred := models.SMTPCredential{
		ID:           id,
		Username:     cleanUser,
		Password:     rawPass, // Expose in return payload so user can copy once
		PasswordHash: hashPassword(rawPass),
		Description:  description,
		PoolID:       poolID,
		Enabled:      true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	s.smtpCredentials[id] = cred
	s.saveLocked()

	return &cred, nil
}

// DeleteSMTPCredential removes an SMTP user
func (s *Store) DeleteSMTPCredential(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.smtpCredentials[id]; !exists {
		return errors.New("smtp credential not found")
	}

	delete(s.smtpCredentials, id)
	s.saveLocked()
	return nil
}

// ToggleSMTPCredential enables or disables an SMTP user
func (s *Store) ToggleSMTPCredential(id string, enabled bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cred, exists := s.smtpCredentials[id]
	if !exists {
		return errors.New("smtp credential not found")
	}

	cred.Enabled = enabled
	cred.UpdatedAt = time.Now().UTC()
	s.smtpCredentials[id] = cred
	s.saveLocked()
	return nil
}

// AuthenticateSMTP verifies SMTP AUTH LOGIN or AUTH PLAIN credentials
// Supports:
// 1. Direct SMTP Credentials (username + password)
// 2. API Key Authentication (any active API key can be used as password with username 'api' or 'zmail')
func (s *Store) AuthenticateSMTP(username, password string) (bool, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cleanUser := strings.TrimSpace(username)
	cleanPass := strings.TrimSpace(password)

	if cleanUser == "" || cleanPass == "" {
		return false, "", errors.New("missing credentials")
	}

	// 1. Check direct SMTP Credentials
	providedHash := hashPassword(cleanPass)
	for id, cred := range s.smtpCredentials {
		if strings.EqualFold(cred.Username, cleanUser) {
			if !cred.Enabled {
				return false, "", fmt.Errorf("credential '%s' is disabled", cleanUser)
			}
			// Match either stored plaintext or hash
			if cred.Password == cleanPass || cred.PasswordHash == providedHash {
				now := time.Now().UTC()
				cred.LastUsedAt = &now
				s.smtpCredentials[id] = cred
				return true, cred.PoolID, nil
			}
			return false, "", errors.New("invalid password")
		}
	}

	// 2. Check API Key fallback (Username "api" or "zmail" or matching KeyPrefix)
	if strings.EqualFold(cleanUser, "api") || strings.EqualFold(cleanUser, "zmail") || strings.HasPrefix(cleanUser, "mops_") {
		for _, key := range s.apiKeys {
			if key.Status == "active" && key.Key == cleanPass {
				return true, "default", nil
			}
		}
	}

	return false, "", errors.New("user not found or invalid credentials")
}
