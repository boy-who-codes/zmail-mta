"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AppId } from "../types/os";

export interface TourStep {
  title: string;
  tagline?: string;
  description: string;
  target?: string; // CSS selector or description
  badge?: string;
  highlights?: string[];
}

export interface AppTourConfig {
  appId: AppId;
  appName: string;
  iconName: string;
  category: string;
  steps: TourStep[];
}

export const SYSTEM_ONBOARDING_TOUR: TourStep[] = [
  {
    title: "Welcome to MailOps Cloud MTA OS",
    tagline: "High-Throughput Enterprise Email Operating System",
    description: "MailOps combines carrier-grade KumoMTA core engine delivery with intuitive visual sequence automation, mailbox isolation, and deliverability intelligence.",
    badge: "System Overview",
    highlights: [
      "Pure Linux desktop experience with multitasking window manager",
      "Native KumoMTA Lua policy, traffic shaping & RFC 6376 DKIM signing",
      "Live reverse DNS (FCrDNS), port 25 diagnostics & automated IP reputation protection",
    ],
  },
  {
    title: "Category Navigation Bar",
    tagline: "Top Menu & Live Cluster Telemetry",
    description: "The top menu bar organizes your apps into Outreach & Automations, Mailboxes & Delivery, and Core MTA Infrastructure with live RAM/CPU, IP, and port status.",
    badge: "Top Bar",
    highlights: [
      "Click categories to filter your workspace",
      "Real-time cluster health indicators (KumoMTA, Redis, TSA, Dovecot)",
      "Instant Command Palette (⌘K) and Notifications tray",
    ],
  },
  {
    title: "Desktop Apps & App Categorization",
    tagline: "Single-Click Window Access",
    description: "All tools are arranged on your desktop. Switch between Categorized Folders view and Compact Grid view using the top toggle anytime.",
    badge: "Desktop",
    highlights: [
      "Color-coded badges designate Outbound, Mailbox, or Infra roles",
      "Drag, resize, minimize, or maximize windows freely",
      "Every app includes a dedicated interactive tour guide",
    ],
  },
  {
    title: "Interactive Floating Dock",
    tagline: "Instant Launching & Quick Controls",
    description: "Your bottom dock pins vital applications like Campaigns, Mailboxes, DNS & Domains, Analytics, and KumoMTA with live active running dots.",
    badge: "Bottom Dock",
    highlights: [
      "Hover over dock icons for instant app summaries",
      "Running apps are indicated with illuminated status dots",
      "Bottom-right (i) button lets you restart this tour anytime",
    ],
  },
  {
    title: "How to Start Sending Mail",
    tagline: "Fast-Track Production Setup",
    description: "Follow the 3-step setup to begin delivering cold outreach and transactional email:",
    badge: "Ready to Ship",
    highlights: [
      "1. DNS & Domains: Add your domain and auto-configure SPF, DKIM & DMARC",
      "2. Mailboxes: Create custom senders with automatic Dovecot IMAP/SMTP credentials",
      "3. Campaigns: Launch pre-made multi-touch outreach sequences with automated warm-up",
    ],
  },
];

export const APP_TOURS: Record<string, AppTourConfig> = {
  dns: {
    appId: "dns",
    appName: "DNS & Sending Domains",
    iconName: "Globe",
    category: "Infrastructure",
    steps: [
      {
        title: "DNS & Sending Domains Hub",
        tagline: "Domain Identity & Cryptographic Records",
        description: "Configure and verify your sending domains to achieve 100% SPF, DKIM, and DMARC alignment before dispatching emails.",
        badge: "Overview",
        highlights: [
          "Auto-generates 2048-bit RSA DKIM public & private key pairs",
          "Automated SPF (v=spf1) generation with custom mail HELO routing",
          "Strict DMARC policy generation (p=quarantine / p=reject) with aggregate reporting",
        ],
      },
      {
        title: "Cloudflare 1-Click Sync",
        tagline: "Zero-Friction Token Generation",
        description: "Generate an API Token in Cloudflare with pre-filled DNS templates. The system auto-discovers your Zone ID from the domain name without tedious manual entry.",
        badge: "Cloudflare Setup",
        highlights: [
          "One-click 'Generate Token' deep-link takes you straight to Cloudflare with pre-filled scopes",
          "One-click BIND Zone file export for instant bulk import",
          "Auto-syncs MX, SPF, DKIM TXT, and DMARC records in under 3 seconds",
        ],
      },
      {
        title: "Dedicated rDNS & FCrDNS Deliverability Checker",
        tagline: "RFC 5321 Forward-Confirmed Reverse DNS",
        description: "Google and Yahoo mandate that your sending IP's reverse DNS (PTR) bidirectionally resolves back to your sending hostname. Use the built-in checker to audit your server.",
        badge: "rDNS Checker",
        highlights: [
          "Automatic public egress IPv4 detection or custom IP / hostname test",
          "Detects dynamic/generic ISP hostnames that trigger spam filters",
          "Includes step-by-step rDNS guides for Hetzner, DigitalOcean, OVH, AWS EC2, and Contabo",
        ],
      },
    ],
  },
  mailboxes: {
    appId: "mailboxes",
    appName: "Mailboxes & Warmup",
    iconName: "Mailbox",
    category: "Mailboxes & Inbound",
    steps: [
      {
        title: "Isolated Two-Way Mailbox Pools",
        tagline: "Individual Inboxes & IMAP Credentials",
        description: "Create and manage dedicated sender mailboxes (e.g. sales@yourdomain.com) with real-time health scores and credentials for Outlook, Apple Mail, and Thunderbird.",
        badge: "Mailbox Pool",
        highlights: [
          "Automated Dovecot IMAP and KumoMTA SMTP password provisioning",
          "Per-mailbox sending capacity, daily volume limits, and automated warmup velocity",
          "Live health status with deliverability risk indicators",
        ],
      },
      {
        title: "Autonomous AI Warmup Engine",
        tagline: "Gradual ISP Reputation Building",
        description: "Ramp up sending volume automatically from 5 emails/day up to full capacity while monitoring bounce rates and spam placement.",
        badge: "Warmup Automation",
        highlights: [
          "Dynamic throttle curves calibrated for Gmail, Yahoo, and Outlook limits",
          "Automatic pause if bounce rate exceeds 2% or reputation degrades",
          "Peer-to-peer simulated engagement threads to preserve sender reputation",
        ],
      },
    ],
  },
  campaigns: {
    appId: "campaigns",
    appName: "Outreach Campaigns",
    iconName: "Send",
    category: "Outreach & Automations",
    steps: [
      {
        title: "Pre-Made Multi-Touch Automations",
        tagline: "Cold Outreach, Activation & Hygiene",
        description: "Deploy production-ready sequence automations with automated follow-ups, mailbox rotation, and reply tracking.",
        badge: "Sequences",
        highlights: [
          "3 pre-made automation sequences initialized with 0 mock clutter",
          "Automated multi-step follow-ups with customizable wait delays (e.g. 2 days, 4 days)",
          "Automatic lead enrollment, unsubscribe handling, and reply detection",
        ],
      },
      {
        title: "Sender Rotation & Smart Dispatching",
        tagline: "Distribute Volume Across Multiple Inboxes",
        description: "Rotate dispatches across all active mailboxes on your domain to prevent any single address from hitting ISP hourly rate limits.",
        badge: "Rotation Engine",
        highlights: [
          "Smart pool rotation distributes traffic evenly",
          "Enforces delivery windows (e.g., 9:00 AM - 5:00 PM Mon-Fri)",
          "Stops sequence immediately upon prospect reply",
        ],
      },
    ],
  },
  kumomta: {
    appId: "kumomta",
    appName: "KumoMTA Engine Core",
    iconName: "Cpu",
    category: "Core Infrastructure",
    steps: [
      {
        title: "Carrier-Grade KumoMTA Outbound Engine",
        tagline: "Millions of Emails per Hour at Wire Speed",
        description: "Monitor and manage the high-speed KumoMTA outbound daemon directly from this terminal interface.",
        badge: "Core Engine",
        highlights: [
          "RocksDB persistent disk spool holding messages safely across reboots",
          "Real-time delivery queues, active dispatchers, and connection pool status",
          "Live throughput telemetry (deliveries/sec, transient failures, connection counts)",
        ],
      },
      {
        title: "TSA (Traffic Shaping Automation) & Lua Policies",
        tagline: "RFC-Compliant Throttling for Big 4 Providers",
        description: "KumoMTA dynamically conforms to delivery rates and connection ceilings for Google Workspace, Outlook.com, Yahoo/AOL, and Apple iCloud.",
        badge: "Traffic Shaping",
        highlights: [
          "Auto-adapts connection concurrency when remote servers return 421 rate-limit codes",
          "Custom Lua policy in /opt/kumomta/etc/policy/init.lua",
          "Native IPv4-only egress lookup strategy preventing socket binding errors",
        ],
      },
    ],
  },
  analytics: {
    appId: "analytics",
    appName: "Analytics & Deliverability",
    iconName: "BarChart3",
    category: "Analytics & Monitoring",
    steps: [
      {
        title: "Real-Time Deliverability Intelligence",
        tagline: "Zero Mock Numbers, 100% Real Logs",
        description: "Monitor outbound volume, open rates, click tracking, bounce ratios, and provider inbox placements in real-time.",
        badge: "Analytics Hub",
        highlights: [
          "Live delivery pipeline: Sent, Delivered, Opened, Bounced, and Suppressed",
          "ISP breakdown: Real-time telemetry for Gmail, Outlook, Yahoo, and corporate domains",
          "Clean-state verified: Displays true 0 metrics on new installations without fake numbers",
        ],
      },
    ],
  },
  infrastructure: {
    appId: "infrastructure",
    appName: "Cluster Infrastructure",
    iconName: "Server",
    category: "Core Infrastructure",
    steps: [
      {
        title: "Multi-Node Daemon Health & Diagnostics",
        tagline: "Deliverability Doctor & Outbound Preflight",
        description: "Inspect the status of all container services: Gateway (Nginx), KumoMTA, TSA, Go Backend, Redis, and Dovecot IMAP.",
        badge: "Node Diagnostics",
        highlights: [
          "Deliverability Doctor: Instant TCP port 25 egress probe against Google, Yahoo & Apple",
          "Live RBL / Blacklist scanner checking Spamhaus ZEN, SpamCop & Barracuda",
          "One-click canary probe to verify live mail dispatch end-to-end",
        ],
      },
    ],
  },
  inbound: {
    appId: "inbound",
    appName: "Inbound & Catch-All",
    iconName: "Inbox",
    category: "Mailboxes & Inbound",
    steps: [
      {
        title: "Inbound MX Capture & Webhook Processing",
        tagline: "Two-Way Email & Auto-Reply Logging",
        description: "Capture inbound prospect replies, auto-classify autoresponders vs interested leads, and route raw MIME streams to external webhooks.",
        badge: "Inbound Receiver",
        highlights: [
          "Instant SPF and DKIM verification on all inbound messages",
          "Automatic reply attribution linking incoming messages to enrolled outreach leads",
          "Full raw RFC 5322 MIME message inspection with header breakdown",
        ],
      },
    ],
  },
};

interface TourContextType {
  // System Tour
  isSystemTourOpen: boolean;
  systemTourStep: number;
  startSystemTour: () => void;
  nextSystemTourStep: () => void;
  prevSystemTourStep: () => void;
  closeSystemTour: () => void;

  // App-specific Tour
  activeAppTour: AppTourConfig | null;
  appTourStep: number;
  startAppTour: (appId: AppId) => void;
  nextAppTourStep: () => void;
  prevAppTourStep: () => void;
  closeAppTour: () => void;

  // Persistence helpers
  hasSeenSystemTour: boolean;
  hasSeenAppTour: (appId: AppId) => boolean;
  markAppTourSeen: (appId: AppId) => void;
}

const TourContext = createContext<TourContextType | null>(null);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSystemTourOpen, setIsSystemTourOpen] = useState(false);
  const [systemTourStep, setSystemTourStep] = useState(0);

  const [activeAppTour, setActiveAppTour] = useState<AppTourConfig | null>(null);
  const [appTourStep, setAppTourStep] = useState(0);

  const [hasSeenSystemTour, setHasSeenSystemTour] = useState(true); // default true until checked
  const [seenAppTours, setSeenAppTours] = useState<Record<string, boolean>>({});

  // Check initial tour status on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const systemTourSeen = localStorage.getItem("mailops_seen_system_tour") === "true";
      setHasSeenSystemTour(systemTourSeen);

      const seenAppsRaw = localStorage.getItem("mailops_seen_app_tours");
      if (seenAppsRaw) {
        setSeenAppTours(JSON.parse(seenAppsRaw));
      }

      // If first time landing, trigger system onboarding tour automatically
      if (!systemTourSeen) {
        // Small delay for smooth entry animation
        const timer = setTimeout(() => {
          setIsSystemTourOpen(true);
          setSystemTourStep(0);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage fallback
    }
  }, []);

  const startSystemTour = useCallback(() => {
    setSystemTourStep(0);
    setIsSystemTourOpen(true);
  }, []);

  const closeSystemTour = useCallback(() => {
    setIsSystemTourOpen(false);
    try {
      localStorage.setItem("mailops_seen_system_tour", "true");
      setHasSeenSystemTour(true);
    } catch {}
  }, []);

  const nextSystemTourStep = useCallback(() => {
    setSystemTourStep((curr) => {
      if (curr < SYSTEM_ONBOARDING_TOUR.length - 1) {
        return curr + 1;
      }
      closeSystemTour();
      return curr;
    });
  }, [closeSystemTour]);

  const prevSystemTourStep = useCallback(() => {
    setSystemTourStep((curr) => Math.max(0, curr - 1));
  }, []);

  const hasSeenAppTour = useCallback(
    (appId: AppId) => {
      return !!seenAppTours[appId];
    },
    [seenAppTours]
  );

  const markAppTourSeen = useCallback((appId: AppId) => {
    setSeenAppTours((prev) => {
      const updated = { ...prev, [appId]: true };
      try {
        localStorage.setItem("mailops_seen_app_tours", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const startAppTour = useCallback(
    (appId: AppId) => {
      const config = APP_TOURS[appId];
      if (config) {
        setActiveAppTour(config);
        setAppTourStep(0);
      }
    },
    []
  );

  const closeAppTour = useCallback(() => {
    if (activeAppTour) {
      markAppTourSeen(activeAppTour.appId);
    }
    setActiveAppTour(null);
  }, [activeAppTour, markAppTourSeen]);

  const nextAppTourStep = useCallback(() => {
    if (!activeAppTour) return;
    setAppTourStep((curr) => {
      if (curr < activeAppTour.steps.length - 1) {
        return curr + 1;
      }
      closeAppTour();
      return curr;
    });
  }, [activeAppTour, closeAppTour]);

  const prevAppTourStep = useCallback(() => {
    setAppTourStep((curr) => Math.max(0, curr - 1));
  }, []);

  return (
    <TourContext.Provider
      value={{
        isSystemTourOpen,
        systemTourStep,
        startSystemTour,
        nextSystemTourStep,
        prevSystemTourStep,
        closeSystemTour,
        activeAppTour,
        appTourStep,
        startAppTour,
        nextAppTourStep,
        prevAppTourStep,
        closeAppTour,
        hasSeenSystemTour,
        hasSeenAppTour,
        markAppTourSeen,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
};
