"use client";

import React from "react";
import { useWindowManager } from "../../context/WindowManagerContext";
import { X, CheckCheck, Bell, ShieldCheck, CheckCircle2 } from "lucide-react";

export const NotificationCenter: React.FC = () => {
  const {
    isNotificationCenterOpen,
    toggleNotificationCenter,
    notifications,
    markAllNotificationsRead,
    openApp,
  } = useWindowManager();

  if (!isNotificationCenterOpen) return null;

  return (
    <div
      onClick={toggleNotificationCenter}
      className="fixed inset-0 bg-black/40 z-[10000] flex justify-end"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-80 h-full bg-[#141516] border-l border-[#23252a] shadow-2xl p-4 flex flex-col animate-in slide-in-from-right duration-150 select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#23252a]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#f7f8f8]">
            <Bell className="w-3.5 h-3.5 text-[#ff69b4]" />
            <span>Notifications</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllNotificationsRead}
              title="Mark all as read"
              className="text-[#8a8f98] hover:text-[#f7f8f8] p-1 rounded"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleNotificationCenter}
              className="text-[#8a8f98] hover:text-[#f7f8f8] p-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                if (notif.appId) {
                  openApp(notif.appId);
                  toggleNotificationCenter();
                }
              }}
              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all hover:brightness-110 ${
                notif.type === "heartbeat"
                  ? "bg-[#ff69b4]/5 border-[#ff69b4]/30"
                  : notif.read
                  ? "bg-[#0f1011] border-[#23252a] opacity-75"
                  : "bg-[#18191a] border-[#34343a]"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 font-medium text-[#f7f8f8]">
                  <CheckCircle2 className="w-3 h-3 text-[#27a644]" />
                  <span>{notif.title}</span>
                </div>
                <span className="text-[10px] text-[#62666d]">{notif.timestamp}</span>
              </div>
              <p className="text-[11px] text-[#d0d6e0] leading-relaxed">{notif.message}</p>
            </div>
          ))}
        </div>

        {/* System Status summary */}
        <div className="pt-3 border-t border-[#23252a] text-[11px] text-[#8a8f98] flex items-center justify-between">
          <span>Server Connection: Secure</span>
          <span className="w-2 h-2 rounded-full bg-[#27a644]" />
        </div>
      </div>
    </div>
  );
};
