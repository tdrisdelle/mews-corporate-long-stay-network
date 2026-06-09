"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { DEMO_IDS } from "@/lib/auth";
import { format } from "date-fns";
import {
  Home,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
  MapPin,
  Building2,
} from "lucide-react";

interface Resident {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Lease {
  id: string;
  buyer_id: string;
  property_id: string;
  state: string;
  start_date: string;
  end_date: string;
  monthly_rent_cents: number;
  unit_count?: number;
  contracts?: Contract[];
}

interface Contract {
  id: string;
  contract_type: string;
  signed_at?: string | null;
  body?: {
    clauses?: ContractClause[];
  };
  clauses?: ContractClause[];
}

interface ContractClause {
  heading?: string;
  title?: string;
  body?: string;
  content?: string;
  text?: string;
}

interface Property {
  id: string;
  name: string;
  metro: string;
  jurisdiction?: string;
}

interface LifecycleEvent {
  event_type: string;
  occurred_at: string;
}

const LEASE_STATE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "#F3F4F6", text: "#6B7280", label: "Draft" },
  contract_sent: { bg: "#DBEAFE", text: "#1D4ED8", label: "Contract Sent" },
  signed: { bg: "#EDE9FE", text: "#6D28D9", label: "Signed" },
  active: { bg: "#D1FAE5", text: "#065F46", label: "Active" },
  completed: { bg: "#F3F4F6", text: "#6B7280", label: "Completed" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B", label: "Cancelled" },
};

function StateBadge({ state }: { state: string }) {
  const colors = LEASE_STATE_COLORS[state] || LEASE_STATE_COLORS.draft;
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: colors.bg, color: colors.text }}>
      {colors.label}
    </span>
  );
}

function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr + "T00:00:00"), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string) {
  try {
    return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return dateStr;
  }
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ResidentPage() {
  const residentId = DEMO_IDS.resident;

  const [resident, setResident] = useState<Resident | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [lifecycle, setLifecycle] = useState<Record<string, LifecycleEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [showContract, setShowContract] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDate, setExtendDate] = useState("");
  const [extending, setExtending] = useState(false);
  const [extendSuccess, setExtendSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const residentData: Resident = await apiGet(`/api/residents/${residentId}`);
        setResident(residentData);

        const leasesData = await apiGet(`/api/residents/${residentId}/leases`);
        const leaseList: Lease[] = Array.isArray(leasesData) ? leasesData : leasesData.leases || [];
        setLeases(leaseList);

        // Set first active or most recent lease as selected
        const activeLease = leaseList.find((l) => l.state === "active") || leaseList[0];
        if (activeLease) setSelectedLease(activeLease);

        // Fetch properties
        const propIds = [...new Set(leaseList.map((l: Lease) => l.property_id))];
        const propMap: Record<string, Property> = {};
        await Promise.all(
          propIds.map(async (pid) => {
            try {
              propMap[pid] = await apiGet(`/api/properties/${pid}`);
            } catch {
              // ignore
            }
          })
        );
        setProperties(propMap);

        // Fetch lifecycle for each lease
        const lcMap: Record<string, LifecycleEvent[]> = {};
        await Promise.all(
          leaseList.map(async (l: Lease) => {
            try {
              const lcData = await apiGet(`/admin/lifecycle/${l.id}`);
              lcMap[l.id] = Array.isArray(lcData) ? lcData : lcData.events || [];
            } catch {
              lcMap[l.id] = [];
            }
          })
        );
        setLifecycle(lcMap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load resident data");
        // Use demo data as fallback
        setResident({ id: residentId, name: "Maria Santos", email: "maria@stanford.edu" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [residentId]);

  async function handleExtend() {
    if (!selectedLease || !extendDate) return;
    setExtending(true);
    try {
      await apiPost(`/api/leases/${selectedLease.id}/extend`, { new_end_date: extendDate });
      setExtendSuccess(true);
      const updated = await apiGet(`/api/residents/${residentId}/leases`);
      const leaseList: Lease[] = Array.isArray(updated) ? updated : updated.leases || [];
      setLeases(leaseList);
      const newSelected = leaseList.find((l) => l.id === selectedLease.id);
      if (newSelected) setSelectedLease(newSelected);
      setTimeout(() => {
        setShowExtendModal(false);
        setExtendSuccess(false);
        setExtendDate("");
      }, 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Extension failed");
    } finally {
      setExtending(false);
    }
  }

  const property = selectedLease ? properties[selectedLease.property_id] : null;
  const leaseEvents = selectedLease ? lifecycle[selectedLease.id] || [] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin" style={{ color: "#1D9E75" }} />
      </div>
    );
  }

  const displayResident = resident || { id: residentId, name: "Maria Santos" };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF9F6" }}>
      {/* Mobile-first hero card */}
      <div style={{ background: "linear-gradient(160deg, #1D9E75 0%, #185FA5 100%)" }} className="px-4 pt-8 pb-16">
        <div className="max-w-lg mx-auto text-center">
          {/* Avatar */}
          <div className="mx-auto w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg">
            {getInitials(displayResident.name)}
          </div>
          <h1 className="text-2xl font-bold text-white">{displayResident.name}</h1>
          {displayResident.email && (
            <p className="text-green-100 text-sm mt-1">{displayResident.email}</p>
          )}
          <p className="text-green-100 text-sm mt-0.5">Travel Nurse · Corporate Housing</p>
        </div>
      </div>

      {/* Main content - overlaps gradient */}
      <div className="max-w-lg mx-auto px-4 -mt-8 pb-10 space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={15} />
            {error} — showing demo data
          </div>
        )}

        {/* Current stay card */}
        {selectedLease ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Home size={16} style={{ color: "#1D9E75" }} />
                  Current Stay
                </h2>
                <StateBadge state={selectedLease.state} />
              </div>

              {property ? (
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={22} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{property.name}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin size={12} />
                      {property.metro}{property.jurisdiction ? ` · ${property.jurisdiction}` : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Property details loading...</p>
              )}
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InfoCard
                  icon={<Calendar size={14} style={{ color: "#185FA5" }} />}
                  label="Check-in"
                  value={formatDate(selectedLease.start_date)}
                  accent="#EFF6FF"
                />
                <InfoCard
                  icon={<Calendar size={14} style={{ color: "#BA7517" }} />}
                  label="Check-out"
                  value={formatDate(selectedLease.end_date)}
                  accent="#FFFBEB"
                />
              </div>
              <InfoCard
                icon={<DollarSign size={14} style={{ color: "#1D9E75" }} />}
                label="Monthly Rent"
                value={`${formatCents(selectedLease.monthly_rent_cents)}/month`}
                accent="#F0FDF9"
              />
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex flex-wrap gap-2">
              <button
                onClick={() => setShowContract(!showContract)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileText size={14} />
                {showContract ? "Hide" : "View"} Contract
                {showContract ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {selectedLease.state === "active" && (
                <button
                  onClick={() => { setShowExtendModal(true); setExtendDate(selectedLease.end_date); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#1D9E75" }}
                >
                  <ArrowRight size={14} />
                  Request Extension
                </button>
              )}
            </div>

            {/* Contract viewer */}
            {showContract && (
              <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                <p className="text-xs font-semibold text-gray-500 mb-3">Individual Lease Agreement</p>
                <div className="space-y-2">
                  {[
                    { title: "1. Parties", body: `This lease is between you (${displayResident.name}) and ${property?.name || "Property"} through Mews Network.` },
                    { title: "2. Term", body: `Your stay runs from ${formatDate(selectedLease.start_date)} to ${formatDate(selectedLease.end_date)}.` },
                    { title: "3. Rent", body: `Monthly rent of ${formatCents(selectedLease.monthly_rent_cents)} is managed by your employer and processed automatically.` },
                    { title: "4. Furnished Unit", body: "Your unit is fully furnished with high-speed internet and standard utilities included." },
                    { title: "5. Extension Policy", body: "You may request an extension subject to availability. Requests should be made at least 14 days before check-out." },
                  ].map((clause, i) => (
                    <div key={i} className="rounded-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">{clause.title}</div>
                      <div className="px-3 py-2 text-xs text-gray-600 leading-relaxed">{clause.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
            <Home size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No active stays</p>
            <p className="text-sm">Contact your employer to book corporate housing</p>
          </div>
        )}

        {/* Stay history */}
        {leases.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                Stay History
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {leases.map((lease) => {
                const prop = properties[lease.property_id];
                return (
                  <button
                    key={lease.id}
                    onClick={() => setSelectedLease(lease)}
                    className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 ${selectedLease?.id === lease.id ? "bg-green-50" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{prop?.name || "Property"}</p>
                      <p className="text-xs text-gray-400">{formatDate(lease.start_date)} — {formatDate(lease.end_date)}</p>
                    </div>
                    <StateBadge state={lease.state} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline */}
        {selectedLease && (leaseEvents.length > 0 || true) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                Timeline
              </h2>
            </div>
            <div className="px-5 py-4">
              {leaseEvents.length > 0 ? (
                <div className="space-y-4">
                  {leaseEvents.map((event, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full mt-1.5" style={{ backgroundColor: "#1D9E75" }} />
                        {i < leaseEvents.length - 1 && (
                          <div className="w-px flex-1 mt-1" style={{ backgroundColor: "#D1FAE5", minHeight: "20px" }} />
                        )}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm font-semibold text-gray-800 capitalize">
                          {event.event_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-400">{formatDateTime(event.occurred_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Synthetic timeline based on lease state */
                <div className="space-y-4">
                  {[
                    { label: "Lease Created", desc: "Lease drafted by your employer", show: true },
                    { label: "Contract Sent", desc: "Lease sent for signature", show: ["contract_sent","signed","active","completed"].includes(selectedLease.state) },
                    { label: "Lease Signed", desc: "All parties signed", show: ["signed","active","completed"].includes(selectedLease.state) },
                    { label: "Move-in", desc: `Check-in: ${formatDate(selectedLease.start_date)}`, show: selectedLease.state === "active" || selectedLease.state === "completed" },
                  ].filter((e) => e.show).map((event, i, arr) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full mt-1.5" style={{ backgroundColor: "#1D9E75" }} />
                        {i < arr.length - 1 && (
                          <div className="w-px flex-1 mt-1" style={{ backgroundColor: "#D1FAE5", minHeight: "20px" }} />
                        )}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm font-semibold text-gray-800">{event.label}</p>
                        <p className="text-xs text-gray-400">{event.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Extend modal */}
      {showExtendModal && selectedLease && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !extending && setShowExtendModal(false)} />
          <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Request Extension</h3>
              <button onClick={() => setShowExtendModal(false)} className="text-gray-400" disabled={extending}>
                <X size={20} />
              </button>
            </div>

            {extendSuccess ? (
              <div className="text-center py-6">
                <CheckCircle size={48} className="mx-auto mb-3" style={{ color: "#1D9E75" }} />
                <p className="font-bold text-gray-900">Extension Requested!</p>
                <p className="text-sm text-gray-500 mt-1">Your employer will be notified</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Current check-out: <span className="font-semibold text-gray-800">{formatDate(selectedLease.end_date)}</span>
                </p>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Check-out Date</label>
                <input
                  type="date"
                  value={extendDate}
                  min={selectedLease.end_date}
                  onChange={(e) => setExtendDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 mb-4"
                />
                <button
                  onClick={handleExtend}
                  disabled={extending || !extendDate}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#1D9E75" }}
                >
                  {extending ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                  {extending ? "Submitting..." : "Request Extension"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: accent }}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs font-semibold text-gray-500">{label}</span>
      </div>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}
