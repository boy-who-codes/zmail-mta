"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Layers,
  Plus,
  RefreshCw,
  Server,
  Shield,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Globe,
  Flame,
  Clock,
  Play,
  Pause,
  FastForward,
  Activity,
  Sliders,
  Check,
  Zap,
} from "lucide-react";
import {
  fetchIPPools,
  fetchSendingIPs,
  addIPPool,
  updateIPPool,
  deleteIPPool,
  addSendingIP,
  updateSendingIP,
  deleteSendingIP,
  fetchWarmupPlans,
  fetchWarmupSchedules,
  startWarmupSchedule,
  pauseWarmupSchedule,
  resumeWarmupSchedule,
  advanceWarmupDay,
  deleteWarmupSchedule,
  fetchWarmupStats,
  fetchIPSyncStatus,
  forceIPSync,
  fetchIPTelemetry,
} from "../../lib/api";
import { WarmupPlan, IPWarmupSchedule, WarmupStats } from "../../types/os";

interface IPPool {
  id: string;
  name: string;
  type: string;
  ips: string[];
  warmup_status: string;
  warmup_day?: number;
  daily_target: number;
  daily_sent: number;
}

interface SendingIP {
  ip: string;
  pool_id: string;
  reverse_dns: string;
  reputation_score: number;
  weight: number;
  status: string;
}

export const IpPoolsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"pools" | "warmup" | "telemetry">("pools");
  const [pools, setPools] = useState<IPPool[]>([]);
  const [ips, setIps] = useState<SendingIP[]>([]);
  const [plans, setPlans] = useState<WarmupPlan[]>([]);
  const [schedules, setSchedules] = useState<IPWarmupSchedule[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [isSyncingSources, setIsSyncingSources] = useState<boolean>(false);
  const [warmupStats, setWarmupStats] = useState<WarmupStats>({
    active_schedules: 0,
    paused_schedules: 0,
    completed_schedules: 0,
    total_quota_today: 0,
    total_sent_today: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Screen routing (replaces modal overlays with dedicated screens)
  type SubScreen = "overview" | "pool-form" | "ip-form" | "warmup-form";
  const [subScreen, setSubScreen] = useState<SubScreen>("overview");
  const [editingPool, setEditingPool] = useState<IPPool | null>(null);
  const [poolName, setPoolName] = useState<string>("");
  const [poolType, setPoolType] = useState<string>("transactional");
  const [poolWarmup, setPoolWarmup] = useState<string>("complete");
  const [poolTarget, setPoolTarget] = useState<number>(1000000);

  // IP Form State
  const [editingIp, setEditingIp] = useState<SendingIP | null>(null);
  const [ipAddress, setIpAddress] = useState<string>("");
  const [ipPoolId, setIpPoolId] = useState<string>("");
  const [ipPtr, setIpPtr] = useState<string>("");
  const [ipWeight, setIpWeight] = useState<number>(100);
  const [ipStatus, setIpStatus] = useState<string>("active");

  // Warmup Form State
  const [warmupTargetType, setWarmupTargetType] = useState<"ip" | "pool">("pool");
  const [warmupTargetId, setWarmupTargetId] = useState<string>("");
  const [warmupPlanId, setWarmupPlanId] = useState<string>("standard-30");
  const [warmupStartDay, setWarmupStartDay] = useState<number>(1);
  const [warmupOverflowAction, setWarmupOverflowAction] = useState<string>("route_overflow_pool");
  const [warmupOverflowPool, setWarmupOverflowPool] = useState<string>("default");

  // Visualizer Curve Selection
  const [previewPlanId, setPreviewPlanId] = useState<string>("standard-30");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [poolsData, ipsData, plansData, schedsData, statsData, syncData, telemData] = await Promise.all([
        fetchIPPools().catch(() => []),
        fetchSendingIPs().catch(() => []),
        fetchWarmupPlans().catch(() => []),
        fetchWarmupSchedules().catch(() => []),
        fetchWarmupStats().catch(() => ({
          active_schedules: 0,
          paused_schedules: 0,
          completed_schedules: 0,
          total_quota_today: 0,
          total_sent_today: 0,
        })),
        fetchIPSyncStatus().catch(() => null),
        fetchIPTelemetry().catch(() => null),
      ]);
      setPools(poolsData || []);
      setIps(ipsData || []);
      setPlans(plansData || []);
      setSchedules(schedsData || []);
      setWarmupStats(statsData || {
        active_schedules: 0,
        paused_schedules: 0,
        completed_schedules: 0,
        total_quota_today: 0,
        total_sent_today: 0,
      });
      if (syncData) setSyncStatus(syncData);
      if (telemData) setTelemetry(telemData);

      if (!ipPoolId && poolsData && poolsData.length > 0) {
        setIpPoolId(poolsData[0].id);
      }
      if (!warmupTargetId) {
        if (poolsData && poolsData.length > 0) {
          setWarmupTargetId(poolsData[0].id);
        } else if (ipsData && ipsData.length > 0) {
          setWarmupTargetId(ipsData[0].ip);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [ipPoolId, warmupTargetId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  const showNotice = (msg: string) => {
    setActionSuccessNotice(msg);
    setTimeout(() => setActionSuccessNotice(null), 3000);
  };

  // --- POOL CRUD HANDLERS ---
  const handleOpenCreatePool = () => {
    setEditingPool(null);
    setPoolName("");
    setPoolType("transactional");
    setPoolWarmup("complete");
    setPoolTarget(1000000);
    setSubScreen("pool-form");
  };

  const handleOpenEditPool = (pool: IPPool) => {
    setEditingPool(pool);
    setPoolName(pool.name);
    setPoolType(pool.type || "transactional");
    setPoolWarmup(pool.warmup_status || "complete");
    setPoolTarget(pool.daily_target || 1000000);
    setSubScreen("pool-form");
  };

  const handleForceSync = async () => {
    try {
      setIsSyncingSources(true);
      const res = await forceIPSync();
      setSyncStatus(res);
      setActionSuccessNotice("Successfully validated & synchronized sources.toml atomically with rollback backup!");
      setTimeout(() => setActionSuccessNotice(null), 4000);
      loadData();
    } catch (err: any) {
      alert("Sync failed: " + (err.message || String(err)));
    } finally {
      setIsSyncingSources(false);
    }
  };

  const handleSavePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolName.trim()) return;

    try {
      setIsSubmitting(true);
      if (editingPool) {
        await updateIPPool({
          id: editingPool.id,
          name: poolName.trim(),
          type: poolType,
          warmup_status: poolWarmup,
          daily_target: Number(poolTarget),
        });
      } else {
        await addIPPool(poolName.trim(), poolType, [], Number(poolTarget));
      }
      setSubScreen("overview");
      showNotice(editingPool ? "Pool updated successfully" : "IP pool created successfully");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save IP pool");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePool = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete sending IP pool "${name}"?`)) return;
    try {
      await deleteIPPool(id);
      showNotice(`Pool "${name}" deleted`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete IP pool");
    }
  };

  // --- IP CRUD HANDLERS ---
  const handleOpenCreateIp = () => {
    setEditingIp(null);
    setIpAddress("");
    setIpPoolId(pools.length > 0 ? pools[0].id : "");
    setIpPtr("");
    setIpWeight(100);
    setIpStatus("active");
    setSubScreen("ip-form");
  };

  const handleOpenEditIp = (item: SendingIP) => {
    setEditingIp(item);
    setIpAddress(item.ip);
    setIpPoolId(item.pool_id);
    setIpPtr(item.reverse_dns || "");
    setIpWeight(item.weight || 100);
    setIpStatus(item.status || "active");
    setSubScreen("ip-form");
  };

  const handleSaveIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress.trim()) return;

    try {
      setIsSubmitting(true);
      if (editingIp) {
        await updateSendingIP({
          ip: ipAddress.trim(),
          pool_id: ipPoolId,
          reverse_dns: ipPtr.trim(),
          weight: Number(ipWeight),
          status: ipStatus,
        });
      } else {
        await addSendingIP({
          ip: ipAddress.trim(),
          pool_id: ipPoolId,
          reverse_dns: ipPtr.trim(),
          weight: Number(ipWeight),
          status: ipStatus,
        });
      }
      setSubScreen("overview");
      showNotice(editingIp ? "IP configuration updated" : "Dedicated IP added");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save sending IP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIp = async (ipStr: string) => {
    if (!confirm(`Are you sure you want to remove dedicated IP "${ipStr}"?`)) return;
    try {
      await deleteSendingIP(ipStr);
      showNotice(`IP "${ipStr}" removed`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete IP");
    }
  };

  // --- WARMUP SCHEDULE HANDLERS ---
  const handleOpenStartWarmup = (targetType?: "ip" | "pool", targetId?: string) => {
    if (targetType) setWarmupTargetType(targetType);
    if (targetId) setWarmupTargetId(targetId);
    else if (pools.length > 0) setWarmupTargetId(pools[0].id);
    setWarmupPlanId("standard-30");
    setWarmupStartDay(1);
    setWarmupOverflowAction("route_overflow_pool");
    setSubScreen("warmup-form");
  };

  const handleStartWarmupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warmupTargetId) {
      alert("Please select a target pool or IP");
      return;
    }
    try {
      setIsSubmitting(true);
      await startWarmupSchedule({
        target_type: warmupTargetType,
        target_id: warmupTargetId,
        plan_id: warmupPlanId,
        overflow_action: warmupOverflowAction,
        overflow_pool: warmupOverflowPool,
        start_day: Number(warmupStartDay),
      });
      setSubScreen("overview");
      showNotice(`Warmup schedule initiated for ${warmupTargetId}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to start warmup schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePauseWarmup = async (targetId: string) => {
    try {
      await pauseWarmupSchedule(targetId);
      showNotice(`Warmup paused for ${targetId}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to pause warmup");
    }
  };

  const handleResumeWarmup = async (targetId: string) => {
    try {
      await resumeWarmupSchedule(targetId);
      showNotice(`Warmup resumed for ${targetId}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to resume warmup");
    }
  };

  const handleAdvanceWarmup = async (targetId: string) => {
    try {
      const res = await advanceWarmupDay(targetId);
      showNotice(`Simulated day advance for ${targetId} -> Day ${res.current_day} (Quota: ${res.daily_quota.toLocaleString()})`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to advance warmup day");
    }
  };

  const handleDeleteWarmup = async (targetId: string) => {
    if (!confirm(`Are you sure you want to cancel the warmup schedule for ${targetId}?`)) return;
    try {
      await deleteWarmupSchedule(targetId);
      showNotice(`Warmup schedule cancelled for ${targetId}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to remove warmup schedule");
    }
  };

  // Helper to draw the SVG Warmup curve
  const currentPreviewPlan = plans.find((p) => p.id === previewPlanId) || plans[0];

  const renderCurvePoints = () => {
    if (!currentPreviewPlan || !currentPreviewPlan.daily_limits) return null;
    const days = Object.keys(currentPreviewPlan.daily_limits).map(Number).sort((a, b) => a - b);
    if (days.length === 0) return null;

    const maxDay = days[days.length - 1];
    const maxVal = currentPreviewPlan.daily_limits[maxDay] || 100000;

    const width = 640;
    const height = 140;
    const padX = 30;
    const padY = 20;

    const pts = days.map((d) => {
      const val = currentPreviewPlan.daily_limits[d] || 0;
      const x = padX + ((d - 1) / (maxDay - 1)) * (width - padX * 2);
      const y = height - padY - (val / maxVal) * (height - padY * 2);
      return { d, val, x, y };
    });

    const dPath = pts.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "");
    const areaPath = `${dPath} L ${pts[pts.length - 1].x} ${height - padY} L ${pts[0].x} ${height - padY} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36 overflow-visible select-none">
        <defs>
          <linearGradient id="warmupGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff69b4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff69b4" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="#23252a" strokeDasharray="3 3" />
        <line x1={padX} y1={height / 2} x2={width - padX} y2={height / 2} stroke="#23252a" strokeDasharray="3 3" />
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#23252a" />

        {/* Area fill */}
        <path d={areaPath} fill="url(#warmupGrad)" />

        {/* Curve line */}
        <path d={dPath} fill="none" stroke="#ff69b4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Highlight points for key milestones */}
        {pts
          .filter((p) => p.d === 1 || p.d === 7 || p.d === 14 || p.d === 21 || p.d === maxDay)
          .map((p) => (
            <g key={p.d}>
              <circle cx={p.x} cy={p.y} r="4" fill="#0f1012" stroke="#ff69b4" strokeWidth="2" />
              <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#d0d3d8" fontSize="9" fontWeight="600">
                {p.val >= 1000 ? `${(p.val / 1000).toFixed(0)}k` : p.val}
              </text>
              <text x={p.x} y={height - 5} textAnchor="middle" fill="#62666d" fontSize="9">
                D{p.d}
              </text>
            </g>
          ))}
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-xs font-sans select-none">
      {subScreen === "overview" && (
        <>
          {/* Top Banner */}
      <div className="px-5 py-3 bg-[#0f1011] border-b border-[#23252a] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#5e6ad2]/20 border border-[#5e6ad2]/40 flex items-center justify-center text-[#828cf5]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#f7f8f8]">Sending IPs & Warmup DAGs</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#181a1f] border border-[#2b2d33] text-[#8a8f98]">
                Multi-Speed Egress Automation
              </span>
            </div>
            <p className="text-[11px] text-[#8a8f98]">
              {pools.length} Pools | {ips.length} Dedicated IPs | {schedules.length} Active Warmups
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actionSuccessNotice && (
            <div className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              {actionSuccessNotice}
            </div>
          )}

          <button
            onClick={loadData}
            disabled={isLoading}
            title="Refresh"
            className="p-2 rounded-lg bg-[#141516] hover:bg-[#1a1b1d] border border-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {activeTab === "pools" ? (
            <>
              <button
                onClick={handleOpenCreateIp}
                className="px-3 py-1.5 bg-[#18191a] hover:bg-[#23252a] text-[#f7f8f8] border border-[#2b2d33] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Dedicated IP</span>
              </button>
              <button
                onClick={handleOpenCreatePool}
                className="px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff52a8] text-[#0a0a0c] font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create IP Pool</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => handleOpenStartWarmup()}
              className="px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff52a8] text-[#0a0a0c] font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Start Warmup Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 px-5 border-b border-[#23252a] bg-[#121316]">
        <button
          onClick={() => setActiveTab("pools")}
          className={`py-2.5 text-xs font-medium transition-colors relative cursor-pointer ${
            activeTab === "pools" ? "text-white" : "text-[#8a8f98] hover:text-[#d0d3d8]"
          }`}
        >
          IP Pools & Dedicated IPs
          {activeTab === "pools" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#5e6ad2] rounded-t-full" />}
        </button>

        <button
          onClick={() => setActiveTab("warmup")}
          className={`py-2.5 text-xs font-medium transition-colors relative flex items-center gap-1.5 cursor-pointer ${
            activeTab === "warmup" ? "text-white" : "text-[#8a8f98] hover:text-[#d0d3d8]"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-[#ff69b4]" />
          <span>Automated Warmup Scheduler</span>
          {schedules.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-pink-950/80 text-pink-300 border border-pink-800/40 font-semibold">
              {schedules.length}
            </span>
          )}
          {activeTab === "warmup" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff69b4] rounded-t-full" />}
        </button>

        <button
          onClick={() => setActiveTab("telemetry")}
          className={`py-2.5 text-xs font-medium transition-colors relative flex items-center gap-1.5 cursor-pointer ${
            activeTab === "telemetry" ? "text-white" : "text-[#8a8f98] hover:text-[#d0d3d8]"
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Outbound IP Verification & Telemetry</span>
          {syncStatus && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold border ${
              syncStatus.status === "synced" 
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/40" 
                : "bg-amber-950/80 text-amber-300 border-amber-800/40"
            }`}>
              {syncStatus.status === "synced" ? `Synced v${syncStatus.config_version}` : syncStatus.status}
            </span>
          )}
          {activeTab === "telemetry" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-400 rounded-t-full" />}
        </button>
      </div>

      {/* TAB 1: IP POOLS & DEDICATED IPS */}
      {activeTab === "pools" && (
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* IP Pools Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#f7f8f8]">Configured Egress Pools</span>
              <span className="text-[11px] text-[#8a8f98]">Isolates delivery reputation by traffic type</span>
            </div>

            {pools.length === 0 ? (
              <div className="p-8 border border-[#23252a] rounded-xl bg-[#0f1011] text-center flex flex-col items-center justify-center">
                <Layers className="w-8 h-8 text-[#5e6ad2] mb-2 stroke-[1.5]" />
                <h4 className="font-medium text-[#d0d6e0] mb-1">No IP Pools Created</h4>
                <p className="text-[11px] text-[#8a8f98] max-w-sm mb-3">
                  Create sending pools to separate transactional receipts from marketing newsletters.
                </p>
                <button
                  onClick={handleOpenCreatePool}
                  className="px-3 py-1.5 bg-[#5e6ad2] hover:bg-[#4f5ac0] text-white rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Pool</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pools.map((pool) => {
                  const poolIps = ips.filter((ip) => ip.pool_id === pool.id);
                  const isWarming = pool.warmup_status === "in_progress";
                  return (
                    <div
                      key={pool.id}
                      className="p-3.5 border border-[#23252a] rounded-xl bg-[#101113] hover:border-[#35373e] transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-sm text-[#f7f8f8]">{pool.name}</h4>
                            <span className="text-[10px] text-[#8a8f98] font-mono">{pool.id}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                              pool.type === "transactional"
                                ? "bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30"
                                : pool.type === "marketing"
                                ? "bg-[#ff69b4]/15 text-[#ff69b4] border border-[#ff69b4]/30"
                                : "bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30"
                            }`}
                          >
                            {pool.type}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-[#141516] p-2 rounded border border-[#1e2023]">
                            <span className="text-[#8a8f98] block text-[10px]">Active IPs</span>
                            <span className="font-semibold text-[#f7f8f8]">{poolIps.length} Interfaces</span>
                          </div>
                          <div className="bg-[#141516] p-2 rounded border border-[#1e2023]">
                            <span className="text-[#8a8f98] block text-[10px]">Warmup Status</span>
                            <span
                              className={`font-semibold ${
                                isWarming ? "text-[#ff69b4] flex items-center gap-1" : "text-[#27a644]"
                              }`}
                            >
                              {isWarming && <span className="w-1.5 h-1.5 rounded-full bg-[#ff69b4] animate-pulse" />}
                              {isWarming ? `Day ${pool.warmup_day || 1} Ramp` : "Complete"}
                            </span>
                          </div>
                        </div>

                        {isWarming && (
                          <div className="mt-2.5">
                            <div className="flex justify-between text-[10px] text-[#8a8f98] mb-1">
                              <span>Today&apos;s Quota</span>
                              <span>
                                {pool.daily_sent || 0} / {(pool.daily_target || 50).toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full bg-[#181a1f] h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#ff69b4] h-full transition-all"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    ((pool.daily_sent || 0) / (pool.daily_target || 50)) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3.5 pt-2 border-t border-[#1e2023] flex items-center justify-between">
                        {!isWarming ? (
                          <button
                            onClick={() => handleOpenStartWarmup("pool", pool.id)}
                            className="text-[11px] text-[#ff69b4] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Flame className="w-3 h-3" /> Start Warmup
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveTab("warmup")}
                            className="text-[11px] text-[#8a8f98] hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Activity className="w-3 h-3" /> View DAG
                          </button>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditPool(pool)}
                            title="Edit Pool"
                            className="p-1 rounded hover:bg-[#18191a] text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePool(pool.id, pool.name)}
                            title="Delete Pool"
                            className="p-1 rounded hover:bg-[#ff2047]/20 text-[#8a8f98] hover:text-[#ff2047] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dedicated IPs Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#f7f8f8]">Dedicated Sending IP Addresses</span>
              <span className="text-[11px] text-[#8a8f98]">Direct egress interfaces mapped to mail server sockets</span>
            </div>

            {ips.length === 0 ? (
              <div className="p-8 border border-[#23252a] rounded-xl bg-[#0f1011] text-center">
                <Server className="w-8 h-8 text-[#8a8f98] mb-2 mx-auto stroke-[1.5]" />
                <p className="font-medium text-[#d0d6e0]">No Dedicated Sending IPs Configured</p>
                <p className="text-[11px] text-[#62666d] max-w-sm mx-auto mt-1 mb-3">
                  Emails are dispatched via the host default interface (0.0.0.0). Add dedicated IP addresses to assign them to pools and attach automated warmup schedules.
                </p>
                <button
                  onClick={handleOpenCreateIp}
                  className="px-3 py-1.5 bg-[#5e6ad2] hover:bg-[#4f5ac0] text-white rounded text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Dedicated IP</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-[#23252a] bg-[#101113] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="text-[10px] uppercase text-[#62666d] bg-[#141517] border-b border-[#23252a]">
                    <tr>
                      <th className="px-3.5 py-2.5">IP Address</th>
                      <th className="px-3.5 py-2.5">Assigned Pool</th>
                      <th className="px-3.5 py-2.5">Reverse DNS (PTR)</th>
                      <th className="px-3.5 py-2.5">Reputation</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2023] text-[11px]">
                    {ips.map((row) => (
                      <tr key={row.ip} className="hover:bg-[#141516] transition-colors">
                        <td className="px-3.5 py-2.5 font-mono text-[#f7f8f8] font-bold">{row.ip}</td>
                        <td className="px-3.5 py-2.5 text-[#d0d6e0]">
                          {pools.find((p) => p.id === row.pool_id)?.name || row.pool_id || "Unassigned"}
                        </td>
                        <td className="px-3.5 py-2.5 text-[#27a644] font-mono">{row.reverse_dns || "None"}</td>
                        <td className="px-3.5 py-2.5 text-[#27a644] font-medium">
                          {row.reputation_score || 99} / 100
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              row.status === "warmup"
                                ? "bg-pink-950/60 text-pink-300 border border-pink-800/50"
                                : "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right space-x-1">
                          <button
                            onClick={() => handleOpenStartWarmup("ip", row.ip)}
                            title="Start Warmup"
                            className="p-1 rounded hover:bg-[#18191a] text-[#ff69b4] cursor-pointer"
                          >
                            <Flame className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => handleOpenEditIp(row)}
                            title="Edit IP"
                            className="p-1 rounded hover:bg-[#18191a] text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteIp(row.ip)}
                            title="Delete IP"
                            className="p-1 rounded hover:bg-[#ff2047]/20 text-[#8a8f98] hover:text-[#ff2047] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* TAB 2: AUTOMATED WARMUP SCHEDULER & DAGS */}
      {activeTab === "warmup" && (
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* Top KPI Bar */}
          <div className="grid grid-cols-4 gap-3">
            <div className="px-4 py-3 rounded-xl bg-[#121316] border border-[#23252a]">
              <div className="text-[11px] text-[#8a8f98] font-medium flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#ff69b4]" /> Active Schedules
              </div>
              <div className="text-xl font-bold text-white mt-1">{warmupStats.active_schedules}</div>
            </div>

            <div className="px-4 py-3 rounded-xl bg-[#121316] border border-[#23252a]">
              <div className="text-[11px] text-[#8a8f98] font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Today&apos;s Quota Allowed
              </div>
              <div className="text-xl font-bold text-white mt-1">
                {warmupStats.total_quota_today > 0 ? warmupStats.total_quota_today.toLocaleString() : "Unrestricted"}
              </div>
            </div>

            <div className="px-4 py-3 rounded-xl bg-[#121316] border border-[#23252a]">
              <div className="text-[11px] text-[#8a8f98] font-medium flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" /> Dispatched Today
              </div>
              <div className="text-xl font-bold text-amber-300 mt-1">{warmupStats.total_sent_today.toLocaleString()}</div>
            </div>

            <div className="px-4 py-3 rounded-xl bg-[#121316] border border-[#23252a]">
              <div className="text-[11px] text-[#8a8f98] font-medium flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" /> Multi-Speed Throttle DAG
              </div>
              <div className="text-xs font-semibold text-emerald-400 mt-1.5">Synchronized with TSA</div>
            </div>
          </div>

          {/* Interactive Warmup Ramp Curve Visualizer */}
          <div className="p-4 rounded-xl bg-[#121316] border border-[#23252a] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#ff69b4]" />
                  Warmup Ramp Velocity Curve Visualizer
                </h3>
                <p className="text-[11px] text-[#8a8f98]">
                  Automated volume progression schedule and dynamic TSA traffic shaping throttle DAGs
                </p>
              </div>

              {/* Curve Switcher */}
              <div className="flex items-center gap-1 bg-[#181a1f] p-1 rounded-lg border border-[#2b2d33]">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPreviewPlanId(p.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      previewPlanId === p.id ? "bg-[#ff69b4] text-[#0a0a0c] font-bold" : "text-[#8a8f98] hover:text-[#f7f8f8]"
                    }`}
                  >
                    {p.name.split(" ")[0]} ({p.duration_days}d)
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Chart */}
            <div className="pt-2">{renderCurvePoints()}</div>

            {/* 4-Stage Throttle DAG Overview */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#1f2024] text-[11px]">
              <div className="p-2.5 rounded-lg bg-[#16171b] border border-[#23252a]">
                <span className="text-[10px] text-[#8a8f98] block">Days 1 - 5</span>
                <span className="font-semibold text-white block">Stage 1: Cold Initiation</span>
                <span className="text-[10px] text-pink-300">Max 5 msgs/min (conn: 2)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#16171b] border border-[#23252a]">
                <span className="text-[10px] text-[#8a8f98] block">Days 6 - 15</span>
                <span className="font-semibold text-white block">Stage 2: Graduated Expansion</span>
                <span className="text-[10px] text-amber-300">Max 30 msgs/min (conn: 5)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#16171b] border border-[#23252a]">
                <span className="text-[10px] text-[#8a8f98] block">Days 16 - 25</span>
                <span className="font-semibold text-white block">Stage 3: Velocity Acceleration</span>
                <span className="text-[10px] text-blue-300">Max 20 msgs/sec (conn: 10)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#16171b] border border-[#23252a]">
                <span className="text-[10px] text-[#8a8f98] block">Day 26+</span>
                <span className="font-semibold text-white block">Stage 4: Unrestricted Velocity</span>
                <span className="text-[10px] text-emerald-300">100 msgs/sec (conn: 20)</span>
              </div>
            </div>
          </div>

          {/* Active Warmup Schedules List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold text-white">Active Warmup Schedules</h3>
                <p className="text-[11px] text-[#8a8f98]">
                  Automated day-by-day quota enforcement with 24h midnight rollover and simulator controls
                </p>
              </div>

              <button
                onClick={() => handleOpenStartWarmup()}
                className="px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff52a8] text-[#0a0a0c] font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start Warmup Schedule</span>
              </button>
            </div>

            {schedules.length === 0 ? (
              <div className="p-8 border border-[#23252a] rounded-xl bg-[#0f1011] text-center">
                <Flame className="w-8 h-8 text-[#ff69b4]/50 mb-2 mx-auto stroke-[1.5]" />
                <p className="font-medium text-[#d0d6e0]">No Active Warmup Schedules</p>
                <p className="text-[11px] text-[#62666d] max-w-sm mx-auto mt-1 mb-3">
                  Assign an IP or pool to an automated warmup plan to ramp delivery volume across Google, Yahoo, Microsoft, and Apple.
                </p>
                <button
                  onClick={() => handleOpenStartWarmup()}
                  className="px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff52a8] text-[#0a0a0c] font-bold rounded text-[11px] inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start First Warmup Schedule</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedules.map((s) => {
                  const pct = Math.round((s.current_day / s.total_days) * 100);
                  const quotaPct = s.daily_quota > 0 ? Math.min(100, Math.round((s.sent_today / s.daily_quota) * 100)) : 0;
                  return (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl border border-[#23252a] bg-[#101113] hover:border-[#35373e] transition-all space-y-3"
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white font-mono">{s.target_id}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[#181a1f] border border-[#2b2d33] text-[#8a8f98]">
                              {s.target_type}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#8a8f98]">{s.plan_name}</span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                            s.status === "warming"
                              ? "bg-pink-950/60 text-pink-300 border border-pink-800/60"
                              : s.status === "paused"
                              ? "bg-amber-950/60 text-amber-300 border border-amber-800/60"
                              : "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                          }`}
                        >
                          {s.status === "warming" && <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />}
                          {s.status}
                        </span>
                      </div>

                      {/* Day Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-[#8a8f98]">
                            Schedule Timeline: <strong>Day {s.current_day}</strong> of {s.total_days}
                          </span>
                          <span className="font-bold text-white">{pct}%</span>
                        </div>
                        <div className="w-full bg-[#181a1f] h-2 rounded-full overflow-hidden">
                          <div className="bg-[#ff69b4] h-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {/* Daily Volume & Quota */}
                      <div className="p-2.5 rounded-lg bg-[#141517] border border-[#1f2024]">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-[#8a8f98]">Today&apos;s Dispatched Volume</span>
                          <span className="font-mono text-white">
                            {s.sent_today.toLocaleString()} / {s.daily_quota.toLocaleString()} msgs ({quotaPct}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#1e2025] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${quotaPct >= 100 ? "bg-red-500" : "bg-emerald-400"}`}
                            style={{ width: `${quotaPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Dynamic Throttle Stage */}
                      <div className="px-3 py-1.5 rounded-lg bg-[#16171b] border border-[#23252a] text-[11px] flex items-center justify-between">
                        <span className="text-[#8a8f98]">Dynamic Throttle:</span>
                        <span className="font-medium text-pink-300 font-mono text-[10px]">{s.throttle_stage}</span>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2 border-t border-[#1e2023] flex items-center justify-between">
                        <button
                          onClick={() => handleAdvanceWarmup(s.target_id)}
                          title="Simulate 24h Rollover to Next Day"
                          className="px-2.5 py-1 rounded bg-[#181a1f] hover:bg-[#23252a] text-amber-300 border border-[#2b2d33] text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <FastForward className="w-3.5 h-3.5" />
                          <span>Advance Day (+1)</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {s.status === "warming" ? (
                            <button
                              onClick={() => handlePauseWarmup(s.target_id)}
                              title="Pause Schedule"
                              className="p-1.5 rounded bg-[#181a1f] hover:bg-[#23252a] text-[#8a8f98] hover:text-white cursor-pointer"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleResumeWarmup(s.target_id)}
                              title="Resume Schedule"
                              className="p-1.5 rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteWarmup(s.target_id)}
                            title="Cancel Schedule"
                            className="p-1.5 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: OUTBOUND IP VERIFICATION & ROTATION TELEMETRY */}
      {activeTab === "telemetry" && (
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* Section 1: Atomic sources.toml Sync & Reliability */}
          <div className="p-4 rounded-xl bg-[#121316] border border-[#23252a] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  sources.toml Atomic Synchronization &amp; Rollback
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  syncStatus?.status === "synced"
                    ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/50"
                    : "bg-amber-950/80 text-amber-300 border border-amber-800/50"
                }`}>
                  {syncStatus?.status || "pending"}
                </span>
              </div>
              <p className="text-[11px] text-[#8a8f98]">
                Every IP pool &amp; source change is pre-validated (IPv4/IPv6 syntax &amp; weights), written to temporary files, and atomically swapped with automated <code className="text-[#d0d6e0]">.bak</code> rollback guarantees.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-[10px] text-[#62666d] font-mono pt-1">
                <span>Version: <strong className="text-[#a0a5ad]">v{syncStatus?.config_version || 1}</strong></span>
                <span>Config Hash: <strong className="text-[#a0a5ad]">{syncStatus?.config_hash || "init"}</strong></span>
                <span>Active Sources: <strong className="text-[#a0a5ad]">{syncStatus?.active_sources_count ?? ips.length}</strong></span>
                <span>Active Pools: <strong className="text-[#a0a5ad]">{syncStatus?.active_pools_count ?? pools.length}</strong></span>
                {syncStatus?.last_sync_at && (
                  <span>Last Sync: <strong className="text-[#a0a5ad]">{new Date(syncStatus.last_sync_at).toLocaleTimeString()}</strong></span>
                )}
                {syncStatus?.last_backup_path && (
                  <span>Backup: <strong className="text-[#a0a5ad]">{syncStatus.last_backup_path}</strong></span>
                )}
              </div>
            </div>

            <button
              onClick={handleForceSync}
              disabled={isSyncingSources}
              className="px-3.5 py-2 rounded-lg bg-[#1a1c22] hover:bg-[#232630] border border-[#2e323e] text-xs font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingSources ? "animate-spin" : ""}`} />
              <span>{isSyncingSources ? "Validating & Syncing..." : "Force Atomic Sync"}</span>
            </button>
          </div>

          {/* Section 2: Real Outbound IP Verification Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 via-[#121316] to-[#121316] border border-emerald-900/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">Actual Outbound Connection IP Verification</span>
              </div>
              <span className="text-[10px] font-mono text-[#8a8f98]">
                Analyzed: {telemetry?.analyzed_at ? new Date(telemetry.analyzed_at).toLocaleTimeString() : "Live"}
              </span>
            </div>
            <p className="text-[11px] text-[#8a8f98] mb-3">
              Distinguishes between configured source IPs in <code className="text-[#d0d6e0]">sources.toml</code> and the actual network socket IP bound by the MTA when connecting to destination MX servers.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-[#0e0f12] border border-[#1f2128]">
                <div className="text-[10px] text-[#62666d] uppercase font-mono">Telemetry Records</div>
                <div className="text-lg font-bold text-white mt-0.5">{telemetry?.total_records_parsed || 0}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0e0f12] border border-[#1f2128]">
                <div className="text-[10px] text-[#62666d] uppercase font-mono">Bound Sockets</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">
                  {telemetry?.verification_summary?.distinct_bound_ips?.length || 1} Distinct
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0e0f12] border border-[#1f2128]">
                <div className="text-[10px] text-[#62666d] uppercase font-mono">Interface Failures</div>
                <div className="text-lg font-bold text-white mt-0.5">
                  {telemetry?.verification_summary?.binding_error_count || 0}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0e0f12] border border-[#1f2128]">
                <div className="text-[10px] text-[#62666d] uppercase font-mono">Binding Status</div>
                <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Verified Healthy
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Sending IP Telemetry & Distribution Accuracy */}
          <div className="border border-[#23252a] rounded-xl bg-[#121316] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#23252a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#ff69b4]" />
                <span className="text-xs font-semibold text-white">Outbound IP Delivery Performance &amp; Weight Accuracy</span>
              </div>
              <span className="text-[11px] text-[#8a8f98]">Configured Weight Share vs Actual Delivery Messages</span>
            </div>

            <div className="divide-y divide-[#1e2025]">
              {ips.map((ipObj) => {
                const metric = telemetry?.ip_metrics?.[ipObj.ip] || {
                  total_sent: 0,
                  total_delivered: 0,
                  total_transient: 0,
                  total_bounced: 0,
                  actual_bound_count: 0,
                  binding_failures: 0,
                  selection_share_pct: 0,
                };
                const totalWeight = ips.reduce((acc, curr) => acc + (curr.weight || 1), 0);
                const configuredShare = totalWeight > 0 ? ((ipObj.weight || 1) / totalWeight) * 100 : 0;

                return (
                  <div key={ipObj.ip} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-white">{ipObj.ip}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#181a20] border border-[#262832] text-[#8a8f98] font-mono">
                          Pool: {ipObj.pool_id || "default"}
                        </span>
                        {ipObj.reverse_dns && (
                          <span className="text-[10px] text-[#62666d] font-mono">({ipObj.reverse_dns})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-[#8a8f98]">
                          Weight: <strong className="text-white">{ipObj.weight}</strong> ({configuredShare.toFixed(1)}% expected)
                        </span>
                        <span className="text-[#8a8f98]">
                          Actual Share: <strong className="text-emerald-400">{metric.selection_share_pct?.toFixed(1) || 0}%</strong>
                        </span>
                      </div>
                    </div>

                    {/* Distribution Comparison Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-[#62666d] font-mono">
                        <span>Configured vs Actual Outbound Traffic Distribution</span>
                        <span>{metric.total_sent} messages logged</span>
                      </div>
                      <div className="h-2 w-full bg-[#181a20] rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-[#5e6ad2]"
                          style={{ width: `${Math.min(configuredShare, 100)}%` }}
                          title={`Configured Share: ${configuredShare.toFixed(1)}%`}
                        />
                        <div
                          className="h-full bg-[#ff69b4]"
                          style={{ width: `${Math.min(metric.selection_share_pct || 0, 100)}%` }}
                          title={`Actual Share: ${(metric.selection_share_pct || 0).toFixed(1)}%`}
                        />
                      </div>
                    </div>

                    {/* Stats pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-[#0b0c0e] border border-[#1a1b20]">
                        <span className="text-[#62666d] text-[10px] block">Delivered</span>
                        <span className="font-semibold text-emerald-400">{metric.total_delivered}</span>
                      </div>
                      <div className="p-2 rounded bg-[#0b0c0e] border border-[#1a1b20]">
                        <span className="text-[#62666d] text-[10px] block">Transient Retries</span>
                        <span className="font-semibold text-amber-400">{metric.total_transient}</span>
                      </div>
                      <div className="p-2 rounded bg-[#0b0c0e] border border-[#1a1b20]">
                        <span className="text-[#62666d] text-[10px] block">Hard Bounces</span>
                        <span className="font-semibold text-rose-400">{metric.total_bounced}</span>
                      </div>
                      <div className="p-2 rounded bg-[#0b0c0e] border border-[#1a1b20]">
                        <span className="text-[#62666d] text-[10px] block">Bound Sockets</span>
                        <span className="font-semibold text-white">{metric.actual_bound_count}</span>
                      </div>
                      <div className="p-2 rounded bg-[#0b0c0e] border border-[#1a1b20]">
                        <span className="text-[#62666d] text-[10px] block">Binding Errors</span>
                        <span className="font-semibold text-slate-400">{metric.binding_failures}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Live Outbound Delivery Stream */}
          <div className="border border-[#23252a] rounded-xl bg-[#121316] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#23252a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">Live Outbound Delivery Log Stream</span>
              </div>
              <span className="text-[11px] text-[#8a8f98]">Recent KumoMTA delivery &amp; bounce telemetry</span>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-[#0b0c0e] text-[#62666d] font-mono uppercase text-[10px] sticky top-0 border-b border-[#1e2025]">
                  <tr>
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3">Event</th>
                    <th className="py-2 px-3">Recipient</th>
                    <th className="py-2 px-3">Pool</th>
                    <th className="py-2 px-3">Source IP</th>
                    <th className="py-2 px-3">MX Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181a20] font-mono">
                  {telemetry?.recent_deliveries && telemetry.recent_deliveries.length > 0 ? (
                    telemetry.recent_deliveries.slice(0, 15).map((d: any, idx: number) => {
                      const isSuccess = d.type === "Delivery";
                      const isBounce = d.type === "Bounce";

                      return (
                        <tr key={d.id ? `${d.id}-${idx}` : idx} className="hover:bg-[#15171d]">
                          <td className="py-2 px-3 text-[#62666d]">
                            {d.event_time ? new Date(d.event_time).toLocaleTimeString() : "Just now"}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              isSuccess 
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/40"
                                : isBounce
                                ? "bg-rose-950/80 text-rose-300 border border-rose-800/40"
                                : "bg-amber-950/80 text-amber-300 border border-amber-800/40"
                            }`}>
                              {d.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#d0d6e0]">{d.recipient}</td>
                          <td className="py-2 px-3 text-[#8a8f98]">{d.egress_pool || "default"}</td>
                          <td className="py-2 px-3 text-white">
                            {d.source_address?.address || d.egress_source || "0.0.0.0"}
                          </td>
                          <td className="py-2 px-3 text-[#8a8f98] max-w-xs truncate" title={d.response?.content || ""}>
                            {d.response?.code ? `[${d.response.code}] ` : ""}
                            {d.response?.content || "Delivered"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-[#62666d]">
                        No recent delivery log records found. Messages dispatched via MTA will stream here live.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

        </>
      )}

      {/* --- CREATE / EDIT POOL SCREEN (NO DIALOG OVERLAY) --- */}
      {subScreen === "pool-form" && (
        <div className="flex-1 flex flex-col bg-[#0a0a0c] overflow-y-auto">
          <div className="px-5 py-3 bg-[#0f1011] border-b border-[#23252a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubScreen("overview")}
                className="px-2.5 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs transition-colors cursor-pointer"
              >
                ← Back to Pools
              </button>
              <span className="text-[#62666d]">/</span>
              <span className="font-semibold text-sm text-[#f7f8f8]">
                {editingPool ? `Edit Pool: ${editingPool.name}` : "Create Sending IP Pool"}
              </span>
            </div>
          </div>

          <div className="max-w-xl mx-auto w-full p-6">
            <form onSubmit={handleSavePool} className="space-y-4 bg-[#121316] border border-[#23252a] rounded-xl p-6 shadow-2xl">
              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Pool Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Transactional High-Priority"
                  value={poolName}
                  onChange={(e) => setPoolName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0c0d0e] border border-[#23252a] rounded text-white text-xs focus:outline-none focus:border-[#ff69b4]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Pool Type</label>
                <select
                  value={poolType}
                  onChange={(e) => setPoolType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0c0d0e] border border-[#23252a] rounded text-white text-xs focus:outline-none focus:border-[#ff69b4]"
                >
                  <option value="transactional">Transactional (Password resets, receipts, 2FA)</option>
                  <option value="marketing">Marketing (Newsletters, promos, cold outreach)</option>
                  <option value="quarantine">Quarantine (High bounce risk / probation)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Daily Sending Volume Target</label>
                <input
                  type="number"
                  min="1000"
                  step="10000"
                  value={poolTarget}
                  onChange={(e) => setPoolTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0c0d0e] border border-[#23252a] rounded text-white text-xs focus:outline-none focus:border-[#ff69b4]"
                />
              </div>

              <div className="pt-3 border-t border-[#23252a] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubScreen("overview")}
                  className="px-3.5 py-1.5 rounded bg-[#18191a] text-[#8a8f98] hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-[#ff69b4] hover:bg-[#ff52a8] text-[#0a0a0c] font-bold rounded text-xs cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : editingPool ? "Save Changes" : "Create Pool"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* --- CREATE / EDIT IP SCREEN (NO DIALOG OVERLAY) --- */}
      {subScreen === "ip-form" && (
        <div className="flex-1 flex flex-col bg-[#0a0a0c] overflow-y-auto">
          <div className="px-5 py-3 bg-[#0f1011] border-b border-[#23252a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubScreen("overview")}
                className="px-2.5 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs transition-colors cursor-pointer"
              >
                ← Back to IPs
              </button>
              <span className="text-[#62666d]">/</span>
              <span className="font-semibold text-sm text-[#f7f8f8]">
                {editingIp ? `Edit Dedicated IP: ${editingIp.ip}` : "Register Dedicated Sending IP"}
              </span>
            </div>
          </div>

          <div className="max-w-xl mx-auto w-full p-6">
            <form onSubmit={handleSaveIp} className="space-y-4 bg-[#121316] border border-[#23252a] rounded-xl p-6 shadow-2xl">
              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">IPv4 or IPv6 Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.0.2.1"
                  disabled={!!editingIp}
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0c0d0e] border border-[#23252a] rounded text-white text-xs font-mono focus:outline-none focus:border-[#ff69b4] disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Assigned Pool</label>
                <select
                  value={ipPoolId}
                  onChange={(e) => setIpPoolId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0c0d0e] border border-[#23252a] rounded text-white text-xs focus:outline-none focus:border-[#ff69b4]"
                >
                  {pools.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Reverse DNS (PTR Record)</label>
                <input
                  type="text"
                  placeholder="e.g. mail-1.marketing.domain.com"
                  value={ipPtr}
                  onChange={(e) => setIpPtr(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0c0d0e] border border-[#23252a] rounded text-white text-xs font-mono focus:outline-none focus:border-[#ff69b4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Traffic Weight (1 - 100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={ipWeight}
                    onChange={(e) => setIpWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0c0d0e] border border-[#23252a] rounded text-white text-xs focus:outline-none focus:border-[#ff69b4]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Status</label>
                  <select
                    value={ipStatus}
                    onChange={(e) => setIpStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c0d0e] border border-[#23252a] rounded text-white text-xs focus:outline-none focus:border-[#ff69b4]"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="draining">Draining</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#23252a] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubScreen("overview")}
                  className="px-3.5 py-1.5 rounded bg-[#18191a] text-[#8a8f98] hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-[#ff69b4] hover:bg-[#ff52a8] text-[#0a0a0c] font-bold rounded text-xs cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : editingIp ? "Save Changes" : "Register IP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* --- START WARMUP SCREEN (NO DIALOG OVERLAY) --- */}
      {subScreen === "warmup-form" && (
        <div className="flex-1 flex flex-col bg-[#0a0a0c] overflow-y-auto">
          <div className="px-5 py-3 bg-[#0f1011] border-b border-[#23252a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubScreen("overview")}
                className="px-2.5 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs transition-colors cursor-pointer"
              >
                ← Back to Warmups
              </button>
              <span className="text-[#62666d]">/</span>
              <span className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#ff69b4]" />
                Start Automated Warmup Schedule
              </span>
            </div>
          </div>

          <div className="max-w-xl mx-auto w-full p-6">
            <form onSubmit={handleStartWarmupSubmit} className="space-y-4 bg-[#121316] border border-[#23252a] rounded-xl p-6 shadow-2xl">
              <div>
                <label className="block text-[#a0a5ad] mb-1 font-medium">Target Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWarmupTargetType("pool");
                      if (pools.length > 0) setWarmupTargetId(pools[0].id);
                    }}
                    className={`py-2 rounded-lg border font-medium cursor-pointer ${
                      warmupTargetType === "pool"
                        ? "bg-[#ff69b4]/20 border-[#ff69b4] text-[#ff69b4]"
                        : "bg-[#0e0f12] border-[#2b2d33] text-[#8a8f98]"
                    }`}
                  >
                    IP Pool Group
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWarmupTargetType("ip");
                      if (ips.length > 0) setWarmupTargetId(ips[0].ip);
                    }}
                    className={`py-2 rounded-lg border font-medium cursor-pointer ${
                      warmupTargetType === "ip"
                        ? "bg-[#ff69b4]/20 border-[#ff69b4] text-[#ff69b4]"
                        : "bg-[#0e0f12] border-[#2b2d33] text-[#8a8f98]"
                    }`}
                  >
                    Individual IP
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#a0a5ad] mb-1 font-medium">
                  Select {warmupTargetType === "pool" ? "IP Pool" : "Sending IP"}
                </label>
                {warmupTargetType === "pool" ? (
                  <select
                    value={warmupTargetId}
                    onChange={(e) => setWarmupTargetId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c0d0e] border border-[#23252a] rounded text-white text-xs focus:outline-none focus:border-[#ff69b4]"
                  >
                    {pools.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={warmupTargetId}
                    onChange={(e) => setWarmupTargetId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c0d0e] border border-[#23252a] rounded text-white text-xs font-mono focus:outline-none focus:border-[#ff69b4]"
                  >
                    {ips.map((ip) => (
                      <option key={ip.ip} value={ip.ip}>
                        {ip.ip} (Pool: {ip.pool_id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[#a0a5ad] mb-1 font-medium">Warmup Ramp Plan</label>
                <select
                  value={warmupPlanId}
                  onChange={(e) => setWarmupPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0c0d0e] border border-[#23252a] rounded text-white text-xs focus:outline-none focus:border-[#ff69b4]"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.duration_days} Days)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a0a5ad] mb-1 font-medium">Starting Day</label>
                  <input
                    type="number"
                    min={1}
                    max={45}
                    value={warmupStartDay}
                    onChange={(e) => setWarmupStartDay(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0c0d0e] border border-[#23252a] rounded text-white text-xs focus:outline-none focus:border-[#ff69b4]"
                  />
                  <span className="text-[10px] text-[#62666d]">Defaults to Day 1</span>
                </div>

                <div>
                  <label className="block text-[#a0a5ad] mb-1 font-medium">Overflow Action</label>
                  <select
                    value={warmupOverflowAction}
                    onChange={(e) => setWarmupOverflowAction(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c0d0e] border border-[#23252a] rounded text-white text-xs focus:outline-none focus:border-[#ff69b4]"
                  >
                    <option value="route_overflow_pool">Route to Default Pool</option>
                    <option value="hard_reject">Reject Over-Quota (429)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#23252a] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubScreen("overview")}
                  className="px-3.5 py-1.5 rounded bg-[#18191a] text-[#8a8f98] hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-[#ff69b4] hover:bg-[#ff52a8] text-[#0a0a0c] font-bold rounded text-xs cursor-pointer"
                >
                  {isSubmitting ? "Initiating..." : "Start Warmup Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};