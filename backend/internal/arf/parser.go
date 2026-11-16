package arf

import (
	"regexp"
	"strings"
	"time"

	"mailops.io/backend/internal/models"
)

var (
	reFeedbackType    = regexp.MustCompile(`(?i)(?:Feedback-Type|X-Feedback-Type):\s*([a-zA-Z0-9_-]+)`)
	reOriginalRcpt    = regexp.MustCompile(`(?i)(?:Original-Rcpt-To|Original-Recipient):\s*(?:rfc822;\s*)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?`)
	reOriginalFrom    = regexp.MustCompile(`(?i)(?:Original-Mail-From|Original-Sender):\s*<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?`)
	reUserAgent       = regexp.MustCompile(`(?i)(?:User-Agent|X-Loop-Agent|X-Feedback-Agent):\s*([^\r\n]+)`)
	reReportingMTA    = regexp.MustCompile(`(?i)(?:Reporting-MTA):\s*(?:dns;\s*)?([^\r\n]+)`)
	reOriginalMsgID   = regexp.MustCompile(`(?i)(?:Original-Message-ID|X-Original-Message-ID):\s*([^\r\n]+)`)
	reArrivalDate     = regexp.MustCompile(`(?i)(?:Arrival-Date):\s*([^\r\n]+)`)
	reARFSubject      = regexp.MustCompile(`(?i)(?:complaint about message|feedback report|abuse report|email feedback loop|spam complaint)`)
	reARFContentType  = regexp.MustCompile(`(?i)(?:multipart/report;\s*report-type=feedback-report|message/feedback-report)`)
)

// IsARFReport returns true if the incoming email matches RFC 5965 ARF criteria
func IsARFReport(contentType, subject, body, rawMIME string) bool {
	combined := contentType + "\n" + subject + "\n" + body + "\n" + rawMIME
	if reARFContentType.MatchString(combined) {
		return true
	}
	if reFeedbackType.MatchString(combined) && (reOriginalRcpt.MatchString(combined) || reOriginalFrom.MatchString(combined)) {
		return true
	}
	if reARFSubject.MatchString(subject) && reFeedbackType.MatchString(combined) {
		return true
	}
	return false
}

// ParseARFReport extracts RFC 5965 fields and returns an ARFReportDetails structure
func ParseARFReport(rawMessage, contentType, subject, body string) *models.ARFReportDetails {
	combined := rawMessage + "\n" + contentType + "\n" + subject + "\n" + body

	feedbackType := "abuse"
	if m := reFeedbackType.FindStringSubmatch(combined); len(m) > 1 {
		feedbackType = strings.ToLower(strings.TrimSpace(m[1]))
	}

	userAgent := "Generic RFC 5965 Feedback Loop"
	if m := reUserAgent.FindStringSubmatch(combined); len(m) > 1 {
		userAgent = strings.TrimSpace(m[1])
	} else {
		// Fingerprint common providers
		lowerCombined := strings.ToLower(combined)
		if strings.Contains(lowerCombined, "yahoo") {
			userAgent = "Yahoo! Mail CFL (Complaints Feedback Loop)"
		} else if strings.Contains(lowerCombined, "microsoft") || strings.Contains(lowerCombined, "hotmail") || strings.Contains(lowerCombined, "outlook") {
			userAgent = "Microsoft SNDS / JMRP (Junk Mail Reporting Program)"
		} else if strings.Contains(lowerCombined, "apple") || strings.Contains(lowerCombined, "icloud") {
			userAgent = "Apple iCloud Postmaster Feedback"
		} else if strings.Contains(lowerCombined, "comcast") {
			userAgent = "Comcast Xfinity Feedback Loop"
		}
	}

	originalRcpt := ""
	if m := reOriginalRcpt.FindStringSubmatch(combined); len(m) > 1 {
		originalRcpt = strings.ToLower(strings.TrimSpace(m[1]))
	}

	originalFrom := ""
	if m := reOriginalFrom.FindStringSubmatch(combined); len(m) > 1 {
		originalFrom = strings.ToLower(strings.TrimSpace(m[1]))
	}

	originalMsgID := ""
	if m := reOriginalMsgID.FindStringSubmatch(combined); len(m) > 1 {
		originalMsgID = strings.TrimSpace(m[1])
	}

	reportingMTA := ""
	if m := reReportingMTA.FindStringSubmatch(combined); len(m) > 1 {
		reportingMTA = strings.TrimSpace(m[1])
	}

	arrivalDate := time.Now().UTC()
	if m := reArrivalDate.FindStringSubmatch(combined); len(m) > 1 {
		dateStr := strings.TrimSpace(m[1])
		if parsed, err := time.Parse(time.RFC1123Z, dateStr); err == nil {
			arrivalDate = parsed
		} else if parsed, err := time.Parse(time.RFC1123, dateStr); err == nil {
			arrivalDate = parsed
		}
	}

	return &models.ARFReportDetails{
		FeedbackType:      feedbackType,
		UserAgent:         userAgent,
		OriginalRecipient: originalRcpt,
		OriginalMailFrom:  originalFrom,
		OriginalMessageID: originalMsgID,
		ArrivalDate:       arrivalDate,
		ReportingMTA:      reportingMTA,
		AutoSuppressed:    false,
	}
}
