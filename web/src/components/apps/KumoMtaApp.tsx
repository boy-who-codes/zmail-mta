"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  RefreshCw,
  CheckCircle2,
  Send,
  Sliders,
  AlertCircle,
  Inbox,
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import {
  fetchNodes,
  fetchQueues,
  injectTestMessage,
  fetchKumoLuaPolicy,
  fetchRateLimits,
  saveRateLimit,
  deleteRateLimit,
  performQueueAction,
} from "../../lib/api";

interface RateLimit {
  domain: string;
  connection_limit: number;
  max_connection_rate: string;
  max_deliveries_per_connection: number;
  max_message_rate: string;
}

export const KumoMtaApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"nodes" | "queues" | "rules" | "test">("nodes");
  const [recipient, setRecipient] = useState("test-lead@enterprise.com");
  const [subject, setSubject] = useState("Email Delivery Verification Test");
  const [sendingSuccess, setSendingSuccess] = useState(false);
  const [lastMsgId, setLastMsgId] = useState<string>("");
  const [sendError, setSendError] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  const [nodes, setNodes] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);
  const [luaCode, setLuaCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<string>("");

  // Rate Limit Modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<RateLimit | null>(null);
  const [ruleDomain, setRuleDomain] = useState<string>("");
  const [ruleConnLimit, setRuleConnLimit] = useState<number>(10);
  const [ruleConnRate, setRuleConnRate] = useState<string>("50/s");
  const [ruleDeliveries, setRuleDeliveries] = useState<number>(100);
  const [ruleMsgRate, setRuleMsgRate] = useState<string>("50/s");
  const [isSubmittingRule, setIsSubmittingRule] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [nodesData, queuesData, policy, limitsData] = await Promise.all([
        fetchNodes().catch(() => []),
        fetchQueues().catch(() => []),
        fetchKumoLuaPolicy().catch(() => "-- Generating policy..."),
        fetchRateLimits().catch(() => []),
      ]);

      if (Array.isArray(nodesData)) {
        setNodes(
          nodesData.map((n: any) => ({
            name: n.hostname,
            ip: n.ip,
            region: n.region,
            spool: `${Math.round((n.spool_used_gb / (n.spool_cap_gb || 1)) * 100)}%`,
            spool_text: `${n.spool_used_gb} GB of ${n.spool_cap_gb} GB used`,
            queue: n.queue_depth,
            cpu: n.cpu_percent,
          }))
        );
      } else {
        setNodes([]);
      }

      if (Array.isArray(queuesData)) {
        setQueues(
          queuesData.map((q: any) => ({
            domain: q.domain_name || q.destination,
            ready: q.ready_count ?? q.waiting ?? 0,
            deferred: q.deferred_count ?? q.delayed ?? 0,
            bounced: q.bounced ?? 0,
            policy: q.throttle_rule || q.throttle_policy || "Standard Delivery (50/s)",
          }))
        );
      } else {
        setQueues([]);
      }

      setLuaCode(policy);
      setRateLimits(Array.isArray(limitsData) ? limitsData : []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- QUEUE ACTIONS ---
  const handleQueueAction = async (queue: string, action: "flush" | "pause" | "resume" | "clear") => {
    try {
      await performQueueAction(queue, action);
      setActionNotice(`Action '${action}' completed successfully on queue '${queue}'`);
      setTimeout(() => setActionNotice(""), 4000);
      await loadData();
    } catch (err: any) {
      alert(err.message || `Failed to execute ${action} on queue`);
    }
  };

  // --- RATE LIMIT CRUD ---
  const handleOpenAddRule = () => {
    setEditingRule(null);
    setRuleDomain("");
    setRuleConnLimit(10);
    setRuleConnRate("50/s");
    setRuleDeliveries(100);
    setRuleMsgRate("50/s");
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (rule: RateLimit) => {
    setEditingRule(rule);
    setRuleDomain(rule.domain);
    setRuleConnLimit(rule.connection_limit);
    setRuleConnRate(rule.max_connection_rate);
    setRuleDeliveries(rule.max_deliveries_per_connection);
    setRuleMsgRate(rule.max_message_rate);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleDomain.trim()) return;

    try {
      setIsSubmittingRule(true);
      await saveRateLimit({
        domain: ruleDomain.trim().toLowerCase(),
        connection_limit: Number(ruleConnLimit),
        max_connection_rate: ruleConnRate.trim(),
        max_deliveries_per_connection: Number(ruleDeliveries),
        max_message_rate: ruleMsgRate.trim(),
      });
      setIsRuleModalOpen(false);
      setActionNotice(`Rate limit rule for '${ruleDomain}' saved and synchronized to shaping engine`);
      setTimeout(() => setActionNotice(""), 4000);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save rate limit rule");
    } finally {
      setIsSubmittingRule(false);
    }
  };

  const handleDeleteRule = async (domain: string) => {
    if (!confirm(`Are you sure you want to delete rate limit for '${domain}'?`)) return;
    try {
      await deleteRateLimit(domain);
      setActionNotice(`Rate limit rule for '${domain}' removed`);
      setTimeout(() => setActionNotice(""), 4000);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete rate limit rule");
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setSendError("");
    setSendingSuccess(false);

    try {
      const res = await injectTestMessage("alerts@mailops.local", recipient, subject);
      if (res && res.message_id) {
        setLastMsgId(res.message_id);
        setSendingSuccess(true);
        setTimeout(() => setSendingSuccess(false), 5000);
        await loadData();
      } else {
        setSendError("Unexpected response from mail server");
      }
    } catch (err: any) {
      setSendError(err.message || "Failed to inject test email");
    } finally {
      setIsSending(false);
    }
  };

  const totalQueued = queues.reduce((acc, q) => acc + (q.ready || 0) + (q.deferred || 0), 0);
  const primaryNode = nodes[0];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-xs">
      {/* Top App Toolbar & Tabs */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0f1011] border-b border-[#23252a]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("nodes")}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === "nodes"
                ? "bg-[#18191a] text-[#f7f8f8] border border-[#34343a]"
                : "text-[#8a8f98] hover:text-[#f7f8f8]"
            }`}
          >
            Sending Servers ({nodes.length})
          </button>
          <button
            onClick={() => setActiveTab("queues")}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === "queues"
                ? "bg-[#18191a] text-[#f7f8f8] border border-[#34343a]"
                : "text-[#8a8f98] hover:text-[#f7f8f8]"
            }`}
          >
            Outgoing Queues ({totalQueued})
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === "rules"
                ? "bg-[#18191a] text-[#f7f8f8] border border-[#34343a]"
                : "text-[#8a8f98] hover:text-[#f7f8f8]"
            }`}
          >
            Rate Limits & Shaping ({rateLimits.length})
          </button>
          <button
            onClick={() => setActiveTab("test")}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === "test"
                ? "bg-[#18191a] text-[#f7f8f8] border border-[#34343a]"
                : "text-[#8a8f98] hover:text-[#f7f8f8]"
            }`}
          >
            Send Test Email
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            title="Refresh MTA state"
            className="p-1 rounded bg-[#18191a] hover:bg-[#1f2022] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <span className="text-[11px] text-[#27a644] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
            MTA Spool: Active
          </span>
        </div>
      </div>

      {actionNotice && (
        <div className="px-4 py-2 bg-[#27a644]/15 border-b border-[#27a644]/30 text-[#27a644] text-[11px] flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "nodes" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a]">
                <div className="text-[#8a8f98] text-[11px]">Message Spool Storage</div>
                <div className="text-lg font-semibold text-[#f7f8f8] mt-0.5">
                  {primaryNode ? primaryNode.spool_text : "0 GB of 0 GB"}
                </div>
                <div className="w-full bg-[#1e2023] h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="bg-[#5e6ad2] h-full"
                    style={{ width: primaryNode ? primaryNode.spool : "0%" }}
                  />
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a]">
                <div className="text-[#8a8f98] text-[11px]">Host Status & Load</div>
                <div className="text-lg font-semibold text-[#f7f8f8] mt-0.5 font-mono">
                  {primaryNode ? `CPU: ${primaryNode.cpu.toFixed(1)}%` : "Standby"}
                </div>
                <div className="text-[10px] text-[#27a644] mt-1">Host telemetry operational</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a]">
                <div className="text-[#8a8f98] text-[11px]">Queue Depth</div>
                <div className="text-lg font-semibold text-[#f7f8f8] mt-0.5 font-mono">
                  {totalQueued} messages
                </div>
                <div className="text-[10px] text-[#27a644] mt-1">
                  {totalQueued === 0 ? "All queues clean & delivered" : "Processing queue"}
                </div>
              </div>
            </div>

            {/* Servers Table */}
            <div className="border border-[#23252a] rounded-xl overflow-hidden bg-[#0f1011]">
              <div className="px-3.5 py-2.5 bg-[#141516] border-b border-[#23252a] font-medium text-[#d0d6e0] flex items-center justify-between">
                <span className="font-semibold text-[#f7f8f8]">Observed Sending Nodes</span>
                <span className="text-[10px] text-[#8a8f98]">Live System Inspection</span>
              </div>
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-[#62666d] bg-[#101113] border-b border-[#23252a]">
                  <tr>
                    <th className="px-3.5 py-2">Server Name</th>
                    <th className="px-3.5 py-2">Sending IP</th>
                    <th className="px-3.5 py-2">Location</th>
                    <th className="px-3.5 py-2">Spool Usage</th>
                    <th className="px-3.5 py-2">Waiting in Spool</th>
                    <th className="px-3.5 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2023] text-[11px]">
                  {nodes.map((node) => (
                    <tr key={node.name} className="hover:bg-[#141516]">
                      <td className="px-3.5 py-2.5 text-[#f7f8f8] font-medium flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-[#5e6ad2]" />
                        {node.name}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[#8a8f98]">{node.ip}</td>
                      <td className="px-3.5 py-2.5 text-[#8a8f98]">{node.region}</td>
                      <td className="px-3.5 py-2.5 font-mono">{node.spool}</td>
                      <td className="px-3.5 py-2.5 text-[#f7f8f8] font-mono">{node.queue}</td>
                      <td className="px-3.5 py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30">
                          Online & Healthy
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OUTGOING QUEUES WITH ACTIONS */}
        {activeTab === "queues" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <div>
                <span className="text-xs font-semibold text-[#f7f8f8]">Outgoing Destination Queues</span>
                <p className="text-[11px] text-[#8a8f98] mt-0.5">
                  Manage spooled messages waiting to send. Flush retries, pause queues, or clear spooled batches.
                </p>
              </div>
              <button
                onClick={loadData}
                className="px-2.5 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#f7f8f8] border border-[#2b2d33] flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Queues
              </button>
            </div>

            {queues.length === 0 ? (
              <div className="p-8 border border-[#23252a] rounded-xl bg-[#0f1011] text-center flex flex-col items-center justify-center">
                <Inbox className="w-8 h-8 text-[#62666d] mb-2 stroke-[1.5]" />
                <h4 className="font-medium text-[#d0d6e0] mb-1">All Outgoing Queues Are Clear</h4>
                <p className="text-[11px] text-[#8a8f98] max-w-sm mb-3">
                  There are no messages waiting to send in the spool. Outbound messages will appear here grouped by destination domain.
                </p>
                <button
                  onClick={() => setActiveTab("test")}
                  className="px-3 py-1.5 bg-[#5e6ad2] hover:bg-[#4f5ac0] text-white rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>Send a Test Message</span>
                </button>
              </div>
            ) : (
              <div className="border border-[#23252a] rounded-xl overflow-hidden bg-[#0f1011]">
                <table className="w-full text-left">
                  <thead className="text-[10px] uppercase text-[#62666d] bg-[#101113] border-b border-[#23252a]">
                    <tr>
                      <th className="px-3.5 py-2">Destination Domain</th>
                      <th className="px-3.5 py-2">Waiting in Spool</th>
                      <th className="px-3.5 py-2">Delayed</th>
                      <th className="px-3.5 py-2">Bounced</th>
                      <th className="px-3.5 py-2">Delivery Policy</th>
                      <th className="px-3.5 py-2 text-right">Queue Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2023] text-[11px]">
                    {queues.map((q) => (
                      <tr key={q.domain} className="hover:bg-[#141516] transition-colors">
                        <td className="px-3.5 py-2.5 text-[#f7f8f8] font-medium">{q.domain}</td>
                        <td className="px-3.5 py-2.5 text-[#27a644] font-mono font-bold">{q.ready}</td>
                        <td className="px-3.5 py-2.5 text-[#ffc53d] font-mono">{q.deferred}</td>
                        <td className="px-3.5 py-2.5 text-[#ff2047] font-mono">{q.bounced}</td>
                        <td className="px-3.5 py-2.5 text-[#d0d6e0]">{q.policy}</td>
                        <td className="px-3.5 py-2.5 text-right space-x-1.5">
                          <button
                            onClick={() => handleQueueAction(q.domain, "flush")}
                            title="Force flush and retry delayed emails now"
                            className="px-2 py-0.5 rounded bg-[#18191a] hover:bg-[#23252a] text-[#27a644] border border-[#23252a] font-medium"
                          >
                            <RotateCcw className="w-3 h-3 inline mr-1" />
                            Retry Now
                          </button>
                          <button
                            onClick={() => handleQueueAction(q.domain, "pause")}
                            title="Pause sending to this destination"
                            className="px-2 py-0.5 rounded bg-[#18191a] hover:bg-[#23252a] text-[#ffc53d] border border-[#23252a]"
                          >
                            <Pause className="w-3 h-3 inline mr-1" />
                            Pause
                          </button>
                          <button
                            onClick={() => handleQueueAction(q.domain, "resume")}
                            title="Resume sending"
                            className="px-2 py-0.5 rounded bg-[#18191a] hover:bg-[#23252a] text-[#3b9eff] border border-[#23252a]"
                          >
                            <Play className="w-3 h-3 inline mr-1" />
                            Resume
                          </button>
                          <button
                            onClick={() => handleQueueAction(q.domain, "clear")}
                            title="Clear spooled messages for this queue"
                            className="px-2 py-0.5 rounded bg-[#18191a] hover:bg-[#ff2047]/20 text-[#8a8f98] hover:text-[#ff2047] border border-[#23252a]"
                          >
                            <Trash2 className="w-3 h-3 inline mr-1" />
                            Clear
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

        {/* RATE LIMITS & SHAPING CRUD TAB */}
        {activeTab === "rules" && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#f7f8f8]">Rate Limits & Traffic Shaping Rules</span>
                <p className="text-[11px] text-[#8a8f98] mt-0.5">
                  Declare connection limits and sending rate rules per destination provider to avoid throttling.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenAddRule}
                  className="px-3 py-1.5 rounded bg-[#5e6ad2] hover:bg-[#4f5ac0] text-white flex items-center gap-1.5 font-medium transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Rate Limit Rule
                </button>
              </div>
            </div>

            {/* Rate Limits Table */}
            <div className="border border-[#23252a] rounded-xl overflow-hidden bg-[#0f1011]">
              <div className="px-3.5 py-2.5 bg-[#141516] border-b border-[#23252a] font-medium text-[#d0d6e0] flex items-center justify-between">
                <span className="font-semibold text-[#f7f8f8]">Configured Shaping Rules (shaping.toml)</span>
                <span className="text-[10px] text-[#27a644]">Live Synchronized with MTA Engine</span>
              </div>
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-[#62666d] bg-[#101113] border-b border-[#23252a]">
                  <tr>
                    <th className="px-3.5 py-2">Domain / Destination</th>
                    <th className="px-3.5 py-2">Max Connection Rate</th>
                    <th className="px-3.5 py-2">Connection Limit</th>
                    <th className="px-3.5 py-2">Deliveries / Conn</th>
                    <th className="px-3.5 py-2">Message Rate</th>
                    <th className="px-3.5 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2023] text-[11px]">
                  {rateLimits.map((rule) => (
                    <tr key={rule.domain} className="hover:bg-[#141516] transition-colors">
                      <td className="px-3.5 py-2.5 text-[#f7f8f8] font-medium">
                        {rule.domain === "default" ? (
                          <span className="text-[#ff69b4] font-bold">default (Global Fallback)</span>
                        ) : rule.domain === "gmail.com" ? (
                          <div className="flex items-center gap-1.5">
                            <span>Google / Gmail</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30 font-normal">
                              MX Rollup + TLS Required
                            </span>
                          </div>
                        ) : rule.domain === "yahoo.com" ? (
                          <div className="flex items-center gap-1.5">
                            <span>Yahoo! / AOL</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#3b9eff]/15 text-[#3b9eff] border border-[#3b9eff]/30 font-normal">
                              TS04 Auto-Protection
                            </span>
                          </div>
                        ) : rule.domain === "outlook.com" ? (
                          <div className="flex items-center gap-1.5">
                            <span>Microsoft Outlook / O365</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#ffc53d]/15 text-[#ffc53d] border border-[#ffc53d]/30 font-normal">
                              Protection Cluster
                            </span>
                          </div>
                        ) : rule.domain === "icloud.com" ? (
                          <div className="flex items-center gap-1.5">
                            <span>Apple iCloud</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#8a8f98]/15 text-[#d0d6e0] border border-[#8a8f98]/30 font-normal">
                              Max 5/conn Shaper
                            </span>
                          </div>
                        ) : (
                          rule.domain
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[#d0d6e0]">{rule.max_connection_rate}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[#f7f8f8]">{rule.connection_limit}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[#d0d6e0]">{rule.max_deliveries_per_connection}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[#27a644]">{rule.max_message_rate}</td>
                      <td className="px-3.5 py-2.5 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditRule(rule)}
                          title="Edit Rule"
                          className="p-1 rounded hover:bg-[#18191a] text-[#8a8f98] hover:text-[#f7f8f8]"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline" />
                        </button>
                        {rule.domain !== "default" && (
                          <button
                            onClick={() => handleDeleteRule(rule.domain)}
                            title="Delete Rule"
                            className="p-1 rounded hover:bg-[#ff2047]/20 text-[#8a8f98] hover:text-[#ff2047]"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Generated Policy Preview */}
            <div className="space-y-1">
              <span className="text-[11px] text-[#8a8f98] font-medium">Generated MTA Traffic Policy (Live from Go Backend)</span>
              <pre className="p-3.5 rounded-xl bg-[#050507] border border-[#23252a] font-mono text-[11px] text-[#8a8f98] overflow-x-auto leading-relaxed">
                {luaCode}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "test" && (
          <form onSubmit={handleSendTest} className="space-y-3 max-w-lg">
            <div>
              <h3 className="font-semibold text-sm text-[#f7f8f8]">Send an Operational Test Email</h3>
              <p className="text-[11px] text-[#8a8f98] mt-0.5">
                Submits a message directly into the Go backend spool to test queue ingestion, delivery routing, and capture in the Test Sandbox.
              </p>
            </div>

            {sendingSuccess && (
              <div className="p-3 rounded-lg bg-[#27a644]/15 border border-[#27a644]/40 text-[#27a644] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Message injected successfully: accepted for delivery (ID: {lastMsgId})</span>
              </div>
            )}

            {sendError && (
              <div className="p-3 rounded-lg bg-[#ff2047]/15 border border-[#ff2047]/40 text-[#ff2047] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{sendError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] text-[#8a8f98] mb-1">Recipient Email Address</label>
              <input
                type="email"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-[#141516] border border-[#23252a] text-[#f7f8f8] outline-none focus:border-[#5e6ad2]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#8a8f98] mb-1">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-[#141516] border border-[#23252a] text-[#f7f8f8] outline-none focus:border-[#5e6ad2]"
              />
            </div>
            <button
              type="submit"
              disabled={isSending}
              className="px-4 py-2 rounded bg-[#5e6ad2] hover:bg-[#828fff] disabled:opacity-50 text-white font-medium transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> {isSending ? "Injecting into Spool..." : "Send Test Email (Live Backend API)"}
            </button>
          </form>
        )}
      </div>

      {/* --- ADD / EDIT RATE LIMIT SCREEN (NO DIALOG OVERLAY) --- */}
      {isRuleModalOpen && (
        <div className="absolute inset-0 bg-[#0a0a0c] z-50 flex flex-col overflow-y-auto">
          <div className="px-5 py-3 bg-[#0f1011] border-b border-[#23252a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="px-2.5 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs transition-colors cursor-pointer"
              >
                ← Back to Rate Limits
              </button>
              <span className="text-[#62666d]">/</span>
              <span className="font-semibold text-sm text-[#f7f8f8]">
                {editingRule ? `Edit Rate Limit: ${editingRule.domain}` : "Add Rate Limit Rule"}
              </span>
            </div>
          </div>

          <div className="max-w-xl mx-auto w-full p-6">
            <form onSubmit={handleSaveRule} className="space-y-4 bg-[#121316] border border-[#23252a] rounded-xl p-6 shadow-2xl">
              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Destination Domain</label>
                <input
                  type="text"
                  required
                  disabled={editingRule?.domain === "default"}
                  value={ruleDomain}
                  onChange={(e) => setRuleDomain(e.target.value)}
                  placeholder="e.g. gmail.com, outlook.com"
                  className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#ff69b4] disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                    Connection Limit (Max Concurrent)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={ruleConnLimit}
                    onChange={(e) => setRuleConnLimit(Number(e.target.value))}
                    className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#ff69b4]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                    Max Connection Rate
                  </label>
                  <input
                    type="text"
                    required
                    value={ruleConnRate}
                    onChange={(e) => setRuleConnRate(e.target.value)}
                    placeholder="e.g. 50/s or 100/min"
                    className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#ff69b4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                    Max Deliveries / Conn
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={ruleDeliveries}
                    onChange={(e) => setRuleDeliveries(Number(e.target.value))}
                    className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#ff69b4]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                    Max Message Rate
                  </label>
                  <input
                    type="text"
                    required
                    value={ruleMsgRate}
                    onChange={(e) => setRuleMsgRate(e.target.value)}
                    placeholder="e.g. 50/s or 100/s"
                    className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#ff69b4]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#23252a]">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-3.5 py-1.5 rounded bg-[#18191a] hover:bg-[#1f2022] text-[#8a8f98] hover:text-[#f7f8f8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRule}
                  className="px-4 py-1.5 rounded bg-[#ff69b4] hover:bg-[#ff52a8] text-[#0a0a0c] font-bold"
                >
                  {isSubmittingRule ? "Saving..." : editingRule ? "Update Rate Limit" : "Save Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};