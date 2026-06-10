"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { DEMO_IDS } from "@/lib/auth";
import { format } from "date-fns";
import {
  Search,
  Building2,
  MapPin,
  DollarSign,
  Users,
  CheckCircle,
  X,
  ChevronRight,
  FileText,
  Calendar,
  ArrowRight,
  Loader2,
  AlertCircle,
  Star,
  Pencil,
  Trash2,
  Eye,
  UserPlus,
  Clock,
  TriangleAlert,
} from "lucide-react";

interface Property {
  id: string;
  legal_name: string;
  metro: string;
  jurisdiction: string;
  rate_floor_cents: number;
  unit_count: number;
  available_units: number;
  accepts_network_bookings: boolean;
  photo_url?: string;
}

interface Traveler {
  id: string;
  full_name: string;
  email: string;
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
  residents?: { id: string; unit_assignment: string }[];
  property?: Property;
  buyer_name?: string;
}

interface Buyer {
  id: string;
  legal_name: string;
  domain?: string;
  nma_signed_at?: string;
}

interface TravelerLease {
  id: string;
  state: string;
  start_date: string;
  end_date: string;
  monthly_rent_cents: number;
  unit_assignment: string;
  property_id: string;
  property_name: string | null;
  property_metro: string | null;
}

const LEASE_STATE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "#F3F4F6", text: "#6B7280", label: "Draft" },
  contract_sent: { bg: "#DBEAFE", text: "#1D4ED8", label: "Contract Sent" },
  signed: { bg: "#EDE9FE", text: "#6D28D9", label: "Signed" },
  active: { bg: "#D1FAE5", text: "#065F46", label: "Active" },
  completed: { bg: "#F3F4F6", text: "#6B7280", label: "Completed" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B", label: "Cancelled" },
};

const METROS = ["Nashville", "Dallas", "Raleigh", "Phoenix", "Boston"];

function StateBadge({ state }: { state: string }) {
  const colors = LEASE_STATE_COLORS[state] || LEASE_STATE_COLORS.draft;
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
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

export default function BookerPage() {
  const buyerId = DEMO_IDS.buyer;

  // Search state
  const [metro, setMetro] = useState("Nashville");
  const [startDate, setStartDate] = useState("2026-07-15");
  const [endDate, setEndDate] = useState("2026-10-14");
  const [unitCount, setUnitCount] = useState(6);

  // Data
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [propertyMap, setPropertyMap] = useState<Record<string, Property>>({});

  // UI state
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [createStart, setCreateStart] = useState("2026-07-15");
  const [createEnd, setCreateEnd] = useState("2026-10-14");
  const [createRent, setCreateRent] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [leaseCreated, setLeaseCreated] = useState(false);
  const [leasesLoading, setLeasesLoading] = useState(true);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [travelersLoading, setTravelersLoading] = useState(false);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [editingLeaseId, setEditingLeaseId] = useState<string | null>(null);
  const [deletingLeaseId, setDeletingLeaseId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [signingOverlay, setSigningOverlay] = useState(false);

  // Extension modal
  const [extendLease, setExtendLease] = useState<Lease | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [extending, setExtending] = useState(false);

  // Traveler management
  const [travelerFormOpen, setTravelerFormOpen] = useState(false);
  const [editingTraveler, setEditingTraveler] = useState<Traveler | null>(null);
  const [travelerFormData, setTravelerFormData] = useState({ full_name: "", email: "", phone: "" });
  const [travelerFormLoading, setTravelerFormLoading] = useState(false);
  const [travelerFormError, setTravelerFormError] = useState("");
  const [confirmDeleteTraveler, setConfirmDeleteTraveler] = useState<Traveler | null>(null);
  const [deleteTravelerLoading, setDeleteTravelerLoading] = useState(false);
  const [historyTraveler, setHistoryTraveler] = useState<Traveler | null>(null);
  const [historyLeases, setHistoryLeases] = useState<TravelerLease[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Detail view
  const [viewingLease, setViewingLease] = useState<Lease | null>(null);

  // Action loading states
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});

  const fetchTravelers = useCallback(async () => {
    try {
      const data = await apiGet(`/api/buyers/${buyerId}/travelers`);
      setTravelers(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    }
  }, [buyerId]);

  const fetchLeases = useCallback(async () => {
    setLeasesLoading(true);
    try {
      const data = await apiGet(`/api/leases?buyer_id=${buyerId}`);
      const leaseList: Lease[] = Array.isArray(data) ? data : data.leases || [];

      // Fetch property details for each unique property
      const propIds = [...new Set(leaseList.map((l: Lease) => l.property_id))];
      const propDetails: Record<string, Property> = { ...propertyMap };
      await Promise.all(
        propIds.map(async (pid) => {
          if (!propDetails[pid]) {
            try {
              propDetails[pid] = await apiGet(`/api/properties/${pid}`);
            } catch {
              // ignore
            }
          }
        })
      );
      setPropertyMap(propDetails);
      setLeases(leaseList);
    } catch {
      // silently fail - show empty
    } finally {
      setLeasesLoading(false);
    }
  }, [buyerId, propertyMap]);

  useEffect(() => {
    // Fetch buyer info
    apiGet(`/api/buyers/${buyerId}`)
      .then((data) => setBuyer(data))
      .catch(() => setBuyer({ id: buyerId, legal_name: "Stanford Healthcare" }));

    fetchLeases();
    fetchTravelers();
    // Run initial search
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep detail panel in sync after any lease action refreshes the list
  useEffect(() => {
    if (!viewingLease) return;
    const updated = leases.find((l) => l.id === viewingLease.id);
    if (updated) setViewingLease(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leases]);

  async function handleSearch() {
    setSearching(true);
    setSearchError("");
    try {
      const params = new URLSearchParams({
        metro,
        start_date: startDate,
        end_date: endDate,
        unit_count: String(unitCount),
      });
      const data = await apiGet(`/api/properties/search?${params}`);
      setProperties(Array.isArray(data) ? data : data.properties || []);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
      setProperties([]);
    } finally {
      setSearching(false);
    }
  }

  function openCreatePanel(property: Property) {
    setSelectedProperty(property);
    setCreateStart(startDate);
    setCreateEnd(endDate);
    setCreateRent(String(property.rate_floor_cents / 100));
    setCreateError("");
    setCreateStep(1);
    setAssignments({});
    setShowCreatePanel(true);
  }

  function closeCreatePanel() {
    setShowCreatePanel(false);
    setCreateStep(1);
    setAssignments({});
    setEditingLeaseId(null);
  }

  function openEditPanel(lease: Lease) {
    setEditingLeaseId(lease.id);
    setCreateStart(lease.start_date);
    setCreateEnd(lease.end_date);
    setCreateRent(String(lease.monthly_rent_cents / 100));
    setCreateError("");
    setCreateStep(1);
    const preAssigned: Record<number, string> = {};
    (lease.residents ?? []).forEach((r, i) => { preAssigned[i] = r.id; });
    setAssignments(preAssigned);
    setShowCreatePanel(true);
  }

  async function handleDeleteLease(leaseId: string) {
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/leases/${leaseId}`);
      setDeletingLeaseId(null);
      await fetchLeases();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleNextStep() {
    if (travelers.length === 0) {
      setTravelersLoading(true);
      try {
        const data = await apiGet(`/api/buyers/${buyerId}/travelers`);
        setTravelers(Array.isArray(data) ? data : []);
      } catch {
        setTravelers([]);
      } finally {
        setTravelersLoading(false);
      }
    }
    setCreateStep(2);
  }

  async function handleCreateLease() {
    if (!selectedProperty && !editingLeaseId) return;
    setCreating(true);
    setCreateError("");
    try {
      const residents = Array.from({ length: unitCount }, (_, i) => ({
        id: assignments[i],
        unit_assignment: `Unit ${i + 1}`,
      }));
      if (editingLeaseId) {
        await apiPatch(`/api/leases/${editingLeaseId}`, {
          start: createStart,
          end: createEnd,
          monthly_rent_cents: Math.round(parseFloat(createRent) * 100),
          residents,
        });
      } else {
        await apiPost("/api/leases", {
          buyer_id: buyerId,
          property_id: selectedProperty!.id,
          start: createStart,
          end: createEnd,
          monthly_rent_cents: Math.round(parseFloat(createRent) * 100),
          residents,
        });
      }
      closeCreatePanel();
      await fetchLeases();
      if (!editingLeaseId) {
        setLeaseCreated(true);
        setTimeout(() => setLeaseCreated(false), 4000);
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : editingLeaseId ? "Failed to save changes" : "Failed to create lease");
    } finally {
      setCreating(false);
    }
  }

  async function handleLeaseAction(leaseId: string, action: string, body?: unknown) {
    setActionLoading((prev) => ({ ...prev, [leaseId]: action }));
    if (action === "sign") setSigningOverlay(true);
    try {
      await apiPost(`/api/leases/${leaseId}/${action}`, body);
      if (action === "sign") {
        await new Promise((res) => setTimeout(res, 2800));
      }
      await fetchLeases();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action failed");
    } finally {
      setSigningOverlay(false);
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[leaseId];
        return next;
      });
    }
  }

  async function handleExtend() {
    if (!extendLease || !extendDate) return;
    setExtending(true);
    try {
      await apiPost(`/api/leases/${extendLease.id}/extend`, { new_end: extendDate });
      setExtendLease(null);
      await fetchLeases();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Extend failed");
    } finally {
      setExtending(false);
    }
  }

  function openDetailPanel(lease: Lease) {
    setViewingLease(lease);
  }

  function openTravelerForm(traveler: Traveler | null) {
    setEditingTraveler(traveler);
    setTravelerFormData({
      full_name: traveler?.full_name ?? "",
      email: traveler?.email ?? "",
      phone: traveler?.phone ?? "",
    });
    setTravelerFormError("");
    setTravelerFormOpen(true);
  }

  function closeTravelerForm() {
    setTravelerFormOpen(false);
    setEditingTraveler(null);
    setTravelerFormError("");
  }

  async function handleSaveTraveler() {
    setTravelerFormLoading(true);
    setTravelerFormError("");
    try {
      if (editingTraveler) {
        await apiPatch(`/api/buyers/${buyerId}/travelers/${editingTraveler.id}`, travelerFormData);
      } else {
        await apiPost(`/api/buyers/${buyerId}/travelers`, travelerFormData);
      }
      closeTravelerForm();
      await fetchTravelers();
    } catch (e) {
      setTravelerFormError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setTravelerFormLoading(false);
    }
  }

  async function handleDeleteTraveler(travelerId: string) {
    setDeleteTravelerLoading(true);
    try {
      await apiDelete(`/api/buyers/${buyerId}/travelers/${travelerId}`);
      setConfirmDeleteTraveler(null);
      await fetchTravelers();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteTravelerLoading(false);
    }
  }

  async function openTravelerHistory(traveler: Traveler) {
    setHistoryTraveler(traveler);
    setHistoryLeases([]);
    setHistoryLoading(true);
    try {
      const data = await apiGet(`/api/buyers/${buyerId}/travelers/${traveler.id}/leases`);
      setHistoryLeases(Array.isArray(data) ? data : []);
    } catch {
      setHistoryLeases([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF9F6" }}>
      {/* Hero header */}
      <div style={{ background: "linear-gradient(135deg, #1D9E75 0%, #185FA5 100%)" }} className="px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Corporate Housing Portal</p>
              <h1 className="text-3xl font-bold text-white mb-1">
                Welcome back, {buyer?.legal_name || "Loading..."}
              </h1>
              <p className="text-green-100 text-sm">
                Find and book verified corporate housing for your team
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-white text-xs font-medium">Active Stays</p>
                <p className="text-white text-2xl font-bold">
                  {leases.filter((l) => l.state === "active").length}
                </p>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-6 bg-white rounded-2xl shadow-xl p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">City / Metro</label>
                <select
                  value={metro}
                  onChange={(e) => setMetro(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ focusRingColor: "#1D9E75" } as React.CSSProperties}
                >
                  {METROS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[130px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Check-in</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div className="flex-1 min-w-[130px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Check-out</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Units</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={unitCount}
                  onChange={(e) => setUnitCount(parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
                style={{ backgroundColor: "#1D9E75" }}
              >
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Search Results */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Available Properties</h2>
            {properties.length > 0 && (
              <span className="text-sm text-gray-500">{properties.length} results in {metro}</span>
            )}
          </div>

          {searchError && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-3 text-sm">
              <AlertCircle size={16} />
              {searchError}
            </div>
          )}

          {searching && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin" style={{ color: "#1D9E75" }} />
            </div>
          )}

          {!searching && properties.length === 0 && !searchError && (
            <div className="text-center py-16 text-gray-400">
              <Building2 size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No properties found</p>
              <p className="text-sm">Try adjusting your search criteria</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => openCreatePanel(property)}
              >
                {/* Property image */}
                <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  {property.photo_url ? (
                    <img
                      src={property.photo_url}
                      alt={property.legal_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 size={48} className="text-gray-300" />
                    </div>
                  )}
                  {property.accepts_network_bookings && (
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1" style={{ backgroundColor: "#1D9E75" }}>
                        <Star size={10} fill="white" />
                        Network Partner
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/90 text-gray-700">
                      {property.jurisdiction}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-base mb-1">{property.legal_name}</h3>
                  <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                    <MapPin size={13} />
                    <span>{property.metro}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Starting from</p>
                      <p className="text-lg font-bold" style={{ color: "#1D9E75" }}>
                        {formatCents(property.rate_floor_cents)}
                        <span className="text-xs text-gray-400 font-normal">/mo</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-medium">Available</p>
                      <div className="flex items-center gap-1 text-gray-700 font-semibold text-sm">
                        <Users size={13} />
                        <span>{property.available_units ?? property.unit_count} units</span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="mt-3 w-full py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#1D9E75" }}
                  >
                    Book Now <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Traveler Roster */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Your Travelers</h2>
            <button
              onClick={() => openTravelerForm(null)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1D9E75" }}
            >
              <UserPlus size={14} /> Add Traveler
            </button>
          </div>

          {travelers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
              <Users size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium text-sm">No travelers yet</p>
              <p className="text-xs mt-0.5">Add nurses, employees, or contractors to your roster</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
              {travelers.map((traveler) => {
                const status = getTravelerStatus(traveler.id, leases);
                const onActive = status === "active";
                const isDeleting = confirmDeleteTraveler?.id === traveler.id;
                return (
                  <div key={traveler.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ backgroundColor: onActive ? "#1D9E75" : "#9CA3AF" }}
                      >
                        {traveler.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{traveler.full_name}</p>
                          {status === "active" && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 shrink-0">Active Stay</span>
                          )}
                          {status === "upcoming" && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 shrink-0">Upcoming</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {traveler.email}{traveler.phone ? ` · ${traveler.phone}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      {isDeleting ? (
                        <>
                          <span className="text-xs text-red-600 font-medium mr-1">Delete?</span>
                          <button
                            onClick={() => handleDeleteTraveler(traveler.id)}
                            disabled={deleteTravelerLoading}
                            className="px-2 py-1 rounded text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                          >
                            {deleteTravelerLoading ? <Loader2 size={10} className="animate-spin" /> : "Yes"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteTraveler(null)}
                            className="px-2 py-1 rounded text-xs font-semibold text-gray-500 hover:bg-gray-100"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => openTravelerHistory(traveler)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            title="Booking History"
                          >
                            <Clock size={14} />
                          </button>
                          <button
                            onClick={() => openTravelerForm(traveler)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteTraveler(traveler)}
                            disabled={onActive}
                            title={onActive ? "Cannot delete: traveler has an active stay" : "Delete traveler"}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Lease List */}
        <section>
          {leaseCreated && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm font-medium">
              <CheckCircle size={16} className="text-green-600 shrink-0" />
              Lease created — it's now in draft state below.
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Bookings</h2>

          {leasesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : leases.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No bookings yet</p>
              <p className="text-sm">Search for properties above and create your first lease</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leases.map((lease) => {
                const prop = propertyMap[lease.property_id];
                const loading = actionLoading[lease.id];
                return (
                  <div
                    key={lease.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      {/* Clickable summary — opens detail panel */}
                      <button
                        onClick={() => openDetailPanel(lease)}
                        className="flex-1 text-left group min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <StateBadge state={lease.state} />
                          {prop && (
                            <span className="text-sm font-semibold text-gray-900 group-hover:text-[#1D9E75] transition-colors">{prop.legal_name}</span>
                          )}
                          <Eye size={12} className="text-gray-300 group-hover:text-[#1D9E75] transition-colors shrink-0" />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-2">
                          <div className="flex items-center gap-1">
                            <Calendar size={13} />
                            <span>{formatDate(lease.start_date)} — {formatDate(lease.end_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign size={13} />
                            <span>{formatCents(lease.monthly_rent_cents)}/mo</span>
                          </div>
                          {lease.unit_count && (
                            <div className="flex items-center gap-1">
                              <Users size={13} />
                              <span>{lease.unit_count} units</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 font-mono">ID: {lease.id.slice(0, 8)}…</p>
                      </button>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {lease.state === "draft" && (
                          <>
                            <button
                              onClick={() => openEditPanel(lease)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                            {deletingLeaseId === lease.id ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-red-600 font-medium">Delete?</span>
                                <button
                                  onClick={() => handleDeleteLease(lease.id)}
                                  disabled={deleteLoading}
                                  className="px-2 py-1 rounded text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                                >
                                  {deleteLoading ? <Loader2 size={10} className="animate-spin" /> : "Yes"}
                                </button>
                                <button
                                  onClick={() => setDeletingLeaseId(null)}
                                  className="px-2 py-1 rounded text-xs font-semibold text-gray-500 hover:bg-gray-100"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingLeaseId(lease.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-100 text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1"
                              >
                                <Trash2 size={11} /> Delete
                              </button>
                            )}
                            <ActionButton
                              label="Send for Signature"
                              loading={loading === "sign"}
                              onClick={() => handleLeaseAction(lease.id, "sign")}
                              color="#185FA5"
                            />
                          </>
                        )}
                        {lease.state === "signed" && (
                          <ActionButton
                            label="Activate"
                            loading={loading === "activate"}
                            onClick={() => handleLeaseAction(lease.id, "activate")}
                            color="#1D9E75"
                          />
                        )}
                        {lease.state === "active" && (
                          <>
                            <ActionButton
                              label="Check In"
                              loading={loading === "check-in"}
                              onClick={() => handleLeaseAction(lease.id, "check-in")}
                              color="#1D9E75"
                            />
                            <button
                              onClick={() => { setExtendLease(lease); setExtendDate(lease.end_date); }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Extend
                            </button>
                            <ActionButton
                              label="Check Out"
                              loading={loading === "check-out"}
                              onClick={() => handleLeaseAction(lease.id, "check-out")}
                              color="#BA7517"
                            />
                          </>
                        )}
                        {lease.state === "contract_sent" && (
                          <ActionButton
                            label="Mark Signed"
                            loading={loading === "sign"}
                            onClick={() => handleLeaseAction(lease.id, "sign")}
                            color="#6D28D9"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Create Lease Panel */}
      {showCreatePanel && selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeCreatePanel} />
          <div className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Panel header */}
            <div className="sticky top-0 z-10 bg-white px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between rounded-t-3xl sm:rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingLeaseId
                    ? createStep === 1 ? "Edit Lease" : "Reassign Travelers"
                    : createStep === 1 ? "Create Lease" : "Assign Travelers"}
                </h2>
                <p className="text-sm text-gray-500">
                  Step {createStep} of 2
                  {selectedProperty && ` · ${selectedProperty.legal_name} · ${selectedProperty.metro}`}
                </p>
              </div>
              <button onClick={closeCreatePanel} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={22} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
            {createStep === 1 ? (<>
              {/* Property summary */}
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                  {selectedProperty.photo_url ? (
                    <img src={selectedProperty.photo_url} alt={selectedProperty.legal_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 size={40} className="text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{selectedProperty.legal_name}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={12} />{selectedProperty.metro} · {selectedProperty.jurisdiction}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Rate floor</p>
                    <p className="font-bold text-lg" style={{ color: "#1D9E75" }}>{formatCents(selectedProperty.rate_floor_cents)}/mo</p>
                  </div>
                </div>
              </div>

              {/* Dates & rent */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={createStart}
                    onChange={(e) => setCreateStart(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={createEnd}
                    onChange={(e) => setCreateEnd(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Monthly Rent (USD)
                  <span className="ml-1 text-gray-400 font-normal">
                    — floor: {formatCents(selectedProperty.rate_floor_cents)}
                  </span>
                </label>
                <div className="relative">
                  <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={createRent}
                    onChange={(e) => setCreateRent(e.target.value)}
                    min={selectedProperty.rate_floor_cents / 100}
                    className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                    placeholder="Monthly rent"
                  />
                </div>
              </div>

              {/* Total summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Monthly rent × {unitCount} units</span>
                  <span className="font-semibold">
                    {createRent ? formatCents(parseFloat(createRent) * 100 * unitCount) : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-semibold">{createStart && createEnd ? `${createStart} to ${createEnd}` : "—"}</span>
                </div>
              </div>

              <button
                onClick={handleNextStep}
                disabled={!createRent || !createStart || !createEnd}
                className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#1D9E75" }}
              >
                Next: Assign Travelers <ArrowRight size={16} />
              </button>
            </>) : (<>
              {/* Step 2: Assign travelers to units */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">
                  Assign a traveler to each of the {unitCount} units in this lease.
                </p>
                {travelersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={22} className="animate-spin text-gray-400" />
                  </div>
                ) : travelers.length === 0 ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    No travelers found on your roster. Re-seed the platform to load demo travelers.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Array.from({ length: unitCount }, (_, i) => {
                      const overlap = assignments[i]
                        ? checkTravelerOverlap(assignments[i], leases, propertyMap, createStart, createEnd, editingLeaseId ?? undefined)
                        : null;
                      return (
                        <div key={i}>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-gray-500 w-14 shrink-0">Unit {i + 1}</span>
                            <select
                              value={assignments[i] || ""}
                              onChange={(e) => setAssignments((prev) => ({ ...prev, [i]: e.target.value }))}
                              className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white ${overlap ? "border-amber-300" : "border-gray-200"}`}
                            >
                              <option value="">— Select traveler —</option>
                              {travelers.map((t) => (
                                <option
                                  key={t.id}
                                  value={t.id}
                                  disabled={
                                    Object.entries(assignments).some(
                                      ([slot, id]) => id === t.id && Number(slot) !== i
                                    )
                                  }
                                >
                                  {t.full_name}{t.email ? ` · ${t.email}` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          {overlap && (
                            <div className="flex items-center gap-1 text-xs text-amber-600 mt-1 ml-[4.5rem]">
                              <TriangleAlert size={10} className="shrink-0" />
                              {overlap}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {createError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2.5 text-sm">
                  <AlertCircle size={15} />
                  {createError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setCreateStep(1)}
                  className="py-3 px-5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreateLease}
                  disabled={
                    creating ||
                    Object.keys(assignments).length < unitCount ||
                    Object.values(assignments).some((v) => !v) ||
                    Array.from({ length: unitCount }, (_, i) =>
                      assignments[i] ? checkTravelerOverlap(assignments[i], leases, propertyMap, createStart, createEnd, editingLeaseId ?? undefined) : null
                    ).some(Boolean)
                  }
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#1D9E75" }}
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  {creating ? "Saving..." : editingLeaseId ? "Save Changes" : "Create Lease"}
                </button>
              </div>
            </>)}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Traveler Modal */}
      {travelerFormOpen && (() => {
        const nameLocked = editingTraveler ? isTravelerNameLocked(editingTraveler.id, leases) : false;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeTravelerForm} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingTraveler ? "Edit Traveler" : "Add Traveler"}
                </h3>
                <button onClick={closeTravelerForm} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {nameLocked && editingTraveler && (
                <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                  <TriangleAlert size={13} className="shrink-0 mt-0.5" />
                  Name is locked — this traveler has a signed lease. Contact info can still be updated.
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={travelerFormData.full_name}
                    onChange={(e) => setTravelerFormData((p) => ({ ...p, full_name: e.target.value }))}
                    disabled={nameLocked}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400"
                    placeholder="e.g. Maria Santos"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={travelerFormData.email}
                    onChange={(e) => setTravelerFormData((p) => ({ ...p, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                    placeholder="e.g. maria.santos@hospital.org"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone (optional)</label>
                  <input
                    type="tel"
                    value={travelerFormData.phone}
                    onChange={(e) => setTravelerFormData((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                    placeholder="e.g. +1 615 555 0100"
                  />
                </div>
                {travelerFormError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2.5 text-sm">
                    <AlertCircle size={14} />
                    {travelerFormError}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeTravelerForm}
                  className="py-2.5 px-5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTraveler}
                  disabled={travelerFormLoading || !travelerFormData.full_name || !travelerFormData.email}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#1D9E75" }}
                >
                  {travelerFormLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                  {travelerFormLoading ? "Saving..." : editingTraveler ? "Save Changes" : "Add Traveler"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Traveler History Panel */}
      {historyTraveler && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setHistoryTraveler(null)} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between rounded-t-3xl sm:rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: "#1D9E75" }}
                  >
                    {historyTraveler.full_name.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{historyTraveler.full_name}</h2>
                </div>
                <p className="text-sm text-gray-500">Booking History</p>
              </div>
              <button onClick={() => setHistoryTraveler(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={22} />
              </button>
            </div>

            <div className="px-6 py-5">
              {historyLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={22} className="animate-spin text-gray-400" />
                </div>
              ) : historyLeases.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Clock size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No bookings yet</p>
                  <p className="text-xs mt-0.5">This traveler has not been assigned to any lease</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyLeases.map((hl) => (
                    <div key={hl.id} className="rounded-xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{hl.property_name || "Unknown Property"}</p>
                          {hl.property_metro && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} />{hl.property_metro}
                            </p>
                          )}
                        </div>
                        <StateBadge state={hl.state} />
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(hl.start_date)} — {formatDate(hl.end_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign size={10} />
                          {formatCents(hl.monthly_rent_cents)}/mo
                        </span>
                      </div>
                      {hl.unit_assignment && (
                        <p className="text-xs font-medium text-gray-400 mt-1.5">{hl.unit_assignment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Panel */}
      {viewingLease && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewingLease(null)} />
          <div className="relative bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between rounded-t-3xl sm:rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StateBadge state={viewingLease.state} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {propertyMap[viewingLease.property_id]?.legal_name || "Booking Details"}
                </h2>
                <p className="text-sm text-gray-500">
                  {[propertyMap[viewingLease.property_id]?.metro, propertyMap[viewingLease.property_id]?.jurisdiction]
                    .filter(Boolean).join(" · ")}
                </p>
              </div>
              <button onClick={() => setViewingLease(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={22} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Stay summary grid */}
              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Check-in</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(viewingLease.start_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Check-out</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(viewingLease.end_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Monthly Rate</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCents(viewingLease.monthly_rent_cents)}/mo</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Units</p>
                  <p className="text-sm font-semibold text-gray-900">{viewingLease.unit_count ?? 1}</p>
                </div>
              </div>

              {/* Traveler roster */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                  <Users size={14} style={{ color: "#1D9E75" }} />
                  Assigned Travelers
                </h3>
                {travelersLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 size={20} className="animate-spin text-gray-400" />
                  </div>
                ) : viewingLease.residents && viewingLease.residents.length > 0 ? (
                  <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {viewingLease.residents.map((r) => {
                      const traveler = travelers.find((t) => t.id === r.id);
                      return (
                        <div key={r.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ backgroundColor: "#1D9E75" }}
                            >
                              {traveler ? traveler.full_name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {traveler ? traveler.full_name : r.id.slice(0, 8) + "…"}
                              </p>
                              {traveler?.email && (
                                <p className="text-xs text-gray-400">{traveler.email}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                            {r.unit_assignment}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
                    No travelers assigned to this booking yet.
                  </p>
                )}
              </div>

              {/* Actions */}
              {["draft", "contract_sent", "signed", "active"].includes(viewingLease.state) && (() => {
                const loading = actionLoading[viewingLease.id];
                return (
                  <div className="pt-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Actions</p>
                    <div className="flex flex-wrap gap-2">
                      {viewingLease.state === "draft" && (
                        <>
                          <button
                            onClick={() => { setViewingLease(null); openEditPanel(viewingLease); }}
                            className="px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            onClick={() => handleLeaseAction(viewingLease.id, "sign")}
                            disabled={!!loading}
                            className="flex-1 px-3 py-2 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-60 hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: "#185FA5" }}
                          >
                            {loading === "sign" && <Loader2 size={13} className="animate-spin" />}
                            Send for Signature
                          </button>
                        </>
                      )}
                      {viewingLease.state === "contract_sent" && (
                        <button
                          onClick={() => handleLeaseAction(viewingLease.id, "sign")}
                          disabled={!!loading}
                          className="flex-1 px-3 py-2 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-60 hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: "#6D28D9" }}
                        >
                          {loading === "sign" && <Loader2 size={13} className="animate-spin" />}
                          Mark Signed
                        </button>
                      )}
                      {viewingLease.state === "signed" && (
                        <button
                          onClick={() => handleLeaseAction(viewingLease.id, "activate")}
                          disabled={!!loading}
                          className="flex-1 px-3 py-2 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-60 hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: "#1D9E75" }}
                        >
                          {loading === "activate" && <Loader2 size={13} className="animate-spin" />}
                          Activate
                        </button>
                      )}
                      {viewingLease.state === "active" && (
                        <>
                          <button
                            onClick={() => handleLeaseAction(viewingLease.id, "check-in")}
                            disabled={!!loading}
                            className="px-3 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 disabled:opacity-60 hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: "#1D9E75" }}
                          >
                            {loading === "check-in" && <Loader2 size={13} className="animate-spin" />}
                            Check In
                          </button>
                          <button
                            onClick={() => { setExtendLease(viewingLease); setExtendDate(viewingLease.end_date); }}
                            className="px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Extend
                          </button>
                          <button
                            onClick={() => handleLeaseAction(viewingLease.id, "check-out")}
                            disabled={!!loading}
                            className="px-3 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 disabled:opacity-60 hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: "#BA7517" }}
                          >
                            {loading === "check-out" && <Loader2 size={13} className="animate-spin" />}
                            Check Out
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Lease reference */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">Lease ID</span>
                <span className="text-xs font-mono text-gray-500 select-all">{viewingLease.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signing overlay */}
      {signingOverlay && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-10 flex flex-col items-center gap-5 max-w-xs w-full mx-4">
            <div className="relative w-16 h-16">
              <svg className="animate-spin w-16 h-16" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" stroke="#E5E7EB" strokeWidth="6" />
                <path d="M32 4a28 28 0 0 1 28 28" stroke="#1D9E75" strokeWidth="6" strokeLinecap="round" />
              </svg>
              <FileText size={22} className="absolute inset-0 m-auto text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-gray-900">Sending for Signature</p>
              <p className="text-sm text-gray-500 mt-1">Preparing contracts and notifying signatories…</p>
            </div>
          </div>
        </div>
      )}

      {/* Extend modal */}
      {extendLease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setExtendLease(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Extend Stay</h3>
              <button onClick={() => setExtendLease(null)} className="text-gray-400"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Current end: <span className="font-semibold text-gray-800">{formatDate(extendLease.end_date)}</span>
            </p>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">New End Date</label>
            <input
              type="date"
              value={extendDate}
              min={extendLease.end_date}
              onChange={(e) => setExtendDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 mb-4"
            />
            <button
              onClick={handleExtend}
              disabled={extending || !extendDate}
              className="w-full py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: "#1D9E75" }}
            >
              {extending ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              {extending ? "Extending..." : "Confirm Extension"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function isTravelerNameLocked(travelerId: string, allLeases: Lease[]): boolean {
  return allLeases.some(
    (l) => !["draft", "cancelled"].includes(l.state) && (l.residents ?? []).some((r) => r.id === travelerId)
  );
}

function isTravelerOnActiveLease(travelerId: string, allLeases: Lease[]): boolean {
  return allLeases.some(
    (l) => l.state === "active" && (l.residents ?? []).some((r) => r.id === travelerId)
  );
}

function getTravelerStatus(travelerId: string, allLeases: Lease[]): "active" | "upcoming" | null {
  if (isTravelerOnActiveLease(travelerId, allLeases)) return "active";
  if (
    allLeases.some(
      (l) => ["signed", "contract_sent"].includes(l.state) && (l.residents ?? []).some((r) => r.id === travelerId)
    )
  )
    return "upcoming";
  return null;
}

function checkTravelerOverlap(
  travelerId: string,
  allLeases: Lease[],
  propMap: Record<string, Property>,
  start: string,
  end: string,
  excludeLeaseId?: string
): string | null {
  if (!travelerId || !start || !end) return null;
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const conflict = allLeases.find(
    (l) =>
      l.id !== excludeLeaseId &&
      !["cancelled", "completed"].includes(l.state) &&
      (l.residents ?? []).some((r) => r.id === travelerId) &&
      new Date(l.start_date + "T00:00:00") < e &&
      new Date(l.end_date + "T00:00:00") > s
  );
  if (!conflict) return null;
  const prop = propMap[conflict.property_id];
  return `Already booked at ${prop?.legal_name ?? "another property"} (${formatDate(conflict.start_date)}–${formatDate(conflict.end_date)})`;
}

function ActionButton({
  label,
  loading,
  onClick,
  color,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-60 hover:opacity-90 transition-opacity"
      style={{ backgroundColor: color }}
    >
      {loading && <Loader2 size={11} className="animate-spin" />}
      {label}
    </button>
  );
}
