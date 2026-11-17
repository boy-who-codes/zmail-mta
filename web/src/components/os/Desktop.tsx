"use client";

import React from "react";
import { useWindowManager, WallpaperId } from "../../context/WindowManagerContext";
import { APPS } from "../../data/mockData";
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

const APP_COMPONENT_MAP: Record<string, React.FC> = {
  campaigns: CampaignsApp,
  mailboxes: MailboxesApp,
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
  const { windows, openApp, wallpaper, accessibility } = useWindowManager();

  const currentWp = WALLPAPER_PRESETS[wallpaper] || WALLPAPER_PRESETS.obsidian;

  const contrastClass = accessibility.highContrast ? "contrast-110 brightness-105" : "";
  const motionClass = accessibility.reducedMotion ? "[*]:transition-none [*]:animation-none" : "";

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden ${currentWp.containerBg} flex flex-col select-none ${contrastClass} ${motionClass}`}
    >
      {/* Background Wallpaper with dynamic theme */}
      {currentWp.overlay}

      {/* Top Menu Bar */}
      <TopMenuBar />

      {/* Desktop Workspace (Window Container & Desktop Icons) */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Desktop Icons Grid (Auto-wrapping columns as screen size/height changes) */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 flex flex-col flex-wrap max-h-[calc(100vh-100px)] sm:max-h-[calc(100vh-120px)] gap-1.5 sm:gap-2.5 z-0 pointer-events-auto content-start">
          {APPS.map((app) => {
            const Icon = ICON_MAP[app.iconName] || Server;
            return (
              <button
                key={app.id}
                onClick={() => openApp(app.id)}
                className="w-16 sm:w-18 md:w-20 p-1 sm:p-1.5 md:p-2 rounded-xl flex flex-col items-center gap-1 sm:gap-1.5 text-center group hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl bg-[#0f1011] border border-[#23252a] group-hover:border-[#ff69b4]/50 shadow-md flex items-center justify-center transition-transform group-hover:scale-105 flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#d0d6e0] group-hover:text-[#ff69b4] transition-colors" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-[#d0d6e0] font-medium leading-tight line-clamp-2 drop-shadow-md max-w-[64px] sm:max-w-[76px]">
                  {app.shortTitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Windows Rendering */}
        {windows.map((win) => {
          const AppComponent = APP_COMPONENT_MAP[win.appId];
          return (
            <WindowFrame key={win.id} instance={win}>
              {AppComponent ? <AppComponent /> : <div>App not found</div>}
            </WindowFrame>
          );
        })}
      </div>

      {/* Bottom Dock */}
      <Dock />

      {/* Command Palette Modal (⌘K) */}
      <CommandPalette />

      {/* Slide-out Notification Center */}
      <NotificationCenter />
    </div>
  );
};
