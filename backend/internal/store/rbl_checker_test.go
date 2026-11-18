package store

import (
	"testing"
)

func TestCheckTargetRBL(t *testing.T) {
	// 127.0.0.1 or safe test domain
	res := CheckTargetRBL("mailops.io", "domain")
	if res.Target != "mailops.io" {
		t.Fatalf("expected target to be mailops.io, got %s", res.Target)
	}
	if res.TotalChecked == 0 {
		t.Fatalf("expected at least 1 provider checked")
	}
	if res.ReputationScore < 0 || res.ReputationScore > 100 {
		t.Fatalf("expected reputation score between 0 and 100, got %d", res.ReputationScore)
	}
}
