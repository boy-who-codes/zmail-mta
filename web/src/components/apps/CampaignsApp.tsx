"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchCampaigns,
  addCampaign,
  updateCampaign,
  deleteCampaign,
  dispatchCampaign,
  fetchDomains,
  fetchIPPools,
  fetchTemplates,
  fetchContacts,
  injectMessage,
  fetchMailboxes,
  fetchMailboxPools,
  fetchPlaybooks,
  fetchSystemSettings,
  Mailbox,
  MailboxPool,
  AutomationPlaybook,
  CampaignStep,
  SystemSettings,
} from "../../lib/api";
import { Template } from "../../types/os";
import { WorkflowsApp } from "./WorkflowsApp";

import {
  Send,
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Calendar,
  Users,
  Mail,
  ArrowUpRight,
  ArrowLeft,
  X,
  Sparkles,
  Smartphone,
  Monitor,
  ShieldCheck,
  Check,
  Activity,
  FileText,
  FileCode2,
  Tag,
  Layers,
  AtSign,
  UserCheck,
  Zap,
  Lock,
  BookOpen,
  Sliders,
  Shield,
  CornerDownRight,
  MessageSquare,
  HelpCircle,
  GitCommit,
  Building,
  MailCheck,
} from "lucide-react";

export interface CampaignItem {
  id: string;
  name: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  audience: string;
  recipientCount: number;
  status: "draft" | "scheduled" | "sending" | "completed" | "paused";
  sentCount: number;
  openRate: number;
  clickRate: number;
  scheduledAt?: string;
  createdAt: string;
  bodyPreview: string;
  ipPool?: string;
  recipients?: string[];
  templateId?: string;
}

export const CampaignsApp: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // External dependency stores
  const [domains, setDomains] = useState<any[]>([]);
  const [ipPools, setIPPools] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 5000);
  };

  const loadDependencies = async () => {
    try {
      const [domList, poolList, tmplList, ctList, mbList, mbPoolList, pbList, sysSet] = await Promise.all([
        fetchDomains().catch(() => []),
        fetchIPPools().catch(() => []),
        fetchTemplates().catch(() => []),
        fetchContacts().catch(() => []),
        fetchMailboxes().catch(() => []),
        fetchMailboxPools().catch(() => []),
        fetchPlaybooks().catch(() => []),
        fetchSystemSettings().catch(() => null),
      ]);
      setDomains(domList || []);
      setIPPools(poolList || []);
      setTemplates(tmplList || []);
      setContacts(ctList || []);
      setMailboxes(mbList || []);
      setMailboxPools(mbPoolList || []);
      setPlaybooks(pbList || []);
      if (sysSet) {
        setSystemSettings(sysSet);
        if (sysSet.company_address) setFormCompanyAddress(sysSet.company_address);
      }
      if (mbPoolList && mbPoolList.length > 0 && !selectedPoolId) {
        setSelectedPoolId(mbPoolList[0].id);
        setSelectedStrategy(mbPoolList[0].strategy);
      }
    } catch (err) {
      console.error("Failed loading campaign dependencies:", err);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchCampaigns();
      if (Array.isArray(data)) {
        const mapped: CampaignItem[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          subject: d.subject,
          fromName: d.from_name || "Marketing Team",
          fromEmail: d.from_email || "ops@mailops.local",
          replyTo: d.reply_to || "",
          audience: d.audience || "General Audience",
          recipientCount: d.recipient_count || (d.recipients?.length || 0),
          status: d.status || "draft",
          sentCount: d.sent_count || 0,
          openRate: d.open_rate || 0,
          clickRate: d.click_rate || 0,
          scheduledAt: d.scheduled_at,
          createdAt: d.created_at
            ? new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Today",
          bodyPreview: d.body_preview || d.body_html || "",
          ipPool: d.ip_pool || "default",
          recipients: d.recipients || [],
          templateId: d.template_id || "",
        }));
        setCampaigns(mapped);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadDependencies();
  }, [loadData]);

  // SCREEN VIEW STATE: "list" | "create" | "edit" | "inspect"
  const [screenView, setScreenView] = useState<"list" | "create" | "edit" | "inspect">("list");
  const [activeCampaign, setActiveCampaign] = useState<CampaignItem | null>(null);

  // Form State for Create / Edit Screen
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formFromName, setFormFromName] = useState("Operations Desk");
  const [formFromEmail, setFormFromEmail] = useState("outreach@mailops.local");
  const [formReplyTo, setFormReplyTo] = useState("");
  const [formIPPool, setFormIPPool] = useState("default");
  const [formTemplateId, setFormTemplateId] = useState("");

  // Recipient Selection Mode: "custom" | "contacts" | "tags"
  const [recipientMode, setRecipientMode] = useState<"custom" | "contacts" | "tags">("custom");
  const [customEmailsText, setCustomEmailsText] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState("all");

  // Phase 3: Mailbox Pools & Rotation Engine State
  const [mailboxPools, setMailboxPools] = useState<MailboxPool[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [playbooks, setPlaybooks] = useState<AutomationPlaybook[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [senderMode, setSenderMode] = useState<"single" | "pool">("pool");
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState<string>("least_utilized");
  const [timelineSteps, setTimelineSteps] = useState<CampaignStep[]>([]);
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);
  const [previewStepNumber, setPreviewStepNumber] = useState(1);

  // Advanced Enterprise Campaign Fields
  const [formCategoryTag, setFormCategoryTag] = useState("[Q4-Outbound]");
  const [formPriority, setFormPriority] = useState<"high" | "normal" | "bulk">("normal");
  const [formReturnPath, setFormReturnPath] = useState("bounces.zmail.local");
  const [formSendWindowStart, setFormSendWindowStart] = useState("09:00");
  const [formSendWindowEnd, setFormSendWindowEnd] = useState("17:00");
  const [formSendDays, setFormSendDays] = useState<"business_days" | "all_days">("business_days");
  const [formJitterMin, setFormJitterMin] = useState(30);
  const [formJitterMax, setFormJitterMax] = useState(90);
  const [formDailyCap, setFormDailyCap] = useState(1500);
  const [formCustomHeaders, setFormCustomHeaders] = useState("X-Entity-Ref: Enterprise-Core");
  const [formCustomFooter, setFormCustomFooter] = useState("");
  const [formUnsubURL, setFormUnsubURL] = useState("");
  const [formUnsubText, setFormUnsubText] = useState("Click here to unsubscribe or update preferences");
  const [formCompanyAddress, setFormCompanyAddress] = useState("100 Enterprise Way, Suite 400, San Francisco, CA 94107");
  const [formEnableOneClick, setFormEnableOneClick] = useState(true);
  const [formEnableBranding, setFormEnableBranding] = useState(true);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showComplianceStudio, setShowComplianceStudio] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  const [formBody, setFormBody] = useState("");
  const [bodyMode, setBodyMode] = useState<"html" | "text">("html");
  const [formSchedule, setFormSchedule] = useState<"immediate" | "scheduled">("immediate");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Top App Mode Switcher: "campaigns" | "compose" | "workflows"
  const [appMode, setAppMode] = useState<"campaigns" | "compose" | "workflows">("campaigns");

  // 1-to-1 Quick Compose State
  const [composeTo, setComposeTo] = useState("");
  const [composeFromName, setComposeFromName] = useState("MailOps Support");
  const [composeFromEmail, setComposeFromEmail] = useState("support@mailops.local");
  const [composeReplyTo, setComposeReplyTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("Hi {{first_name | 'there'}},\n\nI wanted to follow up directly with you on your email delivery setup.\n\nBest regards,\nOperations Team");
  const [composeIPPool, setComposeIPPool] = useState("default");
  const [composeTemplateId, setComposeTemplateId] = useState("");
  const [composeFormat, setComposeFormat] = useState<"html" | "text">("html");
  const [isSendingCompose, setIsSendingCompose] = useState(false);
  const [composeReceipt, setComposeReceipt] = useState<{
    success: boolean;
    message_id?: string;
    queue?: string;
    timestamp?: string;
    details?: string;
  } | null>(null);
  const [composePreviewDevice, setComposePreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Dynamic tags available across all contacts
  const allTags = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach((t: string) => set.add(t));
      }
    });
    return Array.from(set);
  }, [contacts]);

  // Compute final recipients array based on mode
  const finalRecipients = useMemo(() => {
    if (recipientMode === "custom") {
      const raw = customEmailsText
        .split(/[\n,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 3 && s.includes("@"));
      return Array.from(new Set(raw));
    }
    if (recipientMode === "contacts") {
      return contacts
        .filter((c) => selectedContactIds.includes(c.id || c.ID))
        .map((c) => c.email.toLowerCase().trim());
    }
    if (recipientMode === "tags") {
      if (selectedTag === "all") {
        return contacts.map((c) => c.email.toLowerCase().trim());
      }
      return contacts
        .filter((c) => Array.isArray(c.tags) && c.tags.includes(selectedTag))
        .map((c) => c.email.toLowerCase().trim());
    }
    return [];
  }, [recipientMode, customEmailsText, selectedContactIds, selectedTag, contacts]);

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.audience.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // NAVIGATE TO CREATE SCREEN
  const handleOpenCreateScreen = () => {
    setFormName("");
    setFormSubject("");
    setFormFromName("MailOps Team");
    const primaryDomain = domains.find((d) => d.is_primary)?.domain_name || "mailops.local";
    setFormFromEmail(`team@${primaryDomain}`);
    setFormReplyTo(`replies@${primaryDomain}`);
    setFormIPPool("default");
    setFormTemplateId("");
    setRecipientMode("custom");
    setCustomEmailsText("");
    setSelectedContactIds([]);
    setSelectedTag("all");
    setFormBody(
      "<h2>Hello {{first_name | 'Operator'}},</h2>\n<p>We are delighted to share our infrastructure benchmark update from {{company | 'MailOps'}}.</p>\n<p><a href=\"#\">Confirm Delivery Pipeline &rarr;</a></p>"
    );
    setFormSchedule("immediate");
    setScreenView("create");
  };

  // NAVIGATE TO EDIT SCREEN
  const handleOpenEditScreen = (c: CampaignItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveCampaign(c);
    setFormName(c.name);
    setFormSubject(c.subject);
    setFormFromName(c.fromName);
    setFormFromEmail(c.fromEmail);
    setFormReplyTo(c.replyTo || "");
    setFormIPPool(c.ipPool || "default");
    setFormTemplateId(c.templateId || "");

    if (c.recipients && c.recipients.length > 0) {
      setRecipientMode("custom");
      setCustomEmailsText(c.recipients.join("\n"));
    } else {
      setRecipientMode("custom");
      setCustomEmailsText("");
    }

    setFormBody(c.bodyPreview);
    setFormSchedule(c.status === "scheduled" ? "scheduled" : "immediate");
    setScreenView("edit");
  };

  // Select a template from library
  const handleSelectTemplate = (templateId: string) => {
    setFormTemplateId(templateId);
    if (!templateId) return;
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      if (tmpl.subject) setFormSubject(tmpl.subject);
      if (tmpl.html) setFormBody(tmpl.html);
      else if (tmpl.text) setFormBody(tmpl.text);
      showNotice(`Template "${tmpl.name}" loaded into campaign composer.`);
    }
  };

  // 1-to-1 Compose Template Selection
  const handleSelectComposeTemplate = (templateId: string) => {
    setComposeTemplateId(templateId);
    if (!templateId) return;
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      if (tmpl.subject) setComposeSubject(tmpl.subject);
      if (tmpl.html) {
        setComposeBody(tmpl.html);
        setComposeFormat("html");
      } else if (tmpl.text) {
        setComposeBody(tmpl.text);
        setComposeFormat("text");
      }
      showNotice(`Template "${tmpl.name}" loaded into Compose.`);
    }
  };

  // 1-to-1 Quick Compose Send Handler (Instant MTA Dispatch)
  const handleSendQuickCompose = async () => {
    if (!composeTo.trim() || !composeTo.includes("@")) {
      alert("Please provide a valid recipient email address.");
      return;
    }
    if (!composeSubject.trim()) {
      alert("Please provide an email subject.");
      return;
    }
    if (!composeBody.trim()) {
      alert("Email body cannot be empty.");
      return;
    }

    try {
      setIsSendingCompose(true);
      const res = await injectMessage({
        from: `${composeFromName.trim()} <${composeFromEmail.trim()}>`,
        to: composeTo.trim(),
        subject: composeSubject.trim(),
        html: composeFormat === "html" ? composeBody : undefined,
        text: composeFormat === "text" ? composeBody : undefined,
        pool: composeIPPool,
        template_id: composeTemplateId || undefined,
      });

      setComposeReceipt({
        success: true,
        message_id: res.message_id || "msg-" + Math.random().toString(16).slice(2, 8),
        queue: res.queue || composeTo.split("@")[1] || "default",
        timestamp: new Date().toLocaleTimeString(),
        details: res.details || `Message dispatched via MTA to ${composeTo.trim()}`,
      });
      showNotice(`Dispatched email directly to ${composeTo.trim()} via MTA!`);
    } catch (err: any) {
      alert(err.message || "Failed to dispatch email via MTA");
    } finally {
      setIsSendingCompose(false);
    }
  };

  // SAVE CAMPAIGN (CREATE)
  const handleSaveCreate = async () => {
    if (!formName.trim() || !formSubject.trim()) {
      alert("Campaign Name and Subject Line are required.");
      return;
    }

    const audienceLabel =
      recipientMode === "custom"
        ? `Custom List (${finalRecipients.length} recipients)`
        : recipientMode === "contacts"
        ? `Directory Selection (${finalRecipients.length} contacts)`
        : `Tag: ${selectedTag} (${finalRecipients.length} contacts)`;

    try {
      const created = await addCampaign({
        name: formName.trim(),
        subject: formSubject.trim(),
        from_name: formFromName.trim() || "Operations Desk",
        from_email: formFromEmail.trim() || "outreach@zmail.local",
        reply_to: formReplyTo.trim() || undefined,
        return_path_domain: formReturnPath.trim() || undefined,
        category_tag: formCategoryTag.trim() || undefined,
        priority: formPriority,
        audience: audienceLabel,
        recipient_count: finalRecipients.length,
        status: formSchedule === "immediate" ? "sending" : "scheduled",
        body_html: formBody,
        body_preview: formBody.slice(0, 160) + "...",
        ip_pool: formIPPool,
        recipients: finalRecipients,
        template_id: formTemplateId || undefined,
        sender_mode: senderMode,
        mailbox_pool_id: senderMode === "pool" ? selectedPoolId : undefined,
        rotation_strategy: senderMode === "pool" ? (selectedStrategy as any) : undefined,
        steps: timelineSteps,
        send_window_start: formSendWindowStart,
        send_window_end: formSendWindowEnd,
        send_window_days: formSendDays,
        jitter_min_seconds: formJitterMin,
        jitter_max_seconds: formJitterMax,
        daily_cap: formDailyCap,
        custom_footer_html: formCustomFooter,
        unsubscribe_url: formUnsubURL,
        unsubscribe_text: formUnsubText,
        company_address: formCompanyAddress,
        enable_one_click: formEnableOneClick,
        enable_branding: formEnableBranding,
      });

      if (formSchedule === "immediate" && created.id) {
        await dispatchCampaign(created.id, finalRecipients);
        showNotice(`Campaign "${created.name}" dispatched to ${finalRecipients.length} recipients via ZMAIL High-Velocity MTA!`);
      } else {
        showNotice(`Campaign "${created.name}" created successfully with ${timelineSteps.length > 0 ? timelineSteps.length + " automated steps" : "broadcast mode"}!`);
      }
      setScreenView("list");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create campaign");
    }
  };

  // SAVE CAMPAIGN (EDIT)
  const handleSaveEdit = async () => {
    if (!activeCampaign) return;
    const audienceLabel =
      recipientMode === "custom"
        ? `Custom List (${finalRecipients.length} recipients)`
        : recipientMode === "contacts"
        ? `Directory Selection (${finalRecipients.length} contacts)`
        : `Tag: ${selectedTag} (${finalRecipients.length} contacts)`;

    try {
      await updateCampaign({
        id: activeCampaign.id,
        name: formName.trim(),
        subject: formSubject.trim(),
        from_name: formFromName.trim(),
        from_email: formFromEmail.trim(),
        reply_to: formReplyTo.trim() || undefined,
        audience: audienceLabel,
        recipient_count: finalRecipients.length,
        body_html: formBody,
        body_preview: formBody.slice(0, 160) + "...",
        ip_pool: formIPPool,
        recipients: finalRecipients,
        template_id: formTemplateId || undefined,
      });
      showNotice(`Campaign "${formName}" updated successfully!`);
      setScreenView("list");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update campaign");
    }
  };

  // DISPATCH CAMPAIGN IMMEDIATELY (REAL BULK SEND)
  const handleDispatch = async (campaign: CampaignItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await dispatchCampaign(campaign.id, campaign.recipients);
      showNotice(`✓ ${res.message || "Broadcast dispatched to MTA Engine!"}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to dispatch campaign");
    }
  };

  // Filter contacts in Directory mode
  const filteredContacts = contacts.filter((c) => {
    const q = contactSearch.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full bg-[#08090c] text-xs select-none font-sans">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-lg bg-[#14161d] border border-[#ff69b4]/50 shadow-2xl shadow-black text-[#f7f8f8] flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-[#ff69b4]" />
          <span className="font-medium text-xs">{actionNotice}</span>
        </div>
      )}

      {/* SCREEN VIEW 1: CREATE / EDIT CAMPAIGN (FULL IN-WINDOW SCREEN) */}
      {screenView === "create" || screenView === "edit" ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0b0e]">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-[#0e1015] border-b border-[#20242e] shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setScreenView("list")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141720] hover:bg-[#1a1e2a] border border-[#262c3b] text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Campaigns</span>
              </button>
              <div className="h-4 w-px bg-[#262c3b]" />
              <div className="flex items-center gap-2">
                <span className="text-[#8a8f98]">Campaign Operations</span>
                <span className="text-[#62666d]">/</span>
                <span className="font-semibold text-[#f7f8f8]">
                  {screenView === "create" ? "New Broadcast Mission" : `Edit: ${formName}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPlaybookModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141720] hover:bg-[#1f2433] border border-[#262c3b] text-xs text-[#ff69b4] font-semibold transition-all shadow-sm cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Sequence Playbooks ({playbooks.length})</span>
              </button>
              <button
                onClick={() => setScreenView("list")}
                className="px-3 py-1.5 rounded-lg text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141720]"
              >
                Cancel
              </button>
              <button
                onClick={screenView === "create" ? handleSaveCreate : handleSaveEdit}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#ff69b4] hover:bg-[#ff52a4] text-[#0a0a0c] font-bold shadow-lg shadow-[#ff69b4]/25 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {formSchedule === "immediate"
                    ? `Dispatch ${timelineSteps.length > 0 ? "Timeline Sequence" : "Broadcast"}`
                    : "Save Scheduled Campaign"}
                </span>
              </button>
            </div>
          </div>

          {/* Unified Timeline Studio Status Header */}
          <div className="flex items-center justify-between px-6 py-2 bg-[#0c0d12] border-b border-[#1b1e26] text-xs">
            <div className="flex items-center gap-2 text-[#a0a6b5]">
              <span className="w-2 h-2 rounded-full bg-[#27a644]" />
              <span className="font-semibold text-white">Unified Timeline Studio</span>
              <span className="text-[#62666d]">&bull;</span>
              <span>Step 1 initial broadcast with optional threaded follow-up cadences</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-[#8a8f98]">Sender Mode:</span>
              <span className={senderMode === "pool" ? "text-[#ff69b4] font-bold" : "text-white"}>
                {senderMode === "pool" ? "★ Auto-Rotating Mailbox Pool" : "Single Static Sender"}
              </span>
            </div>
          </div>

          {/* Form + Preview 2-Column Grid */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Configuration Controls */}
            <div className="w-1/2 p-6 overflow-y-auto space-y-5 border-r border-[#20242e]">
              {/* CARD 1: SENDER IDENTITY & ROTATION ENGINE */}
              <div className="p-5 rounded-2xl bg-[#0e1015] border border-[#20242e] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#f7f8f8] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#181d27] border border-[#2b3342] flex items-center justify-center text-[11px] font-mono text-[#ff69b4]">
                      1
                    </span>
                    Campaign Identity &amp; Sender Selection
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> SPF &amp; DKIM Enforced
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[11px] font-medium text-[#8a8f98] block mb-1">
                      Campaign Mission Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Q4 Enterprise Security Benchmark Report"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/60 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#8a8f98] block mb-1">
                      Category Tag
                    </label>
                    <input
                      type="text"
                      placeholder="[Q4-Outbound]"
                      value={formCategoryTag}
                      onChange={(e) => setFormCategoryTag(e.target.value)}
                      className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-[#f7f8f8] font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                    />
                  </div>
                </div>

                {/* SENDER MODE TOGGLE: SINGLE SENDER vs MAILBOX POOL */}
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-[#8a8f98] block mb-2 uppercase tracking-wider font-mono">
                    Sender Selection Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1 rounded-xl bg-[#141720] border border-[#232733]">
                    <button
                      type="button"
                      onClick={() => setSenderMode("pool")}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        senderMode === "pool"
                          ? "bg-[#ff69b4] text-black shadow-md shadow-[#ff69b4]/20"
                          : "text-[#8a8f98] hover:text-white"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Mailbox Pool (Auto-Rotate)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSenderMode("single")}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        senderMode === "single"
                          ? "bg-[#ff69b4] text-black shadow-md shadow-[#ff69b4]/20"
                          : "text-[#8a8f98] hover:text-white"
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Single Static Sender</span>
                    </button>
                  </div>
                </div>

                {/* MODE A: MAILBOX POOL (AUTO-ROTATE) */}
                {senderMode === "pool" ? (
                  <div className="p-4 rounded-xl bg-[#12141c] border border-[#222736] space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-white block mb-1">
                          Select Mailbox Pool *
                        </label>
                        <select
                          value={selectedPoolId}
                          onChange={(e) => setSelectedPoolId(e.target.value)}
                          className="w-full bg-[#181b24] border border-[#2a3040] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#ff69b4] focus:outline-none"
                        >
                          {mailboxPools.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.daily_capacity || 1500} msgs/day)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-white block mb-1">
                          Rotation Algorithm
                        </label>
                        <select
                          value={selectedStrategy}
                          onChange={(e) => setSelectedStrategy(e.target.value)}
                          className="w-full bg-[#181b24] border border-[#2a3040] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#ff69b4] focus:outline-none"
                        >
                          <option value="least_utilized">Least Utilized (% of Daily Quota)</option>
                          <option value="round_robin">Pure Round Robin</option>
                          <option value="weighted_round_robin">Weighted Round Robin</option>
                          <option value="least_recently_used">Least Recently Used (LRU)</option>
                        </select>
                      </div>
                    </div>

                    {/* Active pool members preview */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[10px] text-[#8a8f98] font-mono mb-1.5">
                        <span>Active Senders in this Pool:</span>
                        <span className="text-[#27a644]">Quotas &amp; Limits Active</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {mailboxes.slice(0, 4).map((mb) => (
                          <span
                            key={mb.id}
                            className="px-2 py-0.5 rounded-md bg-[#161a24] border border-[#252a38] text-[10px] font-mono text-[#d0d6e0] flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
                            {mb.email} ({mb.daily_limit}/day)
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-[10px] text-[#ff69b4]/90 bg-[#ff69b4]/5 border border-[#ff69b4]/20 p-2 rounded-lg leading-relaxed">
                      💡 <strong>Deliverability Protection:</strong> Mailbox rotation automatically distributes Step 1 across this pool. Follow-up steps will strictly lock to the assigned origin sender to preserve thread context and prevent spam penalties.
                    </p>
                  </div>
                ) : (
                  /* MODE B: SINGLE SENDER */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-[#8a8f98] block mb-1">
                          From Sender Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Acme Ops"
                          value={formFromName}
                          onChange={(e) => setFormFromName(e.target.value)}
                          className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/60 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-[#8a8f98] block mb-1">
                          From Email Address *
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. news@yourdomain.com"
                          value={formFromEmail}
                          onChange={(e) => setFormFromEmail(e.target.value)}
                          className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-[#f7f8f8] font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-[#8a8f98] block mb-1">
                          Verified Sending Domain
                        </label>
                        <select
                          onChange={(e) => {
                            const dom = e.target.value;
                            if (dom) {
                              const local = formFromEmail.split("@")[0] || "outreach";
                              setFormFromEmail(`${local}@${dom}`);
                              setFormReplyTo(`replies@${dom}`);
                            }
                          }}
                          className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/60 focus:outline-none"
                        >
                          <option value="">Choose Domain...</option>
                          {domains.map((d) => (
                            <option key={d.id || d.domain_name} value={d.domain_name}>
                              {d.domain_name} {d.is_primary ? "(Primary)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-[#8a8f98] block mb-1">
                          Egress IP Pool
                        </label>
                        <select
                          value={formIPPool}
                          onChange={(e) => setFormIPPool(e.target.value)}
                          className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/60 focus:outline-none"
                        >
                          <option value="default">Default Pool (Round-Robin)</option>
                          {ipPools.map((p) => (
                            <option key={p.id} value={p.name || p.id}>
                              {p.name} ({p.type || "active"})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* COLLAPSIBLE ADVANCED CONTROLS */}
                <div className="pt-2 border-t border-[#1b1e26]">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-[#8a8f98] hover:text-white cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#ff69b4]" />
                      Advanced Delivery Controls &amp; Jitter Scheduling
                    </span>
                    <span>{showAdvancedControls ? "▲ Hide" : "▼ Expand"}</span>
                  </button>

                  {showAdvancedControls && (
                    <div className="mt-3 p-3.5 rounded-xl bg-[#12141c] border border-[#202533] space-y-3 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-[#8a8f98]">Custom Reply-To Email</label>
                          <input
                            type="email"
                            value={formReplyTo}
                            onChange={(e) => setFormReplyTo(e.target.value)}
                            placeholder="replies@growth.company.com"
                            className="w-full mt-1 bg-[#181b24] border border-[#2a3040] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-[#8a8f98]">Return-Path (Bounce Domain)</label>
                          <input
                            type="text"
                            value={formReturnPath}
                            onChange={(e) => setFormReturnPath(e.target.value)}
                            placeholder="bounces.company.com"
                            className="w-full mt-1 bg-[#181b24] border border-[#2a3040] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-[#8a8f98]">Send Window Start</label>
                          <input
                            type="time"
                            value={formSendWindowStart}
                            onChange={(e) => setFormSendWindowStart(e.target.value)}
                            className="w-full mt-1 bg-[#181b24] border border-[#2a3040] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-[#8a8f98]">Send Window End</label>
                          <input
                            type="time"
                            value={formSendWindowEnd}
                            onChange={(e) => setFormSendWindowEnd(e.target.value)}
                            className="w-full mt-1 bg-[#181b24] border border-[#2a3040] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-[#8a8f98]">Send Days</label>
                          <select
                            value={formSendDays}
                            onChange={(e: any) => setFormSendDays(e.target.value)}
                            className="w-full mt-1 bg-[#181b24] border border-[#2a3040] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                          >
                            <option value="business_days">Mon - Fri Only</option>
                            <option value="all_days">All 7 Days</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-[#8a8f98]">Jitter Min Delay (s)</label>
                          <input
                            type="number"
                            value={formJitterMin}
                            onChange={(e) => setFormJitterMin(Number(e.target.value))}
                            className="w-full mt-1 bg-[#181b24] border border-[#2a3040] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-[#8a8f98]">Jitter Max Delay (s)</label>
                          <input
                            type="number"
                            value={formJitterMax}
                            onChange={(e) => setFormJitterMax(Number(e.target.value))}
                            className="w-full mt-1 bg-[#181b24] border border-[#2a3040] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-[#8a8f98]">Daily Velocity Cap</label>
                          <input
                            type="number"
                            value={formDailyCap}
                            onChange={(e) => setFormDailyCap(Number(e.target.value))}
                            className="w-full mt-1 bg-[#181b24] border border-[#2a3040] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 2: AUDIENCE & RECIPIENTS TARGET (3 MODES) */}
              <div className="p-5 rounded-2xl bg-[#0e1015] border border-[#20242e] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#f7f8f8] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#181d27] border border-[#2b3342] flex items-center justify-center text-[11px] font-mono text-[#ff69b4]">
                      2
                    </span>
                    Audience & Recipient Selection
                  </h3>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#ff69b4]/10 text-[#ff69b4] border border-[#ff69b4]/30">
                    {finalRecipients.length} Recipient{finalRecipients.length === 1 ? "" : "s"} Selected
                  </span>
                </div>

                {/* Recipient Mode Tabs */}
                <div className="flex items-center gap-1 bg-[#141720] p-1 rounded-xl border border-[#232733]">
                  <button
                    type="button"
                    onClick={() => setRecipientMode("custom")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      recipientMode === "custom"
                        ? "bg-[#ff69b4] text-black font-semibold shadow-sm"
                        : "text-[#8a8f98] hover:text-white"
                    }`}
                  >
                    ✍ Custom Email List
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode("contacts")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      recipientMode === "contacts"
                        ? "bg-[#ff69b4] text-black font-semibold shadow-sm"
                        : "text-[#8a8f98] hover:text-white"
                    }`}
                  >
                    👥 Contacts Directory ({contacts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode("tags")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      recipientMode === "tags"
                        ? "bg-[#ff69b4] text-black font-semibold shadow-sm"
                        : "text-[#8a8f98] hover:text-white"
                    }`}
                  >
                    🏷 Filter by Tag / Segment
                  </button>
                </div>

                {/* MODE A: CUSTOM EMAIL TEXTAREA */}
                {recipientMode === "custom" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#8a8f98]">
                      <span>Paste or type recipient email addresses (comma, space, or newline separated):</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomEmailsText(
                            (prev) => (prev ? prev + "\n" : "") + "operator-test@mailops.local"
                          )
                        }
                        className="text-[#ff69b4] hover:underline"
                      >
                        + Add Test Address
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={customEmailsText}
                      onChange={(e) => setCustomEmailsText(e.target.value)}
                      placeholder="lead1@acme.com&#10;cto@enterprise.io&#10;sarah.connor@cloudscale.net"
                      className="w-full bg-[#141720] border border-[#262c3b] rounded-xl p-3 text-xs font-mono text-[#f7f8f8] focus:border-[#ff69b4]/60 focus:outline-none leading-relaxed"
                    />
                  </div>
                )}

                {/* MODE B: SELECT CONTACTS DIRECTORY */}
                {recipientMode === "contacts" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#8a8f98]" />
                        <input
                          type="text"
                          placeholder="Search contacts by name, email, or company..."
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                          className="w-full bg-[#141720] border border-[#262c3b] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#62666d] focus:outline-none focus:border-[#ff69b4]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedContactIds.length === contacts.length) {
                            setSelectedContactIds([]);
                          } else {
                            setSelectedContactIds(contacts.map((c) => c.id || c.ID));
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#191d29] hover:bg-[#222838] border border-[#282f42] text-[11px] text-[#d0d6e0]"
                      >
                        {selectedContactIds.length === contacts.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-[#181b24] border border-[#20242e] rounded-xl bg-[#12141c]">
                      {filteredContacts.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[#62666d]">No contacts found</div>
                      ) : (
                        filteredContacts.map((ct) => {
                          const id = ct.id || ct.ID;
                          const isChecked = selectedContactIds.includes(id);
                          return (
                            <label
                              key={id}
                              className="flex items-center gap-3 p-2.5 hover:bg-[#181c26] cursor-pointer text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedContactIds(selectedContactIds.filter((x) => x !== id));
                                  } else {
                                    setSelectedContactIds([...selectedContactIds, id]);
                                  }
                                }}
                                className="accent-[#ff69b4] rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-white truncate">{ct.name || "Unnamed Contact"}</div>
                                <div className="text-[10px] text-[#8a8f98] font-mono truncate">{ct.email}</div>
                              </div>
                              {ct.company && (
                                <span className="text-[10px] text-[#62666d] truncate">{ct.company}</span>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* MODE C: TAG / SEGMENT FILTER */}
                {recipientMode === "tags" && (
                  <div className="space-y-3">
                    <label className="text-[11px] text-[#8a8f98] block">
                      Select Contact Tag to Broadcast:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTag("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          selectedTag === "all"
                            ? "bg-[#ff69b4] text-black border-[#ff69b4] font-semibold"
                            : "bg-[#141720] text-[#8a8f98] border-[#262c3b] hover:text-white"
                        }`}
                      >
                        All Subscribed ({contacts.length})
                      </button>
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setSelectedTag(tag)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            selectedTag === tag
                              ? "bg-[#ff69b4] text-black border-[#ff69b4] font-semibold"
                              : "bg-[#141720] text-[#8a8f98] border-[#262c3b] hover:text-white"
                          }`}
                        >
                          🏷 {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 3: TEMPLATES, EMAIL CONTENT & COMPLIANCE */}
              <div className="p-5 rounded-2xl bg-[#0e1015] border border-[#20242e] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#f7f8f8] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#181d27] border border-[#2b3342] flex items-center justify-center text-[11px] font-mono text-[#ff69b4]">
                      3
                    </span>
                    Step 1: Initial Email &amp; Compliance Studio
                  </h3>
                  <span className="text-[10px] text-[#8a8f98]">Handlebars &amp; Liquid variables supported</span>
                </div>

                {/* Template Selector Dropdown */}
                <div className="bg-[#141722] p-3 rounded-xl border border-[#252a39] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-white flex items-center gap-1.5">
                      <FileCode2 className="w-3.5 h-3.5 text-[#ff69b4]" />
                      Choose from Saved Templates:
                    </label>
                    <span className="text-[10px] text-[#8a8f98] font-mono">{templates.length} templates available</span>
                  </div>
                  <select
                    value={formTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full bg-[#0d0e14] border border-[#2a3040] rounded-lg px-3 py-2 text-xs text-white focus:border-[#ff69b4] focus:outline-none"
                  >
                    <option value="">(None - Custom Blank Email)</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (v{t.version || 1} &bull; {t.variables?.length || 0} variables)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#8a8f98] block mb-1">
                    Email Subject Line *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026 Deliverability Index for {{company}}"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/60 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-[#8a8f98]">
                      Message Body (HTML with Dynamic Tokens)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#62666d]">Insert tokens:</span>
                      {["first_name", "company", "email", "sender_name", "unsubscribe_url"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setFormBody((prev) => prev + ` {{${tag}}}`)}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181b24] text-[#ff69b4] hover:bg-[#202532] cursor-pointer"
                        >
                          {`{{${tag}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={7}
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    className="w-full bg-[#141720] border border-[#262c3b] rounded-xl p-3 text-xs text-[#f7f8f8] font-mono focus:border-[#ff69b4]/60 focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* COLLAPSIBLE COMPLIANCE & LEGAL FOOTER STUDIO */}
                <div className="pt-2 border-t border-[#1b1e26]">
                  <button
                    type="button"
                    onClick={() => setShowComplianceStudio(!showComplianceStudio)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-[#8a8f98] hover:text-white cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#27a644]" />
                      Compliance, Legal Postal Address &amp; Unsubscribe Studio
                    </span>
                    <span>{showComplianceStudio ? "▲ Hide" : "▼ Expand"}</span>
                  </button>

                  {showComplianceStudio && (
                    <div className="mt-3 p-3.5 rounded-xl bg-[#12141c] border border-[#202533] space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1016] border border-[#1b1f2b]">
                        <div>
                          <div className="text-xs font-semibold text-white">RFC 8058 One-Click List-Unsubscribe Header</div>
                          <div className="text-[10px] text-[#8a8f98]">Mandatory for Google &amp; Yahoo primary inbox delivery post-2024.</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={formEnableOneClick}
                          onChange={(e) => setFormEnableOneClick(e.target.checked)}
                          className="accent-[#27a644] w-4 h-4 cursor-pointer"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-[#8a8f98]">Unsubscribe Link Copy</label>
                          <input
                            type="text"
                            value={formUnsubText}
                            onChange={(e) => setFormUnsubText(e.target.value)}
                            placeholder="Click here to unsubscribe or update preferences"
                            className="w-full mt-1 bg-[#181b24] border border-[#2a3040] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-[#8a8f98]">Custom Unsubscribe Web URL (Optional)</label>
                          <input
                            type="text"
                            value={formUnsubURL}
                            onChange={(e) => setFormUnsubURL(e.target.value)}
                            placeholder="https://yourdomain.com/unsubscribe"
                            className="w-full mt-1 bg-[#181b24] border border-[#2a3040] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-[#8a8f98]">
                          Mandatory CAN-SPAM Physical Postal Street Address
                        </label>
                        <input
                          type="text"
                          value={formCompanyAddress}
                          onChange={(e) => setFormCompanyAddress(e.target.value)}
                          placeholder="100 Enterprise Way, Suite 400, San Francisco, CA 94107"
                          className="w-full mt-1 bg-[#181b24] border border-[#2a3040] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-[#8a8f98]">Custom Legal Footer HTML (Optional)</label>
                        <textarea
                          rows={2}
                          value={formCustomFooter}
                          onChange={(e) => setFormCustomFooter(e.target.value)}
                          placeholder="<p>Confidential enterprise communication. To modify preferences, click above.</p>"
                          className="w-full mt-1 bg-[#181b24] border border-[#2a3040] rounded-lg p-2 text-xs text-white font-mono focus:outline-none resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#d0d6e0]">
                          <input
                            type="checkbox"
                            checked={formEnableBranding}
                            onChange={(e) => setFormEnableBranding(e.target.checked)}
                            className="accent-[#ff69b4]"
                          />
                          <span>Show "Delivered via ZMAIL High-Velocity MTA" attribution</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* TIMELINE CONNECTOR & AUTOMATED FOLLOW-UP STEPS */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-px h-6 bg-gradient-to-b from-[#20242e] to-[#ff69b4] ml-6" />
                  <span className="text-[10px] font-mono text-[#ff69b4] uppercase tracking-wider font-semibold">
                    &darr; Automated Cadence Timeline
                  </span>
                </div>

                {timelineSteps.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className="p-5 rounded-2xl bg-[#0e1015] border border-[#ff69b4]/30 space-y-4 relative shadow-lg shadow-black/40 animate-fadeIn"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#ff69b4]/20 border border-[#ff69b4] flex items-center justify-center text-[10px] font-mono text-[#ff69b4] font-bold">
                          {idx + 2}
                        </span>
                        <h4 className="font-bold text-sm text-white">
                          Step {idx + 2}: {step.title || "Automated Context Bump"}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = timelineSteps.filter((_, sIdx) => sIdx !== idx);
                          setTimelineSteps(updated);
                        }}
                        className="p-1 rounded-lg bg-[#141720] hover:bg-rose-950/40 text-[#8a8f98] hover:text-rose-400 transition-colors text-xs"
                        title="Remove Step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* SENDER STICKINESS LOCK BADGE */}
                    <div className="p-2.5 rounded-xl bg-[#0a1410] border border-[#27a644]/40 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <Lock className="w-3.5 h-3.5 text-[#27a644]" />
                        <span className="font-semibold text-[#27a644]">Sender Locked to Step 1 Origin (Thread Continuity Enforced)</span>
                      </div>
                      <span className="text-[10px] text-[#8a8f98] font-mono">Rotation Restricted</span>
                    </div>

                    {/* DELAY & TRIGGER SETTINGS */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-[#8a8f98]">Delay Wait Window</label>
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={step.delay_days}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const updated = [...timelineSteps];
                              updated[idx].delay_days = val;
                              setTimelineSteps(updated);
                            }}
                            className="w-16 bg-[#141720] border border-[#262c3b] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                          <span className="text-xs text-[#d0d6e0]">Days later</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-[#8a8f98]">Send Days Filter</label>
                        <select
                          value={step.send_days || "business_days"}
                          onChange={(e: any) => {
                            const updated = [...timelineSteps];
                            updated[idx].send_days = e.target.value;
                            setTimelineSteps(updated);
                          }}
                          className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none"
                        >
                          <option value="business_days">Business Days Only (Mon-Fri)</option>
                          <option value="all_days">All 7 Days</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-[#8a8f98]">Trigger Condition</label>
                        <select
                          value={step.trigger_condition}
                          onChange={(e: any) => {
                            const updated = [...timelineSteps];
                            updated[idx].trigger_condition = e.target.value;
                            setTimelineSteps(updated);
                          }}
                          className="w-full mt-1 bg-[#141720] border border-[#262c3b] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none"
                        >
                          <option value="no_reply">If No Reply Received (Cold Outreach)</option>
                          <option value="no_open">If Not Opened</option>
                          <option value="opened_no_click">If Opened But No Click</option>
                          <option value="always">Always Send</option>
                        </select>
                      </div>
                    </div>

                    {/* THREADING TOGGLE */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#141720] border border-[#222736]">
                      <label className="flex items-center gap-2 text-xs text-[#d0d6e0] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={step.is_threaded_reply}
                          onChange={(e) => {
                            const updated = [...timelineSteps];
                            updated[idx].is_threaded_reply = e.target.checked;
                            setTimelineSteps(updated);
                          }}
                          className="accent-[#ff69b4]"
                        />
                        <span>Send as Threaded Reply in same conversation (In-Reply-To / References)</span>
                      </label>
                      <span className="text-[10px] font-mono text-[#3b9eff]">Re: {formSubject || "Step 1 Subject"}</span>
                    </div>

                    {/* STEP BODY */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-[#8a8f98]">
                          Follow-up Message Body
                        </label>
                        <div className="flex items-center gap-1.5">
                          {["first_name", "company", "sender_name"].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                const updated = [...timelineSteps];
                                updated[idx].body_html += ` {{${tag}}}`;
                                setTimelineSteps(updated);
                              }}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181b24] text-[#ff69b4] hover:bg-[#202532] cursor-pointer"
                            >
                              {`{{${tag}}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        rows={4}
                        value={step.body_html}
                        onChange={(e) => {
                          const updated = [...timelineSteps];
                          updated[idx].body_html = e.target.value;
                          setTimelineSteps(updated);
                        }}
                        className="w-full bg-[#141720] border border-[#262c3b] rounded-xl p-3 text-xs text-[#f7f8f8] font-mono focus:border-[#ff69b4]/60 focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                ))}

                {/* ADD STEP BUTTON */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newStepNum = timelineSteps.length + 2;
                      const newStep: CampaignStep = {
                        id: `step-${newStepNum}`,
                        step_number: newStepNum,
                        title: `Automated Context Bump #${newStepNum - 1}`,
                        subject: `Re: ${formSubject || "Follow-up"}`,
                        body_html: "<p>Hi {{first_name}},</p><p>Quick follow-up on my note from earlier this week. Would you like to connect briefly?</p><p>Best,<br>{{sender_name}}</p>",
                        body_preview: "Quick follow-up on my note from earlier this week...",
                        delay_days: 3,
                        delay_hours: 0,
                        send_days: "business_days",
                        trigger_condition: "no_reply",
                        is_threaded_reply: true,
                        created_at: new Date().toISOString() as any,
                      };
                      setTimelineSteps([...timelineSteps, newStep]);
                      setPreviewStepNumber(newStepNum);
                    }}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-[#262c3b] hover:border-[#ff69b4]/60 bg-[#0e1015]/60 hover:bg-[#141720] text-xs font-semibold text-[#ff69b4] flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Automated Follow-up Step (Timeline Step {timelineSteps.length + 2})</span>
                  </button>
                </div>
              </div>

              {/* CARD 4: DISPATCH SCHEDULE */}
              <div className="p-5 rounded-2xl bg-[#0e1015] border border-[#20242e] space-y-3">
                <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider font-mono">
                  Dispatch Schedule
                </span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-[#d0d6e0] cursor-pointer">
                    <input
                      type="radio"
                      name="sched"
                      checked={formSchedule === "immediate"}
                      onChange={() => setFormSchedule("immediate")}
                      className="accent-[#ff69b4]"
                    />
                    <span>Send Immediately via ZMAIL High-Speed Spool</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#d0d6e0] cursor-pointer">
                    <input
                      type="radio"
                      name="sched"
                      checked={formSchedule === "scheduled"}
                      onChange={() => setFormSchedule("scheduled")}
                      className="accent-[#ff69b4]"
                    />
                    <span>Schedule for Specific Time</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Live Recipient Email Preview */}
            <div className="w-1/2 p-6 flex flex-col bg-[#07080b]">
              <div className="flex items-center justify-between pb-3 border-b border-[#20242e] mb-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#ff69b4]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-[#8a8f98]">
                    Live Recipient Simulation Preview
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Step Selector for Preview */}
                  <div className="flex items-center bg-[#141720] rounded-lg p-0.5 border border-[#262c3b] text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setPreviewStepNumber(1)}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        previewStepNumber === 1
                          ? "bg-[#ff69b4] text-black font-bold"
                          : "text-[#8a8f98] hover:text-white"
                      }`}
                    >
                      Step 1 (Broadcast)
                    </button>
                    {timelineSteps.map((s, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => setPreviewStepNumber(sIdx + 2)}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          previewStepNumber === sIdx + 2
                            ? "bg-[#ff69b4] text-black font-bold"
                            : "text-[#8a8f98] hover:text-white"
                        }`}
                      >
                        Step {sIdx + 2} (Reply)
                      </button>
                    ))}
                  </div>

                  {/* Device Switcher */}
                  <div className="flex items-center bg-[#141720] rounded-lg p-0.5 border border-[#262c3b] text-[11px]">
                    <button
                      onClick={() => setPreviewDevice("desktop")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                        previewDevice === "desktop"
                          ? "bg-[#1f2433] text-[#f7f8f8] font-medium"
                          : "text-[#8a8f98] hover:text-[#f7f8f8]"
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Desktop</span>
                    </button>
                    <button
                      onClick={() => setPreviewDevice("mobile")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                        previewDevice === "mobile"
                          ? "bg-[#1f2433] text-[#f7f8f8] font-medium"
                          : "text-[#8a8f98] hover:text-[#f7f8f8]"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Mobile</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Recipient Rotation Simulation Ticker */}
              {senderMode === "pool" && previewStepNumber === 1 && (
                <div className="mb-3 p-2.5 rounded-xl bg-[#10131c] border border-[#202738] text-[10px] font-mono flex items-center justify-between text-[#d0d6e0]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#ff69b4]" />
                    <span>Live Rotation Simulator: Recipient 1 receives from <strong>Sarah Jenkins</strong> &bull; Recipient 2 receives from <strong>Alex Rivera</strong></span>
                  </span>
                  <span className="text-[#27a644]">Least Utilized Algorithm</span>
                </div>
              )}

              {previewStepNumber > 1 && (
                <div className="mb-3 p-2.5 rounded-xl bg-[#0d1612] border border-[#27a644]/40 text-[10px] font-mono flex items-center justify-between text-[#27a644]">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-[#27a644]" />
                    <span>Thread Continuity Enforced: Step {previewStepNumber} sends strictly from the original Step 1 mailbox</span>
                  </span>
                  <span>In-Reply-To Attached</span>
                </div>
              )}

              {/* Email Simulated Frame */}
              <div
                className={`mx-auto rounded-2xl bg-[#0f1118] border border-[#222735] shadow-2xl overflow-hidden flex flex-col flex-1 ${
                  previewDevice === "mobile" ? "max-w-sm w-full" : "w-full"
                }`}
              >
                {/* Simulated Header */}
                <div className="p-4 border-b border-[#20242e] bg-[#141722] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#f7f8f8] truncate max-w-[320px]">
                      {previewStepNumber === 1
                        ? (formSubject || "Untitled Subject Line")
                        : `Re: ${formSubject || "Untitled Subject Line"}`}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                      SPF &amp; DKIM Valid
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#ff69b4] flex items-center justify-center font-bold text-[#0a0a0c] text-xs">
                        {senderMode === "pool" ? "S" : (formFromName[0] || "M")}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-[#f7f8f8]">
                          {senderMode === "pool" ? "Sarah Jenkins (Pool Sender)" : formFromName}
                        </div>
                        <div className="text-[10px] text-[#8a8f98] font-mono">
                          {senderMode === "pool" ? "sarah@growth.zmail.local" : formFromEmail}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-[#8a8f98] block">To:</span>
                      <span className="text-[11px] text-white font-mono">
                        {finalRecipients.length > 0
                          ? `${finalRecipients[0]}${
                              finalRecipients.length > 1
                                ? ` (+${finalRecipients.length - 1} others)`
                                : ""
                            }`
                          : "No recipients chosen yet"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulated Body: Step 1 or Nested Reply */}
                <div className="p-5 flex-1 overflow-auto text-xs text-[#d0d6e0] leading-relaxed whitespace-pre-wrap font-sans space-y-4">
                  {previewStepNumber === 1 ? (
                    formBody ? (
                      <div dangerouslySetInnerHTML={{ __html: formBody }} />
                    ) : (
                      "Select a template or start typing message body to see preview..."
                    )
                  ) : (
                    /* Threaded Reply Simulation */
                    <div className="space-y-4">
                      {/* Active Reply Body */}
                      <div className="p-3.5 rounded-xl bg-[#141722] border border-[#ff69b4]/30 space-y-2">
                        <div className="text-[10px] font-mono text-[#ff69b4] font-semibold flex items-center gap-1">
                          <CornerDownRight className="w-3 h-3" /> Step {previewStepNumber} Threaded Reply Body:
                        </div>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: timelineSteps[previewStepNumber - 2]?.body_html || "<p>Quick follow-up bump...</p>",
                          }}
                        />
                      </div>

                      {/* Quoted Previous Conversation */}
                      <div className="border-l-2 border-[#333a4c] pl-3 py-1 text-[#8a8f98] text-[11px] space-y-1">
                        <div className="font-mono text-[10px]">On Tue, Nov 17, Sarah Jenkins wrote:</div>
                        <div className="opacity-70 line-clamp-3" dangerouslySetInnerHTML={{ __html: formBody }} />
                      </div>
                    </div>
                  )}

                  {/* Custom Footer & Legal Postal Address Rendering */}
                  <div className="pt-4 border-t border-[#222736] space-y-2 text-[10px] text-[#8a8f98]">
                    {formCustomFooter && (
                      <div className="text-[#a0a6b5]" dangerouslySetInnerHTML={{ __html: formCustomFooter }} />
                    )}
                    <p className="text-[#ff69b4] underline cursor-pointer">{formUnsubText}</p>
                    {formCompanyAddress && <p className="text-[#62666d]">{formCompanyAddress}</p>}
                  </div>
                </div>

                {/* Simulated Footer */}
                <div className="p-3 border-t border-[#20242e] bg-[#11131a] text-[10px] text-[#62666d] flex items-center justify-between">
                  <span>Delivered via ZMAIL High-Velocity MTA &bull; IP Pool: {formIPPool}</span>
                  <span className="underline cursor-pointer">One-Click Unsubscribe (RFC 8058)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : screenView === "inspect" && activeCampaign ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0b0e]">
          <div className="flex items-center justify-between px-6 py-3.5 bg-[#0e1015] border-b border-[#20242e] shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setScreenView("list")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141720] hover:bg-[#1a1e2a] border border-[#262c3b] text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <div className="h-4 w-px bg-[#262c3b]" />
              <div>
                <h2 className="font-bold text-sm text-[#f7f8f8]">{activeCampaign.name}</h2>
                <p className="text-[10px] text-[#8a8f98] font-mono">ID: {activeCampaign.id}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleDispatch(activeCampaign, e)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ff69b4] hover:bg-[#ff52a4] text-[#0a0a0c] font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Broadcast Now</span>
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-5xl mx-auto w-full">
            {/* Meta Cards Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#11131a] border border-[#20242e]">
                <span className="text-[10px] font-mono uppercase text-[#8a8f98]">Status</span>
                <p className="text-base font-bold text-white capitalize mt-1">{activeCampaign.status}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#11131a] border border-[#20242e]">
                <span className="text-[10px] font-mono uppercase text-[#8a8f98]">Total Recipients</span>
                <p className="text-base font-bold text-[#ff69b4] mt-1">{activeCampaign.recipientCount}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#11131a] border border-[#20242e]">
                <span className="text-[10px] font-mono uppercase text-[#8a8f98]">From Address</span>
                <p className="text-xs font-mono text-zinc-300 truncate mt-1">{activeCampaign.fromEmail}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#11131a] border border-[#20242e]">
                <span className="text-[10px] font-mono uppercase text-[#8a8f98]">Egress Pool</span>
                <p className="text-xs font-mono text-emerald-400 mt-1">{activeCampaign.ipPool || "default"}</p>
              </div>
            </div>

            {/* Recipient Details */}
            <div className="p-5 rounded-xl bg-[#11131a] border border-[#20242e] space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-white">Target Recipients</h4>
              {activeCampaign.recipients && activeCampaign.recipients.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {activeCampaign.recipients.map((r, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-[#181c26] text-zinc-300 font-mono text-[11px] border border-[#262c3b]"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Audience: {activeCampaign.audience}</p>
              )}
            </div>

            {/* Content Preview */}
            <div className="p-5 rounded-xl bg-[#11131a] border border-[#20242e] space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#8a8f98]">Subject Line</span>
              <p className="text-sm font-semibold text-white">{activeCampaign.subject}</p>
              <div className="mt-3 p-4 rounded-lg bg-[#0c0d12] border border-[#1e222c] text-xs text-zinc-300 font-mono whitespace-pre-wrap">
                {activeCampaign.bodyPreview}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Universal Mode Switcher Bar */}
          <div className="flex items-center justify-between px-5 py-2.5 bg-[#0a0b0e] border-b border-[#1e222c] shrink-0">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#06070a] border border-[#1a1e28]">
              <button
                type="button"
                onClick={() => setAppMode("compose")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  appMode === "compose"
                    ? "bg-[#ff69b4] text-[#0a0a0c] shadow-md shadow-[#ff69b4]/20"
                    : "text-[#8a8f98] hover:text-[#f7f8f8]"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>⚡ 1-to-1 Quick Compose</span>
              </button>

              <button
                type="button"
                onClick={() => setAppMode("campaigns")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  appMode === "campaigns"
                    ? "bg-[#ff69b4] text-[#0a0a0c] shadow-md shadow-[#ff69b4]/20"
                    : "text-[#8a8f98] hover:text-[#f7f8f8]"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>📢 Mass Broadcast Campaigns</span>
              </button>

              <button
                type="button"
                onClick={() => setAppMode("workflows")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  appMode === "workflows"
                    ? "bg-[#ff69b4] text-[#0a0a0c] shadow-md shadow-[#ff69b4]/20"
                    : "text-[#8a8f98] hover:text-[#f7f8f8]"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>🔄 Sequence Workflows (DAG Studio)</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#11131a] border border-[#202532] text-[#8a8f98]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
                <span>MTA Status: ONLINE</span>
              </span>
            </div>
          </div>

          {/* VIEW A: AUTOMATED SEQUENCE WORKFLOWS */}
          {appMode === "workflows" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <WorkflowsApp />
            </div>
          ) : appMode === "compose" ? (
            /* VIEW B: 1-TO-1 QUICK COMPOSE */
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Compose Editor */}
              <div className="w-7/12 p-6 overflow-y-auto space-y-4 border-r border-[#1e222c] bg-[#0a0b0e]">
                {composeReceipt && (
                  <div className="p-4 rounded-xl bg-[#0d1f14] border border-[#27a644]/40 text-[#f7f8f8] space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#27a644] font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Dispatched via MTA Engine Successfully</span>
                      </div>
                      <span className="text-[10px] text-[#8a8f98] font-mono">{composeReceipt.timestamp}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-[#8a8f98]">Message ID: </span>
                        <span className="font-mono text-zinc-300">{composeReceipt.message_id}</span>
                      </div>
                      <div>
                        <span className="text-[#8a8f98]">Target Queue: </span>
                        <span className="font-mono text-[#ff69b4]">{composeReceipt.queue}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#a0a6b5]">{composeReceipt.details}</p>
                  </div>
                )}

                <div className="p-5 rounded-2xl bg-[#0e1015] border border-[#1e222c] space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#1e222c] pb-3">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-[#ff69b4]" />
                      <h3 className="font-bold text-sm text-[#f7f8f8]">1-to-1 Direct Compose</h3>
                    </div>
                    <span className="text-[10px] text-[#8a8f98]">Direct dispatch &bull; Bypasses batch queues</span>
                  </div>

                  {/* Recipient To */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">
                      To (Recipient Email Address) *
                    </label>
                    <div className="relative">
                      <AtSign className="w-3.5 h-3.5 text-[#8a8f98] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={composeTo}
                        onChange={(e) => setComposeTo(e.target.value)}
                        placeholder="e.g. client@enterprise.com"
                        className="w-full bg-[#141720] border border-[#262c3b] rounded-lg pl-9 pr-3 py-2 text-xs text-[#f7f8f8] placeholder-[#555a66] focus:outline-none focus:border-[#ff69b4]"
                      />
                    </div>

                    {contacts.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-[#62666d]">Quick Contacts:</span>
                        {contacts.slice(0, 5).map((c) => (
                          <button
                            key={c.id || c.ID}
                            type="button"
                            onClick={() => setComposeTo(c.email)}
                            className="px-2 py-0.5 rounded-md bg-[#181c28] hover:bg-[#222838] border border-[#283042] text-[10px] text-[#a0a6b5] hover:text-[#f7f8f8] transition-colors cursor-pointer"
                          >
                            {c.name ? `${c.name} (${c.email})` : c.email}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sender Row (From Name + From Email) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#8a8f98]">From Name</label>
                      <input
                        type="text"
                        value={composeFromName}
                        onChange={(e) => setComposeFromName(e.target.value)}
                        placeholder="Sender Name"
                        className="w-full bg-[#141720] border border-[#262c3b] rounded-lg px-3 py-1.5 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#ff69b4]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#8a8f98]">From Email / Domain</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={composeFromEmail}
                          onChange={(e) => setComposeFromEmail(e.target.value)}
                          placeholder="sender@domain.com"
                          className="flex-1 bg-[#141720] border border-[#262c3b] rounded-lg px-3 py-1.5 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#ff69b4]"
                        />
                        {domains.length > 0 && (
                          <select
                            onChange={(e) => {
                              const prefix = composeFromEmail.includes("@") ? composeFromEmail.split("@")[0] : "support";
                              setComposeFromEmail(`${prefix}@${e.target.value}`);
                            }}
                            className="bg-[#141720] border border-[#262c3b] rounded-lg px-2 py-1.5 text-xs text-[#8a8f98] focus:outline-none cursor-pointer"
                          >
                            {domains.map((d) => (
                              <option key={d.id} value={d.domain_name}>
                                @{d.domain_name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* IP Pool & Template Load Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#8a8f98]">Egress IP Pool</label>
                      <select
                        value={composeIPPool}
                        onChange={(e) => setComposeIPPool(e.target.value)}
                        className="w-full bg-[#141720] border border-[#262c3b] rounded-lg px-3 py-1.5 text-xs text-[#f7f8f8] focus:outline-none cursor-pointer"
                      >
                        <option value="default">default (Primary Pool)</option>
                        {ipPools.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.ips?.length || 1} IPs)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#8a8f98]">Load Saved Template (Optional)</label>
                      <select
                        value={composeTemplateId}
                        onChange={(e) => handleSelectComposeTemplate(e.target.value)}
                        className="w-full bg-[#141720] border border-[#262c3b] rounded-lg px-3 py-1.5 text-xs text-[#f7f8f8] focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Start with Blank Message --</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8a8f98]">Subject Line *</label>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="e.g. Following up on your deliverability consultation"
                      className="w-full bg-[#141720] border border-[#262c3b] rounded-lg px-3 py-2 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#ff69b4]"
                    />
                  </div>

                  {/* Message Body */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-[#8a8f98]">Message Content</label>
                      <div className="flex items-center gap-1 bg-[#141720] rounded-md p-0.5 border border-[#262c3b] text-[10px]">
                        <button
                          type="button"
                          onClick={() => setComposeFormat("html")}
                          className={`px-2 py-0.5 rounded transition-colors ${
                            composeFormat === "html" ? "bg-[#1f2433] text-[#f7f8f8] font-medium" : "text-[#8a8f98]"
                          }`}
                        >
                          HTML
                        </button>
                        <button
                          type="button"
                          onClick={() => setComposeFormat("text")}
                          className={`px-2 py-0.5 rounded transition-colors ${
                            composeFormat === "text" ? "bg-[#1f2433] text-[#f7f8f8] font-medium" : "text-[#8a8f98]"
                          }`}
                        >
                          Plain Text
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={8}
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      placeholder="Write your direct email message..."
                      className="w-full bg-[#141720] border border-[#262c3b] rounded-lg p-3 text-xs text-[#f7f8f8] font-mono leading-relaxed focus:outline-none focus:border-[#ff69b4]"
                    />

                    {/* Tokens Helper */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-[#62666d]">Insert Token:</span>
                      {["{{first_name}}", "{{company}}", "{{email}}"].map((token) => (
                        <button
                          key={token}
                          type="button"
                          onClick={() => setComposeBody((prev) => prev + " " + token)}
                          className="px-2 py-0.5 rounded bg-[#161a25] hover:bg-[#202737] border border-[#262f44] text-[10px] font-mono text-[#ff69b4] cursor-pointer"
                        >
                          {token}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Send Button */}
                  <div className="pt-2 flex items-center justify-between border-t border-[#1e222c]">
                    <button
                      type="button"
                      onClick={() => {
                        setComposeSubject("");
                        setComposeBody("");
                        setComposeTo("");
                        setComposeReceipt(null);
                      }}
                      className="px-3 py-1.5 text-xs text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
                    >
                      Clear Fields
                    </button>
                    <button
                      type="button"
                      onClick={handleSendQuickCompose}
                      disabled={isSendingCompose}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#ff69b4] hover:bg-[#ff52a4] disabled:opacity-50 text-[#0a0a0c] font-bold text-xs shadow-lg shadow-[#ff69b4]/25 transition-all cursor-pointer"
                    >
                      {isSendingCompose ? (
                        <>
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>Transmitting via MTA...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>⚡ Send Email Now via MTA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Simulated Preview */}
              <div className="w-5/12 p-6 flex flex-col bg-[#07080a] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#8a8f98]" />
                    <span className="font-semibold text-xs text-[#f7f8f8]">Recipient Live Preview</span>
                  </div>
                  <div className="flex items-center bg-[#141720] rounded-lg p-0.5 border border-[#262c3b] text-[11px]">
                    <button
                      type="button"
                      onClick={() => setComposePreviewDevice("desktop")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                        composePreviewDevice === "desktop" ? "bg-[#1f2433] text-[#f7f8f8]" : "text-[#8a8f98]"
                      }`}
                    >
                      <Monitor className="w-3 h-3" />
                      <span>Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposePreviewDevice("mobile")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                        composePreviewDevice === "mobile" ? "bg-[#1f2433] text-[#f7f8f8]" : "text-[#8a8f98]"
                      }`}
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>Mobile</span>
                    </button>
                  </div>
                </div>

                <div
                  className={`mx-auto rounded-2xl bg-[#0f1118] border border-[#222735] shadow-2xl overflow-hidden flex flex-col flex-1 w-full ${
                    composePreviewDevice === "mobile" ? "max-w-sm" : ""
                  }`}
                >
                  <div className="p-4 border-b border-[#20242e] bg-[#141722] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#ff69b4]/20 text-[#ff69b4] flex items-center justify-center font-bold text-xs">
                          {(composeFromName || "M")[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-[#f7f8f8]">{composeFromName || "Sender Name"}</p>
                          <p className="text-[10px] text-[#8a8f98] font-mono">{composeFromEmail || "sender@domain.com"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#182a1e] border border-[#27a644]/40 text-[#27a644] text-[10px]">
                        <ShieldCheck className="w-3 h-3" />
                        <span>SPF &bull; DKIM Signed</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#8a8f98] pt-1">
                      <span>To: </span>
                      <span className="text-[#f7f8f8] font-mono">{composeTo || "recipient@example.com"}</span>
                    </div>
                    <h4 className="font-bold text-xs text-[#f7f8f8] pt-1">
                      {composeSubject || "No Subject Line Provided"}
                    </h4>
                  </div>

                  <div className="p-4 flex-1 bg-[#090a0d] overflow-y-auto">
                    {composeFormat === "html" ? (
                      <div
                        className="prose prose-invert prose-xs max-w-none text-zinc-300"
                        dangerouslySetInnerHTML={{
                          __html: composeBody
                            .replace(/\{\{first_name.*?\}\}/g, "Alex")
                            .replace(/\{\{company.*?\}\}/g, "Acme Corp")
                            .replace(/\{\{email.*?\}\}/g, composeTo || "alex@acme.com"),
                        }}
                      />
                    ) : (
                      <pre className="text-zinc-300 font-sans whitespace-pre-wrap text-xs leading-relaxed">
                        {composeBody
                          .replace(/\{\{first_name.*?\}\}/g, "Alex")
                          .replace(/\{\{company.*?\}\}/g, "Acme Corp")
                          .replace(/\{\{email.*?\}\}/g, composeTo || "alex@acme.com")}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW C: CAMPAIGNS DIRECTORY LIST */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* List Header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-[#0c0d12] border-b border-[#1f232d] shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#ff69b4]" />
                <span className="font-semibold text-sm text-[#f7f8f8]">Campaign Broadcast Operations</span>
                <span className="text-[10px] text-[#8a8f98] font-mono px-2 py-0.5 rounded-full bg-[#141720] border border-[#222735]">
                  {campaigns.length} total
                </span>
              </div>

              <div className="h-4 w-px bg-[#222735] hidden sm:block" />

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8a8f98] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search campaigns, audience..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#12141c] border border-[#222735] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#f7f8f8] placeholder-[#555a66] focus:outline-none focus:border-[#ff69b4]/50 w-60"
                />
              </div>
            </div>

            <button
              onClick={handleOpenCreateScreen}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ff69b4] hover:bg-[#ff52a4] text-[#0a0a0c] font-bold text-xs shadow-md shadow-[#ff69b4]/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Campaign</span>
            </button>
          </div>

          {/* Table / Cards */}
          <div className="flex-1 overflow-auto p-5 space-y-3">
            {filteredCampaigns.length === 0 ? (
              <div className="p-16 text-center text-[#8a8f98]">
                <Send className="w-12 h-12 mx-auto text-[#2b3040] mb-3" />
                <p className="font-medium text-[#d0d6e0] text-sm">No campaigns match your search</p>
                <p className="text-xs mt-1 text-[#62666d]">
                  Click "Create Campaign" to compose your first broadcast.
                </p>
              </div>
            ) : (
              filteredCampaigns.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveCampaign(c);
                    setScreenView("inspect");
                  }}
                  className="p-4 rounded-2xl bg-[#0e1017] border border-[#1f232f] hover:border-[#384055] hover:bg-[#12151e] transition-all cursor-pointer shadow-lg shadow-black/40 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#f7f8f8] text-sm truncate group-hover:text-[#ff69b4] transition-colors">
                          {c.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono capitalize border ${
                            c.status === "sending"
                              ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                              : c.status === "completed"
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                              : "bg-zinc-700/20 border-zinc-600/30 text-zinc-400"
                          }`}
                        >
                          {c.status}
                        </span>
                        {c.templateId && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181d2a] text-[#ff69b4] border border-[#2b334a]">
                            Template Linked
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#8a8f98] truncate">{c.subject}</div>

                      <div className="flex items-center gap-3 text-[11px] text-[#62666d] pt-1">
                        <span>From: <strong className="text-zinc-300">{c.fromEmail}</strong></span>
                        <span>•</span>
                        <span>Audience: <strong className="text-zinc-300">{c.audience}</strong></span>
                        <span>•</span>
                        <span>Recipients: <strong className="text-[#ff69b4]">{c.recipientCount}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 border-l border-[#1f232f] pl-4">
                      <button
                        onClick={(e) => handleDispatch(c, e)}
                        title="Dispatch Campaign"
                        className="p-2 rounded-lg bg-[#ff69b4]/10 hover:bg-[#ff69b4]/20 text-[#ff69b4] border border-[#ff69b4]/30 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleOpenEditScreen(c, e)}
                        title="Edit Campaign"
                        className="p-2 rounded-lg bg-[#141722] hover:bg-[#1c2130] text-zinc-300 hover:text-white border border-[#242938] transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Delete campaign "${c.name}"?`)) {
                            await deleteCampaign(c.id);
                            await loadData();
                          }
                        }}
                        title="Delete Campaign"
                        className="p-2 rounded-lg hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-all"
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
      )}
    </div>
  )}

      {/* PLAYBOOK DIRECTORY MODAL */}
      {showPlaybookModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0f1117] border border-[#262c3b] shadow-2xl p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#20242e]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#ff69b4]/10 border border-[#ff69b4]/30 flex items-center justify-center text-[#ff69b4]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Sequence Playbooks Directory</h3>
                  <p className="text-[11px] text-[#8a8f98]">
                    Pre-made battle-tested outreach and lifecycle templates with pre-configured timeline steps.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPlaybookModal(false)}
                className="text-[#8a8f98] hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {playbooks.map((pb) => (
                <div
                  key={pb.id}
                  className="p-4 rounded-xl bg-[#12141c] border border-[#222736] hover:border-[#ff69b4]/40 transition-all flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-white">{pb.name}</h4>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#181d28] text-[#3b9eff] border border-[#3b9eff]/30 font-semibold uppercase">
                        {pb.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8a8f98]">{pb.description}</p>
                    <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-[#62666d]">
                      <span>{pb.steps.length} Timeline Steps</span>
                      <span>&bull;</span>
                      <span>Target: {pb.target_audience}</span>
                      <span>&bull;</span>
                      <span>~{pb.estimated_days} Day Cadence</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (pb.steps && pb.steps.length > 0) {
                        setFormName(pb.name);
                        setFormSubject(pb.steps[0].subject);
                        setFormBody(pb.steps[0].body_html);
                        if (pb.steps.length > 1) {
                          setTimelineSteps(pb.steps.slice(1));
                        } else {
                          setTimelineSteps([]);
                        }
                      }
                      setShowPlaybookModal(false);
                      showNotice(`Loaded sequence playbook: "${pb.name}"`);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#ff69b4] hover:bg-[#ff52a5] text-black font-semibold text-xs transition-all shadow-md shadow-[#ff69b4]/20 shrink-0 cursor-pointer"
                  >
                    Load Sequence
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

</div>
);
};
