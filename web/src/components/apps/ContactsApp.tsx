"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  fetchContacts,
  addContact,
  updateContact,
  deleteContact,
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

const INITIAL_CONTACTS: Contact[] = [
  {
    id: "ct-1",
    email: "sarah.connor@cyberdyne.io",
    firstName: "Sarah",
    lastName: "Connor",
    company: "Cyberdyne Systems",
    stage: "Customer",
    list: "Enterprise Tier",
    deliverabilityScore: 99,
    lastActivity: "Opened 2h ago",
  },
  {
    id: "ct-2",
    email: "elena.rostova@vertexdata.com",
    firstName: "Elena",
    lastName: "Rostova",
    company: "Vertex Data Corp",
    stage: "Demo Booked",
    list: "Q4 High-Touch",
    deliverabilityScore: 97,
    lastActivity: "Clicked 18m ago",
  },
  {
    id: "ct-3",
    email: "marcus.vance@solarisinfra.net",
    firstName: "Marcus",
    lastName: "Vance",
    company: "Solaris Infrastructure",
    stage: "Customer",
    list: "Enterprise Tier",
    deliverabilityScore: 100,
    lastActivity: "Sent 1d ago",
  },
  {
    id: "ct-4",
    email: "dev.team@hyperioncloud.tech",
    firstName: "Hyperion",
    lastName: "DevOps",
    company: "Hyperion Cloud",
    stage: "Lead",
    list: "Developer Self-Serve",
    deliverabilityScore: 92,
    lastActivity: "Subscribed 3d ago",
  },
  {
    id: "ct-5",
    email: "alex.mercer@blackwatch.org",
    firstName: "Alex",
    lastName: "Mercer",
    company: "Blackwatch Labs",
    stage: "Lead",
    list: "Developer Self-Serve",
    deliverabilityScore: 95,
    lastActivity: "Subscribed 4d ago",
  },
  {
    id: "ct-6",
    email: "chloe.price@arcadiabay.edu",
    firstName: "Chloe",
    lastName: "Price",
    company: "Blackwell Analytics",
    stage: "Churned",
    list: "Inactive Re-engagement",
    deliverabilityScore: 78,
    lastActivity: "Bounced 2w ago",
  },
];

export const ContactsApp: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
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
      if (Array.isArray(data) && data.length > 0) {
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
           SCREEN VIEW 2: AUDIENCE RECIPIENTS DIRECTORY (DEFAULT)
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
  );
};
