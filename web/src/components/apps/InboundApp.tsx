"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Inbox,
  ShieldAlert,
  ShieldCheck,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Activity,
  ArrowRight,
  Send,
  Zap,
  Filter,
  Check,
  ExternalLink,
  Mail,
  Webhook,
  Sliders,
  FileText,
  Clock,
  Terminal,
  ChevronRight,
  Shield,
  CornerDownRight,
  Radio,
} from "lucide-react";
import {
  fetchInboundMessages,
  fetchInboundMessageDetail,
  deleteInboundMessage,
  clearInboundMessages,
  simulateARFReport,
  fetchInboundRoutes,
  addInboundRoute,
  updateInboundRoute,
  deleteInboundRoute,
  fetchInboundStats,
} from "../../lib/api";
import { InboundMessage, InboundRoute, InboundStats } from "../../types/os";

export const InboundApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"mailbox" | "arf" | "routes" | "setup">("mailbox");
  const [messages, setMessages] = useState<InboundMessage[]>([]);
  const [routes, setRoutes] = useState<InboundRoute[]>([]);
  const [stats, setStats] = useState<InboundStats>({
    total_inbound: 0,
    arf_reports: 0,
    webhooks_dispatched: 0,
    auto_suppressed_complaints: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Selected message for MIME & details drawer
  const [selectedMessage, setSelectedMessage] = useState<InboundMessage | null>(null);

  // ARF Simulation Modal state
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simProvider, setSimProvider] = useState<"yahoo" | "microsoft" | "apple" | "generic">("yahoo");
  const [simComplainingRcpt, setSimComplainingRcpt] = useState("complainer@yahoo.com");
  const [simSender, setSimSender] = useState("news@mailops.local");
  const [simSubject, setSimSubject] = useState("Exclusive VIP Weekly Deals");
  const [simulating, setSimulating] = useState(false);
  const [simFeedbackSuccess, setSimFeedbackSuccess] = useState<string | null>(null);

  // New Route Modal state
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [routePattern, setRoutePattern] = useState("*@*");
  const [routePriority, setRoutePriority] = useState(1);
  const [routeAction, setRouteAction] = useState<"store" | "webhook" | "forward" | "drop">("webhook");
  const [routeWebhookURL, setRouteWebhookURL] = useState("https://api.yourdomain.com/v1/inbound-webhook");
  const [routeEnabled, setRouteEnabled] = useState(true);
  const [savingRoute, setSavingRoute] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [msgsData, routesData, statsData] = await Promise.all([
        fetchInboundMessages(filterType, searchQuery, 100).catch(() => []),
        fetchInboundRoutes().catch(() => []),
        fetchInboundStats().catch(() => ({
          total_inbound: 0,
          arf_reports: 0,
          webhooks_dispatched: 0,
          auto_suppressed_complaints: 0,
        })),
      ]);
      setMessages(msgsData);
      setRoutes(routesData);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load inbound data:", err);
    } finally {
      setLoading(false);
    }
  }, [filterType, searchQuery]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle ARF Simulation
  const handleSimulateARF = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSimulating(true);
      const res = await simulateARFReport({
        provider: simProvider,
        complaining_rcpt: simComplainingRcpt,
        sender: simSender,
        subject: simSubject,
        feedback_type: "abuse",
      });
      setSimFeedbackSuccess(
        `RFC 5965 report ingested! Recipient ${res.arf_report?.original_recipient} was immediately added to the suppression list.`
      );
      loadData();
      setTimeout(() => {
        setSimFeedbackSuccess(null);
        setShowSimulateModal(false);
      }, 2500);
    } catch (err: any) {
      alert(err.message || "Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  // Handle Add Route
  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingRoute(true);
      await addInboundRoute({
        name: routeName,
        pattern: routePattern,
        priority: Number(routePriority),
        action: routeAction,
        webhook_url: routeAction === "webhook" ? routeWebhookURL : undefined,
        enabled: routeEnabled,
      });
      setShowRouteModal(false);
      setRouteName("");
      setRoutePattern("*@*");
      setRouteWebhookURL("https://api.yourdomain.com/v1/inbound-webhook");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create route");
    } finally {
      setSavingRoute(false);
    }
  };

  // Handle Delete Route
  const handleDeleteRoute = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inbound route?")) return;
    try {
      await deleteInboundRoute(id);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete route");
    }
  };

  // Handle Toggle Route
  const handleToggleRoute = async (route: InboundRoute) => {
    try {
      await updateInboundRoute({
        ...route,
        enabled: !route.enabled,
      });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to toggle route");
    }
  };

  // Handle Delete Message
  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteInboundMessage(id);
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete message");
    }
  };

  // Handle Clear Mailbox
  const handleClearMailbox = async () => {
    if (!confirm("Clear all received inbound messages from the mailbox?")) return;
    try {
      await clearInboundMessages();
      setSelectedMessage(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to clear mailbox");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans selection:bg-[#ff69b4]/30 selection:text-white">
      {/* Top Header & Metrics Bar */}
      <div className="border-b border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff69b4]/10 border border-[#ff69b4]/30 flex items-center justify-center text-[#ff69b4]">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white tracking-wide">
                  Inbound MX Receiver & RFC 5965 ARF Engine
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Port 25/2525 Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ESMTP Mailbox Listener, RFC 5965 ARF Spam Complaint Processor & Webhook Router
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowSimulateModal(true)}
              className="px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-[#ff69b4]/20"
            >
              <Zap className="w-3.5 h-3.5" />
              Simulate ARF Complaint
            </button>
            <button
              onClick={() => setShowRouteModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Route
            </button>
            <button
              onClick={handleClearMailbox}
              className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700/80 rounded-lg transition-all text-xs flex items-center gap-1"
              title="Purge all mailbox records"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 rounded-lg transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#ff69b4]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Live Metrics Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              Total Inbound Received
              <Inbox className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-xl font-bold text-white mt-1">{stats.total_inbound}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Live ESMTP stream</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              RFC 5965 ARF Reports
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-400 mt-1">{stats.arf_reports}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Yahoo CFL / MS JMRP / Apple</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              Auto-Suppressed Complaints
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{stats.auto_suppressed_complaints}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Instant reputation shield</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              Webhooks Dispatched
              <Webhook className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-bold text-blue-400 mt-1">{stats.webhooks_dispatched}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Routing rule dispatches</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4 border-b border-slate-800/80 -mb-4">
          <button
            onClick={() => setActiveTab("mailbox")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "mailbox"
                ? "border-[#ff69b4] text-[#ff69b4]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Live Inbound Mailbox ({messages.length})
          </button>
          <button
            onClick={() => setActiveTab("arf")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "arf"
                ? "border-[#ff69b4] text-[#ff69b4]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            RFC 5965 ARF Feedback Loop ({stats.arf_reports})
          </button>
          <button
            onClick={() => setActiveTab("routes")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "routes"
                ? "border-[#ff69b4] text-[#ff69b4]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            Inbound Routing & Webhooks ({routes.length})
          </button>
          <button
            onClick={() => setActiveTab("setup")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "setup"
                ? "border-[#ff69b4] text-[#ff69b4]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            MX Architecture & Setup
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* ============================================================== */}
        {/* TAB 1: LIVE INBOUND MAILBOX */}
        {/* ============================================================== */}
        {activeTab === "mailbox" && (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
            {/* Left list pane */}
            <div className={`flex-1 flex flex-col border-r border-slate-800 ${selectedMessage ? "hidden md:flex md:w-1/2" : "w-full"}`}>
              {/* Search & Filter header */}
              <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search recipient, sender, subject..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#ff69b4]/50"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#ff69b4]/50"
                >
                  <option value="all">All Mail</option>
                  <option value="arf">ARF Complaints Only</option>
                  <option value="standard">Standard Inbound</option>
                  <option value="webhook">Webhook Dispatched</option>
                </select>
              </div>

              {/* Message Items List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-850">
                {messages.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <Inbox className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="text-sm font-medium text-slate-400">No inbound messages received yet</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Send an email to any address on your connected domains or use the button below to simulate an RFC 5965 ARF feedback report.
                    </p>
                    <button
                      onClick={() => setShowSimulateModal(true)}
                      className="mt-4 px-3 py-1.5 bg-[#ff69b4]/10 hover:bg-[#ff69b4]/20 text-[#ff69b4] border border-[#ff69b4]/30 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Simulate RFC 5965 Spam Complaint
                    </button>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelected = selectedMessage?.id === msg.id;
                    return (
                      <div
                        key={msg.id}
                        onClick={() => setSelectedMessage(msg)}
                        className={`p-3.5 cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#ff69b4]/10 border-l-2 border-l-[#ff69b4]"
                            : "hover:bg-slate-900/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {msg.is_arf ? (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded flex items-center gap-1">
                                <ShieldAlert className="w-2.5 h-2.5" />
                                ARF COMPLAINT
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                                INBOUND MX
                              </span>
                            )}
                            {msg.matched_route && (
                              <span className="px-1.5 py-0.5 text-[9px] font-medium bg-slate-800 text-slate-300 border border-slate-700 rounded">
                                Route: {msg.matched_route}
                              </span>
                            )}
                            {msg.webhook_status === "dispatched" && (
                              <span className="px-1.5 py-0.5 text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded flex items-center gap-0.5">
                                <Webhook className="w-2.5 h-2.5" />
                                Webhook Dispatched
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(msg.received_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>

                        <div className="mt-1.5">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {msg.subject || "(No Subject)"}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                            <span className="text-slate-500">From:</span> {msg.sender}
                            <span className="text-slate-600">→</span>
                            <span className="text-slate-500">To:</span> {msg.recipient}
                          </div>
                        </div>

                        {msg.is_arf && msg.arf_report && (
                          <div className="mt-2 text-[10px] bg-amber-950/20 border border-amber-800/40 rounded p-1.5 flex items-center justify-between text-amber-300">
                            <span>Provider: {msg.arf_report.user_agent}</span>
                            {msg.arf_report.auto_suppressed && (
                              <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Auto-Suppressed
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Drawer / Detail View */}
            <div className={`flex-1 flex flex-col bg-slate-900/30 overflow-y-auto ${!selectedMessage ? "hidden md:flex items-center justify-center text-slate-500" : ""}`}>
              {selectedMessage ? (
                <div className="p-5 flex-1 flex flex-col">
                  {/* Message Detail Header */}
                  <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-white">
                          {selectedMessage.subject || "(No Subject)"}
                        </h2>
                        {selectedMessage.is_arf && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded">
                            RFC 5965 ARF
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex flex-col gap-0.5">
                        <div><strong className="text-slate-300">Envelope Sender:</strong> {selectedMessage.sender}</div>
                        <div><strong className="text-slate-300">Recipient:</strong> {selectedMessage.recipient}</div>
                        <div><strong className="text-slate-300">Received At:</strong> {new Date(selectedMessage.received_at).toUTCString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteMessage(selectedMessage.id)}
                        className="px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/40 border border-red-900/50 rounded-lg transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                      <button
                        onClick={() => setSelectedMessage(null)}
                        className="md:hidden px-2 py-1 text-xs text-slate-400 bg-slate-800 rounded-lg"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {/* ARF Feedback Report Card (If applicable) */}
                  {selectedMessage.is_arf && selectedMessage.arf_report && (
                    <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                          Parsed RFC 5965 Feedback Report
                        </div>
                        {selectedMessage.arf_report.auto_suppressed ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Auto-Suppression Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 rounded-full">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Complaining Recipient</div>
                          <div className="text-slate-100 font-mono font-medium mt-0.5">
                            {selectedMessage.arf_report.original_recipient || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Feedback Type</div>
                          <div className="text-amber-400 font-mono font-medium mt-0.5 capitalize">
                            {selectedMessage.arf_report.feedback_type} (Spam Flagged)
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Mailbox Provider / Agent</div>
                          <div className="text-slate-100 mt-0.5">
                            {selectedMessage.arf_report.user_agent}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Original Sender</div>
                          <div className="text-slate-100 font-mono mt-0.5">
                            {selectedMessage.arf_report.original_mail_from || selectedMessage.recipient}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Extracted Body Preview */}
                  <div className="mt-4 flex-1 flex flex-col">
                    <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                      <span>Message Body / MIME Payload</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Raw size: {(selectedMessage.raw_mime?.length || selectedMessage.body_text?.length || 0)} bytes
                      </span>
                    </div>
                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 whitespace-pre-wrap overflow-y-auto max-h-[380px]">
                      {selectedMessage.body_text || selectedMessage.raw_mime || "(No textual content extracted)"}
                    </div>
                  </div>

                  {/* Headers Inspector */}
                  {selectedMessage.raw_headers && Object.keys(selectedMessage.raw_headers).length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-semibold text-slate-300 mb-2">RFC Headers</div>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-slate-400 max-h-36 overflow-y-auto divide-y divide-slate-850">
                        {Object.entries(selectedMessage.raw_headers).map(([k, v]) => (
                          <div key={k} className="py-1 flex items-start gap-2">
                            <span className="text-slate-300 font-medium">{k}:</span>
                            <span className="text-slate-400 break-all">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Mail className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400">Select an inbound message to view its headers and RFC 5965 feedback report</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: RFC 5965 ARF FEEDBACK LOOP INSPECTOR */}
        {/* ============================================================== */}
        {activeTab === "arf" && (
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Information & Education Banner */}
            <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    RFC 5965 Abuse Reporting Format (ARF) Closed-Loop Protection
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    When subscribers mark an email as spam in Yahoo Mail, Microsoft Outlook/Hotmail, Apple iCloud, or Comcast, their ISP generates an automated RFC 5965 ARF complaint email.
                    MailOps captures this report on port 25/2525, extracts the original recipient, and immediately adds them to your Suppression Engine. This guarantees zero subsequent messages are sent to that recipient, safeguarding your sender domain reputation.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions & Feed Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-200">ARF Abuse Complaints Feed</h4>
                <p className="text-[11px] text-slate-500">All parsed spam complaint reports with automated suppression verification</p>
              </div>
              <button
                onClick={() => setShowSimulateModal(true)}
                className="px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                Simulate ARF Complaint
              </button>
            </div>

            {/* Table of ARF complaints */}
            {messages.filter((m) => m.is_arf).length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <ShieldCheck className="w-10 h-10 mx-auto text-emerald-400/80 mb-3" />
                <p className="text-sm font-medium text-slate-300">Clean Reputation: 0 Abuse Complaints</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  No subscribers have submitted RFC 5965 spam complaints against your domains yet. You can simulate an authentic Yahoo CFL or Microsoft JMRP feedback report to test the automated suppression loop.
                </p>
                <button
                  onClick={() => setShowSimulateModal(true)}
                  className="mt-4 px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Simulate Abuse Report Now
                </button>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Complaining Recipient</th>
                      <th className="py-2.5 px-3">Feedback Type</th>
                      <th className="py-2.5 px-3">Provider / User-Agent</th>
                      <th className="py-2.5 px-3">Original Subject</th>
                      <th className="py-2.5 px-3">Auto-Suppressed</th>
                      <th className="py-2.5 px-3">Received</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {messages
                      .filter((m) => m.is_arf)
                      .map((msg) => (
                        <tr key={msg.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                            {msg.arf_report?.original_recipient || msg.recipient}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded capitalize">
                              {msg.arf_report?.feedback_type || "abuse"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {msg.arf_report?.user_agent || "Generic RFC 5965"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">
                            {msg.subject}
                          </td>
                          <td className="py-2.5 px-3">
                            {msg.arf_report?.auto_suppressed ? (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded flex items-center gap-1 w-fit">
                                <Check className="w-3 h-3" /> Yes (Active)
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-400 rounded">
                                No
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {new Date(msg.received_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedMessage(msg);
                                setActiveTab("mailbox");
                              }}
                              className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-all inline-flex items-center gap-1"
                            >
                              Inspect MIME <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: INBOUND ROUTING & WEBHOOKS */}
        {/* ============================================================== */}
        {activeTab === "routes" && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Inbound Routing Rules & Webhook Dispatchers</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Route incoming messages based on pattern matching (e.g. <code className="text-[#ff69b4]">*@*</code>, <code className="text-[#ff69b4]">@yourdomain.com</code>, <code className="text-[#ff69b4]">support+*@domain.com</code>)
                </p>
              </div>
              <button
                onClick={() => setShowRouteModal(true)}
                className="px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Route
              </button>
            </div>

            {routes.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <Webhook className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-400">No Custom Inbound Routing Rules</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  By default, all inbound messages are accepted and stored. Add rules to forward inbound messages as JSON webhooks to your application endpoints.
                </p>
                <button
                  onClick={() => setShowRouteModal(true)}
                  className="mt-4 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Route
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {routes.map((route) => (
                  <div
                    key={route.id}
                    className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0 mt-0.5">
                        #{route.priority}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{route.name}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-[#ff69b4] border border-slate-700 rounded">
                            {route.pattern}
                          </span>
                          <span className={`px-1.5 py-0.2 text-[9px] font-semibold rounded uppercase ${
                            route.action === "webhook" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            route.action === "drop" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}>
                            Action: {route.action}
                          </span>
                        </div>
                        {route.webhook_url && (
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-mono">
                            <CornerDownRight className="w-3 h-3 text-slate-500" />
                            POST {route.webhook_url}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <button
                        onClick={() => handleToggleRoute(route)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-all ${
                          route.enabled
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        {route.enabled ? "Active" : "Disabled"}
                      </button>
                      <button
                        onClick={() => handleDeleteRoute(route.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all"
                        title="Delete Route"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: MX ARCHITECTURE & DNS SETUP GUIDE */}
        {/* ============================================================== */}
        {activeTab === "setup" && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Inbound MX Mailbox Receiver Architecture</h3>
              <p className="text-xs text-slate-400 mt-1">
                How external mail agents deliver to MailOps, how KumoMTA handles reception, and how DNS MX records should be configured.
              </p>
            </div>

            {/* Architecture Flow Diagram */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h4 className="text-xs font-semibold text-slate-300 mb-3">ESMTP Delivery Pipeline</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Step 1</div>
                  <div className="text-slate-200 font-semibold mt-1">External SMTP Sender</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Connects to your domain&apos;s MX record over Port 25 (or internal Port 2525).
                  </p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Step 2</div>
                  <div className="text-[#ff69b4] font-semibold mt-1">KumoMTA Daemon</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Fires Lua hook <code className="text-slate-300">smtp_server_message_received</code> and streams the message to MailOps.
                  </p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Step 3</div>
                  <div className="text-amber-400 font-semibold mt-1">RFC 5965 ARF Detector</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Inspects MIME parts for <code className="text-slate-300">message/feedback-report</code>. Auto-suppresses complainers.
                  </p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Step 4</div>
                  <div className="text-emerald-400 font-semibold mt-1">Routing & Webhooks</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Evaluates pattern matching and dispatches async HTTP POST payloads to your application webhooks.
                  </p>
                </div>
              </div>
            </div>

            {/* DNS MX Guide */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h4 className="text-xs font-semibold text-slate-300 mb-2">DNS MX Record Configuration</h4>
              <p className="text-xs text-slate-400 mb-3">
                To receive emails directly for your domain, publish this MX record in your DNS provider (Cloudflare, Route53, Namecheap):
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 flex items-center justify-between">
                <span>MX &nbsp;&nbsp; @ &nbsp;&nbsp; mail.yourdomain.com &nbsp;&nbsp; Priority: 10</span>
                <span className="text-slate-500 text-[11px]">TTL: 3600</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: SIMULATE RFC 5965 ARF SPAM COMPLAINT */}
      {/* ============================================================== */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#ff69b4]" />
                <h3 className="text-sm font-semibold text-white">Simulate RFC 5965 ARF Feedback Report</h3>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSimulateARF} className="p-5 space-y-4">
              {simFeedbackSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {simFeedbackSuccess}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Mailbox Provider Feedback Loop Preset
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSimProvider("yahoo");
                      setSimComplainingRcpt("user-subscriber@yahoo.com");
                    }}
                    className={`p-2.5 rounded-lg border text-xs text-center transition-all ${
                      simProvider === "yahoo"
                        ? "border-[#ff69b4] bg-[#ff69b4]/10 text-white font-semibold"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Yahoo! CFL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimProvider("microsoft");
                      setSimComplainingRcpt("outlook-user@outlook.com");
                    }}
                    className={`p-2.5 rounded-lg border text-xs text-center transition-all ${
                      simProvider === "microsoft"
                        ? "border-[#ff69b4] bg-[#ff69b4]/10 text-white font-semibold"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Microsoft JMRP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimProvider("apple");
                      setSimComplainingRcpt("icloud-user@icloud.com");
                    }}
                    className={`p-2.5 rounded-lg border text-xs text-center transition-all ${
                      simProvider === "apple"
                        ? "border-[#ff69b4] bg-[#ff69b4]/10 text-white font-semibold"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Apple iCloud
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Complaining Recipient (Will be automatically added to suppression list)
                </label>
                <input
                  type="email"
                  required
                  value={simComplainingRcpt}
                  onChange={(e) => setSimComplainingRcpt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Original Sending Address
                  </label>
                  <input
                    type="email"
                    required
                    value={simSender}
                    onChange={(e) => setSimSender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Original Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={simSubject}
                    onChange={(e) => setSimSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="px-4 py-2 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {simulating ? "Injecting RFC 5965 Report..." : "Inject ARF Spam Complaint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD INBOUND ROUTE */}
      {/* ============================================================== */}
      {showRouteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-[#ff69b4]" />
                <h3 className="text-sm font-semibold text-white">Create Inbound Routing Rule</h3>
              </div>
              <button
                onClick={() => setShowRouteModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddRoute} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Route Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Forward All to Webhook or Support Mailbox"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Recipient Match Pattern
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="*@* or @yourdomain.com"
                    value={routePattern}
                    onChange={(e) => setRoutePattern(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Supports *@*, @domain.com, prefix+*@domain.com</span>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Priority (1 = Highest)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={routePriority}
                    onChange={(e) => setRoutePriority(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Action
                </label>
                <select
                  value={routeAction}
                  onChange={(e: any) => setRouteAction(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60"
                >
                  <option value="webhook">POST to Webhook URL (JSON Payload)</option>
                  <option value="store">Accept and Store in Mailbox Only</option>
                  <option value="drop">Silently Drop</option>
                </select>
              </div>

              {routeAction === "webhook" && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Target Webhook URL (HTTP POST)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://api.yourdomain.com/inbound-webhook"
                    value={routeWebhookURL}
                    onChange={(e) => setRouteWebhookURL(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60 font-mono"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="routeEnabled"
                  checked={routeEnabled}
                  onChange={(e) => setRouteEnabled(e.target.checked)}
                  className="rounded border-slate-800 text-[#ff69b4] focus:ring-[#ff69b4]"
                />
                <label htmlFor="routeEnabled" className="text-xs text-slate-300">
                  Enable this rule immediately
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRouteModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRoute}
                  className="px-4 py-2 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
                >
                  {savingRoute ? "Saving..." : "Create Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
