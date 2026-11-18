"use client";

import React, { useState } from "react";
import { useWindowManager } from "../../context/WindowManagerContext";
import {
  BookOpen,
  Send,
  GitCommit,
  Mail,
  Zap,
  ShieldCheck,
  Globe,
  Mailbox,
  Layers,
  ShieldAlert,
  BarChart3,
  Terminal,
  Server,
  ArrowRight,
  ExternalLink,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  KeyRound,
  FileCode2,
  Activity,
  Check,
  Copy,
  Lock,
} from "lucide-react";

interface GuideSection {
  id: string;
  appId?: string;
  title: string;
  shortDesc: string;
  icon: React.ElementType;
  category: "Core" | "Outreach" | "Deliverability" | "Infra";
  badge?: string;
  overview: string;
  howToUse: string[];
  proTips: string[];
  sampleCommand?: string;
  uiMockup: {
    header: string;
    sub: string;
    stats: { label: string; value: string; color: string }[];
    previewType: string;
  };
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "quickstart",
    title: "Quick Start & Operational Flow",
    shortDesc: "End-to-end operational roadmap from initial domain hookup to sending at scale",
    icon: Sparkles,
    category: "Core",
    badge: "Start Here",
    overview:
      "ZMAIL is an enterprise-grade self-hosted email delivery platform. It combines a Rust-based KumoMTA core engine with automated DNS, mailbox pool rotation, P2P warmup, and multi-step drip cadence studios.",
    howToUse: [
      "1. Navigate to 'DNS & Domains' and click 'Sync with Cloudflare' to auto-provision SPF, DKIM (2048-bit), DMARC, and MX records in 3 seconds.",
      "2. Create Mailboxes in 'Mailbox Pools' with daily sending caps (e.g., 50 emails/day per sender).",
      "3. Enable the 'AI Warmup Peer Network' on your mailboxes so autonomous agents exchange realistic multi-turn conversations and rescue emails from spam.",
      "4. Run your leads through the 'Lead Hygiene & MX Verifier' to purge invalid emails and spam traps before dispatching.",
      "5. Build your outreach in 'Multi-Step Drip Cadence' with thread-locked follow-ups that automatically halt when prospects reply.",
    ],
    proTips: [
      "Always verify DKIM and SPF green status before ramping broadcast volume.",
      "Keep warmup active at 25-40% volume even after campaigns launch to maintain mailbox trust score.",
      "Rotate through a Mailbox Pool rather than blasting from a single inbox.",
    ],
    uiMockup: {
      header: "ZMAIL Operational Flywheel",
      sub: "Fully autonomous loop: DNS Auth → Verification → Warmup → Cadence → Auto-Stop",
      stats: [
        { label: "Infrastructure State", value: "Online (Healthy)", color: "text-[#27a644]" },
        { label: "Inbox Placement Rate", value: "99.8%", color: "text-[#ff69b4]" },
        { label: "Auto-Stop Efficiency", value: "100%", color: "text-[#3b9eff]" },
      ],
      previewType: "flow",
    },
  },
  {
    id: "campaigns",
    appId: "campaigns",
    title: "Campaign Broadcasts & 1-to-1 Quick Compose",
    shortDesc: "High-velocity mass broadcasts and direct test dispatches with RFC-8058 compliance",
    icon: Send,
    category: "Outreach",
    overview:
      "The Campaigns App allows you to create, draft, schedule, dispatch, and monitor bulk broadcasts across IP pools with full unsubscribe compliance, personalization tokens, and live recipient previews.",
    howToUse: [
      "Click 'Create Campaign' in the top right to start a new broadcast.",
      "Choose your sender identity: single mailbox or an automated Mailbox Pool for round-robin rotation.",
      "Select your audience via custom pasted emails, existing audience contacts, or tag-based segments.",
      "Use {{first_name}}, {{company}}, and {{email}} tokens to personalize content dynamically.",
      "Switch to '1-to-1 Quick Compose' tab to test individual mailbox dispatches directly through the MTA.",
    ],
    proTips: [
      "ZMAIL automatically attaches RFC-8058 'List-Unsubscribe=One-Click' headers to eliminate spam complaints.",
      "Toggle preview between Desktop and Mobile views to verify responsive layout before broadcast.",
    ],
    uiMockup: {
      header: "Campaign Broadcast Studio",
      sub: "Active Campaign: Q4 Enterprise Outreach • IP Pool: default",
      stats: [
        { label: "Audience Size", value: "12,450 Leads", color: "text-white" },
        { label: "MTA Queue", value: "0 Spooled (Instant)", color: "text-[#27a644]" },
        { label: "DKIM Signature", value: "Ed25519 / RSA-2048", color: "text-[#3b9eff]" },
      ],
      previewType: "campaign",
    },
  },
  {
    id: "cadence",
    appId: "campaigns",
    title: "Multi-Step Drip Cadence (Auto-Stop on Reply)",
    shortDesc: "Automated follow-up drip sequences that automatically halt when prospects respond",
    icon: GitCommit,
    category: "Outreach",
    badge: "Moat Feature",
    overview:
      "Never embarrass yourself by sending an automated follow-up to a lead who already replied. The Cadence Engine locks Step 2 and Step 3 into the original RFC-822 email thread (In-Reply-To header) from the same pinned sender mailbox, and halts instantly upon receiving a reply.",
    howToUse: [
      "Open Campaigns App and click the '🎯 Multi-Step Drip Cadence' mode button in the top bar.",
      "Click 'Import Leads (CSV)' to paste leads with email, first name, and company.",
      "Review the visual 3-step timeline: Step 1 (Day 0) → Wait 3 Days → Step 2 (Follow-up) → Wait 4 Days → Step 3 (Break-up).",
      "Click '⚡ Advance Cadence (+1 Day)' to evaluate due follow-up delays.",
      "Test auto-stop anytime: Click 'Simulate Reply' on any active lead to see their status flip to 'Replied & Auto-Halted' immediately!",
    ],
    proTips: [
      "Because the Inbound IMAP hook monitors replies in real time, when a prospect writes back, all subsequent follow-ups are cancelled with zero manual intervention.",
      "Pinned sender addresses guarantee that follow-ups originate from the exact same mailbox the lead received Step 1 from.",
    ],
    uiMockup: {
      header: "Visual Sequence Pipeline",
      sub: "Step 1 (Day 0) ──[⏱️ 3d Delay]──> Step 2 (Threaded) ──[⏱️ 4d Delay]──> Step 3 (Breakup)",
      stats: [
        { label: "Enrolled Leads", value: "1,250", color: "text-white" },
        { label: "Auto-Stopped on Reply", value: "318 (25.4%)", color: "text-[#ff69b4]" },
        { label: "RFC-822 Threading", value: "Active", color: "text-[#27a644]" },
      ],
      previewType: "cadence",
    },
  },
  {
    id: "webmail",
    appId: "webmail",
    title: "Unified Webmail Client (Self-Hosted IMAP)",
    shortDesc: "Standalone webmail client to read, filter, search, and reply across all your mailboxes",
    icon: Mail,
    category: "Outreach",
    overview:
      "You don't need to configure Outlook, Thunderbird, or pay Google Workspace fees for every single cold email sender. The Unified Webmail App connects directly to your Dovecot IMAP and spool to let you manage all client conversations in one place.",
    howToUse: [
      "Launch 'Webmail' from the dock or menu.",
      "Use the left account switcher to view 'All Mailboxes (Unified)' or filter to an individual sender.",
      "Switch between folders: Inbox, Starred, Sent, and Warmup.",
      "Click any thread to inspect security badges (SPF Pass, DKIM Signed, TLS 1.3).",
      "Type a quick reply at the bottom: it automatically maintains RFC-822 thread headers (In-Reply-To and References).",
    ],
    proTips: [
      "Warmup emails are cleanly segregated into the 'Warmup' folder so your primary inbox stays focused on real customer replies.",
      "Search works in real-time across subject lines, sender names, and body text.",
    ],
    uiMockup: {
      header: "Unified Mailbox View",
      sub: "Viewing 6 Connected Inboxes • 100% In-House Dovecot IMAP",
      stats: [
        { label: "Active Inboxes", value: "6 Mailboxes", color: "text-white" },
        { label: "Unread Leads", value: "14 Inquiries", color: "text-[#27a644]" },
        { label: "TLS Encryption", value: "TLS 1.3 Strict", color: "text-[#3b9eff]" },
      ],
      previewType: "webmail",
    },
  },
  {
    id: "warmup",
    appId: "mailboxes",
    title: "Autonomous AI Warmup Peer Network",
    shortDesc: "P2P simulated conversational engine that automatically rescues emails from spam",
    icon: Zap,
    category: "Deliverability",
    badge: "Moat Feature",
    overview:
      "Cold email deliverability lives and dies by mailbox reputation. The AI Warmup engine runs autonomous peer-to-peer simulated B2B email threads between your mailboxes, opens them, marks them as important, stars them, and replies with multi-turn realistic engineering and business dialogue.",
    howToUse: [
      "Open 'Mailbox Pools' and click Tab 4: '⚡ AI Warmup Peer Network'.",
      "Review the live Inbox Placement Rate gauge (typically 99.5% - 99.8%).",
      "Configure your daily warmup ramp: set daily increment (e.g. +3 emails/day) and max warmup volume (e.g. 35/day).",
      "Enable 'Auto-Star & Mark Important' and 'Auto-Spam Rescue' in Settings.",
      "Click '⚡ Trigger AI Warmup Round' to immediately dispatch a conversational exchange round.",
    ],
    proTips: [
      "The background worker runs automatically every 30 minutes with randomized jitter so email providers see natural human conversational patterns.",
      "Realistic topics include API rate limiting, Kubernetes clusters, Redis caching, and SaaS partnership proposals.",
    ],
    uiMockup: {
      header: "Warmup Peer Dialogue Stream",
      sub: "Active P2P Threads: alex@growth.zmail.local ⇄ sarah@growth.zmail.local",
      stats: [
        { label: "Inbox Placement", value: "99.8%", color: "text-[#27a644]" },
        { label: "Spam Rescues", value: "100%", color: "text-[#ff69b4]" },
        { label: "Peer Conversations", value: "24 Active", color: "text-[#3b9eff]" },
      ],
      previewType: "warmup",
    },
  },
  {
    id: "verifier",
    appId: "contacts",
    title: "Lead Hygiene & Syntax/MX Verifier (ZeroBounce Killer)",
    shortDesc: "Built-in MX lookup, disposable burner detection, and syntax validation with zero fees",
    icon: ShieldCheck,
    category: "Deliverability",
    badge: "Built-in",
    overview:
      "Avoid paying ZeroBounce or NeverBounce $0.005 per email. The Lead Verifier checks RFC-5322 syntax, queries authoritative DNS nameservers for live MX records, detects disposable burner domains (e.g., mailinator), and flags generic role accounts before you send.",
    howToUse: [
      "Open 'Audience Contacts' and click the '🛡️ Lead Hygiene & Syntax/MX Verifier' tab at the top.",
      "Paste your lead list (one email per line or comma-separated CSV rows).",
      "Click '⚡ Run Real-Time Hygiene Audit'.",
      "Review the color-coded breakdown: Deliverable (Green), Risky Role (Amber), Invalid/No MX (Red).",
      "Click 'Import Clean Leads' to instantly add only deliverable emails into your audience with a 100/100 score.",
    ],
    proTips: [
      "Direct fast public DNS queries (1.1.1.1 & 8.8.8.8) ensure instant validation with zero timeout delays.",
      "Filtering out invalid MX records before broadcasting protects your IP from immediate hard bounce blacklists.",
    ],
    uiMockup: {
      header: "Hygiene Audit Results",
      sub: "Analyzed 1,000 Prospect Leads • ZeroBounce / NeverBounce Alternative",
      stats: [
        { label: "Clean & Deliverable", value: "924 (92.4%)", color: "text-[#27a644]" },
        { label: "Role / Generic", value: "52 (5.2%)", color: "text-[#f59e0b]" },
        { label: "Dead MX / Disposable", value: "24 (2.4%)", color: "text-[#ef4444]" },
      ],
      previewType: "verifier",
    },
  },
  {
    id: "dns",
    appId: "dns",
    title: "DNS, SPF, DKIM & 1-Click Cloudflare Sync",
    shortDesc: "Automated cryptographic DNS records with 1-click Cloudflare API sync",
    icon: Globe,
    category: "Deliverability",
    overview:
      "Achieve 10/10 mail-tester deliverability. ZMAIL automatically generates 2048-bit RSA and Ed25519 DKIM keys, SPF includes, DMARC quarantine/reject policies, and reverse DNS (PTR) alignment. If you use Cloudflare, it syncs everything with one button click.",
    howToUse: [
      "Open 'DNS & Domains' and click 'Add Domain' to register your sending domain.",
      "Click 'Generate DKIM Key' to produce high-security 2048-bit keys.",
      "To auto-configure DNS: Enter your Cloudflare API Token and Zone ID, then click 'Sync with Cloudflare'.",
      "Click 'Verify DNS Now' to run live checks across SPF, DKIM, DMARC, and MX records.",
    ],
    proTips: [
      "Never send cold emails from an unverified domain; ensure all 4 shields (SPF, DKIM, DMARC, PTR) show green.",
      "ZMAIL signs outgoing emails via KumoMTA Lua hooks with the exact matching DKIM private key.",
    ],
    uiMockup: {
      header: "Cryptographic Domain Authentication",
      sub: "Domain: growth.zmail.local • Selector: default._domainkey",
      stats: [
        { label: "SPF Record", value: "v=spf1 ... ~all (PASS)", color: "text-[#27a644]" },
        { label: "DKIM Key", value: "RSA 2048-bit (VALID)", color: "text-[#27a644]" },
        { label: "DMARC Policy", value: "p=quarantine (ALIGN)", color: "text-[#27a644]" },
      ],
      previewType: "dns",
    },
  },
  {
    id: "mailboxes",
    appId: "mailboxes",
    title: "Mailbox Rotation & Quota Pools",
    shortDesc: "Distribute outgoing volume across multiple inboxes with warm ramp-up curves",
    icon: Mailbox,
    category: "Deliverability",
    overview:
      "Avoid triggering spam filters by overloading a single email address. Mailbox Pools round-robin rotate sending across dozens of accounts while respecting daily/hourly caps and keeping thread conversations locked to their original sender.",
    howToUse: [
      "Open 'Mailbox Pools' app.",
      "In Tab 1 ('Mailbox Accounts'), create or import your sender mailboxes.",
      "In Tab 2 ('Pools & Rotation'), bundle mailboxes into pools (e.g. 'Enterprise Outbound Pool').",
      "Configure daily caps (e.g., 40 emails/day per mailbox) and rotation strategy ('Round-Robin' or 'Least-Used').",
      "Assign campaigns to the pool: ZMAIL automatically routes outgoing messages through available mailboxes.",
    ],
    proTips: [
      "New mailboxes should start with a 15-20 email/day cap and increase by 2-3 daily until reaching 50/day.",
      "The 'Thread Consistency Lock' ensures that any follow-up to a lead always uses the exact same sender address.",
    ],
    uiMockup: {
      header: "Mailbox Pool Engine",
      sub: "Pool: High-Growth Outbound (12 Active Senders • Round-Robin)",
      stats: [
        { label: "Total Pool Capacity", value: "600 emails/day", color: "text-white" },
        { label: "Utilized Today", value: "184 / 600", color: "text-[#3b9eff]" },
        { label: "Health Score", value: "100% Healthy", color: "text-[#27a644]" },
      ],
      previewType: "mailboxes",
    },
  },
  {
    id: "ippools",
    appId: "ippools",
    title: "IP Pools & Egress Traffic Shaping",
    shortDesc: "Multi-IP rotation and ISP-specific rate limiting via KumoMTA shaping policy",
    icon: Layers,
    category: "Infra",
    overview:
      "Direct your high-reputation transactional emails through clean IPs, and warm new egress IPs with controlled traffic shaping. ZMAIL automatically compiles your shaping rules into KumoMTA's `shaping.toml` configuration.",
    howToUse: [
      "Open 'IP Pools & Shaping' app.",
      "Create IP pools (e.g., 'warm-pool-1', 'trans-pool').",
      "Assign dedicated egress IP addresses to each pool.",
      "Configure provider shaping rules: Max connections, messages per hour to Gmail, Yahoo, and Outlook.",
      "Click 'Apply Shaping Policy' to hot-reload KumoMTA instantly without dropping connections.",
    ],
    proTips: [
      "Google Workspace limits unauthenticated or new IPs to conservative burst rates; keep Gmail egress under 100/hr during week 1.",
    ],
    uiMockup: {
      header: "IP Pool Architecture",
      sub: "Pool: Pool-Alpha (3 IPv4 Addresses • Gmail / Microsoft Tuned)",
      stats: [
        { label: "Egress IPs", value: "3 Dedicated", color: "text-white" },
        { label: "Gmail Throttle", value: "150 msg/hr (Safe)", color: "text-[#27a644]" },
        { label: "Kumo Hot Reload", value: "Zero Downtime", color: "text-[#ff69b4]" },
      ],
      previewType: "ippools",
    },
  },
  {
    id: "analytics",
    appId: "analytics",
    title: "Delivery Reports & ISP Breakdown",
    shortDesc: "Real-time delivery throughput graphs, bounce categorizations, and provider placement",
    icon: BarChart3,
    category: "Infra",
    overview:
      "Visualize your sending funnel in real time. Inspect total throughput, delivered volume, opens, clicks, unsubscribes, and ISP breakdown across Gmail, Microsoft 365, Yahoo, and custom corporate domains.",
    howToUse: [
      "Open 'Reports & Analytics' from the dock.",
      "Review the top KPI cards: Delivered rate, Bounce rate, Open rate, and Active Throughput.",
      "Inspect the 24-hour line chart showing hourly sending velocity and deliveries.",
      "Examine the Mailbox Provider breakdown pie chart to monitor your deliverability per major destination.",
    ],
    proTips: [
      "If bounce rate exceeds 2%, immediately run the 'Lead Hygiene Verifier' on upcoming lead batches.",
    ],
    uiMockup: {
      header: "Throughput Analytics Dashboard",
      sub: "Last 24 Hours • 99.4% Delivery Success Rate",
      stats: [
        { label: "Emails Delivered", value: "24,850", color: "text-[#27a644]" },
        { label: "Bounce Rate", value: "0.2% (Optimal)", color: "text-[#27a644]" },
        { label: "Spam Complaints", value: "0.01%", color: "text-[#ff69b4]" },
      ],
      previewType: "analytics",
    },
  },
  {
    id: "terminal",
    appId: "terminal",
    title: "System Diagnostics & Developer Terminal",
    shortDesc: "Interactive web terminal with live log feeds, queue management, and CLI utilities",
    icon: Terminal,
    category: "Infra",
    overview:
      "Direct command-line control of your mail server. Run diagnostic checks, flush KumoMTA queues, inspect IMAP mailboxes, and test SMTP authentication right from your browser.",
    howToUse: [
      "Open 'Terminal' app from the dock or top menu.",
      "Type `help` to list available built-in commands (`status`, `queue`, `warmup`, `flush`, `domains`, `ping`).",
      "Type `queue list` to inspect currently spooled messages.",
      "Type `status` to view container memory and daemon uptime.",
    ],
    proTips: [
      "Terminal runs directly inside the isolated web console and communicates with the backend REST and CLI interfaces.",
    ],
    uiMockup: {
      header: "ZMAIL Developer Terminal",
      sub: "Session: admin@mailops.local • Connected to KumoMTA & Go Core",
      stats: [
        { label: "MTA Socket", value: "kumomta:2525 (OK)", color: "text-[#27a644]" },
        { label: "CLI Engine", value: "Active", color: "text-white" },
        { label: "Dovecot IMAP", value: "dovecot:993 (OK)", color: "text-[#3b9eff]" },
      ],
      previewType: "terminal",
    },
  },
];

export const DocsApp: React.FC = () => {
  const { openApp } = useWindowManager();
  const [selectedSectionId, setSelectedSectionId] = useState<string>("quickstart");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string>("");

  const selectedSection =
    GUIDE_SECTIONS.find((s) => s.id === selectedSectionId) || GUIDE_SECTIONS[0];

  const filteredSections = GUIDE_SECTIONS.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.shortDesc.toLowerCase().includes(q) ||
      s.overview.toLowerCase().includes(q)
    );
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  };

  return (
    <div className="flex h-full bg-[#08090c] text-xs text-[#d0d6e0] select-none">
      {/* Sidebar: Navigation & Guide Index */}
      <div className="w-72 bg-[#0c0d12] border-r border-[#1e222c] flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-[#1e222c] space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ff69b4]/10 border border-[#ff69b4]/30 flex items-center justify-center text-[#ff69b4]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-[#f7f8f8]">ZMAIL Documentation</h2>
              <p className="text-[10px] text-[#8a8f98] font-mono">Platform Guide & Architecture</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8a8f98] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search guides, apps, features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141720] border border-[#242938] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#f7f8f8] placeholder-[#555a66] focus:outline-none focus:border-[#ff69b4]"
            />
          </div>
        </div>

        {/* Guide List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            const isSelected = section.id === selectedSection.id;

            return (
              <button
                key={section.id}
                onClick={() => setSelectedSectionId(section.id)}
                className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                  isSelected
                    ? "bg-[#181c28] border border-[#ff69b4]/40 text-[#f7f8f8] shadow-md shadow-[#ff69b4]/10"
                    : "hover:bg-[#12141c] border border-transparent text-[#8a8f98] hover:text-[#d0d6e0]"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected
                      ? "bg-[#ff69b4]/20 text-[#ff69b4]"
                      : "bg-[#161822] text-[#8a8f98]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs truncate text-white">
                      {section.title.split("(")[0]}
                    </span>
                    {section.badge && (
                      <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-[#ff69b4]/15 text-[#ff69b4] border border-[#ff69b4]/30 shrink-0 font-bold">
                        {section.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#8a8f98] line-clamp-1 mt-0.5">
                    {section.shortDesc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1e222c] bg-[#090a0d] flex items-center justify-between text-[10px] text-[#62666d]">
          <span>ZMAIL 2.0 Docs Engine</span>
          <span className="font-mono text-[#27a644]">v2.4.0 Live</span>
        </div>
      </div>

      {/* Main Content Area: Detailed Guide & UI Mockup */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-[#08090c]">
        {/* Top Header Strip */}
        <div className="px-8 py-5 border-b border-[#1e222c] bg-[#0d0f15] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff69b4]/10 border border-[#ff69b4]/30 flex items-center justify-center text-[#ff69b4]">
              {React.createElement(selectedSection.icon, { className: "w-5 h-5" })}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-bold text-white">{selectedSection.title}</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#181d28] text-[#3b9eff] border border-[#3b9eff]/30 font-semibold uppercase">
                  {selectedSection.category}
                </span>
              </div>
              <p className="text-xs text-[#8a8f98] mt-0.5">{selectedSection.shortDesc}</p>
            </div>
          </div>

          {selectedSection.appId && (
            <button
              onClick={() => openApp(selectedSection.appId as any)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff69b4] hover:bg-[#ff52a4] text-[#0a0a0c] font-bold text-xs shadow-md shadow-[#ff69b4]/20 transition-all cursor-pointer"
            >
              <span>Launch App Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Guide Content Body */}
        <div className="p-8 max-w-4xl space-y-6">
          {/* Interactive UI Preview Card */}
          <div className="rounded-2xl bg-[#0e1017] border border-[#242938] overflow-hidden shadow-2xl space-y-3">
            <div className="px-5 py-3 border-b border-[#202532] bg-[#121520] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27a644]/60" />
                </div>
                <span className="text-[11px] font-mono text-[#8a8f98] ml-2">
                  {selectedSection.uiMockup.header}
                </span>
              </div>
              <span className="text-[10px] text-[#27a644] font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#27a644] animate-pulse" />
                Live Interface Architecture
              </span>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-300 font-medium">
                {selectedSection.uiMockup.sub}
              </p>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3">
                {selectedSection.uiMockup.stats.map((st, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#141724] border border-[#202538]">
                    <span className="text-[10px] font-mono uppercase text-[#8a8f98]">{st.label}</span>
                    <p className={`text-sm font-bold mt-0.5 ${st.color}`}>{st.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 1: Overview & Moat */}
          <div className="p-6 rounded-2xl bg-[#0c0d12] border border-[#1e222c] space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#ff69b4]">
              Overview & Commercial Advantage
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {selectedSection.overview}
            </p>
          </div>

          {/* Section 2: Step-by-Step Instructions */}
          <div className="p-6 rounded-2xl bg-[#0c0d12] border border-[#1e222c] space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#27a644]" />
              <span>Operational Walkthrough</span>
            </h3>
            <ul className="space-y-2.5 pt-1">
              {selectedSection.howToUse.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-[#161a25] border border-[#262f44] text-[#ff69b4] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step.replace(/^\d+\.\s*/, "")}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3: Pro Tips & Best Practices */}
          <div className="p-6 rounded-2xl bg-[#0f1420] border border-[#232f48] space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#3b9eff] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#3b9eff]" />
              <span>Deliverability Pro-Tips & Deliverability Rules</span>
            </h3>
            <ul className="space-y-2 pt-1">
              {selectedSection.proTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                  <Check className="w-3.5 h-3.5 text-[#3b9eff] shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
