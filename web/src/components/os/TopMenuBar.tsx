"use client";

import React, { useState, useEffect } from "react";
import { useWindowManager } from "../../context/WindowManagerContext";
import { APPS } from "../../data/mockData";
import {
  Bell,
  Search,
  Activity,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Info,
} from "lucide-react";

export const TopMenuBar: React.FC = () => {
  const {
    activeWindowId,
    clusterStatus,
    notifications,
    toggleNotificationCenter,
    toggleCommandPalette,
    openApp,
  } = useWindowManager();

  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  const [isAppleMenuOpen, setIsAppleMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
      );
      setDateStr(
        now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeApp = APPS.find((a) => a.id === activeWindowId) || {
    id: "system",
    shortTitle: "ZMAIL",
    title: "ZMAIL Email Platform",
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="h-9 w-full bg-[#0a0a0c]/90 backdrop-blur-md border-b border-[#23252a] px-3 flex items-center justify-between text-xs text-[#d0d6e0] z-[20000] select-none">
      {/* Left Menu Items */}
      <div className="flex items-center gap-4">
        {/* System Menu */}
        <div className="relative">
          <button
            onClick={() => setIsAppleMenuOpen(!isAppleMenuOpen)}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#18191a] text-[#f7f8f8] font-bold tracking-wider transition-colors"
          >
            <div className="w-2.5 h-2.5 rounded-sm bg-[#ff69b4] flex items-center justify-center">
              <span className="text-[7px] text-[#010102] font-black leading-none">Z</span>
            </div>
            <span>ZMAIL</span>
          </button>

          {isAppleMenuOpen && (
            <div
              onMouseLeave={() => setIsAppleMenuOpen(false)}
              className="absolute top-8 left-0 w-60 bg-[#141516] border border-[#23252a] rounded-lg shadow-2xl py-1 text-xs text-[#d0d6e0] z-50"
            >
              <div className="px-3 py-1.5 font-semibold text-[#f7f8f8] border-b border-[#23252a] flex items-center justify-between">
                <span>ZMAIL Enterprise</span>
                <span className="text-[10px] text-[#27a644] bg-[#27a644]/10 px-1.5 py-0.5 rounded font-mono">
                  Online
                </span>
              </div>
              <button
                onClick={() => {
                  setIsAppleMenuOpen(false);
                  openApp("settings");
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f2022] hover:text-[#f7f8f8] flex items-center gap-2"
              >
                <Info className="w-3.5 h-3.5 text-[#8a8f98]" />
                <span>About ZMAIL</span>
              </button>
              <button
                onClick={() => {
                  setIsAppleMenuOpen(false);
                  openApp("terminal");
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f2022] hover:text-[#f7f8f8] flex items-center gap-2"
              >
                <Terminal className="w-3.5 h-3.5 text-[#8a8f98]" />
                <span>System Diagnostics & Console</span>
              </button>
              <div className="my-1 border-t border-[#23252a]" />
              <button
                onClick={() => {
                  setIsAppleMenuOpen(false);
                  openApp("infrastructure");
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f2022] hover:text-[#f7f8f8] flex items-center gap-2"
              >
                <Activity className="w-3.5 h-3.5 text-[#8a8f98]" />
                <span>Check Server Health</span>
              </button>
              <div className="my-1 border-t border-[#23252a]" />
              <div className="px-3 py-1 text-[10px] text-[#62666d]">
                Security Status: All connections secure
              </div>
            </div>
          )}
        </div>

        {/* Current Active App Name */}
        <span className="font-semibold text-[#f7f8f8]">{activeApp.shortTitle}</span>

        {/* Standard App Submenus */}
        <div className="hidden md:flex items-center gap-1 text-[#8a8f98]">
          <button className="px-2 py-0.5 rounded hover:bg-[#18191a] hover:text-[#f7f8f8]">File</button>
          <button className="px-2 py-0.5 rounded hover:bg-[#18191a] hover:text-[#f7f8f8]">Edit</button>
          <button className="px-2 py-0.5 rounded hover:bg-[#18191a] hover:text-[#f7f8f8]">View</button>

          {/* Sending Menu Dropdown */}
          <div className="relative group">
            <button className="px-2 py-0.5 rounded hover:bg-[#18191a] hover:text-[#f7f8f8] flex items-center gap-1 cursor-pointer">
              <span>Sending</span>
            </button>
            <div className="absolute top-7 left-0 w-52 bg-[#141516] border border-[#23252a] rounded-lg shadow-2xl py-1 text-xs text-[#d0d6e0] hidden group-hover:block z-50">
              <button
                onClick={() => openApp("campaigns")}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f2022] hover:text-[#ff69b4] flex items-center justify-between cursor-pointer"
              >
                <span>Campaign Operations</span>
                <span className="text-[10px] text-[#8a8f98] font-mono">⌘1</span>
              </button>
              <button
                onClick={() => openApp("workflows")}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f2022] hover:text-[#ff69b4] flex items-center justify-between cursor-pointer"
              >
                <span>Workflow Sequences</span>
                <span className="text-[10px] text-[#8a8f98] font-mono">⌘2</span>
              </button>
              <button
                onClick={() => openApp("analytics")}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f2022] hover:text-[#ff69b4] flex items-center justify-between cursor-pointer"
              >
                <span>Reports & Line/Pie Graphs</span>
                <span className="text-[10px] text-[#8a8f98] font-mono">⌘3</span>
              </button>
              <button
                onClick={() => openApp("contacts")}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f2022] hover:text-[#ff69b4] flex items-center justify-between cursor-pointer"
              >
                <span>Audience Contacts</span>
                <span className="text-[10px] text-[#8a8f98] font-mono">⌘4</span>
              </button>
              <div className="my-1 border-t border-[#23252a]" />
              <button
                onClick={() => openApp("kumomta")}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f2022] hover:text-[#f7f8f8] flex items-center justify-between cursor-pointer"
              >
                <span>MTA Status & Queues</span>
              </button>
              <button
                onClick={() => openApp("smtp_connect")}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f2022] hover:text-[#f7f8f8] flex items-center justify-between cursor-pointer"
              >
                <span>SMTP Relay & Senders</span>
              </button>
            </div>
          </div>

          <button className="px-2 py-0.5 rounded hover:bg-[#18191a] hover:text-[#f7f8f8]">Window</button>
        </div>
      </div>

      {/* Right System Tray */}
      <div className="flex items-center gap-3">
        {/* Quick Search Trigger */}
        <button
          onClick={toggleCommandPalette}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#141516] hover:bg-[#1a1b1d] border border-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
        >
          <Search className="w-3 h-3" />
          <span className="text-[11px]">Quick Search</span>
          <kbd className="text-[9px] px-1 bg-[#1e2023] rounded border border-[#2b2d33] text-[#d0d6e0] font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Live Cluster Metrics */}
        <div className="hidden lg:flex items-center gap-3 px-2 py-0.5 rounded bg-[#0f1011] border border-[#23252a] text-[11px]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-[#27a644]" />
            <span>{clusterStatus.nodesOnline}/{clusterStatus.nodesTotal} Servers Online</span>
          </div>
          <span className="text-[#34343a]">|</span>
          <div className="flex items-center gap-1 text-[#3b9eff] font-mono">
            <span>
              {clusterStatus.throughputMsgSec > 0
                ? `${clusterStatus.throughputMsgSec.toLocaleString()} emails/sec`
                : "Idle"}
            </span>
          </div>
        </div>

        {/* System Health Pulse Indicator */}
        <div
          title="System Status: All email servers online and synchronized"
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ff69b4]/10 border border-[#ff69b4]/30 text-[10px] text-[#ff69b4] cursor-help"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff69b4] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff69b4]"></span>
          </span>
          <span className="hidden sm:inline font-medium">All Systems Normal</span>
        </div>

        {/* Notifications */}
        <button
          onClick={toggleNotificationCenter}
          className="relative p-1 rounded hover:bg-[#18191a] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
          title="Notifications"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#ff69b4]" />
          )}
        </button>

        {/* Date and Clock */}
        <div className="flex items-center gap-2 pl-1 font-medium text-[11px] text-[#f7f8f8]">
          <span className="hidden md:inline text-[#8a8f98]">{dateStr}</span>
          <span>{timeStr}</span>
        </div>
      </div>
    </div>
  );
};
