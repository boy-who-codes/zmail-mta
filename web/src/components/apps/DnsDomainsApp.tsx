"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Star,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Globe,
  Plus,
  AlertCircle,
  Trash2,
  Key,
  Server,
  FileText,
  Mail,
  ArrowRight,
  Cloud,
  ExternalLink,
  ShieldAlert,
  Shield,
  Search,
  Activity,
  Flame,
  Download,
  Code2,
  Terminal,
  Zap,
  Info,
  Layers,
  Radio,
} from "lucide-react";
import { OutboundDoctorModal } from "../modals/OutboundDoctorModal";
import {
  fetchDomains,
  addDomain,
  batchAddDomains,
  deleteDomain,
  setPrimaryDomain,
  verifyDomain,
  generateDkimKey,
  syncCloudflareDNS,
  fetchCloudflareStatus,
  saveCloudflareCredentials,
  fetchInfrastructureDetection,
  detectInfrastructureNow,
  InfrastructureInfo,
  checkRBLTarget,
  fetchRBLSummary,
  RBLTargetAudit,
  RBLAuditSummary
} from "../../lib/api";
import { copyToClipboardSafe } from "../../lib/clipboard";

interface DomainRecord {
  id: string;
  domain: string;
  spf: "valid" | "invalid";
  dkim: "valid" | "invalid";
  dmarc: "valid" | "invalid";
  ptr: "valid" | "invalid";
  isFavorite: boolean;
  selector: string;
  dkimPublicKey: string;
  spfRecord: string;
  dmarcRecord: string;
  mxRecord: string;
}

interface DnsCheckResult {
  spf_valid: boolean;
  spf_record: string;
  dkim_valid: boolean;
  dkim_record: string;
  dmarc_valid: boolean;
  dmarc_record: string;
  ptr_valid: boolean;
  ptr_record: string;
}

export const DnsDomainsApp: React.FC = () => {
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string>("");
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isGeneratingDkim, setIsGeneratingDkim] = useState<boolean>(false);
  const [liveCheckStatus, setLiveCheckStatus] = useState<string>("");
  const [dnsDetails, setDnsDetails] = useState<DnsCheckResult | null>(null);

  // Screen state
  const [subScreen, setSubScreen] = useState<"list" | "add-domain" | "cloudflare" | "rbl-watchdog">("list");
  const [domainInput, setDomainInput] = useState<string>("");
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDoctorModal, setShowDoctorModal] = useState<boolean>(false);

  // Batch Domain State
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchDomainsInput, setBatchDomainsInput] = useState<string>("");
  const [isBatchAdding, setIsBatchAdding] = useState<boolean>(false);
  const [batchResultMsg, setBatchResultMsg] = useState<string>("");

  // RBL Blacklist Watchdog State
  const [rblTargetInput, setRblTargetInput] = useState<string>("");
  const [rblAudit, setRblAudit] = useState<RBLTargetAudit | null>(null);
  const [rblSummary, setRblSummary] = useState<RBLAuditSummary | null>(null);
  const [isCheckingRBL, setIsCheckingRBL] = useState<boolean>(false);
  const [rblError, setRblError] = useState<string>("");

  const handleRunRBLCheck = async (targetOverride?: string) => {
    const target = (targetOverride || rblTargetInput || selectedDomain || infraInfo?.public_ip || "").trim();
    if (!target) return;
    try {
      setIsCheckingRBL(true);
      setRblError("");
      const res = await checkRBLTarget(target);
      setRblAudit(res);
      setRblTargetInput(target);
    } catch (err: any) {
      setRblError(err.message || "Failed to query RBL DNS providers");
    } finally {
      setIsCheckingRBL(false);
    }
  };

  const handleRunFleetRBLScan = async () => {
    try {
      setIsCheckingRBL(true);
      setRblError("");
      const res = await fetchRBLSummary();
      setRblSummary(res);
      if (res.audits && res.audits.length > 0) {
        setRblAudit(res.audits[0]);
        setRblTargetInput(res.audits[0].target);
      }
    } catch (err: any) {
      setRblError(err.message || "Failed to scan system fleet blacklists");
    } finally {
      setIsCheckingRBL(false);
    }
  };


  const [cfToken, setCfToken] = useState<string>("");
  const [cfApiKey, setCfApiKey] = useState<string>("");
  const [cfEmail, setCfEmail] = useState<string>("");
  const [cfZoneId, setCfZoneId] = useState<string>("");
  const [cfIncludeMx, setCfIncludeMx] = useState<boolean>(true);
  const [cfRemember, setCfRemember] = useState<boolean>(true);
  const [isSyncingCf, setIsSyncingCf] = useState<boolean>(false);
  const [cfSyncStatus, setCfSyncStatus] = useState<string>("");
  const [cfSyncError, setCfSyncError] = useState<string>("");
  const [cfServerStatus, setCfServerStatus] = useState<{ configured: boolean; auth_type?: string; email?: string } | null>(null);
  const [cfTab, setCfTab] = useState<"auto" | "api" | "bind" | "script">("auto");

  // Infrastructure auto-detection state
  const [infraInfo, setInfraInfo] = useState<InfrastructureInfo | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  const handleDetectNow = async () => {
    try {
      setIsDetecting(true);
      const res = await detectInfrastructureNow();
      setInfraInfo(res);
      await loadDomains();
    } catch (err: any) {
      alert(err.message || "Failed to detect server infrastructure");
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("mailops_cf_token");
      if (savedToken) setCfToken(savedToken);
      const savedEmail = localStorage.getItem("mailops_cf_email");
      if (savedEmail) setCfEmail(savedEmail);
      const savedKey = localStorage.getItem("mailops_cf_key");
      if (savedKey) setCfApiKey(savedKey);
    }
    fetchInfrastructureDetection().then(setInfraInfo).catch(() => null);
    fetchCloudflareStatus().then((s) => {
      setCfServerStatus(s);
      if (s.configured) {
        setCfTab("auto");
      }
    }).catch(() => null);
  }, []);

  const copyToClipboard = async (text: string, id: string) => {
    const ok = await copyToClipboardSafe(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2200);
    }
  };

  const loadDomains = async () => {
    try {
      const data = await fetchDomains();
      if (Array.isArray(data) && data.length > 0) {
        setDomains(
          data.map((d: any) => ({
            id: d.id,
            domain: d.domain_name,
            spf: d.spf_status === "valid" ? "valid" : "invalid",
            dkim: d.dkim_status === "valid" ? "valid" : "invalid",
            dmarc: d.dmarc_status === "valid" ? "valid" : "invalid",
            ptr: d.ptr_status === "valid" ? "valid" : "invalid",
            isFavorite: d.is_primary,
            selector: d.dkim_selector || "k202611",
            dkimPublicKey: d.dkim_public_key || "",
            spfRecord: d.spf_record || "v=spf1 ~all",
            dmarcRecord: d.dmarc_record || `v=DMARC1; p=reject; pct=100; rua=mailto:dmarc-reports@${d.domain_name}`,
            mxRecord: d.mx_record || `10 mail.${d.domain_name}`,
          }))
        );
        if (!selectedDomain || !data.some((d: any) => d.domain_name === selectedDomain)) {
          setSelectedDomain(data[0].domain_name);
        }
      } else {
        setDomains([]);
        setSelectedDomain("");
      }
    } catch {
      setDomains([]);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const handleSelectDomain = async (dName: string) => {
    setSelectedDomain(dName);
    await checkDomainDns(dName);
  };

  const checkDomainDns = async (dName: string) => {
    if (!dName) return;
    setIsChecking(true);
    setLiveCheckStatus("");
    try {
      const res: DnsCheckResult = await verifyDomain(dName);
      setDnsDetails(res);
      const allValid = res.spf_valid && res.dkim_valid && res.dmarc_valid;
      if (allValid) {
        setLiveCheckStatus("Authentication verified live! Domain is authorized for delivery.");
      } else {
        setLiveCheckStatus("DNS queried live: Records pending propagation or not yet published at DNS host.");
      }
      setTimeout(() => setLiveCheckStatus(""), 5000);
      await loadDomains();
    } catch {
      setLiveCheckStatus("DNS lookup query timed out or resolver unreachable.");
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (selectedDomain) {
      checkDomainDns(selectedDomain);
    }
  }, [selectedDomain]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!clean) return;

    try {
      setIsAdding(true);
      await addDomain(clean);
      setDomainInput("");
      setSubScreen("list");
      await loadDomains();
      setSelectedDomain(clean);
      await checkDomainDns(clean);
    } catch (err: any) {
      alert(err.message || "Failed to add domain");
    } finally {
      setIsAdding(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawList = batchDomainsInput
      .split(/[\n,]+/)
      .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
      .filter((d) => d.length > 0 && d.includes("."));

    if (rawList.length === 0) {
      alert("Please enter at least one valid domain name.");
      return;
    }

    try {
      setIsBatchAdding(true);
      setBatchResultMsg("");
      const res = await batchAddDomains(rawList);
      await loadDomains();
      if (res.added && res.added.length > 0) {
        setSelectedDomain(res.added[0].domain_name || res.added[0].domain);
      }
      setBatchResultMsg(
        `Success! Added ${res.added.length} domains with 2048-bit RSA DKIM keypairs.${
          res.failed && res.failed.length > 0 ? ` (${res.failed.length} skipped)` : ""
        }`
      );
      setTimeout(() => {
        setShowBatchModal(false);
        setBatchDomainsInput("");
        setBatchResultMsg("");
      }, 2500);
    } catch (err: any) {
      alert(err.message || "Failed to batch add domains");
    } finally {
      setIsBatchAdding(false);
    }
  };

  const handleGenerateDkim = async () => {
    if (!selectedDomain) return;
    try {
      setIsGeneratingDkim(true);
      const res = await generateDkimKey(selectedDomain);
      await loadDomains();
      if (res && res.public_key_txt) {
        setLiveCheckStatus("Generated genuine 2048-bit RSA DKIM keypair! Update your DNS TXT record.");
        setTimeout(() => setLiveCheckStatus(""), 4500);
      }
    } catch {
      alert("Failed to generate DKIM key");
    } finally {
      setIsGeneratingDkim(false);
    }
  };

  const handleSetPrimary = async (domainName: string) => {
    try {
      await setPrimaryDomain(domainName);
      await loadDomains();
    } catch (err: any) {
      alert(err.message || "Failed to set primary domain");
    }
  };

  const handleDeleteDomain = async (domainName: string) => {
    if (!confirm(`Are you sure you want to delete sending domain "${domainName}"?`)) return;
    try {
      setIsDeleting(true);
      await deleteDomain(domainName);
      await loadDomains();
      if (selectedDomain === domainName) {
        setSelectedDomain("");
        setDnsDetails(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete domain");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncCloudflare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedDomain) return;

    try {
      setIsSyncingCf(true);
      setCfSyncError("");
      setCfSyncStatus("Authenticating with Cloudflare and auto-publishing DNS records...");

      if (cfRemember && (cfToken.trim() || (cfApiKey.trim() && cfEmail.trim()))) {
        if (cfToken.trim()) localStorage.setItem("mailops_cf_token", cfToken.trim());
        if (cfEmail.trim()) localStorage.setItem("mailops_cf_email", cfEmail.trim());
        if (cfApiKey.trim()) localStorage.setItem("mailops_cf_key", cfApiKey.trim());
        saveCloudflareCredentials({
          api_token: cfToken.trim() || undefined,
          api_key: cfApiKey.trim() || undefined,
          email: cfEmail.trim() || undefined,
        }).catch(() => null);
      }

      const res = await syncCloudflareDNS({
        domain: selectedDomain,
        api_token: cfToken.trim() || undefined,
        api_key: cfApiKey.trim() || undefined,
        email: cfEmail.trim() || undefined,
        zone_id: cfZoneId.trim() || undefined,
        include_mx: cfIncludeMx,
        include_a: true,
      });

      setCfSyncStatus(
        `✅ Success! Auto-published ${res.records_created + res.records_updated} DNS records to Cloudflare. Verification is running now...`
      );
      setTimeout(() => {
        checkDomainDns(selectedDomain);
      }, 1500);
    } catch (err: any) {
      setCfSyncError(err.message || "Failed to publish DNS records to Cloudflare");
    } finally {
      setIsSyncingCf(false);
    }
  };

  const currentDomainObj = domains.find((d) => d.domain === selectedDomain);
  const selector = currentDomainObj?.selector || "k202611";
  const dkimHost = `${selector}._domainkey`;
  const dkimValue = currentDomainObj?.dkimPublicKey
    ? currentDomainObj.dkimPublicKey.startsWith("v=DKIM1")
      ? currentDomainObj.dkimPublicKey
      : `v=DKIM1; k=rsa; p=${currentDomainObj.dkimPublicKey}`
    : "Key pending generation. Click Re-generate DKIM to create real 2048-bit RSA key.";

  const spfHost = "@";
  const spfValue = infraInfo?.suggested_spf || currentDomainObj?.spfRecord || "v=spf1 ~all";

  const aHost = "mail";
  const aValue = infraInfo?.public_ip || "127.0.0.1";

  const dmarcHost = "_dmarc";
  const dmarcValue = currentDomainObj?.dmarcRecord || `v=DMARC1; p=reject; pct=100; rua=mailto:dmarc-reports@${selectedDomain}`;

  const mxHost = "@";
  const mxValue = currentDomainObj?.mxRecord || `10 mail.${selectedDomain}`;

  const displayMailHost = selectedDomain
    ? `mail.${selectedDomain}`
    : infraInfo?.smtp_hostname && !/^[0-9a-f]{12,64}$/i.test(infraInfo.smtp_hostname)
    ? infraInfo.smtp_hostname
    : "mail.yourdomain.com";

  const displaySystemHost = infraInfo?.hostname && !/^[0-9a-f]{12,64}$/i.test(infraInfo.hostname)
    ? infraInfo.hostname
    : (selectedDomain ? `mail.${selectedDomain}` : "mailops-mta");

  const handleCopyAllRecords = async () => {
    if (!selectedDomain) return;
    const text = `=== DNS Authentication Records for ${selectedDomain} ===
1. DKIM Record (TXT)
   Host:  ${dkimHost}.${selectedDomain}
   Type:  TXT
   Value: ${dkimValue}

2. SPF Record (TXT)
   Host:  @ (or ${selectedDomain})
   Type:  TXT
   Value: ${spfValue}

3. DMARC Policy (TXT)
   Host:  _dmarc.${selectedDomain}
   Type:  TXT
   Value: ${dmarcValue}

4. Inbound MX Record (MX - Optional)
   Host:  @ (or ${selectedDomain})
   Type:  MX
   Value: ${mxValue} (Priority: 10)

5. Egress Mail Host A Record (A)
   Host:  mail.${selectedDomain}
   Type:  A
   Value: ${aValue} (Proxy: DNS Only)`;

    await copyToClipboard(text, "all-records");
  };

  const handleDownloadBindZone = () => {
    if (!selectedDomain) return;
    const content = `; Cloudflare / BIND DNS Zone File for ${selectedDomain}
; Generated by MailOS
$ORIGIN ${selectedDomain}.
$TTL 3600

; Egress Mail Server Host (DNS Only / No CDN Proxy)
mail 3600 IN A ${aValue}

; Inbound MX Record
@ 3600 IN MX 10 mail.${selectedDomain}.

; SPF Authorization Record
@ 3600 IN TXT "${spfValue}"

; DKIM 2048-bit RSA Signature
${selector}._domainkey 3600 IN TXT "${dkimValue}"

; DMARC Policy Record
_dmarc 3600 IN TXT "${dmarcValue}"
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedDomain}-cloudflare-dns.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isDkimVerified = dnsDetails?.dkim_valid ?? false;
  const isSpfVerified = dnsDetails?.spf_valid ?? false;
  const isDmarcVerified = dnsDetails?.dmarc_valid ?? false;
  const isPtrVerified = dnsDetails?.ptr_valid ?? false;

  // MX is strictly OPTIONAL for outbound sending!
  const allVerified = isDkimVerified && isSpfVerified && isDmarcVerified;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-xs">
      {/* Top Tab Switcher */}
      <div className="px-4 py-2 bg-[#0c0d12] border-b border-[#23252a] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubScreen("list")}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-xs ${
              subScreen === "list" || subScreen === "add-domain"
                ? "bg-[#ff69b4]/15 text-[#ff69b4] border border-[#ff69b4]/30"
                : "text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#161820]"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Domains & Records (SPF/DKIM/DMARC)</span>
          </button>

          <button
            onClick={() => {
              setSubScreen("rbl-watchdog");
              if (!rblAudit) {
                handleRunRBLCheck(selectedDomain || infraInfo?.public_ip || "mailops.io");
              }
            }}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-xs ${
              subScreen === "rbl-watchdog"
                ? "bg-[#ff69b4]/15 text-[#ff69b4] border border-[#ff69b4]/30"
                : "text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#161820]"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#ff69b4]" />
            <span>🛡️ RBL Blacklist Watchdog</span>
            {rblAudit && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${rblAudit.is_clean ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"}`}>
                {rblAudit.is_clean ? "100% Clean" : `${rblAudit.listed_count} Listed`}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubScreen("cloudflare")}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-xs ${
              subScreen === "cloudflare"
                ? "bg-[#f38020]/15 text-[#f38020] border border-[#f38020]/30"
                : "text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#161820]"
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-[#f38020]" />
            <span>Cloudflare 1-Click Sync</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#8a8f98]">
          <span className="font-mono text-[#d0d6e0]">{domains.length} Domains</span>
          <span>•</span>
          <span className="font-mono text-[#ff69b4]">Egress: {infraInfo?.public_ip || "127.0.0.1"}</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {subScreen === "list" && (
          <>
            {/* Left Domain List Sidebar */}
      <div className="w-64 border-r border-[#23252a] bg-[#0f1011] flex flex-col">
        <div className="p-3 border-b border-[#23252a] flex items-center justify-between">
          <span className="font-semibold text-[#f7f8f8] flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-[#ff69b4]" />
            <span>Sending Domains</span>
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#18191a] text-[#8a8f98] font-mono">
            {domains.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {domains.length === 0 ? (
            <div className="p-4 text-center text-[#8a8f98] text-[11px]">
              No domains connected. Click "+ Connect Domain" to generate real 2048-bit DKIM, SPF, DMARC, and verify DNS.
            </div>
          ) : (
            domains.map((d) => (
              <div
                key={d.domain}
                onClick={() => handleSelectDomain(d.domain)}
                className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                  selectedDomain === d.domain
                    ? "bg-[#18191a] border border-[#ff69b4]/30 text-[#f7f8f8]"
                    : "hover:bg-[#141516] text-[#8a8f98]"
                }`}
              >
                <div className="truncate pr-2">
                  <div className="font-medium text-[#f7f8f8] truncate flex items-center gap-1.5">
                    {d.domain}
                  </div>
                  <div className="text-[10px] flex items-center gap-1 mt-0.5 font-mono">
                    {d.dkim === "valid" && d.spf === "valid" ? (
                      <span className="text-[#27a644] flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Live Verified
                      </span>
                    ) : (
                      <span className="text-[#ffc53d] flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" /> DNS Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary / Star Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetPrimary(d.domain);
                  }}
                  className="p-1 hover:scale-110 transition-transform flex-shrink-0"
                  title={d.isFavorite ? "Primary sending domain" : "Set as primary domain"}
                >
                  <Star
                    className={`w-3.5 h-3.5 transition-colors ${
                      d.isFavorite
                        ? "fill-[#ff69b4] text-[#ff69b4]"
                        : "text-[#3e3e44] hover:text-[#8a8f98]"
                    }`}
                  />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-2 border-t border-[#23252a] space-y-1.5">
          <button
            onClick={() => setSubScreen("add-domain")}
            className="w-full py-2 rounded bg-[#ff69b4]/10 hover:bg-[#ff69b4]/20 text-[#ff69b4] border border-[#ff69b4]/30 font-medium flex items-center justify-center gap-1.5 transition-colors text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Domain</span>
          </button>
          <button
            onClick={() => setShowBatchModal(true)}
            className="w-full py-1.5 rounded bg-[#161820] hover:bg-[#1f222e] text-[#d0d6e0] border border-[#2a2d3d] font-medium flex items-center justify-center gap-1.5 transition-colors text-xs cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-[#3b9eff]" />
            <span>Batch Add Domains</span>
          </button>
          <button
            onClick={() => setShowDoctorModal(true)}
            className="w-full py-1.5 rounded bg-[#ff69b4]/10 hover:bg-[#ff69b4]/20 text-[#ff69b4] border border-[#ff69b4]/30 font-medium flex items-center justify-center gap-1.5 transition-colors text-xs cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Outbound Deliverability Doctor</span>
          </button>
        </div>
      </div>

      {/* Right Domain Details & Records View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* SERVER INFRASTRUCTURE AUTO-DETECTION CARD */}
        <div className="p-4 rounded-xl bg-[#0c0d12] border border-[#232734] space-y-3 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#ff69b4]" />
              <span className="font-bold text-xs text-[#f7f8f8]">Detected Server Infrastructure</span>
              {infraInfo?.is_explicit ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  Explicit Configuration ({infraInfo.detection_source})
                </span>
              ) : infraInfo?.detection_source === "provider_consensus" ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Consensus Verified ({infraInfo.provider_agreed?.length || 2} providers)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">
                  {infraInfo?.detection_source || "Detecting..."}
                </span>
              )}
            </div>

            <button
              onClick={handleDetectNow}
              disabled={isDetecting}
              className="px-2.5 py-1 rounded bg-[#161822] hover:bg-[#202433] border border-[#262c3e] text-[#d0d6e0] hover:text-[#f7f8f8] text-[11px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isDetecting ? "animate-spin" : ""}`} />
              <span>{isDetecting ? "Probing Providers..." : "Re-Detect Infrastructure"}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-2.5 rounded-lg bg-[#11131a] border border-[#1e222c]">
              <span className="text-[10px] text-[#8a8f98] uppercase font-mono block">Public Outbound IP</span>
              <span className="font-bold text-sm text-[#ff69b4] font-mono mt-0.5 block truncate">
                {infraInfo?.public_ip || "Probing..."}
              </span>
              <span className="text-[10px] text-[#62666d]">Type: {infraInfo?.ip_version || "IPv4"}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#11131a] border border-[#1e222c]">
              <span className="text-[10px] text-[#8a8f98] uppercase font-mono block">Local Interface IP</span>
              <span className="font-bold text-sm text-zinc-300 font-mono mt-0.5 block truncate">
                {infraInfo?.local_ip || "127.0.0.1"}
              </span>
              <span className="text-[10px] text-[#62666d]">Host: {displaySystemHost}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#11131a] border border-[#1e222c]">
              <span className="text-[10px] text-[#8a8f98] uppercase font-mono block">SMTP Hostname</span>
              <span className="font-bold text-sm text-zinc-300 font-mono mt-0.5 block truncate">
                {displayMailHost}
              </span>
              <span className="text-[10px] text-[#62666d]">Env: {infraInfo?.environment || "container"}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#11131a] border border-[#1e222c]">
              <span className="text-[10px] text-[#8a8f98] uppercase font-mono block">PTR (rDNS) Verification</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {infraInfo?.ptr_status === "matched" ? (
                  <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                  </span>
                ) : infraInfo?.ptr_status === "mismatched" ? (
                  <span className="text-amber-400 font-bold text-xs flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Mismatched
                  </span>
                ) : (
                  <span className="text-zinc-400 font-bold text-xs flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Not Set
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#8a8f98] truncate block">
                {infraInfo?.reverse_dns ? infraInfo.reverse_dns : "Unresolved"}
              </span>
            </div>
          </div>

          {/* PTR Guidance Alert */}
          <div className="p-2.5 rounded-lg bg-[#161a25] border border-[#273248] text-[11px] text-[#a0a6b5] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#ffc53d] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Note on Reverse DNS (PTR):</strong> PTR records are managed at your IP network provider. Ensure your public IP <code className="text-[#ff69b4] font-mono px-1 rounded bg-[#090a0d]">{infraInfo?.public_ip || "your public IP"}</code> has a PTR record resolving back to <code className="text-[#ff69b4] font-mono px-1 rounded bg-[#090a0d]">{displayMailHost}</code>.
            </p>
          </div>
        </div>

        {selectedDomain ? (
          <>
            {/* Domain Header Card */}
            <div className="p-4 rounded-xl bg-[#0f1011] border border-[#23252a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-[#f7f8f8] flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#ff69b4]" />
                    <span>{selectedDomain}</span>
                  </h2>
                  {currentDomainObj?.isFavorite && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#ff69b4]/15 text-[#ff69b4] border border-[#ff69b4]/30 font-medium">
                      Primary Domain
                    </span>
                  )}
                  {allVerified ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready for Live Delivery
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#ffc53d]/15 text-[#ffc53d] border border-[#ffc53d]/30 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Authentication Required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8a8f98] mt-1">
                  Real 2048-bit RSA DKIM key and standard SPF/DMARC records. Add them manually or auto-publish to Cloudflare.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Auto-Add to Cloudflare Button */}
                <button
                  onClick={() => {
                    setSubScreen("cloudflare");
                    setCfSyncError("");
                    setCfSyncStatus("");
                  }}
                  className="px-3.5 py-1.5 rounded bg-[#f38020] hover:bg-[#fa8b2c] text-white font-medium flex items-center gap-1.5 transition-colors shadow-sm text-xs cursor-pointer"
                  title="Automatically publish DNS records to Cloudflare via API"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Sync Cloudflare</span>
                </button>

                {/* 1-Click Copy All Records */}
                <button
                  onClick={handleCopyAllRecords}
                  className="px-3.5 py-1.5 rounded bg-[#18191a] hover:bg-[#23252a] border border-[#2b2d33] text-[#f7f8f8] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy all DNS records (SPF, DKIM, DMARC, MX, A) to clipboard"
                >
                  {copiedId === "all-records" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === "all-records" ? "Copied All!" : "Copy All Records"}</span>
                </button>

                {/* 1-Click BIND Zone File for Cloudflare Import */}
                <button
                  onClick={handleDownloadBindZone}
                  className="px-3.5 py-1.5 rounded bg-[#18191a] hover:bg-[#23252a] border border-[#2b2d33] text-[#f7f8f8] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download Cloudflare BIND Zone file (.txt) for zero-key 1-click import in Cloudflare dashboard"
                >
                  <Download className="w-3.5 h-3.5 text-[#ff69b4]" />
                  <span>DNS Zone File (.txt)</span>
                </button>

                {/* 1-Click RBL Blacklist Scan Button */}
                <button
                  onClick={() => {
                    setSubScreen("rbl-watchdog");
                    handleRunRBLCheck(selectedDomain);
                  }}
                  className="px-3.5 py-1.5 rounded bg-[#ff69b4]/10 hover:bg-[#ff69b4]/20 border border-[#ff69b4]/30 text-[#ff69b4] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Check domain against real-time DNSBL / RBL blocklists"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>RBL Blacklist Scan</span>
                </button>

                <button
                  onClick={handleGenerateDkim}
                  disabled={isGeneratingDkim}
                  className="px-3 py-1.5 rounded bg-[#18191a] hover:bg-[#23252a] border border-[#2b2d33] text-[#f7f8f8] text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Generate a fresh genuine 2048-bit RSA DKIM keypair"
                >
                  <Key className={`w-3 h-3 ${isGeneratingDkim ? "animate-spin" : ""}`} />
                  <span>{isGeneratingDkim ? "Generating..." : "Re-generate DKIM"}</span>
                </button>

                <button
                  onClick={() => checkDomainDns(selectedDomain)}
                  disabled={isChecking}
                  className="px-3.5 py-1.5 rounded bg-[#ff69b4] hover:bg-[#ff52a5] text-[#010102] font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
                  <span>{isChecking ? "Querying DNS..." : "Verify DNS Records"}</span>
                </button>

                <button
                  onClick={() => handleDeleteDomain(selectedDomain)}
                  disabled={isDeleting}
                  className="px-2.5 py-1.5 rounded bg-[#eb5757]/10 hover:bg-[#eb5757]/20 border border-[#eb5757]/30 text-[#eb5757] text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Delete domain"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {liveCheckStatus && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  allVerified
                    ? "bg-[#27a644]/15 border-[#27a644]/30 text-[#27a644]"
                    : "bg-[#ffc53d]/15 border-[#ffc53d]/30 text-[#ffc53d]"
                }`}
              >
                {allVerified ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                <span>{liveCheckStatus}</span>
              </div>
            )}

            {/* Quick Setup Instructions */}
            <div className="p-3.5 rounded-xl bg-[#141516] border border-[#23252a] flex items-center justify-between text-xs text-[#8a8f98]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#ff69b4]" />
                <span>
                  Configure the <strong className="text-[#f7f8f8]">3 required records (DKIM, SPF, DMARC)</strong> at your DNS host to authorize live sending. <strong className="text-[#8a8f98]">MX is optional</strong> and only required if you receive inbound mail on this host.
                </span>
              </div>
            </div>

            {/* DNS Records Table Cards */}
            <div className="space-y-3">
              {/* Record 1: DKIM */}
              <div className="p-4 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#5e6ad2]/20 text-[#5e6ad2] font-mono text-[10px] font-bold border border-[#5e6ad2]/30">
                      TXT (REQUIRED)
                    </span>
                    <span className="font-semibold text-[#f7f8f8] text-xs">
                      DKIM Signature (DomainKeys Identified Mail)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-medium flex items-center gap-1 font-mono ${
                        isDkimVerified ? "text-[#27a644]" : "text-[#ffc53d]"
                      }`}
                    >
                      {isDkimVerified ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified in Public DNS
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" /> Pending Propagation
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-[11px]">
                  {/* Host column */}
                  <div className="md:col-span-4 p-2.5 rounded bg-[#070709] border border-[#1e2023] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-[#62666d]">Hostname / Name</div>
                      <div className="font-mono text-[#f7f8f8] select-all truncate">{dkimHost}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(dkimHost, "dkim-host")}
                      className="p-1.5 hover:bg-[#18191a] rounded text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
                      title="Copy host name"
                    >
                      {copiedId === "dkim-host" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Value column */}
                  <div className="md:col-span-8 p-2.5 rounded bg-[#070709] border border-[#1e2023] flex items-center justify-between gap-2">
                    <div className="overflow-hidden flex-1">
                      <div className="text-[10px] uppercase font-mono text-[#62666d]">Target Value (Real 2048-bit RSA Key)</div>
                      <div className="font-mono text-[#8a8f98] text-[10px] select-all truncate">{dkimValue}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(dkimValue, "dkim-val")}
                      className="px-2 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#f7f8f8] border border-[#2b2d33] text-[10px] flex items-center gap-1 font-mono flex-shrink-0"
                    >
                      {copiedId === "dkim-val" ? (
                        <>
                          <Check className="w-3 h-3 text-[#27a644]" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Record
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {dnsDetails?.dkim_record && (
                  <div className="text-[10px] text-[#62666d] font-mono flex items-center gap-1 pl-1">
                    <ArrowRight className="w-3 h-3" /> Live DNS Result: {dnsDetails.dkim_record}
                  </div>
                )}
              </div>

              {/* Record 2: SPF */}
              <div className="p-4 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#5e6ad2]/20 text-[#5e6ad2] font-mono text-[10px] font-bold border border-[#5e6ad2]/30">
                      TXT (REQUIRED)
                    </span>
                    <span className="font-semibold text-[#f7f8f8] text-xs">
                      SPF Record (Sender Policy Framework)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-medium flex items-center gap-1 font-mono ${
                        isSpfVerified ? "text-[#27a644]" : "text-[#ffc53d]"
                      }`}
                    >
                      {isSpfVerified ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified in Public DNS
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" /> Pending Propagation
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-[11px]">
                  {/* Host column */}
                  <div className="md:col-span-4 p-2.5 rounded bg-[#070709] border border-[#1e2023] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-[#62666d]">Hostname / Name</div>
                      <div className="font-mono text-[#f7f8f8] select-all">{spfHost}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(spfHost, "spf-host")}
                      className="p-1.5 hover:bg-[#18191a] rounded text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
                      title="Copy host"
                    >
                      {copiedId === "spf-host" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Value column */}
                  <div className="md:col-span-8 p-2.5 rounded bg-[#070709] border border-[#1e2023] flex items-center justify-between gap-2">
                    <div className="overflow-hidden flex-1">
                      <div className="text-[10px] uppercase font-mono text-[#62666d]">Target Value</div>
                      <div className="font-mono text-[#8a8f98] text-[10px] select-all truncate">{spfValue}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(spfValue, "spf-val")}
                      className="px-2 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#f7f8f8] border border-[#2b2d33] text-[10px] flex items-center gap-1 font-mono flex-shrink-0"
                    >
                      {copiedId === "spf-val" ? (
                        <>
                          <Check className="w-3 h-3 text-[#27a644]" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Record
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {dnsDetails?.spf_record && (
                  <div className="text-[10px] text-[#62666d] font-mono flex items-center gap-1 pl-1">
                    <ArrowRight className="w-3 h-3" /> Live DNS Result: {dnsDetails.spf_record}
                  </div>
                )}
              </div>

              {/* Record 3: DMARC */}
              <div className="p-4 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#5e6ad2]/20 text-[#5e6ad2] font-mono text-[10px] font-bold border border-[#5e6ad2]/30">
                      TXT (REQUIRED)
                    </span>
                    <span className="font-semibold text-[#f7f8f8] text-xs">
                      DMARC Policy (Domain-based Message Authentication)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-medium flex items-center gap-1 font-mono ${
                        isDmarcVerified ? "text-[#27a644]" : "text-[#ffc53d]"
                      }`}
                    >
                      {isDmarcVerified ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified in Public DNS
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" /> Pending Propagation
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-[11px]">
                  {/* Host column */}
                  <div className="md:col-span-4 p-2.5 rounded bg-[#070709] border border-[#1e2023] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-[#62666d]">Hostname / Name</div>
                      <div className="font-mono text-[#f7f8f8] select-all">{dmarcHost}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(dmarcHost, "dmarc-host")}
                      className="p-1.5 hover:bg-[#18191a] rounded text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
                      title="Copy host"
                    >
                      {copiedId === "dmarc-host" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Value column */}
                  <div className="md:col-span-8 p-2.5 rounded bg-[#070709] border border-[#1e2023] flex items-center justify-between gap-2">
                    <div className="overflow-hidden flex-1">
                      <div className="text-[10px] uppercase font-mono text-[#62666d]">Target Value (p=reject strict enforcement)</div>
                      <div className="font-mono text-[#8a8f98] text-[10px] select-all truncate">{dmarcValue}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(dmarcValue, "dmarc-val")}
                      className="px-2 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#f7f8f8] border border-[#2b2d33] text-[10px] flex items-center gap-1 font-mono flex-shrink-0"
                    >
                      {copiedId === "dmarc-val" ? (
                        <>
                          <Check className="w-3 h-3 text-[#27a644]" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Record
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {dnsDetails?.dmarc_record && (
                  <div className="text-[10px] text-[#62666d] font-mono flex items-center gap-1 pl-1">
                    <ArrowRight className="w-3 h-3" /> Live DNS Result: {dnsDetails.dmarc_record}
                  </div>
                )}
              </div>

              {/* Record 4: MX (OPTIONAL) */}
              <div className="p-4 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#8a8f98]/20 text-[#8a8f98] font-mono text-[10px] font-bold border border-[#8a8f98]/30">
                      MX (OPTIONAL)
                    </span>
                    <span className="font-semibold text-[#f7f8f8] text-xs">
                      MX Record (Inbound Mail Routing & Local Spool Replies)
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8a8f98] font-mono bg-[#18191a] px-2 py-0.5 rounded border border-[#23252a]">
                    Not required for sending-only domains
                  </span>
                </div>

                <p className="text-[11px] text-[#8a8f98]">
                  Only add this MX record if you want this domain to receive inbound replies directly on this MTA host. If your domain uses Google Workspace, Microsoft 365, or does not receive inbound mail, leave your existing MX records intact.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-[11px]">
                  {/* Host column */}
                  <div className="md:col-span-4 p-2.5 rounded bg-[#070709] border border-[#1e2023] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-[#62666d]">Hostname / Name</div>
                      <div className="font-mono text-[#f7f8f8] select-all">{mxHost}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(mxHost, "mx-host")}
                      className="p-1.5 hover:bg-[#18191a] rounded text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
                      title="Copy host"
                    >
                      {copiedId === "mx-host" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Value column */}
                  <div className="md:col-span-8 p-2.5 rounded bg-[#070709] border border-[#1e2023] flex items-center justify-between gap-2">
                    <div className="overflow-hidden flex-1">
                      <div className="text-[10px] uppercase font-mono text-[#62666d]">Target Mail Server (Priority: 10)</div>
                      <div className="font-mono text-[#8a8f98] text-[10px] select-all truncate">{mxValue}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(mxValue, "mx-val")}
                      className="px-2 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#f7f8f8] border border-[#2b2d33] text-[10px] flex items-center gap-1 font-mono flex-shrink-0"
                    >
                      {copiedId === "mx-val" ? (
                        <>
                          <Check className="w-3 h-3 text-[#27a644]" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Record
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Record 4b: Host A Record */}
              <div className="p-4 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#5e6ad2]/20 text-[#5e6ad2] font-mono text-[10px] font-bold border border-[#5e6ad2]/30">
                      A (REQUIRED FOR MAIL HOST)
                    </span>
                    <span className="font-semibold text-[#f7f8f8] text-xs">
                      Mail Host Forward A Record
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#8a8f98]">
                    Proxy status: DNS Only (Gray Cloud)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-[11px]">
                  <div className="md:col-span-4 p-2.5 rounded bg-[#070709] border border-[#1e2023] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-[#62666d]">Hostname / Name</div>
                      <div className="font-mono text-[#f7f8f8] select-all">mail</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard("mail", "a-host")}
                      className="p-1.5 hover:bg-[#18191a] rounded text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
                      title="Copy host"
                    >
                      {copiedId === "a-host" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="md:col-span-8 p-2.5 rounded bg-[#070709] border border-[#1e2023] flex items-center justify-between gap-2">
                    <div className="overflow-hidden flex-1">
                      <div className="text-[10px] uppercase font-mono text-[#62666d]">Public Egress IP</div>
                      <div className="font-mono text-[#ff69b4] text-[10px] select-all truncate">{aValue}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(aValue, "a-val")}
                      className="px-2 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#f7f8f8] border border-[#2b2d33] text-[10px] flex items-center gap-1 font-mono flex-shrink-0"
                    >
                      {copiedId === "a-val" ? (
                        <>
                          <Check className="w-3 h-3 text-[#27a644]" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Record
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Record 5: Reverse DNS (PTR) */}
              <div className="p-4 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#8a8f98]/20 text-[#8a8f98] font-mono text-[10px] font-bold border border-[#8a8f98]/30">
                      PTR
                    </span>
                    <span className="font-semibold text-[#f7f8f8] text-xs">
                      Reverse DNS (PTR) Resolution
                    </span>
                  </div>
                  <span className={`text-[11px] font-medium font-mono ${isPtrVerified ? "text-[#27a644]" : "text-[#8a8f98]"}`}>
                    {isPtrVerified ? "Valid PTR" : "Host Interface Checked"}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#070709] border border-[#1e2023] font-mono text-[10px] text-[#8a8f98]">
                  {dnsDetails?.ptr_record || "Reverse DNS lookup on active outbound sending interface..."}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-10 border border-[#23252a] rounded-xl bg-[#0f1011] text-center flex flex-col items-center justify-center max-w-lg mx-auto mt-6">
            <Globe className="w-10 h-10 text-[#ff69b4] mb-3 stroke-[1.5]" />
            <h3 className="text-base font-semibold text-[#f7f8f8] mb-1">No Sending Domain Connected</h3>
            <p className="text-[#8a8f98] text-[11px] max-w-md mb-5 leading-relaxed">
              Connect your sending domain to auto-generate authentic 2048-bit DKIM keys, SPF policies, DMARC rules, and verify them against public DNS.
            </p>
            <button
              onClick={() => setSubScreen("add-domain")}
              className="px-4 py-2 bg-[#ff69b4] hover:bg-[#ff52a5] text-[#010102] font-semibold rounded-lg text-xs flex items-center gap-2 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Sending Domain</span>
            </button>
          </div>
        )}
      </div>
    </>
  )}

      {/* Cloudflare 1-Click Sync Center */}
      {subScreen === "cloudflare" && (
        <div className="flex-1 flex flex-col bg-[#0a0a0c] overflow-y-auto">
          <div className="px-5 py-3 bg-[#0f1011] border-b border-[#23252a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubScreen("list")}
                className="px-2.5 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs transition-colors cursor-pointer"
              >
                ← Back to Domains
              </button>
              <span className="text-[#62666d]">/</span>
              <span className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
                <Cloud className="w-4 h-4 text-[#f38020]" />
                Cloudflare DNS Sync Center
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#14151a] p-1 rounded-lg border border-[#232734]">
              <button
                type="button"
                onClick={() => setCfTab("auto")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  cfTab === "auto"
                    ? "bg-[#f38020] text-white shadow-sm"
                    : "text-[#8a8f98] hover:text-white"
                }`}
              >
                ⚡ 1-Click Auto Sync
              </button>
              <button
                type="button"
                onClick={() => setCfTab("bind")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  cfTab === "bind"
                    ? "bg-[#f38020] text-white shadow-sm"
                    : "text-[#8a8f98] hover:text-white"
                }`}
              >
                📥 Zero-Key BIND Import
              </button>
              <button
                type="button"
                onClick={() => setCfTab("script")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  cfTab === "script"
                    ? "bg-[#f38020] text-white shadow-sm"
                    : "text-[#8a8f98] hover:text-white"
                }`}
              >
                💻 Browser Session Script
              </button>
            </div>
          </div>

          <div className="max-w-2xl mx-auto w-full p-6">
            {/* TAB 1: 1-CLICK AUTO SYNC */}
            {cfTab === "auto" && (
              <div className="space-y-4 bg-[#121316] border border-[#23252a] rounded-xl p-6 shadow-2xl">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">Target Sending Domain</span>
                    <span className="text-[11px] font-mono text-[#ff69b4]">Selected</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#0a0a0c] border border-[#23252a] text-xs font-mono text-white flex items-center justify-between">
                    <span>{selectedDomain || "No domain selected"}</span>
                    <span className="text-[10px] text-[#8a8f98]">5 Records (SPF, DKIM, DMARC, MX, A)</span>
                  </div>
                </div>

                {cfServerStatus?.configured ? (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <div>
                          <div className="font-semibold text-white text-xs">Cloudflare Pre-Authenticated</div>
                          <div className="text-[11px] text-emerald-300/80 font-mono">
                            {cfServerStatus.email ? `Account: ${cfServerStatus.email}` : "API Token Loaded"} • Zero-Key Sync Ready
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Zero-Key Mode
                      </span>
                    </div>

                    <p className="text-[11px] text-[#8a8f98] leading-relaxed">
                      Your Cloudflare connection is pre-authenticated on the server. Click below to automatically discover your zone and publish all 5 authentication records directly to Cloudflare without entering any keys.
                    </p>

                    <button
                      type="button"
                      onClick={() => handleSyncCloudflare()}
                      disabled={isSyncingCf}
                      className="w-full py-2.5 bg-[#f38020] hover:bg-[#fa8b2c] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#f38020]/20 cursor-pointer disabled:opacity-50"
                    >
                      <Cloud className={`w-4 h-4 ${isSyncingCf ? "animate-spin" : ""}`} />
                      <span>{isSyncingCf ? "Auto-publishing to Cloudflare..." : "⚡ 1-Click Sync to Cloudflare"}</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSyncCloudflare} className="space-y-4">
                    <div className="p-3 rounded-lg bg-[#0e1017] border border-[#1e2330] text-[11px] text-[#8a8f98] flex items-start gap-2">
                      <Info className="w-4 h-4 text-[#f38020] shrink-0 mt-0.5" />
                      <span>
                        Enter your Cloudflare API Token (or Global API Key + Email) once. You can check <strong>"Remember credentials"</strong> so you and your team never have to enter keys again!
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                        Cloudflare API Token <span className="text-[#62666d]">(Recommended: Scoped Zone.DNS edit)</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Paste Bearer Token from dash.cloudflare.com/profile/api-tokens"
                        value={cfToken}
                        onChange={(e) => setCfToken(e.target.value)}
                        className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] font-mono focus:outline-none focus:border-[#ff69b4]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                          Or Cloudflare Email <span className="text-[#62666d]">(For Global Key)</span>
                        </label>
                        <input
                          type="email"
                          placeholder="your-email@example.com"
                          value={cfEmail}
                          onChange={(e) => setCfEmail(e.target.value)}
                          className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] font-mono focus:outline-none focus:border-[#ff69b4]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                          Global API Key <span className="text-[#62666d]">(Optional)</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Global API Key"
                          value={cfApiKey}
                          onChange={(e) => setCfApiKey(e.target.value)}
                          className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] font-mono focus:outline-none focus:border-[#ff69b4]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                        Zone ID <span className="text-[#62666d]">(Optional — Leave blank for auto-detection)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Auto-detected from domain name if omitted"
                        value={cfZoneId}
                        onChange={(e) => setCfZoneId(e.target.value)}
                        className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] font-mono focus:outline-none focus:border-[#ff69b4]"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="rememberCf"
                        checked={cfRemember}
                        onChange={(e) => setCfRemember(e.target.checked)}
                        className="rounded border-[#23252a] bg-[#0a0a0c] text-[#ff69b4]"
                      />
                      <label htmlFor="rememberCf" className="text-[11px] text-[#f7f8f8] font-medium cursor-pointer">
                        Remember credentials on server (Enables 1-click zero-key sync for all domains)
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#23252a]">
                      <button
                        type="button"
                        onClick={() => setSubScreen("list")}
                        className="px-3.5 py-1.5 rounded bg-[#18191a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSyncingCf || (!cfToken.trim() && (!cfApiKey.trim() || !cfEmail.trim()))}
                        className="px-4 py-2 bg-[#f38020] hover:bg-[#fa8b2c] text-white font-bold rounded text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Cloud className={`w-3.5 h-3.5 ${isSyncingCf ? "animate-spin" : ""}`} />
                        <span>{isSyncingCf ? "Publishing Records..." : "Connect & Publish All Records"}</span>
                      </button>
                    </div>
                  </form>
                )}

                {cfSyncStatus && (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{cfSyncStatus}</span>
                  </div>
                )}
                {cfSyncError && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{cfSyncError}</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ZERO-KEY BIND ZONE FILE IMPORT */}
            {cfTab === "bind" && (
              <div className="space-y-4 bg-[#121316] border border-[#23252a] rounded-xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 pb-3 border-b border-[#23252a]">
                  <Download className="w-5 h-5 text-[#ff69b4]" />
                  <div>
                    <h3 className="font-bold text-sm text-white">1-Click Cloudflare Native DNS Import</h3>
                    <p className="text-[11px] text-[#8a8f98]">
                      100% Zero API Keys. Upload directly through Cloudflare's built-in DNS import feature.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-[#8a8f98] leading-relaxed">
                  <div className="p-3 rounded-lg bg-[#0a0a0c] border border-[#1e2330] space-y-2">
                    <div className="text-white font-semibold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#ff69b4]/20 text-[#ff69b4] text-[10px] flex items-center justify-center font-bold">1</span>
                      Download the Cloudflare DNS File:
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadBindZone}
                        className="px-4 py-2 bg-[#ff69b4] hover:bg-[#ff52a5] text-black font-bold rounded-lg text-xs flex items-center gap-2 shadow-md shadow-[#ff69b4]/20 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download {selectedDomain}-cloudflare-dns.txt</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const content = `; Cloudflare BIND Zone File for ${selectedDomain}
$ORIGIN ${selectedDomain}.
$TTL 3600
mail 3600 IN A ${aValue}
@ 3600 IN MX 10 mail.${selectedDomain}.
@ 3600 IN TXT "${spfValue}"
${selector}._domainkey 3600 IN TXT "${dkimValue}"
_dmarc 3600 IN TXT "${dmarcValue}"
`;
                          await copyToClipboard(content, "bind-content");
                        }}
                        className="px-3 py-2 bg-[#18191a] hover:bg-[#23252a] border border-[#2b2d33] text-white font-medium rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedId === "bind-content" ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === "bind-content" ? "Copied!" : "Copy File Content"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0a0a0c] border border-[#1e2330] space-y-1.5">
                    <div className="text-white font-semibold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#f38020]/20 text-[#f38020] text-[10px] flex items-center justify-center font-bold">2</span>
                      Import into Cloudflare in 2 seconds:
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#8a8f98] pl-2">
                      <li>Open your domain in <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-[#ff69b4] underline">Cloudflare Dashboard</a>.</li>
                      <li>Navigate to <strong>DNS</strong> → <strong>Records</strong>.</li>
                      <li>Click the <strong>Import and Export</strong> link (top right above records table).</li>
                      <li>Click <strong>Import DNS Records</strong> and select the downloaded file.</li>
                      <li>Done! Cloudflare adds SPF, DKIM, DMARC, MX, and Mail Host A records instantly.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: 1-CLICK BROWSER CONSOLE SCRIPT */}
            {cfTab === "script" && (
              <div className="space-y-4 bg-[#121316] border border-[#23252a] rounded-xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 pb-3 border-b border-[#23252a]">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-sm text-white">Browser Session Auto-Publisher</h3>
                    <p className="text-[11px] text-[#8a8f98]">
                      Uses your already logged-in Cloudflare session in your browser. Zero API keys.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-[#8a8f98] leading-relaxed">
                  <p>
                    If you already have Cloudflare open in another browser tab, you are already authenticated! You can paste this snippet into your browser console to create all 5 records in 1 second.
                  </p>

                  <div className="p-3 rounded-lg bg-[#070709] border border-[#1e2023] font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-48">
                    <pre>{`(async () => {
  const match = location.pathname.match(/\\/([a-f0-9]{32})/);
  if (!match) { alert("Please run this while on your Cloudflare DNS page (dash.cloudflare.com)"); return; }
  const zoneId = match[1];
  const records = [
    { type: "TXT", name: "@", content: "${spfValue}", ttl: 3600 },
    { type: "TXT", name: "${selector}._domainkey", content: "${dkimValue}", ttl: 3600 },
    { type: "TXT", name: "_dmarc", content: "${dmarcValue}", ttl: 3600 },
    { type: "A", name: "mail", content: "${aValue}", ttl: 3600, proxied: false },
    { type: "MX", name: "@", content: "mail.${selectedDomain}", priority: 10, ttl: 3600 }
  ];
  for (const r of records) {
    await fetch(\`/api/v4/zones/\${zoneId}/dns_records\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r)
    });
  }
  alert("Success! All 5 DNS records published to Cloudflare.");
  location.reload();
})();`}</pre>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const snippet = `(async () => {
  const match = location.pathname.match(/\\/([a-f0-9]{32})/);
  if (!match) { alert("Please run this while on your Cloudflare DNS page (dash.cloudflare.com)"); return; }
  const zoneId = match[1];
  const records = [
    { type: "TXT", name: "@", content: "${spfValue}", ttl: 3600 },
    { type: "TXT", name: "${selector}._domainkey", content: "${dkimValue}", ttl: 3600 },
    { type: "TXT", name: "_dmarc", content: "${dmarcValue}", ttl: 3600 },
    { type: "A", name: "mail", content: "${aValue}", ttl: 3600, proxied: false },
    { type: "MX", name: "@", content: "mail.${selectedDomain}", priority: 10, ttl: 3600 }
  ];
  for (const r of records) {
    await fetch(\`/api/v4/zones/\${zoneId}/dns_records\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r)
    });
  }
  alert("Success! All 5 DNS records published to Cloudflare.");
  location.reload();
})();`;
                      await copyToClipboard(snippet, "console-snippet");
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {copiedId === "console-snippet" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedId === "console-snippet" ? "Snippet Copied to Clipboard!" : "Copy Browser Console Snippet"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Domain Screen (NO DIALOG OVERLAY) */}
      {subScreen === "add-domain" && (
        <div className="flex-1 flex flex-col bg-[#0a0a0c] overflow-y-auto">
          <div className="px-5 py-3 bg-[#0f1011] border-b border-[#23252a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubScreen("list")}
                className="px-2.5 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs transition-colors cursor-pointer"
              >
                ← Back to Domains
              </button>
              <span className="text-[#62666d]">/</span>
              <span className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#ff69b4]" />
                Connect Sending Domain
              </span>
            </div>
          </div>

          <div className="max-w-xl mx-auto w-full p-6">
            <form onSubmit={handleAddDomain} className="space-y-4 bg-[#121316] border border-[#23252a] rounded-xl p-6 shadow-2xl">
              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                  Domain Name (e.g. acme.com, send.enterprise.org)
                </label>
                <input
                  type="text"
                  required
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="example.com"
                  className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#ff69b4] font-mono"
                  autoFocus
                />
              </div>

              <div className="p-3.5 rounded-lg bg-[#0a0a0c] border border-[#1e2023] space-y-1.5 text-[11px] text-[#8a8f98]">
                <div className="text-[#f7f8f8] font-medium mb-1">Automatic Provisioning Includes:</div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <CheckCircle2 className="w-3 h-3 text-[#27a644]" /> Real 2048-bit RSA DKIM keypair generation
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <CheckCircle2 className="w-3 h-3 text-[#27a644]" /> SPF include mechanism configuration
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <CheckCircle2 className="w-3 h-3 text-[#27a644]" /> DMARC quarantine policy draft with forensic reporting
                </div>
              </div>

              <div className="pt-3 border-t border-[#23252a] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubScreen("list")}
                  className="px-3.5 py-1.5 rounded bg-[#18191a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-1.5 bg-[#ff69b4] hover:bg-[#ff52a8] text-[#0a0a0c] font-bold rounded text-xs cursor-pointer"
                >
                  {isAdding ? "Generating DKIM..." : "Connect Domain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real-Time DNS Blacklist (RBL) Watchdog Screen */}
      {subScreen === "rbl-watchdog" && (
        <div className="flex-1 flex flex-col bg-[#0a0a0c] overflow-y-auto">
          {/* Header */}
          <div className="px-5 py-3.5 bg-[#0f1011] border-b border-[#23252a] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubScreen("list")}
                className="px-2.5 py-1 rounded bg-[#18191a] hover:bg-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs transition-colors cursor-pointer"
              >
                ← Back to Domains
              </button>
              <span className="text-[#62666d]">/</span>
              <span className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#ff69b4]" />
                Real-Time DNS Blacklist (RBL) Watchdog
              </span>
            </div>

            {/* Quick Fleet Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunFleetRBLScan}
                disabled={isCheckingRBL}
                className="px-3 py-1.5 rounded-lg bg-[#18191a] hover:bg-[#23252a] border border-[#2b2d33] text-[#d0d6e0] hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 text-[#ff69b4] ${isCheckingRBL ? "animate-spin" : ""}`} />
                <span>Scan Entire Fleet</span>
              </button>
            </div>
          </div>

          <div className="max-w-5xl mx-auto w-full p-6 space-y-6">
            {/* Target Query Bar */}
            <div className="p-4 rounded-xl bg-[#121316] border border-[#23252a] shadow-lg space-y-3">
              <label className="block text-xs font-semibold text-[#f7f8f8]">
                Query IP or Envelope Domain Across Global Blacklists
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8a8f98]" />
                  <input
                    type="text"
                    value={rblTargetInput}
                    onChange={(e) => setRblTargetInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRunRBLCheck()}
                    placeholder="e.g. 192.0.2.1, yourdomain.com, or mail.yourdomain.com"
                    className="w-full pl-9 pr-3 py-2 bg-[#0a0a0c] border border-[#23252a] rounded-lg text-xs font-mono text-[#f7f8f8] focus:outline-none focus:border-[#ff69b4]"
                  />
                </div>
                <button
                  onClick={() => handleRunRBLCheck()}
                  disabled={isCheckingRBL || !rblTargetInput.trim()}
                  className="px-5 py-2 rounded-lg bg-[#ff69b4] hover:bg-[#ff52a8] text-[#0a0a0c] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingRBL ? "animate-spin" : ""}`} />
                  <span>{isCheckingRBL ? "Auditing Blacklists..." : "Audit Target"}</span>
                </button>
              </div>

              {/* Fast Presets */}
              <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] text-[#8a8f98]">
                <span>Quick Targets:</span>
                {selectedDomain && (
                  <button
                    onClick={() => handleRunRBLCheck(selectedDomain)}
                    className="px-2 py-0.5 rounded bg-[#18191a] hover:bg-[#23252a] border border-[#2b2d33] text-[#f7f8f8] font-mono cursor-pointer transition-colors"
                  >
                    Domain: {selectedDomain}
                  </button>
                )}
                {infraInfo?.public_ip && (
                  <button
                    onClick={() => handleRunRBLCheck(infraInfo.public_ip)}
                    className="px-2 py-0.5 rounded bg-[#18191a] hover:bg-[#23252a] border border-[#2b2d33] text-[#ff69b4] font-mono cursor-pointer transition-colors"
                  >
                    Egress IP: {infraInfo.public_ip}
                  </button>
                )}
                {domains.filter(d => d.domain !== selectedDomain).slice(0, 3).map(d => (
                  <button
                    key={d.domain}
                    onClick={() => handleRunRBLCheck(d.domain)}
                    className="px-2 py-0.5 rounded bg-[#18191a] hover:bg-[#23252a] border border-[#2b2d33] text-[#8a8f98] hover:text-[#f7f8f8] font-mono cursor-pointer transition-colors"
                  >
                    {d.domain}
                  </button>
                ))}
              </div>

              {rblError && (
                <div className="p-2.5 rounded bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
                  {rblError}
                </div>
              )}
            </div>

            {/* Reputation Shield Hero Banner */}
            {rblAudit && (
              <div
                className={`p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-5 shadow-xl ${
                  rblAudit.is_clean
                    ? "bg-gradient-to-r from-emerald-950/40 via-[#0f1411] to-[#0a0a0c] border-emerald-500/30"
                    : "bg-gradient-to-r from-rose-950/40 via-[#180f12] to-[#0a0a0c] border-rose-500/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                      rblAudit.is_clean
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}
                  >
                    {rblAudit.is_clean ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-[#f7f8f8] font-mono">
                        {rblAudit.target}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-[#1e2029] text-[#8a8f98] border border-[#2b2e3b]">
                        {rblAudit.target_type}
                      </span>
                    </div>
                    <div className="text-xs font-semibold mt-1">
                      {rblAudit.is_clean ? (
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> 100% CLEAN REPUTATION • ZERO LISTINGS REPORTED
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" /> REPUTATION DEGRADED • LISTED IN {rblAudit.listed_count} BLACKLIST(S)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8a8f98] mt-1 max-w-xl">
                      Authoritative real-time DNS queries executed directly against root providers. Major mailbox providers (Google, Microsoft, Yahoo) query these exact DNSBL zones during SMTP handshake before deciding inbox placement.
                    </p>
                  </div>
                </div>

                <div className="text-center md:text-right shrink-0 bg-[#0a0a0c]/60 p-4 rounded-xl border border-white/5 min-w-[140px]">
                  <div className="text-[10px] uppercase tracking-wider text-[#8a8f98] font-mono">Deliverability Index</div>
                  <div
                    className={`text-3xl font-black font-mono mt-0.5 ${
                      rblAudit.reputation_score >= 90
                        ? "text-emerald-400"
                        : rblAudit.reputation_score >= 60
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {rblAudit.reputation_score}%
                  </div>
                  <div className="text-[10px] text-[#62666d] mt-0.5">
                    {rblAudit.total_checked - rblAudit.listed_count} / {rblAudit.total_checked} Providers Clean
                  </div>
                </div>
              </div>
            )}

            {/* Providers Breakdown Table */}
            {rblAudit && (
              <div className="rounded-xl border border-[#23252a] bg-[#0f1011] overflow-hidden shadow-lg">
                <div className="px-4 py-3 border-b border-[#23252a] flex items-center justify-between">
                  <div className="font-semibold text-xs text-[#f7f8f8] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#ff69b4]" />
                    <span>Real-Time DNSBL Provider Diagnostics</span>
                  </div>
                  <span className="text-[11px] text-[#8a8f98] font-mono">
                    Audited at: {new Date(rblAudit.checked_at).toLocaleTimeString()}
                  </span>
                </div>

                <div className="divide-y divide-[#1e2025]">
                  {rblAudit.providers.map((prov) => (
                    <div
                      key={prov.zone}
                      className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#13151a] transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#f7f8f8]">{prov.name}</span>
                          <span className="text-[10px] font-mono text-[#ff69b4] bg-[#ff69b4]/10 px-1.5 py-0.5 rounded border border-[#ff69b4]/20">
                            {prov.zone}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8a8f98]">{prov.description}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        <span className="text-[10px] font-mono text-[#62666d] flex items-center gap-1">
                          ⚡ {prov.response_time_ms}ms
                        </span>

                        {prov.listed ? (
                          <div className="px-2.5 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Listed ({prov.return_code || "Active"})</span>
                          </div>
                        ) : (
                          <div className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Clean (NXDOMAIN)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fleet Audit Summary (if loaded) */}
            {rblSummary && (
              <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-[#23252a] pb-2">
                  <div className="font-semibold text-xs text-[#f7f8f8] flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#ff69b4]" />
                    <span>Sending Fleet Blacklist Audit Summary</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${rblSummary.overall_clean ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                    {rblSummary.clean_targets} / {rblSummary.total_targets} Targets Clean
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {rblSummary.audits.map((a) => (
                    <div
                      key={a.target}
                      onClick={() => {
                        setRblAudit(a);
                        setRblTargetInput(a.target);
                      }}
                      className="p-2.5 rounded-lg bg-[#14161d] border border-[#232733] hover:border-[#ff69b4]/40 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <div className="font-mono font-bold text-xs text-[#f7f8f8] truncate">{a.target}</div>
                        <div className="text-[10px] text-[#8a8f98] uppercase">{a.target_type}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-mono font-bold text-xs ${a.is_clean ? "text-emerald-400" : "text-rose-400"}`}>
                          {a.reputation_score}%
                        </span>
                        <div className="text-[9px] text-[#62666d]">
                          {a.listed_count === 0 ? "Clean" : `${a.listed_count} listed`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batch Add Domains Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121316] border border-[#23252a] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#23252a]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#3b9eff]" />
                <h3 className="font-semibold text-sm text-[#f7f8f8]">Batch Add Sending Domains</h3>
              </div>
              <button
                onClick={() => {
                  setShowBatchModal(false);
                  setBatchResultMsg("");
                }}
                className="text-[#8a8f98] hover:text-[#f7f8f8] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#8a8f98]">
              Paste multiple domains below (one per line or comma-separated). The system will automatically provision 2048-bit RSA DKIM keypairs and DNS templates for each domain in one batch.
            </p>

            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-[#8a8f98] block mb-1">Domain Names</label>
                <textarea
                  rows={6}
                  required
                  value={batchDomainsInput}
                  onChange={(e) => setBatchDomainsInput(e.target.value)}
                  placeholder={"acme-growth.com\noutreach-corp.io\nb2b-connect.net"}
                  className="w-full bg-[#18191a] border border-[#23252a] rounded-lg p-3 text-xs text-[#f7f8f8] font-mono focus:border-[#3b9eff] focus:outline-none placeholder-[#62666d]"
                />
              </div>

              {batchResultMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{batchResultMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#23252a]">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#18191a] hover:bg-[#202123] text-[#8a8f98] text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBatchAdding}
                  className="px-5 py-2 rounded-lg bg-[#3b9eff] hover:bg-[#2b8eed] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isBatchAdding && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isBatchAdding ? "Generating Keys & Adding..." : "Batch Add All Domains"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outbound Deliverability Doctor Modal */}
      <OutboundDoctorModal
        isOpen={showDoctorModal}
        onClose={() => setShowDoctorModal(false)}
      />
    </div>
  </div>
  );
};