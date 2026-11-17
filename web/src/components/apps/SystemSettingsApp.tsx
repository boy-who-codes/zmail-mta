"use client";

import React, { useState, useEffect } from "react";
import {
  Palette,
  Shield,
  Key,
  Info,
  Check,
  Image as ImageIcon,
  Eye,
  Sliders,
  Monitor,
  Sparkles,
  Contrast,
  ZapOff,
  Type,
  Layout,
  Focus,
  Mailbox,
  Lock,
  Save,
} from "lucide-react";
import { useWindowManager, WallpaperId } from "../../context/WindowManagerContext";
import { fetchSystemSettings, updateSystemSettings, SystemSettings } from "../../lib/api";

const WALLPAPERS: { id: WallpaperId; name: string; desc: string; previewBg: string; borderAccent: string }[] = [
  {
    id: "obsidian",
    name: "Obsidian Minimal",
    desc: "Default pitch-black studio with subtle indigo atmospheric depth",
    previewBg: "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(94,106,210,0.3),rgba(1,1,2,1))]",
    borderAccent: "border-[#34343a]",
  },
  {
    id: "midnight",
    name: "Cyber Midnight",
    desc: "Deep navy indigo dusk inspired by night operational command centers",
    previewBg: "bg-[radial-gradient(ellipse_90%_90%_at_50%_0%,rgba(30,58,138,0.6),rgba(4,7,14,1))]",
    borderAccent: "border-[#1e3a8a]/50",
  },
  {
    id: "matrix",
    name: "Carbon Matrix",
    desc: "Precision engineering grid with subtle dotted blueprint substrate",
    previewBg: "bg-[#050608] bg-[radial-gradient(#3a3d46_1px,transparent_1px)] [background-size:12px_12px]",
    borderAccent: "border-[#3b414f]",
  },
  {
    id: "aurora",
    name: "Aurora Spectrum",
    desc: "Subtle emerald-to-violet cosmic atmospheric gradients",
    previewBg: "bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(16,185,129,0.3),transparent_70%),radial-gradient(ellipse_80%_60%_at_80%_30%,rgba(139,92,246,0.3),rgba(4,9,8,1))]",
    borderAccent: "border-[#059669]/40",
  },
  {
    id: "slate",
    name: "Titanium Slate",
    desc: "Clean industrial metallic dark monochrome gradient",
    previewBg: "bg-[linear-gradient(to_bottom,rgba(40,44,54,0.8)_0%,rgba(10,11,14,1)_100%)]",
    borderAccent: "border-[#4b5563]/50",
  },
  {
    id: "cosmic",
    name: "Deep Cosmic",
    desc: "Deep purple dusk nebula with cosmic galactic depth",
    previewBg: "bg-[radial-gradient(ellipse_100%_100%_at_50%_40%,rgba(126,34,206,0.4),rgba(5,2,12,1))]",
    borderAccent: "border-[#7e22ce]/40",
  },
];

export const SystemSettingsApp: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<
    "wallpaper" | "accessibility" | "appearance" | "security" | "api" | "rotation" | "about"
  >("wallpaper");

  const [sysSettings, setSysSettings] = useState<SystemSettings>({
    mailbox_rotation_enabled: true,
    enforce_sender_continuity: true,
    enforce_min_interval: true,
    default_rotation_strategy: "least_utilized",
    default_ip_pool: "default",
    require_verified_domain: true,
    one_click_unsubscribe: true,
    custom_legal_footer: "100 Enterprise Way, Suite 400, San Francisco, CA 94107",
    company_address: "ZMAIL Infrastructure Group • 100 Enterprise Way, SF, CA",
    branding_enabled: true,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    fetchSystemSettings()
      .then((s) => setSysSettings(s))
      .catch(() => {});
  }, []);

  const handleSaveSettings = async () => {
    try {
      await updateSystemSettings(sysSettings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      alert("Failed to save settings: " + err);
    }
  };

  const {
    wallpaper,
    setWallpaper,
    showCenterLogo,
    setShowCenterLogo,
    accessibility,
    updateAccessibility,
  } = useWindowManager();

  return (
    <div className="flex h-full bg-[#0a0a0c] text-xs">
      {/* Left Sidebar */}
      <div className="w-56 border-r border-[#23252a] bg-[#0f1011] p-2 space-y-1">
        <button
          onClick={() => setSelectedSection("wallpaper")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
            selectedSection === "wallpaper" ? "bg-[#18191a] text-[#f7f8f8]" : "text-[#8a8f98] hover:bg-[#141516]"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 text-[#3b9eff]" />
          <span>Wallpaper & Desktop</span>
        </button>

        <button
          onClick={() => setSelectedSection("accessibility")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
            selectedSection === "accessibility" ? "bg-[#18191a] text-[#f7f8f8]" : "text-[#8a8f98] hover:bg-[#141516]"
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-[#27a644]" />
          <span>Accessibility</span>
        </button>

        <button
          onClick={() => setSelectedSection("appearance")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
            selectedSection === "appearance" ? "bg-[#18191a] text-[#f7f8f8]" : "text-[#8a8f98] hover:bg-[#141516]"
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-[#a78bfa]" />
          <span>Appearance & Compositor</span>
        </button>

        <button
          onClick={() => setSelectedSection("security")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
            selectedSection === "security" ? "bg-[#18191a] text-[#f7f8f8]" : "text-[#8a8f98] hover:bg-[#141516]"
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-[#5e6ad2]" />
          <span>Organization & Access</span>
        </button>

        <button
          onClick={() => setSelectedSection("api")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
            selectedSection === "api" ? "bg-[#18191a] text-[#f7f8f8]" : "text-[#8a8f98] hover:bg-[#141516]"
          }`}
        >
          <Key className="w-3.5 h-3.5 text-[#eab308]" />
          <span>Sending Keys & Spool</span>
        </button>

        <button
          onClick={() => setSelectedSection("rotation")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
            selectedSection === "rotation" ? "bg-[#18191a] text-[#f7f8f8]" : "text-[#8a8f98] hover:bg-[#141516]"
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-[#ff69b4]" />
          <span>Mailbox Rotation &amp; Policies</span>
        </button>

        <button
          onClick={() => setSelectedSection("about")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
            selectedSection === "about" ? "bg-[#18191a] text-[#f7f8f8]" : "text-[#8a8f98] hover:bg-[#141516]"
          }`}
        >
          <Info className="w-3.5 h-3.5 text-[#8a8f98]" />
          <span>About ZMAIL</span>
        </button>
      </div>

      {/* Main Settings Body */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* WALLPAPER & DESKTOP SECTION */}
        {selectedSection === "wallpaper" && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#3b9eff]" />
                <span>Desktop Wallpaper & Ambience</span>
              </h3>
              <p className="text-[11px] text-[#8a8f98] mt-0.5">
                Select an atmospheric desktop background that matches your environment. Changes apply instantly and persist across sessions.
              </p>
            </div>

            {/* Wallpaper Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {WALLPAPERS.map((wp) => {
                const isActive = wallpaper === wp.id;
                return (
                  <div
                    key={wp.id}
                    onClick={() => setWallpaper(wp.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? "bg-[#18191a] border-[#3b9eff] shadow-lg shadow-[#3b9eff]/10 ring-1 ring-[#3b9eff]"
                        : "bg-[#0f1011] border-[#23252a] hover:border-[#34343a] hover:bg-[#141516]"
                    }`}
                  >
                    {/* Visual Preview Box */}
                    <div
                      className={`w-full h-20 rounded-lg border ${wp.borderAccent} ${wp.previewBg} relative overflow-hidden flex items-center justify-center mb-2.5 shadow-inner`}
                    >
                      {isActive && (
                        <div className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-[#3b9eff] text-[#f7f8f8] text-[10px] font-medium flex items-center gap-1 shadow-md">
                          <Check className="w-3 h-3 text-[#3b9eff]" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>

                    <div className="font-medium text-[#f7f8f8] text-xs flex items-center justify-between">
                      <span>{wp.name}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#3b9eff]" />}
                    </div>
                    <div className="text-[10px] text-[#8a8f98] mt-0.5 line-clamp-2 leading-relaxed">
                      {wp.desc}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ACCESSIBILITY SECTION */}
        {selectedSection === "accessibility" && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#27a644]" />
                <span>Accessibility & Ergonomics</span>
              </h3>
              <p className="text-[11px] text-[#8a8f98] mt-0.5">
                Configure visual contrast, motion sensitivity, focus indicators, and text scaling to suit your workflow.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-4">
              {/* High Contrast */}
              <div className="flex items-center justify-between">
                <div className="pr-4">
                  <div className="font-medium text-[#f7f8f8] text-xs flex items-center gap-1.5">
                    <Contrast className="w-3.5 h-3.5 text-[#d0d6e0]" />
                    <span>High Contrast Mode</span>
                  </div>
                  <div className="text-[11px] text-[#8a8f98] mt-0.5">
                    Increases border luminance, sharpens window edges, and boosts text clarity against dark panels.
                  </div>
                </div>

                <button
                  onClick={() =>
                    updateAccessibility({ highContrast: !accessibility.highContrast })
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 cursor-pointer ${
                    accessibility.highContrast ? "bg-[#27a644]" : "bg-[#23252a]"
                  }`}
                  aria-label="Toggle high contrast"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                      accessibility.highContrast ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-[#1c1d20]" />

              {/* Reduced Motion */}
              <div className="flex items-center justify-between">
                <div className="pr-4">
                  <div className="font-medium text-[#f7f8f8] text-xs flex items-center gap-1.5">
                    <ZapOff className="w-3.5 h-3.5 text-[#d0d6e0]" />
                    <span>Reduced Motion</span>
                  </div>
                  <div className="text-[11px] text-[#8a8f98] mt-0.5">
                    Disables spring transitions, hover scaling, and window minimize animations for motion-sensitive users.
                  </div>
                </div>

                <button
                  onClick={() =>
                    updateAccessibility({ reducedMotion: !accessibility.reducedMotion })
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 cursor-pointer ${
                    accessibility.reducedMotion ? "bg-[#27a644]" : "bg-[#23252a]"
                  }`}
                  aria-label="Toggle reduced motion"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                      accessibility.reducedMotion ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-[#1c1d20]" />

              {/* Enhanced Focus Rings */}
              <div className="flex items-center justify-between">
                <div className="pr-4">
                  <div className="font-medium text-[#f7f8f8] text-xs flex items-center gap-1.5">
                    <Focus className="w-3.5 h-3.5 text-[#d0d6e0]" />
                    <span>Enhanced Focus Rings</span>
                  </div>
                  <div className="text-[11px] text-[#8a8f98] mt-0.5">
                    Renders high-visibility rings around the currently active window and focused controls.
                  </div>
                </div>

                <button
                  onClick={() =>
                    updateAccessibility({ enhancedFocus: !accessibility.enhancedFocus })
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 cursor-pointer ${
                    accessibility.enhancedFocus ? "bg-[#27a644]" : "bg-[#23252a]"
                  }`}
                  aria-label="Toggle enhanced focus"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                      accessibility.enhancedFocus ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-[#1c1d20]" />

              {/* Dim Inactive Windows */}
              <div className="flex items-center justify-between">
                <div className="pr-4">
                  <div className="font-medium text-[#f7f8f8] text-xs flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5 text-[#d0d6e0]" />
                    <span>Dim Inactive Windows</span>
                  </div>
                  <div className="text-[11px] text-[#8a8f98] mt-0.5">
                    Softly fades background windows to reduce visual distraction and keep attention on your active task.
                  </div>
                </div>

                <button
                  onClick={() =>
                    updateAccessibility({ dimInactiveWindows: !accessibility.dimInactiveWindows })
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 cursor-pointer ${
                    accessibility.dimInactiveWindows ? "bg-[#27a644]" : "bg-[#23252a]"
                  }`}
                  aria-label="Toggle dim inactive windows"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                      accessibility.dimInactiveWindows ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-[#1c1d20]" />

              {/* Text Scaling */}
              <div className="space-y-2">
                <div className="font-medium text-[#f7f8f8] text-xs flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#d0d6e0]" />
                  <span>Interface Text Scaling</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["compact", "normal", "large"] as const).map((scale) => (
                    <button
                      key={scale}
                      onClick={() => updateAccessibility({ textScale: scale })}
                      className={`py-1.5 px-3 rounded-lg border text-xs capitalize transition-colors cursor-pointer ${
                        accessibility.textScale === scale
                          ? "bg-[#18191a] border-[#27a644] text-[#f7f8f8] font-medium"
                          : "bg-[#070709] border-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516]"
                      }`}
                    >
                      {scale === "compact" && "Compact (90%)"}
                      {scale === "normal" && "Default (100%)"}
                      {scale === "large" && "Comfort (110%)"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* APPEARANCE & COMPOSITOR SECTION */}
        {selectedSection === "appearance" && (
          <div className="space-y-4 max-w-lg">
            <div>
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Theme & Compositor</h3>
              <p className="text-[11px] text-[#8a8f98] mt-0.5">
                System appearance and GPU window compositor properties.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#f7f8f8]">Color Theme</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#18191a] text-[#f7f8f8] border border-[#23252a]">
                  Dark Operational
                </span>
              </div>
              <p className="text-[11px] text-[#d0d6e0]">
                Engineered for maximum contrast and minimum eye fatigue during mission-critical 24/7 delivery operations.
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-[#8a8f98]">
                <div className="w-4 h-4 rounded-full bg-[#18191a] border border-[#23252a] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-[#27a644]" />
                </div>
                <span>Dark Obsidian Surface</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-1">
              <div className="font-medium text-[#f7f8f8]">Hardware Acceleration</div>
              <div className="text-[11px] text-[#8a8f98]">
                GPU-accelerated translate3d window rendering with zero drag latency.
              </div>
            </div>
          </div>
        )}

        {/* SECURITY & ACCESS SECTION */}
        {selectedSection === "security" && (
          <div className="space-y-3 max-w-lg">
            <h3 className="text-sm font-semibold text-[#f7f8f8]">Organization & Access Control</h3>
            <p className="text-[11px] text-[#8a8f98]">
              Manage cluster authorization, team permissions, and audit logs.
            </p>
            <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#d0d6e0]">Organization Account:</span>
                <span className="text-[#f7f8f8] font-medium">Enterprise Primary Node</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#d0d6e0]">Your Role:</span>
                <span className="text-[#27a644] font-medium">Root Administrator</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#d0d6e0]">Audit Logging:</span>
                <span className="text-[#3b9eff]">Permanent Cryptographic Log</span>
              </div>
            </div>
          </div>
        )}

        {/* API & CREDENTIALS SECTION */}
        {selectedSection === "api" && (
          <div className="space-y-3 max-w-lg">
            <h3 className="text-sm font-semibold text-[#f7f8f8]">Sending Keys & Spool Endpoints</h3>
            <p className="text-[11px] text-[#8a8f98]">
              Connection parameters for SMTP injection, high-velocity spool, and REST APIs.
            </p>
            <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#d0d6e0]">Local SMTP Relay:</span>
                <span className="text-[#f7f8f8] font-mono">127.0.0.1:2525 (or ports 25, 587)</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#d0d6e0]">REST API Gateway:</span>
                <span className="text-[#f7f8f8] font-mono">http://localhost:8080/api/v1</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#d0d6e0]">ZMAIL Engine HTTP Port:</span>
                <span className="text-[#f7f8f8] font-mono">http://localhost:8000</span>
              </div>
            </div>
          </div>
        )}

        {/* MAILBOX ROTATION & POLICIES SECTION */}
        {selectedSection === "rotation" && (
          <div className="space-y-4 max-w-lg">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#f7f8f8]">Mailbox Rotation &amp; Delivery Policies</h3>
                  <p className="text-[11px] text-[#8a8f98] mt-0.5">
                    Cluster-wide sending rules, thread consistency, and anti-spam compliance guards.
                  </p>
                </div>
                {settingsSaved && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#27a644]/10 text-[#27a644] border border-[#27a644]/30 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
            </div>

            {/* Master Toggle */}
            <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a] flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-xs">Automated Mailbox Rotation &amp; Pooling</div>
                <div className="text-[11px] text-[#8a8f98] mt-0.5">
                  Allows campaigns to rotate across verified sender pools instead of a single From address.
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSysSettings({ ...sysSettings, mailbox_rotation_enabled: !sysSettings.mailbox_rotation_enabled })
                }
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 shrink-0 ${
                  sysSettings.mailbox_rotation_enabled ? "bg-[#ff69b4]" : "bg-[#23252a]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    sysSettings.mailbox_rotation_enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Sender Continuity Toggle */}
            <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a] flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#27a644]" />
                  <span>Enforce Sender Continuity on Follow-up Steps</span>
                </div>
                <div className="text-[11px] text-[#8a8f98] mt-0.5">
                  Strictly prohibits mailbox rotation on follow-up emails. Locks sender to Step 1 origin to preserve thread context.
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSysSettings({ ...sysSettings, enforce_sender_continuity: !sysSettings.enforce_sender_continuity })
                }
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 shrink-0 ${
                  sysSettings.enforce_sender_continuity ? "bg-[#27a644]" : "bg-[#23252a]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    sysSettings.enforce_sender_continuity ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Min Interval Enforcement */}
            <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a] flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-xs">Enforce Minimum Sending Interval</div>
                <div className="text-[11px] text-[#8a8f98] mt-0.5">
                  Prevents back-to-back bursts from the same mailbox (throttles to 60–90 seconds between sends).
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSysSettings({ ...sysSettings, enforce_min_interval: !sysSettings.enforce_min_interval })
                }
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 shrink-0 ${
                  sysSettings.enforce_min_interval ? "bg-[#ff69b4]" : "bg-[#23252a]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    sysSettings.enforce_min_interval ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Mandatory RFC 8058 One-Click Unsubscribe Header */}
            <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a] flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-xs">RFC 8058 One-Click List-Unsubscribe Header</div>
                <div className="text-[11px] text-[#8a8f98] mt-0.5">
                  Injects mandatory List-Unsubscribe=One-Click headers required by Google and Yahoo post-2024.
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSysSettings({ ...sysSettings, one_click_unsubscribe: !sysSettings.one_click_unsubscribe })
                }
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 shrink-0 ${
                  sysSettings.one_click_unsubscribe ? "bg-[#27a644]" : "bg-[#23252a]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    sysSettings.one_click_unsubscribe ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Default Company Physical Address */}
            <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-2">
              <label className="text-[11px] font-semibold text-white block">
                Default CAN-SPAM Physical Postal Address
              </label>
              <input
                type="text"
                value={sysSettings.company_address}
                onChange={(e) => setSysSettings({ ...sysSettings, company_address: e.target.value })}
                placeholder="100 Enterprise Way, Suite 400, San Francisco, CA 94107"
                className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#ff69b4]/60 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              className="w-full py-2.5 rounded-xl bg-[#ff69b4] hover:bg-[#ff52a5] text-black font-semibold text-xs shadow-md shadow-[#ff69b4]/20 flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Cluster Sending Policies</span>
            </button>
          </div>
        )}

        {/* ABOUT SECTION */}
        {selectedSection === "about" && (
          <div className="space-y-3 max-w-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ff69b4] flex items-center justify-center font-black text-[#010102] text-xl shadow-lg shadow-[#ff69b4]/20">
                Z
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#f7f8f8]">ZMAIL</h3>
                <p className="text-[11px] text-[#8a8f98]">Enterprise Email Operations Platform</p>
              </div>
            </div>
            <p className="text-[11px] text-[#d0d6e0] leading-relaxed">
              ZMAIL provides high-performance multi-IP delivery, automated DKIM/SPF/DMARC authentication, real-time deliverability reports, and shaping policies.
            </p>
            <div className="pt-2 text-[10px] text-[#62666d] font-mono">
              Version 2026.11 Enterprise Edition &bull; powered by zekea
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
