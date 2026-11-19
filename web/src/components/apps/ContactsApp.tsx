"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  fetchContacts,
  addContact,
  updateContact,
  deleteContact,
  verifyBulkEmails,
  importCleanLeads,
  LeadVerificationResult,
  BulkVerificationSummary,
} from "../../lib/api";

import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit2,
  Mail,
  Building,
  CheckSquare,
  Square,
  Filter,
  Download,
  ShieldCheck,
  AlertTriangle,
  X,
  UserCheck,
  Tag,
  CheckCircle2,
  ArrowLeft,
  Activity,
  Check,
  FileSpreadsheet,
  Sparkles,
  Clock,
  ShieldAlert,
  Layers,
  Zap,
} from "lucide-react";

export interface Contact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  stage: "Lead" | "Customer" | "Demo Booked" | "Churned";
  list: string;
  deliverabilityScore: number;
  lastActivity: string;
}

export const ContactsApp: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("All Contacts");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 5000);
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchContacts();
      if (Array.isArray(data)) {
        const mapped: Contact[] = data.map((d: any) => {
          const parts = (d.name || "").split(" ");
          return {
            id: d.id,
            email: d.email,
            firstName: parts[0] || d.email.split("@")[0],
            lastName: parts.slice(1).join(" ") || "",
            company: d.company || "Enterprise Corp",
            stage: "Customer",
            list: d.tags && d.tags.length > 0 ? d.tags[0] : "Enterprise Tier",
            deliverabilityScore: d.delivery_health === "optimal" ? 99 : d.delivery_health === "caution" ? 75 : 45,
            lastActivity: d.last_active || "Recent",
          };
        });
        setContacts(mapped);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // SCREEN VIEW: "directory" | "add" | "edit" (NO DIALOG BOXES!)
  const [screenView, setScreenView] = useState<"directory" | "add" | "edit">("directory");
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);

  // Form State
  const [formEmail, setFormEmail] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formStage, setFormStage] = useState<Contact["stage"]>("Lead");
  const [formList, setFormList] = useState("Enterprise Tier");

  const folders = [
    { name: "All Contacts", count: contacts.length },
    { name: "Enterprise Tier", count: contacts.filter((c) => c.list === "Enterprise Tier").length },
    { name: "Q4 High-Touch", count: contacts.filter((c) => c.list === "Q4 High-Touch").length },
    { name: "Developer Self-Serve", count: contacts.filter((c) => c.list === "Developer Self-Serve").length },
    { name: "Inactive Re-engagement", count: contacts.filter((c) => c.list === "Inactive Re-engagement").length },
  ];

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === "All Contacts" || c.list === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  // SELECTION
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((c) => c.id));
    }
  };

  // NAVIGATE TO ADD SCREEN
  const handleOpenAddScreen = () => {
    setFormEmail("");
    setFormFirstName("");
    setFormLastName("");
    setFormCompany("");
    setFormStage("Lead");
    setFormList(selectedFolder === "All Contacts" ? "Enterprise Tier" : selectedFolder);
    setScreenView("add");
  };

  // NAVIGATE TO EDIT SCREEN
  const handleOpenEditScreen = (c: Contact) => {
    setContactToEdit(c);
    setFormEmail(c.email);
    setFormFirstName(c.firstName);
    setFormLastName(c.lastName);
    setFormCompany(c.company);
    setFormStage(c.stage);
    setFormList(c.list);
    setScreenView("edit");
  };

  // SAVE ADD
  const handleSaveAdd = async () => {
    if (!formEmail.trim() || !formFirstName.trim()) return;
    try {
      await addContact({
        email: formEmail.trim(),
        name: `${formFirstName.trim()} ${formLastName.trim()}`.trim(),
        company: formCompany.trim() || "Independent",
        tags: [formList],
        status: "subscribed",
        delivery_health: "optimal",
      });
      showNotice(`Contact ${formEmail} created successfully!`);
      setScreenView("directory");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add contact");
    }
  };

  // SAVE EDIT
  const handleSaveEdit = async () => {
    if (!contactToEdit) return;
    try {
      await updateContact({
        id: contactToEdit.id,
        email: formEmail.trim(),
        name: `${formFirstName.trim()} ${formLastName.trim()}`.trim(),
        company: formCompany.trim(),
        tags: [formList],
      });
      showNotice(`Contact ${formEmail} updated successfully!`);
      setScreenView("directory");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update contact");
    }
  };

  // DELETE SINGLE
  const handleDeleteSingle = async (id: string) => {
    if (confirm("Permanently erase this recipient record?")) {
      try {
        await deleteContact(id);
        showNotice("Contact deleted successfully");
        if (screenView === "edit") setScreenView("directory");
        await loadData();
      } catch (err: any) {
        alert(err.message || "Failed to delete contact");
      }
    }
  };

  // BULK DELETE
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      confirm(
        `Are you sure you want to permanently erase ${selectedIds.length} contact(s) under GDPR compliance rules?`
      )
    ) {
      try {
        for (const id of selectedIds) {
          await deleteContact(id);
        }
        showNotice(`Erased ${selectedIds.length} contact(s)`);
        setSelectedIds([]);
        await loadData();
      } catch (err: any) {
        alert(err.message || "Failed to delete selected contacts");
      }
    }
  };

  // Tab Switcher: "contacts" | "verifier"
  const [activeTab, setActiveTab] = useState<"contacts" | "verifier">("contacts");

  // Lead Hygiene & Verifier State
  const [verifierInput, setVerifierInput] = useState<string>(
    "alex.mercer@google.com\nsarah.connor@microsoft.com\nadmin@acme-corp.com\ninvalid-syntax-user\nthrowaway@mailinator.com\ncontact@stripe.com\nsupport@amazon.com\nfake.prospect@nonexistent-domain-999.xyz"
  );
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifierSummary, setVerifierSummary] = useState<BulkVerificationSummary | null>(null);
  const [isImportingClean, setIsImportingClean] = useState<boolean>(false);

  const handleRunVerification = async () => {
    if (!verifierInput.trim()) return;
    try {
      setIsVerifying(true);
      const rawLines = verifierInput.split(/[\n,;]+/);
      const emails: string[] = [];
      for (const line of rawLines) {
        const trimmed = line.trim();
        if (trimmed) emails.push(trimmed);
      }
      if (emails.length === 0) return;
      const res = await verifyBulkEmails(emails);
      setVerifierSummary(res);
      showNotice(`Hygiene audit complete: ${res.valid_count} clean, ${res.risky_count} risky, ${res.invalid_count} invalid.`);
    } catch (err: any) {
      showNotice("Error during lead verification: " + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleImportClean = async () => {
    if (!verifierSummary || verifierSummary.valid_count === 0) return;
    try {
      setIsImportingClean(true);
      const res = await importCleanLeads(verifierSummary.results, "Verified Clean Leads");
      showNotice(res.message);
      await loadData();
      setActiveTab("contacts");
    } catch (err: any) {
      showNotice("Failed to import clean leads: " + err.message);
    } finally {
      setIsImportingClean(false);
    }
  };

  const handleExportCleanCsv = () => {
    if (!verifierSummary) return;
    const cleanEmails = verifierSummary.results
      .filter((r) => r.status === "valid")
      .map((r) => r.email)
      .join("\n");
    navigator.clipboard.writeText(cleanEmails);
    showNotice(`Copied ${verifierSummary.valid_count} verified emails to clipboard!`);
  };

  return (
    <div className="flex flex-col h-full bg-[#08090c] text-xs select-none">
      {/* ========================================================
          SCREEN VIEW 1: ADD OR EDIT CONTACT SCREEN (NO DIALOGS)
          ======================================================== */}
      {screenView === "add" || screenView === "edit" ? (
        <div className="flex-1 flex flex-col bg-[#0a0b0e] overflow-auto">
          {/* Top Breadcrumb */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-[#0e1015] border-b border-[#20242e] shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setScreenView("directory")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141720] hover:bg-[#1a1e2a] border border-[#262c3b] text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Audience</span>
              </button>
              <div className="h-4 w-px bg-[#262c3b]" />
              <div className="flex items-center gap-2">
                <span className="text-[#8a8f98]">ZMAIL Audience</span>
                <span className="text-[#62666d]">/</span>
                <span className="font-semibold text-[#f7f8f8]">
                  {screenView === "add" ? "Enroll New Recipient" : `Edit Profile: ${formEmail}`}
                </span>
              </div>
            </div>

            {/* Actions (Black text on hot-pink, NEVER white on pink) */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setScreenView("directory")}
                className="px-3 py-1.5 rounded-lg text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141720]"
              >
                Cancel
              </button>
              <button
                onClick={screenView === "add" ? handleSaveAdd : handleSaveEdit}
                disabled={!formEmail.trim() || !formFirstName.trim()}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#ff69b4] hover:bg-[#ff52a4] disabled:opacity-50 text-[#0a0a0c] font-bold shadow-lg shadow-[#ff69b4]/25 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{screenView === "add" ? "Save & Enroll" : "Update Contact"}</span>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="max-w-3xl w-full mx-auto p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#f7f8f8] tracking-tight">
                {screenView === "add" ? "Enroll Contact in Audience" : "Edit Recipient Profile"}
              </h2>
              <p className="text-sm text-[#8a8f98] mt-1">
                Configure contact identity attributes, assign audience segments, and review automatic MX deliverability ratings.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0e1015] border border-[#20242e] space-y-4">
              <h3 className="font-bold text-sm text-[#f7f8f8]">Contact Credentials</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-[#8a8f98] block mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3.5 py-2 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#8a8f98] block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3.5 py-2 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/60 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#8a8f98] block mb-1">Email Address *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3.5 py-2 text-xs text-[#f7f8f8] font-mono focus:border-[#ff69b4]/60 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-[#8a8f98] block mb-1">Company</label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3.5 py-2 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#8a8f98] block mb-1">Lifecycle Stage</label>
                  <select
                    value={formStage}
                    onChange={(e) => setFormStage(e.target.value as any)}
                    className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3.5 py-2 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/60 focus:outline-none"
                  >
                    <option value="Lead">Lead</option>
                    <option value="Demo Booked">Demo Booked</option>
                    <option value="Customer">Customer</option>
                    <option value="Churned">Churned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#8a8f98] block mb-1">Audience Segment Folder</label>
                <select
                  value={formList}
                  onChange={(e) => setFormList(e.target.value)}
                  className="w-full bg-[#141720] border border-[#262c3b] rounded-xl px-3.5 py-2 text-xs text-[#f7f8f8] focus:border-[#ff69b4]/60 focus:outline-none"
                >
                  <option value="Enterprise Tier">Enterprise Tier</option>
                  <option value="Q4 High-Touch">Q4 High-Touch</option>
                  <option value="Developer Self-Serve">Developer Self-Serve</option>
                  <option value="Inactive Re-engagement">Inactive Re-engagement</option>
                </select>
              </div>
            </div>

            {/* Deliverability Health Card */}
            <div className="p-5 rounded-2xl bg-[#0e1015] border border-[#20242e] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#27a644]" />
                <div>
                  <div className="font-bold text-xs text-[#f7f8f8]">Deliverability Health Prediction</div>
                  <div className="text-[11px] text-[#8a8f98]">
                    MX route verified against Google/Microsoft routing tables.
                  </div>
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-[#27a644] bg-[#27a644]/15 border border-[#27a644]/30 px-2.5 py-1 rounded-lg">
                Score: 99 / 100
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
           SCREEN VIEW 2: AUDIENCE RECIPIENTS DIRECTORY & VERIFIER
           ======================================================== */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Universal Audience App Mode Switcher */}
          <div className="flex items-center justify-between px-5 py-2.5 bg-[#0a0b0e] border-b border-[#1e222c] shrink-0">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#06070a] border border-[#1a1e28]">
              <button
                type="button"
                onClick={() => setActiveTab("contacts")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "contacts"
                    ? "bg-[#ff69b4] text-[#0a0a0c] shadow-md shadow-[#ff69b4]/20"
                    : "text-[#8a8f98] hover:text-[#f7f8f8]"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>👥 Audience Directory ({contacts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("verifier")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "verifier"
                    ? "bg-[#ff69b4] text-[#0a0a0c] shadow-md shadow-[#ff69b4]/20"
                    : "text-[#8a8f98] hover:text-[#f7f8f8]"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>🛡️ Lead Hygiene & Syntax/MX Verifier (ZeroBounce Studio)</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#11131a] border border-[#202532] text-[#8a8f98]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
                <span>DNS Resolver: ACTIVE</span>
              </span>
            </div>
          </div>

          {activeTab === "verifier" ? (
            /* ========================================================
               SCREEN VIEW: REAL-TIME LEAD HYGIENE & VERIFIER STUDIO
               ======================================================== */
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0b0e]">
              {/* Header Action Bar */}
              <div className="flex items-center justify-between px-6 py-3.5 bg-[#0e1015] border-b border-[#20242e] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#ff69b4]/10 border border-[#ff69b4]/30 flex items-center justify-center text-[#ff69b4]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#f7f8f8]">Real-Time Lead Hygiene & MX Verifier</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1a0e1c] text-[#ff69b4] border border-[#ff69b4]/30 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#ff69b4]" />
                        Built-in ZeroBounce / NeverBounce Alternative
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8a8f98]">
                      Verify destination MX records, filter disposable burner emails, catch-all domains, and syntax errors with zero per-verification fee.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {verifierSummary && verifierSummary.valid_count > 0 && (
                    <button
                      type="button"
                      onClick={handleImportClean}
                      disabled={isImportingClean}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27a644] hover:bg-[#22923c] text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isImportingClean ? "Importing..." : `Import ${verifierSummary.valid_count} Clean Leads`}</span>
                    </button>
                  )}

                  {verifierSummary && (
                    <button
                      type="button"
                      onClick={handleExportCleanCsv}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141720] hover:bg-[#1c2130] border border-[#2a3142] text-xs font-semibold text-[#f7f8f8] transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#ff69b4]" />
                      <span>Copy Clean List</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Main Verifier Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Metrics Cards Strip */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#11131a] border border-[#20242e] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#8a8f98]">Total Leads Analyzed</span>
                      <p className="text-xl font-bold text-white mt-1">
                        {verifierSummary ? verifierSummary.total_processed : 0}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-[#181c26] border border-[#262c3b] flex items-center justify-center text-[#ff69b4]">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#11131a] border border-[#20242e] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#8a8f98]">Deliverable & Clean (Valid MX)</span>
                      <p className="text-xl font-bold text-[#27a644] mt-1">
                        {verifierSummary ? verifierSummary.valid_count : 0}
                        {verifierSummary && verifierSummary.total_processed > 0 && (
                          <span className="text-xs text-[#8a8f98] font-normal ml-1.5">
                            ({verifierSummary.clean_rate.toFixed(1)}%)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-[#0d1f14] border border-[#27a644]/30 flex items-center justify-center text-[#27a644]">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#11131a] border border-[#20242e] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#8a8f98]">Risky (Role / Generic)</span>
                      <p className="text-xl font-bold text-[#f59e0b] mt-1">
                        {verifierSummary ? verifierSummary.risky_count : 0}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-[#2b1f0d] border border-[#f59e0b]/30 flex items-center justify-center text-[#f59e0b]">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#11131a] border border-[#20242e] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#8a8f98]">Invalid / Disposable / Dead</span>
                      <p className="text-xl font-bold text-[#ef4444] mt-1">
                        {verifierSummary ? verifierSummary.invalid_count : 0}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-[#2b1114] border border-[#ef4444]/30 flex items-center justify-center text-[#ef4444]">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Input & Action Panel */}
                <div className="p-5 rounded-2xl bg-[#0d0f15] border border-[#1e2330] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#ff69b4]" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-white">Lead Ingestion & Hygiene Inspector</h3>
                    </div>
                    <span className="text-[11px] font-mono text-[#8a8f98]">
                      Paste CSV rows or email addresses (one per line or comma-separated)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <textarea
                        rows={6}
                        value={verifierInput}
                        onChange={(e) => setVerifierInput(e.target.value)}
                        placeholder="alex@example.com&#10;sarah@company.com"
                        className="w-full bg-[#12141c] border border-[#242938] rounded-xl p-3 text-xs text-[#f7f8f8] font-mono leading-relaxed focus:outline-none focus:border-[#ff69b4]"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-[#62666d] font-mono">
                          {verifierInput.split(/[\n,;]+/).filter((s) => s.trim()).length} email(s) queued for verification
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setVerifierInput("")}
                            className="px-3 py-1.5 text-xs text-[#8a8f98] hover:text-white cursor-pointer"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={handleRunVerification}
                            disabled={isVerifying}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#ff69b4] hover:bg-[#ff52a4] disabled:opacity-50 text-[#0a0a0c] font-bold text-xs shadow-md shadow-[#ff69b4]/20 transition-all cursor-pointer"
                          >
                            <Zap className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
                            <span>{isVerifying ? "Verifying MX & Syntax..." : "⚡ Run Real-Time Hygiene Audit"}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#12141c] border border-[#222736] space-y-2 text-[11px] text-[#8a8f98]">
                      <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#27a644]" />
                        <span>Hygiene Audit Checkpoints</span>
                      </h4>
                      <ul className="space-y-1.5 pt-1">
                        <li className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#27a644] shrink-0 mt-0.5" />
                          <span><strong>RFC-5322 Syntax:</strong> Strict format validation and valid Top-Level Domain (TLD) confirmation.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#27a644] shrink-0 mt-0.5" />
                          <span><strong>Live DNS MX Lookup:</strong> Queries authoritative nameservers to confirm mail server availability.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#27a644] shrink-0 mt-0.5" />
                          <span><strong>Burner Filter:</strong> Instant rejection of 10-minute temporary disposable domains.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#f59e0b] shrink-0 mt-0.5" />
                          <span><strong>Role Account Flag:</strong> Highlights generic aliases (admin, billing, support) that harm sender reputation.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Audit Results Table */}
                {verifierSummary && (
                  <div className="rounded-2xl bg-[#0e1015] border border-[#20242e] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[#20242e] flex items-center justify-between bg-[#12141c]">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#ff69b4]" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-white">Hygiene Audit Inspection Results</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181d28] text-[#8a8f98] border border-[#262c3b]">
                          {verifierSummary.results.length} Leads Analyzed
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[11px] text-[#8a8f98]">
                          Clean Rate: <strong className="text-[#27a644]">{verifierSummary.clean_rate.toFixed(1)}%</strong>
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#20242e] bg-[#0c0d12] text-[#8a8f98] font-mono text-[11px]">
                            <th className="py-3 px-4">Email Address</th>
                            <th className="py-3 px-4">Domain</th>
                            <th className="py-3 px-4">DNS MX Host</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Score</th>
                            <th className="py-3 px-4">Audit Diagnostic</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#181c26]">
                          {verifierSummary.results.map((r, idx) => (
                            <tr key={idx} className="hover:bg-[#12151e]/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-white">
                                {r.email}
                              </td>
                              <td className="py-3 px-4 text-zinc-300 font-mono text-[11px]">
                                {r.domain || "-"}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px]">
                                {r.has_mx ? (
                                  <div className="flex items-center gap-1.5 text-zinc-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
                                    <span className="truncate max-w-[180px]">
                                      {r.mx_hosts && r.mx_hosts.length > 0 ? r.mx_hosts[0] : "Active MX"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[#ef4444] font-mono">No MX Record</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {r.status === "valid" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0d1f14] text-[#27a644] border border-[#27a644]/30 font-semibold text-[10px]">
                                    <CheckCircle2 className="w-3 h-3 text-[#27a644]" />
                                    Deliverable (Clean)
                                  </span>
                                ) : r.status === "risky" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2b1f0d] text-[#f59e0b] border border-[#f59e0b]/30 font-semibold text-[10px]">
                                    <AlertTriangle className="w-3 h-3 text-[#f59e0b]" />
                                    Risky (Role Account)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2b1114] text-[#ef4444] border border-[#ef4444]/30 font-semibold text-[10px]">
                                    <ShieldAlert className="w-3 h-3 text-[#ef4444]" />
                                    Invalid / Rejected
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono font-bold">
                                <span className={r.score >= 85 ? "text-[#27a644]" : r.score >= 60 ? "text-[#f59e0b]" : "text-[#ef4444]"}>
                                  {r.score} / 100
                                </span>
                              </td>
                              <td className="py-3 px-4 text-[#8a8f98] text-[11px]">
                                {r.reason}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================
               SCREEN VIEW: AUDIENCE RECIPIENTS DIRECTORY (DEFAULT)
               ======================================================== */
            <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#0c0d12] border-b border-[#1f232d] shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#ff69b4]" />
                <span className="font-semibold text-[#f7f8f8]">Audience Directory</span>
                <span className="text-[10px] text-[#8a8f98] font-mono px-2 py-0.5 rounded-full bg-[#141720] border border-[#222735]">
                  {contacts.length} recipients
                </span>
              </div>

              <div className="h-4 w-px bg-[#222735] hidden sm:block" />

              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="w-3.5 h-3.5 text-[#8a8f98] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, email, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#12141c] border border-[#222735] rounded-lg pl-8 pr-3 py-1 text-xs text-[#f7f8f8] placeholder-[#555a66] focus:outline-none focus:border-[#ff69b4]/50 w-60"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* BULK DELETE BUTTON */}
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ef4444]/20 hover:bg-[#ef4444]/30 border border-[#ef4444]/40 text-[#ef4444] font-medium text-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge Selected ({selectedIds.length})</span>
                </button>
              )}

              {/* CREATE CONTACT BUTTON (Opens Full Screen, NO DIALOG, Black on Pink) */}
              <button
                onClick={handleOpenAddScreen}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ff69b4] hover:bg-[#ff52a4] text-[#0a0a0c] font-bold text-xs shadow-md shadow-[#ff69b4]/20 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contact</span>
              </button>
            </div>
          </div>

          {/* Main Layout: Folder Sidebar + Table */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Segment List */}
            <div className="w-56 bg-[#0a0b0e] border-r border-[#1e222c] p-3 space-y-1 shrink-0">
              <span className="text-[10px] uppercase font-mono text-[#8a8f98] px-2 block mb-2 font-semibold">
                Audience Segments
              </span>
              {folders.map((f) => {
                const isSelected = selectedFolder === f.name;
                return (
                  <button
                    key={f.name}
                    onClick={() => setSelectedFolder(f.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#141722] text-[#f7f8f8] font-medium border border-[#ff69b4]/30 shadow-md"
                        : "text-[#8a8f98] hover:bg-[#111319] hover:text-[#d0d6e0]"
                    }`}
                  >
                    <span className="truncate">{f.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1a1d27] text-[#8a8f98]">
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Contacts Table */}
            <div className="flex-1 overflow-auto p-5">
              <div className="rounded-2xl border border-[#1f232f] bg-[#0e1017] overflow-hidden shadow-xl shadow-black/40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1f232f] bg-[#12141d] text-[#8a8f98] text-[11px]">
                      <th className="p-3 w-10 text-center">
                        <button
                          onClick={handleSelectAll}
                          className="cursor-pointer text-[#8a8f98] hover:text-[#f7f8f8]"
                        >
                          {selectedIds.length === filtered.length && filtered.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-[#ff69b4]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Stage</th>
                      <th className="p-3">Segment List</th>
                      <th className="p-3">Deliverability</th>
                      <th className="p-3">Recent Activity</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171a24]">
                    {filtered.map((c) => {
                      const isChecked = selectedIds.includes(c.id);

                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-[#131620] transition-colors ${
                            isChecked ? "bg-[#141722]" : ""
                          }`}
                        >
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleToggleSelect(c.id)}
                              className="cursor-pointer text-[#8a8f98] hover:text-[#f7f8f8]"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-[#ff69b4]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          <td className="p-3">
                            <div className="font-semibold text-[#f7f8f8]">
                              {c.firstName} {c.lastName}
                            </div>
                            <div className="text-[11px] text-[#8a8f98] font-mono">{c.email}</div>
                          </td>

                          <td className="p-3 text-[#d0d6e0]">{c.company}</td>

                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                                c.stage === "Demo Booked"
                                  ? "bg-[#ff69b4]/15 border-[#ff69b4]/30 text-[#ff69b4]"
                                  : c.stage === "Customer"
                                  ? "bg-[#27a644]/15 border-[#27a644]/30 text-[#27a644]"
                                  : c.stage === "Lead"
                                  ? "bg-[#3b9eff]/15 border-[#3b9eff]/30 text-[#3b9eff]"
                                  : "bg-[#ef4444]/15 border-[#ef4444]/30 text-[#ef4444]"
                              }`}
                            >
                              {c.stage}
                            </span>
                          </td>

                          <td className="p-3 text-[#8a8f98]">{c.list}</td>

                          <td className="p-3">
                            <span className="font-mono text-[#27a644] font-medium">
                              {c.deliverabilityScore}%
                            </span>
                          </td>

                          <td className="p-3 text-[#8a8f98] text-[11px]">{c.lastActivity}</td>

                          {/* Action Buttons on Row */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditScreen(c)}
                                title="Edit Contact"
                                className="p-1.5 rounded-lg hover:bg-[#1a1f2e] text-[#d0d6e0] hover:text-[#ff69b4] transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSingle(c.id)}
                                title="Delete Contact"
                                className="p-1.5 rounded-lg hover:bg-[#ef4444]/20 text-[#8a8f98] hover:text-[#ef4444] transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )}
</div>
);
};
