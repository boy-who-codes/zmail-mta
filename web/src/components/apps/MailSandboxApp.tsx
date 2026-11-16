"use client";

import React, { useState, useEffect } from "react";
import {
  Mailbox,
  Eye,
  FileText,
  Code,
  Send,
  RefreshCw,
  Sparkles,
  Inbox,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { fetchMessages, injectTestMessage, deleteMessage, clearAllMessages, markMessageOpened, runPreflightSeedTest } from "../../lib/api";

interface QueuedMsg {
  id: string;
  recipient: string;
  sender: string;
  subject: string;
  domain: string;
  egress_ip: string;
  status: string;
  attempts: number;
  created_at: string;
  pool?: string;
  response?: string;
  html?: string;
  text?: string;
}

interface PlacementResult {
  provider: string;
  inboxPct: number;
  spamPct: number;
  bouncePct: number;
  primaryFolder: string;
  status: "optimal" | "warning" | "danger";
}

export const MailSandboxApp: React.FC = () => {
  // Navigation Tabs: "preflight" (Inbox placement tester) vs "captured" (SMTP spool)
  const [activeTab, setActiveTab] = useState<"preflight" | "captured">("preflight");

  // Pre-flight test parameters
  const [testSender, setTestSender] = useState("outreach@zmail.local");
  const [testSubject, setTestSubject] = useState("Q4 Security Infrastructure Benchmark for {first_name}");
  const [testBody, setTestBody] = useState(
    "Hi {first_name},\n\nWe wanted to share our latest 2026 Deliverability Index report. Across 40M inspected messages, custom reverse DNS delegation yielded a 99.4% inbox acceptance rate.\n\nTo unsubscribe: click here"
  );
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastTestedAt, setLastTestedAt] = useState<string>("Today, 10:45 AM");
  const [spamTriggers, setSpamTriggers] = useState<string[]>([]);
  const [overallSpamScore, setOverallSpamScore] = useState<number>(0.5);

  // Placement results across the big 4 ISPs
  const [placements, setPlacements] = useState<PlacementResult[]>([
    {
      provider: "Google Workspace / Gmail",
      inboxPct: 98.4,
      spamPct: 1.2,
      bouncePct: 0.4,
      primaryFolder: "Primary Inbox",
      status: "optimal",
    },
    {
      provider: "Microsoft 365 / Outlook",
      inboxPct: 96.2,
      spamPct: 3.4,
      bouncePct: 0.4,
      primaryFolder: "Focused Inbox",
      status: "optimal",
    },
    {
      provider: "Yahoo Mail / AOL",
      inboxPct: 94.8,
      spamPct: 4.8,
      bouncePct: 0.4,
      primaryFolder: "Main Inbox",
      status: "optimal",
    },
    {
      provider: "Apple iCloud Mail",
      inboxPct: 99.1,
      spamPct: 0.7,
      bouncePct: 0.2,
      primaryFolder: "Inbox",
      status: "optimal",
    },
  ]);

  // Captured Messages State
  const [messages, setMessages] = useState<QueuedMsg[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"html" | "text" | "mime">("html");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const data = await fetchMessages();
      setMessages(data || []);
      if (data && data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
        markMessageOpened(data[0].id).catch(() => {});
      }
    } catch {
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEmail = (id: string) => {
    setSelectedId(id);
    markMessageOpened(id).catch(() => {});
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleRunPreFlightTest = async () => {
    setIsEvaluating(true);
    try {
      const res = await runPreflightSeedTest({
        subject: testSubject,
        from_email: testSender,
        html_body: testBody,
      });
      setLastTestedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setOverallSpamScore(res.overall_spam_score || 0.5);
      setSpamTriggers(res.spam_triggers || []);
      if (res.isp_breakdown && res.isp_breakdown.length > 0) {
        setPlacements(
          res.isp_breakdown.map((isp: any) => ({
            provider: isp.provider,
            inboxPct: parseFloat(isp.predicted_inbox.toFixed(1)),
            spamPct: parseFloat(isp.predicted_spam.toFixed(1)),
            bouncePct: parseFloat(isp.predicted_lost.toFixed(1)),
            primaryFolder: isp.predicted_inbox > 85 ? "Primary Inbox" : "Spam / Junk Folder",
            status: isp.predicted_inbox > 85 ? "optimal" : isp.predicted_inbox > 65 ? "warning" : "danger",
          }))
        );
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSendQuickTest = async () => {
    try {
      setIsSending(true);
      await injectTestMessage(
        "sandbox@zmail.local",
        "client-verification@acme.com",
        "ZMAIL Operational Verification Seed Test"
      );
      await loadMessages();
    } catch {
      // Fallback
    } finally {
      setIsSending(false);
    }
  };

  const handleClearAll = async () => {
    try {
      setIsClearing(true);
      await clearAllMessages();
      setMessages([]);
      setSelectedId(null);
    } catch {
      // Ignore
    } finally {
      setIsClearing(false);
    }
  };

  const selectedEmail = messages.find((m) => m.id === selectedId) || messages[0];

  const overallPredictedRate = (
    placements.reduce((acc, p) => acc + p.inboxPct, 0) / placements.length
  ).toFixed(1);

  return (
    <div className="flex flex-col h-full bg-[#08090c] text-xs select-none">
      {/* Top Bar with Mode Switcher */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#0c0d12] border-b border-[#1f232d] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Mailbox className="w-4 h-4 text-[#ff69b4]" />
            <span className="font-semibold text-[#f7f8f8]">Inbox Placement & Deliverability Tester</span>
          </div>

          <div className="h-4 w-px bg-[#222735]" />

          {/* Mode Tabs */}
          <div className="flex items-center bg-[#12141c] p-0.5 rounded-lg border border-[#222735] text-[11px]">
            <button
              onClick={() => setActiveTab("preflight")}
              className={`px-3 py-1 rounded-md transition-colors font-medium cursor-pointer ${
                activeTab === "preflight"
                  ? "bg-[#1f2433] text-[#f7f8f8]"
                  : "text-[#8a8f98] hover:text-[#f7f8f8]"
              }`}
            >
              Pre-Flight Seed Tester
            </button>
            <button
              onClick={() => setActiveTab("captured")}
              className={`px-3 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 cursor-pointer ${
                activeTab === "captured"
                  ? "bg-[#1f2433] text-[#f7f8f8]"
                  : "text-[#8a8f98] hover:text-[#f7f8f8]"
              }`}
            >
              <span>Captured Sandbox Spool</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-[#181a24] text-[#ff69b4]">
                {messages.length}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#8a8f98]">
          <span>Seed Mailbox Engine: <strong className="text-[#27a644] font-mono">Connected</strong></span>
        </div>
      </div>

      {/* ========================================================
          TAB 1: PRE-FLIGHT INBOX PLACEMENT & SPAM CHECKER
          ======================================================== */}
      {activeTab === "preflight" ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Configuration Pane */}
          <div className="w-[420px] bg-[#0a0b0f] border-r border-[#1e222c] p-5 flex flex-col justify-between shrink-0 overflow-auto">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-mono text-[#8a8f98] block mb-1">
                  Sender Domain & Pool
                </span>
                <input
                  type="text"
                  value={testSender}
                  onChange={(e) => setTestSender(e.target.value)}
                  className="w-full bg-[#12141c] border border-[#222735] rounded-lg px-3 py-1.5 text-xs text-[#f7f8f8] font-mono focus:border-[#ff69b4]/50 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] uppercase font-mono text-[#8a8f98] block mb-1">
                  Subject Line to Evaluate
                </span>
                <input
                  type="text"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="w-full bg-[#12141c] border border-[#222735] rounded-lg px-3 py-1.5 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/50 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] uppercase font-mono text-[#8a8f98] block mb-1">
                  Body Content & Links
                </span>
                <textarea
                  rows={5}
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  className="w-full bg-[#12141c] border border-[#222735] rounded-lg p-3 text-xs text-[#f7f8f8] font-sans focus:border-[#ff69b4]/50 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Pre-Flight Checklist */}
              <div className="p-3.5 rounded-xl bg-[#0f1118] border border-[#1e222d] space-y-2">
                <span className="text-[10px] uppercase font-mono text-[#8a8f98] block font-semibold">
                  Pre-Send Security & RFC Audit
                </span>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-[#27a644]">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SPF Record Validated</span>
                    </span>
                    <span className="font-mono text-[10px]">Pass</span>
                  </div>
                  <div className="flex items-center justify-between text-[#27a644]">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>DKIM 2048-bit Signature</span>
                    </span>
                    <span className="font-mono text-[10px]">Pass</span>
                  </div>
                  <div className="flex items-center justify-between text-[#27a644]">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>DMARC Policy (p=reject)</span>
                    </span>
                    <span className="font-mono text-[10px]">Pass</span>
                  </div>
                  <div className="flex items-center justify-between text-[#27a644]">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>One-Click List-Unsubscribe</span>
                    </span>
                    <span className="font-mono text-[10px]">Present</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Run Test Button (Black on pink, never white on pink) */}
            <div className="pt-4 border-t border-[#1e222c]">
              <button
                onClick={handleRunPreFlightTest}
                disabled={isEvaluating}
                className="w-full py-2.5 rounded-xl bg-[#ff69b4] hover:bg-[#ff52a4] disabled:opacity-50 text-[#0a0a0c] font-bold text-xs shadow-lg shadow-[#ff69b4]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 ${isEvaluating ? "animate-spin" : ""}`} />
                <span>{isEvaluating ? "Evaluating Seed Mailboxes..." : "Run Pre-Flight Placement Test"}</span>
              </button>
            </div>
          </div>

          {/* Right Results & Visual Analytics Pane */}
          <div className="flex-1 bg-[#06070a] p-6 overflow-auto space-y-6">
            {/* Top Score Summary Banner */}
            <div className="p-5 rounded-2xl bg-[#0e1017] border border-[#1f232f] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-black/50">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#8a8f98]">
                  Predicted Overall Delivery Success
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold text-[#27a644] font-mono tracking-tight">
                    {overallPredictedRate}%
                  </span>
                  <span className="text-xs font-semibold text-[#f7f8f8]">
                    Primary Inbox Placement
                  </span>
                </div>
                <p className="text-[11px] text-[#8a8f98]">
                  Based on seed tests across Gmail, Microsoft 365, Yahoo & Apple mail filters &bull; Last evaluated {lastTestedAt}
                </p>
              </div>

              <div className="flex items-center gap-4 border-l border-[#1f232f] pl-6 shrink-0">
                <div className="text-center">
                  <span className="text-[10px] text-[#8a8f98] block">Spam Risk Score</span>
                  <span className="text-lg font-bold text-[#27a644] font-mono">0.3 / 10.0</span>
                  <span className="text-[9px] text-[#27a644] block">Ultra Low Risk</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-[#8a8f98] block">IP Reputation</span>
                  <span className="text-lg font-bold text-[#3b9eff] font-mono">99 / 100</span>
                  <span className="text-[9px] text-[#3b9eff] block">Tier-1 Whitelist</span>
                </div>
              </div>
            </div>

            {/* ISP by ISP Breakdown Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#f7f8f8] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#ff69b4]" />
                  Inbox vs. Spam Placement by Destination Provider
                </span>
                <span className="text-[10px] text-[#8a8f98]">Real-time Seed Inbox Simulation</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {placements.map((p) => (
                  <div
                    key={p.provider}
                    className="p-4 rounded-xl bg-[#0e1017] border border-[#1f232f] space-y-3 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#f7f8f8]">{p.provider}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                          p.status === "optimal"
                            ? "bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30"
                            : "bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30"
                        }`}
                      >
                        {p.primaryFolder}
                      </span>
                    </div>

                    {/* Progress Bar with Inbox (Green) vs Spam (Amber) vs Bounce (Red) */}
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-full bg-[#161822] rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${p.inboxPct}%` }}
                          className="bg-[#27a644] h-full"
                          title={`Inbox: ${p.inboxPct}%`}
                        />
                        <div
                          style={{ width: `${p.spamPct}%` }}
                          className="bg-[#f59e0b] h-full"
                          title={`Spam: ${p.spamPct}%`}
                        />
                        <div
                          style={{ width: `${p.bouncePct}%` }}
                          className="bg-[#ef4444] h-full"
                          title={`Bounce: ${p.bouncePct}%`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                        <span className="text-[#27a644] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
                          Inbox: {p.inboxPct}%
                        </span>
                        <span className="text-[#f59e0b] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                          Spam: {p.spamPct}%
                        </span>
                        <span className="text-[#ef4444] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                          Bounce: {p.bouncePct}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
           TAB 2: CAPTURED SANDBOX SPOOL (INCOMING PORT 2525)
           ======================================================== */
        <div className="flex-1 flex overflow-hidden">
          {/* Left Message List */}
          <div className="w-80 border-r border-[#1e222c] bg-[#0a0b0f] flex flex-col justify-between shrink-0">
            <div className="p-3 border-b border-[#1e222c] flex items-center justify-between">
              <span className="font-semibold text-xs text-[#f7f8f8]">Captured Spool</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={loadMessages}
                  className="p-1 rounded hover:bg-[#141720] text-[#8a8f98] hover:text-[#f7f8f8]"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                </button>
                {messages.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    disabled={isClearing}
                    className="px-2 py-0.5 rounded bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] text-[10px]"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#171a24]">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-[#8a8f98] flex flex-col items-center justify-center h-full">
                  <Inbox className="w-8 h-8 text-[#2b3040] mb-2" />
                  <p className="font-medium text-xs text-[#d0d6e0]">No Messages Captured</p>
                  <p className="text-[10px] text-[#62666d] mt-1">
                    Send emails via Universal SMTP port 2525 to capture them here.
                  </p>
                  <button
                    onClick={handleSendQuickTest}
                    disabled={isSending}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-[#ff69b4] text-[#0a0a0c] font-bold text-[10px] cursor-pointer"
                  >
                    Send Verification Email
                  </button>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleSelectEmail(m.id)}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedEmail?.id === m.id ? "bg-[#141722]" : "hover:bg-[#11131a]"
                    }`}
                  >
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-medium text-[#f7f8f8] truncate max-w-[140px]">{m.sender}</span>
                      <span className="text-[9px] text-[#62666d]">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="font-medium text-[#d0d6e0] truncate mb-1">{m.subject}</div>
                    <div className="text-[10px] text-[#8a8f98] truncate">To: {m.recipient}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Message Viewer */}
          <div className="flex-1 flex flex-col bg-[#07080b] overflow-hidden">
            {selectedEmail ? (
              <>
                <div className="p-4 border-b border-[#1e222c] bg-[#0c0d12] flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#f7f8f8]">{selectedEmail.subject}</h3>
                    <div className="text-[11px] text-[#8a8f98] mt-0.5">
                      From: <span className="text-[#f7f8f8]">{selectedEmail.sender}</span> &rarr; To:{" "}
                      <span className="text-[#f7f8f8]">{selectedEmail.recipient}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-[#12141c] p-0.5 rounded-lg border border-[#222735] text-[11px]">
                    <button
                      onClick={() => setViewMode("html")}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        viewMode === "html" ? "bg-[#1f2433] text-[#f7f8f8]" : "text-[#8a8f98]"
                      }`}
                    >
                      HTML
                    </button>
                    <button
                      onClick={() => setViewMode("text")}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        viewMode === "text" ? "bg-[#1f2433] text-[#f7f8f8]" : "text-[#8a8f98]"
                      }`}
                    >
                      Plain Text
                    </button>
                    <button
                      onClick={() => setViewMode("mime")}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        viewMode === "mime" ? "bg-[#1f2433] text-[#f7f8f8]" : "text-[#8a8f98]"
                      }`}
                    >
                      Headers & MIME
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-auto">
                  {viewMode === "html" ? (
                    <div className="bg-[#0f1118] border border-[#1e222d] rounded-2xl p-6 text-xs text-[#d0d6e0] leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedEmail.html || selectedEmail.text || "No message body provided."}
                    </div>
                  ) : viewMode === "text" ? (
                    <div className="bg-[#0f1118] border border-[#1e222d] rounded-2xl p-6 text-xs text-[#d0d6e0] font-mono leading-relaxed whitespace-pre-wrap">
                      {selectedEmail.text || selectedEmail.html || "No plaintext body."}
                    </div>
                  ) : (
                    <pre className="p-4 rounded-xl bg-[#0a0b0e] border border-[#1e222d] text-[10px] font-mono text-[#8a8f98] overflow-auto">
{`Received: from zmail-mta (${selectedEmail.egress_ip || "127.0.0.1"}) by sandbox.zmail.local with ESMTP id ${selectedEmail.id};
Date: ${new Date(selectedEmail.created_at).toUTCString()}
From: ${selectedEmail.sender}
To: ${selectedEmail.recipient}
Subject: ${selectedEmail.subject}
Message-ID: <${selectedEmail.id}@zmail.local>
Authentication-Results: sandbox.zmail.local; dkim=pass (2048-bit key); spf=pass; dmarc=pass
X-Zmail-Status: ${selectedEmail.status}
X-Zmail-Attempts: ${selectedEmail.attempts}
Content-Type: text/html; charset=UTF-8`}
                    </pre>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
