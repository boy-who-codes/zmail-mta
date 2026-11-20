"use client";

import React, { useState } from "react";
import { useWindowManager, WallpaperId } from "../../context/WindowManagerContext";
import { APPS, APP_CATEGORIES } from "../../data/mockData";
import { TopMenuBar } from "./TopMenuBar";
import { Dock } from "./Dock";
import { WindowFrame } from "./WindowFrame";
import { CommandPalette } from "./CommandPalette";
import { NotificationCenter } from "./NotificationCenter";
import {
  Server,
  Globe,
  BarChart3,
  Cpu,
  Mailbox,
  Layers,
  Terminal,
  Settings,
  Radio,
  Send,
  GitBranch,
  Users,
  ShieldAlert,
  Inbox,
  KeyRound,
  Webhook,
  FileCode2,
  Mail,
  BookOpen,
  ShieldCheck,
  LayoutGrid,
  FolderTree,
  Sparkles,
} from "lucide-react";

// App component imports
import { CampaignsApp } from "../apps/CampaignsApp";
import { WorkflowsApp } from "../apps/WorkflowsApp";
import { ContactsApp } from "../apps/ContactsApp";
import { SuppressionApp } from "../apps/SuppressionApp";
import { InboundApp } from "../apps/InboundApp";
import { SubaccountsApp } from "../apps/SubaccountsApp";
import { WebhooksApp } from "../apps/WebhooksApp";
import { TemplatesApp } from "../apps/TemplatesApp";
import { KumoMtaApp } from "../apps/KumoMtaApp";
import { DnsDomainsApp } from "../apps/DnsDomainsApp";
import { AnalyticsApp } from "../apps/AnalyticsApp";
import { InfrastructureApp } from "../apps/InfrastructureApp";
import { MailSandboxApp } from "../apps/MailSandboxApp";
import { IpPoolsApp } from "../apps/IpPoolsApp";
import { TerminalApp } from "../apps/TerminalApp";
import { SystemSettingsApp } from "../apps/SystemSettingsApp";
import { SmtpConnectApp } from "../apps/SmtpConnectApp";
import { MailboxesApp } from "../apps/MailboxesApp";
import { WebmailApp } from "../apps/WebmailApp";
import { DocsApp } from "../apps/DocsApp";

import { GnomeLoginPanel } from "./GnomeLoginPanel";
import { TourOverlay } from "./TourOverlay";
import { useTour } from "../../context/TourContext";

const APP_COMPONENT_MAP: Record<string, React.FC> = {
  campaigns: CampaignsApp,
  mailboxes: MailboxesApp,
  webmail: WebmailApp,
  workflows: WorkflowsApp,
  contacts: ContactsApp,
  suppressions: SuppressionApp,
  inbound: InboundApp,
  subaccounts: SubaccountsApp,
  webhooks: WebhooksApp,
  templates: TemplatesApp,
  kumomta: KumoMtaApp,
  dns: DnsDomainsApp,
  analytics: AnalyticsApp,
  infrastructure: InfrastructureApp,
  sandbox: MailSandboxApp,
  ippools: IpPoolsApp,
  terminal: TerminalApp,
  settings: SystemSettingsApp,
  smtp_connect: SmtpConnectApp,
  docs: DocsApp,
};

const ICON_MAP: Record<string, React.ElementType> = {
  Server,
  Globe,
  BarChart3,
  Cpu,
  Mailbox,
  Layers,
  Terminal,
  Settings,
  Radio,
  Send,
  GitBranch,
  Users,
  ShieldAlert,
  Inbox,
  KeyRound,
  Webhook,
  FileCode2,
  Mail,
  BookOpen,
  ShieldCheck,
  LayoutGrid,
  FolderTree,
  Sparkles,
};

const WALLPAPER_PRESETS: Record<WallpaperId, { containerBg: string; overlay: React.ReactNode }> = {
  obsidian: {
    containerBg: "bg-[#010102]",
    overlay: (
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(94,106,210,0.12),rgba(255,255,255,0.02),rgba(1,1,2,1))] pointer-events-none" />
    ),
  },
  midnight: {
    containerBg: "bg-[#070b14]",
    overlay: (
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_90%_at_50%_0%,rgba(30,58,138,0.28),rgba(15,23,42,0.85),rgba(4,7,14,1))] pointer-events-none" />
    ),
  },
  matrix: {
    containerBg: "bg-[#050608]",
    overlay: (
      <>
        <div className="absolute inset-0 bg-[radial-gradient(#2a2d36_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,158,255,0.1),transparent_70%)] pointer-events-none" />
      </>
    ),
  },
  aurora: {
    containerBg: "bg-[#040908]",
    overlay: (
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(16,185,129,0.16),transparent_70%),radial-gradient(ellipse_80%_60%_at_80%_30%,rgba(139,92,246,0.16),rgba(4,9,8,1))] pointer-events-none" />
    ),
  },
  slate: {
    containerBg: "bg-[#0c0d10]",
    overlay: (
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(28,31,38,0.7)_0%,rgba(10,11,14,1)_100%)] pointer-events-none" />
    ),
  },
  cosmic: {
    containerBg: "bg-[#080511]",
    overlay: (
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_40%,rgba(126,34,206,0.18),rgba(15,23,42,0.9),rgba(5,2,12,1))] pointer-events-none" />
    ),
  },
};

export const Desktop: React.FC = () => {
  const { windows, openApp: rawOpenApp, wallpaper, accessibility, isLocked } = useWindowManager();
  const { hasSeenAppTour, startAppTour } = useTour();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [desktopViewMode, setDesktopViewMode] = useState<"sections" | "compact">("sections");

  const openApp = (appId: any) => {
    rawOpenApp(appId);
    if (!hasSeenAppTour(appId)) {
      setTimeout(() => {
        startAppTour(appId);
      }, 500);
    }
  };

  const currentWp = WALLPAPER_PRESETS[wallpaper] || WALLPAPER_PRESETS.obsidian;

  const contrastClass = accessibility.highContrast ? "contrast-110 brightness-105" : "";
  const motionClass = accessibility.reducedMotion ? "[*]:transition-none [*]:animation-none" : "";

  // Categories to render based on selection filter
  const displayedCategories =
    selectedCategory === "all"
      ? APP_CATEGORIES
      : APP_CATEGORIES.filter((c) => c.id === selectedCategory);

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden ${currentWp.containerBg} flex flex-col select-none ${contrastClass} ${motionClass}`}
    >
      {/* Background Wallpaper with dynamic theme */}
      {currentWp.overlay}

      {/* Main Desktop Container - Blurred and totally disabled when locked */}
      <div
        className={`relative flex flex-col w-full h-full ${
          isLocked
            ? "filter blur-2xl pointer-events-none select-none opacity-40 scale-[0.99] transition-all duration-500"
            : "transition-all duration-500"
        }`}
        aria-hidden={isLocked}
      >
        {/* Top Menu Bar */}
        <TopMenuBar />

        {/* Desktop Workspace (Window Container & Desktop Icons) */}
        <div className="relative flex-1 w-full h-full overflow-hidden flex flex-col">
          {/* Top Category Filter & View Mode Bar */}
          <div className="z-10 px-4 py-2 flex items-center justify-between gap-3 flex-wrap pointer-events-auto bg-black/25 backdrop-blur-sm border-b border-white/5">
            {/* Category Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-[#ff69b4] text-black shadow-md shadow-[#ff69b4]/25 scale-102"
                    : "bg-[#14151a]/80 hover:bg-[#1f2028] text-slate-300 border border-[#23252e]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>All Apps</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedCategory === "all" ? "bg-black/20 text-black font-bold" : "bg-white/10 text-slate-400"}`}>
                  {APPS.length}
                </span>
              </button>

              {APP_CATEGORIES.map((cat) => {
                const count = APPS.filter((a) => a.category === cat.name).length;
                const isSelected = selectedCategory === cat.id;
                const CatIcon = ICON_MAP[cat.iconName] || Server;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? "text-black shadow-md scale-102 font-bold"
                        : "bg-[#14151a]/80 hover:bg-[#1f2028] text-slate-300 border border-[#23252e]"
                    }`}
                    style={
                      isSelected
                        ? { backgroundColor: cat.color, boxShadow: `0 4px 14px ${cat.color}40` }
                        : {}
                    }
                  >
                    <CatIcon className="w-3.5 h-3.5" style={{ color: isSelected ? "#000" : cat.color }} />
                    <span>{cat.shortLabel}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? "bg-black/20 text-black font-bold" : "bg-white/10 text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-[#14151a]/80 border border-[#23252e] rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setDesktopViewMode("sections")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  desktopViewMode === "sections"
                    ? "bg-[#23252e] text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Categorized groups with labels on top"
              >
                <FolderTree className="w-3 h-3 text-[#ff69b4]" />
                <span className="hidden sm:inline">Categorized</span>
              </button>
              <button
                onClick={() => setDesktopViewMode("compact")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  desktopViewMode === "compact"
                    ? "bg-[#23252e] text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Classic desktop icon grid"
              >
                <LayoutGrid className="w-3 h-3 text-[#3b9eff]" />
                <span className="hidden sm:inline">Compact Grid</span>
              </button>
            </div>
          </div>

          {/* Desktop Canvas View */}
          <div className="relative flex-1 w-full h-full overflow-y-auto p-4 sm:p-6 pb-28">
            {desktopViewMode === "sections" ? (
              /* CATEGORIZED SECTIONS VIEW (WITH PROMINENT TOP LABELS) */
              <div className="space-y-6 max-w-7xl mx-auto pointer-events-auto">
                {displayedCategories.map((cat) => {
                  const categoryApps = APPS.filter((a) => a.category === cat.name);
                  if (categoryApps.length === 0) return null;
                  const CatIcon = ICON_MAP[cat.iconName] || Server;

                  return (
                    <div
                      key={cat.id}
                      className="rounded-2xl bg-[#0c0d12]/75 backdrop-blur-md border border-[#1f222e] p-4 sm:p-5 shadow-xl transition-all hover:border-[#2d3142]"
                    >
                      {/* TOP CATEGORY LABEL STRIP */}
                      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: `${cat.color}20`, border: `1px solid ${cat.color}50` }}
                          >
                            <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                                {cat.name}
                              </h3>
                              <span
                                className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
                                style={{
                                  backgroundColor: `${cat.color}20`,
                                  color: cat.color,
                                  border: `1px solid ${cat.color}40`,
                                }}
                              >
                                {categoryApps.length} {categoryApps.length === 1 ? "App" : "Apps"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                              {cat.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* APPS GRID UNDER THIS CATEGORY */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {categoryApps.map((app) => {
                          const Icon = ICON_MAP[app.iconName] || Server;
                          const openInstance = windows.find((w) => w.appId === app.id);
                          const isRunning = !!openInstance && !openInstance.isMinimized;

                          return (
                            <button
                              key={app.id}
                              onClick={() => openApp(app.id)}
                              className="group p-3 rounded-xl bg-[#13151c]/90 hover:bg-[#1a1c26] border border-[#232736] hover:border-[#ff69b4]/50 flex flex-col items-center text-center gap-2 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-lg active:scale-95"
                            >
                              <div className="relative">
                                <div
                                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                                  style={{
                                    backgroundColor: `${cat.color}15`,
                                    border: `1px solid ${cat.color}35`,
                                  }}
                                >
                                  <Icon
                                    className="w-6 h-6 transition-colors group-hover:text-white"
                                    style={{ color: cat.color }}
                                  />
                                </div>
                                {isRunning && (
                                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#27a644] opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#27a644]" />
                                  </span>
                                )}
                              </div>

                              <div className="w-full">
                                <div className="text-xs font-bold text-white group-hover:text-[#ff69b4] transition-colors truncate">
                                  {app.shortTitle}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate line-clamp-1 mt-0.5">
                                  {app.description}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* COMPACT GRID VIEW (WITH CATEGORY BADGES) */
              <div className="flex flex-col flex-wrap max-h-[calc(100vh-140px)] gap-2 z-0 pointer-events-auto content-start">
                {APPS.map((app) => {
                  const Icon = ICON_MAP[app.iconName] || Server;
                  const cat = APP_CATEGORIES.find((c) => c.name === app.category);
                  const openInstance = windows.find((w) => w.appId === app.id);
                  const isRunning = !!openInstance && !openInstance.isMinimized;

                  return (
                    <button
                      key={app.id}
                      onClick={() => openApp(app.id)}
                      className="w-20 p-2 rounded-xl flex flex-col items-center gap-1 text-center group hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                    >
                      <div className="relative w-11 h-11 rounded-xl bg-[#0f1011] border border-[#23252a] group-hover:border-[#ff69b4]/50 shadow-md flex items-center justify-center transition-transform group-hover:scale-105 flex-shrink-0">
                        <Icon className="w-5 h-5 text-[#d0d6e0] group-hover:text-[#ff69b4] transition-colors" />
                        {isRunning && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#27a644] ring-2 ring-black" />
                        )}
                      </div>
                      <span className="text-[10px] text-[#d0d6e0] font-medium leading-tight line-clamp-2 drop-shadow-md">
                        {app.shortTitle}
                      </span>
                      <span
                        className="text-[8px] font-mono px-1 py-0.2 rounded font-semibold"
                        style={{
                          backgroundColor: `${cat?.color || "#fff"}15`,
                          color: cat?.color || "#fff",
                        }}
                      >
                        {cat?.shortLabel || "App"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Windows Rendering Layer */}
            {windows.map((win) => {
              const AppComponent = APP_COMPONENT_MAP[win.appId];
              return (
                <WindowFrame key={win.id} instance={win}>
                  {AppComponent ? <AppComponent /> : <div>App not found</div>}
                </WindowFrame>
              );
            })}
          </div>
        </div>

        {/* Bottom Dock */}
        <Dock />

        {/* Command Palette Modal (⌘K) */}
        {!isLocked && <CommandPalette />}

        {/* Slide-out Notification Center */}
        {!isLocked && <NotificationCenter />}

        {/* Guided Tour Engine Overlay */}
        {!isLocked && <TourOverlay />}
      </div>

      {/* GNOME GDM Login Screen Panel Overlay */}
      {isLocked && <GnomeLoginPanel />}
    </div>
  );
};
