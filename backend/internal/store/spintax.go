package store

import (
	"hash/fnv"
	"math/rand"
	"regexp"
	"strings"
)

var spintaxRegex = regexp.MustCompile(`\{([^{}]+)\}`)

// seedHash computes a deterministic integer hash from a string seed (e.g. email)
func seedHash(seed string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(seed))
	return h.Sum64()
}

// RenderSpintax parses spintax expressions like {Hi|Hello|Hey} into a deterministic or random choice
func RenderSpintax(text string, seed string) string {
	if text == "" || !strings.Contains(text, "{") {
		return text
	}

	result := text
	var counter uint64
	if seed != "" {
		counter = seedHash(seed)
	}

	// Iterate to resolve nested or chained spintax
	maxPasses := 10
	for i := 0; i < maxPasses; i++ {
		matched := spintaxRegex.FindAllStringSubmatchIndex(result, -1)
		if len(matched) == 0 {
			break
		}

		result = spintaxRegex.ReplaceAllStringFunc(result, func(m string) string {
			// Strip leading { and trailing }
			inner := m[1 : len(m)-1]
			choices := strings.Split(inner, "|")
			if len(choices) == 0 {
				return ""
			}

			var selectedIdx int
			if seed != "" {
				counter = (counter*6364136223846793005 + 1442695040888963407) // 64-bit LCG step
				selectedIdx = int(counter % uint64(len(choices)))
			} else {
				selectedIdx = rand.Intn(len(choices))
			}
			return choices[selectedIdx]
		})
	}

	return result
}

// CountSpintaxVariations calculates total unique permutations across all spintax groups
func CountSpintaxVariations(text string) int {
	if text == "" {
		return 1
	}

	matches := spintaxRegex.FindAllStringSubmatch(text, -1)
	if len(matches) == 0 {
		return 1
	}

	total := 1
	for _, m := range matches {
		if len(m) > 1 {
			choices := strings.Split(m[1], "|")
			if len(choices) > 0 {
				total *= len(choices)
			}
		}
	}
	return total
}
