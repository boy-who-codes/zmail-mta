"use client";

import React, { useState, useEffect } from "react";
import { useWindowManager } from "../../context/WindowManagerContext";
import { APPS, APP_CATEGORIES } from "../../data/mockData";
import {
  Bell,
  Search,
  Activity,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Info,
  BookOpen,
  Send,
  GitCommit,
  Mail,
  Zap,
  Globe,
  Mailbox,
  Layers,
  ShieldAlert,
  BarChart3,
  Server,
  KeyRound,
  FileCode2,
  Plus,
  Play,
  RotateCw,
  Sliders,
  ExternalLink,
  Shield,
  Building2,
  Lock,
  LogOut,
  User,
  Radio,
  LayoutGrid,
} from "lucide-react";
import { fetchOutboundPreflight, OutboundPreflightReport } from "../../lib/api";
import { OutboundDoctorModal } from "../modals/OutboundDoctorModal";

export const TopMenuBar: React.FC = () => {
  const {
    activeWindowId,
    clusterStatus,
    notifications,
    toggleNotificationCenter,
    toggleCommandPalette,
    openApp,
    currentUser,
    lockScreen,
    logout,
  } = useWindowManager();

  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [outboundPreflight, setOutboundPreflight] = useState<OutboundPreflightReport | null>(null);
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);

  useEffect(() => {
    const checkOutbound = async () => {
      try {
        const report = await fetchOutboundPreflight();
        setOutboundPreflight(report);
      } catch (err) {
        console.error("Outbound preflight check error:", err);
      }
    };
    checkOutbound();
    const probeInterval = setInterval(checkOutbound, 45000);
    return () => clearInterval(probeInterval);
  }, []);

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

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".zmail-menu-item")) {
        setOpenMenu(null);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const activeApp = APPS.find((a) => a.id === activeWindowId) || {
    id: "system",
    shortTitle: "ZMAIL",
    title: "ZMAIL Email Platform",
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMenuClick = (menuId: string) => {
    setOpenMenu((prev) => (prev === menuId ? null : menuId));
  };

  const handleMenuHover = (menuId: string) => {
    if (openMenu !== null) {
      setOpenMenu(menuId);
    }
  };

  return (
    <div className="h-9 w-full bg-[#0a0a0c]/95 backdrop-blur-md border-b border-[#23252a] px-3 flex items-center justify-between text-xs text-[#d0d6e0] z-[20000] select-none">
      {/* Left Menu Items */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {/* System Menu (ZMAIL Logo) */}
        <div className="relative zmail-menu-item">
          <button
            onClick={() => handleMenuClick("zmail")}
            onMouseEnter={() => handleMenuHover("zmail")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer ${
              openMenu === "zmail"
                ? "bg-[#ff69b4] text-[#0a0a0c] font-black"
                : "hover:bg-[#18191a] text-[#f7f8f8] font-bold"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-sm flex items-center justify-center ${
                openMenu === "zmail" ? "bg-[#0a0a0c]" : "bg-[#ff69b4]"
              }`}
            >
              <span
                className={`text-[8px] font-black leading-none ${
                  openMenu === "zmail" ? "text-[#ff69b4]" : "text-[#010102]"
                }`}
              >
                Z
              </span>
            </div>
            <span>ZMAIL</span>
          </button>

          {openMenu === "zmail" && (
            <div className="absolute top-full pt-1 left-0 z-50">
              <div className="w-64 bg-[#14151a] border border-[#262c3b] rounded-xl shadow-2xl py-1 text-xs text-[#d0d6e0] animate-in fade-in-50 duration-100">
                <div className="px-3.5 py-2 font-semibold text-[#f7f8f8] border-b border-[#202535] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs">ZMAIL Platform</span>
                    <span className="block text-[10px] text-[#8a8f98] font-normal">v2.4.0 Commercial Engine</span>
                  </div>
                  <span className="text-[10px] text-[#27a644] bg-[#27a644]/15 border border-[#27a644]/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                    ONLINE
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("docs");
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#1e2333] hover:text-[#ff69b4] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[#ff69b4]" />
                    <div>
                      <span className="font-semibold block text-white">Platform User Guide & Docs</span>
                      <span className="text-[10px] text-[#8a8f98]">Architecture, how-to, and visual guides</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("terminal");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2.5 cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5 text-[#8a8f98]" />
                    <span>System Diagnostics & Console</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("infrastructure");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2.5 cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 text-[#8a8f98]" />
                    <span>Server Health & Topology</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("kumomta");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2.5 cursor-pointer"
                  >
                    <Server className="w-3.5 h-3.5 text-[#8a8f98]" />
                    <span>KumoMTA Engine & Lua Shaping</span>
                  </button>
                </div>

                <div className="my-1 border-t border-[#202535]" />

                <div className="py-1">
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("settings");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2.5 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#8a8f98]" />
                    <span>System Settings & Access</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      lockScreen();
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-white flex items-center gap-2.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#ff69b4]" />
                    <span>Lock Desktop Session</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      logout();
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-red-500/10 text-red-400 hover:text-red-300 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                    <span>Log Out</span>
                  </button>
                </div>

                <div className="px-3.5 py-1.5 bg-[#0e1014] border-t border-[#202535] text-[10px] text-[#62666d] flex items-center justify-between">
                  <span>RAM: ~52MB Footprint</span>
                  <span className="text-[#27a644]">TLS 1.3 Active</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Current Active App Focus Label */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#13151b] border border-[#202535]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff69b4]" />
          <span className="font-bold text-white text-[11px]">{activeApp.shortTitle}</span>
        </div>

        {/* Desktop Menu Ribbon */}
        <div className="flex items-center gap-0.5 text-[#8a8f98]">
          {/* APPS BY CATEGORY MENU */}
          <div className="relative zmail-menu-item">
            <button
              onClick={() => handleMenuClick("categories")}
              onMouseEnter={() => handleMenuHover("categories")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer font-medium ${
                openMenu === "categories" ? "bg-[#ff69b4]/20 text-[#ff69b4] font-bold" : "hover:bg-[#18191a] hover:text-[#f7f8f8]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#ff69b4]" />
              <span>Apps</span>
            </button>
            {openMenu === "categories" && (
              <div className="absolute top-full pt-1 left-0 z-50">
                <div className="w-80 max-h-[85vh] overflow-y-auto bg-[#12141c] border border-[#262c3b] rounded-2xl shadow-2xl p-2.5 text-xs text-[#d0d6e0] space-y-3">
                  <div className="px-2 py-1 text-[11px] font-bold text-white border-b border-white/5 flex items-center justify-between">
                    <span>Categorized Applications</span>
                    <span className="text-[10px] text-[#ff69b4] font-mono font-bold">{APPS.length} Apps</span>
                  </div>

                  {APP_CATEGORIES.map((cat) => {
                    const catApps = APPS.filter((a) => a.category === cat.name);
                    return (
                      <div key={cat.id} className="space-y-1">
                        {/* CATEGORY LABEL ON TOP */}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span style={{ color: cat.color }}>{cat.name}</span>
                          <span className="text-slate-500 font-mono text-[9px]">({catApps.length})</span>
                        </div>
                        <div className="grid grid-cols-1 gap-0.5">
                          {catApps.map((app) => (
                            <button
                              key={app.id}
                              onClick={() => {
                                setOpenMenu(null);
                                openApp(app.id);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 hover:text-white flex items-center justify-between group transition-colors cursor-pointer"
                            >
                              <span className="font-medium text-slate-200 group-hover:text-white truncate">
                                {app.title}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 group-hover:text-[#ff69b4]">
                                {app.shortTitle}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* FILE MENU */}
          <div className="relative zmail-menu-item">
            <button
              onClick={() => handleMenuClick("file")}
              onMouseEnter={() => handleMenuHover("file")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                openMenu === "file" ? "bg-[#1f2433] text-[#f7f8f8]" : "hover:bg-[#18191a] hover:text-[#f7f8f8]"
              }`}
            >
              File
            </button>
            {openMenu === "file" && (
              <div className="absolute top-full pt-1 left-0 z-50">
                <div className="w-56 bg-[#14151a] border border-[#262c3b] rounded-xl shadow-2xl py-1 text-xs text-[#d0d6e0]">
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("campaigns");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#ff69b4] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Send className="w-3.5 h-3.5 text-[#ff69b4]" />
                      <span>New Broadcast</span>
                    </span>
                    <span className="text-[10px] text-[#62666d] font-mono">⌘N</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("campaigns");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#ff69b4] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <GitCommit className="w-3.5 h-3.5 text-[#ff69b4]" />
                      <span>New Drip Cadence</span>
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("webmail");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#ff69b4] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#3b9eff]" />
                      <span>Compose Direct Email</span>
                    </span>
                  </button>

                  <div className="my-1 border-t border-[#202535]" />

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("contacts");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#27a644]" />
                    <span>Import Contacts (CSV)</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("contacts");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#27a644]" />
                    <span>Verify Lead List (MX Check)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* EDIT MENU */}
          <div className="relative zmail-menu-item">
            <button
              onClick={() => handleMenuClick("edit")}
              onMouseEnter={() => handleMenuHover("edit")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                openMenu === "edit" ? "bg-[#1f2433] text-[#f7f8f8]" : "hover:bg-[#18191a] hover:text-[#f7f8f8]"
              }`}
            >
              Edit
            </button>
            {openMenu === "edit" && (
              <div className="absolute top-full pt-1 left-0 z-50">
                <div className="w-56 bg-[#14151a] border border-[#262c3b] rounded-xl shadow-2xl py-1 text-xs text-[#d0d6e0]">
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      toggleCommandPalette();
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#ff69b4] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-[#8a8f98]" />
                      <span>Quick Search Palette</span>
                    </span>
                    <span className="text-[10px] text-[#62666d] font-mono">⌘K</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("templates");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2 cursor-pointer"
                  >
                    <FileCode2 className="w-3.5 h-3.5 text-[#8a8f98]" />
                    <span>Email Templates Library</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("mailboxes");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2 cursor-pointer"
                  >
                    <Mailbox className="w-3.5 h-3.5 text-[#8a8f98]" />
                    <span>Mailbox Rotation Settings</span>
                  </button>

                  <div className="my-1 border-t border-[#202535]" />

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("suppressions");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#ef4444] flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-[#ef4444]" />
                    <span>Suppression Shield & Bounces</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* VIEW MENU */}
          <div className="relative zmail-menu-item">
            <button
              onClick={() => handleMenuClick("view")}
              onMouseEnter={() => handleMenuHover("view")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                openMenu === "view" ? "bg-[#1f2433] text-[#f7f8f8]" : "hover:bg-[#18191a] hover:text-[#f7f8f8]"
              }`}
            >
              View
            </button>
            {openMenu === "view" && (
              <div className="absolute top-full pt-1 left-0 z-50">
                <div className="w-60 bg-[#14151a] border border-[#262c3b] rounded-xl shadow-2xl py-1 text-xs text-[#d0d6e0]">
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("analytics");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#3b9eff] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-[#3b9eff]" />
                      <span>Delivery Reports & Analytics</span>
                    </span>
                    <span className="text-[10px] text-[#62666d] font-mono">⌘3</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("webmail");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#ff69b4] flex items-center gap-2 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#ff69b4]" />
                    <span>Unified Webmail Client</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("contacts");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#8a8f98]" />
                    <span>Audience Contacts Directory</span>
                  </button>

                  <div className="my-1 border-t border-[#202535]" />

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("dns");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#27a644] flex items-center gap-2 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#27a644]" />
                    <span>DNS & Cloudflare 1-Click Sync</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("ippools");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#8a8f98]" />
                    <span>IP Pools & Egress Shaping</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SENDING MENU */}
          <div className="relative zmail-menu-item">
            <button
              onClick={() => handleMenuClick("sending")}
              onMouseEnter={() => handleMenuHover("sending")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                openMenu === "sending"
                  ? "bg-[#1f2433] text-[#ff69b4] font-semibold"
                  : "hover:bg-[#18191a] hover:text-[#ff69b4]"
              }`}
            >
              Sending
            </button>
            {openMenu === "sending" && (
              <div className="absolute top-full pt-1 left-0 z-50">
                <div className="w-64 bg-[#14151a] border border-[#262c3b] rounded-xl shadow-2xl py-1 text-xs text-[#d0d6e0]">
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("campaigns");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#ff69b4] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Send className="w-3.5 h-3.5 text-[#ff69b4]" />
                      <span>Campaign Broadcast Studio</span>
                    </span>
                    <span className="text-[10px] text-[#62666d] font-mono">⌘1</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("campaigns");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#ff69b4] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <GitCommit className="w-3.5 h-3.5 text-[#ff69b4]" />
                      <span>Multi-Step Drip Cadence</span>
                    </span>
                    <span className="text-[9px] font-mono px-1 rounded bg-[#ff69b4]/15 text-[#ff69b4]">AUTO-STOP</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("mailboxes");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#27a644] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-[#27a644]" />
                      <span>AI Warmup Peer Network</span>
                    </span>
                    <span className="text-[9px] font-mono px-1 rounded bg-[#27a644]/15 text-[#27a644]">P2P</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("workflows");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-[#8a8f98]" />
                      <span>DAG Automation Workflows</span>
                    </span>
                    <span className="text-[10px] text-[#62666d] font-mono">⌘2</span>
                  </button>

                  <div className="my-1 border-t border-[#202535]" />

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("smtp_connect");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#8a8f98]" />
                    <span>SMTP Relays & Port 2525 Auth</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("kumomta");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2 cursor-pointer"
                  >
                    <Server className="w-3.5 h-3.5 text-[#8a8f98]" />
                    <span>MTA Spool & Outbound Queues</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* HELP MENU */}
          <div className="relative zmail-menu-item">
            <button
              onClick={() => handleMenuClick("help")}
              onMouseEnter={() => handleMenuHover("help")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                openMenu === "help" ? "bg-[#1f2433] text-[#f7f8f8]" : "hover:bg-[#18191a] hover:text-[#f7f8f8]"
              }`}
            >
              Help
            </button>
            {openMenu === "help" && (
              <div className="absolute top-full pt-1 left-0 z-50">
                <div className="w-64 bg-[#14151a] border border-[#262c3b] rounded-xl shadow-2xl py-1 text-xs text-[#d0d6e0]">
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("docs");
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#1e2333] hover:text-[#ff69b4] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[#ff69b4]" />
                    <div>
                      <span className="font-semibold block text-white">Interactive User Guide & Docs</span>
                      <span className="text-[10px] text-[#8a8f98]">Visual guide with UI diagrams</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("sandbox");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#8a8f98]" />
                    <span>SMTP Test Sandbox</span>
                  </button>

                  <div className="my-1 border-t border-[#202535]" />

                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      openApp("terminal");
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#1e2333] hover:text-[#f7f8f8] flex items-center gap-2 cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5 text-[#8a8f98]" />
                    <span>MTA Command-Line Console</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right System Tray */}
      <div className="flex items-center gap-2.5">
        {/* Dedicated "i" Docs Button (User Requested) */}
        <button
          onClick={() => openApp("docs")}
          title="Open ZMAIL Interactive Guide & Architecture Documentation"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ff69b4]/10 hover:bg-[#ff69b4]/20 border border-[#ff69b4]/40 text-[#ff69b4] font-bold text-[11px] shadow-sm transition-all cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>📘 Docs Guide</span>
        </button>

        {/* Quick Search Trigger */}
        <button
          onClick={toggleCommandPalette}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#141516] hover:bg-[#1a1b1d] border border-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors cursor-pointer"
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
            <span>{clusterStatus.nodesOnline}/{clusterStatus.nodesTotal} Online</span>
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

        {/* Live Outbound Deliverability Preflight Indicator */}
        <button
          onClick={() => setIsDoctorOpen(true)}
          title={`Outbound Deliverability Status: ${outboundPreflight?.summary || "Click to run preflight check"}`}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition-all active:scale-95 ${
            outboundPreflight?.overall_status === "ready"
              ? "bg-[#27a644]/15 hover:bg-[#27a644]/25 border border-[#27a644]/40 text-[#27a644]"
              : outboundPreflight?.overall_status === "degraded"
              ? "bg-[#ff9800]/15 hover:bg-[#ff9800]/25 border border-[#ff9800]/40 text-[#ff9800]"
              : outboundPreflight?.overall_status === "blocked"
              ? "bg-[#ff2047]/15 hover:bg-[#ff2047]/25 border border-[#ff2047]/40 text-[#ff2047] animate-pulse"
              : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400"
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                outboundPreflight?.overall_status === "ready"
                  ? "bg-[#27a644]"
                  : outboundPreflight?.overall_status === "degraded"
                  ? "bg-[#ff9800]"
                  : outboundPreflight?.overall_status === "blocked"
                  ? "bg-[#ff2047]"
                  : "bg-slate-400"
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                outboundPreflight?.overall_status === "ready"
                  ? "bg-[#27a644]"
                  : outboundPreflight?.overall_status === "degraded"
                  ? "bg-[#ff9800]"
                  : outboundPreflight?.overall_status === "blocked"
                  ? "bg-[#ff2047]"
                  : "bg-slate-400"
              }`}
            ></span>
          </span>
          <span className="hidden sm:inline">
            {outboundPreflight?.overall_status === "ready"
              ? "Outbound Ready"
              : outboundPreflight?.overall_status === "degraded"
              ? "Outbound Degraded"
              : outboundPreflight?.overall_status === "blocked"
              ? "Port 25 Firewalled"
              : "Checking Outbound..."}
          </span>
        </button>

        {/* Notifications */}
        <button
          onClick={toggleNotificationCenter}
          className="relative p-1 rounded hover:bg-[#18191a] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#ff69b4]" />
          )}
        </button>

        {/* User Account Pill */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#14151a] hover:bg-[#1f2028] border border-[#23252e] text-xs transition-all cursor-pointer"
            title="User Account & Profile"
          >
            {currentUser?.role === "master_admin" ? (
              <>
                <div className="w-2 h-2 rounded-full bg-[#ff69b4]" />
                <span className="font-medium text-[#f7f8f8]">Admin</span>
                <span className="text-[10px] text-[#ff69b4] bg-[#ff69b4]/10 px-1 rounded font-mono">Master</span>
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5 text-[#3b9eff]" />
                <span className="font-medium text-[#f7f8f8] max-w-[90px] truncate">
                  {currentUser?.name || "Tenant"}
                </span>
                <span className="text-[10px] text-[#3b9eff] bg-[#3b9eff]/10 px-1 rounded font-mono">Tenant</span>
              </>
            )}
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-[#0f1014] border border-[#23252e] shadow-2xl p-1.5 z-50 text-xs">
              <div className="px-3 py-2 border-b border-white/5 mb-1">
                <div className="font-semibold text-[#f7f8f8]">
                  {currentUser?.name || "Master Administrator"}
                </div>
                <div className="text-[11px] text-[#8a8f98] font-mono truncate">
                  {currentUser?.username || "Master Account"}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  lockScreen();
                }}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/5 text-[#d0d6e0] hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-[#ff69b4]" />
                <span>Lock Screen</span>
              </button>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#ff2047]/10 text-red-400 hover:text-red-300 flex items-center gap-2 cursor-pointer transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Dedicated 1-Click Lock and Log Out Buttons */}
        <button
          onClick={lockScreen}
          title="Lock Screen"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#14151a] hover:bg-[#1f2028] border border-[#23252e] text-[#d0d6e0] hover:text-white font-medium text-xs transition-all cursor-pointer active:scale-95"
        >
          <Lock className="w-3.5 h-3.5 text-[#ff69b4]" />
          <span className="hidden sm:inline">Lock</span>
        </button>

        <button
          onClick={logout}
          title="Log Out of MailOS"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 hover:text-red-300 font-semibold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>

        {/* Date and Clock */}
        <div className="flex items-center gap-2 pl-1 font-medium text-[11px] text-[#f7f8f8]">
          <span className="hidden md:inline text-[#8a8f98]">{dateStr}</span>
          <span>{timeStr}</span>
        </div>
      </div>

      <OutboundDoctorModal
        isOpen={isDoctorOpen}
        onClose={() => setIsDoctorOpen(false)}
      />
    </div>
  );
};
