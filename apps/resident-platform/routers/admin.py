import uuid
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from database import get_db
from models import Buyer, Resident, NetworkProperty, Lease, LeaseEvent, Contract

logger = logging.getLogger(__name__)
router = APIRouter(tags=["admin"])


@router.post("/admin/seed")
async def seed_data(db: AsyncSession = Depends(get_db)):
    """Create seed data for demo."""

    # ── Buyers ─────────────────────────────────────────────────────────────────
    buyers = [
        {
            "id": "a0000000-0000-0000-0000-000000000001",
            "legal_name": "Stanford Healthcare Travel Staffing",
            "buyer_type": "staffing_agency",
            "nma_status": "executed",
            "take_rate_pct": 5.50,
        },
        {
            "id": "a0000000-0000-0000-0000-000000000002",
            "legal_name": "Accenture Federal Services",
            "buyer_type": "project_workforce",
            "nma_status": "executed",
            "take_rate_pct": 4.75,
        },
        {
            "id": "a0000000-0000-0000-0000-000000000003",
            "legal_name": "Cigna Healthcare Mobility",
            "buyer_type": "corporate_mobility",
            "nma_status": "executed",
            "take_rate_pct": 6.00,
        },
    ]

    for b in buyers:
        await db.execute(
            text("""
                INSERT INTO buyers (id, legal_name, buyer_type, nma_status, take_rate_pct, mews_company_links)
                VALUES (CAST(:id AS uuid), :legal_name, :buyer_type, :nma_status, :take_rate_pct, '{}')
                ON CONFLICT (id) DO NOTHING
            """),
            b,
        )

    # ── Residents ──────────────────────────────────────────────────────────────
    residents = [
        {"id": "b0000000-0000-0000-0000-000000000001", "full_name": "Maria Santos", "email": "maria.santos@demo.com"},
        {"id": "b0000000-0000-0000-0000-000000000002", "full_name": "James Park", "email": "james.park@demo.com"},
        {"id": "b0000000-0000-0000-0000-000000000003", "full_name": "Aisha Mohammed", "email": "aisha.mohammed@demo.com"},
        {"id": "b0000000-0000-0000-0000-000000000004", "full_name": "Carlos Reyes", "email": "carlos.reyes@demo.com"},
        {"id": "b0000000-0000-0000-0000-000000000005", "full_name": "Jennifer Liu", "email": "jennifer.liu@demo.com"},
        {"id": "b0000000-0000-0000-0000-000000000006", "full_name": "Devon Williams", "email": "devon.williams@demo.com"},
    ]

    for r in residents:
        await db.execute(
            text("""
                INSERT INTO residents (id, full_name, email, mews_customer_links)
                VALUES (CAST(:id AS uuid), :full_name, :email, '{}')
                ON CONFLICT (id) DO NOTHING
            """),
            r,
        )

    # ── Network Properties ──────────────────────────────────────────────────────
    properties = [
        {
            "id": "c0000000-0000-0000-0000-000000000001",
            "mews_enterprise_id": "9b8e7a6d-1001-4000-a000-000000000001",
            "legal_name": "Revisn Nashville",
            "metro": "Nashville",
            "jurisdiction": "US-TN",
            "accepts_network_bookings": True,
            "unit_count": 45,
            "npa_status": "active",
            "rate_floor_cents": 250000,
            "photo_url": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
        },
        {
            "id": "c0000000-0000-0000-0000-000000000002",
            "mews_enterprise_id": "9b8e7a6d-1001-4000-a000-000000000003",
            "legal_name": "Kasa Dallas Uptown",
            "metro": "Dallas",
            "jurisdiction": "US-TX",
            "accepts_network_bookings": True,
            "unit_count": 62,
            "npa_status": "active",
            "rate_floor_cents": 280000,
            "photo_url": "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800",
        },
        {
            "id": "c0000000-0000-0000-0000-000000000003",
            "mews_enterprise_id": "9b8e7a6d-1001-4000-a000-000000000005",
            "legal_name": "Reside NC Raleigh",
            "metro": "Raleigh",
            "jurisdiction": "US-NC",
            "accepts_network_bookings": True,
            "unit_count": 28,
            "npa_status": "active",
            "rate_floor_cents": 220000,
            "photo_url": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800",
        },
        {
            "id": "c0000000-0000-0000-0000-000000000004",
            "mews_enterprise_id": "9b8e7a6d-1001-4000-a000-000000000007",
            "legal_name": "Sonder Phoenix",
            "metro": "Phoenix",
            "jurisdiction": "US-AZ",
            "accepts_network_bookings": True,
            "unit_count": 85,
            "npa_status": "active",
            "rate_floor_cents": 195000,
            "photo_url": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
        },
        {
            "id": "c0000000-0000-0000-0000-000000000005",
            "mews_enterprise_id": "9b8e7a6d-1001-4000-a000-000000000009",
            "legal_name": "Kasa Boston",
            "metro": "Boston",
            "jurisdiction": "US-MA",
            "accepts_network_bookings": True,
            "unit_count": 33,
            "npa_status": "active",
            "rate_floor_cents": 320000,
            "photo_url": "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800",
        },
    ]

    for p in properties:
        await db.execute(
            text("""
                INSERT INTO network_properties (
                    id, mews_enterprise_id, legal_name, metro, jurisdiction,
                    accepts_network_bookings, unit_count, npa_status, rate_floor_cents, photo_url
                )
                VALUES (
                    CAST(:id AS uuid), CAST(:mews_enterprise_id AS uuid), :legal_name, :metro, :jurisdiction,
                    :accepts_network_bookings, :unit_count, :npa_status, :rate_floor_cents, :photo_url
                )
                ON CONFLICT (id) DO NOTHING
            """),
            p,
        )

    await db.commit()

    return {
        "status": "ok",
        "seeded": {
            "buyers": len(buyers),
            "residents": len(residents),
            "network_properties": len(properties),
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
