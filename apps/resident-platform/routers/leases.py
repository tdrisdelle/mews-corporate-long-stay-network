import uuid
import logging
from datetime import date, datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from models import Lease, LeaseResident, LeaseEvent, Contract, Buyer, NetworkProperty, Resident
from contracts.templates import get_template
from mews_client import MewsConnectorClient

logger = logging.getLogger(__name__)
router = APIRouter(tags=["leases"])
mews = MewsConnectorClient()


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class ResidentAssignment(BaseModel):
    id: str
    unit_assignment: Optional[str] = None


class CreateLeaseBody(BaseModel):
    buyer_id: Optional[str] = None
    property_id: str
    residents: list[ResidentAssignment]
    start: str  # ISO date
    end: str    # ISO date
    monthly_rent_cents: int


class SignLeaseBody(BaseModel):
    signed_by: Optional[str] = None
    signature_metadata: Optional[dict] = None


class ExtendLeaseBody(BaseModel):
    new_end: str  # ISO date


# ─── Serializers ──────────────────────────────────────────────────────────────

def _lease_to_dict(l: Lease, events: list = None, contracts: list = None) -> dict:
    d = {
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
    if events is not None:
        d["events"] = [_event_to_dict(e) for e in events]
    if contracts is not None:
        d["contracts"] = [_contract_to_dict(c) for c in contracts]
    return d


def _event_to_dict(e: LeaseEvent) -> dict:
    return {
        "id": str(e.id),
        "lease_id": str(e.lease_id),
        "event_type": e.event_type,
        "actor_type": e.actor_type,
        "actor_id": str(e.actor_id) if e.actor_id else None,
        "metadata": e.event_metadata,
        "occurred_at": e.occurred_at.isoformat() if e.occurred_at else None,
    }


def _contract_to_dict(c: Contract) -> dict:
    return {
        "id": str(c.id),
        "lease_id": str(c.lease_id),
        "contract_type": c.contract_type,
        "jurisdiction": c.jurisdiction,
        "template_name": c.template_name,
        "body": c.body,
        "parties": c.parties,
        "signed_at": c.signed_at.isoformat() if c.signed_at else None,
        "signature_metadata": c.signature_metadata,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_lease_or_404(lease_id: str, db: AsyncSession) -> Lease:
    try:
        lid = uuid.UUID(lease_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid lease ID")
    result = await db.execute(select(Lease).where(Lease.id == lid))
    lease = result.scalar_one_or_none()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    return lease


async def _get_lease_with_details(lease: Lease, db: AsyncSession) -> dict:
    events_result = await db.execute(
        select(LeaseEvent).where(LeaseEvent.lease_id == lease.id).order_by(LeaseEvent.occurred_at)
    )
    events = events_result.scalars().all()
    contracts_result = await db.execute(
        select(Contract).where(Contract.lease_id == lease.id)
    )
    contracts = contracts_result.scalars().all()
    return _lease_to_dict(lease, events=events, contracts=contracts)


async def _get_mews_reservation_ids(lease: Lease, db: AsyncSession) -> list[str]:
    """Get reservation IDs from the mews_reservations_created event."""
    result = await db.execute(
        select(LeaseEvent)
        .where(LeaseEvent.lease_id == lease.id)
        .where(LeaseEvent.event_type == "mews_reservations_created")
        .order_by(LeaseEvent.occurred_at.desc())
    )
    event = result.scalars().first()
    if not event or not event.event_metadata:
        return []
    return event.event_metadata.get("reservation_ids", [])


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/leases")
async def create_lease(body: CreateLeaseBody, db: AsyncSession = Depends(get_db)):
    # Fetch property
    try:
        pid = uuid.UUID(body.property_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid property_id")
    prop_result = await db.execute(select(NetworkProperty).where(NetworkProperty.id == pid))
    prop = prop_result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # Fetch buyer if provided
    buyer = None
    buyer_uuid = None
    if body.buyer_id:
        try:
            buyer_uuid = uuid.UUID(body.buyer_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid buyer_id")
        buyer_result = await db.execute(select(Buyer).where(Buyer.id == buyer_uuid))
        buyer = buyer_result.scalar_one_or_none()
        if not buyer:
            raise HTTPException(status_code=404, detail="Buyer not found")

    # Parse dates
    try:
        start_date = date.fromisoformat(body.start)
        end_date = date.fromisoformat(body.end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    # Create lease
    lease = Lease(
        buyer_id=buyer_uuid,
        property_id=pid,
        state="draft",
        start_date=start_date,
        end_date=end_date,
        unit_count=len(body.residents) or 1,
        monthly_rent_cents=body.monthly_rent_cents,
        jurisdiction=prop.jurisdiction,
        network_take_rate_pct=buyer.take_rate_pct if buyer else None,
    )
    db.add(lease)
    await db.flush()  # get lease.id

    # Create lease_residents
    for ra in body.residents:
        try:
            rid = uuid.UUID(ra.id)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid resident ID: {ra.id}")
        lr = LeaseResident(
            lease_id=lease.id,
            resident_id=rid,
            unit_assignment=ra.unit_assignment,
        )
        db.add(lr)

    # Generate contract from template
    template = get_template(prop.jurisdiction)
    parties = {
        "property": {"id": str(prop.id), "legal_name": prop.legal_name, "jurisdiction": prop.jurisdiction},
        "buyer": {"id": str(buyer.id) if buyer else None, "legal_name": buyer.legal_name if buyer else "Unknown"},
        "residents": [{"id": ra.id, "unit_assignment": ra.unit_assignment} for ra in body.residents],
    }
    contract = Contract(
        lease_id=lease.id,
        contract_type="individual_lease",
        jurisdiction=prop.jurisdiction,
        template_name=template["template_id"],
        body={
            "clauses": template["clauses"],
            "jurisdiction_specific": template["jurisdiction_specific"],
            "lease_details": {
                "start_date": body.start,
                "end_date": body.end,
                "monthly_rent_cents": body.monthly_rent_cents,
                "unit_count": lease.unit_count,
            }
        },
        parties=parties,
    )
    db.add(contract)

    # Log event
    event = LeaseEvent(
        lease_id=lease.id,
        event_type="lease_created",
        actor_type="system",
        event_metadata={"property_id": str(prop.id), "jurisdiction": prop.jurisdiction},
    )
    db.add(event)

    await db.commit()
    await db.refresh(lease)
    return await _get_lease_with_details(lease, db)


@router.post("/leases/{lease_id}/sign")
async def sign_lease(lease_id: str, body: SignLeaseBody = SignLeaseBody(), db: AsyncSession = Depends(get_db)):
    lease = await _get_lease_or_404(lease_id, db)
    if lease.state not in ("draft",):
        raise HTTPException(status_code=400, detail=f"Cannot sign lease in state '{lease.state}'")

    lease.state = "signed"

    # Update contract signed_at
    contracts_result = await db.execute(select(Contract).where(Contract.lease_id == lease.id))
    contracts = contracts_result.scalars().all()
    now = datetime.now(timezone.utc)
    for c in contracts:
        c.signed_at = now
        c.signature_metadata = body.signature_metadata or {"signed_by": body.signed_by, "method": "electronic"}

    event = LeaseEvent(
        lease_id=lease.id,
        event_type="lease_signed",
        actor_type="buyer",
        event_metadata={"signed_by": body.signed_by, "signature_metadata": body.signature_metadata},
    )
    db.add(event)

    await db.commit()
    await db.refresh(lease)
    return await _get_lease_with_details(lease, db)


@router.post("/leases/{lease_id}/activate")
async def activate_lease(lease_id: str, db: AsyncSession = Depends(get_db)):
    lease = await _get_lease_or_404(lease_id, db)
    if lease.state != "signed":
        raise HTTPException(status_code=400, detail=f"Cannot activate lease in state '{lease.state}'. Must be 'signed'.")

    # Fetch related data
    prop_result = await db.execute(select(NetworkProperty).where(NetworkProperty.id == lease.property_id))
    prop = prop_result.scalar_one_or_none()

    buyer = None
    if lease.buyer_id:
        buyer_result = await db.execute(select(Buyer).where(Buyer.id == lease.buyer_id))
        buyer = buyer_result.scalar_one_or_none()

    lr_result = await db.execute(
        select(LeaseResident).where(LeaseResident.lease_id == lease.id)
    )
    lease_residents = lr_result.scalars().all()

    # 1. Add company to Mews
    company_id = None
    if buyer:
        try:
            company_resp = await mews.add_company(name=buyer.legal_name)
            co = company_resp.get("Company", company_resp)
            company_id = co.get("Id") or co.get("id")
            if company_id:
                buyer.mews_company_links = {**( buyer.mews_company_links or {}), str(prop.mews_enterprise_id): company_id}
        except Exception as e:
            logger.warning(f"Mews add_company failed: {e}")

    # 2. Get resources for the property
    resource_id = None
    rate_id = None
    try:
        resources_resp = await mews.get_all_resources([str(prop.mews_enterprise_id)])
        resources = resources_resp.get("Resources", [])
        if resources:
            resource_id = resources[0].get("Id") or resources[0].get("id")
        # Use a mock rate ID for demo — mock Mews API accepts any value
        rate_id = "00000000-rate-0000-0000-000000000001"
    except Exception as e:
        logger.warning(f"Mews get resources/rates failed: {e}")

    # Use fallback IDs if Mews is unavailable
    if not resource_id:
        resource_id = "00000000-0000-0000-0000-000000000000"
    if not rate_id:
        rate_id = "00000000-0000-0000-0000-000000000000"

    # Format dates for Mews (ISO 8601 UTC)
    start_utc = f"{lease.start_date.isoformat()}T14:00:00Z"
    end_utc = f"{lease.end_date.isoformat()}T11:00:00Z"

    # 3. Add customers and reservations per resident
    reservation_ids = []
    group_id = None

    for lr in lease_residents:
        res_result = await db.execute(select(Resident).where(Resident.id == lr.resident_id))
        resident = res_result.scalar_one_or_none()
        if not resident:
            continue

        # Add customer
        try:
            name_parts = resident.full_name.split(" ", 1)
            first = name_parts[0]
            last = name_parts[1] if len(name_parts) > 1 else ""
            customer_resp = await mews.add_customer(
                first_name=first, last_name=last, email=resident.email
            )
            customer_id = customer_resp.get("Id") or customer_resp.get("id")
            if customer_id:
                resident.mews_customer_links = {**(resident.mews_customer_links or {}), str(prop.mews_enterprise_id): customer_id}
        except Exception as e:
            logger.warning(f"Mews add_customer failed for {resident.full_name}: {e}")

        # Add reservation
        try:
            res_resp = await mews.add_reservation(
                resource_id=resource_id,
                start_utc=start_utc,
                end_utc=end_utc,
                rate_id=rate_id,
                person_count=1,
                notes=f"Corporate housing lease {lease_id}",
                partner_company_id=company_id,
            )
            revs = res_resp.get("Reservations", [])
            if revs:
                reservation_id = revs[0].get("Id") or revs[0].get("id")
                if reservation_id:
                    reservation_ids.append(reservation_id)
                if not group_id:
                    group_id = revs[0].get("GroupId") or revs[0].get("group_id")
        except Exception as e:
            logger.warning(f"Mews add_reservation failed: {e}")

    # 4. Add payment plan
    payment_plan_id = None
    if group_id:
        try:
            pp_resp = await mews.add_payment_plan(
                reservation_group_id=group_id,
                amount=lease.monthly_rent_cents,
                frequency="Monthly"
            )
            payment_plan_id = pp_resp.get("Id") or pp_resp.get("id")
        except Exception as e:
            logger.warning(f"Mews add_payment_plan failed: {e}")

    # Update lease
    lease.state = "active"
    if group_id:
        try:
            lease.mews_reservation_group_id = uuid.UUID(group_id)
        except Exception:
            pass
    if payment_plan_id:
        try:
            lease.mews_payment_plan_id = uuid.UUID(payment_plan_id)
        except Exception:
            pass

    # Store reservation IDs in event metadata
    mews_event = LeaseEvent(
        lease_id=lease.id,
        event_type="mews_reservations_created",
        actor_type="system",
        event_metadata={
            "reservation_ids": reservation_ids,
            "company_id": company_id,
            "group_id": group_id,
            "resource_id": resource_id,
            "rate_id": rate_id,
        },
    )
    db.add(mews_event)

    activate_event = LeaseEvent(
        lease_id=lease.id,
        event_type="lease_activated",
        actor_type="system",
        event_metadata={"reservation_count": len(reservation_ids)},
    )
    db.add(activate_event)

    await db.commit()
    await db.refresh(lease)
    return await _get_lease_with_details(lease, db)


@router.post("/leases/{lease_id}/check-in")
async def check_in(lease_id: str, db: AsyncSession = Depends(get_db)):
    lease = await _get_lease_or_404(lease_id, db)
    if lease.state != "active":
        raise HTTPException(status_code=400, detail=f"Cannot check-in lease in state '{lease.state}'")

    reservation_ids = await _get_mews_reservation_ids(lease, db)
    if reservation_ids:
        try:
            await mews.start_reservations(reservation_ids)
        except Exception as e:
            logger.warning(f"Mews start_reservations failed: {e}")

    event = LeaseEvent(
        lease_id=lease.id,
        event_type="checked_in",
        actor_type="system",
        event_metadata={"reservation_ids": reservation_ids},
    )
    db.add(event)
    await db.commit()
    await db.refresh(lease)
    return await _get_lease_with_details(lease, db)


@router.post("/leases/{lease_id}/extend")
async def extend_lease(lease_id: str, body: ExtendLeaseBody, db: AsyncSession = Depends(get_db)):
    lease = await _get_lease_or_404(lease_id, db)
    try:
        new_end = date.fromisoformat(body.new_end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format for new_end")

    old_end = lease.end_date
    lease.end_date = new_end
    new_end_utc = f"{new_end.isoformat()}T11:00:00Z"

    reservation_ids = await _get_mews_reservation_ids(lease, db)
    for rid in reservation_ids:
        try:
            start_utc = f"{lease.start_date.isoformat()}T14:00:00Z"
            await mews.update_interval(rid, start_utc=start_utc, end_utc=new_end_utc)
        except Exception as e:
            logger.warning(f"Mews update_interval failed for {rid}: {e}")

    event = LeaseEvent(
        lease_id=lease.id,
        event_type="extended",
        actor_type="system",
        event_metadata={"old_end_date": old_end.isoformat() if old_end else None, "new_end_date": body.new_end},
    )
    db.add(event)
    await db.commit()
    await db.refresh(lease)
    return await _get_lease_with_details(lease, db)


@router.post("/leases/{lease_id}/check-out")
async def check_out(lease_id: str, db: AsyncSession = Depends(get_db)):
    lease = await _get_lease_or_404(lease_id, db)

    reservation_ids = await _get_mews_reservation_ids(lease, db)
    if reservation_ids:
        try:
            await mews.process_reservations(reservation_ids)
        except Exception as e:
            logger.warning(f"Mews process_reservations failed: {e}")

    lease.state = "completed"

    event = LeaseEvent(
        lease_id=lease.id,
        event_type="checked_out",
        actor_type="system",
        event_metadata={"reservation_ids": reservation_ids},
    )
    db.add(event)
    await db.commit()
    await db.refresh(lease)
    return await _get_lease_with_details(lease, db)


@router.get("/leases/{lease_id}")
async def get_lease(lease_id: str, db: AsyncSession = Depends(get_db)):
    lease = await _get_lease_or_404(lease_id, db)
    return await _get_lease_with_details(lease, db)


@router.get("/leases")
async def list_leases(
    buyer_id: Optional[str] = Query(None),
    property_id: Optional[str] = Query(None),
    resident_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    from models import LeaseResident as LR

    stmt = select(Lease)

    if buyer_id:
        try:
            bid = uuid.UUID(buyer_id)
            stmt = stmt.where(Lease.buyer_id == bid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid buyer_id")

    if property_id:
        try:
            pid = uuid.UUID(property_id)
            stmt = stmt.where(Lease.property_id == pid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid property_id")

    if resident_id:
        try:
            rid = uuid.UUID(resident_id)
            stmt = stmt.join(LR, Lease.id == LR.lease_id).where(LR.resident_id == rid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid resident_id")

    result = await db.execute(stmt)
    leases = result.scalars().all()
    return [_lease_to_dict(l) for l in leases]
