import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Buyer

router = APIRouter(tags=["buyers"])


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
