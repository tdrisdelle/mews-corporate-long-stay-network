import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from database import get_db
from models import NetworkProperty

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
    stmt = select(NetworkProperty).where(NetworkProperty.accepts_network_bookings == True)
    if metro:
        stmt = stmt.where(NetworkProperty.metro.ilike(f"%{metro}%"))
    result = await db.execute(stmt)
    properties = result.scalars().all()
    return [_property_to_dict(p) for p in properties]


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
