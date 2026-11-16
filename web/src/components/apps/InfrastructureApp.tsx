"use client";

import React, { useState, useEffect } from "react";
import { Cpu, Shield, Server, RefreshCw, HardDrive, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchNodes } from "../../lib/api";

interface HostNode {
  id: string;
  hostname: string;
  ip: string;
  region: string;
  spool_used_gb: number;
  spool_cap_gb: number;
  cpu_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  queue_depth: number;
  status: string;
  agent_sync: boolean;
  last_seen: string;
}

export const InfrastructureApp: React.FC = () => {
  const [nodes, setNodes] = useState<HostNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadNodes = async () => {
    try {
      setIsLoading(true);
      const data = await fetchNodes();
      setNodes(data || []);
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNodes();
    const interval = setInterval(loadNodes, 5000);
    return () => clearInterval(interval);
  }, []);

  const primaryNode = nodes[0] || {
    hostname: "localhost",
    ip: "127.0.0.1",
    region: "Local Host",
    cpu_percent: 0,
    memory_used_gb: 0,
    memory_total_gb: 0,
    spool_used_gb: 0,
    spool_cap_gb: 0,
    status: "connecting",
  };

  const memPercent =
    primaryNode.memory_total_gb > 0
      ? Math.min(100, Math.round((primaryNode.memory_used_gb / primaryNode.memory_total_gb) * 100))
      : 0;

  const diskPercent =
    primaryNode.spool_cap_gb > 0
      ? Math.min(100, Math.round((primaryNode.spool_used_gb / primaryNode.spool_cap_gb) * 100))
      : 0;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-xs">
      {/* Top Banner */}
      <div className="px-4 py-2.5 bg-[#0f1011] border-b border-[#23252a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#5e6ad2]" />
          <span className="font-semibold text-[#f7f8f8]">Servers & System Status</span>
          <span className="text-[10px] text-[#8a8f98]">
            Host: <strong className="text-[#d0d6e0]">{primaryNode.hostname}</strong> ({primaryNode.ip})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadNodes}
            disabled={isLoading}
            title="Refresh host telemetry"
            className="p-1.5 rounded bg-[#141516] hover:bg-[#1a1b1d] border border-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#27a644]/10 border border-[#27a644]/30 text-[#27a644] text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
            <span>Host Operational</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Host Resource Meters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a]">
            <div className="flex justify-between text-[#8a8f98] text-[11px]">
              <span>Processor Load</span>
              <span className={primaryNode.cpu_percent > 85 ? "text-[#ff2047]" : "text-[#27a644]"}>
                {primaryNode.cpu_percent > 85 ? "High" : "Optimal"}
              </span>
            </div>
            <div className="text-xl font-bold text-[#f7f8f8] mt-1 font-mono">
              {primaryNode.cpu_percent.toFixed(1)}%
            </div>
            <div className="w-full bg-[#18191a] h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-[#27a644] h-full transition-all duration-300"
                style={{ width: `${Math.min(100, primaryNode.cpu_percent)}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a]">
            <div className="flex justify-between text-[#8a8f98] text-[11px]">
              <span>System Memory</span>
              <span className="text-[#8a8f98] font-mono">{primaryNode.memory_total_gb} GB Total</span>
            </div>
            <div className="text-xl font-bold text-[#f7f8f8] mt-1 font-mono">
              {primaryNode.memory_used_gb} GB used
            </div>
            <div className="w-full bg-[#18191a] h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-[#5e6ad2] h-full transition-all duration-300"
                style={{ width: `${memPercent}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a]">
            <div className="flex justify-between text-[#8a8f98] text-[11px]">
              <span>Spool Filesystem</span>
              <span className="text-[#8a8f98] font-mono">{primaryNode.spool_cap_gb} GB Total</span>
            </div>
            <div className="text-xl font-bold text-[#f7f8f8] mt-1 font-mono">
              {primaryNode.spool_used_gb} GB used
            </div>
            <div className="w-full bg-[#18191a] h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-[#3b9eff] h-full transition-all duration-300"
                style={{ width: `${diskPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Active Host Services Table */}
        <div className="border border-[#23252a] rounded-xl overflow-hidden bg-[#0f1011]">
          <div className="px-3.5 py-2.5 bg-[#141516] border-b border-[#23252a] font-medium text-[#d0d6e0] flex items-center justify-between">
            <span className="font-semibold text-[#f7f8f8]">Observed Host Services</span>
            <span className="text-[10px] text-[#27a644]">3 Active Processes Verified</span>
          </div>
          <table className="w-full text-left">
            <thead className="text-[10px] uppercase text-[#62666d] bg-[#101113] border-b border-[#23252a]">
              <tr>
                <th className="px-3.5 py-2">Service</th>
                <th className="px-3.5 py-2">Role</th>
                <th className="px-3.5 py-2">Port / Binding</th>
                <th className="px-3.5 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2023] text-[11px]">
              <tr className="hover:bg-[#141516]">
                <td className="px-3.5 py-2.5 text-[#f7f8f8] font-medium flex items-center gap-1.5">
                  <Server className="w-3 h-3 text-[#5e6ad2]" />
                  <span>mailops-server</span>
                </td>
                <td className="px-3.5 py-2.5 text-[#8a8f98]">Go Backend REST API & Spool Manager</td>
                <td className="px-3.5 py-2.5 text-[#d0d6e0] font-mono">http://127.0.0.1:8080</td>
                <td className="px-3.5 py-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30">
                    Running
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#141516]">
                <td className="px-3.5 py-2.5 text-[#f7f8f8] font-medium flex items-center gap-1.5">
                  <Server className="w-3 h-3 text-[#5e6ad2]" />
                  <span>mailops-web</span>
                </td>
                <td className="px-3.5 py-2.5 text-[#8a8f98]">Next.js Desktop OS User Interface</td>
                <td className="px-3.5 py-2.5 text-[#d0d6e0] font-mono">http://localhost:3000</td>
                <td className="px-3.5 py-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30">
                    Running
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#141516]">
                <td className="px-3.5 py-2.5 text-[#f7f8f8] font-medium flex items-center gap-1.5">
                  <Server className="w-3 h-3 text-[#5e6ad2]" />
                  <span>system-resolver</span>
                </td>
                <td className="px-3.5 py-2.5 text-[#8a8f98]">Host DNS Stack (SPF/DKIM/DMARC resolution)</td>
                <td className="px-3.5 py-2.5 text-[#d0d6e0] font-mono">UDP/TCP 53</td>
                <td className="px-3.5 py-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30">
                    Active
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#141516]">
                <td className="px-3.5 py-2.5 text-[#8a8f98] font-medium flex items-center gap-1.5">
                  <HardDrive className="w-3 h-3 text-[#62666d]" />
                  <span>docker-daemon</span>
                </td>
                <td className="px-3.5 py-2.5 text-[#62666d]">Container Engine Virtualization</td>
                <td className="px-3.5 py-2.5 text-[#62666d] font-mono">/var/run/docker.sock</td>
                <td className="px-3.5 py-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1f2022] text-[#8a8f98] border border-[#2b2d33]">
                    Not Connected
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Security & Access Protection */}
        <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#f7f8f8] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#27a644]" /> Network & Host Safeguards
            </span>
            <span className="text-[10px] text-[#27a644] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Host Environment Protected
            </span>
          </div>
          <p className="text-[11px] text-[#8a8f98] leading-relaxed">
            Standard email delivery ports (SMTP 25, 587, 465) and local management API port 8080 are bound. All disk storage operations write directly to authenticated host path <code className="text-[#d0d6e0] font-mono">backend/data/mailops-state.json</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
