# Deliverability, Sender Rotation & Warmup Architecture

MailOps is architected to eliminate deliverability traps, domain blacklisting, and per-seat license costs associated with traditional corporate suites (Google Workspace / Microsoft 365).

---

## 1. System Architecture Overview

```
                          [ Outbound Web / API Clients ]
                                      |
                                      v
                           [ Next.js 16 UI Dashboard ]
                                      |
                                      v
                             [ Go REST API Core ]
                               /      |      \
                              /       |       \
                             v        v        v
                    [ Redis Store ] [ TSA ] [ Dovecot IMAP ]
                             \        |        /
                              \       |       /
                               v      v      v
                          [ ZMAIL Core MTA (KumoMTA) ]
                                      |
                         +------------+------------+
                         |                         |
                         v                         v
               [ MX Egress Ingestion ]     [ Local Maildir ]
                 (External Internet)       (/var/mail/recipient)
```

---

## 2. Recipient Thread Continuity & Sender Stickiness

A major cause of cold outbound emails being flagged as spam by modern spam filters is **sender inconsistency mid-thread**. If an initial outreach is sent from `sarah@growth.company.com`, but a scheduled follow-up or reply is routed through `mark@growth.company.com`, mail filters (Google Postmaster, Barracuda, SpamAssassin) penalize the sender domain.

### Resolution Mechanism
MailOps guarantees 100% thread continuity via two-layer binding:
1. **Header Inspection:** Every outbound envelope is inspected for `In-Reply-To` or `References` headers.
2. **Sticky Cache Lookup:** If a recipient has previously received an email from a specific mailbox in the pool within the retention window (30 days), MailOps bypasses round-robin rotation and pins dispatch to that exact original mailbox.
3. **Fallback:** Only first-touch outbound messages undergo algorithmic pool distribution (`least_utilized`, `weighted_round_robin`, `least_recently_used`).

---

## 3. Autonomous Warmup Engine & Multi-Speed Ramp Curves

Fresh IPs and domains lack historical sending reputation. Sudden volume spikes trigger ISP throttling, greylisting, or immediate spam foldering.

MailOps includes an integrated autonomous warmup daemon that runs on a continuous 24-hour cycle to govern daily volume expansion.

### Supported Warmup Curves
| Day | Standard (14-Day) | Conservative (21-Day) | Aggressive (7-Day) |
|-----|-------------------|-----------------------|--------------------|
| 1   | 15 msgs/day       | 10 msgs/day           | 30 msgs/day        |
| 2   | 25 msgs/day       | 15 msgs/day           | 60 msgs/day        |
| 3   | 40 msgs/day       | 25 msgs/day           | 120 msgs/day       |
| 5   | 80 msgs/day       | 50 msgs/day           | 250 msgs/day       |
| 7   | 140 msgs/day      | 90 msgs/day           | 400 msgs/day (Target)|
| 10  | 250 msgs/day      | 160 msgs/day          | Graduated          |
| 14  | 400 msgs/day (Target)| 270 msgs/day       | Graduated          |
| 21  | Graduated         | 400 msgs/day (Target) | Graduated          |

---

## 4. Reputation Circuit Breakers

The autonomous warmup daemon evaluates real-time feedback loops from ISP bounce messages and FBL (Feedback Loop) spam complaints.

- **Hard Bounce Limit:** `2.0%`
- **Spam Complaint Limit:** `0.08%` (Google/Yahoo Postmaster enforcement ceiling is 0.10%)

### Automated Action
If a mailbox's rolling 24-hour window exceeds either threshold:
1. The daemon immediately flags the mailbox status as `paused`.
2. The mailbox is temporarily pulled from active rotation pools to protect the sender domain.
3. An administrative alert is issued on the MailOps dashboard.
4. Quota remains locked until manually reviewed or bounce hygiene is confirmed.

---

## 5. Local Maildir Storage & Dovecot IMAP Architecture

For bidirectional communication without per-user licensing fees ($6–$20/user/mo):
- **KumoMTA Native Maildir:** When an incoming message arrives for a local domain (`sarah@growth.zmail.local`), KumoMTA delivers the raw RFC 5322 payload directly to `/var/mail/sarah@growth.zmail.local/Maildir`.
- **Dovecot Companion Service:** Dovecot is bound to the shared `/var/mail` mount. It serves standard IMAP (port 143) and IMAPS (port 993) directly to Outlook, Thunderbird, and Apple Mail.
- **Zero Lock-in:** The Maildir format stores each email as an individual file, allowing instantaneous backup, rsync, and full text search without proprietary database engines.
