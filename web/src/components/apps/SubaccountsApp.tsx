"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  KeyRound,
  Building2,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Shield,
  Layers,
  ArrowRight,
  Terminal,
  Clock,
  Send,
  Zap,
  Lock,
  Globe,
  Sliders,
  Users,
} from "lucide-react";
import {
  fetchSubaccounts,
  addSubaccount,
  updateSubaccount,
  deleteSubaccount,
  fetchSubaccountStats,
  fetchAPIKeys,
  addAPIKey,
  revokeAPIKey,
  deleteAPIKey,
  fetchIPPools,
  fetchDomains,
} from "../../lib/api";
import { Subaccount, APIKey, SubaccountStats } from "../../types/os";
import { useWindowManager } from "../../context/WindowManagerContext";

export const SubaccountsApp: React.FC = () => {
  const { currentUser } = useWindowManager();
  const isMasterAdmin = currentUser?.role === "master_admin" || currentUser?.can_manage_tenants;

  const [activeTab, setActiveTab] = useState<"tenants" | "keys" | "integration">("tenants");
  const [subaccounts, setSubaccounts] = useState<Subaccount[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [stats, setStats] = useState<SubaccountStats>({
    total_subaccounts: 0,
    active_subaccounts: 0,
    active_api_keys: 0,
    total_quota_today: 0,
    total_sent_today: 0,
  });
  const [pools, setPools] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Subaccount Modal State
  const [showSubModal, setShowSubModal] = useState(false);
  const [subName, setSubName] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subPassword, setSubPassword] = useState("");
  const [subPool, setSubPool] = useState("default");
  const [subDailyQuota, setSubDailyQuota] = useState(50000);
  const [subAllowedDomains, setSubAllowedDomains] = useState<string>("");
  const [creatingSub, setCreatingSub] = useState(false);

  const handleGenerateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSubPassword(pass);
  };

  // Create API Key Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyTenant, setKeyTenant] = useState("global");
  const [keyRole, setKeyRole] = useState<"admin" | "sender" | "analyst" | "custom">("sender");
  const [keyPermissions, setKeyPermissions] = useState<string[]>([
    "mail:send",
    "analytics:read",
    "suppressions:read",
  ]);
  const [creatingKey, setCreatingKey] = useState(false);

  // Newly Created Key Display Modal (Shown only once)
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Copy helper for prefixes or keys
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [subsData, keysData, statsData, poolsData, domainsData] = await Promise.all([
        fetchSubaccounts().catch(() => []),
        fetchAPIKeys().catch(() => []),
        fetchSubaccountStats().catch(() => ({
          total_subaccounts: 0,
          active_subaccounts: 0,
          active_api_keys: 0,
          total_quota_today: 0,
          total_sent_today: 0,
        })),
        fetchIPPools().catch(() => []),
        fetchDomains().catch(() => []),
      ]);
      setSubaccounts(subsData);
      setApiKeys(keysData);
      setStats(statsData);
      setPools(poolsData);
      setDomains(domainsData);
    } catch (err) {
      console.error("Failed to load subaccount data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle Add Subaccount
  const handleAddSubaccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingSub(true);
      const allowed = subAllowedDomains
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter((d) => d.length > 0);

      await addSubaccount({
        name: subName.trim(),
        email: subEmail.trim(),
        password: subPassword,
        dedicated_pool: subPool,
        daily_quota: Number(subDailyQuota),
        hourly_quota: Math.floor(Number(subDailyQuota) / 10),
        allowed_domains: allowed,
        status: "active",
      });

      setShowSubModal(false);
      setSubName("");
      setSubEmail("");
      setSubPassword("");
      setSubAllowedDomains("");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create sub-account");
    } finally {
      setCreatingSub(false);
    }
  };

  // Handle Toggle Subaccount Status
  const handleToggleSubStatus = async (sub: Subaccount) => {
    try {
      const newStatus = sub.status === "active" ? "suspended" : "active";
      await updateSubaccount({
        ...sub,
        status: newStatus,
      });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to toggle sub-account status");
    }
  };

  // Handle Delete Subaccount
  const handleDeleteSub = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sub-account? All associated API keys will also be permanently revoked.")) return;
    try {
      await deleteSubaccount(id);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete sub-account");
    }
  };

  // Handle Add API Key
  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingKey(true);
      const res = await addAPIKey({
        name: keyName,
        subaccount_id: keyTenant,
        role: keyRole,
        permissions: keyPermissions,
      });

      setShowKeyModal(false);
      setKeyName("");
      if (res.key) {
        setNewlyGeneratedKey(res.key);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to generate API key");
    } finally {
      setCreatingKey(false);
    }
  };

  // Handle Revoke Key
  const handleRevokeKey = async (id: string) => {
    if (!confirm("Revoke this API key immediately? Any systems using this credential will be blocked.")) return;
    try {
      await revokeAPIKey(id);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to revoke API key");
    }
  };

  // Handle Delete Key
  const handleDeleteKey = async (id: string) => {
    if (!confirm("Permanently delete this API key?")) return;
    try {
      await deleteAPIKey(id);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete API key");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered lists
  const filteredSubs = subaccounts.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.dedicated_pool.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredKeys = apiKeys.filter((k) =>
    k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.key_prefix.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans selection:bg-[#ff69b4]/30 selection:text-white">
      {/* Top Header & Metrics Bar */}
      <div className="border-b border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff69b4]/10 border border-[#ff69b4]/30 flex items-center justify-center text-[#ff69b4]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white tracking-wide">
                  Sub-Accounts & Multi-Tenant RBAC Hierarchy
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Tenant Isolation Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Customer Sub-Accounts, Sending Quotas, Dedicated Egress Pools, and Granular API Keys
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isMasterAdmin ? (
              <button
                onClick={() => setShowSubModal(true)}
                className="px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-[#ff69b4]/20"
              >
                <Plus className="w-3.5 h-3.5" />
                New Sub-Account
              </button>
            ) : (
              <button
                disabled
                title="Only Master Administrator (zekea.me) can create new tenant accounts"
                className="px-3 py-1.5 bg-slate-800 text-slate-500 border border-slate-700/60 font-medium text-xs rounded-lg cursor-not-allowed flex items-center gap-1.5 opacity-60"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                New Sub-Account (Master Only)
              </button>
            )}
            <button
              onClick={() => setShowKeyModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-lg transition-all flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#ff69b4]" />
              Generate API Key
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
              Total Sub-Accounts
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-xl font-bold text-white mt-1">{stats.total_subaccounts}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{stats.active_subaccounts} active tenants</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              Active API Keys
              <KeyRound className="w-3.5 h-3.5 text-[#ff69b4]" />
            </div>
            <div className="text-xl font-bold text-[#ff69b4] mt-1">{stats.active_api_keys}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Scoped credentials</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              Total Allocated Daily Quota
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-bold text-blue-400 mt-1">{stats.total_quota_today.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Across all customer tenants</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              Total Sent Today
              <Send className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{stats.total_sent_today.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Live aggregated sends</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4 border-b border-slate-800/80 -mb-4">
          <button
            onClick={() => setActiveTab("tenants")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "tenants"
                ? "border-[#ff69b4] text-[#ff69b4]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Customer Sub-Accounts ({subaccounts.length})
          </button>
          <button
            onClick={() => setActiveTab("keys")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "keys"
                ? "border-[#ff69b4] text-[#ff69b4]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            API Keys & RBAC Scopes ({apiKeys.length})
          </button>
          <button
            onClick={() => setActiveTab("integration")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "integration"
                ? "border-[#ff69b4] text-[#ff69b4]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Integration & Auth Docs
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* ============================================================== */}
        {/* TAB 1: CUSTOMER SUB-ACCOUNTS / TENANTS */}
        {/* ============================================================== */}
        {activeTab === "tenants" && (
          <div className="space-y-4">
            {/* Restricted notice for non-master accounts */}
            {!isMasterAdmin && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-3">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-semibold text-amber-300">Tenant View: </span>
                  <span>
                    You are signed in as a Tenant ({currentUser?.name || currentUser?.username}). Provisioning new sub-accounts and modifying sending pools is restricted exclusively to the Master Administrator (zekea.me).
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sub-accounts by name or pool..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#ff69b4]/50"
                />
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>Showing {filteredSubs.length} sub-accounts</span>
              </div>
            </div>

            {filteredSubs.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-300">No Customer Sub-Accounts Registered</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Create isolated sub-accounts to allocate sending quotas, enforce dedicated IP pool routing, and restrict sending domains per customer.
                </p>
                {isMasterAdmin && (
                  <button
                    onClick={() => setShowSubModal(true)}
                    className="mt-4 px-3.5 py-1.5 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create First Sub-Account
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubs.map((sub) => {
                  const quotaPercent = sub.daily_quota > 0 ? Math.min(100, Math.round((sub.sent_today / sub.daily_quota) * 100)) : 0;
                  return (
                    <div
                      key={sub.id}
                      className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-white flex items-center gap-2">
                              {sub.name}
                            </div>
                            <div className="text-[11px] text-[#ff69b4] font-mono mt-0.5 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span>{sub.email || `${sub.id}@zekea.me`}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              ID: {sub.id}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                              sub.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-red-500/10 text-red-400 border-red-500/30"
                            }`}
                          >
                            {sub.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Quota Progress Bar */}
                        <div className="mt-4 bg-slate-950 border border-slate-850 rounded-lg p-2.5">
                          <div className="flex items-center justify-between text-[11px] mb-1.5">
                            <span className="text-slate-400">Daily Quota Usage</span>
                            <span className="font-mono text-slate-200">
                              {sub.sent_today.toLocaleString()} / {sub.daily_quota.toLocaleString()} ({quotaPercent}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                quotaPercent > 90 ? "bg-red-400" : quotaPercent > 70 ? "bg-amber-400" : "bg-[#ff69b4]"
                              }`}
                              style={{ width: `${quotaPercent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                            <span>Hourly Quota: {sub.hourly_quota.toLocaleString()}/hr</span>
                            <span>Total Sent: {sub.sent_total.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Metadata Tags */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px]">
                          <span className="px-2 py-0.5 bg-slate-800/80 border border-slate-700/80 rounded text-slate-300 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#ff69b4]" />
                            Pool: <strong className="text-white">{sub.dedicated_pool}</strong>
                          </span>
                          <span className="px-2 py-0.5 bg-slate-800/80 border border-slate-700/80 rounded text-slate-300 flex items-center gap-1">
                            <Globe className="w-3 h-3 text-blue-400" />
                            {sub.allowed_domains && sub.allowed_domains.length > 0
                              ? `${sub.allowed_domains.length} Domain(s)`
                              : "All Domains"}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <button
                          onClick={() => handleToggleSubStatus(sub)}
                          className={`px-2 py-1 text-[11px] rounded transition-all ${
                            sub.status === "active"
                              ? "text-amber-400 hover:bg-amber-950/30"
                              : "text-emerald-400 hover:bg-emerald-950/30"
                          }`}
                        >
                          {sub.status === "active" ? "Suspend Tenant" : "Activate Tenant"}
                        </button>
                        <button
                          onClick={() => handleDeleteSub(sub.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-all"
                          title="Delete sub-account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: API KEYS & RBAC SCOPES */}
        {/* ============================================================== */}
        {activeTab === "keys" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search keys by name or prefix..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#ff69b4]/50"
                />
              </div>

              <button
                onClick={() => setShowKeyModal(true)}
                className="px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Generate New API Key
              </button>
            </div>

            {filteredKeys.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <KeyRound className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-300">No Cryptographic API Keys Created</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Generate scoped API keys with fine-grained permissions (<code className="text-[#ff69b4]">mail:send</code>, <code className="text-[#ff69b4]">analytics:read</code>) for external apps and tenant users.
                </p>
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="mt-4 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Generate API Key
                </button>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Key Label & Token Prefix</th>
                      <th className="py-2.5 px-3">Sub-Account (Tenant)</th>
                      <th className="py-2.5 px-3">Role & Permissions</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {filteredKeys.map((key) => {
                      const sub = subaccounts.find((s) => s.id === key.subaccount_id);
                      return (
                        <tr key={key.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-200">{key.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-[#ff69b4] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                {key.key_prefix}
                              </span>
                              <button
                                onClick={() => copyToClipboard(key.key_prefix, key.id)}
                                className="text-slate-500 hover:text-slate-300 p-0.5"
                                title="Copy key prefix"
                              >
                                {copiedId === key.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {key.subaccount_id === "global" ? (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
                                Global Control Plane
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                                {sub?.name || key.subaccount_id}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-300 rounded uppercase">
                                {key.role}
                              </span>
                              {key.permissions?.map((p) => (
                                <span
                                  key={p}
                                  className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800 rounded"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                                key.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-red-500/10 text-red-400 border-red-500/30"
                              }`}
                            >
                              {key.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 text-[11px]">
                            {new Date(key.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {key.status === "active" && (
                                <button
                                  onClick={() => handleRevokeKey(key.id)}
                                  className="px-2 py-1 text-[11px] text-amber-400 hover:bg-amber-950/40 rounded border border-amber-900/50 transition-all"
                                >
                                  Revoke
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteKey(key.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-all"
                                title="Delete key"
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
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: INTEGRATION & AUTH DOCS */}
        {/* ============================================================== */}
        {activeTab === "integration" && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h3 className="text-sm font-semibold text-white">Multi-Tenant REST & SMTP API Authentication</h3>
              <p className="text-xs text-slate-400 mt-1">
                Pass your API key via the HTTP Bearer header or the <code className="text-[#ff69b4]">X-API-Key</code> request header. MailOps automatically resolves the tenant, enforces the daily quota, validates the sender domain, and routes egress through the tenant&apos;s assigned IP pool.
              </p>
            </div>

            {/* Curl Example */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>cURL / REST Message Injection</span>
                <span className="text-[10px] text-[#ff69b4] font-mono">POST /api/v1/inject</span>
              </div>
              <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto">
{`curl -X POST http://localhost:8080/api/v1/inject \\
  -H "Authorization: Bearer mops_live_YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "notifications@yourdomain.com",
    "to": "recipient@example.com",
    "subject": "Enterprise Sub-Account Notification",
    "body": "This message was dispatched through tenant-specific egress pool."
  }'`}
              </div>
            </div>

            {/* Node.js / TypeScript Example */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Node.js / TypeScript Example
              </div>
              <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto">
{`const res = await fetch("http://localhost:8080/api/v1/inject", {
  method: "POST",
  headers: {
    "Authorization": "Bearer mops_live_YOUR_API_KEY_HERE",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    from: "news@yourdomain.com",
    to: "subscriber@client.com",
    subject: "Automated Monthly Billing Summary",
    body: "Your invoice is ready."
  })
});
const result = await res.json();`}
              </div>
            </div>

            {/* Python Example */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Python Requests Example
              </div>
              <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto">
{`import requests

resp = requests.post(
    "http://localhost:8080/api/v1/inject",
    headers={"Authorization": "Bearer mops_live_YOUR_API_KEY_HERE"},
    json={
        "from": "alerts@yourdomain.com",
        "to": "devops@client.com",
        "subject": "Service Latency Warning",
        "body": "P99 latency crossed 120ms threshold."
    }
)
print(resp.json())`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: NEW SUB-ACCOUNT */}
      {/* ============================================================== */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#ff69b4]" />
                <h3 className="text-sm font-semibold text-white">Create Customer Sub-Account</h3>
              </div>
              <button
                onClick={() => setShowSubModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddSubaccount} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Sub-Account / Tenant Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme SaaS Platform or Marketing Dept"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Tenant Login Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. client@acme.com"
                    value={subEmail}
                    onChange={(e) => setSubEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Identifier for GNOME login panel.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">
                      Tenant Password
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPassword}
                      className="text-[10px] text-[#ff69b4] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-2.5 h-2.5" /> Auto-Gen
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Tenant password"
                    value={subPassword}
                    onChange={(e) => setSubPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Password to authenticate tenant.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Dedicated Egress IP Pool
                  </label>
                  <select
                    value={subPool}
                    onChange={(e) => setSubPool(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60"
                  >
                    <option value="default">default (Shared Pool)</option>
                    {pools.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Daily Sending Quota (Emails/Day)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="10000000"
                    required
                    value={subDailyQuota}
                    onChange={(e) => setSubDailyQuota(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Restricted Sending Domains (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. acme.com, auth.acme.com (Comma-separated, leave blank for all)"
                  value={subAllowedDomains}
                  onChange={(e) => setSubAllowedDomains(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  If set, API keys under this sub-account cannot send on behalf of unapproved domains.
                </span>
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
                  {creatingSub ? "Creating..." : "Create Sub-Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: GENERATE API KEY */}
      {/* ============================================================== */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#ff69b4]" />
                <h3 className="text-sm font-semibold text-white">Generate Cryptographic API Key</h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddKey} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Key Label / Application Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Billing Dispatcher"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Assign to Tenant Sub-Account
                  </label>
                  <select
                    value={keyTenant}
                    onChange={(e) => setKeyTenant(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60"
                  >
                    <option value="global">Global Control Plane (Unrestricted)</option>
                    {subaccounts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.dedicated_pool})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    RBAC Role Preset
                  </label>
                  <select
                    value={keyRole}
                    onChange={(e: any) => {
                      const r = e.target.value;
                      setKeyRole(r);
                      if (r === "admin") setKeyPermissions(["*"]);
                      else if (r === "sender") setKeyPermissions(["mail:send", "analytics:read", "suppressions:read"]);
                      else if (r === "analyst") setKeyPermissions(["analytics:read", "suppressions:read", "messages:read"]);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ff69b4]/60"
                  >
                    <option value="sender">Sender (mail:send, analytics:read)</option>
                    <option value="admin">Administrator (Full Access)</option>
                    <option value="analyst">Analyst (Read-only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Permissions & Scopes
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "mail:send", label: "mail:send (Inject Messages)" },
                    { id: "analytics:read", label: "analytics:read (View Metrics)" },
                    { id: "suppressions:read", label: "suppressions:read" },
                    { id: "suppressions:write", label: "suppressions:write" },
                    { id: "domains:read", label: "domains:read" },
                    { id: "*", label: "* (Full Admin Access)" },
                  ].map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded cursor-pointer hover:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={keyPermissions.includes(perm.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setKeyPermissions([...keyPermissions, perm.id]);
                          } else {
                            setKeyPermissions(keyPermissions.filter((p) => p !== perm.id));
                          }
                        }}
                        className="rounded border-slate-800 text-[#ff69b4] focus:ring-[#ff69b4]"
                      />
                      <span className="font-mono text-[11px] text-slate-300">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingKey}
                  className="px-4 py-2 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
                >
                  {creatingKey ? "Generating..." : "Generate Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NEWLY GENERATED KEY DISPLAY (SHOWN ONCE) */}
      {/* ============================================================== */}
      {newlyGeneratedKey && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-emerald-950/20 flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold">API Key Generated Successfully</h3>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Please copy this key and store it securely in your environment variables. For security reasons, <strong>it will never be displayed again in full</strong>.
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3">
                <code className="text-xs font-mono text-[#ff69b4] break-all select-all">
                  {newlyGeneratedKey}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newlyGeneratedKey);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2500);
                  }}
                  className="px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey ? "Copied!" : "Copy Key"}
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setNewlyGeneratedKey(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all"
                >
                  I have saved this key safely
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
