package kumomta

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var (
	scheduledCountRegex = regexp.MustCompile(`^scheduled_count\{queue="([^"]+)"\}\s+([0-9]+)`)
)

// SuspendRule details an active administrative queue suspension in KumoMTA
type SuspendRule struct {
	ID       string `json:"id"`
	Campaign string `json:"campaign,omitempty"`
	Tenant   string `json:"tenant,omitempty"`
	Domain   string `json:"domain"`
	Reason   string `json:"reason"`
	Duration string `json:"duration"`
}

// BounceRule details an administrative bounce in effect in KumoMTA
type BounceRule struct {
	ID       string `json:"id"`
	Campaign string `json:"campaign,omitempty"`
	Tenant   string `json:"tenant,omitempty"`
	Domain   string `json:"domain"`
	Reason   string `json:"reason"`
	Duration string `json:"duration"`
}

// LiveScheduledQueue represents an active RocksDB scheduled queue in KumoMTA
type LiveScheduledQueue struct {
	QueueName string `json:"queue_name"`
	Domain    string `json:"domain"`
	Count     int    `json:"count"`
}

// AdminClient communicates with KumoMTA's native HTTP administration listener
type AdminClient struct {
	baseURL    string
	httpClient *http.Client
}

// NewAdminClient initializes the client with proper endpoint resolution
func NewAdminClient() *AdminClient {
	endpoint := os.Getenv("KUMO_HTTP_URL")
	if endpoint == "" {
		endpoint = "http://mailops-mta:8000"
	}
	return &AdminClient{
		baseURL: strings.TrimRight(endpoint, "/"),
		httpClient: &http.Client{
			Timeout: 4 * time.Second,
		},
	}
}

// SetBaseURL overrides the target KumoMTA HTTP host (useful for local fallback)
func (c *AdminClient) SetBaseURL(url string) {
	c.baseURL = strings.TrimRight(url, "/")
}

// ListSuspensions queries KumoMTA for all active queue suspensions
func (c *AdminClient) ListSuspensions(ctx context.Context) ([]SuspendRule, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/api/admin/suspend/v1", c.baseURL), nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("kumomta error: HTTP %d", resp.StatusCode)
	}

	var rules []SuspendRule
	if err := json.NewDecoder(resp.Body).Decode(&rules); err != nil {
		return nil, err
	}
	return rules, nil
}

// SuspendDomain places an administrative freeze on outgoing deliveries to a destination domain
func (c *AdminClient) SuspendDomain(ctx context.Context, domain, reason, duration string) (*SuspendRule, error) {
	if duration == "" {
		duration = "1h"
	}
	if reason == "" {
		reason = "Administratively suspended via MailOps Control Plane"
	}

	payload := map[string]string{
		"domain":   domain,
		"reason":   reason,
		"duration": duration,
	}
	bodyBytes, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/api/admin/suspend/v1", c.baseURL), bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("kumomta suspend error: HTTP %d", resp.StatusCode)
	}

	var res struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	return &SuspendRule{
		ID:       res.ID,
		Domain:   domain,
		Reason:   reason,
		Duration: duration,
	}, nil
}

// ResumeDomain lifts any active suspension for a domain
func (c *AdminClient) ResumeDomain(ctx context.Context, domain string) error {
	rules, err := c.ListSuspensions(ctx)
	if err != nil {
		return err
	}

	for _, r := range rules {
		if strings.EqualFold(r.Domain, domain) || r.Domain == "" {
			delPayload := map[string]string{"id": r.ID}
			delBytes, _ := json.Marshal(delPayload)

			delReq, _ := http.NewRequestWithContext(ctx, "DELETE", fmt.Sprintf("%s/api/admin/suspend/v1", c.baseURL), bytes.NewReader(delBytes))
			delReq.Header.Set("Content-Type", "application/json")
			resp, err := c.httpClient.Do(delReq)
			if err == nil {
				resp.Body.Close()
			}
		}
	}
	return nil
}

// BounceDomain administratively purges / bounces messages in a queue
func (c *AdminClient) BounceDomain(ctx context.Context, domain, reason, duration string) (*BounceRule, error) {
	if duration == "" {
		duration = "5m"
	}
	if reason == "" {
		reason = "Administratively bounced via MailOps Control Plane"
	}

	payload := map[string]string{
		"domain":   domain,
		"reason":   reason,
		"duration": duration,
	}
	bodyBytes, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/api/admin/bounce/v1", c.baseURL), bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("kumomta bounce error: HTTP %d", resp.StatusCode)
	}

	var res struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	return &BounceRule{
		ID:       res.ID,
		Domain:   domain,
		Reason:   reason,
		Duration: duration,
	}, nil
}

// ListBounces returns active administrative bounce directives in KumoMTA
func (c *AdminClient) ListBounces(ctx context.Context) ([]BounceRule, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/api/admin/bounce/v1", c.baseURL), nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("kumomta error: HTTP %d", resp.StatusCode)
	}

	var rules []BounceRule
	if err := json.NewDecoder(resp.Body).Decode(&rules); err != nil {
		return nil, err
	}
	return rules, nil
}

// GetLiveScheduledQueues reads real RocksDB queue sizes directly from KumoMTA metrics
func (c *AdminClient) GetLiveScheduledQueues(ctx context.Context) ([]LiveScheduledQueue, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/metrics", c.baseURL), nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("kumomta metrics error: HTTP %d", resp.StatusCode)
	}

	var queues []LiveScheduledQueue
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		matches := scheduledCountRegex.FindStringSubmatch(line)
		if len(matches) == 3 {
			queueName := matches[1]
			count, _ := strconv.Atoi(matches[2])

			// Extract destination domain part
			domainPart := queueName
			if idx := strings.Index(queueName, "@"); idx != -1 {
				domainPart = queueName[idx+1:]
			}
			if idx := strings.Index(domainPart, "!"); idx != -1 {
				domainPart = domainPart[idx+1:]
			}

			queues = append(queues, LiveScheduledQueue{
				QueueName: queueName,
				Domain:    domainPart,
				Count:     count,
			})
		}
	}

	return queues, nil
}
