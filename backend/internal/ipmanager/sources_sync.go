package ipmanager

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"mailops.io/backend/internal/models"
)

// ValidationError represents a specific configuration problem
type ValidationError struct {
	Field   string `json:"field"`
	Value   string `json:"value"`
	Message string `json:"message"`
}

// SyncStatus represents the reliability and versioning tracking of sources.toml
type SyncStatus struct {
	ConfigVersion      int               `json:"config_version"`
	LastSyncAt         time.Time         `json:"last_sync_at"`
	Status             string            `json:"status"` // "synced", "failed", "pending"
	ActiveSourcesCount int               `json:"active_sources_count"`
	ActivePoolsCount   int               `json:"active_pools_count"`
	ConfigHash         string            `json:"config_hash"`
	LastBackupPath     string            `json:"last_backup_path,omitempty"`
	LastError          string            `json:"last_error,omitempty"`
	ValidationErrors   []ValidationError `json:"validation_errors,omitempty"`
}

type Manager struct {
	mu         sync.RWMutex
	status     SyncStatus
	syncPaths  []string
	localAddrs map[string]bool
}

var (
	defaultManager *Manager
	once           sync.Once
)

func GetManager() *Manager {
	once.Do(func() {
		defaultManager = &Manager{
			syncPaths: []string{
				"/app/policy/sources.toml",
				"../deploy/docker/policy/sources.toml",
				"deploy/docker/policy/sources.toml",
				"/home/rahul/Desktop/mailops/deploy/docker/policy/sources.toml",
			},
			status: SyncStatus{
				Status: "pending",
			},
			localAddrs: make(map[string]bool),
		}
		defaultManager.refreshLocalInterfaces()
	})
	return defaultManager
}

// refreshLocalInterfaces discovers all local network interface addresses
func (m *Manager) refreshLocalInterfaces() {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return
	}
	m.localAddrs = make(map[string]bool)
	for _, a := range addrs {
		if ipNet, ok := a.(*net.IPNet); ok {
			m.localAddrs[ipNet.IP.String()] = true
		}
	}
}

// ValidateIPConfig thoroughly checks IP syntax, weight rules, and pool memberships
func (m *Manager) ValidateIPConfig(ips map[string]models.SendingIP, pools map[string]models.IPPool) []ValidationError {
	var errs []ValidationError

	for ipStr, ipObj := range ips {
		parsed := net.ParseIP(ipStr)
		if parsed == nil {
			errs = append(errs, ValidationError{
				Field:   "ip_address",
				Value:   ipStr,
				Message: "Malformed or invalid IPv4/IPv6 address syntax",
			})
			continue
		}

		if ipObj.Weight < 0 {
			errs = append(errs, ValidationError{
				Field:   fmt.Sprintf("ip[%s].weight", ipStr),
				Value:   fmt.Sprintf("%.0f", ipObj.Weight),
				Message: "IP weight must be a non-negative integer",
			})
		}
	}

	for poolKey, poolObj := range pools {
		pName := poolObj.Name
		if pName == "" {
			pName = poolKey
		}
		if strings.TrimSpace(pName) == "" {
			errs = append(errs, ValidationError{
				Field:   "pool_name",
				Value:   poolKey,
				Message: "Pool name cannot be empty",
			})
		}

		for _, assignedIP := range poolObj.IPs {
			if _, exists := ips[assignedIP]; !exists && net.ParseIP(assignedIP) == nil {
				errs = append(errs, ValidationError{
					Field:   fmt.Sprintf("pool[%s].ips", pName),
					Value:   assignedIP,
					Message: "Assigned IP is not defined in registered sending IPs",
				})
			}
		}
	}

	return errs
}

// FormatSourceName creates a TOML-safe identifier for both IPv4 and IPv6
func FormatSourceName(ipStr string) string {
	clean := strings.ReplaceAll(ipStr, ".", "-")
	clean = strings.ReplaceAll(clean, ":", "-")
	return fmt.Sprintf("src-%s", clean)
}

// GenerateSourcesToml builds the KumoMTA sources and pools configuration string
func (m *Manager) GenerateSourcesToml(ips map[string]models.SendingIP, pools map[string]models.IPPool) string {
	var sb strings.Builder

	sb.WriteString("# MailOps KumoMTA Outbound Sources & Multi-IP Pools Configuration\n")
	sb.WriteString(fmt.Sprintf("# Generated: %s\n\n", time.Now().UTC().Format(time.RFC3339)))

	// 1. Default fallback source
	sb.WriteString("[source.\"default\"]\n")
	sb.WriteString("source_address = \"0.0.0.0\"\n\n")

	definedSources := make(map[string]bool)
	definedSources["default"] = true

	// 2. Specific Dedicated IPs
	for _, ip := range ips {
		srcName := FormatSourceName(ip.IP)
		sb.WriteString(fmt.Sprintf("[source.%q]\n", srcName))
		sb.WriteString(fmt.Sprintf("source_address = %q\n", ip.IP))
		if ip.ReverseDNS != "" {
			sb.WriteString(fmt.Sprintf("ehlo_domain = %q\n", ip.ReverseDNS))
		}
		sb.WriteString("\n")
		definedSources[srcName] = true
	}

	// 3. Default fallback pool
	sb.WriteString("[pool.\"default\"]\n")
	sb.WriteString("[pool.\"default\".\"default\"]\n")
	sb.WriteString("weight = 1\n\n")

	// 4. Configured Pools
	for _, pool := range pools {
		poolKey := pool.Name
		if poolKey == "" {
			poolKey = pool.ID
		}
		if poolKey == "default" {
			continue
		}

		sb.WriteString(fmt.Sprintf("[pool.%q]\n", poolKey))

		hasEntries := false
		for _, ipStr := range pool.IPs {
			srcName := FormatSourceName(ipStr)
			if !definedSources[srcName] {
				sb.WriteString(fmt.Sprintf("[source.%q]\n", srcName))
				sb.WriteString(fmt.Sprintf("source_address = %q\n\n", ipStr))
				definedSources[srcName] = true
			}

			weight := 1
			if ipObj, ok := ips[ipStr]; ok && ipObj.Weight > 0 {
				weight = int(ipObj.Weight)
			}

			sb.WriteString(fmt.Sprintf("[pool.%q.%q]\n", poolKey, srcName))
			sb.WriteString(fmt.Sprintf("weight = %d\n\n", weight))
			hasEntries = true
		}

		if !hasEntries {
			sb.WriteString(fmt.Sprintf("[pool.%q.\"default\"]\n", poolKey))
			sb.WriteString("weight = 1\n\n")
		}
	}

	return sb.String()
}

// SyncSourcesToml executes atomic writes with backup and rollback guarantees
func (m *Manager) SyncSourcesToml(ips map[string]models.SendingIP, pools map[string]models.IPPool) (*SyncStatus, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Step 1: Pre-validation
	valErrors := m.ValidateIPConfig(ips, pools)
	if len(valErrors) > 0 {
		m.status.Status = "failed"
		m.status.ValidationErrors = valErrors
		m.status.LastError = fmt.Sprintf("Validation failed with %d error(s)", len(valErrors))
		return &m.status, fmt.Errorf("configuration validation failed: %s", valErrors[0].Message)
	}

	// Step 2: Content Generation
	content := m.GenerateSourcesToml(ips, pools)
	h := sha256.Sum256([]byte(content))
	contentHash := hex.EncodeToString(h[:8])

	// If no changes from current synced hash, skip disk churn
	if m.status.Status == "synced" && m.status.ConfigHash == contentHash {
		return &m.status, nil
	}

	// Step 3: Atomic write per target path
	syncedAny := false
	var lastBackup string

	for _, targetPath := range m.syncPaths {
		dir := filepath.Dir(targetPath)
		if _, err := os.Stat(dir); err != nil {
			continue // skip paths whose parent directories don't exist
		}

		tmpPath := targetPath + ".tmp"
		bakPath := targetPath + ".bak"

		// Backup existing working configuration
		if _, err := os.Stat(targetPath); err == nil {
			if err := copyFile(targetPath, bakPath); err == nil {
				lastBackup = bakPath
			}
		}

		// Write to temporary file with sync
		tmpFile, err := os.OpenFile(tmpPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
		if err != nil {
			m.rollback(targetPath, bakPath)
			m.status.Status = "failed"
			m.status.LastError = fmt.Sprintf("failed writing tmp file %s: %v", tmpPath, err)
			return &m.status, err
		}

		if _, err := tmpFile.WriteString(content); err != nil {
			tmpFile.Close()
			os.Remove(tmpPath)
			m.rollback(targetPath, bakPath)
			m.status.Status = "failed"
			m.status.LastError = fmt.Sprintf("write error on %s: %v", tmpPath, err)
			return &m.status, err
		}

		// Flush to physical disk
		_ = tmpFile.Sync()
		tmpFile.Close()

		// Atomic rename
		if err := os.Rename(tmpPath, targetPath); err != nil {
			os.Remove(tmpPath)
			m.rollback(targetPath, bakPath)
			m.status.Status = "failed"
			m.status.LastError = fmt.Sprintf("atomic rename failed for %s: %v", targetPath, err)
			return &m.status, err
		}

		syncedAny = true
	}

	if !syncedAny {
		// Even if external paths didn't match, attempt to write to local deploy path
		localPath := "deploy/docker/policy/sources.toml"
		_ = os.MkdirAll(filepath.Dir(localPath), 0755)
		_ = os.WriteFile(localPath, []byte(content), 0644)
	}

	// Step 4: Update status
	m.status.ConfigVersion++
	m.status.LastSyncAt = time.Now().UTC()
	m.status.Status = "synced"
	m.status.ConfigHash = contentHash
	m.status.ActiveSourcesCount = len(ips)
	m.status.ActivePoolsCount = len(pools)
	m.status.LastBackupPath = lastBackup
	m.status.LastError = ""
	m.status.ValidationErrors = nil

	return &m.status, nil
}

func (m *Manager) rollback(targetPath, bakPath string) {
	if _, err := os.Stat(bakPath); err == nil {
		_ = copyFile(bakPath, targetPath)
	}
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}

func (m *Manager) GetStatus() SyncStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.status
}
