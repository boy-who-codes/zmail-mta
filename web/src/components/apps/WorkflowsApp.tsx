"use client";

import React, { useState, useEffect } from "react";
import {
  fetchTemplates,
  fetchIPPools,
  fetchDomains,
  fetchContacts,
  injectMessage,
} from "../../lib/api";
import { Template } from "../../types/os";
import {
  GitBranch,
  Folder,
  FolderPlus,
  Plus,
  Play,
  Pause,
  Trash2,
  Copy,
  ChevronRight,
  Clock,
  Mail,
  Zap,
  Split,
  Tag,
  Settings2,
  ArrowLeft,
  CheckCircle2,
  Search,
  ExternalLink,
  Edit2,
  X,
  FileText,
  Sliders,
  Layers,
  ChevronDown,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Activity,
  Terminal,
  ShieldAlert,
  Inbox,
  Send,
  HelpCircle,
  Eye,
  Check,
  FileCode2,
} from "lucide-react";

export interface N8nNode {
  id: string;
  type: "trigger" | "email" | "delay" | "condition" | "action" | "end";
  category: string;
  title: string;
  subtitle: string;
  icon: string;
  x: number;
  y: number;
  status?: "success" | "running" | "idle" | "error";
  runsCount: number;
  config: {
    sender?: string;
    subject?: string;
    template?: string;
    waitHours?: number;
    waitDays?: number;
    businessWindowOnly?: boolean;
    conditionType?: string;
    timeoutHours?: number;
    tag?: string;
    stopOnReply?: boolean;
    trackOpens?: boolean;
    trackClicks?: boolean;
    [key: string]: any;
  };
}

export interface N8nConnection {
  id: string;
  from: string;
  to: string;
  fromOutput?: "main" | "true" | "false";
}

export interface WorkflowItem {
  id: string;
  name: string;
  folderId: string;
  folderName: string;
  status: "active" | "paused" | "draft";
  version: string;
  trigger: string;
  stepCount: number;
  lastEdited: string;
  activeExecutions: number;
  nodes: N8nNode[];
  connections: N8nConnection[];
}

export interface WorkflowFolder {
  id: string;
  name: string;
  count: number;
}

const INITIAL_FOLDERS: WorkflowFolder[] = [
  { id: "all", name: "All Workflows", count: 4 },
  { id: "onboarding", name: "Onboarding Sequences", count: 2 },
  { id: "drip", name: "Product Nurture & Drips", count: 1 },
  { id: "transactional", name: "Transactional Lifecycle", count: 1 },
];

const INITIAL_WORKFLOWS: WorkflowItem[] = [
  {
    id: "wf-1",
    name: "VIP Enterprise Onboarding Sequence",
    folderId: "onboarding",
    folderName: "Onboarding Sequences",
    status: "active",
    version: "v2.4",
    trigger: "New Enterprise Account Registered",
    stepCount: 5,
    lastEdited: "12m ago",
    activeExecutions: 142,
    nodes: [
      {
        id: "node-1",
        type: "trigger",
        category: "Triggers",
        title: "Contact Enrolled",
        subtitle: "When Tier == 'Enterprise'",
        icon: "Zap",
        x: 60,
        y: 180,
        status: "success",
        runsCount: 1420,
        config: { triggerEvent: "account.created", filter: "tier == 'enterprise'" },
      },
      {
        id: "node-2",
        type: "email",
        category: "Email",
        title: "Send Welcome Brief",
        subtitle: "Dedicated IP Architecture",
        icon: "Mail",
        x: 320,
        y: 180,
        status: "success",
        runsCount: 1420,
        config: {
          sender: "alex@zmail.local (DKIM✓)",
          subject: "Welcome to ZMAIL Enterprise — Architecture Setup",
          template: "enterprise_welcome_v2",
          stopOnReply: true,
          trackOpens: true,
          trackClicks: true,
        },
      },
      {
        id: "node-3",
        type: "delay",
        category: "Timing",
        title: "Durable Delay",
        subtitle: "Wait 48 Hours",
        icon: "Clock",
        x: 580,
        y: 180,
        status: "running",
        runsCount: 890,
        config: { waitHours: 48, businessWindowOnly: true },
      },
      {
        id: "node-4",
        type: "condition",
        category: "Logic",
        title: "Has Recipient Opened?",
        subtitle: "Evaluates read receipts",
        icon: "Split",
        x: 840,
        y: 180,
        status: "idle",
        runsCount: 650,
        config: { conditionType: "has_opened", timeoutHours: 48 },
      },
      {
        id: "node-5a",
        type: "email",
        category: "Email",
        title: "Book Technical Review",
        subtitle: "True Branch: High Engagement",
        icon: "Mail",
        x: 1140,
        y: 90,
        status: "idle",
        runsCount: 420,
        config: {
          sender: "solutions@zmail.local",
          subject: "Schedule 1:1 KumoMTA shaping review with CTO",
          template: "onboarding_schedule_call",
          stopOnReply: true,
        },
      },
      {
        id: "node-5b",
        type: "email",
        category: "Email",
        title: "Gentle Reminder",
        subtitle: "False Branch: Unopened",
        icon: "Mail",
        x: 1140,
        y: 280,
        status: "idle",
        runsCount: 230,
        config: {
          sender: "alex@zmail.local",
          subject: "Quick reminder: Complete your reverse DNS setup",
          template: "onboarding_followup_reminder",
          stopOnReply: true,
        },
      },
    ],
    connections: [
      { id: "c1", from: "node-1", to: "node-2" },
      { id: "c2", from: "node-2", to: "node-3" },
      { id: "c3", from: "node-3", to: "node-4" },
      { id: "c4", from: "node-4", to: "node-5a", fromOutput: "true" },
      { id: "c5", from: "node-4", to: "node-5b", fromOutput: "false" },
    ],
  },
  {
    id: "wf-2",
    name: "Self-Serve Developer Welcome & API Key",
    folderId: "onboarding",
    folderName: "Onboarding Sequences",
    status: "active",
    version: "v1.8",
    trigger: "New Developer Signup",
    stepCount: 3,
    lastEdited: "1d ago",
    activeExecutions: 389,
    nodes: [
      {
        id: "node-1",
        type: "trigger",
        category: "Triggers",
        title: "Developer Registered",
        subtitle: "Upon Email Verification",
        icon: "Zap",
        x: 80,
        y: 180,
        status: "success",
        runsCount: 4200,
        config: { triggerEvent: "user.verified" },
      },
      {
        id: "node-2",
        type: "email",
        category: "Email",
        title: "API Credentials Delivery",
        subtitle: "First request in 60s",
        icon: "Mail",
        x: 360,
        y: 180,
        status: "success",
        runsCount: 4200,
        config: {
          sender: "dev-rel@zmail.local",
          subject: "Your ZMAIL API Key & Node.js / Go quickstart",
          template: "dev_quickstart",
          stopOnReply: false,
        },
      },
      {
        id: "node-3",
        type: "delay",
        category: "Timing",
        title: "Wait 3 Days",
        subtitle: "Check relay activity",
        icon: "Clock",
        x: 640,
        y: 180,
        status: "running",
        runsCount: 1840,
        config: { waitDays: 3 },
      },
    ],
    connections: [
      { id: "c1", from: "node-1", to: "node-2" },
      { id: "c2", from: "node-2", to: "node-3" },
    ],
  },
  {
    id: "wf-3",
    name: "Inactive Sender 7-Day Warmup Reminder",
    folderId: "drip",
    folderName: "Product Nurture & Drips",
    status: "active",
    version: "v1.1",
    trigger: "IP Warmup Target < 50%",
    stepCount: 3,
    lastEdited: "3d ago",
    activeExecutions: 67,
    nodes: [
      {
        id: "node-1",
        type: "trigger",
        category: "Triggers",
        title: "Low Warmup Volume",
        subtitle: "Daily Target < 50%",
        icon: "Zap",
        x: 80,
        y: 180,
        status: "success",
        runsCount: 89,
        config: {},
      },
      {
        id: "node-2",
        type: "delay",
        category: "Timing",
        title: "Durable Delay",
        subtitle: "Wait 24 Hours",
        icon: "Clock",
        x: 360,
        y: 180,
        status: "success",
        runsCount: 89,
        config: { waitHours: 24 },
      },
      {
        id: "node-3",
        type: "email",
        category: "Email",
        title: "Automated Ramp Alert",
        subtitle: "Prevent ISP reputation drop",
        icon: "Mail",
        x: 640,
        y: 180,
        status: "success",
        runsCount: 89,
        config: {
          sender: "postmaster@zmail.local",
          subject: "Keep your dedicated IP warmup schedule active",
          template: "warmup_alert",
        },
      },
    ],
    connections: [
      { id: "c1", from: "node-1", to: "node-2" },
      { id: "c2", from: "node-2", to: "node-3" },
    ],
  },
  {
    id: "wf-4",
    name: "DMARC Alignment Failure Instant Alert",
    folderId: "transactional",
    folderName: "Transactional Lifecycle",
    status: "active",
    version: "v3.0",
    trigger: "DMARC Failure Rate > 2%",
    stepCount: 2,
    lastEdited: "5d ago",
    activeExecutions: 12,
    nodes: [
      {
        id: "node-1",
        type: "trigger",
        category: "Triggers",
        title: "DMARC Alignment Fault",
        subtitle: "Inbound DMARC failure",
        icon: "Zap",
        x: 100,
        y: 180,
        status: "success",
        runsCount: 14,
        config: {},
      },
      {
        id: "node-2",
        type: "email",
        category: "Email",
        title: "Security Admin Alert",
        subtitle: "High Priority Security Dispatch",
        icon: "Mail",
        x: 420,
        y: 180,
        status: "success",
        runsCount: 14,
        config: {
          sender: "security@zmail.local",
          subject: "CRITICAL: DMARC Alignment Failure Detected",
          template: "security_alert",
        },
      },
    ],
    connections: [{ id: "c1", from: "node-1", to: "node-2" }],
  },
];

// Node Library catalog matching screen-design.md
const NODE_LIBRARY = [
  {
    category: "Triggers",
    items: [
      { type: "trigger", title: "Contact Enrolled", subtitle: "When contact joins segment", icon: "Zap" },
      { type: "trigger", title: "Inbound Reply Captured", subtitle: "When contact replies via IMAP", icon: "Inbox" },
      { type: "trigger", title: "Webhook Ingest", subtitle: "Incoming HTTP POST from CRM", icon: "Activity" },
    ],
  },
  {
    category: "Email Actions",
    items: [
      { type: "email", title: "Send Sequence Email", subtitle: "Automated template dispatch", icon: "Mail" },
      { type: "email", title: "Direct 1:1 Personal Email", subtitle: "High-touch outbound copy", icon: "Send" },
    ],
  },
  {
    category: "Timing & Delays",
    items: [
      { type: "delay", title: "Durable Delay", subtitle: "Wait minutes, hours, or days", icon: "Clock" },
      { type: "delay", title: "Business Hours Only", subtitle: "Pause until 09:00 - 17:00", icon: "Clock" },
    ],
  },
  {
    category: "Logic & Branches",
    items: [
      { type: "condition", title: "If / Else Opened?", subtitle: "Branch on email open activity", icon: "Split" },
      { type: "condition", title: "If / Else Clicked?", subtitle: "Branch on specific URL click", icon: "Split" },
      { type: "condition", title: "Has Replied?", subtitle: "Branch on conversational response", icon: "Split" },
    ],
  },
  {
    category: "Audience Actions",
    items: [
      { type: "action", title: "Add Tag to Contact", subtitle: "Append 'High-Intent' tag", icon: "Tag" },
      { type: "action", title: "Update Lifecycle Stage", subtitle: "Promote to 'Demo Booked'", icon: "CheckCircle2" },
      { type: "end", title: "Suppress Contact", subtitle: "Add to Global Unsubscribe", icon: "ShieldAlert" },
    ],
  },
];

export const WorkflowsApp: React.FC = () => {
  const [folders, setFolders] = useState<WorkflowFolder[]>(INITIAL_FOLDERS);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [workflows, setWorkflows] = useState<WorkflowItem[]>(INITIAL_WORKFLOWS);
  const [searchQuery, setSearchQuery] = useState("");

  // VIEW MODE: Default to Canvas so user immediately sees the visual designer!
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowItem | null>(INITIAL_WORKFLOWS[0]);

  // External Connected Stores
  const [templates, setTemplates] = useState<Template[]>([]);
  const [ipPools, setIPPools] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [testEmailRecipient, setTestEmailRecipient] = useState("operator@mailops.local");
  const [isTestSending, setIsTestSending] = useState(false);
  const [testSendResult, setTestSendResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchTemplates().catch(() => []),
      fetchIPPools().catch(() => []),
      fetchDomains().catch(() => []),
      fetchContacts().catch(() => []),
    ]).then(([t, p, d, c]) => {
      setTemplates(t || []);
      setIPPools(p || []);
      setDomains(d || []);
      setContacts(c || []);
    });
  }, []);

  // n8n Canvas State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("node-2");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isExecutionHistoryOpen, setIsExecutionHistoryOpen] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // New Workflow Creation Screen (in-window full screen, NO dialog box!)
  const [isCreatingNewScreen, setIsCreatingNewScreen] = useState(false);
  const [newWfName, setNewWfName] = useState("");
  const [newWfFolder, setNewWfFolder] = useState("onboarding");
  const [selectedPresetTemplate, setSelectedPresetTemplate] = useState("blank");

  // Inline folder creation (in sidebar, NO dialog box!)
  const [isAddingFolderInline, setIsAddingFolderInline] = useState(false);
  const [inlineFolderName, setInlineFolderName] = useState("");

  const selectedNode = activeWorkflow?.nodes.find((n) => n.id === selectedNodeId) || null;

  // Filter workflows by folder and search query
  const displayedWorkflows = workflows.filter((w) => {
    const matchesFolder = selectedFolderId === "all" || w.folderId === selectedFolderId;
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.trigger.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const currentFolder = folders.find((f) => f.id === selectedFolderId) || folders[0];

  // CREATE WORKFLOW FROM SCREEN (NO DIALOG)
  const handleCreateWorkflowFromScreen = () => {
    if (!newWfName.trim()) return;
    const targetFolder = folders.find((f) => f.id === newWfFolder) || folders[1];

    let initialNodes: N8nNode[] = [];
    let initialConns: N8nConnection[] = [];

    if (selectedPresetTemplate === "onboarding") {
      initialNodes = [
        {
          id: "node-1",
          type: "trigger",
          category: "Triggers",
          title: "Contact Subscribed",
          subtitle: "When enters segment",
          icon: "Zap",
          x: 80,
          y: 180,
          status: "success",
          runsCount: 0,
          config: { triggerEvent: "segment.joined" },
        },
        {
          id: "node-2",
          type: "email",
          category: "Email",
          title: "Send Welcome Guide",
          subtitle: "Intro & quickstart",
          icon: "Mail",
          x: 360,
          y: 180,
          status: "idle",
          runsCount: 0,
          config: {
            sender: "welcome@zmail.local",
            subject: "Welcome aboard! Let's get you set up",
            template: "welcome_guide",
            stopOnReply: true,
          },
        },
        {
          id: "node-3",
          type: "delay",
          category: "Timing",
          title: "Wait 24 Hours",
          subtitle: "Cool-off period",
          icon: "Clock",
          x: 640,
          y: 180,
          status: "idle",
          runsCount: 0,
          config: { waitHours: 24 },
        },
      ];
      initialConns = [
        { id: "c1", from: "node-1", to: "node-2" },
        { id: "c2", from: "node-2", to: "node-3" },
      ];
    } else {
      // Blank
      initialNodes = [
        {
          id: "node-1",
          type: "trigger",
          category: "Triggers",
          title: "Trigger Event",
          subtitle: "Define enrollment condition",
          icon: "Zap",
          x: 80,
          y: 180,
          status: "idle",
          runsCount: 0,
          config: {},
        },
        {
          id: "node-2",
          type: "email",
          category: "Email",
          title: "First Email Action",
          subtitle: "Dispatch template",
          icon: "Mail",
          x: 360,
          y: 180,
          status: "idle",
          runsCount: 0,
          config: {
            sender: "team@zmail.local",
            subject: "Hello from ZMAIL",
            template: "default_template",
          },
        },
      ];
      initialConns = [{ id: "c1", from: "node-1", to: "node-2" }];
    }

    const newWf: WorkflowItem = {
      id: `wf-${Date.now()}`,
      name: newWfName.trim(),
      folderId: targetFolder.id,
      folderName: targetFolder.name,
      status: "draft",
      version: "v1.0 (Draft)",
      trigger: "Custom Enrollment",
      stepCount: initialNodes.length,
      lastEdited: "Just now",
      activeExecutions: 0,
      nodes: initialNodes,
      connections: initialConns,
    };

    setWorkflows([newWf, ...workflows]);
    setFolders((prev) =>
      prev.map((f) => (f.id === targetFolder.id || f.id === "all" ? { ...f, count: f.count + 1 } : f))
    );

    setIsCreatingNewScreen(false);
    setNewWfName("");
    // Instantly launch into the n8n visual canvas!
    setActiveWorkflow(newWf);
    setSelectedNodeId(initialNodes[0].id);
  };

  // ADD NODE FROM N8N LIBRARY
  const handleAddNodeFromLibrary = (item: (typeof NODE_LIBRARY)[0]["items"][0]) => {
    if (!activeWorkflow) return;
    const maxX = Math.max(...activeWorkflow.nodes.map((n) => n.x), 200);
    const newId = `node-${Date.now()}`;

    const newNode: N8nNode = {
      id: newId,
      type: item.type as any,
      category: item.title,
      title: item.title,
      subtitle: item.subtitle,
      icon: item.icon,
      x: maxX + 260,
      y: 180 + (activeWorkflow.nodes.length % 2 === 0 ? 0 : 40),
      status: "idle",
      runsCount: 0,
      config:
        item.type === "email"
          ? {
              sender: "outbound@zmail.local",
              subject: "Important update for {first_name}",
              template: "general_template",
              stopOnReply: true,
              trackOpens: true,
            }
          : item.type === "delay"
          ? { waitHours: 24, businessWindowOnly: true }
          : item.type === "condition"
          ? { conditionType: "has_opened", timeoutHours: 24 }
          : {},
    };

    // Auto-connect to the last node
    const lastNode = activeWorkflow.nodes[activeWorkflow.nodes.length - 1];
    const newConn: N8nConnection = {
      id: `c-${Date.now()}`,
      from: lastNode.id,
      to: newId,
      fromOutput: lastNode.type === "condition" ? "true" : "main",
    };

    const updated = {
      ...activeWorkflow,
      nodes: [...activeWorkflow.nodes, newNode],
      connections: [...activeWorkflow.connections, newConn],
      stepCount: activeWorkflow.nodes.length + 1,
    };

    setActiveWorkflow(updated);
    setSelectedNodeId(newId);
    setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  };

  // DELETE NODE
  const handleDeleteNode = (nodeId: string) => {
    if (!activeWorkflow) return;
    if (activeWorkflow.nodes.length <= 1) {
      alert("A workflow must contain at least one node.");
      return;
    }
    const updatedNodes = activeWorkflow.nodes.filter((n) => n.id !== nodeId);
    const updatedConns = activeWorkflow.connections.filter((c) => c.from !== nodeId && c.to !== nodeId);
    const updatedWf = {
      ...activeWorkflow,
      nodes: updatedNodes,
      connections: updatedConns,
      stepCount: updatedNodes.length,
    };
    setActiveWorkflow(updatedWf);
    setSelectedNodeId(updatedNodes[0].id);
    setWorkflows((prev) => prev.map((w) => (w.id === updatedWf.id ? updatedWf : w)));
  };

  // SAVE & PUBLISH
  const handleSaveWorkflow = (activate = false) => {
    if (!activeWorkflow) return;
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      const updatedWf = {
        ...activeWorkflow,
        status: activate ? ("active" as const) : activeWorkflow.status,
        version: activate ? "v2.5 (Published)" : activeWorkflow.version,
        lastEdited: "Just now",
      };
      setActiveWorkflow(updatedWf);
      setWorkflows((prev) => prev.map((w) => (w.id === updatedWf.id ? updatedWf : w)));
      setSaveToast(activate ? "Workflow compiled & published to KumoMTA edge cluster!" : "Draft definition saved.");
      setTimeout(() => setSaveToast(null), 3000);
    }, 400);
  };

  // Helper to draw smooth cubic bezier SVG curve between nodes (n8n style)
  const renderConnectionCurve = (conn: N8nConnection) => {
    if (!activeWorkflow) return null;
    const fromNode = activeWorkflow.nodes.find((n) => n.id === conn.from);
    const toNode = activeWorkflow.nodes.find((n) => n.id === conn.to);
    if (!fromNode || !toNode) return null;

    // Node dimensions: 220px wide, 80px high
    const nodeW = 210;
    const nodeH = 76;

    let startX = fromNode.x + nodeW;
    let startY = fromNode.y + nodeH / 2;

    // Condition nodes have 2 output ports
    if (fromNode.type === "condition") {
      if (conn.fromOutput === "true") {
        startY = fromNode.y + nodeH * 0.35;
      } else if (conn.fromOutput === "false") {
        startY = fromNode.y + nodeH * 0.65;
      }
    }

    const endX = toNode.x;
    const endY = toNode.y + nodeH / 2;

    const dx = Math.max(40, (endX - startX) * 0.5);
    const pathData = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

    const isTrueBranch = conn.fromOutput === "true";
    const isFalseBranch = conn.fromOutput === "false";

    return (
      <g key={conn.id}>
        {/* Glow backdrop wire */}
        <path
          d={pathData}
          fill="none"
          stroke={isTrueBranch ? "#27a644" : isFalseBranch ? "#f59e0b" : "#ff69b4"}
          strokeWidth="3"
          strokeOpacity="0.2"
        />
        {/* Main sharp wire */}
        <path
          d={pathData}
          fill="none"
          stroke={isTrueBranch ? "#27a644" : isFalseBranch ? "#f59e0b" : "#4f5565"}
          strokeWidth="2"
          strokeDasharray={isFalseBranch ? "4 4" : "none"}
          className="transition-all"
        />
        {/* Connection Arrow indicator */}
        <circle cx={endX} cy={endY} r="3" fill={isTrueBranch ? "#27a644" : "#ff69b4"} />
      </g>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#08090c] text-xs select-none">
      {/* Toast Notification */}
      {saveToast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-lg bg-[#14161d] border border-[#ff69b4]/50 shadow-2xl shadow-black text-[#f7f8f8] flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-[#ff69b4]" />
          <span className="font-medium text-xs">{saveToast}</span>
        </div>
      )}

      {/* ========================================================
          SCREEN VIEW A: CREATE NEW WORKFLOW (FULL IN-WINDOW SCREEN, NO DIALOG)
          ======================================================== */}
      {isCreatingNewScreen ? (
        <div className="flex-1 flex flex-col bg-[#0a0b0e] overflow-auto">
          {/* Top Breadcrumb Header */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-[#0e1015] border-b border-[#20242e] shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCreatingNewScreen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141720] hover:bg-[#1a1e2a] border border-[#262c3b] text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sequences</span>
              </button>
              <div className="h-4 w-px bg-[#262c3b]" />
              <div className="flex items-center gap-2">
                <span className="text-[#8a8f98]">ZMAIL Workflows</span>
                <span className="text-[#62666d]">/</span>
                <span className="font-semibold text-[#f7f8f8]">New Sequence Studio</span>
              </div>
            </div>

            {/* Launch Studio Action (Black text on pink, never white on pink) */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCreatingNewScreen(false)}
                className="px-3 py-1.5 rounded-lg text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141720]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkflowFromScreen}
                disabled={!newWfName.trim()}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#ff69b4] hover:bg-[#ff52a4] disabled:opacity-50 text-[#0a0a0c] font-bold shadow-lg shadow-[#ff69b4]/25 transition-all cursor-pointer"
              >
                <GitBranch className="w-4 h-4" />
                <span>Launch n8n Canvas</span>
              </button>
            </div>
          </div>

          {/* Creation Content Body */}
          <div className="max-w-4xl w-full mx-auto p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#f7f8f8] tracking-tight">Create Automation Sequence</h2>
              <p className="text-sm text-[#8a8f98] mt-1">
                Design multi-step email journeys with durable time delays, conditional if/else branches, and automatic stop-on-reply logic.
              </p>
            </div>

            {/* Step 1: Details */}
            <div className="p-6 rounded-2xl bg-[#0e1015] border border-[#20242e] space-y-4">
              <h3 className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#181d27] border border-[#2b3342] flex items-center justify-center text-[11px] font-mono text-[#ff69b4]">
                  1
                </span>
                Sequence Identity & Folder
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-[11px] font-medium text-[#8a8f98] block mb-1.5">
                    Workflow Sequence Name *
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. VIP Enterprise Customer Drip v3"
                    value={newWfName}
                    onChange={(e) => setNewWfName(e.target.value)}
                    className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3.5 py-2 text-sm text-[#f7f8f8] focus:border-[#ff69b4]/60 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#8a8f98] block mb-1.5">
                    Destination Folder
                  </label>
                  <select
                    value={newWfFolder}
                    onChange={(e) => setNewWfFolder(e.target.value)}
                    className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3.5 py-2 text-sm text-[#f7f8f8] focus:border-[#ff69b4]/60 focus:outline-none"
                  >
                    {folders
                      .filter((f) => f.id !== "all")
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          📁 {f.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Choose Starting Architecture */}
            <div className="p-6 rounded-2xl bg-[#0e1015] border border-[#20242e] space-y-4">
              <h3 className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#181d27] border border-[#2b3342] flex items-center justify-center text-[11px] font-mono text-[#ff69b4]">
                  2
                </span>
                Choose Canvas Starting Template
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Option 1: Onboarding Flow */}
                <div
                  onClick={() => setSelectedPresetTemplate("onboarding")}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedPresetTemplate === "onboarding"
                      ? "bg-[#161a25] border-[#ff69b4] ring-1 ring-[#ff69b4] shadow-lg shadow-black"
                      : "bg-[#11141c] border-[#222735] hover:border-[#32394c]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#f7f8f8]">Multi-Step Onboarding DAG</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#27a644]/15 text-[#27a644]">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-[#8a8f98] mt-1.5">
                    Pre-wired with Trigger &rarr; Welcome Email &rarr; 48h Delay &rarr; Conditional Open Evaluation.
                  </p>
                </div>

                {/* Option 2: Blank Canvas */}
                <div
                  onClick={() => setSelectedPresetTemplate("blank")}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedPresetTemplate === "blank"
                      ? "bg-[#161a25] border-[#ff69b4] ring-1 ring-[#ff69b4] shadow-lg shadow-black"
                      : "bg-[#11141c] border-[#222735] hover:border-[#32394c]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#f7f8f8]">Blank n8n Canvas</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#18191f] text-[#8a8f98]">
                      Custom
                    </span>
                  </div>
                  <p className="text-xs text-[#8a8f98] mt-1.5">
                    Start with a bare Trigger and Action node. Assemble custom branches and delays freely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeWorkflow ? (
        /* ========================================================
           SCREEN VIEW B: FULL-PAGE n8n WORKFLOW STUDIO
           (Inspired directly by n8n architecture from screen-design.md)
           ======================================================== */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 1. TOP TOOLBAR */}
          <div className="h-12 bg-[#0c0d12] border-b border-[#1f232d] px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {/* Tab Switcher: Canvas vs Directory */}
              <div className="flex items-center bg-[#14161f] p-0.5 rounded-lg border border-[#262c3b]">
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#ff69b4] text-black shadow-sm"
                >
                  Visual DAG Studio
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkflow(null);
                    setSelectedNodeId(null);
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Sequences & Folders ({workflows.length})
                </button>
              </div>

              <div className="h-4 w-px bg-[#262c3b]" />

              {/* Workflow Switcher Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono text-[#8a8f98]">Workflow:</span>
                <select
                  value={activeWorkflow.id}
                  onChange={(e) => {
                    const found = workflows.find((w) => w.id === e.target.value);
                    if (found) {
                      setActiveWorkflow(found);
                      setSelectedNodeId(found.nodes[0]?.id || null);
                    }
                  }}
                  className="bg-[#141620] border border-[#2b3042] rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-[#ff69b4]"
                >
                  {workflows.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.status})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setNewWfName("");
                    setNewWfFolder("onboarding");
                    setIsCreatingNewScreen(true);
                  }}
                  className="p-1 px-2 rounded-lg bg-[#181d28] hover:bg-[#202738] border border-[#262c3b] text-[#ff69b4] text-[11px] font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
            </div>

            {/* Canvas View Controls (Undo, Zoom, History) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#13151d] rounded-lg border border-[#232733] p-0.5 text-[11px]">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                  title="Zoom Out"
                  className="p-1 hover:text-[#f7f8f8] text-[#8a8f98]"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 font-mono text-[10px] text-[#8a8f98]">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                  title="Zoom In"
                  className="p-1 hover:text-[#f7f8f8] text-[#8a8f98]"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(100)}
                  title="Reset Zoom"
                  className="p-1 hover:text-[#f7f8f8] text-[#8a8f98]"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>

              {/* Execution History Toggle */}
              <button
                onClick={() => setIsExecutionHistoryOpen(!isExecutionHistoryOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                  isExecutionHistoryOpen
                    ? "bg-[#181d28] border-[#ff69b4]/50 text-[#ff69b4]"
                    : "bg-[#13151d] border-[#232733] text-[#8a8f98] hover:text-[#d0d6e0]"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Runs History</span>
              </button>

              {/* Save Draft Action */}
              <button
                onClick={() => handleSaveWorkflow(false)}
                disabled={isSaving}
                className="px-3 py-1 rounded-lg bg-[#141720] hover:bg-[#1a1f2b] border border-[#262c3b] text-[#d0d6e0] font-medium text-[11px] transition-colors"
              >
                Save Draft
              </button>

              {/* Publish & Activate (Black text on hot-pink, NEVER white on pink) */}
              <button
                onClick={() => handleSaveWorkflow(true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-[#ff69b4] hover:bg-[#ff52a4] text-[#0a0a0c] font-bold text-xs shadow-md shadow-[#ff69b4]/20 transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Publish & Activate</span>
              </button>
            </div>
          </div>

          {/* 2. THREE-PANE n8n WORKSPACE: LEFT LIBRARY + CENTER CANVAS + RIGHT PERSISTENT INSPECTOR */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* 2A. LEFT PANEL: CATEGORIZED NODE LIBRARY */}
            <div className="w-64 bg-[#0a0b0f] border-r border-[#1e222c] flex flex-col justify-between shrink-0">
              <div className="p-3 space-y-3 overflow-auto flex-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-[#8a8f98]">
                    n8n Node Library
                  </span>
                  <span className="text-[10px] text-[#62666d]">Drag or click</span>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3 h-3 text-[#62666d] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search nodes (e.g. email, delay)..."
                    value={libraryFilter}
                    onChange={(e) => setLibraryFilter(e.target.value)}
                    className="w-full bg-[#12141a] border border-[#222632] rounded-lg pl-7 pr-2 py-1 text-[11px] text-[#f7f8f8] placeholder-[#555a66] focus:border-[#ff69b4]/50 focus:outline-none"
                  />
                </div>

                {/* Categorized Nodes */}
                <div className="space-y-3 pt-1">
                  {NODE_LIBRARY.map((cat) => {
                    const filteredItems = cat.items.filter(
                      (item) =>
                        item.title.toLowerCase().includes(libraryFilter.toLowerCase()) ||
                        item.subtitle.toLowerCase().includes(libraryFilter.toLowerCase())
                    );
                    if (filteredItems.length === 0) return null;

                    return (
                      <div key={cat.category} className="space-y-1.5">
                        <span className="text-[9px] uppercase tracking-wider font-mono text-[#62666d] px-1 font-bold">
                          {cat.category}
                        </span>
                        <div className="space-y-1">
                          {filteredItems.map((item) => (
                            <button
                              key={item.title}
                              onClick={() => handleAddNodeFromLibrary(item)}
                              className="w-full p-2 rounded-lg bg-[#111319] hover:bg-[#181a24] border border-[#1f232f] hover:border-[#ff69b4]/40 flex items-center gap-2.5 text-left transition-all cursor-pointer group"
                            >
                              <div
                                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                                  item.type === "trigger"
                                    ? "bg-[#ff69b4]/15 text-[#ff69b4]"
                                    : item.type === "email"
                                    ? "bg-[#3b9eff]/15 text-[#3b9eff]"
                                    : item.type === "delay"
                                    ? "bg-[#f59e0b]/15 text-[#f59e0b]"
                                    : item.type === "condition"
                                    ? "bg-[#a855f7]/15 text-[#a855f7]"
                                    : "bg-[#27a644]/15 text-[#27a644]"
                                }`}
                              >
                                {item.icon === "Zap" && <Zap className="w-3.5 h-3.5" />}
                                {item.icon === "Mail" && <Mail className="w-3.5 h-3.5" />}
                                {item.icon === "Send" && <Send className="w-3.5 h-3.5" />}
                                {item.icon === "Clock" && <Clock className="w-3.5 h-3.5" />}
                                {item.icon === "Split" && <Split className="w-3.5 h-3.5" />}
                                {item.icon === "Tag" && <Tag className="w-3.5 h-3.5" />}
                                {item.icon === "CheckCircle2" && <CheckCircle2 className="w-3.5 h-3.5" />}
                                {item.icon === "ShieldAlert" && <ShieldAlert className="w-3.5 h-3.5" />}
                                {item.icon === "Inbox" && <Inbox className="w-3.5 h-3.5" />}
                                {item.icon === "Activity" && <Activity className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-semibold text-[#d0d6e0] group-hover:text-[#f7f8f8] truncate">
                                  {item.title}
                                </div>
                                <div className="text-[9px] text-[#62666d] truncate">{item.subtitle}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Quick Tips */}
              <div className="p-3 border-t border-[#1e222c] bg-[#0c0d12] text-[10px] text-[#62666d]">
                Click any node on canvas to customize parameters in the right inspector.
              </div>
            </div>

            {/* 2B. CENTER: VISUAL n8n CANVAS */}
            <div className="flex-1 bg-[#06070a] relative overflow-auto p-12">
              {/* Dot matrix grid pattern (n8n signature) */}
              <div
                className="absolute inset-0 bg-[radial-gradient(#1e222e_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "0 0" }}
              />

              {/* Canvas Interactive Surface */}
              <div
                className="relative min-w-[1400px] min-h-[600px]"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "0 0" }}
              >
                {/* SVG Connecting Wires */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  {activeWorkflow.connections.map((c) => renderConnectionCurve(c))}
                </svg>

                {/* Render n8n Node Cards */}
                {activeWorkflow.nodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      style={{ left: `${node.x}px`, top: `${node.y}px` }}
                      className={`absolute w-[210px] rounded-xl border transition-all cursor-pointer z-10 select-none ${
                        isSelected
                          ? "bg-[#131620] border-[#ff69b4] shadow-2xl shadow-[#ff69b4]/15 ring-2 ring-[#ff69b4]/50"
                          : "bg-[#0e1017] border-[#222735] hover:border-[#384055] hover:bg-[#12151e] shadow-lg shadow-black/60"
                      }`}
                    >
                      {/* Left input port dot */}
                      {node.type !== "trigger" && (
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#1e222e] border-2 border-[#ff69b4] flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#ff69b4]" />
                        </div>
                      )}

                      {/* Right output port dot (or 2 output ports for condition) */}
                      {node.type === "condition" ? (
                        <>
                          <div
                            title="True / Yes Path"
                            className="absolute -right-2 top-[35%] -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#1e222e] border-2 border-[#27a644] flex items-center justify-center"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
                          </div>
                          <div
                            title="False / No Path"
                            className="absolute -right-2 top-[65%] -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#1e222e] border-2 border-[#f59e0b] flex items-center justify-center"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                          </div>
                        </>
                      ) : node.type !== "end" ? (
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#1e222e] border-2 border-[#4f5565] flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#4f5565]" />
                        </div>
                      ) : null}

                      {/* Node Header & Content */}
                      <div className="p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                node.type === "trigger"
                                  ? "bg-[#ff69b4]/20 text-[#ff69b4]"
                                  : node.type === "email"
                                  ? "bg-[#3b9eff]/20 text-[#3b9eff]"
                                  : node.type === "delay"
                                  ? "bg-[#f59e0b]/20 text-[#f59e0b]"
                                  : node.type === "condition"
                                  ? "bg-[#a855f7]/20 text-[#a855f7]"
                                  : "bg-[#27a644]/20 text-[#27a644]"
                              }`}
                            >
                              {node.icon === "Zap" && <Zap className="w-3.5 h-3.5" />}
                              {node.icon === "Mail" && <Mail className="w-3.5 h-3.5" />}
                              {node.icon === "Clock" && <Clock className="w-3.5 h-3.5" />}
                              {node.icon === "Split" && <Split className="w-3.5 h-3.5" />}
                              {node.icon === "Tag" && <Tag className="w-3.5 h-3.5" />}
                            </div>
                            <span className="font-semibold text-[#f7f8f8] text-[11px] truncate">
                              {node.title}
                            </span>
                          </div>

                          {/* Quick delete node button */}
                          {node.type !== "trigger" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNode(node.id);
                              }}
                              className="text-[#62666d] hover:text-[#ef4444] p-0.5 rounded opacity-0 group-hover:opacity-100 hover:opacity-100"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="text-[10px] text-[#8a8f98] truncate pl-0.5">{node.subtitle}</div>

                        {/* Runs execution badge */}
                        <div className="pt-1 flex items-center justify-between border-t border-[#1c202a] text-[9px] font-mono">
                          <span className="text-[#62666d]">{node.type}</span>
                          <span className="text-[#27a644] flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            {node.runsCount > 0 ? `${node.runsCount} runs` : "Ready"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2C. RIGHT PANEL: PERSISTENT NODE INSPECTOR (NO MODAL / NO DRAWER) */}
            {selectedNode ? (
              <div className="w-80 bg-[#0c0d13] border-l border-[#1f232d] flex flex-col justify-between shrink-0 overflow-auto">
                <div className="p-4 space-y-4">
                  {/* Inspector Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#1f232d]">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-[#ff69b4]" />
                      <span className="font-bold text-[#f7f8f8] text-xs">Node Inspector</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161922] text-[#8a8f98]">
                      {selectedNode.type}
                    </span>
                  </div>

                  {/* Node Title & Subtitle */}
                  <div>
                    <label className="text-[10px] uppercase font-mono text-[#8a8f98] block mb-1">
                      Step Name
                    </label>
                    <input
                      type="text"
                      value={selectedNode.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updatedNodes = activeWorkflow.nodes.map((n) =>
                          n.id === selectedNode.id ? { ...n, title: val } : n
                        );
                        setActiveWorkflow({ ...activeWorkflow, nodes: updatedNodes });
                      }}
                      className="w-full bg-[#13151d] border border-[#232733] rounded-lg px-2.5 py-1.5 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/50 focus:outline-none"
                    />
                  </div>

                  {/* DYNAMIC FIELDS ACCORDING TO NODE TYPE */}
                  {selectedNode.type === "email" && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-[10px] uppercase font-mono text-[#8a8f98] block mb-1">
                          Sender Mailbox / Domain
                        </label>
                        <select
                          value={selectedNode.config.sender || (domains[0] ? `team@${domains[0].domain_name}` : "team@mailops.local")}
                          onChange={(e) => {
                            const updatedNodes = activeWorkflow.nodes.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, config: { ...n.config, sender: e.target.value } }
                                : n
                            );
                            setActiveWorkflow({ ...activeWorkflow, nodes: updatedNodes });
                          }}
                          className="w-full bg-[#13151d] border border-[#232733] rounded-lg px-2.5 py-1.5 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/50 focus:outline-none font-mono text-[11px]"
                        >
                          {domains.length > 0 ? (
                            domains.map((d) => (
                              <option key={d.id || d.domain_name} value={`outreach@${d.domain_name}`}>
                                outreach@{d.domain_name} (DKIM✓ &bull; SPF✓)
                              </option>
                            ))
                          ) : (
                            <option value="outreach@mailops.local">outreach@mailops.local (DKIM✓ &bull; SPF✓)</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-mono text-[#8a8f98] block mb-1">
                          Egress IP Pool
                        </label>
                        <select
                          value={selectedNode.config.pool || "default"}
                          onChange={(e) => {
                            const updatedNodes = activeWorkflow.nodes.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, config: { ...n.config, pool: e.target.value } }
                                : n
                            );
                            setActiveWorkflow({ ...activeWorkflow, nodes: updatedNodes });
                          }}
                          className="w-full bg-[#13151d] border border-[#232733] rounded-lg px-2.5 py-1.5 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/50 focus:outline-none"
                        >
                          <option value="default">default (Round-Robin Pool)</option>
                          {ipPools.map((p) => (
                            <option key={p.id} value={p.name || p.id}>
                              {p.name} ({p.type || "active"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] uppercase font-mono text-[#8a8f98] flex items-center gap-1">
                            <FileCode2 className="w-3 h-3 text-[#ff69b4]" /> Saved Template
                          </label>
                          <span className="text-[9px] text-[#62666d]">{templates.length} available</span>
                        </div>
                        <select
                          value={selectedNode.config.template || ""}
                          onChange={(e) => {
                            const tmplId = e.target.value;
                            const tmpl = templates.find((t) => t.id === tmplId);
                            const updatedNodes = activeWorkflow.nodes.map((n) =>
                              n.id === selectedNode.id
                                ? {
                                    ...n,
                                    config: {
                                      ...n.config,
                                      template: tmplId,
                                      subject: tmpl?.subject || n.config.subject,
                                    },
                                    subtitle: tmpl ? `Template: ${tmpl.name}` : n.subtitle,
                                  }
                                : n
                            );
                            setActiveWorkflow({ ...activeWorkflow, nodes: updatedNodes });
                          }}
                          className="w-full bg-[#13151d] border border-[#232733] rounded-lg px-2.5 py-1.5 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/50 focus:outline-none"
                        >
                          <option value="">(Custom / Inline Content)</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} (v{t.version || 1})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-mono text-[#8a8f98] block mb-1">
                          Email Subject Line
                        </label>
                        <input
                          type="text"
                          value={selectedNode.config.subject || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updatedNodes = activeWorkflow.nodes.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, config: { ...n.config, subject: val } }
                                : n
                            );
                            setActiveWorkflow({ ...activeWorkflow, nodes: updatedNodes });
                          }}
                          placeholder="e.g. Quick question regarding your infrastructure..."
                          className="w-full bg-[#13151d] border border-[#232733] rounded-lg px-2.5 py-1.5 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/50 focus:outline-none"
                        />
                      </div>

                      {/* LIVE STEP TEST EXECUTION VIA KUMOMTA */}
                      <div className="p-3 rounded-lg bg-[#111319] border border-[#262c3b] space-y-2">
                        <span className="text-[10px] font-semibold text-white uppercase tracking-wider flex items-center gap-1">
                          <Zap className="w-3 h-3 text-[#ff69b4]" /> Test Step via KumoMTA
                        </span>
                        <div className="space-y-1.5">
                          <input
                            type="email"
                            placeholder="recipient@example.com"
                            value={testEmailRecipient}
                            onChange={(e) => setTestEmailRecipient(e.target.value)}
                            className="w-full bg-[#161822] border border-[#2c3244] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#ff69b4] font-mono text-[11px]"
                          />
                          <button
                            type="button"
                            disabled={isTestSending || !testEmailRecipient}
                            onClick={async () => {
                              setIsTestSending(true);
                              try {
                                const senderAddr =
                                  selectedNode.config.sender ||
                                  (domains[0] ? `team@${domains[0].domain_name}` : "team@mailops.local");
                                const res = await injectMessage({
                                  from: senderAddr,
                                  to: testEmailRecipient,
                                  subject: selectedNode.config.subject || "Workflow Test Step Dispatch",
                                  pool: selectedNode.config.pool || "default",
                                  template_id: selectedNode.config.template || undefined,
                                });
                                setTestSendResult(`✓ Sent! Msg ID: ${res.message_id || "ok"}`);
                                setTimeout(() => setTestSendResult(null), 5000);
                              } catch (err: any) {
                                alert("Failed test send: " + err.message);
                              } finally {
                                setIsTestSending(false);
                              }
                            }}
                            className="w-full py-1 bg-[#ff69b4] hover:bg-[#ff7ab8] text-black font-semibold text-xs rounded transition-all flex items-center justify-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            {isTestSending ? "Sending..." : "Send Test to Recipient"}
                          </button>
                          {testSendResult && (
                            <p className="text-[10px] text-emerald-400 font-mono text-center">{testSendResult}</p>
                          )}
                        </div>
                      </div>

                      {/* Advanced Toggles */}
                      <div className="p-3 rounded-lg bg-[#111319] border border-[#1f232f] space-y-2">
                        <label className="flex items-center justify-between text-[11px] text-[#d0d6e0] cursor-pointer">
                          <span>Stop Sequence on Reply</span>
                          <input
                            type="checkbox"
                            checked={selectedNode.config.stopOnReply ?? true}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updatedNodes = activeWorkflow.nodes.map((n) =>
                                n.id === selectedNode.id
                                  ? { ...n, config: { ...n.config, stopOnReply: checked } }
                                  : n
                              );
                              setActiveWorkflow({ ...activeWorkflow, nodes: updatedNodes });
                            }}
                            className="accent-[#ff69b4]"
                          />
                        </label>

                        <label className="flex items-center justify-between text-[11px] text-[#d0d6e0] cursor-pointer">
                          <span>Open & Click Tracking</span>
                          <input
                            type="checkbox"
                            checked={selectedNode.config.trackOpens ?? true}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updatedNodes = activeWorkflow.nodes.map((n) =>
                                n.id === selectedNode.id
                                  ? { ...n, config: { ...n.config, trackOpens: checked } }
                                  : n
                              );
                              setActiveWorkflow({ ...activeWorkflow, nodes: updatedNodes });
                            }}
                            className="accent-[#ff69b4]"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {selectedNode.type === "delay" && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-[10px] uppercase font-mono text-[#8a8f98] block mb-1">
                          Wait Duration
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min="1"
                            value={selectedNode.config.waitHours || 24}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              const updatedNodes = activeWorkflow.nodes.map((n) =>
                                n.id === selectedNode.id
                                  ? { ...n, config: { ...n.config, waitHours: val }, subtitle: `Wait ${val} Hours` }
                                  : n
                              );
                              setActiveWorkflow({ ...activeWorkflow, nodes: updatedNodes });
                            }}
                            className="bg-[#13151d] border border-[#232733] rounded-lg px-2.5 py-1.5 text-xs text-[#f7f8f8]"
                          />
                          <select className="bg-[#13151d] border border-[#232733] rounded-lg px-2 py-1.5 text-xs text-[#f7f8f8]">
                            <option>Hours</option>
                            <option>Days</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#111319] border border-[#1f232f]">
                        <label className="flex items-center justify-between text-[11px] text-[#d0d6e0] cursor-pointer">
                          <span>Business Hours Only (09:00 - 17:00)</span>
                          <input
                            type="checkbox"
                            checked={selectedNode.config.businessWindowOnly ?? true}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updatedNodes = activeWorkflow.nodes.map((n) =>
                                n.id === selectedNode.id
                                  ? { ...n, config: { ...n.config, businessWindowOnly: checked } }
                                  : n
                              );
                              setActiveWorkflow({ ...activeWorkflow, nodes: updatedNodes });
                            }}
                            className="accent-[#ff69b4]"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {selectedNode.type === "condition" && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-[10px] uppercase font-mono text-[#8a8f98] block mb-1">
                          Branch Condition Rule
                        </label>
                        <select
                          value={selectedNode.config.conditionType || "has_opened"}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updatedNodes = activeWorkflow.nodes.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, config: { ...n.config, conditionType: val } }
                                : n
                            );
                            setActiveWorkflow({ ...activeWorkflow, nodes: updatedNodes });
                          }}
                          className="w-full bg-[#13151d] border border-[#232733] rounded-lg px-2.5 py-1.5 text-xs text-[#f7f8f8]"
                        >
                          <option value="has_opened">Recipient Opened Email</option>
                          <option value="has_clicked">Recipient Clicked Specific Link</option>
                          <option value="has_replied">Recipient Replied to Message</option>
                          <option value="tag_matches">Contact Has Specific Tag</option>
                        </select>
                      </div>

                      <div className="p-3 rounded-lg bg-[#111319] border border-[#1f232f] space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-2 text-[#27a644]">
                          <span className="w-2 h-2 rounded-full bg-[#27a644]" />
                          <span>Green Path: Branch True (Satisfied)</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#f59e0b]">
                          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                          <span>Orange Path: Branch False (Timeout / No Action)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedNode.type === "trigger" && (
                    <div className="p-3 rounded-lg bg-[#111319] border border-[#1f232f] text-[11px] text-[#8a8f98]">
                      Trigger events execute immediately as webhooks and audience memberships update.
                    </div>
                  )}
                </div>

                {/* Inspector Actions */}
                <div className="p-4 border-t border-[#1f232d] space-y-2">
                  <button
                    onClick={() => {
                      alert(`Test run for node "${selectedNode.title}" succeeded (250 OK)!`);
                    }}
                    className="w-full py-1.5 rounded-lg bg-[#141720] hover:bg-[#1a1f2b] border border-[#262c3b] text-[#f7f8f8] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-[#ff69b4]" />
                    <span>Test This Step Execution</span>
                  </button>

                  {selectedNode.type !== "trigger" && (
                    <button
                      onClick={() => handleDeleteNode(selectedNode.id)}
                      className="w-full py-1.5 rounded-lg bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] text-xs font-medium transition-colors cursor-pointer"
                    >
                      Delete Node
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* 3. COLLAPSIBLE BOTTOM PANEL: EXECUTION HISTORY (n8n signature) */}
          {isExecutionHistoryOpen && (
            <div className="h-44 bg-[#0a0b0e] border-t border-[#1f232d] flex flex-col shrink-0 animate-in slide-in-from-bottom-2">
              <div className="px-4 py-2 border-b border-[#1f232d] flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#ff69b4]" />
                  <span className="font-semibold text-[#f7f8f8]">Execution History & Live Step Runs</span>
                  <span className="text-[10px] text-[#27a644] font-mono bg-[#27a644]/10 px-1.5 py-0.2 rounded">
                    Active Telemetry
                  </span>
                </div>
                <button
                  onClick={() => setIsExecutionHistoryOpen(false)}
                  className="text-[#8a8f98] hover:text-[#f7f8f8]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-3 font-mono text-[11px] space-y-1.5">
                <div className="flex items-center justify-between text-[#8a8f98] py-1 border-b border-[#181a22]">
                  <span>RUN ID</span>
                  <span>CONTACT ENROLLED</span>
                  <span>CURRENT STEP</span>
                  <span>STATUS</span>
                  <span>EXECUTION TIME</span>
                </div>
                <div className="flex items-center justify-between py-1 text-[#d0d6e0] hover:bg-[#13161f] rounded px-1">
                  <span className="text-[#8a8f98]">#RUN-10928</span>
                  <span className="text-[#f7f8f8]">elena.rostova@vertexdata.com</span>
                  <span>Send Welcome Brief</span>
                  <span className="text-[#27a644] font-bold">250 OK (Delivered)</span>
                  <span className="text-[#8a8f98]">18 ms</span>
                </div>
                <div className="flex items-center justify-between py-1 text-[#d0d6e0] hover:bg-[#13161f] rounded px-1">
                  <span className="text-[#8a8f98]">#RUN-10927</span>
                  <span className="text-[#f7f8f8]">sarah.connor@cyberdyne.io</span>
                  <span>Durable Delay (Wait 48h)</span>
                  <span className="text-[#3b9eff]">Paused in Queue</span>
                  <span className="text-[#8a8f98]">&mdash;</span>
                </div>
                <div className="flex items-center justify-between py-1 text-[#d0d6e0] hover:bg-[#13161f] rounded px-1">
                  <span className="text-[#8a8f98]">#RUN-10926</span>
                  <span className="text-[#f7f8f8]">marcus.vance@solarisinfra.net</span>
                  <span>Book Technical Review</span>
                  <span className="text-[#27a644] font-bold">250 OK (Delivered)</span>
                  <span className="text-[#8a8f98]">24 ms</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================
           SCREEN VIEW C: DIRECTORY OF SAVED WORKFLOWS & FOLDERS
           ======================================================== */
        <div className="flex-1 flex overflow-hidden">
          {/* Left Folder Hierarchy Sidebar */}
          <div className="w-64 bg-[#0a0b0e] border-r border-[#1e222c] flex flex-col justify-between shrink-0">
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-wider font-mono">
                  Sequence Folders
                </span>
                <button
                  onClick={() => setIsAddingFolderInline(!isAddingFolderInline)}
                  title="Create New Folder"
                  className="p-1 rounded hover:bg-[#141720] text-[#8a8f98] hover:text-[#ff69b4] transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Inline Folder Creator (NO MODAL) */}
              {isAddingFolderInline && (
                <div className="p-2.5 rounded-xl bg-[#11131a] border border-[#232734] space-y-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Folder name..."
                    value={inlineFolderName}
                    onChange={(e) => setInlineFolderName(e.target.value)}
                    className="w-full bg-[#161922] border border-[#2a3040] rounded-lg px-2.5 py-1 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/50 focus:outline-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => {
                        setIsAddingFolderInline(false);
                        setInlineFolderName("");
                      }}
                      className="px-2 py-0.5 rounded text-[10px] text-[#8a8f98] hover:text-[#f7f8f8]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!inlineFolderName.trim()) return;
                        const newF: WorkflowFolder = {
                          id: `folder-${Date.now()}`,
                          name: inlineFolderName.trim(),
                          count: 0,
                        };
                        setFolders([...folders, newF]);
                        setSelectedFolderId(newF.id);
                        setIsAddingFolderInline(false);
                        setInlineFolderName("");
                      }}
                      className="px-2.5 py-0.5 rounded bg-[#ff69b4] text-[#0a0a0c] font-bold text-[10px]"
                    >
                      Add Folder
                    </button>
                  </div>
                </div>
              )}

              {/* Folders List */}
              <div className="space-y-1">
                {folders.map((f) => {
                  const isSelected = selectedFolderId === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFolderId(f.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#141722] text-[#f7f8f8] font-medium border border-[#ff69b4]/30 shadow-md"
                          : "text-[#8a8f98] hover:bg-[#111319] hover:text-[#d0d6e0]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Folder className={`w-4 h-4 ${isSelected ? "text-[#ff69b4]" : "text-[#5e6ad2]"}`} />
                        <span className="truncate">{f.name}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1a1d27] text-[#8a8f98]">
                        {f.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 border-t border-[#1e222c] text-[11px] text-[#62666d]">
              ZMAIL sequences orchestrate KumoMTA injection policies through n8n-style visual DAGs.
            </div>
          </div>

          {/* Right Main Panel: Saved Workflows in Selected Folder */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header with Search and PRIMARY CREATE BUTTON */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#0c0d12] border-b border-[#1f232d] shrink-0">
              <div className="flex items-center gap-3">
                {/* Tab Switcher */}
                <div className="flex items-center bg-[#14161f] p-0.5 rounded-lg border border-[#262c3b]">
                  <button
                    type="button"
                    onClick={() => {
                      if (workflows.length > 0) {
                        setActiveWorkflow(workflows[0]);
                        setSelectedNodeId(workflows[0].nodes[0]?.id || null);
                      }
                    }}
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-white"
                  >
                    Visual DAG Studio
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#ff69b4] text-black shadow-sm"
                  >
                    Sequences & Folders
                  </button>
                </div>

                <div className="h-4 w-px bg-[#222735] hidden sm:block" />

                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[#ff69b4]" />
                  <span className="font-semibold text-[#f7f8f8]">{currentFolder.name}</span>
                  <span className="text-[10px] text-[#8a8f98] font-mono px-2 py-0.5 rounded-full bg-[#141720] border border-[#222735]">
                    {displayedWorkflows.length} saved
                  </span>
                </div>

                <div className="h-4 w-px bg-[#222735] hidden sm:block" />

                {/* Search */}
                <div className="relative hidden md:block">
                  <Search className="w-3.5 h-3.5 text-[#8a8f98] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search saved sequences..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#12141c] border border-[#222735] rounded-lg pl-8 pr-3 py-1 text-xs text-[#f7f8f8] placeholder-[#555a66] focus:outline-none focus:border-[#ff69b4]/50 w-52"
                  />
                </div>
              </div>

              {/* PRIMARY CREATE WORKFLOW BUTTON (Opens full screen, NO DIALOG BOX, dark text on pink) */}
              <button
                onClick={() => {
                  setNewWfName("");
                  setNewWfFolder(selectedFolderId === "all" ? "onboarding" : selectedFolderId);
                  setIsCreatingNewScreen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ff69b4] hover:bg-[#ff52a4] text-[#0a0a0c] font-bold text-xs shadow-md shadow-[#ff69b4]/20 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Workflow</span>
              </button>
            </div>

            {/* Saved Workflows Cards Grid */}
            <div className="flex-1 overflow-auto p-5 space-y-3">
              {displayedWorkflows.length === 0 ? (
                <div className="p-16 text-center text-[#8a8f98]">
                  <Folder className="w-12 h-12 mx-auto text-[#2b3040] mb-3" />
                  <p className="font-medium text-[#d0d6e0] text-sm">No saved workflows in this folder</p>
                  <p className="text-xs mt-1 text-[#62666d]">
                    Click "Create New Workflow" above to launch the n8n visual builder.
                  </p>
                </div>
              ) : (
                displayedWorkflows.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => {
                      setActiveWorkflow(w);
                      setSelectedNodeId(w.nodes[0]?.id || null);
                    }}
                    className="p-4 rounded-2xl bg-[#0e1017] border border-[#1f232f] hover:border-[#384055] hover:bg-[#12151e] transition-all cursor-pointer shadow-lg shadow-black/40 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#f7f8f8] text-sm truncate group-hover:text-[#ff69b4] transition-colors">
                            {w.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono capitalize border ${
                              w.status === "active"
                                ? "bg-[#27a644]/15 border-[#27a644]/30 text-[#27a644] flex items-center gap-1"
                                : "bg-[#8a8f98]/15 border-[#8a8f98]/30 text-[#8a8f98]"
                            }`}
                          >
                            {w.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-[#27a644] animate-pulse" />}
                            {w.status}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141722] text-[#8a8f98]">
                            📁 {w.folderName}
                          </span>
                        </div>

                        <div className="text-[11px] text-[#8a8f98] flex items-center gap-2">
                          <span className="text-[#ff69b4] font-medium">Trigger Rule:</span>
                          <span className="text-[#d0d6e0]">{w.trigger}</span>
                        </div>

                        <div className="flex items-center gap-4 text-[10px] text-[#8a8f98] pt-1 font-mono">
                          <span className="flex items-center gap-1 text-[#a0a5ad]">
                            <GitBranch className="w-3 h-3 text-[#5e6ad2]" />
                            {w.nodes.length} Nodes in DAG
                          </span>
                          <span>&bull;</span>
                          <span>Active Runs: <strong className="text-[#f7f8f8]">{w.activeExecutions}</strong></span>
                          <span>&bull;</span>
                          <span>Edited {w.lastEdited}</span>
                        </div>
                      </div>

                      {/* WORKFLOW ACTION BUTTONS */}
                      <div className="flex items-center gap-2 shrink-0 border-l border-[#1f232f] pl-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveWorkflow(w);
                            setSelectedNodeId(w.nodes[0]?.id || null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#141722] hover:bg-[#1a1f2e] text-[#f7f8f8] text-xs font-medium border border-[#252b3d] flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#ff69b4]" />
                          <span>Open n8n Canvas</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const copy: WorkflowItem = {
                              ...w,
                              id: `wf-${Date.now()}`,
                              name: `Copy of ${w.name}`,
                              status: "draft",
                              version: "v1.0 (Draft)",
                              activeExecutions: 0,
                              lastEdited: "Just now",
                            };
                            setWorkflows([copy, ...workflows]);
                          }}
                          title="Duplicate Workflow"
                          className="p-1.5 rounded-lg hover:bg-[#1a1d29] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete workflow "${w.name}"?`)) {
                              setWorkflows((prev) => prev.filter((item) => item.id !== w.id));
                            }
                          }}
                          title="Delete Workflow"
                          className="p-1.5 rounded-lg hover:bg-[#ef4444]/20 text-[#8a8f98] hover:text-[#ef4444] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
