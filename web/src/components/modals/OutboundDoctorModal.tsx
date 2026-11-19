"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Send,
  Globe,
  Radio,
  Server,
  KeyRound,
  ExternalLink,
  Flame,
  ArrowRight,
  Info,
  Clock,
} from "lucide-react";
import {
  fetchOutboundPreflight,
  runCanaryProbe,
  OutboundPreflightReport,
  CanaryProbeResult,
} from "../../lib/api";

interface OutboundDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OutboundDoctorModal: React.FC<OutboundDoctorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [report, setReport] = useState<OutboundPreflightReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [canaryRecipient, setCanaryRecipient] = useState("");
  const [canarySending, setCanarySending] = useState(false);
  const [canaryResult, setCanaryResult] = useState<CanaryProbeResult | null>(null);
  const [canaryError, setCanaryError] = useState<string | null>(null);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const data = await fetchOutboundPreflight();
      setReport(data);
    } catch (err: any) {
      console.error("Failed to run outbound preflight:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendCanary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canaryRecipient.trim()) return;

    setCanarySending(true);
    setCanaryError(null);
    setCanaryResult(null);

    try {
      const res = await runCanaryProbe(canaryRecipient.trim());
      setCanaryResult(res);
      if (!res.success) {
        setCanaryError(res.response || "Transmission rejected by MTA queue");
      }
    } catch (err: any) {
      setCanaryError(err.message || "Failed to dispatch canary probe");
    } finally {
      setCanarySending(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "ready":
        return {
          bg: "bg-[#27a644]/10",
          border: "border-[#27a644]/40",
          text: "text-[#27a644]",
          badgeBg: "bg-[#27a644]",
          title: "OUTBOUND READY",
        };
      case "degraded":
        return {
          bg: "bg-[#ff9800]/10",
          border: "border-[#ff9800]/40",
          text: "text-[#ff9800]",
          badgeBg: "bg-[#ff9800]",
          title: "DELIVERABILITY DEGRADED",
        };
      case "blocked":
      default:
        return {
          bg: "bg-[#ff2047]/10",
          border: "border-[#ff2047]/40",
          text: "text-[#ff2047]",
          badgeBg: "bg-[#ff2047]",
          title: "OUTBOUND BLOCKED",
        };
    }
  };

  const st = getStatusColor(report?.overall_status);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0c0d12] border border-[#23252e] w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2028] bg-[#12131a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff69b4]/10 border border-[#ff69b4]/30 flex items-center justify-center text-[#ff69b4]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Outbound Deliverability Doctor
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                  Preflight Diagnostic
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live automated probe testing Port 25 egress, rDNS, KumoMTA, and public MX reachability
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDiagnostics}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181922] hover:bg-[#20222f] border border-[#2a2c3a] text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#ff69b4]" : ""}`} />
              <span>{loading ? "Probing Network..." : "Re-run Probe"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Hero Banner */}
          <div className={`p-4 rounded-xl border ${st.bg} ${st.border} transition-all`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-3.5 h-3.5 rounded-full ${st.badgeBg} shadow-lg`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black tracking-wider uppercase ${st.text}`}>
                      {st.title}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      • Tested {report?.tested_at ? new Date(report.tested_at).toLocaleTimeString() : "just now"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {report?.summary || "Analyzing network configuration..."}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] text-slate-400 block">Egress Status</span>
                <span className={`text-xs font-bold font-mono ${report?.can_send_outbound ? "text-[#27a644]" : "text-[#ff2047]"}`}>
                  {report?.can_send_outbound ? "DELIVERY READY" : "TRANSMISSION BLOCKED"}
                </span>
              </div>
            </div>

            {/* Actionable Recommendations List */}
            {report?.actionable_recommendations && report.actionable_recommendations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Remediation & Next Steps:
                </div>
                {report.actionable_recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <ArrowRight className="w-3.5 h-3.5 text-[#ff69b4] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Core Diagnostic Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Port 25 Outbound Egress */}
            <div className="p-4 rounded-xl bg-[#12131a] border border-[#1f2028] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Radio className="w-4 h-4 text-[#ff69b4]" />
                  <span>Port 25 Outbound Egress</span>
                </div>
                {report?.port_25_status.is_open ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#27a644] bg-[#27a644]/10 px-2 py-0.5 rounded border border-[#27a644]/30">
                    <CheckCircle2 className="w-3 h-3" />
                    OPEN ({report.port_25_status.latency_ms}ms)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#ff2047] bg-[#ff2047]/10 px-2 py-0.5 rounded border border-[#ff2047]/30">
                    <XCircle className="w-3 h-3" />
                    BLOCKED / FIREWALLED
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Direct connections to major public mail exchangers:
              </p>

              <div className="space-y-2">
                {report?.port_25_status.targets.map((tgt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#181922] border border-[#23252e] text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-200">{tgt.provider}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{tgt.target}</div>
                      {tgt.banner && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[280px]">
                          {tgt.banner}
                        </div>
                      )}
                    </div>
                    <div>
                      {tgt.connected ? (
                        <span className="text-[10px] font-mono font-semibold text-[#27a644] bg-[#27a644]/10 px-1.5 py-0.5 rounded border border-[#27a644]/30">
                          {tgt.latency_ms}ms OK
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-semibold text-[#ff2047] bg-[#ff2047]/10 px-1.5 py-0.5 rounded border border-[#ff2047]/30" title={tgt.error}>
                          TIMED OUT
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Reverse DNS (PTR) & Public IP */}
            <div className="p-4 rounded-xl bg-[#12131a] border border-[#1f2028] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Globe className="w-4 h-4 text-[#3b9eff]" />
                  <span>Reverse DNS & Egress IP</span>
                </div>
                {report?.reverse_dns.is_configured && report.reverse_dns.forward_confirmed ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#27a644] bg-[#27a644]/10 px-2 py-0.5 rounded border border-[#27a644]/30">
                    <CheckCircle2 className="w-3 h-3" />
                    FCrDNS VALID
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#ff9800] bg-[#ff9800]/10 px-2 py-0.5 rounded border border-[#ff9800]/30">
                    <AlertTriangle className="w-3 h-3" />
                    PTR ATTENTION
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#181922] border border-[#23252e]">
                  <span className="text-slate-400">Detected Egress IP</span>
                  <span className="font-mono text-white font-medium">
                    {report?.public_ip || "Detecting..."} {report?.is_public_ip ? "(Public)" : "(Private/NAT)"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[#181922] border border-[#23252e]">
                  <span className="text-slate-400">PTR Hostname</span>
                  <span className="font-mono text-white font-medium truncate max-w-[200px]">
                    {report?.reverse_dns.ptr_hostname || "None (Unconfigured)"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[#181922] border border-[#23252e]">
                  <span className="text-slate-400">Forward Confirmation</span>
                  <span className={`font-semibold ${report?.reverse_dns.forward_confirmed ? "text-[#27a644]" : "text-[#ff9800]"}`}>
                    {report?.reverse_dns.forward_confirmed ? "Confirmed (A == PTR)" : "Unmatched / Missing"}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. KumoMTA Core Listener */}
            <div className="p-4 rounded-xl bg-[#12131a] border border-[#1f2028] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Server className="w-4 h-4 text-[#a855f7]" />
                  <span>KumoMTA Engine Listener</span>
                </div>
                {report?.kumomta_status.is_healthy ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#27a644] bg-[#27a644]/10 px-2 py-0.5 rounded border border-[#27a644]/30">
                    <CheckCircle2 className="w-3 h-3" />
                    ONLINE (Port 2525)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#ff2047] bg-[#ff2047]/10 px-2 py-0.5 rounded border border-[#ff2047]/30">
                    <XCircle className="w-3 h-3" />
                    OFFLINE
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="text-slate-400">Internal ESMTP Endpoint:</div>
                <div className="font-mono text-slate-300 bg-[#181922] p-2 rounded-lg border border-[#23252e]">
                  {report?.kumomta_status.endpoint} • Response: {report?.kumomta_status.latency_ms}ms
                </div>
                {report?.kumomta_status.banner && (
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    Banner: {report.kumomta_status.banner}
                  </div>
                )}
              </div>
            </div>

            {/* 4. DNSBL Blacklist Monitor */}
            <div className="p-4 rounded-xl bg-[#12131a] border border-[#1f2028] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4 text-[#27a644]" />
                  <span>Reputation & Blacklists</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {report?.blacklist_status.filter((b) => !b.listed).length} / {report?.blacklist_status.length || 3} Clean
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {report?.blacklist_status.map((bl, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#181922] border border-[#23252e]"
                  >
                    <span className="text-slate-300 font-medium">{bl.rbl}</span>
                    <span className={`text-[10px] font-semibold font-mono ${bl.listed ? "text-[#ff2047]" : "text-[#27a644]"}`}>
                      {bl.listed ? "LISTED" : "CLEAN"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sender Domains Health Strip */}
          <div className="p-4 rounded-xl bg-[#12131a] border border-[#1f2028] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <KeyRound className="w-4 h-4 text-[#ff69b4]" />
                <span>Configured Sender Domains ({report?.domain_health.length || 0})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {report?.domain_health.map((dom, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-[#181922] border border-[#23252e] space-y-2 text-xs">
                  <div className="font-bold text-white truncate">{dom.domain}</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${dom.spf_valid ? "bg-[#27a644]/15 text-[#27a644]" : "bg-red-500/15 text-red-400"}`}>
                      SPF {dom.spf_valid ? "✓" : "✗"}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${dom.dkim_valid ? "bg-[#27a644]/15 text-[#27a644]" : "bg-red-500/15 text-red-400"}`}>
                      DKIM {dom.dkim_valid ? "✓" : "✗"}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${dom.dmarc_valid ? "bg-[#27a644]/15 text-[#27a644]" : "bg-red-500/15 text-red-400"}`}>
                      DMARC {dom.dmarc_valid ? "✓" : "✗"}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${dom.mx_valid ? "bg-[#27a644]/15 text-[#27a644]" : "bg-red-500/15 text-red-400"}`}>
                      MX {dom.mx_valid ? "✓" : "✗"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Canary Probe Tool */}
          <div className="p-4 rounded-xl bg-[#12131a] border border-[#1f2028] space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Send className="w-4 h-4 text-[#ff69b4]" />
              <span>Live Canary Probe (Instant Echo Test)</span>
            </div>
            <p className="text-xs text-slate-400">
              Transmit an instantaneous diagnostic probe packet through the local MTA to verify queue acceptance and live outbound handshake.
            </p>

            <form onSubmit={handleSendCanary} className="flex gap-2">
              <input
                type="email"
                value={canaryRecipient}
                onChange={(e) => setCanaryRecipient(e.target.value)}
                placeholder="Enter test address (e.g. your personal Gmail or test-mail@...)"
                required
                className="flex-1 px-3 py-2 rounded-xl bg-[#181922] border border-[#2a2c3a] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff69b4]"
              />
              <button
                type="submit"
                disabled={canarySending}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff69b4] to-[#ff4081] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${canarySending ? "animate-spin" : ""}`} />
                <span>{canarySending ? "Transmitting..." : "Send Canary Probe"}</span>
              </button>
            </form>

            {canaryResult && (
              <div className="p-3 rounded-xl bg-[#181922] border border-[#27a644]/40 text-xs space-y-1">
                <div className="flex items-center gap-2 text-[#27a644] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Canary Dispatched to Queue: {canaryResult.queue}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Message ID: {canaryResult.message_id} • Response: {canaryResult.response}
                </div>
              </div>
            )}

            {canaryError && (
              <div className="p-3 rounded-xl bg-[#181922] border border-[#ff2047]/40 text-xs space-y-1">
                <div className="flex items-center gap-2 text-[#ff2047] font-semibold">
                  <XCircle className="w-4 h-4" />
                  <span>Canary Transmission Error</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">{canaryError}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#1f2028] bg-[#12131a] text-xs text-slate-400">
          <div>
            Overall Deliverability Diagnostic:{" "}
            <span className={`font-bold font-mono ${st.text}`}>
              {report?.overall_status?.toUpperCase() || "UNKNOWN"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#181922] hover:bg-[#20222f] border border-[#2a2c3a] text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Close Doctor
          </button>
        </div>
      </div>
    </div>
  );
};
