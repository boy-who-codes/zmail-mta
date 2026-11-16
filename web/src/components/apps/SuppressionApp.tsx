"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
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
  Layers,
  ArrowRight,
  Send,
  Zap,
  Filter,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  fetchSuppressions,
  fetchSuppressionStats,
  addSuppression,
  deleteSuppression,
  checkSuppression,
  fetchBounces,
  recordBounce,
} from "../../lib/api";
import { SuppressionEntry, BounceRecord, SuppressionStats } from "../../types/os";

export const SuppressionApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"list" | "bounces" | "fbl">("list");
  const [suppressions, setSuppressions] = useState<SuppressionEntry[]>([]);
  const [stats, setStats] = useState<SuppressionStats>({
    total_suppressed: 0,
    hard_bounces: 0,
    spam_complaints: 0,
    unsubscribes: 0,
    manual_blocks: 0,
  });
  const [bounces, setBounces] = useState<BounceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState("all");

  // Check Recipient modal / inline state
  const [checkEmail, setCheckEmail] = useState("");
  const [checkResult, setCheckResult] = useState<{
    tested: boolean;
    suppressed: boolean;
    reason?: string;
    sourceCode?: string;
    email?: string;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Add Suppression Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newReason, setNewReason] = useState("manual");
  const [newSourceCode, setNewSourceCode] = useState("5.1.1");
  const [newTenant, setNewTenant] = useState("default");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Simulate Bounce Modal
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [simRecipient, setSimRecipient] = useState("");
  const [simSender, setSimSender] = useState("postmaster@mailops.local");
  const [simRawResponse, setSimRawResponse] = useState("");
  const [simEgressIP, setSimEgressIP] = useState("0.0.0.0");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulateSuccess, setSimulateSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [supData, statsData, bounceData] = await Promise.all([
        fetchSuppressions(searchQuery, reasonFilter).catch(() => []),
        fetchSuppressionStats().catch(() => ({
          total_suppressed: 0,
          hard_bounces: 0,
          spam_complaints: 0,
          unsubscribes: 0,
          manual_blocks: 0,
        })),
        fetchBounces(100).catch(() => []),
      ]);
      setSuppressions(supData || []);
      setStats(statsData || {
        total_suppressed: 0,
        hard_bounces: 0,
        spam_complaints: 0,
        unsubscribes: 0,
        manual_blocks: 0,
      });
      setBounces(bounceData || []);
    } catch (err) {
      console.error("Failed to load suppression data", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, reasonFilter]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCheckRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkEmail.trim()) return;
    setIsChecking(true);
    try {
      const res = await checkSuppression(checkEmail.trim());
      setCheckResult({
        tested: true,
        suppressed: res.suppressed,
        reason: res.reason,
        sourceCode: res.source_code,
        email: checkEmail.trim(),
      });
    } catch (err) {
      console.error("Check suppression error", err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      setModalError("Please enter an email or wildcard domain (e.g. @domain.com)");
      return;
    }
    setIsSubmitting(true);
    setModalError(null);
    try {
      await addSuppression(newEmail.trim(), newReason, newSourceCode, newTenant);
      setIsAddModalOpen(false);
      setNewEmail("");
      loadData();
    } catch (err: any) {
      setModalError(err.message || "Failed to add suppression entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSuppression = async (idOrEmail: string) => {
    if (!confirm(`Are you sure you want to remove "${idOrEmail}" from the suppression list?`)) return;
    try {
      await deleteSuppression(idOrEmail);
      loadData();
    } catch (err) {
      console.error("Failed to delete suppression", err);
    }
  };

  const handleSimulateBounce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simRecipient.trim() || !simRawResponse.trim()) return;
    setIsSimulating(true);
    setSimulateSuccess(null);
    try {
      const res = await recordBounce(simRecipient.trim(), simSender.trim(), simRawResponse.trim(), simEgressIP.trim());
      setSimulateSuccess(
        `Classified as [${res.record?.action?.toUpperCase()}] (${res.record?.enhanced_code}) by ${res.record?.provider}. Auto-suppressed: ${
          res.auto_suppressed ? "YES - Recipient shielded" : "NO"
        }`
      );
      loadData();
      setTimeout(() => {
        setIsSimulateModalOpen(false);
        setSimulateSuccess(null);
        setSimRecipient("");
        setSimRawResponse("");
      }, 1800);
    } catch (err) {
      console.error("Failed to simulate bounce", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const applyPreset = (preset: { rec: string; raw: string }) => {
    setSimRecipient(preset.rec);
    setSimRawResponse(preset.raw);
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case "hard_bounce":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-950/60 text-red-400 border border-red-800/60 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Hard Bounce (RFC 3463)
          </span>
        );
      case "spam_complaint":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/60 text-amber-400 border border-amber-800/60 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Spam Complaint (FBL)
          </span>
        );
      case "unsubscribe":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-950/60 text-purple-400 border border-purple-800/60 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Unsubscribe (RFC 8058)
          </span>
        );
      case "soft_bounce":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-yellow-950/60 text-yellow-400 border border-yellow-800/60 flex items-center gap-1">
            Soft Bounce
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
            Manual Block
          </span>
        );
    }
  };

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case "google":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-950/60 text-blue-400 border border-blue-800/50">Google Gmail</span>;
      case "yahoo":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/50">Yahoo CFL</span>;
      case "outlook":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">Microsoft SNDS</span>;
      case "apple":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-200 border border-zinc-600">Apple iCloud</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800">Generic ISP</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0d0e] text-[#f7f8f8] select-none overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#23252a] bg-[#121316]/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center justify-center text-red-400 shadow-sm shadow-red-950/50">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-white tracking-tight">Suppression & Bounce Engine</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                CIRCUIT BREAKER ARMED
              </span>
            </div>
            <p className="text-xs text-[#8a8f98]">RFC 3463 / 1893 Bounce Classifier, ISP Feedback Loops & Pre-Send Guard</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulateModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#181a1f] hover:bg-[#23252a] text-[#d0d3d8] text-xs font-medium border border-[#2b2d33] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            Simulate ISP Bounce
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium shadow-md shadow-red-950 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Suppression
          </button>
          <button
            onClick={loadData}
            title="Refresh"
            className="p-1.5 rounded-lg bg-[#181a1f] hover:bg-[#23252a] text-[#8a8f98] hover:text-white border border-[#2b2d33] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-5 gap-3 px-6 py-3 border-b border-[#1f2024] bg-[#0f1012]">
        <div className="px-3.5 py-2 rounded-lg bg-[#15171b] border border-[#23252a]">
          <div className="text-[11px] text-[#8a8f98] font-medium">Total Suppressed</div>
          <div className="text-lg font-bold text-white mt-0.5">{stats.total_suppressed}</div>
        </div>
        <div className="px-3.5 py-2 rounded-lg bg-[#15171b] border border-[#23252a]">
          <div className="text-[11px] text-red-400/90 font-medium flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Hard Bounces (5.X.X)
          </div>
          <div className="text-lg font-bold text-red-400 mt-0.5">{stats.hard_bounces}</div>
        </div>
        <div className="px-3.5 py-2 rounded-lg bg-[#15171b] border border-[#23252a]">
          <div className="text-[11px] text-amber-400/90 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Spam Complaints (FBL)
          </div>
          <div className="text-lg font-bold text-amber-400 mt-0.5">{stats.spam_complaints}</div>
        </div>
        <div className="px-3.5 py-2 rounded-lg bg-[#15171b] border border-[#23252a]">
          <div className="text-[11px] text-purple-400/90 font-medium flex items-center gap-1">
            <Zap className="w-3 h-3" /> Unsubscribes (RFC 8058)
          </div>
          <div className="text-lg font-bold text-purple-400 mt-0.5">{stats.unsubscribes}</div>
        </div>
        <div className="px-3.5 py-2 rounded-lg bg-[#15171b] border border-[#23252a]">
          <div className="text-[11px] text-[#8a8f98] font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Pre-Send Rejection
          </div>
          <div className="text-xs font-semibold text-emerald-400 mt-1">100% Policy Shielded</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 px-6 border-b border-[#23252a] bg-[#121316]">
        <button
          onClick={() => setActiveTab("list")}
          className={`py-3 text-xs font-medium transition-colors relative cursor-pointer ${
            activeTab === "list" ? "text-white" : "text-[#8a8f98] hover:text-[#d0d3d8]"
          }`}
        >
          Suppression Directory
          {suppressions.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-red-950/80 text-red-400 border border-red-800/40">
              {suppressions.length}
            </span>
          )}
          {activeTab === "list" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-500 rounded-t-full" />}
        </button>

        <button
          onClick={() => setActiveTab("bounces")}
          className={`py-3 text-xs font-medium transition-colors relative cursor-pointer ${
            activeTab === "bounces" ? "text-white" : "text-[#8a8f98] hover:text-[#d0d3d8]"
          }`}
        >
          RFC 3463 Bounce Stream
          {bounces.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-[#1f2024] text-[#d0d3d8] border border-[#2b2d33]">
              {bounces.length}
            </span>
          )}
          {activeTab === "bounces" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500 rounded-t-full" />}
        </button>

        <button
          onClick={() => setActiveTab("fbl")}
          className={`py-3 text-xs font-medium transition-colors relative cursor-pointer ${
            activeTab === "fbl" ? "text-white" : "text-[#8a8f98] hover:text-[#d0d3d8]"
          }`}
        >
          Feedback Loops & RFC Standards
          {activeTab === "fbl" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 rounded-t-full" />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* TAB 1: SUPPRESSION DIRECTORY */}
        {activeTab === "list" && (
          <div className="space-y-4">
            {/* Quick Check Circuit Breaker Bar */}
            <div className="p-3.5 rounded-xl bg-[#131418] border border-[#23252a] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Circuit Breaker Verification</div>
                  <div className="text-[11px] text-[#8a8f98]">Test whether an email would be blocked before dispatch</div>
                </div>
              </div>

              <form onSubmit={handleCheckRecipient} className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Enter recipient email (e.g. bounce-test@domain.com)..."
                  value={checkEmail}
                  onChange={(e) => setCheckEmail(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#0e0f12] border border-[#2b2d33] text-xs text-white placeholder-[#5d6169] focus:outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  disabled={isChecking}
                  className="px-3 py-1.5 rounded-lg bg-[#1f2127] hover:bg-[#2b2d33] text-xs text-white border border-[#32363e] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isChecking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  Check
                </button>
              </form>
            </div>

            {/* Check Result Banner */}
            {checkResult && checkResult.tested && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  checkResult.suppressed
                    ? "bg-red-950/40 border-red-800/60 text-red-200"
                    : "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {checkResult.suppressed ? <XCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  <span>
                    <strong>{checkResult.email}</strong> is{" "}
                    <strong>{checkResult.suppressed ? "SUPPRESSED (BLOCKED)" : "CLEAR TO SEND (NOT SUPPRESSED)"}</strong>
                    {checkResult.suppressed && ` — Reason: ${checkResult.reason} (${checkResult.sourceCode || "RFC-550"})`}
                  </span>
                </div>
                <button
                  onClick={() => setCheckResult(null)}
                  className="text-xs opacity-75 hover:opacity-100 hover:underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Search and Filters Bar */}
            <div className="flex items-center justify-between gap-4">
              <form onSubmit={handleSearch} className="flex-1 relative max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#5d6169]" />
                <input
                  type="text"
                  placeholder="Filter by email or domain wildcard..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#121316] border border-[#23252a] text-xs text-white placeholder-[#5d6169] focus:outline-none focus:border-red-500"
                />
              </form>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#8a8f98] flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Reason:
                </span>
                <select
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#121316] border border-[#23252a] text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="all">All Classifications</option>
                  <option value="hard_bounce">Hard Bounces (RFC 3463)</option>
                  <option value="spam_complaint">Spam Complaints (FBL)</option>
                  <option value="unsubscribe">Unsubscribes</option>
                  <option value="manual">Manual Blocks</option>
                </select>
              </div>
            </div>

            {/* Suppressions Table */}
            <div className="rounded-xl border border-[#23252a] bg-[#121316] overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#23252a] bg-[#16171c] text-[#8a8f98] text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-4">Recipient / Wildcard</th>
                    <th className="py-2.5 px-4">Reason & Standard</th>
                    <th className="py-2.5 px-4">RFC / Source Code</th>
                    <th className="py-2.5 px-4">Tenant / Pool</th>
                    <th className="py-2.5 px-4">Added Date</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2024]">
                  {suppressions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#6e737c]">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <ShieldCheck className="w-8 h-8 text-emerald-500/50" />
                          <div className="text-sm font-medium text-white">No Suppressions Found</div>
                          <p className="text-xs max-w-sm text-[#8a8f98]">
                            The suppression list is completely clean. When an ISP issues an RFC 3463 5.X.X hard bounce or FBL spam complaint, it will automatically appear here.
                          </p>
                          <div className="pt-2 flex items-center gap-2">
                            <button
                              onClick={() => setIsAddModalOpen(true)}
                              className="px-3 py-1.5 rounded-lg bg-[#1f2127] hover:bg-[#2b2d33] text-xs text-white border border-[#32363e] cursor-pointer"
                            >
                              Add Manual Suppression
                            </button>
                            <button
                              onClick={() => setIsSimulateModalOpen(true)}
                              className="px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 text-xs border border-amber-800/40 cursor-pointer"
                            >
                              Test With Bounce Simulation
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    suppressions.map((s) => (
                      <tr key={s.id} className="hover:bg-[#17191e] transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-white flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          {s.email}
                        </td>
                        <td className="py-3 px-4">{getReasonBadge(s.reason)}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#a0a5ad]">{s.source_code || "5.1.1"}</td>
                        <td className="py-3 px-4 text-[#a0a5ad]">
                          <span className="px-2 py-0.5 rounded bg-[#1c1d22] border border-[#2b2d33] text-[11px]">
                            {s.tenant || "global"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#8a8f98] text-[11px]">
                          {new Date(s.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteSuppression(s.id)}
                            title="Unsuppress Recipient"
                            className="p-1 rounded hover:bg-red-950/60 text-red-400/80 hover:text-red-300 border border-transparent hover:border-red-800/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE BOUNCE STREAM */}
        {activeTab === "bounces" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-white">MTA Bounce & Rejection Feed</h2>
                <p className="text-[11px] text-[#8a8f98]">
                  Real-time RFC 3463/1893 parsing of ISP SMTP response diagnostics with mailbox provider fingerprinting
                </p>
              </div>
              <button
                onClick={() => setIsSimulateModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm shadow-amber-950 cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5" />
                Simulate ISP Bounce
              </button>
            </div>

            <div className="rounded-xl border border-[#23252a] bg-[#121316] overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#23252a] bg-[#16171c] text-[#8a8f98] text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Recipient</th>
                    <th className="py-2.5 px-4">Mailbox Provider</th>
                    <th className="py-2.5 px-4">Classification</th>
                    <th className="py-2.5 px-4">RFC Code</th>
                    <th className="py-2.5 px-4">Circuit Action</th>
                    <th className="py-2.5 px-4">ISP Diagnostic String</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2024]">
                  {bounces.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#6e737c]">
                        <Activity className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
                        <div className="text-sm font-medium text-white">No Bounce Events Recorded</div>
                        <p className="text-xs max-w-sm mx-auto text-[#8a8f98] mt-1">
                          Zero bounces have occurred. Click &quot;Simulate ISP Bounce&quot; to test Google, Yahoo, Microsoft, or Apple RFC response strings.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    bounces.map((b) => (
                      <tr key={b.id} className="hover:bg-[#17191e] transition-colors">
                        <td className="py-2.5 px-4 text-[#8a8f98] text-[11px] font-mono whitespace-nowrap">
                          {new Date(b.received_at).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-medium text-white">{b.recipient}</td>
                        <td className="py-2.5 px-4">{getProviderBadge(b.provider)}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              b.action === "hard_bounce"
                                ? "bg-red-950/60 text-red-400 border border-red-800/60"
                                : b.action === "spam_block" || b.action === "fbl_complaint"
                                ? "bg-amber-950/60 text-amber-400 border border-amber-800/60"
                                : "bg-yellow-950/60 text-yellow-300 border border-yellow-800/60"
                            }`}
                          >
                            {b.action.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs font-semibold text-white">{b.enhanced_code}</td>
                        <td className="py-2.5 px-4">
                          {b.auto_suppressed ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1 w-max">
                              <ShieldAlert className="w-3 h-3" /> Auto-Suppressed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">
                              Monitored Only
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#8a8f98] max-w-xs truncate" title={b.diagnostic}>
                          {b.diagnostic}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: FEEDBACK LOOPS & RFC STANDARDS */}
        {activeTab === "fbl" && (
          <div className="space-y-6 max-w-4xl">
            {/* RFC Architectural Pipeline Card */}
            <div className="p-5 rounded-xl bg-[#121316] border border-[#23252a] space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-400" />
                Enterprise Feedback Loop & RFC 3463 Pipeline
              </h2>
              <p className="text-xs text-[#a0a5ad] leading-relaxed">
                Modern enterprise MTAs such as MessageBird (SparkPost) and Mailgun maintain strict IP reputation by implementing instantaneous pre-send suppression checks and automated RFC status code parsing.
              </p>

              <div className="grid grid-cols-4 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-lg bg-[#181a1f] border border-[#2b2d33] space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-400 flex items-center justify-center text-[10px] font-bold">1</span>
                    Pre-Send Guard
                  </div>
                  <p className="text-[11px] text-[#8a8f98]">
                    Every injected message is checked against the suppression cache. Blocked addresses are dropped before hitting the wire.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#181a1f] border border-[#2b2d33] space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-400 flex items-center justify-center text-[10px] font-bold">2</span>
                    RFC 3463 Parser
                  </div>
                  <p className="text-[11px] text-[#8a8f98]">
                    Parses Enhanced Mail System Status Codes (5.1.1 user unknown, 5.7.1 policy block, 4.2.2 mailbox full, 4.4.1 timeout).
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#181a1f] border border-[#2b2d33] space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-950 text-amber-400 flex items-center justify-center text-[10px] font-bold">3</span>
                    FBL ARF Receiver
                  </div>
                  <p className="text-[11px] text-[#8a8f98]">
                    Processes RFC 5965 Abuse Reporting Format (ARF) complaints from Yahoo CFL, Apple, and Outlook JMRP.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#181a1f] border border-[#2b2d33] space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center text-[10px] font-bold">4</span>
                    IP Shielding
                  </div>
                  <p className="text-[11px] text-[#8a8f98]">
                    Permanent hard bounces and complaints automatically lock down the recipient to prevent ISP blacklisting.
                  </p>
                </div>
              </div>
            </div>

            {/* Provider Deliverability Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#121316] border border-[#23252a] space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white">Google Gmail 2024+ Requirements</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">Compliant</span>
                </div>
                <p className="text-xs text-[#8a8f98]">
                  Mandatory DKIM, SPF alignment, DMARC policy, one-click List-Unsubscribe (RFC 8058), and spam complaint rate kept strictly below 0.10% (never exceeding 0.30%).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#121316] border border-[#23252a] space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white">Yahoo Mail CFL (Complaint Feedback Loop)</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">Active</span>
                </div>
                <p className="text-xs text-[#8a8f98]">
                  Subscribers clicking &quot;Mark as Spam&quot; generate immediate ARF messages. MAILOPS auto-suppresses these addresses instantly.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#121316] border border-[#23252a] space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white">Microsoft SNDS & JMRP</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">Supported</span>
                </div>
                <p className="text-xs text-[#8a8f98]">
                  Smart Network Data Services integration tracks filter state, automated trap hits, and Junk Mail Reporting complaints across Outlook/Hotmail.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#121316] border border-[#23252a] space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white">Apple iCloud Mail Postmaster</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">Active</span>
                </div>
                <p className="text-xs text-[#8a8f98]">
                  Direct support for Apple Mail privacy protection metrics, Hide My Email relay validation, and 5.2.1 / 4.2.2 mailbox status codes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SCREEN: ADD SUPPRESSION (NO DIALOG OVERLAY) */}
      {isAddModalOpen && (
        <div className="absolute inset-0 z-50 bg-[#0a0a0c] flex flex-col overflow-y-auto">
          <div className="px-5 py-3 bg-[#0f1011] border-b border-[#23252a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setIsAddModalOpen(false)} className="px-2.5 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs transition-colors cursor-pointer">← Back to Suppressions</button>
              <span className="text-[#62666d]">/</span>
              <span className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500" /> Add Suppression Entry</span>
            </div>
          </div>
          <div className="max-w-xl mx-auto w-full p-6"><div className="w-full rounded-2xl bg-[#14161a] border border-[#2b2d33] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                Add Suppression Entry
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#8a8f98] hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/60 text-red-200 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddSuppression} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#a0a5ad] mb-1 font-medium">Email Address or Wildcard Pattern</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. bounce-user@target.com or @spammer-domain.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0e0f12] border border-[#2b2d33] text-white placeholder-[#5d6169] focus:outline-none focus:border-red-500"
                />
                <span className="text-[10px] text-[#6e737c] mt-1 block">
                  Tip: Use <code>@domain.com</code> to suppress an entire domain.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a0a5ad] mb-1 font-medium">Classification Reason</label>
                  <select
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e0f12] border border-[#2b2d33] text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="hard_bounce">Hard Bounce (5.X.X)</option>
                    <option value="spam_complaint">Spam Complaint (FBL)</option>
                    <option value="unsubscribe">Unsubscribe (RFC 8058)</option>
                    <option value="manual">Manual Admin Block</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#a0a5ad] mb-1 font-medium">Source / RFC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 5.1.1, 5.7.1"
                    value={newSourceCode}
                    onChange={(e) => setNewSourceCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e0f12] border border-[#2b2d33] text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a0a5ad] mb-1 font-medium">Tenant / Scope</label>
                <input
                  type="text"
                  placeholder="default (or specific pool name)"
                  value={newTenant}
                  onChange={(e) => setNewTenant(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0e0f12] border border-[#2b2d33] text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181a1f] hover:bg-[#23252a] text-[#8a8f98] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium cursor-pointer"
                >
                  {isSubmitting ? "Adding..." : "Add to Suppression List"}
                </button>
              </div>
            </form>
          </div></div>
        </div>
      )}

      {/* SCREEN: SIMULATE ISP BOUNCE (NO DIALOG OVERLAY) */}
      {isSimulateModalOpen && (
        <div className="absolute inset-0 z-50 bg-[#0a0a0c] flex flex-col overflow-y-auto">
          <div className="px-5 py-3 bg-[#0f1011] border-b border-[#23252a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setIsSimulateModalOpen(false)} className="px-2.5 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs transition-colors cursor-pointer">← Back to Suppressions</button>
              <span className="text-[#62666d]">/</span>
              <span className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2"><Activity className="w-4 h-4 text-amber-500" /> Simulate ISP Bounce & RFC Processing</span>
            </div>
          </div>
          <div className="max-w-xl mx-auto w-full p-6"><div className="w-full rounded-2xl bg-[#14161a] border border-[#2b2d33] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                Simulate ISP Bounce & RFC Processing
              </h3>
              <button
                onClick={() => setIsSimulateModalOpen(false)}
                className="text-[#8a8f98] hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {simulateSuccess ? (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                {simulateSuccess}
              </div>
            ) : (
              <p className="text-xs text-[#8a8f98]">
                Feed a raw ISP SMTP rejection string into the classifier. Hard bounces (5.1.1, etc.) and spam complaints automatically shield the sender by adding the recipient to the suppression list.
              </p>
            )}

            {/* Quick ISP Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-[#8a8f98]">Quick ISP Diagnostics Presets:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      rec: "nonexistent-user@gmail.com",
                      raw: "550-5.1.1 The email account that you tried to reach does not exist. Please try double-checking the recipient's email address for typos. https://support.google.com/mail/?p=NoSuchUser",
                    })
                  }
                  className="p-2 rounded bg-[#181a1f] hover:bg-[#23252a] border border-[#2b2d33] text-left text-blue-300 transition-colors cursor-pointer"
                >
                  <span className="font-semibold block">Google Gmail 5.1.1</span>
                  <span className="text-[#8a8f98] text-[10px]">User Unknown (Hard Bounce)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      rec: "complaining-user@yahoo.com",
                      raw: "554 5.7.9 Message rejected due to spam complaint from Yahoo Feedback Loop processor.",
                    })
                  }
                  className="p-2 rounded bg-[#181a1f] hover:bg-[#23252a] border border-[#2b2d33] text-left text-purple-300 transition-colors cursor-pointer"
                >
                  <span className="font-semibold block">Yahoo CFL 5.7.9</span>
                  <span className="text-[#8a8f98] text-[10px]">FBL Spam Complaint</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      rec: "recipient@outlook.com",
                      raw: "550 5.7.1 Unfortunately, messages from [192.0.2.1] weren't sent. Please contact your Internet service provider since part of their network is on our block list (S3150).",
                    })
                  }
                  className="p-2 rounded bg-[#181a1f] hover:bg-[#23252a] border border-[#2b2d33] text-left text-cyan-300 transition-colors cursor-pointer"
                >
                  <span className="font-semibold block">Microsoft SNDS 5.7.1</span>
                  <span className="text-[#8a8f98] text-[10px]">Policy / Blocklist Block</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      rec: "full-inbox@icloud.com",
                      raw: "452 4.2.2 Mailbox is full / blocks quota exceeded. Please try sending again later.",
                    })
                  }
                  className="p-2 rounded bg-[#181a1f] hover:bg-[#23252a] border border-[#2b2d33] text-left text-yellow-300 transition-colors cursor-pointer"
                >
                  <span className="font-semibold block">Apple iCloud 4.2.2</span>
                  <span className="text-[#8a8f98] text-[10px]">Mailbox Full (Soft Bounce)</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSimulateBounce} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#a0a5ad] mb-1 font-medium">Bounced Recipient Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. invalid-user@gmail.com"
                  value={simRecipient}
                  onChange={(e) => setSimRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0e0f12] border border-[#2b2d33] text-white placeholder-[#5d6169] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#a0a5ad] mb-1 font-medium">Raw ISP SMTP Diagnostic Response</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Paste or select a preset RFC response above..."
                  value={simRawResponse}
                  onChange={(e) => setSimRawResponse(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0e0f12] border border-[#2b2d33] text-white placeholder-[#5d6169] focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSimulateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181a1f] hover:bg-[#23252a] text-[#8a8f98] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSimulating}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium cursor-pointer"
                >
                  {isSimulating ? "Classifying..." : "Run RFC Classifier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}
  </div>
);
};