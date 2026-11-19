"use client";

import React, { useState } from "react";
import { useWindowManager } from "../../context/WindowManagerContext";
import { APPS, APP_CATEGORIES } from "../../data/mockData";
import { Search, Server, ArrowRight, CheckCircle2 } from "lucide-react";

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, toggleCommandPalette, openApp } = useWindowManager();
  const [query, setQuery] = useState("");

  if (!isCommandPaletteOpen) return null;

  const isStatusNote =
    query.toLowerCase().includes("status") ||
    query.toLowerCase().includes("health") ||
    query.toLowerCase().includes("heartbeat");

  const filteredApps = APPS.filter(
    (app) =>
      app.title.toLowerCase().includes(query.toLowerCase()) ||
      app.shortTitle.toLowerCase().includes(query.toLowerCase()) ||
      app.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      onClick={toggleCommandPalette}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-start justify-center pt-[15vh]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#141516] border border-[#2b2d33] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#23252a] gap-3">
          <Search className="w-4 h-4 text-[#8a8f98]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applications, outgoing queues, domains..."
            className="w-full bg-transparent text-sm text-[#f7f8f8] placeholder-[#62666d] outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e2023] border border-[#2b2d33] text-[#8a8f98]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {isStatusNote && (
            <div className="p-3 rounded-lg bg-[#ff69b4]/10 border border-[#ff69b4]/40 flex items-center justify-between text-xs text-[#ff69b4]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#ff69b4]" />
                <span className="font-medium">
                  System Status: All 12 sending servers and delivery queues are healthy.
                </span>
              </div>
              <span className="text-[10px] bg-[#ff69b4]/20 px-2 py-0.5 rounded-full font-mono">
                Normal
              </span>
            </div>
          )}

          {APP_CATEGORIES.map((cat) => {
            const catApps = filteredApps.filter((a) => a.category === cat.name);
            if (catApps.length === 0) return null;

            return (
              <div key={cat.id} className="pt-2 first:pt-0 space-y-1">
                {/* Category Header Label on Top */}
                <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span style={{ color: cat.color }}>{cat.name}</span>
                  <span className="text-[9px] font-mono text-slate-500">({catApps.length})</span>
                </div>

                {catApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      openApp(app.id);
                      toggleCommandPalette();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1f2022] text-left text-xs transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-colors shadow-sm"
                        style={{
                          backgroundColor: `${cat.color}15`,
                          border: `1px solid ${cat.color}35`,
                        }}
                      >
                        <Server className="w-3.5 h-3.5" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <div className="text-[#f7f8f8] font-medium group-hover:text-white">{app.title}</div>
                        <div className="text-[11px] text-[#8a8f98] truncate max-w-xs">
                          {app.description}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#62666d] group-hover:text-[#f7f8f8] transition-colors" />
                  </button>
                ))}
              </div>
            );
          })}

          {filteredApps.length === 0 && !isStatusNote && (
            <div className="py-8 text-center text-xs text-[#8a8f98]">
              No results found for &quot;{query}&quot;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#23252a] bg-[#0f1011] text-[11px] text-[#62666d] flex items-center justify-between">
          <span>ZMAIL Quick Search</span>
          <div className="flex items-center gap-2">
            <span>Press Enter to open:</span>
            <kbd className="px-1 py-0.5 bg-[#18191a] border border-[#2b2d33] rounded">↵</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
