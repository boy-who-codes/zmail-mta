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
  ShieldAlert
} from "lucide-react";
import {
  fetchDomains,
  addDomain,
  deleteDomain,
  setPrimaryDomain,
  verifyDomain,
  generateDkimKey,
  syncCloudflareDNS,
  fetchInfrastructureDetection,
  detectInfrastructureNow,
  InfrastructureInfo
} from "../../lib/api";

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
  const [subScreen, setSubScreen] = useState<"list" | "add-domain" | "cloudflare">("list");
  const [domainInput, setDomainInput] = useState<string>("");
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);


  const [cfToken, setCfToken] = useState<string>("");
  const [cfZoneId, setCfZoneId] = useState<string>("");
  const [cfIncludeMx, setCfIncludeMx] = useState<boolean>(false);
  const [cfRemember, setCfRemember] = useState<boolean>(true);
  const [isSyncingCf, setIsSyncingCf] = useState<boolean>(false);
  const [cfSyncStatus, setCfSyncStatus] = useState<string>("");
  const [cfSyncError, setCfSyncError] = useState<string>("");

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
    }
    fetchInfrastructureDetection().then(setInfraInfo).catch(() => null);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
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

  const handleSyncCloudflare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomain || !cfToken.trim()) return;

    try {
      setIsSyncingCf(true);
      setCfSyncError("");
      setCfSyncStatus("Connecting to Cloudflare API and syncing DNS records...");

      if (cfRemember) {
        localStorage.setItem("mailops_cf_token", cfToken.trim());
      }

      const res = await syncCloudflareDNS({
        domain: selectedDomain,
        api_token: cfToken.trim(),
        zone_id: cfZoneId.trim() || undefined,
        include_mx: cfIncludeMx,
      });

      setCfSyncStatus(
        `Success! Added/updated ${res.records_created + res.records_updated} DNS records in Cloudflare zone.`
      );
      setTimeout(() => {
        setSubScreen("list");
        setCfSyncStatus("");
      }, 2500);

      await checkDomainDns(selectedDomain);
    } catch (err: any) {
      setCfSyncError(err.message || "Failed to sync DNS records with Cloudflare");
      setCfSyncStatus("");
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

  const isDkimVerified = dnsDetails?.dkim_valid ?? false;
  const isSpfVerified = dnsDetails?.spf_valid ?? false;
  const isDmarcVerified = dnsDetails?.dmarc_valid ?? false;
  const isPtrVerified = dnsDetails?.ptr_valid ?? false;

  // MX is strictly OPTIONAL for outbound sending!
  const allVerified = isDkimVerified && isSpfVerified && isDmarcVerified;

  return (
    <div className="flex h-full bg-[#0a0a0c] text-xs">
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

        <div className="p-2 border-t border-[#23252a]">
          <button
            onClick={() => setSubScreen("add-domain")}
            className="w-full py-2 rounded bg-[#ff69b4]/10 hover:bg-[#ff69b4]/20 text-[#ff69b4] border border-[#ff69b4]/30 font-medium flex items-center justify-center gap-1.5 transition-colors text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Domain</span>
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
              <span className="text-[10px] text-[#62666d]">Host: {infraInfo?.hostname || "localhost"}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#11131a] border border-[#1e222c]">
              <span className="text-[10px] text-[#8a8f98] uppercase font-mono block">SMTP Hostname</span>
              <span className="font-bold text-sm text-zinc-300 font-mono mt-0.5 block truncate">
                {infraInfo?.smtp_hostname || `mail.${selectedDomain || "domain.com"}`}
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
              <strong>Note on Reverse DNS (PTR):</strong> PTR records cannot be created in regular DNS zone managers. You must configure reverse DNS in your VPS / hosting provider control panel (e.g. AWS, Hetzner, DigitalOcean) so that <code className="text-[#ff69b4] font-mono px-1 rounded bg-[#090a0d]">{infraInfo?.public_ip || "your public IP"}</code> resolves back to <code className="text-[#ff69b4] font-mono px-1 rounded bg-[#090a0d]">{infraInfo?.smtp_hostname || `mail.${selectedDomain || "domain.com"}`}</code>.
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
                  <span>Auto-add to Cloudflare</span>
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

      {/* Cloudflare Auto-Add Screen (NO DIALOG OVERLAY) */}
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
                Auto-add to Cloudflare DNS
              </span>
            </div>
          </div>

          <div className="max-w-xl mx-auto w-full p-6">
            <form onSubmit={handleSyncCloudflare} className="space-y-4 bg-[#121316] border border-[#23252a] rounded-xl p-6 shadow-2xl">
              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Target Domain</label>
                <input
                  type="text"
                  disabled
                  value={selectedDomain}
                  className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] font-mono opacity-80"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Cloudflare API Token</label>
                <input
                  type="password"
                  required
                  placeholder="Paste Bearer Token with Zone.DNS edit permissions"
                  value={cfToken}
                  onChange={(e) => setCfToken(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] font-mono focus:outline-none focus:border-[#ff69b4]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Cloudflare Zone ID</label>
                <input
                  type="text"
                  required
                  placeholder="32-character hexadecimal zone id"
                  value={cfZoneId}
                  onChange={(e) => setCfZoneId(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-[#23252a] rounded px-3 py-2 text-xs text-[#f7f8f8] font-mono focus:outline-none focus:border-[#ff69b4]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="includeMxCf"
                  checked={cfIncludeMx}
                  onChange={(e) => setCfIncludeMx(e.target.checked)}
                  className="rounded border-[#23252a] bg-[#0a0a0c] text-[#ff69b4]"
                />
                <label htmlFor="includeMxCf" className="text-[11px] text-[#8a8f98]">
                  Also publish fallback MX record pointing to local spool relay
                </label>
              </div>

              {cfSyncStatus && (
                <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs">
                  {cfSyncStatus}
                </div>
              )}
              {cfSyncError && (
                <div className="p-2.5 rounded bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
                  {cfSyncError}
                </div>
              )}

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
                  disabled={isSyncingCf}
                  className="px-4 py-1.5 bg-[#ff69b4] hover:bg-[#ff52a8] text-[#0a0a0c] font-bold rounded text-xs cursor-pointer"
                >
                  {isSyncingCf ? "Publishing Records..." : "Publish to Cloudflare Zone"}
                </button>
              </div>
            </form>
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
    </div>
  );
};