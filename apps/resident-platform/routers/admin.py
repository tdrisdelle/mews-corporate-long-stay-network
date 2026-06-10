import json
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from database import get_db
from models import Buyer, Resident, NetworkProperty, Lease, LeaseEvent, Contract
from contracts.templates import get_template
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(tags=["admin"])


@router.post("/admin/seed")
async def seed_data(db: AsyncSession = Depends(get_db)):
    """Create seed data for demo."""

    STANFORD = "a0000000-0000-0000-0000-000000000001"
    ACCENTURE = "a0000000-0000-0000-0000-000000000002"
    CIGNA = "a0000000-0000-0000-0000-000000000003"

    NASHVILLE = "c0000000-0000-0000-0000-000000000001"
    DALLAS = "c0000000-0000-0000-0000-000000000002"
    RALEIGH = "c0000000-0000-0000-0000-000000000003"
    PHOENIX = "c0000000-0000-0000-0000-000000000004"
    BOSTON = "c0000000-0000-0000-0000-000000000005"

    # ── Buyers ─────────────────────────────────────────────────────────────────
    buyers = [
        {"id": STANFORD,  "legal_name": "Stanford Healthcare Travel Staffing", "buyer_type": "staffing_agency",    "nma_status": "executed", "take_rate_pct": 5.50},
        {"id": ACCENTURE, "legal_name": "Accenture Federal Services",          "buyer_type": "project_workforce",  "nma_status": "executed", "take_rate_pct": 4.75},
        {"id": CIGNA,     "legal_name": "Cigna Healthcare Mobility",           "buyer_type": "corporate_mobility", "nma_status": "executed", "take_rate_pct": 6.00},
    ]
    for b in buyers:
        await db.execute(text("""
            INSERT INTO buyers (id, legal_name, buyer_type, nma_status, take_rate_pct, mews_company_links)
            VALUES (CAST(:id AS uuid), :legal_name, :buyer_type, :nma_status, :take_rate_pct, '{}')
            ON CONFLICT (id) DO NOTHING
        """), b)

    # ── Residents ──────────────────────────────────────────────────────────────
    residents = [
        # Stanford nurses
        {"id": "b0000000-0000-0000-0000-000000000001", "full_name": "Maria Santos",    "email": "maria.santos@demo.com",    "buyer_id": STANFORD},
        {"id": "b0000000-0000-0000-0000-000000000002", "full_name": "James Park",      "email": "james.park@demo.com",      "buyer_id": STANFORD},
        {"id": "b0000000-0000-0000-0000-000000000003", "full_name": "Aisha Mohammed",  "email": "aisha.mohammed@demo.com",  "buyer_id": STANFORD},
        {"id": "b0000000-0000-0000-0000-000000000004", "full_name": "Carlos Reyes",    "email": "carlos.reyes@demo.com",    "buyer_id": STANFORD},
        {"id": "b0000000-0000-0000-0000-000000000005", "full_name": "Jennifer Liu",    "email": "jennifer.liu@demo.com",    "buyer_id": STANFORD},
        {"id": "b0000000-0000-0000-0000-000000000006", "full_name": "Devon Williams",  "email": "devon.williams@demo.com",  "buyer_id": STANFORD},
        # Accenture consultants
        {"id": "b0000000-0000-0000-0000-000000000007", "full_name": "Robert Chen",     "email": "robert.chen@demo.com",     "buyer_id": ACCENTURE},
        {"id": "b0000000-0000-0000-0000-000000000008", "full_name": "Sarah Thompson",  "email": "sarah.thompson@demo.com",  "buyer_id": ACCENTURE},
        {"id": "b0000000-0000-0000-0000-000000000009", "full_name": "Michael Torres",  "email": "michael.torres@demo.com",  "buyer_id": ACCENTURE},
        # Cigna relocators
        {"id": "b0000000-0000-0000-0000-000000000010", "full_name": "Lisa Anderson",   "email": "lisa.anderson@demo.com",   "buyer_id": CIGNA},
        {"id": "b0000000-0000-0000-0000-000000000011", "full_name": "David Kim",       "email": "david.kim@demo.com",       "buyer_id": CIGNA},
        {"id": "b0000000-0000-0000-0000-000000000012", "full_name": "Nicole Brown",    "email": "nicole.brown@demo.com",    "buyer_id": CIGNA},
    ]
    for r in residents:
        await db.execute(text("""
            INSERT INTO residents (id, buyer_id, full_name, email, mews_customer_links)
            VALUES (CAST(:id AS uuid), CAST(:buyer_id AS uuid), :full_name, :email, '{}')
            ON CONFLICT (id) DO UPDATE SET buyer_id = CAST(:buyer_id AS uuid)
        """), r)

    # ── Network Properties ─────────────────────────────────────────────────────
    properties = [
        {
            "id": NASHVILLE, "mews_enterprise_id": "9b8e7a6d-1001-4000-a000-000000000001",
            "legal_name": "Revisn Nashville",   "metro": "Nashville", "jurisdiction": "US-TN",
            "accepts_network_bookings": True, "unit_count": 45, "npa_status": "active",
            "rate_floor_cents": 250000, "photo_url": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
        },
        {
            "id": DALLAS, "mews_enterprise_id": "9b8e7a6d-1001-4000-a000-000000000003",
            "legal_name": "Kasa Dallas Uptown", "metro": "Dallas",    "jurisdiction": "US-TX",
            "accepts_network_bookings": True, "unit_count": 62, "npa_status": "active",
            "rate_floor_cents": 280000, "photo_url": "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800",
        },
        {
            "id": RALEIGH, "mews_enterprise_id": "9b8e7a6d-1001-4000-a000-000000000005",
            "legal_name": "Reside NC Raleigh",  "metro": "Raleigh",   "jurisdiction": "US-NC",
            "accepts_network_bookings": True, "unit_count": 28, "npa_status": "active",
            "rate_floor_cents": 220000, "photo_url": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800",
        },
        {
            "id": PHOENIX, "mews_enterprise_id": "9b8e7a6d-1001-4000-a000-000000000007",
            "legal_name": "Sonder Phoenix",     "metro": "Phoenix",   "jurisdiction": "US-AZ",
            "accepts_network_bookings": True, "unit_count": 85, "npa_status": "active",
            "rate_floor_cents": 195000, "photo_url": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
        },
        {
            "id": BOSTON, "mews_enterprise_id": "9b8e7a6d-1001-4000-a000-000000000009",
            "legal_name": "Kasa Boston",        "metro": "Boston",    "jurisdiction": "US-MA",
            "accepts_network_bookings": True, "unit_count": 33, "npa_status": "active",
            "rate_floor_cents": 320000, "photo_url": "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800",
        },
    ]
    for p in properties:
        await db.execute(text("""
            INSERT INTO network_properties (
                id, mews_enterprise_id, legal_name, metro, jurisdiction,
                accepts_network_bookings, unit_count, npa_status, rate_floor_cents, photo_url
            )
            VALUES (
                CAST(:id AS uuid), CAST(:mews_enterprise_id AS uuid), :legal_name, :metro, :jurisdiction,
                :accepts_network_bookings, :unit_count, :npa_status, :rate_floor_cents, :photo_url
            )
            ON CONFLICT (id) DO NOTHING
        """), p)

    # ── Historical Leases ──────────────────────────────────────────────────────
    # Lookup tables used when building contracts
    prop_meta = {
        NASHVILLE: {"legal_name": "Revisn Nashville",   "jurisdiction": "US-TN"},
        DALLAS:    {"legal_name": "Kasa Dallas Uptown", "jurisdiction": "US-TX"},
        RALEIGH:   {"legal_name": "Reside NC Raleigh",  "jurisdiction": "US-NC"},
        PHOENIX:   {"legal_name": "Sonder Phoenix",     "jurisdiction": "US-AZ"},
        BOSTON:    {"legal_name": "Kasa Boston",        "jurisdiction": "US-MA"},
    }
    buyer_meta = {
        STANFORD:  {"legal_name": "Stanford Healthcare Travel Staffing", "take_rate": 5.50},
        ACCENTURE: {"legal_name": "Accenture Federal Services",          "take_rate": 4.75},
        CIGNA:     {"legal_name": "Cigna Healthcare Mobility",           "take_rate": 6.00},
    }

    # Each entry: id, buyer_id, property_id, state, start, end, unit_count, rent,
    #             residents [(resident_id, unit_assignment), ...],
    #             events [(event_type, actor_type, occurred_at), ...],
    #             signed_at (ISO timestamp, required for all non-draft leases)
    hist_leases = [
        # ── Nashville — 2 completed, 1 active ─────────────────────────────────
        {
            "id": "d0000000-0000-0000-0000-000000000001",
            "buyer_id": STANFORD, "property_id": NASHVILLE,
            "state": "completed", "start": "2024-01-15", "end": "2024-04-15",
            "unit_count": 2, "rent": 530000,
            "residents": [
                ("b0000000-0000-0000-0000-000000000001", "4A"),  # Maria Santos
                ("b0000000-0000-0000-0000-000000000002", "4B"),  # James Park
            ],
            "signed_at": "2023-12-20T10:00:00+00:00",
            "events": [
                ("lease_created",  "system",   "2023-12-01T10:00:00+00:00"),
                ("lease_signed",   "buyer",    "2023-12-20T10:00:00+00:00"),
                ("lease_activated","system",   "2024-01-10T10:00:00+00:00"),
                ("checked_out",    "operator", "2024-04-16T11:00:00+00:00"),
            ],
        },
        {
            "id": "d0000000-0000-0000-0000-000000000002",
            "buyer_id": ACCENTURE, "property_id": NASHVILLE,
            "state": "completed", "start": "2024-07-01", "end": "2024-10-01",
            "unit_count": 1, "rent": 285000,
            "residents": [
                ("b0000000-0000-0000-0000-000000000007", "7C"),  # Robert Chen
            ],
            "signed_at": "2024-06-05T10:00:00+00:00",
            "events": [
                ("lease_created",  "system",   "2024-05-20T10:00:00+00:00"),
                ("lease_signed",   "buyer",    "2024-06-05T10:00:00+00:00"),
                ("lease_activated","system",   "2024-06-28T10:00:00+00:00"),
                ("checked_out",    "operator", "2024-10-02T11:00:00+00:00"),
            ],
        },
        {
            "id": "d0000000-0000-0000-0000-000000000003",
            "buyer_id": STANFORD, "property_id": NASHVILLE,
            "state": "active", "start": "2026-01-15", "end": "2026-07-15",
            "unit_count": 2, "rent": 560000,
            "residents": [
                ("b0000000-0000-0000-0000-000000000003", "2A"),  # Aisha Mohammed
                ("b0000000-0000-0000-0000-000000000004", "2B"),  # Carlos Reyes
            ],
            "signed_at": "2025-12-15T10:00:00+00:00",
            "events": [
                ("lease_created",  "system", "2025-12-01T10:00:00+00:00"),
                ("lease_signed",   "buyer",  "2025-12-15T10:00:00+00:00"),
                ("lease_activated","system", "2026-01-12T10:00:00+00:00"),
            ],
        },
        # ── Dallas — 3 completed ───────────────────────────────────────────────
        {
            "id": "d0000000-0000-0000-0000-000000000004",
            "buyer_id": CIGNA, "property_id": DALLAS,
            "state": "completed", "start": "2024-02-01", "end": "2024-05-31",
            "unit_count": 2, "rent": 595000,
            "residents": [
                ("b0000000-0000-0000-0000-000000000010", "12A"),  # Lisa Anderson
                ("b0000000-0000-0000-0000-000000000011", "12B"),  # David Kim
            ],
            "signed_at": "2024-01-12T10:00:00+00:00",
            "events": [
                ("lease_created",  "system",   "2024-01-02T10:00:00+00:00"),
                ("lease_signed",   "buyer",    "2024-01-12T10:00:00+00:00"),
                ("lease_activated","system",   "2024-01-29T10:00:00+00:00"),
                ("checked_out",    "operator", "2024-06-01T11:00:00+00:00"),
            ],
        },
        {
            "id": "d0000000-0000-0000-0000-000000000005",
            "buyer_id": STANFORD, "property_id": DALLAS,
            "state": "completed", "start": "2024-09-01", "end": "2024-12-31",
            "unit_count": 1, "rent": 295000,
            "residents": [
                ("b0000000-0000-0000-0000-000000000005", "8D"),  # Jennifer Liu
            ],
            "signed_at": "2024-07-30T10:00:00+00:00",
            "events": [
                ("lease_created",  "system",   "2024-07-15T10:00:00+00:00"),
                ("lease_signed",   "buyer",    "2024-07-30T10:00:00+00:00"),
                ("lease_activated","system",   "2024-08-28T10:00:00+00:00"),
                ("checked_out",    "operator", "2025-01-01T11:00:00+00:00"),
            ],
        },
        {
            "id": "d0000000-0000-0000-0000-000000000006",
            "buyer_id": ACCENTURE, "property_id": DALLAS,
            "state": "completed", "start": "2025-03-01", "end": "2025-07-31",
            "unit_count": 2, "rent": 610000,
            "residents": [
                ("b0000000-0000-0000-0000-000000000008", "15A"),  # Sarah Thompson
                ("b0000000-0000-0000-0000-000000000009", "15B"),  # Michael Torres
            ],
            "signed_at": "2025-02-01T10:00:00+00:00",
            "events": [
                ("lease_created",  "system",   "2025-01-15T10:00:00+00:00"),
                ("lease_signed",   "buyer",    "2025-02-01T10:00:00+00:00"),
                ("lease_activated","system",   "2025-02-26T10:00:00+00:00"),
                ("checked_out",    "operator", "2025-08-01T11:00:00+00:00"),
            ],
        },
        # ── Raleigh — 1 completed, 1 active ───────────────────────────────────
        {
            "id": "d0000000-0000-0000-0000-000000000007",
            "buyer_id": STANFORD, "property_id": RALEIGH,
            "state": "completed", "start": "2024-03-01", "end": "2024-07-31",
            "unit_count": 3, "rent": 720000,
            "residents": [
                ("b0000000-0000-0000-0000-000000000006", "3A"),  # Devon Williams
                ("b0000000-0000-0000-0000-000000000002", "3B"),  # James Park
                ("b0000000-0000-0000-0000-000000000001", "3C"),  # Maria Santos
            ],
            "signed_at": "2024-02-05T10:00:00+00:00",
            "events": [
                ("lease_created",  "system",   "2024-01-20T10:00:00+00:00"),
                ("lease_signed",   "buyer",    "2024-02-05T10:00:00+00:00"),
                ("lease_activated","system",   "2024-02-27T10:00:00+00:00"),
                ("checked_out",    "operator", "2024-08-01T11:00:00+00:00"),
            ],
        },
        {
            "id": "d0000000-0000-0000-0000-000000000008",
            "buyer_id": CIGNA, "property_id": RALEIGH,
            "state": "active", "start": "2026-04-01", "end": "2026-08-31",
            "unit_count": 1, "rent": 235000,
            "residents": [
                ("b0000000-0000-0000-0000-000000000012", "6F"),  # Nicole Brown
            ],
            "signed_at": "2026-03-01T10:00:00+00:00",
            "events": [
                ("lease_created",  "system", "2026-02-15T10:00:00+00:00"),
                ("lease_signed",   "buyer",  "2026-03-01T10:00:00+00:00"),
                ("lease_activated","system", "2026-03-28T10:00:00+00:00"),
            ],
        },
        # ── Phoenix — 2 completed, 1 active ───────────────────────────────────
        {
            "id": "d0000000-0000-0000-0000-000000000009",
            "buyer_id": ACCENTURE, "property_id": PHOENIX,
            "state": "completed", "start": "2024-04-01", "end": "2024-07-31",
            "unit_count": 2, "rent": 420000,
            "residents": [
                ("b0000000-0000-0000-0000-000000000007", "201"),  # Robert Chen
                ("b0000000-0000-0000-0000-000000000008", "202"),  # Sarah Thompson
            ],
            "signed_at": "2024-03-01T10:00:00+00:00",
            "events": [
                ("lease_created",  "system",   "2024-02-15T10:00:00+00:00"),
                ("lease_signed",   "buyer",    "2024-03-01T10:00:00+00:00"),
                ("lease_activated","system",   "2024-03-29T10:00:00+00:00"),
                ("checked_out",    "operator", "2024-08-01T11:00:00+00:00"),
            ],
        },
        {
            "id": "d0000000-0000-0000-0000-000000000010",
            "buyer_id": STANFORD, "property_id": PHOENIX,
            "state": "completed", "start": "2024-11-01", "end": "2025-03-31",
            "unit_count": 1, "rent": 205000,
            "residents": [
                ("b0000000-0000-0000-0000-000000000004", "315"),  # Carlos Reyes
            ],
            "signed_at": "2024-10-01T10:00:00+00:00",
            "events": [
                ("lease_created",  "system",   "2024-09-15T10:00:00+00:00"),
                ("lease_signed",   "buyer",    "2024-10-01T10:00:00+00:00"),
                ("lease_activated","system",   "2024-10-29T10:00:00+00:00"),
                ("checked_out",    "operator", "2025-04-01T11:00:00+00:00"),
            ],
        },
        {
            "id": "d0000000-0000-0000-0000-000000000011",
            "buyer_id": CIGNA, "property_id": PHOENIX,
            "state": "active", "start": "2026-02-01", "end": "2026-08-31",
            "unit_count": 2, "rent": 430000,
            "residents": [
                ("b0000000-0000-0000-0000-000000000010", "108"),  # Lisa Anderson
                ("b0000000-0000-0000-0000-000000000011", "109"),  # David Kim
            ],
            "signed_at": "2026-01-05T10:00:00+00:00",
            "events": [
                ("lease_created",  "system", "2025-12-15T10:00:00+00:00"),
                ("lease_signed",   "buyer",  "2026-01-05T10:00:00+00:00"),
                ("lease_activated","system", "2026-01-29T10:00:00+00:00"),
            ],
        },
        # ── Boston — 2 completed ───────────────────────────────────────────────
        {
            "id": "d0000000-0000-0000-0000-000000000012",
            "buyer_id": ACCENTURE, "property_id": BOSTON,
            "state": "completed", "start": "2024-05-01", "end": "2024-11-30",
            "unit_count": 3, "rent": 1050000,
            "residents": [
                ("b0000000-0000-0000-0000-000000000009", "5A"),  # Michael Torres
                ("b0000000-0000-0000-0000-000000000008", "5B"),  # Sarah Thompson
                ("b0000000-0000-0000-0000-000000000007", "5C"),  # Robert Chen
            ],
            "signed_at": "2024-04-01T10:00:00+00:00",
            "events": [
                ("lease_created",  "system",   "2024-03-15T10:00:00+00:00"),
                ("lease_signed",   "buyer",    "2024-04-01T10:00:00+00:00"),
                ("lease_activated","system",   "2024-04-28T10:00:00+00:00"),
                ("checked_out",    "operator", "2024-12-01T11:00:00+00:00"),
            ],
        },
        {
            "id": "d0000000-0000-0000-0000-000000000013",
            "buyer_id": STANFORD, "property_id": BOSTON,
            "state": "completed", "start": "2025-01-01", "end": "2025-06-30",
            "unit_count": 2, "rent": 680000,
            "residents": [
                ("b0000000-0000-0000-0000-000000000003", "9D"),  # Aisha Mohammed
                ("b0000000-0000-0000-0000-000000000005", "9E"),  # Jennifer Liu
            ],
            "signed_at": "2024-12-01T10:00:00+00:00",
            "events": [
                ("lease_created",  "system",   "2024-11-15T10:00:00+00:00"),
                ("lease_signed",   "buyer",    "2024-12-01T10:00:00+00:00"),
                ("lease_activated","system",   "2024-12-28T10:00:00+00:00"),
                ("checked_out",    "operator", "2025-07-01T11:00:00+00:00"),
            ],
        },
    ]

    for i, ld in enumerate(hist_leases, 1):
        pid = ld["property_id"]
        bid = ld["buyer_id"]
        jur = prop_meta[pid]["jurisdiction"]

        # Lease
        await db.execute(text("""
            INSERT INTO leases (id, buyer_id, property_id, state, start_date, end_date,
                                unit_count, monthly_rent_cents, jurisdiction, network_take_rate_pct)
            VALUES (
                CAST(:id AS uuid), CAST(:buyer_id AS uuid), CAST(:property_id AS uuid),
                :state, CAST(:start AS date), CAST(:end AS date),
                :unit_count, :rent, :jurisdiction, :take_rate
            )
            ON CONFLICT (id) DO NOTHING
        """), {
            "id": ld["id"], "buyer_id": bid, "property_id": pid,
            "state": ld["state"], "start": ld["start"], "end": ld["end"],
            "unit_count": ld["unit_count"], "rent": ld["rent"],
            "jurisdiction": jur, "take_rate": buyer_meta[bid]["take_rate"],
        })

        # LeaseResidents
        for res_id, unit_asgn in ld["residents"]:
            await db.execute(text("""
                INSERT INTO lease_residents (lease_id, resident_id, unit_assignment)
                VALUES (CAST(:lease_id AS uuid), CAST(:res_id AS uuid), :unit_asgn)
                ON CONFLICT (lease_id, resident_id) DO NOTHING
            """), {"lease_id": ld["id"], "res_id": res_id, "unit_asgn": unit_asgn})

        # Contract
        template = get_template(jur)
        body = {
            "clauses": template["clauses"],
            "jurisdiction_specific": template["jurisdiction_specific"],
            "lease_details": {
                "start_date": ld["start"],
                "end_date": ld["end"],
                "monthly_rent_cents": ld["rent"],
                "unit_count": ld["unit_count"],
            },
        }
        parties = {
            "property": {"id": pid, "legal_name": prop_meta[pid]["legal_name"], "jurisdiction": jur},
            "buyer": {"id": bid, "legal_name": buyer_meta[bid]["legal_name"]},
            "residents": [{"id": r[0], "unit_assignment": r[1]} for r in ld["residents"]],
        }
        await db.execute(text("""
            INSERT INTO contracts (id, lease_id, contract_type, jurisdiction, template_name, body, parties, signed_at)
            VALUES (
                CAST(:id AS uuid), CAST(:lease_id AS uuid),
                :contract_type, :jurisdiction, :template_name,
                CAST(:body AS jsonb), CAST(:parties AS jsonb),
                CAST(:signed_at AS timestamptz)
            )
            ON CONFLICT (id) DO NOTHING
        """), {
            "id": f"f0000000-0000-0000-0000-{i:012x}",
            "lease_id": ld["id"],
            "contract_type": "individual_lease",
            "jurisdiction": jur,
            "template_name": template["template_id"],
            "body": json.dumps(body),
            "parties": json.dumps(parties),
            "signed_at": ld["signed_at"],
        })

        # LeaseEvents
        for j, (event_type, actor_type, occurred_at) in enumerate(ld["events"], 1):
            await db.execute(text("""
                INSERT INTO lease_events (id, lease_id, event_type, actor_type, occurred_at)
                VALUES (
                    CAST(:id AS uuid), CAST(:lease_id AS uuid),
                    :event_type, :actor_type,
                    CAST(:occurred_at AS timestamptz)
                )
                ON CONFLICT (id) DO NOTHING
            """), {
                "id": f"{i:04x}{j:04x}-0000-0000-0000-000000000000",
                "lease_id": ld["id"],
                "event_type": event_type,
                "actor_type": actor_type,
                "occurred_at": occurred_at,
            })

    await db.commit()

    active_count = sum(1 for l in hist_leases if l["state"] == "active")
    completed_count = sum(1 for l in hist_leases if l["state"] == "completed")

    return {
        "status": "ok",
        "seeded": {
            "buyers": len(buyers),
            "residents": len(residents),
            "network_properties": len(properties),
            "historical_leases": len(hist_leases),
            "active_leases": active_count,
            "completed_leases": completed_count,
        },
    }


@router.get("/admin/lifecycle/{lease_id}")
async def get_lease_lifecycle(lease_id: str, db: AsyncSession = Depends(get_db)):
    try:
        lid = uuid.UUID(lease_id)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid lease ID")

    from fastapi import HTTPException
    result = await db.execute(select(Lease).where(Lease.id == lid))
    lease = result.scalar_one_or_none()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")

    events_result = await db.execute(
        select(LeaseEvent).where(LeaseEvent.lease_id == lid).order_by(LeaseEvent.occurred_at)
    )
    events = events_result.scalars().all()

    contracts_result = await db.execute(
        select(Contract).where(Contract.lease_id == lid)
    )
    contracts = contracts_result.scalars().all()

    return {
        "lease": {
            "id": str(lease.id),
            "buyer_id": str(lease.buyer_id) if lease.buyer_id else None,
            "property_id": str(lease.property_id),
            "state": lease.state,
            "start_date": lease.start_date.isoformat() if lease.start_date else None,
            "end_date": lease.end_date.isoformat() if lease.end_date else None,
            "unit_count": lease.unit_count,
            "monthly_rent_cents": lease.monthly_rent_cents,
            "jurisdiction": lease.jurisdiction,
            "mews_reservation_group_id": str(lease.mews_reservation_group_id) if lease.mews_reservation_group_id else None,
            "mews_payment_plan_id": str(lease.mews_payment_plan_id) if lease.mews_payment_plan_id else None,
        },
        "events": [
            {
                "id": str(e.id),
                "event_type": e.event_type,
                "actor_type": e.actor_type,
                "metadata": e.event_metadata,
                "occurred_at": e.occurred_at.isoformat() if e.occurred_at else None,
            }
            for e in events
        ],
        "contracts": [
            {
                "id": str(c.id),
                "contract_type": c.contract_type,
                "jurisdiction": c.jurisdiction,
                "template_name": c.template_name,
                "signed_at": c.signed_at.isoformat() if c.signed_at else None,
            }
            for c in contracts
        ],
    }
