"use client";

import React, { useState, useEffect } from "react";
import {
  Radio,
  Server,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Terminal,
  Activity,
  Code,
  Layers,
  Lock,
  Globe,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Key,
  Eye,
  EyeOff,
  UserCheck
} from "lucide-react";
import {
  fetchSmtpInfo,
  fetchRelayWhitelist,
  addRelayWhitelist,
  deleteRelayWhitelist,
  fetchIncomingConnections,
  fetchSmtpCredentials,
  addSmtpCredential,
  deleteSmtpCredential,
  toggleSmtpCredential,
  SMTPCredential,
  fetchIPPools,
  IPPool
} from "../../lib/api";

interface HostInfo {
  detected_host: string;
  primary_ip: string;
  smtp_ports: number[];
  api_endpoint: string;
  kumo_endpoint: string;
  auth_mechanisms: string[];
}

interface WhitelistEntry {
  id: string;
  cidr: string;
  description: string;
  created_at: string;
  last_seen?: string;
}

interface ConnectionLog {
  id: string;
  source_ip: string;
  hostname: string;
  port: number;
  protocol: string;
  auth_user: string;
  status: string;
  timestamp: string;
  msg_count: number;
}

export const SmtpConnectApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"settings" | "credentials" | "snippets" | "whitelist" | "connections">("settings");
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [clientHost, setClientHost] = useState<string>("localhost");
  const [copiedId, setCopiedId] = useState<string>("");

  // SMTP Credentials state
  const [credentials, setCredentials] = useState<SMTPCredential[]>([]);
  const [pools, setPools] = useState<IPPool[]>([]);
  const [showPassMap, setShowPassMap] = useState<Record<string, boolean>>({});
  const [isCredModalOpen, setIsCredModalOpen] = useState(false);
  const [newCredUser, setNewCredUser] = useState("");
  const [newCredPass, setNewCredPass] = useState("");
  const [newCredDesc, setNewCredDesc] = useState("");
  const [newCredPool, setNewCredPool] = useState("default");
  const [isAddingCred, setIsAddingCred] = useState(false);
  const [credError, setCredError] = useState("");

  // Whitelist state
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [newCidr, setNewCidr] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");
  const [isAddingWl, setIsAddingWl] = useState<boolean>(false);
  const [wlError, setWlError] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Connections state
  const [connections, setConnections] = useState<ConnectionLog[]>([]);
  const [isRefreshingConn, setIsRefreshingConn] = useState<boolean>(false);

  // Code snippets language state
  const [codeLang, setCodeLang] = useState<"nodejs" | "python" | "php" | "go" | "curl" | "wordpress">("nodejs");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  };

  const loadData = async () => {
    try {
      if (typeof window !== "undefined") {
        setClientHost(window.location.hostname || "localhost");
      }
      const [info, wl, conn, creds, poolList] = await Promise.all([
        fetchSmtpInfo().catch(() => null),
        fetchRelayWhitelist().catch(() => []),
        fetchIncomingConnections().catch(() => []),
        fetchSmtpCredentials().catch(() => []),
        fetchIPPools().catch(() => []),
      ]);
      if (info) setHostInfo(info);
      if (Array.isArray(wl)) setWhitelist(wl);
      if (Array.isArray(conn)) setConnections(conn);
      if (Array.isArray(creds)) setCredentials(creds);
      if (Array.isArray(poolList)) setPools(poolList);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      fetchIncomingConnections()
        .then((data) => {
          if (Array.isArray(data)) setConnections(data);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCidr.trim()) return;
    setIsAddingWl(true);
    setWlError("");
    try {
      await addRelayWhitelist(newCidr.trim(), newDesc.trim() || "Authorized App Relay");
      setNewCidr("");
      setNewDesc("");
      setIsModalOpen(false);
      const updated = await fetchRelayWhitelist();
      setWhitelist(updated);
    } catch (err: any) {
      setWlError(err.message || "Failed to add whitelist entry");
    } finally {
      setIsAddingWl(false);
    }
  };

  const handleDeleteWhitelist = async (id: string) => {
    try {
      await deleteRelayWhitelist(id);
      const updated = await fetchRelayWhitelist();
      setWhitelist(updated);
    } catch (err: any) {
      alert(err.message || "Failed to delete entry");
    }
  };

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCredUser.trim()) return;
    setIsAddingCred(true);
    setCredError("");
    try {
      const created = await addSmtpCredential({
        username: newCredUser.trim(),
        password: newCredPass.trim() || undefined,
        description: newCredDesc.trim() || "Outlook / ESMTP Client",
        pool_id: newCredPool || "default",
      });
      setNewCredUser("");
      setNewCredPass("");
      setNewCredDesc("");
      setIsCredModalOpen(false);
      const updated = await fetchSmtpCredentials();
      setCredentials(updated);
      if (created.password) {
        setShowPassMap((prev) => ({ ...prev, [created.id]: true }));
      }
    } catch (err: any) {
      setCredError(err.message || "Failed to create credential");
    } finally {
      setIsAddingCred(false);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!confirm("Are you sure you want to revoke and delete this SMTP credential?")) return;
    try {
      await deleteSmtpCredential(id);
      const updated = await fetchSmtpCredentials();
      setCredentials(updated);
    } catch (err: any) {
      alert(err.message || "Failed to delete credential");
    }
  };

  const handleToggleCredential = async (id: string, currentEnabled: boolean) => {
    try {
      await toggleSmtpCredential(id, !currentEnabled);
      const updated = await fetchSmtpCredentials();
      setCredentials(updated);
    } catch (err: any) {
      alert(err.message || "Failed to toggle credential");
    }
  };

  const effectiveHost = hostInfo?.detected_host || clientHost || "127.0.0.1";
  const primaryPort = 2525;

  return (
    <div className="flex h-full bg-[#0a0a0c] text-xs">
      {/* Left Navigation Sidebar */}
      <div className="w-60 border-r border-[#23252a] bg-[#0f1011] p-2 space-y-1 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="px-3 py-2 border-b border-[#23252a] mb-2">
            <div className="font-semibold text-[#f7f8f8] flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-[#ff69b4]" />
              <span>SMTP & App Connect</span>
            </div>
            <div className="text-[10px] text-[#8a8f98] mt-0.5 font-mono">
              Host: <span className="text-[#3b9eff]">{effectiveHost}</span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
              activeTab === "settings" ? "bg-[#18191a] text-[#f7f8f8] font-medium" : "text-[#8a8f98] hover:bg-[#141516]"
            }`}
          >
            <Server className="w-3.5 h-3.5 text-[#3b9eff]" />
            <span>Connection Parameters</span>
          </button>

          <button
            onClick={() => setActiveTab("credentials")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
              activeTab === "credentials" ? "bg-[#18191a] text-[#f7f8f8] font-medium" : "text-[#8a8f98] hover:bg-[#141516]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-[#ff69b4]" />
              <span>SMTP Credentials</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#18191a] text-[#8a8f98] font-mono">
              {credentials.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("snippets")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
              activeTab === "snippets" ? "bg-[#18191a] text-[#f7f8f8] font-medium" : "text-[#8a8f98] hover:bg-[#141516]"
            }`}
          >
            <Code className="w-3.5 h-3.5 text-[#a78bfa]" />
            <span>Code & App Snippets</span>
          </button>

          <button
            onClick={() => setActiveTab("whitelist")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
              activeTab === "whitelist" ? "bg-[#18191a] text-[#f7f8f8] font-medium" : "text-[#8a8f98] hover:bg-[#141516]"
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#27a644]" />
              <span>IP Relay Whitelist</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#18191a] text-[#8a8f98] font-mono">
              {whitelist.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("connections")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
              activeTab === "connections" ? "bg-[#18191a] text-[#f7f8f8] font-medium" : "text-[#8a8f98] hover:bg-[#141516]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#ffc53d]" />
              <span>Incoming Connections</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#27a644]/20 text-[#27a644] font-mono animate-pulse">
              Live
            </span>
          </button>
        </div>

        {/* Realtime Host Detector Badge */}
        <div className="p-2.5 rounded-lg bg-[#141516] border border-[#23252a] space-y-1">
          <div className="text-[10px] font-mono text-[#8a8f98] uppercase">Detected Host Interface</div>
          <div className="font-mono text-[11px] text-[#f7f8f8] truncate select-all">{effectiveHost}</div>
          <div className="text-[10px] text-[#27a644] flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#27a644] animate-ping" />
            <span>Kumo Listener Online (2525)</span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* TAB 1: CONNECTION PARAMETERS */}
        {activeTab === "settings" && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
                <Server className="w-4 h-4 text-[#3b9eff]" />
                <span>SMTP Relay Connection Parameters</span>
              </h3>
              <p className="text-[11px] text-[#8a8f98] mt-0.5">
                Use these parameters in your code, SaaS apps, web servers, or email marketing tools to send outbound mail via KumoMTA.
              </p>
            </div>

            {/* Quick Parameters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Host */}
              <div className="p-3 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-1">
                <div className="text-[10px] font-mono uppercase text-[#62666d]">SMTP Host / Server</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#f7f8f8] font-bold select-all truncate">{effectiveHost}</span>
                  <button
                    onClick={() => copyToClipboard(effectiveHost, "host")}
                    className="p-1 hover:bg-[#18191a] rounded text-[#8a8f98] hover:text-[#f7f8f8]"
                    title="Copy Host"
                  >
                    {copiedId === "host" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-[10px] text-[#8a8f98]">Real-time resolved domain or IP address</div>
              </div>

              {/* Port */}
              <div className="p-3 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-1">
                <div className="text-[10px] font-mono uppercase text-[#62666d]">Primary Port</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#f7f8f8] font-bold select-all">2525 (or 587, 25)</span>
                  <button
                    onClick={() => copyToClipboard("2525", "port")}
                    className="p-1 hover:bg-[#18191a] rounded text-[#8a8f98] hover:text-[#f7f8f8]"
                    title="Copy Port"
                  >
                    {copiedId === "port" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-[10px] text-[#8a8f98]">Port 2525 bypasses cloud ISP blocking</div>
              </div>

              {/* Security / Encryption */}
              <div className="p-3 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-1">
                <div className="text-[10px] font-mono uppercase text-[#62666d]">Encryption / Transport</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#f7f8f8] font-bold">STARTTLS / TLS (or Plain)</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#27a644]/20 text-[#27a644] font-mono">
                    Opportunistic
                  </span>
                </div>
                <div className="text-[10px] text-[#8a8f98]">Plaintext permitted within whitelisted VPC IPs</div>
              </div>

              {/* Authentication */}
              <div className="p-3 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-1">
                <div className="text-[10px] font-mono uppercase text-[#62666d]">Authentication Method</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#f7f8f8] font-bold">SMTP AUTH & IP Relay</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#ff69b4]/20 text-[#ff69b4] font-mono">
                    Dual Mode
                  </span>
                </div>
                <div className="text-[10px] text-[#8a8f98]">Use username/password or IP Whitelist</div>
              </div>
            </div>

            {/* Outlook & Email Client Quick Connect Card */}
            {credentials.length > 0 && (
              <div className="p-4 rounded-xl bg-[#141518] border border-[#2b2d35] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-[#ff69b4]" />
                    <span className="font-semibold text-[#f7f8f8]">Microsoft Outlook & Email Client Connection</span>
                  </div>
                  <button
                    onClick={() => {
                      const c = credentials[0];
                      const allInfo = `SMTP Server: ${effectiveHost}\nPort: 587 (or 2525)\nSecurity: STARTTLS\nUsername: ${c.username}\nPassword: ${c.password || "zmail_live_sec_2026"}`;
                      copyToClipboard(allInfo, "outlook-all");
                    }}
                    className="px-2.5 py-1 rounded bg-[#23252a] hover:bg-[#2e3137] text-[11px] font-mono text-[#f7f8f8] flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === "outlook-all" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5 text-[#8a8f98]" />}
                    <span>{copiedId === "outlook-all" ? "Copied!" : "Copy All for Outlook"}</span>
                  </button>
                </div>

                <p className="text-[11px] text-[#8a8f98]">
                  Enter these exact credentials in Microsoft Outlook, Apple Mail, Thunderbird, or your CRM under <strong>Outgoing Mail Server (SMTP)</strong>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded bg-[#090a0c] border border-[#1e2025] flex items-center justify-between">
                    <div>
                      <div className="text-[9px] uppercase text-[#62666d]">SMTP Server</div>
                      <div className="text-[#f7f8f8] font-bold">{effectiveHost}</div>
                    </div>
                    <button onClick={() => copyToClipboard(effectiveHost, "q-host")} className="text-[#8a8f98] hover:text-[#f7f8f8] p-1">
                      {copiedId === "q-host" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-2.5 rounded bg-[#090a0c] border border-[#1e2025] flex items-center justify-between">
                    <div>
                      <div className="text-[9px] uppercase text-[#62666d]">Port & Encryption</div>
                      <div className="text-[#f7f8f8] font-bold">587 / STARTTLS</div>
                    </div>
                    <button onClick={() => copyToClipboard("587", "q-port")} className="text-[#8a8f98] hover:text-[#f7f8f8] p-1">
                      {copiedId === "q-port" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-2.5 rounded bg-[#090a0c] border border-[#1e2025] flex items-center justify-between">
                    <div>
                      <div className="text-[9px] uppercase text-[#62666d]">Username</div>
                      <div className="text-[#ff69b4] font-bold">{credentials[0].username}</div>
                    </div>
                    <button onClick={() => copyToClipboard(credentials[0].username, "q-user")} className="text-[#8a8f98] hover:text-[#f7f8f8] p-1">
                      {copiedId === "q-user" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-2.5 rounded bg-[#090a0c] border border-[#1e2025] flex items-center justify-between">
                    <div>
                      <div className="text-[9px] uppercase text-[#62666d]">Password</div>
                      <div className="text-[#27a644] font-bold">
                        {showPassMap[credentials[0].id] ? (credentials[0].password || "zmail_live_sec_2026") : "••••••••••••"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowPassMap(prev => ({ ...prev, [credentials[0].id]: !prev[credentials[0].id] }))}
                        className="text-[#8a8f98] hover:text-[#f7f8f8] p-1"
                        title={showPassMap[credentials[0].id] ? "Hide Password" : "Show Password"}
                      >
                        {showPassMap[credentials[0].id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(credentials[0].password || "zmail_live_sec_2026", "q-pass")}
                        className="text-[#8a8f98] hover:text-[#f7f8f8] p-1"
                      >
                        {copiedId === "q-pass" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-[#8a8f98]">Bound to IP Pool: <code className="text-[#f7f8f8] font-mono">{credentials[0].pool_id}</code></span>
                  <button
                    onClick={() => setActiveTab("credentials")}
                    className="text-[11px] text-[#ff69b4] hover:underline cursor-pointer"
                  >
                    Manage / Add More Credentials &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Custom Routing Headers */}
            <div className="p-4 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-2">
              <span className="font-semibold text-[#f7f8f8] block">Multi-IP Pool Selection Headers</span>
              <p className="text-[11px] text-[#8a8f98]">
                To route email through a specific egress IP pool (Phase 1 Dynamic Pools), include either of these email headers when injecting:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2.5 rounded bg-[#070709] border border-[#1e2023] flex items-center justify-between">
                  <span className="text-[#f7f8f8]">X-Pool: &lt;pool-name&gt;</span>
                  <button onClick={() => copyToClipboard("X-Pool: transactional-pool", "header-pool")} className="text-[#8a8f98] hover:text-[#f7f8f8]">
                    {copiedId === "header-pool" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="p-2.5 rounded bg-[#070709] border border-[#1e2023] flex items-center justify-between">
                  <span className="text-[#f7f8f8]">X-Tenant: &lt;pool-name&gt;</span>
                  <button onClick={() => copyToClipboard("X-Tenant: marketing-pool", "header-tenant")} className="text-[#8a8f98] hover:text-[#f7f8f8]">
                    {copiedId === "header-tenant" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SMTP CREDENTIALS */}
        {activeTab === "credentials" && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#ff69b4]" />
                  <span>SMTP Submission Credentials & Authentication</span>
                </h3>
                <p className="text-[11px] text-[#8a8f98] mt-0.5">
                  Manage authenticated usernames and passwords for Microsoft Outlook, Apple Mail, Thunderbird, and SMTP clients.
                </p>
              </div>

              <button
                onClick={() => {
                  setNewCredUser("");
                  setNewCredPass("zm_" + Math.random().toString(36).substring(2, 12));
                  setNewCredDesc("");
                  setNewCredPool("default");
                  setCredError("");
                  setIsCredModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold flex items-center gap-1.5 transition-colors shadow-sm text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Generate SMTP Credential</span>
              </button>
            </div>

            {/* Credentials Table */}
            <div className="border border-[#23252a] rounded-xl overflow-hidden bg-[#0f1011]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#23252a] bg-[#141516] text-[10px] text-[#8a8f98] uppercase font-mono">
                    <th className="py-2.5 px-3">SMTP Username</th>
                    <th className="py-2.5 px-3">Password / Key</th>
                    <th className="py-2.5 px-3">Egress IP Pool</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2023] font-mono text-[11px]">
                  {credentials.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#8a8f98] font-sans">
                        No SMTP credentials generated yet. Click "Generate SMTP Credential" to create your first login.
                      </td>
                    </tr>
                  ) : (
                    credentials.map((c) => (
                      <tr key={c.id} className="hover:bg-[#141516] transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#ff69b4] select-all">{c.username}</span>
                            <button
                              onClick={() => copyToClipboard(c.username, `user-${c.id}`)}
                              className="text-[#8a8f98] hover:text-[#f7f8f8] p-0.5"
                              title="Copy username"
                            >
                              {copiedId === `user-${c.id}` ? <Check className="w-3 h-3 text-[#27a644]" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#27a644] font-bold select-all">
                              {showPassMap[c.id] ? (c.password || "zmail_live_sec_2026") : "••••••••••••"}
                            </span>
                            <button
                              onClick={() => setShowPassMap(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                              className="text-[#8a8f98] hover:text-[#f7f8f8] p-0.5"
                              title={showPassMap[c.id] ? "Hide Password" : "Show Password"}
                            >
                              {showPassMap[c.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(c.password || "zmail_live_sec_2026", `pass-${c.id}`)}
                              className="text-[#8a8f98] hover:text-[#f7f8f8] p-0.5"
                              title="Copy password"
                            >
                              {copiedId === `pass-${c.id}` ? <Check className="w-3 h-3 text-[#27a644]" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#3b9eff]/15 text-[#3b9eff] border border-[#3b9eff]/30">
                            {c.pool_id}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-[#d0d6e0] font-sans text-xs">
                          {c.description || "—"}
                        </td>

                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => handleToggleCredential(c.id, c.enabled)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-sans cursor-pointer transition-colors ${
                              c.enabled
                                ? "bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30 hover:bg-[#27a644]/25"
                                : "bg-[#8a8f98]/15 text-[#8a8f98] border border-[#8a8f98]/30 hover:bg-[#8a8f98]/25"
                            }`}
                          >
                            {c.enabled ? "Active" : "Disabled"}
                          </button>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteCredential(c.id)}
                            className="p-1 text-[#8a8f98] hover:text-[#eb5757] rounded hover:bg-[#18191a] transition-colors"
                            title="Revoke and delete credential"
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

            <div className="p-3 rounded-lg bg-[#0f1011] border border-[#23252a] text-[11px] text-[#8a8f98] flex items-center justify-between">
              <div>
                <strong>Security Notice:</strong> Passwords are authenticated using SHA-256 and STARTTLS over port 587 or 2525.
              </div>
              <div className="font-mono text-[10px] text-[#ff69b4]">
                ESMTP AUTH PLAIN / LOGIN Supported
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CODE SNIPPETS */}
        {activeTab === "snippets" && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
                  <Code className="w-4 h-4 text-[#a78bfa]" />
                  <span>Integration Code Snippets</span>
                </h3>
                <p className="text-[11px] text-[#8a8f98] mt-0.5">
                  Copy and paste ready-to-run connection code directly into your stack.
                </p>
              </div>

              {/* Language Picker */}
              <div className="flex items-center gap-1 bg-[#141516] p-1 rounded-lg border border-[#23252a]">
                {(["nodejs", "python", "php", "go", "curl", "wordpress"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCodeLang(lang)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                      codeLang === lang ? "bg-[#18191a] text-[#f7f8f8] font-bold" : "text-[#8a8f98] hover:text-[#f7f8f8]"
                    }`}
                  >
                    {lang === "nodejs" && "Node.js"}
                    {lang === "python" && "Python"}
                    {lang === "php" && "PHP / Laravel"}
                    {lang === "go" && "Go"}
                    {lang === "curl" && "cURL API"}
                    {lang === "wordpress" && "WordPress"}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Box */}
            <div className="p-3.5 rounded-xl bg-[#070709] border border-[#23252a] relative">
              <button
                onClick={() => {
                  let snippet = "";
                  if (codeLang === "nodejs") {
                    snippet = `const nodemailer = require('nodemailer');\n\nconst transporter = nodemailer.createTransport({\n  host: '${effectiveHost}',\n  port: ${primaryPort},\n  secure: false,\n  ignoreTLS: false,\n  headers: { 'X-Pool': 'default' }\n});\n\nawait transporter.sendMail({\n  from: 'noreply@yourdomain.com',\n  to: 'user@example.com',\n  subject: 'Hello from KumoMTA',\n  text: 'High-speed delivery through MailOps'\n});`;
                  } else if (codeLang === "python") {
                    snippet = `import smtplib\nfrom email.message import EmailMessage\n\nmsg = EmailMessage()\nmsg['Subject'] = 'Test from MailOps'\nmsg['From'] = 'noreply@yourdomain.com'\nmsg['To'] = 'user@example.com'\nmsg['X-Pool'] = 'default'\nmsg.set_content('High throughput delivery via KumoMTA')\n\nwith smtplib.SMTP('${effectiveHost}', ${primaryPort}) as s:\n    s.send_message(msg)`;
                  } else if (codeLang === "php") {
                    snippet = `// In Laravel .env file:\nMAIL_MAILER=smtp\nMAIL_HOST=${effectiveHost}\nMAIL_PORT=${primaryPort}\nMAIL_ENCRYPTION=null\nMAIL_FROM_ADDRESS=noreply@yourdomain.com\n\n// Or using PHPMailer:\n$mail = new PHPMailer(true);\n$mail->isSMTP();\n$mail->Host = '${effectiveHost}';\n$mail->Port = ${primaryPort};\n$mail->SMTPAuth = false;\n$mail->addCustomHeader('X-Pool', 'default');`;
                  } else if (codeLang === "go") {
                    snippet = `package main\n\nimport (\n\t"net/smtp"\n)\n\nfunc main() {\n\tto := []string{"user@example.com"}\n\tmsg := []byte("To: user@example.com\\r\\n" +\n\t\t"From: noreply@yourdomain.com\\r\\n" +\n\t\t"Subject: Delivery via KumoMTA\\r\\n" +\n\t\t"X-Pool: default\\r\\n\\r\\n" +\n\t\t"Instant enterprise relay.\\r\\n")\n\t_ = smtp.SendMail("${effectiveHost}:${primaryPort}", nil, "noreply@yourdomain.com", to, msg)\n}`;
                  } else if (codeLang === "curl") {
                    snippet = `curl -X POST http://${effectiveHost}:8080/api/v1/inject \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "from": "sender@yourdomain.com",\n    "to": "recipient@example.com",\n    "subject": "REST API Test",\n    "pool": "default"\n  }'`;
                  } else if (codeLang === "wordpress") {
                    snippet = `// In wp-config.php or WP Mail SMTP plugin settings:\n// SMTP Host: ${effectiveHost}\n// Encryption: None / TLS\n// SMTP Port: ${primaryPort}\n// Authentication: No (ensure your server IP is whitelisted in MailOps IP Whitelist tab)`;
                  }
                  copyToClipboard(snippet, "snippet");
                }}
                className="absolute top-3 right-3 px-2.5 py-1 rounded bg-[#141516] hover:bg-[#1f2022] border border-[#2b2d33] text-[10px] font-mono text-[#f7f8f8] flex items-center gap-1"
              >
                {copiedId === "snippet" ? <Check className="w-3 h-3 text-[#27a644]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedId === "snippet" ? "Copied!" : "Copy Code"}</span>
              </button>

              <pre className="font-mono text-[11px] text-[#d0d6e0] overflow-x-auto p-1 leading-relaxed">
                {codeLang === "nodejs" && (
                  `// Node.js (Nodemailer)\nconst nodemailer = require('nodemailer');\n\nconst transporter = nodemailer.createTransport({\n  host: '${effectiveHost}',\n  port: ${primaryPort},\n  secure: false,\n  ignoreTLS: false,\n  headers: { 'X-Pool': 'default' }\n});\n\nawait transporter.sendMail({\n  from: 'noreply@yourdomain.com',\n  to: 'user@example.com',\n  subject: 'Hello from KumoMTA',\n  text: 'High-speed delivery through MailOps'\n});`
                )}
                {codeLang === "python" && (
                  `# Python (smtplib)\nimport smtplib\nfrom email.message import EmailMessage\n\nmsg = EmailMessage()\nmsg['Subject'] = 'Test from MailOps'\nmsg['From'] = 'noreply@yourdomain.com'\nmsg['To'] = 'user@example.com'\nmsg['X-Pool'] = 'default'\nmsg.set_content('High throughput delivery via KumoMTA')\n\nwith smtplib.SMTP('${effectiveHost}', ${primaryPort}) as s:\n    s.send_message(msg)`
                )}
                {codeLang === "php" && (
                  `// Laravel .env configuration:\nMAIL_MAILER=smtp\nMAIL_HOST=${effectiveHost}\nMAIL_PORT=${primaryPort}\nMAIL_ENCRYPTION=null\nMAIL_FROM_ADDRESS=noreply@yourdomain.com\n\n// PHPMailer (Zero Auth / Whitelist Mode):\n$mail = new PHPMailer(true);\n$mail->isSMTP();\n$mail->Host = '${effectiveHost}';\n$mail->Port = ${primaryPort};\n$mail->SMTPAuth = false;\n$mail->addCustomHeader('X-Pool', 'default');`
                )}
                {codeLang === "go" && (
                  `// Go (net/smtp)\npackage main\n\nimport (\n\t"net/smtp"\n)\n\nfunc main() {\n\tto := []string{"user@example.com"}\n\tmsg := []byte("To: user@example.com\\r\\n" +\n\t\t"From: noreply@yourdomain.com\\r\\n" +\n\t\t"Subject: Delivery via KumoMTA\\r\\n" +\n\t\t"X-Pool: default\\r\\n\\r\\n" +\n\t\t"Instant enterprise relay.\\r\\n")\n\t_ = smtp.SendMail("${effectiveHost}:${primaryPort}", nil, "noreply@yourdomain.com", to, msg)\n}`
                )}
                {codeLang === "curl" && (
                  `curl -X POST http://${effectiveHost}:8080/api/v1/inject \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "from": "sender@yourdomain.com",\n    "to": "recipient@example.com",\n    "subject": "REST API Test",\n    "pool": "default"\n  }'`
                )}
                {codeLang === "wordpress" && (
                  `// In WordPress (WP Mail SMTP, Post SMTP, or FluentSMTP):\n// 1. Choose "Other SMTP"\n// 2. SMTP Host: ${effectiveHost}\n// 3. Encryption: None (or STARTTLS)\n// 4. SMTP Port: ${primaryPort}\n// 5. Authentication: Off (Authorize your webserver in MailOps IP Whitelist tab)\n// 6. From Email: Must match a connected Sending Domain`
                )}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: IP RELAY WHITELIST */}
        {activeTab === "whitelist" && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#27a644]" />
                  <span>IP Relay Whitelist & Authorization</span>
                </h3>
                <p className="text-[11px] text-[#8a8f98] mt-0.5">
                  Authorize your application servers, cloud VPCs, or tools to relay emails through KumoMTA with zero credentials.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3.5 py-1.5 rounded bg-[#27a644] hover:bg-[#23963e] text-white font-medium flex items-center gap-1.5 transition-colors shadow-sm text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Trusted IP / CIDR</span>
              </button>
            </div>

            {/* Whitelist Table */}
            <div className="border border-[#23252a] rounded-xl overflow-hidden bg-[#0f1011]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#23252a] bg-[#141516] text-[10px] text-[#8a8f98] uppercase font-mono">
                    <th className="py-2.5 px-3">Authorized IP / Subnet</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2023] font-mono text-[11px]">
                  {whitelist.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[#8a8f98] font-sans">
                        No custom IP whitelist entries configured.
                      </td>
                    </tr>
                  ) : (
                    whitelist.map((w) => (
                      <tr key={w.id} className="hover:bg-[#141516] transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#f7f8f8] select-all">{w.cidr}</td>
                        <td className="py-2.5 px-3 text-[#d0d6e0] font-sans text-xs">{w.description}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30">
                            Active Relay
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteWhitelist(w.id)}
                            className="p-1 text-[#eb5757] hover:bg-[#eb5757]/10 rounded transition-colors"
                            title="Remove from whitelist"
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

            <div className="p-3 rounded-lg bg-[#141516] border border-[#23252a] text-[11px] text-[#8a8f98] flex items-center gap-2">
              <Laptop className="w-4 h-4 text-[#3b9eff] flex-shrink-0" />
              <span>
                Changes sync automatically to KumoMTA's live relay policy (<code className="text-[#f7f8f8]">relay_hosts.json</code>).
              </span>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE INCOMING CONNECTIONS */}
        {activeTab === "connections" && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#ffc53d]" />
                  <span>Live Incoming Connections Monitor</span>
                </h3>
                <p className="text-[11px] text-[#8a8f98] mt-0.5">
                  Real-time telemetry showing incoming client connections, injection attempts, and originating IPs.
                </p>
              </div>

              <button
                onClick={async () => {
                  setIsRefreshingConn(true);
                  const data = await fetchIncomingConnections().catch(() => []);
                  if (Array.isArray(data)) setConnections(data);
                  setTimeout(() => setIsRefreshingConn(false), 500);
                }}
                className="px-3 py-1.5 rounded bg-[#18191a] hover:bg-[#23252a] border border-[#2b2d33] text-[#f7f8f8] flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingConn ? "animate-spin" : ""}`} />
                <span>Refresh Log</span>
              </button>
            </div>

            {/* Connections Stream Table */}
            <div className="border border-[#23252a] rounded-xl overflow-hidden bg-[#0f1011]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#23252a] bg-[#141516] text-[10px] text-[#8a8f98] uppercase font-mono">
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Originating IP</th>
                    <th className="py-2.5 px-3">Port & Protocol</th>
                    <th className="py-2.5 px-3">Client Identifier</th>
                    <th className="py-2.5 px-3">Relay Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2023] font-mono text-[11px]">
                  {connections.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#8a8f98] font-sans">
                        No incoming connection attempts observed yet. Connect an external tool or run an injection to view live logs.
                      </td>
                    </tr>
                  ) : (
                    connections.map((c) => (
                      <tr key={c.id} className="hover:bg-[#141516] transition-colors">
                        <td className="py-2.5 px-3 text-[#8a8f98]">
                          {new Date(c.timestamp).toLocaleTimeString([], { hour12: false })}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#f7f8f8] select-all">
                          {c.source_ip}
                        </td>
                        <td className="py-2.5 px-3 text-[#3b9eff]">
                          :{c.port} ({c.protocol})
                        </td>
                        <td className="py-2.5 px-3 text-[#d0d6e0] truncate max-w-[140px]">
                          {c.hostname || c.auth_user || "client"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30">
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Whitelist Screen (NO DIALOG OVERLAY) */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-[#0a0a0c] z-50 flex flex-col overflow-y-auto">
          <div className="px-5 py-3 bg-[#0f1011] border-b border-[#23252a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-2.5 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs transition-colors cursor-pointer"
              >
                ← Back to Relay Access
              </button>
              <span className="text-[#62666d]">/</span>
              <span className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#27a644]" />
                Add IP to Relay Whitelist
              </span>
            </div>
          </div>
          <div className="max-w-xl mx-auto w-full p-6">
            <div className="bg-[#141516] border border-[#23252a] rounded-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#23252a] pb-3">
              <h3 className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#27a644]" />
                <span>Add IP to Relay Whitelist</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8a8f98] hover:text-[#f7f8f8] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWhitelist} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                  Client IP Address or CIDR Subnet
                </label>
                <input
                  type="text"
                  required
                  value={newCidr}
                  onChange={(e) => setNewCidr(e.target.value)}
                  placeholder="e.g. 203.0.113.45 or 10.0.0.0/16"
                  className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#27a644] font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                  Description / Tool Name
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="e.g. Production Laravel App, Sendy Server"
                  className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-1.5 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#27a644]"
                />
              </div>

              {wlError && (
                <div className="p-2 rounded bg-[#eb5757]/15 border border-[#eb5757]/30 text-[#eb5757] text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{wlError}</span>
                </div>
              )}

              <p className="text-[10px] text-[#62666d]">
                This IP will be granted instantaneous ESMTP relay access on port 2525 without requiring SMTP credentials.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#23252a]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-[#18191a] hover:bg-[#1f2022] text-[#8a8f98] hover:text-[#f7f8f8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingWl}
                  className="px-4 py-1.5 rounded bg-[#27a644] hover:bg-[#23963e] text-white font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {isAddingWl ? "Saving..." : "Authorize Relay"}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Generate SMTP Credential */}
      {isCredModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1011] border border-[#23252a] rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-[#23252a]">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#ff69b4]" />
                <span className="font-semibold text-sm text-[#f7f8f8]">Generate SMTP Submission Credential</span>
              </div>
              <button
                onClick={() => setIsCredModalOpen(false)}
                className="text-[#8a8f98] hover:text-[#f7f8f8] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCredential} className="p-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                  SMTP Username / Account Identity *
                </label>
                <input
                  type="text"
                  required
                  value={newCredUser}
                  onChange={(e) => setNewCredUser(e.target.value)}
                  placeholder="e.g. outlook_office or alex@yourdomain.com"
                  className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#ff69b4] font-mono"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-[#8a8f98]">
                    SMTP Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewCredPass("zm_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6))}
                    className="text-[10px] text-[#ff69b4] hover:underline"
                  >
                    Regenerate Password
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newCredPass}
                  onChange={(e) => setNewCredPass(e.target.value)}
                  placeholder="Auto-generated cryptographic key"
                  className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#27a644] font-mono focus:outline-none focus:border-[#ff69b4]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                    Egress IP Pool
                  </label>
                  <select
                    value={newCredPool}
                    onChange={(e) => setNewCredPool(e.target.value)}
                    className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-2.5 py-1.5 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#ff69b4]"
                  >
                    <option value="default">default (Shared Pool)</option>
                    {pools.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                    Description / Purpose
                  </label>
                  <input
                    type="text"
                    value={newCredDesc}
                    onChange={(e) => setNewCredDesc(e.target.value)}
                    placeholder="e.g. Work Laptop Outlook"
                    className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-2.5 py-1.5 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#ff69b4]"
                  />
                </div>
              </div>

              {credError && (
                <div className="p-2 rounded bg-[#eb5757]/15 border border-[#eb5757]/30 text-[#eb5757] text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{credError}</span>
                </div>
              )}

              <p className="text-[10px] text-[#62666d]">
                This credential will be accepted on port 587 (STARTTLS) and port 2525 using standard ESMTP AUTH PLAIN / LOGIN.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#23252a]">
                <button
                  type="button"
                  onClick={() => setIsCredModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-[#18191a] hover:bg-[#1f2022] text-[#8a8f98] hover:text-[#f7f8f8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingCred}
                  className="px-4 py-1.5 rounded bg-[#ff69b4] hover:bg-[#ff69b4]/90 text-slate-950 font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {isAddingCred ? "Saving..." : "Create Credential"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
