package ipdetect

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestIsPublicIP(t *testing.T) {
	tests := []struct {
		ip       string
		isPublic bool
	}{
		{"127.0.0.1", false},
		{"10.0.0.1", false},
		{"192.168.1.1", false},
		{"172.16.0.1", false},
		{"169.254.1.1", false},
		{"100.64.0.1", false},  // Carrier Grade NAT
		{"192.0.2.1", false},   // RFC 5737 doc
		{"::1", false},         // IPv6 loopback
		{"fe80::1", false},     // IPv6 link local
		{"fc00::1", false},     // IPv6 unique local
		{"8.8.8.8", true},      // Public IPv4
		{"1.1.1.1", true},      // Public IPv4
		{"142.250.190.46", true}, // Public Google IPv4
		{"2607:f8b0:4005:805::200e", true}, // Public IPv6
	}

	for _, tt := range tests {
		parsed := net.ParseIP(tt.ip)
		if parsed == nil {
			t.Fatalf("Failed to parse test IP %s", tt.ip)
		}
		got := IsPublicIP(parsed)
		if got != tt.isPublic {
			t.Errorf("IsPublicIP(%s) = %v; expected %v", tt.ip, got, tt.isPublic)
		}
	}
}

func TestExplicitEnvPriority(t *testing.T) {
	os.Setenv("PUBLIC_IP", "198.51.100.1") // Even if doc IP, let's test a valid public IP
	os.Setenv("PUBLIC_IP", "93.184.216.34") // example.com public IP
	defer os.Unsetenv("PUBLIC_IP")

	detector := NewDetector()
	info, err := detector.Detect(context.Background(), []string{"8.8.8.8"}, "example.com", true)
	if err != nil {
		t.Fatalf("Detect returned unexpected error: %v", err)
	}

	if info.PublicIP != "93.184.216.34" {
		t.Errorf("Expected public IP from ENV (93.184.216.34), got %s", info.PublicIP)
	}
	if info.DetectionSource != "environment_variable" {
		t.Errorf("Expected detection source 'environment_variable', got %s", info.DetectionSource)
	}
	if !info.IsExplicit {
		t.Errorf("Expected IsExplicit to be true for environment variable")
	}
}

func TestConsensusProviders(t *testing.T) {
	os.Unsetenv("PUBLIC_IP")

	// Mock server 1: returns 151.101.1.140
	s1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("151.101.1.140\n"))
	}))
	defer s1.Close()

	// Mock server 2: returns 151.101.1.140
	s2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(" 151.101.1.140 "))
	}))
	defer s2.Close()

	// Mock server 3: returns a private IP (must be rejected!)
	s3 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("192.168.1.55"))
	}))
	defer s3.Close()

	providers := []Provider{
		{Name: "mock1", URL: s1.URL},
		{Name: "mock2", URL: s2.URL},
		{Name: "mock-private", URL: s3.URL},
	}

	detector := NewDetector(providers...)
	info, err := detector.Detect(context.Background(), nil, "company.io", true)
	if err != nil {
		t.Fatalf("Detect failed: %v", err)
	}

	if info.PublicIP != "151.101.1.140" {
		t.Errorf("Expected consensus IP 151.101.1.140, got %s", info.PublicIP)
	}
	if info.DetectionSource != "provider_consensus" {
		t.Errorf("Expected detection source 'provider_consensus', got %s", info.DetectionSource)
	}
	if len(info.ProviderAgreed) < 2 {
		t.Errorf("Expected at least 2 agreed providers, got %v", info.ProviderAgreed)
	}
	if info.SuggestedSPF != "v=spf1 ip4:151.101.1.140 ~all" {
		t.Errorf("Unexpected SPF suggestion: %s", info.SuggestedSPF)
	}
}
