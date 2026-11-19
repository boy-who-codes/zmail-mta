package store

import (
	"path/filepath"
	"testing"
)

func TestSMTPCredentialsAndAuth(t *testing.T) {
	tmpFile := filepath.Join(t.TempDir(), "test-smtp-state.json")
	s := NewStore(tmpFile)

	// Add a production SMTP credential
	_, err := s.AddSMTPCredential("zmail_master", "zmail_live_sec_2026", "Master Relay User", "default")
	if err != nil {
		t.Fatalf("failed to add smtp credential: %v", err)
	}

	creds := s.GetSMTPCredentials()
	if len(creds) == 0 {
		t.Fatalf("expected smtp credentials, got 0")
	}

	// Test successful auth with master user
	ok, pool, err := s.AuthenticateSMTP("zmail_master", "zmail_live_sec_2026")
	if !ok || err != nil {
		t.Fatalf("expected successful auth for zmail_master, got ok=%v, err=%v", ok, err)
	}
	if pool != "default" {
		t.Errorf("expected pool 'default', got '%s'", pool)
	}

	// Test failed auth with bad password
	ok, _, err = s.AuthenticateSMTP("zmail_master", "wrong_password")
	if ok || err == nil {
		t.Fatalf("expected failed auth for bad password, got ok=%v", ok)
	}

	// Test adding a custom user (e.g. for Outlook)
	newCred, err := s.AddSMTPCredential("outlook_user", "outlook_secure_123", "Outlook Desktop Relay", "pool-outbound-tier1")
	if err != nil {
		t.Fatalf("failed to add smtp credential: %v", err)
	}
	if newCred.Username != "outlook_user" {
		t.Errorf("expected username 'outlook_user', got '%s'", newCred.Username)
	}

	// Test auth with newly added user
	ok, pool, err = s.AuthenticateSMTP("outlook_user", "outlook_secure_123")
	if !ok || err != nil {
		t.Fatalf("expected successful auth for outlook_user, got ok=%v, err=%v", ok, err)
	}
	if pool != "pool-outbound-tier1" {
		t.Errorf("expected pool 'pool-outbound-tier1', got '%s'", pool)
	}

	// Test toggle disabled
	if err := s.ToggleSMTPCredential(newCred.ID, false); err != nil {
		t.Fatalf("failed to toggle credential: %v", err)
	}
	ok, _, err = s.AuthenticateSMTP("outlook_user", "outlook_secure_123")
	if ok || err == nil {
		t.Fatalf("expected auth failure for disabled credential, got ok=%v", ok)
	}

	// Test delete
	if err := s.DeleteSMTPCredential(newCred.ID); err != nil {
		t.Fatalf("failed to delete credential: %v", err)
	}
	ok, _, err = s.AuthenticateSMTP("outlook_user", "outlook_secure_123")
	if ok || err == nil {
		t.Fatalf("expected auth failure for deleted credential, got ok=%v", ok)
	}
}
