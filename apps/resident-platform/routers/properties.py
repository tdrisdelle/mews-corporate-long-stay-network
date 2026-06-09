import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from database import get_db
from models import NetworkProperty, Lease

router = APIRouter(tags=["properties"])


def _property_to_dict(p: NetworkProperty) -> dict:
    return {
        "id": str(p.id),
        "mews_enterprise_id": str(p.mews_enterprise_id),
        "legal_name": p.legal_name,
        "metro": p.metro,
        "jurisdiction": p.jurisdiction,
        "operator_type": p.operator_type,
        "npa_status": p.npa_status,
        "rate_floor_cents": p.rate_floor_cents,
        "max_network_exposure_pct": p.max_network_exposure_pct,
        "accepts_network_bookings": p.accepts_network_bookings,
        "unit_count": p.unit_count,
        "photo_url": p.photo_url,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@router.get("/properties/search")
async def search_properties(
    metro: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    unit_count: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    occupied_sq = (
        select(Lease.property_id, func.coalesce(func.sum(Lease.unit_count), 0).label("occupied"))
        .where(Lease.state.notin_(["cancelled", "completed"]))
        .group_by(Lease.property_id)
        .subquery()
    )
    stmt = (
        select(NetworkProperty, func.coalesce(occupied_sq.c.occupied, 0).label("occupied"))
        .outerjoin(occupied_sq, NetworkProperty.id == occupied_sq.c.property_id)
        .where(NetworkProperty.accepts_network_bookings == True)
    )
    if metro:
        stmt = stmt.where(NetworkProperty.metro.ilike(f"%{metro}%"))
    result = await db.execute(stmt)
    rows = result.all()
    out = []
    for prop, occupied in rows:
        available = max(0, (prop.unit_count or 0) - int(occupied or 0))
        if unit_count is not None and available < unit_count:
            continue
        d = _property_to_dict(prop)
        d["available_units"] = available
        out.append(d)
    return out


@router.get("/properties/{property_id}")
async def get_property(property_id: str, db: AsyncSession = Depends(get_db)):
    try:
        pid = uuid.UUID(property_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid property ID")
    result = await db.execute(select(NetworkProperty).where(NetworkProperty.id == pid))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return _property_to_dict(prop)


@router.patch("/properties/{property_id}/participation")
async def update_participation(property_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    try:
        pid = uuid.UUID(property_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid property ID")
    result = await db.execute(select(NetworkProperty).where(NetworkProperty.id == pid))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    if "accepts_network_bookings" in body:
        prop.accepts_network_bookings = body["accepts_network_bookings"]
    if "npa_status" in body:
        prop.npa_status = body["npa_status"]
    await db.commit()
    await db.refresh(prop)
    return _property_to_dict(prop)
