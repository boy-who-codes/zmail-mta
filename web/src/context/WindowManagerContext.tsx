"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AppId, WindowInstance, ClusterStatus, SystemNotification, AuthUser } from "../types/os";
import { APPS, INITIAL_CLUSTER_STATUS, INITIAL_NOTIFICATIONS } from "../data/mockData";
import { fetchSystemStatus, getAuthMe, clearAuthSession } from "../lib/api";

export type WallpaperId = "obsidian" | "midnight" | "matrix" | "aurora" | "slate" | "cosmic";

export interface AccessibilitySettings {
  dimInactiveWindows: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  textScale: "compact" | "normal" | "large";
  enhancedFocus: boolean;
}

interface WindowManagerContextType {
  windows: WindowInstance[];
  activeWindowId: string | null;
  clusterStatus: ClusterStatus;
  notifications: SystemNotification[];
  isNotificationCenterOpen: boolean;
  isCommandPaletteOpen: boolean;
  wallpaper: WallpaperId;
  setWallpaper: (wp: WallpaperId) => void;
  showCenterLogo: boolean;
  setShowCenterLogo: (show: boolean) => void;
  accessibility: AccessibilitySettings;
  updateAccessibility: (settings: Partial<AccessibilitySettings>) => void;
  currentUser: AuthUser | null;
  isLocked: boolean;
  lockScreen: () => void;
  unlockScreen: (user: AuthUser) => void;
  logout: () => void;
  openApp: (appId: AppId) => void;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  toggleMaximizeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  updateWindowBounds: (
    windowId: string,
    bounds: Partial<{ x: number; y: number; width: number; height: number }>
  ) => void;
  toggleNotificationCenter: () => void;
  toggleCommandPalette: () => void;
  markAllNotificationsRead: () => void;
}

const WindowManagerContext = createContext<WindowManagerContextType | null>(null);

export function WindowManagerProvider({ children }: { children: React.ReactNode }) {
  // Start with a clean desktop - NO apps opened by default!
  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [clusterStatus, setClusterStatus] = useState<ClusterStatus>(INITIAL_CLUSTER_STATUS);
  const [notifications, setNotifications] = useState<SystemNotification[]>(INITIAL_NOTIFICATIONS);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Authentication & Screen Lock State (GNOME GDM parity)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(true);

  // Wallpaper & Accessibility State
  const [wallpaper, setWallpaperState] = useState<WallpaperId>("obsidian");
  const [showCenterLogo, setShowCenterLogoState] = useState<boolean>(true);
  const [accessibility, setAccessibilityState] = useState<AccessibilitySettings>({
    highContrast: false,
    reducedMotion: false,
    textScale: "normal",
    enhancedFocus: false,
    dimInactiveWindows: false,
  });

  // Verify authentication session on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const initAuth = async () => {
      try {
        const raw = localStorage.getItem("mailops_auth_session");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.token) {
            const user = await getAuthMe().catch(() => null);
            if (user) {
              setCurrentUser(user);
              setIsLocked(false);
              return;
            }
          }
        }
      } catch {}
      setIsLocked(true);
    };
    initAuth();
  }, []);

  const unlockScreen = (user: AuthUser) => {
    setCurrentUser(user);
    setIsLocked(false);
  };

  const lockScreen = () => {
    setIsLocked(true);
  };

  const logout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setIsLocked(true);
  };

  // Load persisted preferences from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedWp = localStorage.getItem("mailops_wallpaper");
      if (savedWp) setWallpaperState(savedWp as WallpaperId);

      const savedLogo = localStorage.getItem("mailops_show_center_logo");
      if (savedLogo !== null) setShowCenterLogoState(savedLogo === "true");

      const savedA11y = localStorage.getItem("mailops_accessibility");
      if (savedA11y) {
        setAccessibilityState((prev) => ({ ...prev, ...JSON.parse(savedA11y) }));
      }
    } catch {
      // Local storage unavailable or restricted
    }
  }, []);

  const setWallpaper = (wp: WallpaperId) => {
    setWallpaperState(wp);
    try {
      localStorage.setItem("mailops_wallpaper", wp);
    } catch {}
  };

  const setShowCenterLogo = (show: boolean) => {
    setShowCenterLogoState(show);
    try {
      localStorage.setItem("mailops_show_center_logo", String(show));
    } catch {}
  };

  const updateAccessibility = (newSettings: Partial<AccessibilitySettings>) => {
    setAccessibilityState((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem("mailops_accessibility", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Periodic Cluster Health Polling
  useEffect(() => {
    const updateStatus = async () => {
      try {
        const data = await fetchSystemStatus();
        setClusterStatus({
          nodesOnline: data.nodes_online || 1,
          nodesTotal: data.nodes_total || 1,
          throughputMsgSec: data.throughput_msg_sec || 0,
          queueDepth: data.queue_depth_total || 0,
          acceptanceRate: data.acceptance_rate ?? 100,
          agentHealthy: data.status === "healthy",
          heartbeatSync: data.server_sync ?? true,
        });
      } catch {
        // Fallback or backend offline
      }
    };
    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Global keyboard shortcuts (Cmd+K, Cmd+1..4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "1") {
        e.preventDefault();
        openApp("campaigns");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "2") {
        e.preventDefault();
        openApp("workflows");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "3") {
        e.preventDefault();
        openApp("analytics");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "4") {
        e.preventDefault();
        openApp("contacts");
      }
      if (e.key === "Escape") {
        setIsCommandPaletteOpen(false);
        setIsNotificationCenterOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openApp = (appId: AppId) => {
    setWindows((prev) => {
      const maxZ = prev.length > 0 ? Math.max(...prev.map((w) => w.zIndex), 10) : 10;
      const nextZ = maxZ + 1;

      const existingIndex = prev.findIndex((w) => w.appId === appId);
      if (existingIndex !== -1) {
        // Bring existing to front and unminimize
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          isMinimized: false,
          zIndex: nextZ,
        };
        setActiveWindowId(updated[existingIndex].id);
        return updated;
      }

      const appDef = APPS.find((a) => a.id === appId);
      if (!appDef) return prev;

      // Smart positioning centered or cascaded based on screen dimensions
      const screenW = typeof window !== "undefined" ? window.innerWidth : 1280;
      const screenH = typeof window !== "undefined" ? window.innerHeight : 800;

      const width = Math.min(appDef.defaultWidth, Math.max(320, screenW - 80));
      const height = Math.min(appDef.defaultHeight, Math.max(300, screenH - 120));

      const cascadeOffset = (prev.length % 6) * 28;
      const x = Math.max(20, Math.min(Math.round((screenW - width) / 2) + cascadeOffset, screenW - width - 20));
      const y = Math.max(48, Math.min(Math.round((screenH - height) / 2.4) + cascadeOffset, screenH - height - 80));

      const newWindow: WindowInstance = {
        id: appId,
        appId,
        title: appDef.title,
        x,
        y,
        width,
        height,
        zIndex: nextZ,
        isMinimized: false,
        isMaximized: false,
      };

      setActiveWindowId(newWindow.id);
      return [...prev, newWindow];
    });
  };

  const closeWindow = (windowId: string) => {
    setWindows((prev) => {
      const filtered = prev.filter((w) => w.id !== windowId);
      if (activeWindowId === windowId) {
        if (filtered.length > 0) {
          const topWindow = filtered.reduce((highest, current) =>
            current.zIndex > highest.zIndex ? current : highest
          );
          setActiveWindowId(topWindow.id);
        } else {
          setActiveWindowId(null);
        }
      }
      return filtered;
    });
  };

  const minimizeWindow = (windowId: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === windowId ? { ...w, isMinimized: true } : w))
    );
    if (activeWindowId === windowId) {
      const remainingVisible = windows.filter(
        (w) => w.id !== windowId && !w.isMinimized
      );
      if (remainingVisible.length > 0) {
        const top = remainingVisible.reduce((highest, curr) =>
          curr.zIndex > highest.zIndex ? curr : highest
        );
        setActiveWindowId(top.id);
      } else {
        setActiveWindowId(null);
      }
    }
  };

  const toggleMaximizeWindow = (windowId: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== windowId) return w;
        if (!w.isMaximized) {
          // Store bounds before maximizing
          return {
            ...w,
            isMaximized: true,
            prevBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
          };
        } else {
          // Restore bounds
          return {
            ...w,
            isMaximized: false,
            x: w.prevBounds?.x ?? w.x,
            y: w.prevBounds?.y ?? w.y,
            width: w.prevBounds?.width ?? w.width,
            height: w.prevBounds?.height ?? w.height,
          };
        }
      })
    );
  };

  const focusWindow = (windowId: string) => {
    setWindows((prev) => {
      const target = prev.find((w) => w.id === windowId);
      if (!target) return prev;
      const maxZ = Math.max(...prev.map((w) => w.zIndex), 10);
      if (target.zIndex === maxZ && activeWindowId === windowId && !target.isMinimized) {
        return prev;
      }
      return prev.map((w) =>
        w.id === windowId
          ? { ...w, zIndex: maxZ + 1, isMinimized: false }
          : w
      );
    });
    setActiveWindowId(windowId);
  };

  const updateWindowBounds = (
    windowId: string,
    bounds: Partial<{ x: number; y: number; width: number; height: number }>
  ) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === windowId ? { ...w, ...bounds } : w))
    );
  };

  const toggleNotificationCenter = () => {
    setIsNotificationCenterOpen((prev) => !prev);
    if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
  };

  const toggleCommandPalette = () => {
    setIsCommandPaletteOpen((prev) => !prev);
    if (isNotificationCenterOpen) setIsNotificationCenterOpen(false);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <WindowManagerContext.Provider
      value={{
        windows,
        activeWindowId,
        clusterStatus,
        notifications,
        isNotificationCenterOpen,
        isCommandPaletteOpen,
        wallpaper,
        setWallpaper,
        showCenterLogo,
        setShowCenterLogo,
        accessibility,
        updateAccessibility,
        currentUser,
        isLocked,
        lockScreen,
        unlockScreen,
        logout,
        openApp,
        closeWindow,
        minimizeWindow,
        toggleMaximizeWindow,
        focusWindow,
        updateWindowBounds,
        toggleNotificationCenter,
        toggleCommandPalette,
        markAllNotificationsRead,
      }}
    >
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error("useWindowManager must be used within a WindowManagerProvider");
  }
  return context;
}
