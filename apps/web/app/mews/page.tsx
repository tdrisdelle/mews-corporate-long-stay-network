"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import { DEMO_IDS } from "@/lib/auth";
import { format } from "date-fns";
import {
  Shield,
  FileText,
  Calendar,
  DollarSign,
  Users,
  ExternalLink,
  Loader2,
  AlertCircle,
  BarChart3,
  TrendingUp,
} from "lucide-react";

interface Lease {
  id: string;
  buyer_id: string;
  property_id: string;
  state: string;
  start_date: string;
  end_date: string;
  monthly_rent_cents: number;
  unit_count?: number;
}

interface Property {
  id: string;
  legal_name: string;
  metro: string;
}

interface Buyer {
  id: string;
  legal_name: string;
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

export default function MewsPage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [propertyMap, setPropertyMap] = useState<Record<string, Property>>({});
  const [buyerMap, setBuyerMap] = useState<Record<string, Buyer>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        // Fetch leases for demo buyer and property
        const [buyerLeases, propLeases] = await Promise.all([
          apiGet(`/api/leases?buyer_id=${DEMO_IDS.buyer}`).catch(() => []),
          apiGet(`/api/leases?property_id=${DEMO_IDS.property}`).catch(() => []),
        ]);

        const buyerList: Lease[] = Array.isArray(buyerLeases) ? buyerLeases : buyerLeases.leases || [];
        const propList: Lease[] = Array.isArray(propLeases) ? propLeases : propLeases.leases || [];

        // Merge and deduplicate
        const allLeases = [...buyerList];
        for (const l of propList) {
          if (!allLeases.find((x) => x.id === l.id)) allLeases.push(l);
        }
        setLeases(allLeases);

        // Fetch related data
        const propIds = [...new Set(allLeases.map((l: Lease) => l.property_id))];
        const buyerIds = [...new Set(allLeases.map((l: Lease) => l.buyer_id))];

        const propDetails: Record<string, Property> = {};
        await Promise.all(
          propIds.map(async (pid) => {
            try {
              propDetails[pid] = await apiGet(`/api/properties/${pid}`);
            } catch {
              // ignore
            }
          })
        );
        setPropertyMap(propDetails);

        const buyerDetails: Record<string, Buyer> = {};
        await Promise.all(
          buyerIds.map(async (bid) => {
            try {
              buyerDetails[bid] = await apiGet(`/api/buyers/${bid}`);
            } catch {
              buyerDetails[bid] = { id: bid, legal_name: bid.slice(0, 8) + "..." };
            }
          })
        );
        setBuyerMap(buyerDetails);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load leases");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeLeases = leases.filter((l) => l.state === "active");
  const totalRevenue = leases.reduce((sum, l) => sum + l.monthly_rent_cents, 0);
  const mewsRevenue = Math.round(totalRevenue * 0.055);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF9F6" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#1E2A2E" }} className="px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={24} style={{ color: "#1D9E75" }} />
            <p className="text-gray-400 text-sm font-medium">Mews Admin Console</p>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Network Overview</h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <AdminStat label="Total Leases" value={String(leases.length)} color="#1D9E75" />
            <AdminStat label="Active Stays" value={String(activeLeases.length)} color="#185FA5" />
            <AdminStat label="Network GMV" value={formatCents(totalRevenue) + "/mo"} color="#BA7517" />
            <AdminStat label="Mews Revenue (5.5%)" value={formatCents(mewsRevenue) + "/mo"} color="#1D9E75" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BarChart3 size={20} style={{ color: "#1E2A2E" }} />
            <h2 className="text-xl font-bold text-gray-900">All Leases</h2>
          </div>
          <span className="text-sm text-gray-500">{leases.length} total</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin" style={{ color: "#1D9E75" }} />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-3 text-sm mb-4">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {!loading && leases.length === 0 && !error && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-lg">No leases found</p>
          </div>
        )}

        {!loading && leases.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_120px_120px_100px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Lease ID</span>
              <span>Buyer</span>
              <span>Property</span>
              <span>Dates</span>
              <span>Monthly Rent</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-gray-50">
              {leases.map((lease) => {
                const prop = propertyMap[lease.property_id];
                const buyer = buyerMap[lease.buyer_id];
                return (
                  <a
                    key={lease.id}
                    href={`/mews/contracts/${lease.id}?as=mews`}
                    className="grid grid-cols-[1fr_1fr_1fr_120px_120px_100px] gap-4 px-6 py-4 hover:bg-gray-50/80 transition-colors items-center group"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-xs font-mono text-gray-500 truncate">{lease.id.slice(0, 12)}...</span>
                      <ExternalLink size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                    </div>
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {buyer?.legal_name || "Unknown"}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {prop?.legal_name || "Unknown"}{prop?.metro ? ` · ${prop.metro}` : ""}
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(lease.start_date)}
                      </span>
                      <span className="text-gray-400">to {formatDate(lease.end_date)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                      <DollarSign size={12} className="text-gray-400" />
                      {formatCents(lease.monthly_rent_cents)}
                    </div>
                    <div>
                      <StateBadge state={lease.state} />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Network health */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} style={{ color: "#1D9E75" }} />
              <p className="text-sm font-semibold text-gray-700">Take Rate</p>
            </div>
            <p className="text-3xl font-bold" style={{ color: "#1D9E75" }}>5.5%</p>
            <p className="text-xs text-gray-400 mt-1">Of gross booking value</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} style={{ color: "#185FA5" }} />
              <p className="text-sm font-semibold text-gray-700">Operator Payout</p>
            </div>
            <p className="text-3xl font-bold" style={{ color: "#185FA5" }}>94.5%</p>
            <p className="text-xs text-gray-400 mt-1">Of gross per lease</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} style={{ color: "#BA7517" }} />
              <p className="text-sm font-semibold text-gray-700">Contracts</p>
            </div>
            <p className="text-3xl font-bold" style={{ color: "#BA7517" }}>3</p>
            <p className="text-xs text-gray-400 mt-1">NMA + NPA + Individual Lease</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className="text-xl font-bold mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}
