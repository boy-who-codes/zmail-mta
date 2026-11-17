"use client";

import React, { useState, useEffect } from "react";
import {
  Mailbox as MailboxIcon,
  Layers,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Sliders,
  BarChart3,
  Key,
  Clock,
  ArrowRight,
  TrendingUp,
  Server,
  Trash2,
  Edit2,
  Lock,
  Sparkles,
  HelpCircle,
  Flame,
  Check,
  XCircle,
} from "lucide-react";
import {
  Mailbox,
  MailboxPool,
  MailboxRotationSimulation,
  fetchMailboxes,
  addMailbox,
  updateMailbox,
  deleteMailbox,
  fetchMailboxPools,
  addMailboxPool,
  updateMailboxPool,
  deleteMailboxPool,
  simulateMailboxRotation,
  fetchIPPools,
  IPPool,
  testSmtpConnection,
  SMTPTestResult,
  fetchWarmupSummary,
  tickWarmupSchedule,
  WarmupDaemonSummary,
} from "../../lib/api";

export const MailboxesApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"pools" | "mailboxes" | "warmup" | "simulator">("pools");
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [pools, setPools] = useState<MailboxPool[]>([]);
  const [ipPools, setIpPools] = useState<IPPool[]>([]);
  const [warmupSummary, setWarmupSummary] = useState<WarmupDaemonSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Modals
  const [showAddMailboxModal, setShowAddMailboxModal] = useState<boolean>(false);
  const [showAddPoolModal, setShowAddPoolModal] = useState<boolean>(false);
  const [editingMailbox, setEditingMailbox] = useState<Mailbox | null>(null);
  const [editingPool, setEditingPool] = useState<MailboxPool | null>(null);

  // Mailbox Form State
  const [mbEmail, setMbEmail] = useState("");
  const [mbDisplayName, setMbDisplayName] = useState("");
  const [mbFirstName, setMbFirstName] = useState("");
  const [mbLastName, setMbLastName] = useState("");
  const [mbDepartment, setMbDepartment] = useState("Growth Outbound");
  const [mbDomain, setMbDomain] = useState("zmail.local");
  const [mbIPPool, setMbIPPool] = useState("default");
  const [mbDailyLimit, setMbDailyLimit] = useState(400);
  const [mbHourlyLimit, setMbHourlyLimit] = useState(50);
  const [mbMinInterval, setMbMinInterval] = useState(60);
  const [mbWeight, setMbWeight] = useState(25);
  const [mbSMTPHost, setMbSMTPHost] = useState("127.0.0.1");
  const [mbSMTPPort, setMbSMTPPort] = useState(2525);
  const [mbSMTPUser, setMbSMTPUser] = useState("");
  const [mbSMTPPass, setMbSMTPPass] = useState("");
  const [mbTLSMode, setMbTLSMode] = useState("starttls");
  const [mbSignature, setMbSignature] = useState("");
  const [mbWarmup, setMbWarmup] = useState(true);

  // Handshake Tester & Warmup Ticker State
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<SMTPTestResult | null>(null);
  const [tickingWarmup, setTickingWarmup] = useState(false);

  // Pool Form State
  const [poolName, setPoolName] = useState("");
  const [poolDesc, setPoolDesc] = useState("");
  const [poolStrategy, setPoolStrategy] = useState<"round_robin" | "weighted_round_robin" | "least_recently_used" | "least_utilized">("least_utilized");
  const [poolSelectedMailboxes, setPoolSelectedMailboxes] = useState<string[]>([]);

  // Simulator State
  const [simPoolId, setSimPoolId] = useState("");
  const [simStrategy, setSimStrategy] = useState("least_utilized");
  const [simResult, setSimResult] = useState<MailboxRotationSimulation | null>(null);
  const [simRunning, setSimRunning] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mRes, pRes, ipRes, wRes] = await Promise.all([
        fetchMailboxes().catch(() => []),
        fetchMailboxPools().catch(() => []),
        fetchIPPools().catch(() => []),
        fetchWarmupSummary().catch(() => null),
      ]);
      setMailboxes(mRes);
      setPools(pRes);
      setIpPools(ipRes);
      setWarmupSummary(wRes);
      if (pRes.length > 0 && !simPoolId) {
        setSimPoolId(pRes[0].id);
        setSimStrategy(pRes[0].strategy);
      }
    } catch (err: any) {
      showToast("Failed to load mailbox configurations: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleTickWarmup = async () => {
    try {
      setTickingWarmup(true);
      const res = await tickWarmupSchedule();
      showToast(res.message || "Warmup schedule advanced by 1 day!");
      await loadData();
    } catch (err: any) {
      showToast("Failed to advance warmup schedule: " + err.message);
    } finally {
      setTickingWarmup(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      const res = await testSmtpConnection({
        host: mbSMTPHost,
        port: Number(mbSMTPPort),
        username: mbSMTPUser || mbEmail,
        password: mbSMTPPass,
        tls_mode: mbTLSMode,
      });
      setTestResult(res);
      if (res.success) {
        showToast(`SMTP Handshake Successful (${res.latency_ms}ms)`);
      } else {
        showToast(`Handshake failed: ${res.message}`);
      }
    } catch (err: any) {
      showToast("Connection test failed: " + err.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCreateMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMailbox) {
        await updateMailbox({
          id: editingMailbox.id,
          display_name: mbDisplayName,
          first_name: mbFirstName,
          last_name: mbLastName,
          department: mbDepartment,
          ip_pool_id: mbIPPool,
          daily_limit: Number(mbDailyLimit),
          hourly_limit: Number(mbHourlyLimit),
          min_interval_seconds: Number(mbMinInterval),
          weight: Number(mbWeight),
          signature_html: mbSignature,
          warmup_enabled: mbWarmup,
        });
        showToast(`Mailbox "${editingMailbox.email}" updated successfully.`);
      } else {
        await addMailbox({
          email: mbEmail,
          display_name: mbDisplayName || mbEmail,
          first_name: mbFirstName,
          last_name: mbLastName,
          department: mbDepartment,
          domain: mbDomain,
          ip_pool_id: mbIPPool,
          daily_limit: Number(mbDailyLimit),
          hourly_limit: Number(mbHourlyLimit),
          min_interval_seconds: Number(mbMinInterval),
          weight: Number(mbWeight),
          smtp_host: mbSMTPHost,
          smtp_port: Number(mbSMTPPort),
          smtp_user: mbSMTPUser || mbEmail,
          tls_mode: mbTLSMode,
          signature_html: mbSignature,
          warmup_enabled: mbWarmup,
        });
        showToast(`Sender Mailbox "${mbEmail}" registered & verified.`);
      }
      setShowAddMailboxModal(false);
      setEditingMailbox(null);
      resetMailboxForm();
      loadData();
    } catch (err: any) {
      showToast("Error saving mailbox: " + err.message);
    }
  };

  const resetMailboxForm = () => {
    setMbEmail("");
    setMbDisplayName("");
    setMbFirstName("");
    setMbLastName("");
    setMbDepartment("Growth Outbound");
    setMbDomain("zmail.local");
    setMbIPPool("default");
    setMbDailyLimit(400);
    setMbHourlyLimit(50);
    setMbMinInterval(60);
    setMbWeight(25);
    setMbSMTPHost("127.0.0.1");
    setMbSMTPPort(2525);
    setMbSMTPUser("");
    setMbSMTPPass("");
    setMbTLSMode("starttls");
    setMbSignature("");
    setMbWarmup(true);
    setTestResult(null);
  };

  const openEditMailbox = (mb: Mailbox) => {
    setEditingMailbox(mb);
    setMbEmail(mb.email);
    setMbDisplayName(mb.display_name);
    setMbFirstName(mb.first_name || "");
    setMbLastName(mb.last_name || "");
    setMbDepartment(mb.department || "Growth Outbound");
    setMbDomain(mb.domain);
    setMbIPPool(mb.ip_pool_id);
    setMbDailyLimit(mb.daily_limit);
    setMbHourlyLimit(mb.hourly_limit);
    setMbMinInterval(mb.min_interval_seconds);
    setMbWeight(mb.weight);
    setMbSignature(mb.signature_html || "");
    setMbWarmup(mb.warmup_enabled);
    setMbSMTPHost("127.0.0.1");
    setMbSMTPPort(2525);
    setMbSMTPUser(mb.email);
    setMbSMTPPass("");
    setTestResult(null);
    setShowAddMailboxModal(true);
  };

  const handleDeleteMailbox = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete mailbox "${email}"?`)) return;
    try {
      await deleteMailbox(id);
      showToast(`Mailbox "${email}" removed.`);
      loadData();
    } catch (err: any) {
      showToast("Failed to delete mailbox: " + err.message);
    }
  };

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPool) {
        await updateMailboxPool({
          id: editingPool.id,
          name: poolName,
          description: poolDesc,
          strategy: poolStrategy,
          mailbox_ids: poolSelectedMailboxes,
        });
        showToast(`Mailbox Pool "${poolName}" updated.`);
      } else {
        await addMailboxPool({
          name: poolName,
          description: poolDesc,
          strategy: poolStrategy,
          mailbox_ids: poolSelectedMailboxes,
        });
        showToast(`Mailbox Pool "${poolName}" created with ${poolSelectedMailboxes.length} mailboxes.`);
      }
      setShowAddPoolModal(false);
      setEditingPool(null);
      setPoolName("");
      setPoolDesc("");
      setPoolSelectedMailboxes([]);
      loadData();
    } catch (err: any) {
      showToast("Error saving pool: " + err.message);
    }
  };

  const openEditPool = (p: MailboxPool) => {
    setEditingPool(p);
    setPoolName(p.name);
    setPoolDesc(p.description);
    setPoolStrategy(p.strategy);
    setPoolSelectedMailboxes(p.mailbox_ids || []);
    setShowAddPoolModal(true);
  };

  const handleDeletePool = async (id: string, name: string) => {
    if (!confirm(`Delete pool "${name}"? Mailboxes will not be deleted.`)) return;
    try {
      await deleteMailboxPool(id);
      showToast(`Pool "${name}" deleted.`);
      loadData();
    } catch (err: any) {
      showToast("Failed to delete pool: " + err.message);
    }
  };

  const runSimulation = async () => {
    if (!simPoolId) return;
    try {
      setSimRunning(true);
      const res = await simulateMailboxRotation(simPoolId, simStrategy);
      setSimResult(res);
      showToast("Simulation generated across 10 sample recipients.");
    } catch (err: any) {
      showToast("Simulation error: " + err.message);
    } finally {
      setSimRunning(false);
    }
  };

  const totalCapacity = pools.reduce((acc, p) => acc + (p.daily_capacity || 0), 0);
  const totalMailboxes = mailboxes.length;
  const activeMailboxes = mailboxes.filter((m) => m.enabled).length;

  return (
    <div className="flex flex-col h-full bg-[#08090c] text-[#f7f8f8] select-none font-sans overflow-hidden">
      {/* TOP HEADER */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#0c0d12] border-b border-[#20242e] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff69b4] to-[#c71585] flex items-center justify-center shadow-lg shadow-[#ff69b4]/20">
            <MailboxIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">Mailbox Management &amp; Pools</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#27a644]/10 text-[#27a644] border border-[#27a644]/30 font-semibold">
                Rotation Engine Active
              </span>
            </div>
            <p className="text-[11px] text-[#8a8f98]">
              Automate multi-sender rotation, enforce daily/hourly limits, and preserve 100% thread continuity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141720] hover:bg-[#1b1f2b] border border-[#262c3b] text-xs text-[#d0d6e0] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#ff69b4]" : ""}`} />
            <span>Sync Live</span>
          </button>
          {activeTab === "pools" && (
            <button
              onClick={() => {
                setEditingPool(null);
                setPoolName("");
                setPoolDesc("");
                setPoolSelectedMailboxes(mailboxes.map((m) => m.id));
                setShowAddPoolModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ff69b4] hover:bg-[#ff52a5] text-black font-semibold text-xs transition-all shadow-md shadow-[#ff69b4]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Mailbox Pool</span>
            </button>
          )}
          {activeTab === "mailboxes" && (
            <button
              onClick={() => {
                setEditingMailbox(null);
                resetMailboxForm();
                setShowAddMailboxModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ff69b4] hover:bg-[#ff52a5] text-black font-semibold text-xs transition-all shadow-md shadow-[#ff69b4]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Sender Mailbox</span>
            </button>
          )}
        </div>
      </div>

      {/* NOTIFICATION BANNER */}
      {notice && (
        <div className="bg-[#1a1420] border-b border-[#ff69b4]/40 px-6 py-2 text-xs text-[#ff69b4] flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-[10px] opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* METRIC STRIP */}
      <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-[#0a0b0e] border-b border-[#1b1e26] shrink-0 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#141720] border border-[#222736] flex items-center justify-center text-[#ff69b4]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-[#8a8f98] uppercase font-mono tracking-wider">Mailbox Pools</div>
            <div className="text-sm font-bold text-[#f7f8f8]">{pools.length} Configured</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#141720] border border-[#222736] flex items-center justify-center text-[#27a644]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-[#8a8f98] uppercase font-mono tracking-wider">Active Senders</div>
            <div className="text-sm font-bold text-[#f7f8f8]">
              {activeMailboxes} / {totalMailboxes} Enabled
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#141720] border border-[#222736] flex items-center justify-center text-[#3b9eff]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-[#8a8f98] uppercase font-mono tracking-wider">Daily Aggregate Quota</div>
            <div className="text-sm font-bold text-[#f7f8f8]">{totalCapacity.toLocaleString()} msgs / day</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#141720] border border-[#222736] flex items-center justify-center text-[#a855f7]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-[#8a8f98] uppercase font-mono tracking-wider">Thread Continuity</div>
            <div className="text-sm font-bold text-[#27a644]">Strictly Enforced</div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-1 px-6 bg-[#0a0b0e] border-b border-[#20242e] shrink-0">
        <button
          onClick={() => setActiveTab("pools")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "pools"
              ? "border-[#ff69b4] text-[#ff69b4]"
              : "border-transparent text-[#8a8f98] hover:text-[#d0d6e0]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Mailbox Pools ({pools.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("mailboxes")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "mailboxes"
              ? "border-[#ff69b4] text-[#ff69b4]"
              : "border-transparent text-[#8a8f98] hover:text-[#d0d6e0]"
          }`}
        >
          <MailboxIcon className="w-3.5 h-3.5" />
          <span>Sender Mailboxes ({mailboxes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("warmup")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "warmup"
              ? "border-[#ff69b4] text-[#ff69b4]"
              : "border-transparent text-[#8a8f98] hover:text-[#d0d6e0]"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Warmup Engine ({warmupSummary?.total_warming ?? mailboxes.filter(m => m.warmup_enabled).length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("simulator");
            if (!simResult) runSimulation();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "simulator"
              ? "border-[#ff69b4] text-[#ff69b4]"
              : "border-transparent text-[#8a8f98] hover:text-[#d0d6e0]"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Real-Time Rotation Simulator</span>
        </button>
      </div>

      {/* MAIN VIEW CONTENT */}
      <div className="flex-1 overflow-auto p-6 bg-[#08090c]">
        {/* TAB 1: MAILBOX POOLS */}
        {activeTab === "pools" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#f7f8f8]">Rotation Pools</h2>
                <p className="text-xs text-[#8a8f98]">
                  Groups of sender mailboxes that rotate automatically during bulk campaign dispatches.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pools.map((p) => {
                const assignedCount = p.mailbox_ids ? p.mailbox_ids.length : 0;
                return (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl bg-[#0e1015] border border-[#20242e] hover:border-[#ff69b4]/40 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-[#f7f8f8]">{p.name}</h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1e222d] text-[#3b9eff] border border-[#3b9eff]/30 font-semibold uppercase">
                              {p.strategy.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-xs text-[#8a8f98] mt-1 line-clamp-2">{p.description}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditPool(p)}
                            className="p-1.5 rounded-lg bg-[#141720] hover:bg-[#1f2433] text-[#8a8f98] hover:text-white transition-colors"
                            title="Edit Pool"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePool(p.id, p.name)}
                            className="p-1.5 rounded-lg bg-[#141720] hover:bg-rose-950/40 text-[#8a8f98] hover:text-rose-400 transition-colors"
                            title="Delete Pool"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Quota gauges */}
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-[#1b1e26]">
                        <div className="p-2.5 rounded-xl bg-[#12141c] border border-[#1e2330]">
                          <div className="text-[10px] text-[#8a8f98] font-mono">Daily Capacity</div>
                          <div className="text-sm font-bold text-white mt-0.5">
                            {(p.daily_capacity || 0).toLocaleString()} <span className="text-[10px] text-[#8a8f98] font-normal">msgs</span>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#12141c] border border-[#1e2330]">
                          <div className="text-[10px] text-[#8a8f98] font-mono">Hourly Velocity</div>
                          <div className="text-sm font-bold text-white mt-0.5">
                            {(p.hourly_capacity || 0).toLocaleString()} <span className="text-[10px] text-[#8a8f98] font-normal">msgs/hr</span>
                          </div>
                        </div>
                      </div>

                      {/* Mailbox Members List */}
                      <div className="mt-4">
                        <div className="text-[11px] font-semibold text-[#8a8f98] mb-2 flex items-center justify-between">
                          <span>Assigned Mailboxes ({assignedCount})</span>
                          <span className="text-[10px] text-[#ff69b4]">Multi-sender rotation</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {p.mailbox_ids && p.mailbox_ids.length > 0 ? (
                            p.mailbox_ids.map((mId) => {
                              const mb = mailboxes.find((m) => m.id === mId);
                              return (
                                <span
                                  key={mId}
                                  className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#161922] border border-[#252a38] text-[#d0d6e0] flex items-center gap-1.5"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
                                  {mb ? mb.email : mId}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-[#62666d] italic">No mailboxes assigned yet.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1b1e26] flex items-center justify-between text-[11px]">
                      <span className="text-[#8a8f98] font-mono">Status: Enabled</span>
                      <button
                        onClick={() => {
                          setSimPoolId(p.id);
                          setSimStrategy(p.strategy);
                          setActiveTab("simulator");
                          setTimeout(runSimulation, 50);
                        }}
                        className="text-[#ff69b4] hover:underline flex items-center gap-1 font-semibold"
                      >
                        Simulate Rotation <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SENDER MAILBOXES */}
        {activeTab === "mailboxes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#f7f8f8]">Authorized Sender Identities</h2>
                <p className="text-xs text-[#8a8f98]">
                  Individual sending mailboxes, encrypted credentials, daily/hourly throttles, and SPF/DKIM verification.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#0e1015] border border-[#20242e] overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#12141c] border-b border-[#20242e] text-[#8a8f98] font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Sender &amp; Display Name</th>
                    <th className="py-3 px-4">Domain &amp; DNS</th>
                    <th className="py-3 px-4">IP Pool</th>
                    <th className="py-3 px-4">Daily Quota Meter</th>
                    <th className="py-3 px-4">Hourly Limit</th>
                    <th className="py-3 px-4">Min Interval</th>
                    <th className="py-3 px-4">Health</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1e26]">
                  {mailboxes.map((mb) => {
                    const dailyPct = Math.min(100, Math.round(((mb.daily_sent || 0) / (mb.daily_limit || 1)) * 100));
                    return (
                      <tr key={mb.id} className="hover:bg-[#131620] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#ff69b4]/10 border border-[#ff69b4]/30 text-[#ff69b4] flex items-center justify-center font-bold text-xs">
                              {mb.display_name ? mb.display_name[0] : "M"}
                            </div>
                            <div>
                              <div className="font-semibold text-[#f7f8f8]">{mb.display_name}</div>
                              <div className="text-[11px] text-[#8a8f98] font-mono flex items-center gap-1.5">
                                <span>{mb.email}</span>
                                {mb.credential_ref && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-[#1f2433] text-[#3b9eff] font-mono flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" /> Vault
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <span className="text-[#d0d6e0]">{mb.domain}</span>
                          <div className="text-[10px] text-[#27a644] flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> DKIM &amp; SPF Valid
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#161a24] border border-[#232a3b] text-[#d0d6e0]">
                            {mb.ip_pool_id}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 w-44">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-[#8a8f98]">
                                {mb.daily_sent || 0} / {mb.daily_limit}
                              </span>
                              <span className={dailyPct > 80 ? "text-amber-400" : "text-[#27a644]"}>{dailyPct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[#1a1d28] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  dailyPct > 80 ? "bg-amber-400" : "bg-[#27a644]"
                                }`}
                                style={{ width: `${dailyPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#d0d6e0]">
                          {mb.hourly_sent || 0} / {mb.hourly_limit}/hr
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#8a8f98]">
                          {mb.min_interval_seconds}s
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              mb.health_status === "excellent"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : mb.health_status === "good"
                                ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            }`}
                          >
                            {mb.health_status.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditMailbox(mb)}
                              className="p-1.5 rounded-lg bg-[#141720] hover:bg-[#1f2433] text-[#8a8f98] hover:text-white transition-colors"
                              title="Edit Mailbox"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMailbox(mb.id, mb.email)}
                              className="p-1.5 rounded-lg bg-[#141720] hover:bg-rose-950/40 text-[#8a8f98] hover:text-rose-400 transition-colors"
                              title="Delete Mailbox"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ROTATION SIMULATOR */}
        {activeTab === "simulator" && (
          <div className="space-y-6 max-w-4xl">
            <div className="p-5 rounded-2xl bg-[#0e1015] border border-[#20242e] space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[#f7f8f8]">Real-Time Rotation Strategy Simulator</h3>
                <p className="text-xs text-[#8a8f98] mt-0.5">
                  Simulate how your selected algorithm distributes 10 consecutive recipient messages across the pool.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-mono text-[#8a8f98] uppercase">Target Mailbox Pool</label>
                  <select
                    value={simPoolId}
                    onChange={(e) => setSimPoolId(e.target.value)}
                    className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-[#f7f8f8] font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                  >
                    {pools.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-[#8a8f98] uppercase">Rotation Algorithm</label>
                  <select
                    value={simStrategy}
                    onChange={(e) => setSimStrategy(e.target.value)}
                    className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-[#f7f8f8] font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                  >
                    <option value="least_utilized">Least Utilized (% of Daily Quota)</option>
                    <option value="round_robin">Pure Round Robin</option>
                    <option value="weighted_round_robin">Weighted Round Robin</option>
                    <option value="least_recently_used">Least Recently Used (LRU)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={runSimulation}
                    disabled={simRunning}
                    className="w-full py-2 rounded-xl bg-[#ff69b4] hover:bg-[#ff52a5] text-black font-semibold text-xs transition-all shadow-md shadow-[#ff69b4]/20 flex items-center justify-center gap-1.5"
                  >
                    <Zap className={`w-3.5 h-3.5 ${simRunning ? "animate-spin" : ""}`} />
                    <span>Run Simulation</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SIMULATION RESULTS */}
            {simResult && (
              <div className="space-y-4">
                {/* Summary Distribution Chart */}
                <div className="p-5 rounded-2xl bg-[#0e1015] border border-[#20242e] space-y-3">
                  <span className="text-[10px] font-mono text-[#8a8f98] uppercase tracking-wider">
                    Simulated Recipient Share Distribution
                  </span>
                  <div className="space-y-2">
                    {Object.entries(simResult.summary_stats).map(([email, count]) => {
                      const sharePct = Math.round((count / simResult.assignments.length) * 100);
                      return (
                        <div key={email} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-[#f7f8f8]">{email}</span>
                            <span className="text-[#ff69b4] font-bold">
                              {count} messages ({sharePct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#181b24] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#ff69b4] to-[#a855f7]"
                              style={{ width: `${sharePct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Assignment Log */}
                <div className="p-5 rounded-2xl bg-[#0e1015] border border-[#20242e] space-y-3">
                  <span className="text-[10px] font-mono text-[#8a8f98] uppercase tracking-wider">
                    Sequential Recipient-to-Mailbox Binding Log
                  </span>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {simResult.assignments.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#12141c] border border-[#1e2330] flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#1c212e] text-[#8a8f98] flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="text-white">{item.recipient}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <ArrowRight className="w-3 h-3 text-[#ff69b4]" />
                          <span className="text-[#3b9eff] font-semibold">{item.sender_name}</span>
                          <span className="text-[#8a8f98]">({item.sender_email})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUTONOMOUS WARMUP ENGINE */}
        {activeTab === "warmup" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
                  <span>Autonomous Mailbox &amp; IP Warmup Engine</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Background Daemon Active
                  </span>
                </h2>
                <p className="text-xs text-[#8a8f98]">
                  Automates gradual daily volume ramp-ups, pauses mailboxes if reputation degrades, and shields domain score.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTickWarmup}
                  disabled={tickingWarmup}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141720] hover:bg-[#1f2433] border border-[#2d3345] text-xs text-white transition-all"
                  title="Simulate or advance the 24-hour daemon evaluation cycle"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${tickingWarmup ? "animate-spin" : ""}`} />
                  <span>Advance Schedule (+1 Day)</span>
                </button>
              </div>
            </div>

            {/* Warmup Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#0e1015] border border-[#20242e] space-y-1">
                <div className="text-[10px] text-[#8a8f98] font-mono uppercase tracking-wider">Actively Warming</div>
                <div className="text-xl font-bold text-amber-400">
                  {warmupSummary?.total_warming ?? mailboxes.filter(m => m.warmup_enabled).length}
                </div>
                <div className="text-[10px] text-[#62666d]">Enforcing daily ramp curves</div>
              </div>

              <div className="p-4 rounded-xl bg-[#0e1015] border border-[#20242e] space-y-1">
                <div className="text-[10px] text-[#8a8f98] font-mono uppercase tracking-wider">Graduated / Target Met</div>
                <div className="text-xl font-bold text-[#27a644]">
                  {warmupSummary?.total_completed ?? 0}
                </div>
                <div className="text-[10px] text-[#62666d]">Full capacity unlocked</div>
              </div>

              <div className="p-4 rounded-xl bg-[#0e1015] border border-[#20242e] space-y-1">
                <div className="text-[10px] text-[#8a8f98] font-mono uppercase tracking-wider">Circuit Broken / Paused</div>
                <div className="text-xl font-bold text-rose-400">
                  {warmupSummary?.total_paused ?? 0}
                </div>
                <div className="text-[10px] text-[#62666d]">Bounce &gt;2% or Spam &gt;0.08%</div>
              </div>

              <div className="p-4 rounded-xl bg-[#0e1015] border border-[#20242e] space-y-1">
                <div className="text-[10px] text-[#8a8f98] font-mono uppercase tracking-wider">Auto-Ramp Daemon Cycle</div>
                <div className="text-xs font-mono font-bold text-[#3b9eff] truncate mt-1">
                  {warmupSummary?.last_evaluated_at ? new Date(warmupSummary.last_evaluated_at).toLocaleTimeString() : "Autonomous (24h)"}
                </div>
                <div className="text-[10px] text-[#62666d]">Evaluates health &amp; lifts limits</div>
              </div>
            </div>

            {/* Warming Mailboxes Table */}
            <div className="p-5 rounded-2xl bg-[#0e1015] border border-[#20242e] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">Mailbox Warmup Ramps</h3>
                  <p className="text-[11px] text-[#8a8f98]">
                    Daily volume expansion tracking per sender identity.
                  </p>
                </div>
              </div>

              {warmupSummary && warmupSummary.schedules && warmupSummary.schedules.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#20242e] text-[#8a8f98] text-[10px] font-mono uppercase">
                        <th className="py-2.5 px-3">Sender Mailbox</th>
                        <th className="py-2.5 px-3">Strategy</th>
                        <th className="py-2.5 px-3">Current Day</th>
                        <th className="py-2.5 px-3">Daily Limit / Target</th>
                        <th className="py-2.5 px-3">Ramp Progress</th>
                        <th className="py-2.5 px-3">Reputation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b1e26] font-mono">
                      {warmupSummary.schedules.map((s) => (
                        <tr key={s.mailbox_id} className="hover:bg-[#141720]/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-white font-sans">{s.display_name}</div>
                            <div className="text-[11px] text-[#8a8f98]">{s.email}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#161a24] border border-[#293042] text-[#3b9eff] uppercase">
                              {s.strategy}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#d0d6e0]">
                            Day {s.current_day} / {s.total_days}
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-white font-bold">{s.current_limit}</span>
                            <span className="text-[#8a8f98]"> / {s.target_limit} msgs</span>
                          </td>
                          <td className="py-3 px-3 w-48">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-[#1b1f2b] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#27a644]"
                                  style={{ width: `${Math.min(100, Math.round(s.progress_pct))}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-[#8a8f98] w-8">
                                {Math.round(s.progress_pct)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {s.status === "paused" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                <AlertTriangle className="w-3 h-3" /> Circuit Broken
                              </span>
                            ) : s.status === "completed" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#27a644]/10 text-[#27a644] border border-[#27a644]/30">
                                <CheckCircle2 className="w-3 h-3" /> Graduated
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                <Flame className="w-3 h-3" /> Warming Healthy
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#8a8f98]">
                  No mailboxes are currently enrolled in warmup schedules. Enable &quot;automated warmup ramp-up&quot; when adding or editing a mailbox.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT SENDER MAILBOX */}
      {showAddMailboxModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0f1117] border border-[#262c3b] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#20242e]">
              <div>
                <h3 className="font-bold text-sm text-white">
                  {editingMailbox ? "Edit Sender Mailbox" : "Add Authorized Sender Mailbox"}
                </h3>
                <p className="text-[11px] text-[#8a8f98]">
                  Configure quota limits, sending interval, and encrypted credentials.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddMailboxModal(false);
                  setEditingMailbox(null);
                }}
                className="text-[#8a8f98] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMailbox} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#8a8f98]">Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingMailbox}
                    value={mbEmail}
                    onChange={(e) => setMbEmail(e.target.value)}
                    placeholder="sarah@growth.zmail.local"
                    className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#ff69b4]/60 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#8a8f98]">Display Name *</label>
                  <input
                    type="text"
                    required
                    value={mbDisplayName}
                    onChange={(e) => setMbDisplayName(e.target.value)}
                    placeholder="Sarah Jenkins"
                    className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ff69b4]/60 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#8a8f98]">First Name</label>
                  <input
                    type="text"
                    value={mbFirstName}
                    onChange={(e) => setMbFirstName(e.target.value)}
                    placeholder="Sarah"
                    className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ff69b4]/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#8a8f98]">Last Name</label>
                  <input
                    type="text"
                    value={mbLastName}
                    onChange={(e) => setMbLastName(e.target.value)}
                    placeholder="Jenkins"
                    className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ff69b4]/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#8a8f98]">Department</label>
                  <input
                    type="text"
                    value={mbDepartment}
                    onChange={(e) => setMbDepartment(e.target.value)}
                    placeholder="Outbound"
                    className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ff69b4]/60 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#8a8f98]">Assigned IP Pool</label>
                  <select
                    value={mbIPPool}
                    onChange={(e) => setMbIPPool(e.target.value)}
                    className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                  >
                    <option value="default">default</option>
                    {ipPools.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#8a8f98]">Weight (1–100)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={mbWeight}
                    onChange={(e) => setMbWeight(Number(e.target.value))}
                    className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#8a8f98]">Daily Limit</label>
                  <input
                    type="number"
                    value={mbDailyLimit}
                    onChange={(e) => setMbDailyLimit(Number(e.target.value))}
                    className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#8a8f98]">Hourly Limit</label>
                  <input
                    type="number"
                    value={mbHourlyLimit}
                    onChange={(e) => setMbHourlyLimit(Number(e.target.value))}
                    className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#8a8f98]">Min Interval (s)</label>
                  <input
                    type="number"
                    value={mbMinInterval}
                    onChange={(e) => setMbMinInterval(Number(e.target.value))}
                    className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8a8f98]">Custom HTML Signature</label>
                <textarea
                  rows={3}
                  value={mbSignature}
                  onChange={(e) => setMbSignature(e.target.value)}
                  placeholder="<p>--<br><strong>Sarah Jenkins</strong><br>VP Growth Engineering</p>"
                  className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl p-2.5 text-xs text-white font-mono focus:border-[#ff69b4]/60 focus:outline-none resize-none"
                />
              </div>

              {/* SMTP Connection & Live Handshake Tester */}
              <div className="p-3.5 rounded-xl bg-[#12141c] border border-[#202534] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Server className="w-3.5 h-3.5 text-[#ff69b4]" />
                    <span>SMTP Handshake &amp; Credentials</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#8a8f98]">Port 2525 / 587 ESMTP</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-[#8a8f98]">SMTP Server Host</label>
                    <input
                      type="text"
                      value={mbSMTPHost}
                      onChange={(e) => setMbSMTPHost(e.target.value)}
                      placeholder="127.0.0.1 or mail.domain.com"
                      className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#8a8f98]">SMTP Port</label>
                    <input
                      type="number"
                      value={mbSMTPPort}
                      onChange={(e) => setMbSMTPPort(Number(e.target.value))}
                      className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-[#8a8f98]">SMTP Username</label>
                    <input
                      type="text"
                      value={mbSMTPUser}
                      onChange={(e) => setMbSMTPUser(e.target.value)}
                      placeholder={mbEmail || "username"}
                      className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#8a8f98]">SMTP Password / Token</label>
                    <input
                      type="password"
                      value={mbSMTPPass}
                      onChange={(e) => setMbSMTPPass(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c2230] hover:bg-[#252d40] border border-[#30384f] text-[11px] text-white transition-all cursor-pointer"
                  >
                    <Zap className={`w-3 h-3 text-[#ff69b4] ${testingConnection ? "animate-spin" : ""}`} />
                    <span>{testingConnection ? "Testing Handshake..." : "⚡ Test SMTP Handshake"}</span>
                  </button>
                  {testResult && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {testResult.success ? (
                        <span className="text-[#27a644] flex items-center gap-1 font-mono">
                          <Check className="w-3.5 h-3.5" /> Handshake OK ({testResult.latency_ms}ms)
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1 font-mono">
                          <XCircle className="w-3.5 h-3.5" /> Handshake failed
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {testResult && !testResult.success && (
                  <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-[10px] font-mono break-all">
                    {testResult.message}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#20242e]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mbWarmup}
                    onChange={(e) => setMbWarmup(e.target.checked)}
                    className="accent-[#ff69b4]"
                  />
                  <span className="text-xs text-[#d0d6e0]">Enable automated warmup ramp-up</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMailboxModal(false);
                      setEditingMailbox(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#141720] hover:bg-[#1e2330] text-xs text-[#d0d6e0]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#ff69b4] hover:bg-[#ff52a5] text-black font-semibold text-xs shadow-md shadow-[#ff69b4]/20"
                  >
                    {editingMailbox ? "Save Changes" : "Create Mailbox"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT MAILBOX POOL */}
      {showAddPoolModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0f1117] border border-[#262c3b] shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#20242e]">
              <div>
                <h3 className="font-bold text-sm text-white">{editingPool ? "Edit Mailbox Pool" : "Create Mailbox Pool"}</h3>
                <p className="text-[11px] text-[#8a8f98]">
                  Group verified mailboxes and configure automated rotation algorithms.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddPoolModal(false);
                  setEditingPool(null);
                }}
                className="text-[#8a8f98] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePool} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#8a8f98]">Pool Name *</label>
                <input
                  type="text"
                  required
                  value={poolName}
                  onChange={(e) => setPoolName(e.target.value)}
                  placeholder="e.g. Growth Outbound Tier-1"
                  className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ff69b4]/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8a8f98]">Description</label>
                <input
                  type="text"
                  value={poolDesc}
                  onChange={(e) => setPoolDesc(e.target.value)}
                  placeholder="High-reputation verified sender pool for customer acquisition"
                  className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ff69b4]/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8a8f98]">Rotation Strategy *</label>
                <select
                  value={poolStrategy}
                  onChange={(e: any) => setPoolStrategy(e.target.value)}
                  className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                >
                  <option value="least_utilized">Least Utilized (% of Daily Quota)</option>
                  <option value="round_robin">Pure Round Robin</option>
                  <option value="weighted_round_robin">Weighted Round Robin</option>
                  <option value="least_recently_used">Least Recently Used (LRU)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8a8f98] block mb-2">
                  Select Mailboxes for Pool ({poolSelectedMailboxes.length} selected)
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 rounded-xl bg-[#141720] border border-[#222736]">
                  {mailboxes.map((mb) => {
                    const isChecked = poolSelectedMailboxes.includes(mb.id);
                    return (
                      <label
                        key={mb.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#0e1015] hover:bg-[#181b24] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPoolSelectedMailboxes([...poolSelectedMailboxes, mb.id]);
                              } else {
                                setPoolSelectedMailboxes(poolSelectedMailboxes.filter((id) => id !== mb.id));
                              }
                            }}
                            className="accent-[#ff69b4]"
                          />
                          <span className="font-semibold text-white">{mb.display_name}</span>
                          <span className="text-[11px] font-mono text-[#8a8f98]">({mb.email})</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#27a644]">{mb.daily_limit} /day</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#20242e]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPoolModal(false);
                    setEditingPool(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#141720] hover:bg-[#1e2330] text-xs text-[#d0d6e0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#ff69b4] hover:bg-[#ff52a5] text-black font-semibold text-xs shadow-md shadow-[#ff69b4]/20"
                >
                  {editingPool ? "Save Changes" : "Create Pool"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
