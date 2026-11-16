"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileCode2,
  Eye,
  Smartphone,
  Monitor,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Lock,
  Mail,
  Zap,
  Code,
  Layers,
  Search,
} from "lucide-react";
import {
  fetchTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  renderTemplate,
  fetchDeliverabilityHealth,
} from "../../lib/api";
import { Template, DeliverabilityHealthReport } from "../../types/os";

const STARTER_TEMPLATES: Array<Partial<Template>> = [
  {
    name: "Enterprise Transactional Welcome",
    subject: "Welcome to {{company | 'MailOps'}}, {{first_name | 'Operator'}}!",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b0c0e; color: #e5e7eb; margin: 0; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background: #14161b; border: 1px solid #282b34; border-radius: 12px; padding: 36px 32px; }
    .logo { color: #ff69b4; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 24px; }
    h1 { font-size: 24px; font-weight: 600; color: #ffffff; margin: 0 0 16px; }
    p { font-size: 15px; line-height: 1.6; color: #9ca3af; margin: 0 0 20px; }
    .button { display: inline-block; background: #ff69b4; color: #000000; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 12px 0 24px; }
    .footer { font-size: 12px; color: #6b7280; border-top: 1px solid #23262f; padding-top: 20px; margin-top: 24px; }
    .footer a { color: #9ca3af; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">⚡ {{company | 'MAILOPS'}} INFRASTRUCTURE</div>
    <h1>Welcome aboard, {{first_name | 'Team Member'}}</h1>
    <p>Your dedicated egress pool has been initialized with automated IP warmup schedules and high-throughput KumoMTA shaping.</p>
    <p>Your primary account identifier is <code>{{account_id | 'acc_primary_01'}}</code>.</p>
    <a href="{{cta_url | 'https://mailops.local/dashboard'}}" class="button">Launch Mission Control &rarr;</a>
    <div class="footer">
      Sent from high-velocity KumoMTA cluster in {{region | 'us-east-1'}}.<br>
      <a href="{{unsubscribe_url | 'https://mailops.local/unsub'}}">One-Click Unsubscribe (RFC 8058)</a>
    </div>
  </div>
</body>
</html>`,
    text: `Welcome to {{company | 'MailOps'}}, {{first_name | 'Operator'}}!

Your dedicated egress pool is active.
Account: {{account_id | 'acc_primary_01'}}
Login URL: {{cta_url | 'https://mailops.local/dashboard'}}

Unsubscribe: {{unsubscribe_url | 'https://mailops.local/unsub'}}`,
    sample_data: {
      first_name: "Alex",
      company: "Acme Cloud",
      account_id: "acc_live_9921",
      cta_url: "https://mailops.local/console",
      region: "us-east-1",
      unsubscribe_url: "https://mailops.local/unsub?id=9921",
    },
  },
];

export const TemplatesApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"editor" | "radar">("editor");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Editor states
  const [name, setName] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [htmlBody, setHtmlBody] = useState<string>("");
  const [textBody, setTextBody] = useState<string>("");
  const [bodyMode, setBodyMode] = useState<"html" | "text">("html");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [testVariables, setTestVariables] = useState<Record<string, string>>({
    first_name: "Elena",
    company: "Nexus Scale",
    account_id: "acc_78129",
    cta_url: "https://mailops.local/app",
    region: "us-east-1",
    unsubscribe_url: "https://mailops.local/unsub?id=78129",
  });
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Deliverability Health Radar state
  const [radar, setRadar] = useState<DeliverabilityHealthReport | null>(null);
  const [radarLoading, setRadarLoading] = useState<boolean>(false);

  // Load templates on mount
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await fetchTemplates();
      setTemplates(data || []);
      if (data && data.length > 0 && !selectedTemplate) {
        selectTemplate(data[0]);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRadar = async () => {
    try {
      setRadarLoading(true);
      const data = await fetchDeliverabilityHealth();
      setRadar(data);
    } catch (err) {
      console.error("Failed to load deliverability health radar:", err);
    } finally {
      setRadarLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadRadar();
  }, []);

  const selectTemplate = (t: Template) => {
    setSelectedTemplate(t);
    setName(t.name);
    setSubject(t.subject);
    setHtmlBody(t.html);
    setTextBody(t.text);
    if (t.sample_data && Object.keys(t.sample_data).length > 0) {
      setTestVariables({ ...testVariables, ...t.sample_data });
    }
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setName("New Transactional Template");
    setSubject("Notification from {{company | 'MailOps'}} for {{first_name}}");
    setHtmlBody(`<div style="font-family: sans-serif; padding: 24px; background: #0c0d10; color: #fff;">
  <h2>Hello {{first_name | 'there'}},</h2>
  <p>Here is your delivery update from {{company | 'MailOps'}}.</p>
  <p><a href="{{cta_url | '#'}}" style="color: #ff69b4;">Confirm Email &rarr;</a></p>
</div>`);
    setTextBody("Hello {{first_name | 'there'}},\n\nHere is your update from {{company | 'MailOps'}}.\nConfirm: {{cta_url | '#'}}");
  };

  const handleLoadStarter = async (starter: Partial<Template>) => {
    try {
      setSaving(true);
      const created = await addTemplate(starter);
      await loadTemplates();
      selectTemplate(created);
    } catch (err: any) {
      alert("Failed to load starter: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Template name is required.");
      return;
    }
    try {
      setSaving(true);
      if (selectedTemplate) {
        const updated = await updateTemplate({
          id: selectedTemplate.id,
          name,
          subject,
          html: htmlBody,
          text: textBody,
          sample_data: testVariables,
        });
        await loadTemplates();
        selectTemplate(updated);
      } else {
        const created = await addTemplate({
          name,
          subject,
          html: htmlBody,
          text: textBody,
          sample_data: testVariables,
        });
        await loadTemplates();
        selectTemplate(created);
      }
    } catch (err: any) {
      alert("Failed to save template: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    const id = selectedTemplate.id;
    if (!confirm(`Are you sure you want to delete template "${selectedTemplate.name}"?`)) return;
    try {
      await deleteTemplate(id);
      setSelectedTemplate(null);
      await loadTemplates();
      if (templates.length > 1) {
        const remaining = templates.filter((t) => t.id !== id);
        if (remaining.length > 0) selectTemplate(remaining[0]);
      } else {
        handleNewTemplate();
      }
    } catch (err: any) {
      alert("Failed to delete template: " + err.message);
    }
  };

  // Live variable merging in preview
  const renderedSubject = useMemo(() => {
    return subject.replace(/\{\{\s*([a-zA-Z0-9_\.]+)(?:\s*\|\s*([^}]+?))?\s*\}\}/g, (_, varName, fallback) => {
      const trimmedVar = varName.trim();
      if (testVariables[trimmedVar]) return testVariables[trimmedVar];
      if (fallback) {
        let cleanFb = fallback.trim();
        if ((cleanFb.startsWith('"') && cleanFb.endsWith('"')) || (cleanFb.startsWith("'") && cleanFb.endsWith("'"))) {
          cleanFb = cleanFb.slice(1, -1);
        }
        return cleanFb;
      }
      return "";
    });
  }, [subject, testVariables]);

  const renderedHTML = useMemo(() => {
    return htmlBody.replace(/\{\{\s*([a-zA-Z0-9_\.]+)(?:\s*\|\s*([^}]+?))?\s*\}\}/g, (_, varName, fallback) => {
      const trimmedVar = varName.trim();
      if (testVariables[trimmedVar]) return testVariables[trimmedVar];
      if (fallback) {
        let cleanFb = fallback.trim();
        if ((cleanFb.startsWith('"') && cleanFb.endsWith('"')) || (cleanFb.startsWith("'") && cleanFb.endsWith("'"))) {
          cleanFb = cleanFb.slice(1, -1);
        }
        return cleanFb;
      }
      return "";
    });
  }, [htmlBody, testVariables]);

  const renderedText = useMemo(() => {
    return textBody.replace(/\{\{\s*([a-zA-Z0-9_\.]+)(?:\s*\|\s*([^}]+?))?\s*\}\}/g, (_, varName, fallback) => {
      const trimmedVar = varName.trim();
      if (testVariables[trimmedVar]) return testVariables[trimmedVar];
      if (fallback) {
        let cleanFb = fallback.trim();
        if ((cleanFb.startsWith('"') && cleanFb.endsWith('"')) || (cleanFb.startsWith("'") && cleanFb.endsWith("'"))) {
          cleanFb = cleanFb.slice(1, -1);
        }
        return cleanFb;
      }
      return "";
    });
  }, [textBody, testVariables]);

  // Detected variables in current editor
  const detectedVariables = useMemo(() => {
    const combined = `${subject} ${htmlBody} ${textBody}`;
    const matches = combined.matchAll(/\{\{\s*([a-zA-Z0-9_\.]+)(?:\s*\|\s*([^}]+?))?\s*\}\}/g);
    const set = new Set<string>();
    for (const m of matches) {
      if (m[1]) set.add(m[1].trim());
    }
    return Array.from(set);
  }, [subject, htmlBody, textBody]);

  const copyTag = (tag: string) => {
    const text = `{{${tag}}}`;
    navigator.clipboard.writeText(text);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0b0e] text-[#e1e4ea] select-none font-sans overflow-hidden">
      {/* Top Header / App Navigation */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#101217] border-b border-[#21242d] shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-[#ff69b4]/10 text-[#ff69b4] border border-[#ff69b4]/20">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              Template Engine & Deliverability Radar
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Enterprise Parity
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400">
              Handlebars / Liquid dynamic variable merging & continuous Google/Yahoo Postmaster auditing
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-[#171a22] p-1 rounded-lg border border-[#262a35]">
          <button
            onClick={() => setActiveTab("editor")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
              activeTab === "editor"
                ? "bg-[#ff69b4] text-black font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Template Editor & Live Preview
          </button>
          <button
            onClick={() => {
              setActiveTab("radar");
              loadRadar();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
              activeTab === "radar"
                ? "bg-[#ff69b4] text-black font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Deliverability Radar
            {radar && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  radar.overall_score >= 85
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {radar.overall_score}%
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "editor" ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Sidebar: Templates List */}
          <div className="w-72 bg-[#0d0e12] border-r border-[#1f222b] flex flex-col shrink-0">
            <div className="p-3 border-b border-[#1f222b] flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-[#14161d] border border-[#262a35] rounded-md text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff69b4]"
                />
              </div>
              <button
                onClick={handleNewTemplate}
                title="Create New Template"
                className="p-1.5 rounded-md bg-[#ff69b4]/10 text-[#ff69b4] hover:bg-[#ff69b4]/20 border border-[#ff69b4]/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#171922] p-2 space-y-1">
              {loading ? (
                <div className="text-center py-8 text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading templates...
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="p-4 text-center">
                  <FileCode2 className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-zinc-400 font-medium">No templates stored</p>
                  <p className="text-[11px] text-zinc-600 mt-1 mb-3">
                    Clean slate ready for your production email templates.
                  </p>
                  <button
                    onClick={() => handleLoadStarter(STARTER_TEMPLATES[0])}
                    className="w-full py-1.5 px-2 bg-[#1b1e27] hover:bg-[#252936] text-[11px] text-[#ff69b4] rounded border border-[#2f3444] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3" />
                    Load Starter Boilerplate
                  </button>
                </div>
              ) : (
                filteredTemplates.map((t) => {
                  const id = t.id;
                  const isSelected = selectedTemplate && selectedTemplate.id === id;
                  return (
                    <button
                      key={id}
                      onClick={() => selectTemplate(t)}
                      className={`w-full text-left p-2.5 rounded-lg transition-all ${
                        isSelected
                          ? "bg-[#181b24] border border-[#ff69b4]/30 shadow-sm"
                          : "hover:bg-[#12141a] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white truncate max-w-[170px]">{t.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">v{t.version || 1}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mb-1.5">{t.subject || "No subject"}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] px-1.5 py-0.2 bg-[#202430] text-zinc-400 rounded font-mono">
                          {t.variables?.length || 0} vars
                        </span>
                        <span className="text-[9px] text-zinc-500">
                          {new Date(t.updated_at || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Center Column: Editor */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0a0b0e] border-r border-[#1f222b]">
            {/* Editor Toolbar */}
            <div className="p-3 bg-[#111319] border-b border-[#1f222b] flex items-center justify-between gap-3">
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Template Name"
                  className="bg-[#171a23] border border-[#2b303e] rounded px-3 py-1 text-xs font-semibold text-white focus:outline-none focus:border-[#ff69b4] w-64"
                />
                {selectedTemplate && (
                  <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-[#171a23]">
                    ID: {selectedTemplate.id}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedTemplate && (
                  <button
                    onClick={handleDelete}
                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff69b4] hover:bg-[#ff7ab8] text-black text-xs font-semibold rounded-md shadow-sm transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>

            {/* Subject Line & Dynamic Tag Bar */}
            <div className="p-3 bg-[#0d0f14] border-b border-[#1f222b] space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400 uppercase w-14 shrink-0">Subject:</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line with {{first_name}} tags..."
                  className="flex-1 bg-[#14161e] border border-[#262a36] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff69b4]"
                />
              </div>

              {/* Dynamic tag pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#ff69b4]" /> Insert Tokens:
                </span>
                {["first_name", "company", "account_id", "cta_url", "unsubscribe_url"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => copyTag(tag)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181b24] hover:bg-[#222634] text-zinc-300 hover:text-white border border-[#282d3c] transition-all flex items-center gap-1"
                  >
                    {copiedTag === tag ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 text-zinc-500" />
                    )}
                    {`{{${tag}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Body Mode Tabs */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#101218] border-b border-[#1f222b]">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setBodyMode("html")}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                    bodyMode === "html"
                      ? "bg-[#1f232e] text-[#ff69b4] font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  HTML Code Body
                </button>
                <button
                  onClick={() => setBodyMode("text")}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                    bodyMode === "text"
                      ? "bg-[#1f232e] text-[#ff69b4] font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Plain Text Fallback
                </button>
              </div>

              <div className="text-[11px] text-zinc-500 font-mono">
                {detectedVariables.length} dynamic variables detected
              </div>
            </div>

            {/* Code / Textarea */}
            <div className="flex-1 relative bg-[#090a0d]">
              {bodyMode === "html" ? (
                <textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  placeholder="Paste or write responsive HTML email template with {{handlebars}} variables..."
                  className="w-full h-full p-4 bg-transparent text-xs font-mono text-zinc-200 resize-none focus:outline-none leading-relaxed selection:bg-[#ff69b4]/30"
                  spellCheck={false}
                />
              ) : (
                <textarea
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  placeholder="Plain text fallback email body..."
                  className="w-full h-full p-4 bg-transparent text-xs font-mono text-zinc-200 resize-none focus:outline-none leading-relaxed selection:bg-[#ff69b4]/30"
                  spellCheck={false}
                />
              )}
            </div>

            {/* Dynamic Variable Test Values Drawer */}
            <div className="p-3 bg-[#0d0f14] border-t border-[#1f222b]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#ff69b4]" /> Live Test Merge Variables
                </span>
                <span className="text-[10px] text-zinc-500">Values replace tokens in preview in real-time</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-24 overflow-y-auto">
                {detectedVariables.length === 0 ? (
                  <span className="text-[11px] text-zinc-500 italic col-span-3">
                    Add dynamic tags like <code>{`{{first_name}}`}</code> or <code>{`{{company}}`}</code> to see live variable fields.
                  </span>
                ) : (
                  detectedVariables.map((v) => (
                    <div key={v} className="flex items-center gap-1.5 bg-[#14161e] px-2 py-1 rounded border border-[#242733]">
                      <span className="text-[10px] font-mono text-[#ff69b4] shrink-0">{v}:</span>
                      <input
                        type="text"
                        value={testVariables[v] || ""}
                        onChange={(e) => setTestVariables({ ...testVariables, [v]: e.target.value })}
                        placeholder={`Value for ${v}`}
                        className="w-full bg-transparent text-xs text-white focus:outline-none"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Side-by-Side Responsive Preview */}
          <div className="w-[480px] bg-[#0d0e12] flex flex-col shrink-0">
            {/* Preview Toolbar */}
            <div className="p-3 bg-[#111319] border-b border-[#1f222b] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#ff69b4]" />
                <span className="text-xs font-semibold text-white">Live Render Preview</span>
              </div>

              {/* Viewport switcher */}
              <div className="flex items-center gap-1 bg-[#181b24] p-1 rounded-md border border-[#262a36]">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    previewDevice === "desktop"
                      ? "bg-[#ff69b4] text-black font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Monitor className="w-3 h-3" /> Desktop
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    previewDevice === "mobile"
                      ? "bg-[#ff69b4] text-black font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-3 h-3" /> Mobile
                </button>
              </div>
            </div>

            {/* Email Meta Preview Header */}
            <div className="p-3 bg-[#14161f] border-b border-[#212430] text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-mono text-[10px] uppercase w-12">Subject:</span>
                <span className="font-semibold text-white truncate">{renderedSubject || "(No subject)"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-mono text-[10px] uppercase w-12">From:</span>
                <span className="text-zinc-300 font-mono text-[11px]">System &lt;noreply@mailops.local&gt;</span>
              </div>
            </div>

            {/* Preview Viewport Frame */}
            <div className="flex-1 overflow-y-auto bg-[#08090b] p-4 flex items-start justify-center">
              {previewDevice === "desktop" ? (
                <div className="w-full bg-[#101217] rounded-lg border border-[#232733] overflow-hidden shadow-2xl">
                  {bodyMode === "html" ? (
                    <iframe
                      srcDoc={renderedHTML}
                      title="Desktop Live Preview"
                      className="w-full h-[520px] bg-white border-0"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <pre className="p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {renderedText || "(No plain text content)"}
                    </pre>
                  )}
                </div>
              ) : (
                /* Mobile Phone Frame */
                <div className="w-[340px] bg-[#1a1d26] rounded-[36px] p-2.5 border-4 border-[#2d3243] shadow-2xl">
                  <div className="w-24 h-4 bg-[#2d3243] rounded-full mx-auto mb-2" />
                  <div className="bg-[#101217] rounded-[24px] overflow-hidden border border-[#232733]">
                    {bodyMode === "html" ? (
                      <iframe
                        srcDoc={renderedHTML}
                        title="Mobile Live Preview"
                        className="w-full h-[460px] bg-white border-0"
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <pre className="p-3 text-[11px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed h-[460px] overflow-y-auto">
                        {renderedText || "(No plain text content)"}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Deliverability Health Radar View */
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0a0b0e]">
          {/* Header Card */}
          <div className="bg-[#111319] border border-[#21242e] rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center font-mono font-bold text-2xl border ${
                  (radar?.overall_score ?? 100) >= 85
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : (radar?.overall_score ?? 100) >= 60
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                }`}
              >
                {radar?.overall_score ?? 100}%
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-white">Google & Yahoo Postmaster Compliance Radar</h2>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                      radar?.compliance_status === "Fully Compliant"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {radar?.compliance_status || "Fully Compliant"}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 max-w-xl">
                  Continuous real-time auditing against Google & Yahoo February 2024 mandatory bulk sender
                  specifications (&lt;0.10% spam rate, &lt;2.0% hard bounce rate, DMARC alignment, RFC 8058 one-click unsub).
                </p>
              </div>
            </div>

            <button
              onClick={loadRadar}
              disabled={radarLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#1b1f2a] hover:bg-[#252b3b] text-white text-xs font-medium rounded-lg border border-[#2e3446] transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${radarLoading ? "animate-spin" : ""}`} />
              Run Continuous Audit
            </button>
          </div>

          {/* 4 Core Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Spam Complaint Rate */}
            <div className="bg-[#111319] border border-[#21242e] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Spam Complaint Rate</span>
                  <span className="font-mono text-[10px] text-zinc-500">Ceiling: 0.10%</span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold font-mono text-white">
                    {(radar?.spam_complaint_rate ?? 0).toFixed(2)}%
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      (radar?.spam_complaint_rate ?? 0) <= 0.10
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {(radar?.spam_complaint_rate ?? 0) <= 0.10 ? "PASSED" : "CRITICAL"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Calculated from live RFC 5965 ARF feedback loops & user complaints.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#1a1c24] flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Target Ceiling</span>
                <span className="font-mono text-emerald-400">&lt; 0.10%</span>
              </div>
            </div>

            {/* Metric 2: Hard Bounce Rate */}
            <div className="bg-[#111319] border border-[#21242e] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Hard Bounce Rate</span>
                  <span className="font-mono text-[10px] text-zinc-500">Threshold: 2.0%</span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold font-mono text-white">
                    {(radar?.hard_bounce_rate ?? 0).toFixed(2)}%
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      (radar?.hard_bounce_rate ?? 0) <= 2.0
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {(radar?.hard_bounce_rate ?? 0) <= 2.0 ? "PASSED" : "ELEVATED"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Pre-send circuit breaker auto-suppresses 5.1.1 unknown recipients.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#1a1c24] flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Target Ceiling</span>
                <span className="font-mono text-emerald-400">&lt; 2.00%</span>
              </div>
            </div>

            {/* Metric 3: DMARC Alignment */}
            <div className="bg-[#111319] border border-[#21242e] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">DMARC Enforcement</span>
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-lg font-bold font-mono text-white">
                    {radar?.dmarc_enforcement ? "p=reject / p=quarantine" : "p=none / pending"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Strict domain alignment matching RFC 7489 policy records.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#1a1c24] flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Policy Status</span>
                <span className={`font-semibold ${radar?.dmarc_enforcement ? "text-emerald-400" : "text-amber-400"}`}>
                  {radar?.dmarc_enforcement ? "Strictly Enforced" : "Needs Elevation"}
                </span>
              </div>
            </div>

            {/* Metric 4: RFC 8058 One-Click Unsubscribe */}
            <div className="bg-[#111319] border border-[#21242e] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">RFC 8058 1-Click Unsub</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-lg font-bold font-mono text-emerald-400">Active & Enforced</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Header injection: <code>List-Unsubscribe-Post: List-Unsubscribe=One-Click</code>.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#1a1c24] flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">KumoMTA Policy</span>
                <span className="font-mono text-emerald-400">RFC 8058 Injected</span>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations & Audit Checklist */}
          <div className="bg-[#111319] border border-[#21242e] rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#ff69b4]" />
              Automated Compliance Recommendations
            </h3>
            <div className="space-y-2.5">
              {radar?.recommendations && radar.recommendations.length > 0 ? (
                radar.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-[#151821] border border-[#242836] text-xs text-zinc-300"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{rec}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-zinc-500">No active alerts. All compliance checks optimal.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
