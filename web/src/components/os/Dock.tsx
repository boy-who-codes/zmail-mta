"use client";

import React from "react";
import { useWindowManager } from "../../context/WindowManagerContext";
import { APPS } from "../../data/mockData";
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
  BookOpen,
} from "lucide-react";

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
  BookOpen,
};

export const Dock: React.FC = () => {
  const { windows, activeWindowId, openApp } = useWindowManager();

  return (
    <div className="fixed bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-[9999] select-none pointer-events-auto max-w-[96vw]">
      <div className="flex items-end gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-[#0f1011]/90 backdrop-blur-xl border border-[#23252a] shadow-2xl shadow-black/80 max-w-full overflow-x-auto scrollbar-none">
        {APPS.map((app) => {
          const Icon = ICON_MAP[app.iconName] || Server;
          const openInstance = windows.find((w) => w.appId === app.id);
          const isOpen = !!openInstance && !openInstance.isMinimized;
          const isFocused = isOpen && activeWindowId === openInstance?.id;

          return (
            <div key={app.id} className="relative group flex flex-col items-center flex-shrink-0">
              {/* Rich Multi-Line Tooltip */}
              <div className="absolute -top-24 px-3 py-2 rounded-xl bg-[#12141c]/95 backdrop-blur-md border border-[#2b2f3d] shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 w-64 -translate-y-1 group-hover:translate-y-0 text-left">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs text-white truncate">{app.title}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ff69b4]/15 text-[#ff69b4] border border-[#ff69b4]/30 uppercase shrink-0 font-semibold">
                    {app.category}
                  </span>
                </div>
                <p className="text-[10px] text-[#8a8f98] leading-tight line-clamp-2">
                  {app.description}
                </p>
                <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-[#1e2330] text-[9px] font-mono">
                  <span className={isOpen ? "text-[#27a644] flex items-center gap-1 font-semibold" : "text-[#62666d]"}>
                    {isOpen && <span className="w-1.5 h-1.5 rounded-full bg-[#27a644] animate-pulse" />}
                    {isOpen ? "Running" : "Click to launch"}
                  </span>
                  <span className="text-[#62666d]">{app.shortTitle}</span>
                </div>
                {/* Downward triangle caret */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#12141c] border-r border-b border-[#2b2f3d] rotate-45" />
              </div>

              {/* App Icon Button - Auto-adjusts size per screen breakpoint */}
              <button
                onClick={() => openApp(app.id)}
                className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-200 group-hover:-translate-y-1.5 active:scale-95 cursor-pointer ${
                  isFocused
                    ? "bg-[#1f2024] border border-[#ff69b4]/50 shadow-md shadow-[#ff69b4]/20"
                    : isOpen
                    ? "bg-[#18191a] border border-[#34343a]"
                    : "bg-[#141516] border border-[#23252a] hover:bg-[#1a1b1d]"
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 lg:w-6 lg:h-6 transition-colors ${
                    isFocused
                      ? "text-[#ff69b4]"
                      : isOpen
                      ? "text-[#f7f8f8]"
                      : "text-[#8a8f98] group-hover:text-[#d0d6e0]"
                  }`}
                />
              </button>

              {/* Running Indicator Dot */}
              <div className="h-1.5 flex items-center justify-center mt-0.5 sm:mt-1">
                {openInstance && (
                  <div
                    className={`rounded-full transition-all ${
                      isFocused
                        ? "bg-[#ff69b4] w-1.5 sm:w-2 h-1 sm:h-1.5"
                        : openInstance.isMinimized
                        ? "bg-[#3e3e44] w-1 sm:w-1.5 h-1 sm:h-1.5"
                        : "bg-[#8a8f98] w-1 sm:w-1.5 h-1 sm:h-1.5"
                    }`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
