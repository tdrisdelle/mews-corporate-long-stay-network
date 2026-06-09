"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { DEMO_IDS } from "@/lib/auth";
import { format } from "date-fns";
import {
  Building2,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  Loader2,
  AlertCircle,
  BarChart3,
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
  name: string;
  metro: string;
  jurisdiction: string;
  rate_floor_cents: number;
  total_units: number;
  accepts_network_bookings: boolean;
  max_network_exposure_pct?: number;
}

interface Buyer {
  id: string;
  name: string;
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

export default function OperatorPage() {
  const propertyId = DEMO_IDS.property;

  const [property, setProperty] = useState<Property | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [buyerNames, setBuyerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [propData, leasesData] = await Promise.all([
        apiGet(`/api/properties/${propertyId}`),
        apiGet(`/api/leases?property_id=${propertyId}`),
      ]);
      setProperty(propData);
      const leaseList: Lease[] = Array.isArray(leasesData) ? leasesData : leasesData.leases || [];
      setLeases(leaseList);

      // Fetch buyer names
      const uniqueBuyerIds = [...new Set(leaseList.map((l: Lease) => l.buyer_id))];
      const nameMap: Record<string, string> = {};
      await Promise.all(
        uniqueBuyerIds.map(async (bid) => {
          try {
            const b: Buyer = await apiGet(`/api/buyers/${bid}`);
            nameMap[bid] = b.legal_name;
          } catch {
            nameMap[bid] = bid.slice(0, 8) + "...";
          }
        })
      );
      setBuyerNames(nameMap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleNetworkBookings() {
    if (!property) return;
    setToggling(true);
    try {
      const updated = await apiPatch(`/api/properties/${propertyId}/participation`, {
        accepts_network_bookings: !property.accepts_network_bookings,
      });
      setProperty(updated);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Toggle failed");
    } finally {
      setToggling(false);
    }
  }

  const activeLeases = leases.filter((l) => l.state === "active");
  const networkRevenue = activeLeases.reduce((sum, l) => sum + l.monthly_rent_cents, 0);
  const totalUnitsBooked = leases
    .filter((l) => ["active", "signed", "contract_sent"].includes(l.state))
    .reduce((sum, l) => sum + (l.unit_count || 1), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin" style={{ color: "#1D9E75" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-3">
          <AlertCircle size={16} />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF9F6" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #185FA5 0%, #1D9E75 100%)" }} className="px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-blue-100 text-sm font-medium mb-1">Operator Dashboard</p>
          <h1 className="text-3xl font-bold text-white mb-1">{property?.name || "Property"}</h1>
          <p className="text-blue-100 text-sm">{property?.metro} · {property?.jurisdiction}</p>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <StatCard label="Active Leases" value={String(activeLeases.length)} />
            <StatCard label="Total Bookings" value={String(leases.length)} />
            <StatCard label="Units Occupied" value={`${totalUnitsBooked}/${property?.total_units || 0}`} />
            <StatCard label="Network Revenue" value={formatCents(networkRevenue) + "/mo"} />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Property Settings */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <Building2 size={20} style={{ color: "#185FA5" }} />
            <h2 className="text-lg font-bold text-gray-900">Property Settings</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <SettingRow label="Rate Floor" value={formatCents(property?.rate_floor_cents || 0) + "/mo"} />
                <SettingRow label="Total Units" value={String(property?.total_units || 0)} />
                <SettingRow label="Max Exposure" value={`${property?.max_network_exposure_pct || 25}%`} />
                <SettingRow label="Jurisdiction" value={property?.jurisdiction || "—"} />
              </div>

              <div className="flex flex-col justify-center">
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">Network Bookings</p>
                      <p className="text-sm text-gray-500 mt-0.5">Accept bookings from corporate buyers</p>
                    </div>
                    <button
                      onClick={toggleNetworkBookings}
                      disabled={toggling}
                      className="ml-3 flex-shrink-0"
                    >
                      {toggling ? (
                        <Loader2 size={28} className="animate-spin" style={{ color: "#1D9E75" }} />
                      ) : property?.accepts_network_bookings ? (
                        <ToggleRight size={44} style={{ color: "#1D9E75" }} />
                      ) : (
                        <ToggleLeft size={44} className="text-gray-300" />
                      )}
                    </button>
                  </div>
                  <div className="mt-3">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: property?.accepts_network_bookings ? "#D1FAE5" : "#F3F4F6",
                        color: property?.accepts_network_bookings ? "#065F46" : "#6B7280",
                      }}
                    >
                      {property?.accepts_network_bookings ? "Accepting Network Bookings" : "Network Bookings Disabled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Revenue section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <TrendingUp size={20} style={{ color: "#1D9E75" }} />
            <h2 className="text-lg font-bold text-gray-900">Revenue Overview</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-700 mb-1">Network Revenue (Active)</p>
                <p className="text-2xl font-bold text-green-800">{formatCents(networkRevenue)}</p>
                <p className="text-xs text-green-600 mt-0.5">per month</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-1">Active Leases</p>
                <p className="text-2xl font-bold text-blue-800">{activeLeases.length}</p>
                <p className="text-xs text-blue-600 mt-0.5">current corporate stays</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-purple-700 mb-1">Avg. Lease Value</p>
                <p className="text-2xl font-bold text-purple-800">
                  {activeLeases.length > 0 ? formatCents(networkRevenue / activeLeases.length) : "$0"}
                </p>
                <p className="text-xs text-purple-600 mt-0.5">per month per lease</p>
              </div>
            </div>
          </div>
        </section>

        {/* Network Bookings */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 size={20} style={{ color: "#BA7517" }} />
              <h2 className="text-lg font-bold text-gray-900">Network Bookings</h2>
            </div>
            <span className="text-sm text-gray-500">{leases.length} total</span>
          </div>

          {leases.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No bookings yet</p>
              <p className="text-sm">Bookings will appear here when corporate buyers create leases for your property</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {leases.map((lease) => (
                <div key={lease.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StateBadge state={lease.state} />
                        <span className="font-semibold text-gray-900 text-sm">
                          {buyerNames[lease.buyer_id] || lease.buyer_id.slice(0, 8) + "..."}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(lease.start_date)} — {formatDate(lease.end_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign size={11} />
                          {formatCents(lease.monthly_rent_cents)}/mo
                        </span>
                        {lease.unit_count && (
                          <span className="flex items-center gap-1">
                            <Users size={11} />
                            {lease.unit_count} units
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-mono">{lease.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-white">
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
