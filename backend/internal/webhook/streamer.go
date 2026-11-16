package webhook

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"mailops.io/backend/internal/models"
	"mailops.io/backend/internal/store"
)

type Streamer struct {
	store           *store.Store
	client          *http.Client
	totalDispatched int64
	totalFailed     int64
	mu              sync.RWMutex
}

func NewStreamer(s *store.Store) *Streamer {
	return &Streamer{
		store: s,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// GenerateWebhookSecret creates a secure signing key for HMAC-SHA256 signatures
func GenerateWebhookSecret() string {
	b := make([]byte, 24)
	_, _ = rand.Read(b)
	return fmt.Sprintf("whsec_%s", hex.EncodeToString(b))
}

// DispatchEvent distributes an event payload to all matching active webhook subscriptions
func (st *Streamer) DispatchEvent(event models.EventWebhookPayload) {
	if event.EventID == "" {
		b := make([]byte, 12)
		_, _ = rand.Read(b)
		event.EventID = fmt.Sprintf("evt_%s", hex.EncodeToString(b))
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}

	subscriptions := st.store.GetWebhookSubscriptions()
	for _, sub := range subscriptions {
		if sub.Status != "active" {
			continue
		}

		// Check if subscription matches event type
		matches := false
		for _, e := range sub.Events {
			if e == "*" || e == event.EventType {
				matches = true
				break
			}
		}
		if !matches {
			continue
		}

		// Dispatch async
		go st.sendWebhookWithRetry(sub, event)
	}

	// Record in store log
	st.store.RecordWebhookLog(event)
}

func (st *Streamer) sendWebhookWithRetry(sub models.WebhookSubscription, event models.EventWebhookPayload) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}

	timestamp := time.Now().Unix()
	payloadToSign := fmt.Sprintf("%d.%s", timestamp, string(data))
	h := hmac.New(sha256.New, []byte(sub.Secret))
	h.Write([]byte(payloadToSign))
	sig := hex.EncodeToString(h.Sum(nil))
	signatureHeader := fmt.Sprintf("t=%d,v1=%s", timestamp, sig)

	maxAttempts := 3
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		req, err := http.NewRequest("POST", sub.URL, bytes.NewBuffer(data))
		if err != nil {
			break
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("User-Agent", "MailOps-EventStreamer/2.0")
		req.Header.Set("X-Mailops-Signature", signatureHeader)
		req.Header.Set("X-Mailops-Event", event.EventType)
		req.Header.Set("X-Mailops-Delivery", event.EventID)

		resp, err := st.client.Do(req)
		if err == nil && resp.StatusCode >= 200 && resp.StatusCode < 300 {
			_ = resp.Body.Close()
			atomic.AddInt64(&st.totalDispatched, 1)
			return
		}

		if resp != nil {
			_ = resp.Body.Close()
		}

		if attempt < maxAttempts {
			time.Sleep(time.Duration(attempt*500) * time.Millisecond)
		}
	}

	atomic.AddInt64(&st.totalFailed, 1)
}

// GetStats returns aggregate webhook delivery statistics
func (st *Streamer) GetStats() models.WebhookStats {
	subs := st.store.GetWebhookSubscriptions()
	active := 0
	for _, s := range subs {
		if s.Status == "active" {
			active++
		}
	}
	return models.WebhookStats{
		TotalSubscriptions:  len(subs),
		ActiveSubscriptions: active,
		TotalDispatched:     atomic.LoadInt64(&st.totalDispatched),
		TotalFailed:         atomic.LoadInt64(&st.totalFailed),
	}
}
