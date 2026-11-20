"use client";

import React, { useState } from "react";
import { useWindowManager } from "../../context/WindowManagerContext";
import { useTour } from "../../context/TourContext";
import { APPS, APP_CATEGORIES } from "../../data/mockData";
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
  Lock,
  LogOut,
  Info,
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
  Lock,
  LogOut,
};

export const Dock: React.FC = () => {
  const { windows, activeWindowId, openApp: rawOpenApp, lockScreen, logout, currentUser } = useWindowManager();
  const { startSystemTour, hasSeenAppTour, startAppTour } = useTour();

  const openApp = (appId: any) => {
    rawOpenApp(appId);
    if (!hasSeenAppTour(appId)) {
      setTimeout(() => {
        startAppTour(appId);
      }, 500);
    }
  };

  const [hoveredApp, setHoveredApp] = useState<(typeof APPS)[0] | { id: string; title: string; category: string; description: string; shortTitle: string } | null>(null);
  const [tooltipX, setTooltipX] = useState<number | null>(null);

  const handleMouseEnter = (
    app: any,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredApp(app);
    setTooltipX(rect.left + rect.width / 2);
  };

  const handleMouseLeave = () => {
    setHoveredApp(null);
    setTooltipX(null);
  };

  return (
    <>
      {/* Floating High-Z Tooltip (Rendered outside scroll container so never clipped) */}
      {hoveredApp && tooltipX !== null && (
        <div
          style={{ left: `${tooltipX}px` }}
          className="fixed bottom-20 -translate-x-1/2 px-3 py-2 rounded-xl bg-[#12141c]/98 backdrop-blur-xl border border-[#34384b] shadow-2xl z-[999999] pointer-events-none w-64 text-left animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="font-bold text-xs text-white truncate">{hoveredApp.title}</span>
            {(() => {
              const cat = APP_CATEGORIES.find((c) => c.name === hoveredApp.category);
              return (
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase shrink-0 font-bold"
                  style={{
                    backgroundColor: `${cat?.color || "#ff69b4"}20`,
                    color: cat?.color || "#ff69b4",
                    border: `1px solid ${cat?.color || "#ff69b4"}40`,
                  }}
                >
                  {cat?.shortLabel || hoveredApp.category}
                </span>
              );
            })()}
          </div>
          <p className="text-[11px] text-[#8a8f98] leading-tight">
            {hoveredApp.description}
          </p>
          <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-[#1e2330] text-[9px] font-mono">
            {(() => {
              const openInst = windows.find((w) => w.appId === hoveredApp.id);
              const isOpen = !!openInst && !openInst.isMinimized;
              return (
                <span className={isOpen ? "text-[#27a644] flex items-center gap-1 font-semibold" : "text-[#62666d]"}>
                  {isOpen && <span className="w-1.5 h-1.5 rounded-full bg-[#27a644] animate-pulse" />}
                  {isOpen ? "Running" : "Click to launch"}
                </span>
              );
            })()}
            <span className="text-[#62666d]">{hoveredApp.shortTitle}</span>
          </div>
          {/* Caret arrow */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#12141c] border-r border-b border-[#34384b] rotate-45" />
        </div>
      )}

      {/* Dock Container */}
      <div className="fixed bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-[9999] select-none pointer-events-auto max-w-[96vw]">
        <div className="flex items-end gap-1 sm:gap-1.5 md:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-[#0f1011]/90 backdrop-blur-xl border border-[#23252a] shadow-2xl shadow-black/80 max-w-full overflow-x-auto scrollbar-none">
          {APPS.map((app, index) => {
            const Icon = ICON_MAP[app.iconName] || Server;
            const openInstance = windows.find((w) => w.appId === app.id);
            const isOpen = !!openInstance && !openInstance.isMinimized;
            const isFocused = isOpen && activeWindowId === openInstance?.id;
            const isNewCategory = index > 0 && app.category !== APPS[index - 1].category;

            return (
              <React.Fragment key={app.id}>
                {isNewCategory && (
                  <div className="h-6 w-px bg-white/10 my-auto mx-0.5 shrink-0" />
                )}
                <div className="relative flex flex-col items-center flex-shrink-0">
                  {/* App Icon Button */}
                  <button
                    onClick={() => openApp(app.id)}
                    onMouseEnter={(e) => handleMouseEnter(app, e)}
                    onMouseLeave={handleMouseLeave}
                    className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-200 hover:-translate-y-1.5 active:scale-95 cursor-pointer ${
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
                          : "text-[#8a8f98] hover:text-[#d0d6e0]"
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
              </React.Fragment>
            );
          })}

          {/* Separator */}
          <div className="h-8 w-px bg-[#23252a] my-auto mx-0.5 shrink-0" />

          {/* Guided Tour "i" Button in Dock */}
          <div className="relative flex flex-col items-center flex-shrink-0">
            <button
              onClick={startSystemTour}
              onMouseEnter={(e) =>
                handleMouseEnter(
                  {
                    id: "action-tour",
                    title: "System Guided Tour (i)",
                    category: "Help & Overview",
                    description: "Restart the comprehensive interactive tour of MailOps at any time.",
                    shortTitle: "Tour",
                  },
                  e
                )
              }
              onMouseLeave={handleMouseLeave}
              className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center bg-gradient-to-tr from-[#141516] to-[#1c1d25] border border-[#ff69b4]/50 hover:bg-[#ff69b4]/15 hover:border-[#ff69b4] shadow-md transition-all duration-200 hover:-translate-y-1.5 active:scale-95 cursor-pointer group"
              title="Start MailOps Guided Tour"
            >
              <Info className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#ff69b4] group-hover:scale-110 transition-transform" />
            </button>
            <div className="h-1.5 mt-0.5 sm:mt-1" />
          </div>

          {/* Lock / Logout Quick Action in Dock */}
          <div className="relative flex flex-col items-center flex-shrink-0">
            <button
              onClick={lockScreen}
              onMouseEnter={(e) =>
                handleMouseEnter(
                  {
                    id: "action-lock",
                    title: "Lock Session",
                    category: "Security",
                    description: "Immediately lock the desktop and return to the secure GNOME login panel.",
                    shortTitle: "Lock",
                  },
                  e
                )
              }
              onMouseLeave={handleMouseLeave}
              className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center bg-[#141516] border border-[#ff69b4]/30 hover:bg-[#ff69b4]/10 hover:border-[#ff69b4] transition-all duration-200 hover:-translate-y-1.5 active:scale-95 cursor-pointer"
              title="Lock Screen"
            >
              <Lock className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#ff69b4]" />
            </button>
            <div className="h-1.5 mt-0.5 sm:mt-1" />
          </div>
        </div>
      </div>
    </>
  );
};
