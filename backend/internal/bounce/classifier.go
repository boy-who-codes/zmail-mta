package bounce

import (
	"regexp"
	"strings"

	"mailops.io/backend/internal/models"
)

var (
	enhancedStatusRegex = regexp.MustCompile(`\b([45]\.[0-9]\.[0-9]{1,3})\b`)
	smtpReplyCodeRegex  = regexp.MustCompile(`\b([45][0-9]{2})\b`)
)

type ClassificationResult struct {
	StatusCode         string
	BounceClass        string
	Provider           string
	Description        string
	ShouldAutoSuppress bool
}

// ClassifyBounce performs RFC 3463 and provider pattern analysis on raw MTA bounce responses
func ClassifyBounce(rawResponse, recipient string) ClassificationResult {
	lower := strings.ToLower(rawResponse)
	recDomain := ""
	if parts := strings.Split(recipient, "@"); len(parts) == 2 {
		recDomain = strings.ToLower(parts[1])
	}

	// 1. Identify Provider
	provider := "generic"
	if strings.Contains(recDomain, "gmail") || strings.Contains(recDomain, "google") || strings.Contains(lower, "google.com") || strings.Contains(lower, "gmail") {
		provider = "google"
	} else if strings.Contains(recDomain, "yahoo") || strings.Contains(recDomain, "aol") || strings.Contains(lower, "yahoo.com") || strings.Contains(lower, "aol.com") {
		provider = "yahoo"
	} else if strings.Contains(recDomain, "outlook") || strings.Contains(recDomain, "hotmail") || strings.Contains(recDomain, "live") || strings.Contains(lower, "protection.outlook.com") {
		provider = "outlook"
	} else if strings.Contains(recDomain, "icloud") || strings.Contains(recDomain, "apple") || strings.Contains(lower, "apple.com") {
		provider = "apple"
	}

	// 2. Extract Enhanced Status Code (e.g. 5.1.1, 5.7.1, 4.7.28)
	statusCode := ""
	if match := enhancedStatusRegex.FindStringSubmatch(rawResponse); len(match) > 1 {
		statusCode = match[1]
	} else if match := smtpReplyCodeRegex.FindStringSubmatch(rawResponse); len(match) > 1 {
		statusCode = match[1]
	} else {
		statusCode = "5.0.0"
	}

	// 3. Classify based on RFC codes & semantic keywords
	// A. Hard Bounce (User Unknown / Mailbox Dead)
	isHardBounce := strings.HasPrefix(statusCode, "5.1.") ||
		strings.Contains(lower, "user unknown") ||
		strings.Contains(lower, "no such user") ||
		strings.Contains(lower, "recipient address rejected") ||
		strings.Contains(lower, "does not exist") ||
		strings.Contains(lower, "mailbox unavailable") ||
		strings.Contains(lower, "invalid recipient") ||
		strings.Contains(lower, "address rejected") ||
		strings.Contains(lower, "account has been disabled") ||
		strings.Contains(lower, "doesn't have a yahoo")

	if isHardBounce {
		return ClassificationResult{
			StatusCode:         statusCode,
			BounceClass:        "hard_bounce",
			Provider:           provider,
			Description:        "Permanent failure: Recipient mailbox does not exist or was disabled",
			ShouldAutoSuppress: true,
		}
	}

	// B. Spam Complaint / FBL
	if strings.Contains(lower, "abuse report") || strings.Contains(lower, "feedback loop") || strings.Contains(lower, "complaint") {
		return ClassificationResult{
			StatusCode:         "5.7.1",
			BounceClass:        "fbl_complaint",
			Provider:           provider,
			Description:        "Abuse complaint: Recipient marked email as spam via ISP Feedback Loop",
			ShouldAutoSuppress: true,
		}
	}

	// C. Spam Filter / Reputation Block
	isSpamBlock := strings.HasPrefix(statusCode, "5.7.") ||
		strings.Contains(lower, "blocked using") ||
		strings.Contains(lower, "spamhaus") ||
		strings.Contains(lower, "barracuda") ||
		strings.Contains(lower, "reputation") ||
		strings.Contains(lower, "unsolicited mail") ||
		strings.Contains(lower, "spam detected") ||
		strings.Contains(lower, "policy reject") ||
		strings.Contains(lower, "dmarc policy") ||
		strings.Contains(lower, "spf check failed")

	if isSpamBlock {
		return ClassificationResult{
			StatusCode:         statusCode,
			BounceClass:        "spam_block",
			Provider:           provider,
			Description:        "Policy block: Email refused by receiver spam filter or IP reputation threshold",
			ShouldAutoSuppress: false,
		}
	}

	// D. Soft Bounce (Mailbox Full / Quota)
	isSoftBounce := strings.HasPrefix(statusCode, "4.2.2") ||
		strings.HasPrefix(statusCode, "5.2.2") ||
		strings.Contains(lower, "mailbox full") ||
		strings.Contains(lower, "quota exceeded") ||
		strings.Contains(lower, "storage limit") ||
		strings.Contains(lower, "over quota")

	if isSoftBounce {
		return ClassificationResult{
			StatusCode:         statusCode,
			BounceClass:        "soft_bounce",
			Provider:           provider,
			Description:        "Temporary failure: Recipient storage quota full",
			ShouldAutoSuppress: false,
		}
	}

	// E. Greylisted / Rate-limited / Delayed
	isGreylisted := strings.HasPrefix(statusCode, "4.") ||
		strings.Contains(lower, "greylist") ||
		strings.Contains(lower, "try again") ||
		strings.Contains(lower, "too many connections") ||
		strings.Contains(lower, "rate limit") ||
		strings.Contains(lower, "timeout")

	if isGreylisted {
		return ClassificationResult{
			StatusCode:         statusCode,
			BounceClass:        "greylisted",
			Provider:           provider,
			Description:        "Transient delay: Receiver requested retry or enforced temporary connection rate limit",
			ShouldAutoSuppress: false,
		}
	}

	// Default fallback
	return ClassificationResult{
		StatusCode:         statusCode,
		BounceClass:        "hard_bounce",
		Provider:           provider,
		Description:        "Permanent error: Delivery rejected by destination server",
		ShouldAutoSuppress: true,
	}
}

// MapToBounceRecord maps an analyzed result to a persistent model
func MapToBounceRecord(id, recipient, sender, egressIP, rawResponse string) models.BounceRecord {
	c := ClassifyBounce(rawResponse, recipient)
	domain := ""
	if parts := strings.Split(recipient, "@"); len(parts) == 2 {
		domain = parts[1]
	}

	return models.BounceRecord{
		ID:             id,
		Recipient:      recipient,
		Sender:         sender,
		Domain:         domain,
		EgressIP:       egressIP,
		StatusCode:     c.StatusCode,
		BounceClass:    c.BounceClass,
		RawResponse:    rawResponse,
		Provider:       c.Provider,
		AutoSuppressed: c.ShouldAutoSuppress,
	}
}
