import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sa_delete
from pydantic import BaseModel
from database import get_db
from models import Buyer, Resident, Lease, LeaseResident, NetworkProperty

router = APIRouter(tags=["buyers"])


class TravelerBody(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None


def _buyer_to_dict(b: Buyer) -> dict:
    return {
        "id": str(b.id),
        "legal_name": b.legal_name,
        "buyer_type": b.buyer_type,
        "billing_address": b.billing_address,
        "primary_contact": b.primary_contact,
        "nma_status": b.nma_status,
        "nma_terms": b.nma_terms,
        "take_rate_pct": float(b.take_rate_pct) if b.take_rate_pct is not None else None,
        "mews_company_links": b.mews_company_links,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


def _traveler_to_dict(t: Resident) -> dict:
    return {"id": str(t.id), "full_name": t.full_name, "email": t.email, "phone": t.phone}


@router.get("/buyers/{buyer_id}")
async def get_buyer(buyer_id: str, db: AsyncSession = Depends(get_db)):
    try:
        bid = uuid.UUID(buyer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid buyer ID")
    result = await db.execute(select(Buyer).where(Buyer.id == bid))
    buyer = result.scalar_one_or_none()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    return _buyer_to_dict(buyer)


@router.get("/buyers/{buyer_id}/travelers")
async def list_travelers(buyer_id: str, db: AsyncSession = Depends(get_db)):
    try:
        bid = uuid.UUID(buyer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid buyer ID")
    result = await db.execute(
        select(Resident).where(Resident.buyer_id == bid).order_by(Resident.full_name)
    )
    return [_traveler_to_dict(t) for t in result.scalars().all()]


@router.post("/buyers/{buyer_id}/travelers")
async def create_traveler(buyer_id: str, body: TravelerBody, db: AsyncSession = Depends(get_db)):
    try:
        bid = uuid.UUID(buyer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid buyer ID")
    buyer = (await db.execute(select(Buyer).where(Buyer.id == bid))).scalar_one_or_none()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    existing = (await db.execute(select(Resident).where(Resident.email == body.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="A traveler with this email already exists")
    resident = Resident(full_name=body.full_name, email=body.email, phone=body.phone, buyer_id=bid)
    db.add(resident)
    await db.commit()
    await db.refresh(resident)
    return _traveler_to_dict(resident)


@router.patch("/buyers/{buyer_id}/travelers/{traveler_id}")
async def update_traveler(
    buyer_id: str, traveler_id: str, body: TravelerBody, db: AsyncSession = Depends(get_db)
):
    try:
        bid = uuid.UUID(buyer_id)
        tid = uuid.UUID(traveler_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID")
    resident = (await db.execute(
        select(Resident).where(Resident.id == tid, Resident.buyer_id == bid)
    )).scalar_one_or_none()
    if not resident:
        raise HTTPException(status_code=404, detail="Traveler not found")
    # Name is locked once the traveler is on any non-draft, non-cancelled lease
    if body.full_name != resident.full_name:
        locked = (await db.execute(
            select(Lease)
            .join(LeaseResident, Lease.id == LeaseResident.lease_id)
            .where(LeaseResident.resident_id == tid, Lease.state.notin_(["draft", "cancelled"]))
            .limit(1)
        )).scalar_one_or_none()
        if locked:
            raise HTTPException(status_code=422, detail="Name cannot be changed once a lease is signed")
    resident.full_name = body.full_name
    resident.email = body.email
    resident.phone = body.phone
    await db.commit()
    await db.refresh(resident)
    return _traveler_to_dict(resident)


@router.delete("/buyers/{buyer_id}/travelers/{traveler_id}")
async def delete_traveler(buyer_id: str, traveler_id: str, db: AsyncSession = Depends(get_db)):
    try:
        bid = uuid.UUID(buyer_id)
        tid = uuid.UUID(traveler_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID")
    resident = (await db.execute(
        select(Resident).where(Resident.id == tid, Resident.buyer_id == bid)
    )).scalar_one_or_none()
    if not resident:
        raise HTTPException(status_code=404, detail="Traveler not found")
    active = (await db.execute(
        select(Lease)
        .join(LeaseResident, Lease.id == LeaseResident.lease_id)
        .where(LeaseResident.resident_id == tid, Lease.state == "active")
        .limit(1)
    )).scalar_one_or_none()
    if active:
        raise HTTPException(status_code=409, detail="Cannot delete a traveler who is on an active lease")
    await db.execute(sa_delete(LeaseResident).where(LeaseResident.resident_id == tid))
    await db.delete(resident)
    await db.commit()
    return {"deleted": traveler_id}


@router.get("/buyers/{buyer_id}/travelers/{traveler_id}/leases")
async def traveler_lease_history(buyer_id: str, traveler_id: str, db: AsyncSession = Depends(get_db)):
    try:
        bid = uuid.UUID(buyer_id)
        tid = uuid.UUID(traveler_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID")
    resident = (await db.execute(
        select(Resident).where(Resident.id == tid, Resident.buyer_id == bid)
    )).scalar_one_or_none()
    if not resident:
        raise HTTPException(status_code=404, detail="Traveler not found")
    result = await db.execute(
        select(Lease, LeaseResident)
        .join(LeaseResident, Lease.id == LeaseResident.lease_id)
        .where(LeaseResident.resident_id == tid)
        .order_by(Lease.start_date.desc())
    )
    rows = result.all()
    prop_ids = {row[0].property_id for row in rows}
    prop_map: dict = {}
    if prop_ids:
        props = await db.execute(select(NetworkProperty).where(NetworkProperty.id.in_(prop_ids)))
        for p in props.scalars().all():
            prop_map[p.id] = p
    return [
        {
            "id": str(row[0].id),
            "state": row[0].state,
            "start_date": row[0].start_date.isoformat() if row[0].start_date else None,
            "end_date": row[0].end_date.isoformat() if row[0].end_date else None,
            "monthly_rent_cents": row[0].monthly_rent_cents,
            "unit_assignment": row[1].unit_assignment,
            "property_id": str(row[0].property_id),
            "property_name": prop_map[row[0].property_id].legal_name if row[0].property_id in prop_map else None,
            "property_metro": prop_map[row[0].property_id].metro if row[0].property_id in prop_map else None,
        }
        for row in rows
    ]


@router.post("/buyers/{buyer_id}/nma")
async def execute_nma(buyer_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    try:
        bid = uuid.UUID(buyer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid buyer ID")
    result = await db.execute(select(Buyer).where(Buyer.id == bid))
    buyer = result.scalar_one_or_none()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    buyer.nma_status = "executed"
    buyer.nma_terms = body
    await db.commit()
    await db.refresh(buyer)
    return _buyer_to_dict(buyer)
