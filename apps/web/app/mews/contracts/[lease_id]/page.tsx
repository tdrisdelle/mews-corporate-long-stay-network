"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { format } from "date-fns";
import {
  FileText,
  CheckCircle,
  Clock,
  ArrowRight,
  Building2,
  Users,
  DollarSign,
  Calendar,
  Shield,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface ContractClause {
  title?: string;
  heading?: string;
  body?: string;
  content?: string;
  text?: string;
}

interface Contract {
  id: string;
  contract_type: string;
  parties: string[];
  jurisdiction?: string;
  signed_at?: string | null;
  body?: {
    clauses?: ContractClause[];
    preamble?: string;
  };
  clauses?: ContractClause[];
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

interface Property {
  id: string;
  name: string;
  metro: string;
  jurisdiction?: string;
  rate_floor_cents: number;
}

interface Buyer {
  id: string;
  name: string;
  take_rate_bps?: number;
}

interface LifecycleEvent {
  event_type: string;
  occurred_at: string;
  metadata?: Record<string, unknown>;
}

function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string) {
  try {
    return format(new Date(dateStr + "T00:00:00"), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

const TAKE_RATE = 0.055;

const PLACEHOLDER_NMA_CLAUSES: ContractClause[] = [
  {
    heading: "1. Network Membership",
    body: "This Network Member Agreement (\"Agreement\") is entered into between the Corporate Buyer (\"Member\") and Mews Network, Inc. (\"Network\"). Member agrees to the terms of participation in the Mews Corporate Long-Stay Network.",
  },
  {
    heading: "2. Take Rate & Fees",
    body: `Member acknowledges that Mews Network charges a 5.5% platform fee on all booking value processed through the Network. This fee is deducted from the gross booking amount before remittance to the property operator.`,
  },
  {
    heading: "3. Network Standards",
    body: "Member agrees to comply with all Network standards including timely payment, professional conduct, and proper use of platform features. Violations may result in suspension or termination of membership.",
  },
  {
    heading: "4. Data & Privacy",
    body: "Member consents to the collection and processing of booking data, resident information, and usage analytics in accordance with the Mews Privacy Policy and applicable data protection laws.",
  },
  {
    heading: "5. Term & Termination",
    body: "This Agreement is effective upon execution and remains in force for twelve (12) months, automatically renewing unless terminated with 30 days written notice by either party.",
  },
];

const PLACEHOLDER_NPA_CLAUSES: ContractClause[] = [
  {
    heading: "1. Network Participation",
    body: "This Network Participation Agreement (\"Agreement\") is entered into between the Property Operator (\"Operator\") and Mews Network, Inc. (\"Network\"). Operator agrees to list available units on the Mews Corporate Long-Stay Network.",
  },
  {
    heading: "2. Rate Floor Commitment",
    body: "Operator commits to honoring bookings at or above the established Rate Floor for the duration of each confirmed booking. Rate adjustments require 30 days advance notice to the Network.",
  },
  {
    heading: "3. Unit Availability",
    body: "Operator agrees to maintain accurate unit availability on the Network platform and to honor confirmed bookings unless force majeure events make fulfillment impossible.",
  },
  {
    heading: "4. Payout Terms",
    body: "Network will remit 94.5% of gross booking value to Operator within 5 business days of each monthly payment cycle. The remaining 5.5% constitutes the Network platform fee.",
  },
  {
    heading: "5. Quality Standards",
    body: "Operator agrees to maintain units in accordance with Network quality standards, including professional-grade furnishings, high-speed internet, and on-site management availability.",
  },
];

function ClauseList({ clauses }: { clauses: ContractClause[] }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  return (
    <div className="space-y-2">
      {clauses.map((clause, i) => {
        const title = clause.heading || clause.title || `Clause ${i + 1}`;
        const body = clause.body || clause.content || clause.text || "";
        const isOpen = expanded[i] ?? true;
        return (
          <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              onClick={() => setExpanded((prev) => ({ ...prev, [i]: !isOpen }))}
            >
              <span className="text-sm font-semibold text-gray-800">{title}</span>
              {isOpen ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
            </button>
            {isOpen && body && (
              <div className="px-4 py-3 text-sm text-gray-600 leading-relaxed">{body}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ContractPage() {
  const params = useParams();
  const leaseId = params.lease_id as string;

  const [lease, setLease] = useState<Lease | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [lifecycle, setLifecycle] = useState<LifecycleEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"nma" | "npa" | "lease">("nma");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const leaseData: Lease = await apiGet(`/api/leases/${leaseId}`);
        setLease(leaseData);

        const [propData, buyerData] = await Promise.all([
          apiGet(`/api/properties/${leaseData.property_id}`).catch(() => null),
          apiGet(`/api/buyers/${leaseData.buyer_id}`).catch(() => null),
        ]);
        setProperty(propData);
        setBuyer(buyerData);

        // Try to fetch contracts
        try {
          const contractsData = await apiGet(`/api/leases/${leaseId}/contracts`);
          setContracts(Array.isArray(contractsData) ? contractsData : contractsData.contracts || []);
        } catch {
          setContracts([]);
        }

        // Try to fetch lifecycle
        try {
          const lcData = await apiGet(`/admin/lifecycle/${leaseId}`);
          setLifecycle(Array.isArray(lcData) ? lcData : lcData.events || []);
        } catch {
          setLifecycle([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load contract");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [leaseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin" style={{ color: "#1D9E75" }} />
      </div>
    );
  }

  if (error || !lease) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-3">
          <AlertCircle size={16} />
          {error || "Lease not found"}
        </div>
      </div>
    );
  }

  const getContract = (type: string) => contracts.find((c) => c.contract_type?.toLowerCase() === type.toLowerCase());

  const nmaContract = getContract("NMA");
  const npaContract = getContract("NPA");
  const leaseContract = getContract("LEASE") || getContract("individual_lease");

  const monthlyRent = lease.monthly_rent_cents;
  const mewsFee = Math.round(monthlyRent * TAKE_RATE);
  const operatorPayout = monthlyRent - mewsFee;

  const tabs = [
    { id: "nma" as const, label: "NMA", subtitle: "Network Member Agreement" },
    { id: "npa" as const, label: "NPA", subtitle: "Network Participation Agreement" },
    { id: "lease" as const, label: "Lease", subtitle: "Individual Lease Agreement" },
  ];

  function ContractPanel({ contract, type, parties, clauses, jurisdiction }: {
    contract: Contract | undefined;
    type: string;
    parties: string[];
    clauses: ContractClause[];
    jurisdiction?: string;
  }) {
    const effectiveClauses = contract?.body?.clauses || contract?.clauses || clauses;
    const effectiveParties = contract?.parties || parties;
    const signedAt = contract?.signed_at;

    return (
      <div className="space-y-4">
        {/* Contract meta */}
        <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 font-medium mb-0.5">Contract Type</p>
            <p className="font-semibold text-gray-900">{type}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-0.5">Parties</p>
            <p className="font-semibold text-gray-900">{effectiveParties.join(" · ") || "—"}</p>
          </div>
          {jurisdiction && (
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Jurisdiction</p>
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: "#DBEAFE", color: "#1D4ED8" }}>
                {jurisdiction}
              </span>
            </div>
          )}
          <div className="ml-auto">
            <p className="text-xs text-gray-400 font-medium mb-0.5">Signature Status</p>
            {signedAt ? (
              <div className="flex items-center gap-1.5 text-green-700">
                <CheckCircle size={14} />
                <span className="text-xs font-semibold">Signed {formatDate(signedAt)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-400">
                <Clock size={14} />
                <span className="text-xs font-semibold">Pending Signature</span>
              </div>
            )}
          </div>
        </div>

        {/* Clauses */}
        <ClauseList clauses={effectiveClauses} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF9F6" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#1E2A2E" }} className="px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <a href="/mews?as=mews" className="text-gray-400 text-sm hover:text-gray-200 transition-colors flex items-center gap-1 mb-3">
            ← Back to Network Overview
          </a>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield size={18} style={{ color: "#1D9E75" }} />
                <p className="text-gray-400 text-sm">Contract Suite</p>
              </div>
              <h1 className="text-2xl font-bold text-white">
                {buyer?.name || "Corporate Buyer"} × {property?.name || "Property"}
              </h1>
              <p className="text-gray-400 text-sm mt-1 font-mono">Lease {leaseId.slice(0, 16)}...</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-400 font-medium">Monthly Rent</p>
              <p className="text-2xl font-bold" style={{ color: "#1D9E75" }}>{formatCents(monthlyRent)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Contracts tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tab header */}
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-4 text-center transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 font-bold"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                style={activeTab === tab.id ? { borderColor: "#1D9E75", color: "#1D9E75" } : {}}
              >
                <div className="text-sm font-semibold">{tab.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{tab.subtitle}</div>
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "nma" && (
              <ContractPanel
                contract={nmaContract}
                type="Network Member Agreement (NMA)"
                parties={[buyer?.name || "Corporate Buyer", "Mews Network, Inc."]}
                clauses={PLACEHOLDER_NMA_CLAUSES}
                jurisdiction={property?.jurisdiction || "TN"}
              />
            )}
            {activeTab === "npa" && (
              <ContractPanel
                contract={npaContract}
                type="Network Participation Agreement (NPA)"
                parties={[property?.name || "Property Operator", "Mews Network, Inc."]}
                clauses={PLACEHOLDER_NPA_CLAUSES}
                jurisdiction={property?.jurisdiction || "TN"}
              />
            )}
            {activeTab === "lease" && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Parties</p>
                    <p className="font-semibold text-gray-900">
                      {buyer?.name || "Buyer"} × {property?.name || "Property"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Term</p>
                    <p className="font-semibold text-gray-900">
                      {formatDateShort(lease.start_date)} — {formatDateShort(lease.end_date)}
                    </p>
                  </div>
                  {property?.jurisdiction && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-0.5">Jurisdiction</p>
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: "#DBEAFE", color: "#1D4ED8" }}>
                        {property.jurisdiction}
                      </span>
                    </div>
                  )}
                  <div className="ml-auto">
                    <p className="text-xs text-gray-400 font-medium mb-0.5">State</p>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{
                      backgroundColor: lease.state === "active" ? "#D1FAE5" : "#F3F4F6",
                      color: lease.state === "active" ? "#065F46" : "#6B7280",
                    }}>
                      {lease.state.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                </div>

                {leaseContract ? (
                  <ClauseList clauses={leaseContract.body?.clauses || leaseContract.clauses || []} />
                ) : (
                  <div className="space-y-2">
                    <ClauseList clauses={[
                      { heading: "1. Parties", body: `Tenant: ${buyer?.name || "Corporate Buyer"}. Landlord/Operator: ${property?.name || "Property"}. Network Intermediary: Mews Network, Inc.` },
                      { heading: "2. Premises", body: `${lease.unit_count || 1} furnished unit(s) at ${property?.name || "Property"}, ${property?.metro || ""}. Units are delivered in move-in ready condition with professional furnishings.` },
                      { heading: "3. Term", body: `The lease term begins ${formatDateShort(lease.start_date)} and ends ${formatDateShort(lease.end_date)}. Early termination requires 30 days written notice.` },
                      { heading: "4. Rent", body: `Monthly rent of ${formatCents(monthlyRent)} is due on the 1st of each month. Payment is processed automatically through the Mews Network platform.` },
                      { heading: "5. Furnished & Utilities", body: "All units are fully furnished. High-speed internet, utilities, and standard amenities are included in the monthly rent." },
                      { heading: "6. Residents", body: "Tenant may assign specific residents to units with 48 hours notice. Resident substitutions are permitted without additional fees." },
                      { heading: "7. Extensions", body: "Tenant may request lease extensions subject to availability. Extension requests must be submitted 14 days prior to lease end date." },
                    ]} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payment Routing Diagram */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <DollarSign size={18} style={{ color: "#1D9E75" }} />
            Payment Routing
          </h3>
          <div className="flex items-center justify-center flex-wrap gap-3 py-4">
            {/* Buyer box */}
            <div className="flex flex-col items-center">
              <div className="rounded-xl border-2 px-5 py-4 text-center min-w-[140px]" style={{ borderColor: "#185FA5", backgroundColor: "#EFF6FF" }}>
                <Users size={20} style={{ color: "#185FA5" }} className="mx-auto mb-1" />
                <p className="font-bold text-sm text-gray-900">{buyer?.name || "Corporate Buyer"}</p>
                <p className="text-xs text-gray-500 mt-0.5">Buyer</p>
              </div>
              <p className="text-xs font-semibold mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: "#DBEAFE", color: "#185FA5" }}>
                {formatCents(monthlyRent)}/mo
              </p>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center">
              <ArrowRight size={24} className="text-gray-400" />
              <p className="text-xs text-gray-400 mt-1">pays</p>
            </div>

            {/* Mews box */}
            <div className="flex flex-col items-center">
              <div className="rounded-xl border-2 px-5 py-4 text-center min-w-[140px]" style={{ borderColor: "#1D9E75", backgroundColor: "#F0FDF9" }}>
                <Shield size={20} style={{ color: "#1D9E75" }} className="mx-auto mb-1" />
                <p className="font-bold text-sm text-gray-900">Mews Network</p>
                <p className="text-xs text-gray-500 mt-0.5">Intermediary</p>
              </div>
              <p className="text-xs font-semibold mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: "#D1FAE5", color: "#065F46" }}>
                ↑ {formatCents(mewsFee)}/mo (5.5%)
              </p>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center">
              <ArrowRight size={24} className="text-gray-400" />
              <p className="text-xs text-gray-400 mt-1">remits</p>
            </div>

            {/* Operator box */}
            <div className="flex flex-col items-center">
              <div className="rounded-xl border-2 px-5 py-4 text-center min-w-[140px]" style={{ borderColor: "#BA7517", backgroundColor: "#FFFBEB" }}>
                <Building2 size={20} style={{ color: "#BA7517" }} className="mx-auto mb-1" />
                <p className="font-bold text-sm text-gray-900">{property?.name || "Operator"}</p>
                <p className="text-xs text-gray-500 mt-0.5">Property</p>
              </div>
              <p className="text-xs font-semibold mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                {formatCents(operatorPayout)}/mo (94.5%)
              </p>
            </div>
          </div>

          {/* Summary row */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-gray-400 text-xs">Total Paid</p>
              <p className="font-bold text-gray-900">{formatCents(monthlyRent)}/mo</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Mews Take (5.5%)</p>
              <p className="font-bold" style={{ color: "#1D9E75" }}>{formatCents(mewsFee)}/mo</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Operator Receives</p>
              <p className="font-bold" style={{ color: "#BA7517" }}>{formatCents(operatorPayout)}/mo</p>
            </div>
          </div>
        </div>

        {/* Lifecycle timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Calendar size={18} style={{ color: "#185FA5" }} />
            Audit Trail
          </h3>

          {lifecycle.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No lifecycle events recorded yet</p>
              <div className="mt-4 space-y-3">
                {/* Placeholder events based on lease state */}
                {["draft", "contract_sent", "signed", "active"].slice(
                  0,
                  ["draft", "contract_sent", "signed", "active"].indexOf(lease.state) + 1
                ).map((state, i) => (
                  <div key={i} className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#1D9E75" }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 capitalize">{state.replace("_", " ")}</p>
                      <p className="text-xs text-gray-400">Lease transitioned to {state}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {lifecycle.map((event, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: "#1D9E75" }} />
                    {i < lifecycle.length - 1 && (
                      <div className="w-px flex-1 mt-1" style={{ backgroundColor: "#D1FAE5", minHeight: "24px" }} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                      {event.event_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(event.occurred_at)}</p>
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <p className="text-xs text-gray-500 mt-1 font-mono bg-gray-50 rounded px-2 py-1">
                        {JSON.stringify(event.metadata)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lease details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={18} style={{ color: "#1E2A2E" }} />
            Lease Details
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <DetailItem icon={<Building2 size={14} />} label="Property" value={property?.name || "—"} />
            <DetailItem icon={<Users size={14} />} label="Buyer" value={buyer?.name || "—"} />
            <DetailItem icon={<Calendar size={14} />} label="Start Date" value={formatDateShort(lease.start_date)} />
            <DetailItem icon={<Calendar size={14} />} label="End Date" value={formatDateShort(lease.end_date)} />
            <DetailItem icon={<DollarSign size={14} />} label="Monthly Rent" value={formatCents(monthlyRent)} />
            <DetailItem icon={<Shield size={14} />} label="State" value={lease.state.replace("_", " ").toUpperCase()} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
