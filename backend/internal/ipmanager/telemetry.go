package ipmanager

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// DeliveryLogRecord matches KumoMTA's structured log schema
type DeliveryLogRecord struct {
	Type          string          `json:"type"` // "Delivery", "Bounce", "TransientFailure", "Reception"
	ID            string          `json:"id"`
	Sender        string          `json:"sender"`
	Recipient     string          `json:"recipient"`
	Queue         string          `json:"queue"`
	EgressPool    string          `json:"egress_pool"`
	EgressSource  string          `json:"egress_source"`
	SourceAddress *LogSocketAddr  `json:"source_address"`
	PeerAddress   *LogSocketAddr  `json:"peer_address"`
	Response      *LogResponse    `json:"response"`
	Timestamp     int64           `json:"timestamp"`
	EventTime     string          `json:"event_time"`
	DeliveryProto string          `json:"delivery_protocol"`
}

type LogSocketAddr struct {
	Address string `json:"address"`
	Port    int    `json:"port"`
}

type LogResponse struct {
	Code         int    `json:"code"`
	EnhancedCode any    `json:"enhanced_code"`
	Content      string `json:"content"`
}

// IPStats contains metrics for a specific source IP
type IPStats struct {
	IP               string    `json:"ip"`
	Pool             string    `json:"pool"`
	TotalSent        int64     `json:"total_sent"`
	TotalDelivered   int64     `json:"total_delivered"`
	TotalTransient   int64     `json:"total_transient"`
	TotalBounced     int64     `json:"total_bounced"`
	LastEventAt      time.Time `json:"last_event_at"`
	ActualBoundCount int64     `json:"actual_bound_count"`
	BindingFailures  int64     `json:"binding_failures"`
	SelectionShare   float64   `json:"selection_share_pct"`
}

// PoolStats contains aggregated telemetry for an IP Pool
type PoolStats struct {
	PoolName       string             `json:"pool_name"`
	TotalMessages  int64              `json:"total_messages"`
	Delivered      int64              `json:"delivered"`
	TransientFail  int64              `json:"transient_fail"`
	PermanentFail  int64              `json:"permanent_fail"`
	IPDistribution map[string]float64 `json:"ip_distribution_pct"`
}

// OutboundTelemetry is the comprehensive response model for Phase 2 telemetry
type OutboundTelemetry struct {
	AnalyzedAt          time.Time            `json:"analyzed_at"`
	TotalRecordsParsed  int64                `json:"total_records_parsed"`
	IPMetrics           map[string]*IPStats  `json:"ip_metrics"`
	PoolMetrics         map[string]*PoolStats `json:"pool_metrics"`
	RecentDeliveries    []DeliveryLogRecord  `json:"recent_deliveries"`
	VerificationSummary struct {
		DistinctBoundIPs  []string `json:"distinct_bound_ips"`
		AllIPsHealthy     bool     `json:"all_ips_healthy"`
		BindingErrorCount int64    `json:"binding_error_count"`
	} `json:"verification_summary"`
}

type TelemetryCollector struct {
	mu           sync.RWMutex
	logDirs      []string
	cachedReport *OutboundTelemetry
	lastReadAt   time.Time
}

var (
	defaultCollector *TelemetryCollector
	collectorOnce    sync.Once
)

func GetCollector() *TelemetryCollector {
	collectorOnce.Do(func() {
		defaultCollector = &TelemetryCollector{
			logDirs: []string{
				"/var/log/kumomta",
				"/app/logs",
				"deploy/docker/logs",
				"../deploy/docker/logs",
				"/home/rahul/Desktop/mailops/deploy/docker/logs",
			},
		}
	})
	return defaultCollector
}

// CollectTelemetry scans the latest KumoMTA log files and builds real outbound IP statistics
func (tc *TelemetryCollector) CollectTelemetry(maxRecentRecords int) *OutboundTelemetry {
	tc.mu.Lock()
	defer tc.mu.Unlock()

	// Return cached if freshly parsed within 3 seconds
	if tc.cachedReport != nil && time.Since(tc.lastReadAt) < 3*time.Second {
		return tc.cachedReport
	}

	report := &OutboundTelemetry{
		AnalyzedAt:       time.Now().UTC(),
		IPMetrics:        make(map[string]*IPStats),
		PoolMetrics:      make(map[string]*PoolStats),
		RecentDeliveries: make([]DeliveryLogRecord, 0, maxRecentRecords),
	}

	var candidateFiles []string
	for _, dir := range tc.logDirs {
		if entries, err := os.ReadDir(dir); err == nil && len(entries) > 0 {
			for _, e := range entries {
				if !e.IsDir() && !strings.HasPrefix(e.Name(), ".") {
					candidateFiles = append(candidateFiles, filepath.Join(dir, e.Name()))
				}
			}
			if len(candidateFiles) > 0 {
				break
			}
		}
	}

	// Sort files by name / time descending (newest first)
	sort.Slice(candidateFiles, func(i, j int) bool {
		return candidateFiles[i] > candidateFiles[j]
	})

	// Read up to 25 most recent log slices
	limitFiles := 25
	if len(candidateFiles) < limitFiles {
		limitFiles = len(candidateFiles)
	}

	distinctIPs := make(map[string]bool)
	var bindingErrors int64

	for i := 0; i < limitFiles; i++ {
		filePath := candidateFiles[i]
		records := readRecordsFromFile(filePath)
		for _, rec := range records {
			report.TotalRecordsParsed++

			// Identify IP
			ip := "default"
			if rec.EgressSource != "" && rec.EgressSource != "default" {
				ip = strings.TrimPrefix(rec.EgressSource, "src-")
				ip = strings.ReplaceAll(ip, "-", ".")
			}

			// Actual bound connection IP verification
			if rec.SourceAddress != nil && rec.SourceAddress.Address != "" {
				distinctIPs[rec.SourceAddress.Address] = true
			}

			// Track pool stats
			pool := rec.EgressPool
			if pool == "" {
				pool = "default"
			}
			if _, ok := report.PoolMetrics[pool]; !ok {
				report.PoolMetrics[pool] = &PoolStats{
					PoolName:       pool,
					IPDistribution: make(map[string]float64),
				}
			}
			pStat := report.PoolMetrics[pool]
			pStat.TotalMessages++

			// Track IP stats
			if _, ok := report.IPMetrics[ip]; !ok {
				report.IPMetrics[ip] = &IPStats{
					IP:   ip,
					Pool: pool,
				}
			}
			iStat := report.IPMetrics[ip]
			iStat.TotalSent++
			if rec.Timestamp > 0 {
				iStat.LastEventAt = time.Unix(rec.Timestamp, 0)
			}

			// Categorize result
			switch rec.Type {
			case "Delivery":
				pStat.Delivered++
				iStat.TotalDelivered++
				if rec.SourceAddress != nil {
					iStat.ActualBoundCount++
				}
			case "TransientFailure":
				pStat.TransientFail++
				iStat.TotalTransient++
				if rec.Response != nil && strings.Contains(rec.Response.Content, "bind") {
					iStat.BindingFailures++
					bindingErrors++
				}
			case "Bounce":
				pStat.PermanentFail++
				iStat.TotalBounced++
			}

			// Keep recent deliveries buffer
			if len(report.RecentDeliveries) < maxRecentRecords {
				report.RecentDeliveries = append(report.RecentDeliveries, rec)
			}
		}
	}

	// Calculate percentage distribution shares
	for _, pStat := range report.PoolMetrics {
		if pStat.TotalMessages > 0 {
			for ip, iStat := range report.IPMetrics {
				if iStat.Pool == pStat.PoolName {
					share := (float64(iStat.TotalSent) / float64(pStat.TotalMessages)) * 100.0
					pStat.IPDistribution[ip] = share
					iStat.SelectionShare = share
				}
			}
		}
	}

	for k := range distinctIPs {
		report.VerificationSummary.DistinctBoundIPs = append(report.VerificationSummary.DistinctBoundIPs, k)
	}
	report.VerificationSummary.BindingErrorCount = bindingErrors
	report.VerificationSummary.AllIPsHealthy = bindingErrors == 0

	tc.cachedReport = report
	tc.lastReadAt = time.Now()
	return report
}

func readRecordsFromFile(filePath string) []DeliveryLogRecord {
	var records []DeliveryLogRecord

	fileBytes, err := os.ReadFile(filePath)
	if err != nil || len(fileBytes) == 0 {
		return records
	}

	var reader io.Reader
	// Check if file is zstd compressed (magic header: 0x28, 0xB5, 0x2F, 0xFD)
	if len(fileBytes) > 4 && fileBytes[0] == 0x28 && fileBytes[1] == 0xB5 && fileBytes[2] == 0x2F && fileBytes[3] == 0xFD {
		// Attempt decompression via local zstd command if installed
		cmd := exec.Command("zstd", "-dc", filePath)
		decompressed, err := cmd.Output()
		if err == nil {
			reader = bytes.NewReader(decompressed)
		} else {
			return records
		}
	} else {
		reader = bytes.NewReader(fileBytes)
	}

	scanner := bufio.NewScanner(reader)
	// Some log lines can be large with RFC headers
	buf := make([]byte, 0, 1024*1024)
	scanner.Buffer(buf, 10*1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		var rec DeliveryLogRecord
		if err := json.Unmarshal(line, &rec); err == nil {
			records = append(records, rec)
		}
	}

	return records
}
