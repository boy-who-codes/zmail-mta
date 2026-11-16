# MAILOPS Customer-Facing Terminology Dictionary

This dictionary defines the standard customer-facing language for MAILOPS. All user interface screens, documentation, buttons, notifications, and customer-facing reports must follow these conventions.

---

## 1. Core Platform Terminology

| Avoid (Technical / Internal Jargon) | Use (Customer-Facing Business Language) | Why |
| :--- | :--- | :--- |
| KumoMTA Delivery Server / Spool Engine | **Mail Server & Delivery Queues** | Customers think in terms of sending email and outgoing queues. |
| Double Ledger | **Sending & Delivery Records** | Plain accounting of what was sent vs. confirmed. |
| Execution Engine / Delivery Pipeline | **Sending Process / Workflow** | Focuses on the action rather than internal workers. |
| Idempotency / Deduplication Engine | **Duplicate Protection** | Clear benefit: prevents sending the same message twice. |
| Dead Letter Queue (DLQ) | **Failed Messages** | Explains the actual content. |
| Durable Scheduling / Transactional Outbox | **Scheduled Sending** | What the user actually does: schedules emails. |
| Suppression Cascade / Suppression Intelligence | **Automatic Unsubscribe Protection** | Explains that users are protected from emailing opted-out contacts. |
| Retry Orchestrator / Backoff Scheduler | **Automatic Retries** | Self-explanatory behavior. |
| Event Bus / Worker Pool / State Machine | *(Internal only — never expose to users)* | Engineering implementation detail. |
| Infrastructure Health / Node Agent Center | **Servers & System Status** | Everyday business terminology. |
| Egress Traffic Shaping / TSA Automation | **Sending Speed & Provider Limits** | Customers understand rate limits per provider (Gmail, Outlook). |
| Remote Accepted Rate | **Delivery Success Rate** | Clear business outcome. |
| Observed Open Events | **Email Opens (Tracked)** | Understandable metric with honest privacy disclosure. |
| Forward-Confirmed Reverse DNS (FCrDNS) | **Reverse DNS Verification** | Removes unnecessary acronyms. |
| nftables Firewall Policy | **Firewall & Security Protection** | Security feature, not Linux tool name. |
| Hot Pink Accent / Internal Easter Egg | **Rose Pink / Berry Accent** | Professional theme color name in appearance settings. |

---

## 2. Status Messages & Explanations

| Avoid | Use | Notes |
| :--- | :--- | :--- |
| Queued / Enqueued in spool | **Waiting to send** | Clear and active. |
| In processing state | **Sending** | Direct action. |
| Accepted by delivery worker | **Sent successfully** | Clear confirmation. |
| Remote server 250 OK | **Delivered to recipient mail server** | Accurate without claiming "inbox placement". |
| Deferred / 421 Greylisted | **Temporarily delayed by recipient provider** | Explains why it wasn't immediate. |
| Hard bounce / 550 Mailbox not found | **Address does not exist (Bounced)** | Clear reason for failure. |
| Suppression record created | **Contact unsubscribed** | Focus on customer action. |
| Unknown execution state | **Delivery could not be confirmed** | Honest and clear. |

---

## 3. Action Buttons & Controls

| Avoid | Use |
| :--- | :--- |
| Inject Message (POST /api/v1/inject) | **Send Test Email** |
| Validate & SIGHUP Reload | **Save & Apply Policy** |
| Execute Drain Workflow | **Pause & Clear Queue** |
| Commit DNS Verification Poll | **Check DNS Records Now** |
| Rebind Spool Messages | **Move Messages to Another IP** |
| Terminate Node Container | **Restart Server** |

---

## 4. Progressive Disclosure Guidelines

Always lead with plain language summary, and offer technical details when the user asks for them:

* **Primary Summary:** "Delivery delayed by recipient server (Google Workspace)."
* **Technical Details (Expandable):** `SMTP 451 4.7.0 Rate limit exceeded. KumoMTA will retry in 180 seconds.`
