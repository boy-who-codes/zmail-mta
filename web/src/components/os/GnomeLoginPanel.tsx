"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Lock,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  Wifi,
  Volume2,
  BatteryCharging,
  Power,
  KeyRound,
  Mail,
} from "lucide-react";
import { useWindowManager } from "../../context/WindowManagerContext";
import { loginUser } from "../../lib/api";

export const GnomeLoginPanel: React.FC = () => {
  const { unlockScreen } = useWindowManager();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Live GNOME GDM Clock & Date updater
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
      setCurrentDate(
        now.toLocaleDateString([], {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Autofocus email input on mount
  useEffect(() => {
    usernameInputRef.current?.focus();
  }, []);

  const triggerShake = (msg: string) => {
    setErrorMsg(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    passwordInputRef.current?.focus();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const cleanUser = username.trim();
    if (!cleanUser) {
      triggerShake("Please enter your email or username");
      usernameInputRef.current?.focus();
      return;
    }
    if (!password) {
      triggerShake("Please enter your password");
      passwordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await loginUser(cleanUser, password);
      // Unlock screen smoothly
      unlockScreen(res);
    } catch (err: any) {
      triggerShake(err.message || "Authentication failure: Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex flex-col justify-between overflow-hidden select-none bg-[#090a0f]/90 backdrop-blur-3xl text-[#e6e8eb]">
      {/* GNOME GDM Top System Bar */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-black/40 border-b border-white/5 text-xs text-[#8a8f98]">
        {/* Left branding */}
        <div className="flex items-center gap-2 text-[#d0d6e0] font-medium tracking-wide">
          <div className="w-2 h-2 rounded-full bg-[#ff69b4] animate-pulse" />
          <span>MailOS</span>
        </div>

        {/* Center Clock */}
        <div className="font-medium text-[#f0f2f5] tracking-wide flex items-center gap-2">
          <span>{currentDate}</span>
          <span className="opacity-40">·</span>
          <span className="font-mono font-semibold">{currentTime}</span>
        </div>

        {/* Right System Indicators */}
        <div className="flex items-center gap-3 text-[#a0a5af]">
          <Wifi className="w-3.5 h-3.5 hover:text-white transition-colors" />
          <Volume2 className="w-3.5 h-3.5 hover:text-white transition-colors" />
          <div className="flex items-center gap-1">
            <BatteryCharging className="w-3.5 h-3.5 text-[#27a644]" />
            <span className="text-[10px] font-mono">100%</span>
          </div>
          <Power className="w-3.5 h-3.5 hover:text-[#ff2047] transition-colors" />
        </div>
      </div>

      {/* GNOME Center Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div
          className={`w-full max-w-sm flex flex-col items-center transition-transform ${
            isShaking ? "animate-shake" : ""
          }`}
        >
          {/* Neutral User / System Avatar Circle */}
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#ff69b4] via-[#5e6ad2] to-[#3b9eff] shadow-2xl flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#14151c] flex items-center justify-center overflow-hidden border-2 border-black/50">
                <Shield className="w-10 h-10 text-[#d0d6e0]" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#181922] border-2 border-[#2b2d38] flex items-center justify-center shadow-lg">
              <Lock className="w-3.5 h-3.5 text-[#ff69b4]" />
            </div>
          </div>

          {/* Neutral Title */}
          <h2 className="text-xl font-semibold text-[#f7f8f8] tracking-tight">
            Authentication Required
          </h2>
          <div className="text-xs text-[#8a8f98] mt-1 text-center">
            Enter your credentials to unlock your MailOS session
          </div>

          {/* Unified Login Form: Email & Password */}
          <form onSubmit={handleLogin} className="w-full mt-6 space-y-3">
            {/* Email / Username Input */}
            <div>
              <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                Email or Username
              </label>
              <div className="relative flex items-center rounded-xl bg-[#181922] border border-[#2e313e] focus-within:border-[#ff69b4] focus-within:ring-2 focus-within:ring-[#ff69b4]/20 transition-all">
                <div className="pl-3.5 text-[#62666d]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  ref={usernameInputRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="name@domain.com or username"
                  required
                  className="w-full py-2.5 px-3 bg-transparent text-sm text-[#f7f8f8] placeholder-[#555a64] focus:outline-none"
                />
              </div>
            </div>

            {/* Password Input Pill with Submit Arrow */}
            <div>
              <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                Password
              </label>
              <div className="relative flex items-center rounded-xl bg-[#181922] border border-[#2e313e] focus-within:border-[#ff69b4] focus-within:ring-2 focus-within:ring-[#ff69b4]/20 transition-all">
                <div className="pl-3.5 text-[#62666d]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full py-2.5 px-3 bg-transparent text-sm text-[#f7f8f8] placeholder-[#555a64] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-[#62666d] hover:text-[#d0d6e0] transition-colors"
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mr-1.5 p-2 rounded-lg bg-[#ff69b4] hover:bg-[#ff50a6] text-black font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Sign In and Unlock"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-[#ff2047]/15 border border-[#ff2047]/30 text-[#ff2047] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* GNOME Bottom System Footer */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/40 border-t border-white/5 text-[11px] text-[#62666d]">
        <div className="flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-[#ff69b4]" />
          <span>MailOS Cryptographic Identity & Access Control</span>
        </div>
        <div className="text-right font-mono text-[10px] text-[#8a8f98]">
          GDM Security Shield Active
        </div>
      </div>

      {/* CSS Animation for GNOME Shake */}
      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          15%,
          45%,
          75% {
            transform: translateX(-10px);
          }
          30%,
          60%,
          90% {
            transform: translateX(10px);
          }
        }
        .animate-shake {
          animation: shake 0.45s ease-in-out;
        }
      `}</style>
    </div>
  );
};
