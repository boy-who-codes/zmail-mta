package ipmanager

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"mailops.io/backend/internal/models"
)

func TestValidateIPConfig(t *testing.T) {
	mgr := &Manager{}

	ips := map[string]models.SendingIP{
		"192.0.2.1": {
			IP:     "192.0.2.1",
			Weight: 10,
		},
		"2001:db8::1": {
			IP:     "2001:db8::1",
			Weight: 5,
		},
		"not-an-ip": {
			IP:     "not-an-ip",
			Weight: 1,
		},
	}

	pools := map[string]models.IPPool{
		"transactional": {
			ID:   "pool-1",
			Name: "transactional",
			IPs:  []string{"192.0.2.1", "999.999.999.999"},
		},
	}

	errs := mgr.ValidateIPConfig(ips, pools)
	if len(errs) != 2 {
		t.Fatalf("expected 2 validation errors, got %d: %+v", len(errs), errs)
	}

	foundInvalidIP := false
	foundMissingPoolIP := false
	for _, e := range errs {
		if e.Field == "ip_address" && e.Value == "not-an-ip" {
			foundInvalidIP = true
		}
		if strings.Contains(e.Field, "pool[transactional]") && e.Value == "999.999.999.999" {
			foundMissingPoolIP = true
		}
	}

	if !foundInvalidIP {
		t.Errorf("expected validation error for invalid IP syntax")
	}
	if !foundMissingPoolIP {
		t.Errorf("expected validation error for unregistered pool IP")
	}
}

func TestGenerateSourcesToml(t *testing.T) {
	mgr := &Manager{}

	ips := map[string]models.SendingIP{
		"192.0.2.1": {
			IP:         "192.0.2.1",
			Weight:     10,
			ReverseDNS: "mail1.example.com",
		},
		"192.0.2.2": {
			IP:         "192.0.2.2",
			Weight:     20,
			ReverseDNS: "mail2.example.com",
		},
	}

	pools := map[string]models.IPPool{
		"marketing": {
			ID:   "pool-mkt",
			Name: "marketing",
			IPs:  []string{"192.0.2.1", "192.0.2.2"},
		},
	}

	toml := mgr.GenerateSourcesToml(ips, pools)
	if !strings.Contains(toml, `[source."src-192-0-2-1"]`) {
		t.Errorf("expected src-192-0-2-1 in toml")
	}
	if !strings.Contains(toml, `ehlo_domain = "mail1.example.com"`) {
		t.Errorf("expected ehlo_domain in toml")
	}
	if !strings.Contains(toml, `[pool."marketing"."src-192-0-2-1"]`) {
		t.Errorf("expected pool mapping in toml")
	}
	if !strings.Contains(toml, `weight = 10`) {
		t.Errorf("expected weight 10 in toml")
	}
}

func TestAtomicSyncAndBackup(t *testing.T) {
	tmpDir := t.TempDir()
	targetPath := filepath.Join(tmpDir, "sources.toml")

	mgr := &Manager{
		syncPaths: []string{targetPath},
	}

	ips := map[string]models.SendingIP{
		"198.51.100.1": {
			IP:     "198.51.100.1",
			Weight: 5,
		},
	}
	pools := map[string]models.IPPool{
		"default": {
			ID:   "default",
			Name: "default",
			IPs:  []string{"198.51.100.1"},
		},
	}

	// 1. Initial Sync
	status, err := mgr.SyncSourcesToml(ips, pools)
	if err != nil {
		t.Fatalf("first sync failed: %v", err)
	}
	if status.Status != "synced" {
		t.Errorf("expected status 'synced', got %s", status.Status)
	}

	data, err := os.ReadFile(targetPath)
	if err != nil {
		t.Fatalf("target file was not created: %v", err)
	}
	if !strings.Contains(string(data), "198.51.100.1") {
		t.Errorf("target file content missing IP")
	}

	// 2. Second Sync with new IP (should generate .bak)
	ips["198.51.100.2"] = models.SendingIP{IP: "198.51.100.2", Weight: 1}
	status, err = mgr.SyncSourcesToml(ips, pools)
	if err != nil {
		t.Fatalf("second sync failed: %v", err)
	}

	bakPath := targetPath + ".bak"
	if _, err := os.Stat(bakPath); err != nil {
		t.Errorf("backup file was not created: %v", err)
	}
}
