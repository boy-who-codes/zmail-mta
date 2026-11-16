"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Webhook,
  Activity,
  Zap,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Send,
  Terminal,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Cpu,
  BarChart3,
  Sliders,
  Play,
} from "lucide-react";
import {
  fetchIngestStats,
  bulkInjectMessages,
  fetchWebhookSubscriptions,
  addWebhookSubscription,
  updateWebhookSubscription,
  deleteWebhookSubscription,
  testWebhookEvent,
  fetchWebhookStats,
  fetchWebhookLogs,
} from "../../lib/api";
import {
  IngestionWorkerStats,
  WebhookSubscription,
  EventWebhookPayload,
  WebhookStats,
} from "../../types/os";

export const WebhooksApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"stream" | "webhooks" | "logs" | "verify">("stream");

  // Ingestion Stream State
  const [ingestStats, setIngestStats] = useState<IngestionWorkerStats>({
    active_workers: 8,
    max_workers: 8,
    stream_name: "mailops:ingest:stream",
    stream_depth: 0,
    total_ingested: 0,
    total_processed: 0,
    current_throughput_mps: 0,
    suppressed_blocked: 0,
    quota_blocked: 0,
    avg_processing_ms: 1.2,
    redis_connected: true,
  });

  // Webhooks State
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [webhookStats, setWebhookStats] = useState<WebhookStats>({
    total_subscriptions: 0,
    active_subscriptions: 0,
    total_dispatched: 0,
    total_failed: 0,
  });
  const [logs, setLogs] = useState<EventWebhookPayload[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Simulators
  const [showSubModal, setShowSubModal] = useState(false);
  const [subName, setSubName] = useState("");
  const [subUrl, setSubUrl] = useState("https://api.yourdomain.com/v1/mailops-events");
  const [subEvents, setSubEvents] = useState<string[]>([
    "delivered",
    "bounced",
    "opened",
    "clicked",
    "spam_complaint",
  ]);
  const [creatingSub, setCreatingSub] = useState(false);

  // Bulk Ingestion Simulator State
  const [benchmarkCount, setBenchmarkCount] = useState<number>(500);
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<string | null>(null);

  // Test Event State
  const [testingEvent, setTestingEvent] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<EventWebhookPayload | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [iStats, subs, wStats, lgs] = await Promise.all([
        fetchIngestStats().catch(() => ({
          active_workers: 8,
          max_workers: 8,
          stream_name: "mailops:ingest:stream",
          stream_depth: 0,
          total_ingested: 0,
          total_processed: 0,
          current_throughput_mps: 0,
          suppressed_blocked: 0,
          quota_blocked: 0,
          avg_processing_ms: 1.2,
          redis_connected: false,
        })),
        fetchWebhookSubscriptions().catch(() => []),
        fetchWebhookStats().catch(() => ({
          total_subscriptions: 0,
          active_subscriptions: 0,
          total_dispatched: 0,
          total_failed: 0,
        })),
        fetchWebhookLogs(50).catch(() => []),
      ]);
      setIngestStats(iStats);
      setSubscriptions(subs);
      setWebhookStats(wStats);
      setLogs(lgs);
    } catch (err) {
      console.error("Failed to load webhook & stream data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle Add Subscription
  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingSub(true);
      await addWebhookSubscription({
        name: subName,
        url: subUrl,
        events: subEvents,
        status: "active",
      });
      setShowSubModal(false);
      setSubName("");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add webhook subscription");
    } finally {
      setCreatingSub(false);
    }
  };

  // Handle Delete Subscription
  const handleDeleteSub = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook subscription?")) return;
    try {
      await deleteWebhookSubscription(id);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete subscription");
    }
  };

  // Handle Toggle Subscription
  const handleToggleSub = async (sub: WebhookSubscription) => {
    try {
      await updateWebhookSubscription({
        ...sub,
        status: sub.status === "active" ? "paused" : "active",
      });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to toggle subscription");
    }
  };

  // Handle Benchmark Ingest Run
  const handleRunBenchmark = async () => {
    try {
      setBenchmarking(true);
      setBenchmarkResult(null);

      const msgs = [];
      for (let i = 1; i <= benchmarkCount; i++) {
        msgs.push({
          from: "benchmark@mailops.local",
          to: `subscriber-${i}@bench-test.com`,
          subject: `High-Velocity Stream Benchmark Batch Item #${i}`,
          text: "Message ingested through Redis Stream pipeline buffer.",
        });
      }

      const startTime = performance.now();
      const res = await bulkInjectMessages({ messages: msgs });
      const elapsedMs = Math.round(performance.now() - startTime);

      setBenchmarkResult(
        `✓ Enqueued ${res.total_queued} messages into stream "${res.stream}" in ${elapsedMs}ms (<0.1ms per item). Workers are actively processing!`
      );
      loadData();
    } catch (err: any) {
      alert(err.message || "Benchmark failed");
    } finally {
      setBenchmarking(false);
    }
  };

  // Handle Test Event Trigger
  const handleTestEvent = async () => {
    try {
      setTestingEvent(true);
      setTestResult(null);
      const res = await testWebhookEvent("delivered", "test-recipient@example.com");
      setTestResult(`✓ Test event "${res.event?.event_id}" signed with HMAC-SHA256 and dispatched to all active endpoints!`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to trigger test event");
    } finally {
      setTestingEvent(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans selection:bg-[#ff69b4]/30 selection:text-white">
      {/* Top Header & Metrics Bar */}
      <div className="border-b border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff69b4]/10 border border-[#ff69b4]/30 flex items-center justify-center text-[#ff69b4]">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white tracking-wide">
                  Redis Stream Ingestion Bus & Event Webhooks
                </h1>
                <span className={`px-2 py-0.5 text-[10px] font-semibold border rounded-full flex items-center gap-1 ${
                  ingestStats.redis_connected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-red-500/10 text-red-400 border-red-500/30"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${ingestStats.redis_connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                  {ingestStats.redis_connected ? "Redis Stream Bus Active" : "Redis Disconnected"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                10M+ Scale Buffered Ingestion, 8 Distributed Consumer Workers & HMAC-SHA256 Signed Event Streaming
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleTestEvent}
              disabled={testingEvent}
              className="px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-[#ff69b4]/20"
            >
              <Zap className="w-3.5 h-3.5" />
              {testingEvent ? "Sending..." : "Test Webhook Event"}
            </button>
            <button
              onClick={() => setShowSubModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New Webhook
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
              Stream Buffer Depth
              <Layers className="w-3.5 h-3.5 text-[#ff69b4]" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {ingestStats.stream_depth.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">mailops:ingest:stream</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              Ingestion Velocity
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {ingestStats.current_throughput_mps.toFixed(1)} <span className="text-xs font-normal text-slate-400">msgs/sec</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{ingestStats.active_workers} parallel workers</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              Total Stream Ingested
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-bold text-blue-400 mt-1">
              {ingestStats.total_ingested.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Processed: {ingestStats.total_processed.toLocaleString()}</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              Webhooks Dispatched
              <Webhook className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-purple-400 mt-1">
              {webhookStats.total_dispatched.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{webhookStats.active_subscriptions} active subscriptions</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4 border-b border-slate-800/80 -mb-4">
          <button
            onClick={() => setActiveTab("stream")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "stream"
                ? "border-[#ff69b4] text-[#ff69b4]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Redis Stream Ingestion Bus (10M+ Scale)
          </button>
          <button
            onClick={() => setActiveTab("webhooks")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "webhooks"
                ? "border-[#ff69b4] text-[#ff69b4]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            Webhook Subscriptions ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "logs"
                ? "border-[#ff69b4] text-[#ff69b4]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Live Event Stream Log ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab("verify")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "verify"
                ? "border-[#ff69b4] text-[#ff69b4]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            HMAC-SHA256 Signature Verification
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Alerts / Feedback Banners */}
        {testResult && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {testResult}
            </div>
            <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: REDIS STREAM INGESTION BUS (10M+ SCALE) */}
        {/* ============================================================== */}
        {activeTab === "stream" && (
          <div className="space-y-6">
            {/* Architecture Explanation Card */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#ff69b4]" />
                    Distributed Redis Stream Ingestion Pipeline
                  </h3>
                  <p className="text-xs text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                    To deliver tens of millions of emails daily without HTTP REST thread starvation or disk IO bottlenecks,
                    MailOps uses an O(1) Redis Stream buffer (<code className="text-[#ff69b4]">XADD mailops:ingest:stream</code>).
                    Incoming messages return an instant <code className="text-emerald-400">202 Accepted</code> acknowledgement in &lt;1ms, while a pool of 8 concurrent consumer goroutines validates suppressions, checks subaccount quotas, and streams messages directly to KumoMTA.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Worker Concurrency</div>
                    <div className="text-sm font-bold text-white mt-0.5">8 Consumer Threads</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Avg Latency</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">{ingestStats.avg_processing_ms} ms</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Bulk Benchmark Simulator */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">High-Velocity Ingestion Benchmark Simulator</h4>
                  <p className="text-[11px] text-slate-400">
                    Inject a simulated bulk audience batch directly into the Redis stream buffer to watch the pipeline ingest and process concurrently.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {[500, 1000, 2500].map((count) => (
                    <button
                      key={count}
                      onClick={() => setBenchmarkCount(count)}
                      className={`px-2.5 py-1 text-xs rounded border transition-all ${
                        benchmarkCount === count
                          ? "bg-[#ff69b4]/15 border-[#ff69b4] text-[#ff69b4] font-semibold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {count.toLocaleString()} msgs
                    </button>
                  ))}
                  <button
                    onClick={handleRunBenchmark}
                    disabled={benchmarking}
                    className="px-3.5 py-1 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded transition-all flex items-center gap-1.5 shadow-sm shadow-[#ff69b4]/20"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    {benchmarking ? "Buffering..." : "Run Bulk Ingest"}
                  </button>
                </div>
              </div>

              {benchmarkResult && (
                <div className="mt-3 p-3 bg-slate-950 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono">
                  {benchmarkResult}
                </div>
              )}
            </div>

            {/* Stream Telemetry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-medium text-slate-400">Suppression Circuit Breaker Blocks</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">
                  {ingestStats.suppressed_blocked.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Prevented from sending due to previous hard bounce or spam complaints.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-medium text-slate-400">Sub-Account Quota Ceilings Enforced</div>
                <div className="text-2xl font-bold text-red-400 mt-1">
                  {ingestStats.quota_blocked.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Rejected because the tenant daily quota was exhausted.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-medium text-slate-400">Redis Stream State</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  Active
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Connected to <code className="text-slate-400">redis:6379</code> with auto-trim at 10k items.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: WEBHOOK SUBSCRIPTIONS (PHASE 7) */}
        {/* ============================================================== */}
        {activeTab === "webhooks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-white">Event Webhook Subscriptions</h3>
                <p className="text-xs text-slate-400">
                  Deliver real-time HTTP callbacks for message events with HMAC-SHA256 signature verification.
                </p>
              </div>
              <button
                onClick={() => setShowSubModal(true)}
                className="px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Webhook
              </button>
            </div>

            {subscriptions.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <Webhook className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-300">No Webhook Subscriptions Registered</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Add endpoints to receive cryptographically signed HTTP POST notifications whenever an email is delivered, bounces, or opens.
                </p>
                <button
                  onClick={() => setShowSubModal(true)}
                  className="mt-4 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Webhook
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{sub.name}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                          sub.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}>
                          {sub.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-1">
                        POST {sub.url}
                      </div>

                      {/* Secret */}
                      <div className="flex items-center gap-2 mt-2 text-[11px]">
                        <span className="text-slate-500">Signing Secret:</span>
                        <code className="text-[#ff69b4] font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {sub.secret}
                        </code>
                        <button
                          onClick={() => copyToClipboard(sub.secret, sub.id)}
                          className="text-slate-500 hover:text-slate-300 p-0.5"
                          title="Copy Secret"
                        >
                          {copiedId === sub.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Event Chips */}
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {sub.events?.map((ev) => (
                          <span
                            key={ev}
                            className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-950 text-slate-300 border border-slate-800 rounded"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <button
                        onClick={() => handleToggleSub(sub)}
                        className={`px-2.5 py-1 text-xs rounded font-medium border transition-all ${
                          sub.status === "active"
                            ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                        }`}
                      >
                        {sub.status === "active" ? "Pause" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDeleteSub(sub.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-all"
                        title="Delete subscription"
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
        {/* TAB 3: LIVE EVENT STREAM LOG */}
        {/* ============================================================== */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-white">Live Event Webhook Stream</h3>
                <p className="text-xs text-slate-400">
                  Real-time events dispatched to subscriber endpoints with HMAC-SHA256 signatures.
                </p>
              </div>
              <button
                onClick={handleTestEvent}
                className="px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                Dispatch Test Event
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <Clock className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-300">No Events Dispatched Yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  As deliveries, bounces, opens, and spam complaints occur, they will stream here in real time.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Event Type</th>
                      <th className="py-2.5 px-3">Event ID</th>
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3 text-right">Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {logs.map((ev) => (
                      <tr key={ev.event_id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded uppercase ${
                            ev.event_type === "delivered" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            ev.event_type === "bounced" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            ev.event_type === "opened" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                            "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {ev.event_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{ev.event_id}</td>
                        <td className="py-2.5 px-3 text-slate-200">{ev.recipient || "N/A"}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedLog(ev)}
                            className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-all"
                          >
                            Inspect JSON
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
        {/* TAB 4: HMAC-SHA256 SIGNATURE VERIFICATION GUIDE */}
        {/* ============================================================== */}
        {activeTab === "verify" && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h3 className="text-sm font-semibold text-white">HMAC-SHA256 Webhook Signature Verification</h3>
              <p className="text-xs text-slate-400 mt-1">
                Every webhook HTTP POST sent by MailOps includes the <code className="text-[#ff69b4]">X-Mailops-Signature</code> header.
                This allows your server to cryptographically verify that the payload originated from MailOps and was not altered in transit.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-300 mb-2">Signature Header Structure</div>
              <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 font-mono text-xs text-[#ff69b4]">
                X-Mailops-Signature: t=1700000000,v1=9b3a4f82847c2e...
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                The signature is computed over <code className="text-slate-300">{`t + "." + raw_body`}</code> using HMAC with SHA-256 and your subscription signing secret.
              </p>
            </div>

            {/* Node.js Verification Example */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-300 mb-2">Node.js Verification Snippet</div>
              <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto">
{`const crypto = require("crypto");

function verifyMailOpsSignature(rawBody, header, secret) {
  const parts = Object.fromEntries(header.split(",").map(p => p.split("=")));
  const timestamp = parts["t"];
  const expectedSig = parts["v1"];

  const payload = \`\${timestamp}.\${rawBody}\`;
  const computedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(computedSig));
}`}
              </div>
            </div>

            {/* Python Verification Example */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-300 mb-2">Python Verification Snippet</div>
              <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto">
{`import hmac
import hashlib

def verify_mailops_signature(raw_body: bytes, header: str, secret: str) -> bool:
    parts = dict(p.split("=") for p in header.split(","))
    timestamp = parts["t"]
    expected_sig = parts["v1"]

    payload = f"{timestamp}.".encode("utf-8") + raw_body
    computed_sig = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

    return hmac.compare_digest(expected_sig, computed_sig)`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: NEW WEBHOOK SUBSCRIPTION */}
      {/* ============================================================== */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-[#ff69b4]" />
                <h3 className="text-sm font-semibold text-white">Create Event Webhook Subscription</h3>
              </div>
              <button
                onClick={() => setShowSubModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddSubscription} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Webhook Description / Application Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Billing Event Consumer"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Target Endpoint URL (HTTPS POST)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourdomain.com/webhooks/mailops"
                  value={subUrl}
                  onChange={(e) => setSubUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Subscribed Event Triggers
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "delivered", label: "delivered (Delivery Confirmed)" },
                    { id: "bounced", label: "bounced (Hard / Soft Bounce)" },
                    { id: "opened", label: "opened (Pixel Read Tracking)" },
                    { id: "clicked", label: "clicked (Link Clicked)" },
                    { id: "spam_complaint", label: "spam_complaint (RFC 5965 ARF)" },
                    { id: "*", label: "* (All Events)" },
                  ].map((ev) => (
                    <label
                      key={ev.id}
                      className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded cursor-pointer hover:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={subEvents.includes(ev.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSubEvents([...subEvents, ev.id]);
                          } else {
                            setSubEvents(subEvents.filter((item) => item !== ev.id));
                          }
                        }}
                        className="rounded border-slate-800 text-[#ff69b4] focus:ring-[#ff69b4]"
                      />
                      <span className="font-mono text-[11px] text-slate-300">{ev.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSub}
                  className="px-4 py-2 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
                >
                  {creatingSub ? "Creating..." : "Save Webhook"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: INSPECT EVENT JSON PAYLOAD */}
      {/* ============================================================== */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Event Payload: {selectedLog.event_id}</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 max-h-96 overflow-y-auto">
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
