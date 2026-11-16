"use client";

import React, { useState, useRef, useEffect } from "react";
import { fetchSystemStatus, fetchQueues, fetchNodes, fetchAnalytics } from "../../lib/api";

interface LogEntry {
  command?: string;
  output: string | React.ReactNode;
}

export const TerminalApp: React.FC = () => {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<LogEntry[]>([
    {
      output: (
        <div className="text-[#8a8f98] mb-2 leading-relaxed">
          ZMAIL Live Diagnostic Console & Operations CLI
          <br />
          Connected to local Go backend and host spool environment.
          <br />
          Type <span className="text-[#f7f8f8] font-bold">help</span> to view live diagnostic commands.
        </div>
      ),
    },
  ]);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;

    setInput("");
    const lower = cmd.toLowerCase();

    if (lower === "clear") {
      setHistory([]);
      return;
    }

    setHistory((prev) => [...prev, { command: cmd, output: "Executing..." }]);

    try {
      if (lower === "help") {
        setHistory((prev) => [
          ...prev.slice(0, -1),
          {
            command: cmd,
            output: (
              <div className="space-y-1 text-[#d0d6e0]">
                <div className="font-semibold text-[#f7f8f8]">ZMAIL Diagnostic Commands:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[#5e6ad2] font-mono">status</span>: Query live server and cluster health
                  </div>
                  <div>
                    <span className="text-[#5e6ad2] font-mono">queues</span>: Inspect active outgoing destination queues
                  </div>
                  <div>
                    <span className="text-[#5e6ad2] font-mono">servers</span>: List observed host nodes and telemetry
                  </div>
                  <div>
                    <span className="text-[#5e6ad2] font-mono">bounces</span>: Display delivery outcomes and failure logs
                  </div>
                  <div>
                    <span className="text-[#5e6ad2] font-mono">clear</span>: Clear terminal window
                  </div>
                </div>
              </div>
            ),
          },
        ]);
      } else if (lower === "status") {
        const status = await fetchSystemStatus();
        setHistory((prev) => [
          ...prev.slice(0, -1),
          {
            command: cmd,
            output: (
              <pre className="text-[#27a644] font-mono text-[11px]">
{`ZMAIL CLUSTER TELEMETRY:
- Status: ${status.status.toUpperCase()}
- Active Host Nodes: ${status.nodes_online} of ${status.nodes_total} Online
- Queue Spool Depth: ${status.queue_depth_total} messages
- Real Throughput: ${status.throughput_msg_sec} emails/sec
- Deliverability Score: ${status.acceptance_rate}%
- Server Sync: ${status.server_sync ? "ESTABLISHED" : "DESYNC"}
- Platform Engine: ZMAIL ${status.version}`}
              </pre>
            ),
          },
        ]);
      } else if (lower === "queues") {
        const queues = await fetchQueues();
        if (!queues || queues.length === 0) {
          setHistory((prev) => [
            ...prev.slice(0, -1),
            {
              command: cmd,
              output: (
                <div className="text-[#8a8f98] font-mono text-[11px]">
                  Outgoing queues are empty (0 messages waiting to send). Spool clean.
                </div>
              ),
            },
          ]);
        } else {
          setHistory((prev) => [
            ...prev.slice(0, -1),
            {
              command: cmd,
              output: (
                <pre className="text-[#d0d6e0] font-mono text-[11px]">
{`DESTINATION DOMAIN     WAITING     DELAYED     BOUNCED
` + queues.map((q: any) => `${q.destination.padEnd(23)} ${String(q.waiting).padEnd(11)} ${String(q.delayed).padEnd(11)} ${q.bounced}`).join("\n")}
                </pre>
              ),
            },
          ]);
        }
      } else if (lower === "servers") {
        const nodes = await fetchNodes();
        setHistory((prev) => [
          ...prev.slice(0, -1),
          {
            command: cmd,
            output: (
              <pre className="text-[#d0d6e0] font-mono text-[11px]">
{`OBSERVED HOST NODES:
` + nodes.map((n: any) => `- ${n.hostname} (${n.ip}) [${n.status.toUpperCase()}] CPU: ${n.cpu_percent.toFixed(1)}% | RAM: ${n.memory_used_gb}/${n.memory_total_gb}GB | Spool: ${n.spool_used_gb}/${n.spool_cap_gb}GB`).join("\n")}
              </pre>
            ),
          },
        ]);
      } else if (lower === "bounces") {
        const analytics = await fetchAnalytics();
        setHistory((prev) => [
          ...prev.slice(0, -1),
          {
            command: cmd,
            output: (
              <pre className="text-[#d0d6e0] font-mono text-[11px]">
{`DELIVERY OUTCOMES & BOUNCE SUMMARY:
- Total Sent: ${analytics.total_sent_today}
- Bounce Rate: ${analytics.bounce_rate}%
- Delivered: ${analytics.outcomes.delivered}
- Waiting in Spool: ${analytics.outcomes.waiting_to_send}
- Delayed: ${analytics.outcomes.delayed}
- Rejected/Invalid Address: ${analytics.outcomes.address_not_found}`}
              </pre>
            ),
          },
        ]);
      } else {
        setHistory((prev) => [
          ...prev.slice(0, -1),
          {
            command: cmd,
            output: (
              <div className="text-[#ff2047] font-mono text-[11px]">
                Command not recognized: "{cmd}". Type <span className="text-[#f7f8f8] underline">help</span> for available commands.
              </div>
            ),
          },
        ]);
      }
    } catch (err: any) {
      setHistory((prev) => [
        ...prev.slice(0, -1),
        {
          command: cmd,
          output: (
            <div className="text-[#ff2047] font-mono text-[11px]">
              Error executing diagnostic: {err.message || "Failed to reach server backend"}
            </div>
          ),
        },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#070709] font-mono text-xs p-3 overflow-hidden select-text">
      {/* Scrollable Output */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {history.map((entry, idx) => (
          <div key={idx} className="space-y-1">
            {entry.command && (
              <div className="flex items-center gap-2 text-[#8a8f98]">
                <span className="text-[#ff69b4]">zmail@host:~$</span>
                <span className="text-[#f7f8f8]">{entry.command}</span>
              </div>
            )}
            <div className="text-[#d0d6e0]">{entry.output}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Prompt */}
      <form onSubmit={handleCommand} className="mt-2 pt-2 border-t border-[#1e2023] flex items-center gap-2">
        <span className="text-[#ff69b4] font-semibold">zmail@host:~$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type 'help', 'status', 'queues', 'servers', 'bounces'..."
          className="flex-1 bg-transparent text-[#f7f8f8] focus:outline-none caret-[#ff69b4]"
          autoFocus
        />
      </form>
    </div>
  );
};
