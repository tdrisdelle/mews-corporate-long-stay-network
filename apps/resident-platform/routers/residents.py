import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Resident, Lease, LeaseResident

router = APIRouter(tags=["residents"])


def _resident_to_dict(r: Resident) -> dict:
    return {
        "id": str(r.id),
        "full_name": r.full_name,
        "email": r.email,
        "phone": r.phone,
        "employment_context": r.employment_context,
        "home_jurisdiction": r.home_jurisdiction,
        "mews_customer_links": r.mews_customer_links,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _lease_to_dict(l: Lease) -> dict:
    return {
        "id": str(l.id),
        "buyer_id": str(l.buyer_id) if l.buyer_id else None,
        "property_id": str(l.property_id),
        "state": l.state,
        "start_date": l.start_date.isoformat() if l.start_date else None,
        "end_date": l.end_date.isoformat() if l.end_date else None,
        "unit_count": l.unit_count,
        "monthly_rent_cents": l.monthly_rent_cents,
        "deposit_cents": l.deposit_cents,
        "jurisdiction": l.jurisdiction,
        "mews_reservation_group_id": str(l.mews_reservation_group_id) if l.mews_reservation_group_id else None,
        "mews_payment_plan_id": str(l.mews_payment_plan_id) if l.mews_payment_plan_id else None,
        "network_take_rate_pct": float(l.network_take_rate_pct) if l.network_take_rate_pct is not None else None,
        "created_at": l.created_at.isoformat() if l.created_at else None,
        "updated_at": l.updated_at.isoformat() if l.updated_at else None,
    }


@router.get("/residents/{resident_id}")
async def get_resident(resident_id: str, db: AsyncSession = Depends(get_db)):
    try:
        rid = uuid.UUID(resident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid resident ID")
    result = await db.execute(select(Resident).where(Resident.id == rid))
    resident = result.scalar_one_or_none()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    return _resident_to_dict(resident)


@router.get("/residents/{resident_id}/leases")
async def get_resident_leases(resident_id: str, db: AsyncSession = Depends(get_db)):
    try:
        rid = uuid.UUID(resident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid resident ID")
    # Check resident exists
    result = await db.execute(select(Resident).where(Resident.id == rid))
    resident = result.scalar_one_or_none()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    # Get leases via join
    stmt = (
        select(Lease)
        .join(LeaseResident, Lease.id == LeaseResident.lease_id)
        .where(LeaseResident.resident_id == rid)
    )
    result = await db.execute(stmt)
    leases = result.scalars().all()
    return [_lease_to_dict(l) for l in leases]
