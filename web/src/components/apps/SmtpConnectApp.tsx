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
  Laptop
} from "lucide-react";
import {
  fetchSmtpInfo,
  fetchRelayWhitelist,
  addRelayWhitelist,
  deleteRelayWhitelist,
  fetchIncomingConnections
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
  const [activeTab, setActiveTab] = useState<"settings" | "snippets" | "whitelist" | "connections">("settings");
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [clientHost, setClientHost] = useState<string>("localhost");
  const [copiedId, setCopiedId] = useState<string>("");

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
      const [info, wl, conn] = await Promise.all([
        fetchSmtpInfo().catch(() => null),
        fetchRelayWhitelist().catch(() => []),
        fetchIncomingConnections().catch(() => []),
      ]);
      if (info) setHostInfo(info);
      if (Array.isArray(wl)) setWhitelist(wl);
      if (Array.isArray(conn)) setConnections(conn);
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
                  <span className="font-mono text-xs text-[#f7f8f8] font-bold">IP Whitelist (Zero Auth)</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#3b9eff]/20 text-[#3b9eff] font-mono">
                    Instant Relay
                  </span>
                </div>
                <div className="text-[10px] text-[#8a8f98]">Add sender IP to Whitelist tab for instant relay</div>
              </div>
            </div>

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

        {/* TAB 2: CODE SNIPPETS */}
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
    </div>
  );
};
