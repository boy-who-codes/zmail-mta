package store

import (
	"testing"
)

func TestSpintaxVariations(t *testing.T) {
	template := "{Hi|Hello|Hey} Alex, {I noticed|I saw} your company {Acme|Globex}."
	
	// Count variations
	variations := CountSpintaxVariations(template)
	if variations != 12 { // 3 * 2 * 2 = 12
		t.Fatalf("expected 12 variations, got %d", variations)
	}

	// Deterministic parsing
	seed1 := "alex@acme.com"
	res1 := RenderSpintax(template, seed1)
	res2 := RenderSpintax(template, seed1)

	if res1 != res2 {
		t.Fatalf("expected deterministic output for identical seed, got '%s' vs '%s'", res1, res2)
	}

	if len(res1) == 0 {
		t.Fatalf("rendered output was empty")
	}
}
