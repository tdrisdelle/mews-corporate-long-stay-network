import uuid
import logging
from fastapi import APIRouter, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends
from database import get_db
from models import Lease, LeaseEvent

logger = logging.getLogger(__name__)
router = APIRouter(tags=["webhooks"])


@router.post("/webhooks/mews")
async def receive_mews_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    event_type = payload.get("Type") or payload.get("type") or "unknown"
    events = payload.get("Events") or payload.get("events") or []

    for ev in events:
        reservation_group_id = ev.get("ReservationGroupId") or ev.get("reservation_group_id")
        if reservation_group_id:
            try:
                group_uuid = uuid.UUID(reservation_group_id)
                result = await db.execute(
                    select(Lease).where(Lease.mews_reservation_group_id == group_uuid)
                )
                lease = result.scalar_one_or_none()
                if lease:
                    log_event = LeaseEvent(
                        lease_id=lease.id,
                        event_type=f"mews_webhook_{event_type}",
                        actor_type="mews",
                        event_metadata={"payload": ev, "full_event_type": event_type},
                    )
                    db.add(log_event)
                    await db.commit()
                    logger.info(f"Webhook {event_type} logged for lease {lease.id}")
            except Exception as e:
                logger.warning(f"Webhook processing error: {e}")

    logger.info(f"Received Mews webhook: type={event_type}, events_count={len(events)}")
    return {"status": "ok"}
