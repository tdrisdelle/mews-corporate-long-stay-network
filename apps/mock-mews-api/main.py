"""
Mock Mews Connector API
Mimics the Mews Connector API for demo/prototype purposes.
Runs on port 8001 with SQLite in-process.
NOTE: Production Mews webhooks have 2-5 min lag; demo fires synchronously (background task).
"""

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text

# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mews_mock.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

WEBHOOK_TARGET_URL = os.getenv("WEBHOOK_TARGET_URL", "http://localhost:8000/webhooks/mews")

DDL = """
CREATE TABLE IF NOT EXISTS enterprises (
    id TEXT PRIMARY KEY,
    name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT DEFAULT 'US'
);

CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    enterprise_id TEXT,
    name TEXT,
    resource_category_id TEXT,
    floor INTEGER,
    max_occupancy INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    enterprise_id TEXT
);

CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT,
    identifier TEXT,
    enterprise_id TEXT
);

CREATE TABLE IF NOT EXISTS company_contracts (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_name TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    group_id TEXT,
    enterprise_id TEXT,
    resource_id TEXT,
    customer_id TEXT,
    company_id TEXT,
    rate_id TEXT,
    start_utc TEXT,
    end_utc TEXT,
    state TEXT DEFAULT 'Inquired',
    person_count INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS payment_plans (
    id TEXT PRIMARY KEY,
    reservation_group_id TEXT,
    amount_cents INTEGER,
    frequency TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS webhook_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT,
    payload TEXT,
    fired_at TEXT
);
"""


def init_db():
    with engine.connect() as conn:
        for statement in DDL.strip().split(";"):
            stmt = statement.strip()
            if stmt:
                conn.execute(text(stmt))
        conn.commit()


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Mock Mews Connector API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


# ---------------------------------------------------------------------------
# Webhook helper
# ---------------------------------------------------------------------------

async def _fire_webhook(event_type: str, reservation_id: str, new_state: str,
                        enterprise_id: str, group_id: str):
    payload = {
        "Type": event_type,
        "ReservationId": reservation_id,
        "NewState": new_state,
        "EnterpriseId": enterprise_id,
        "GroupId": group_id,
        "OccurredUtc": now_iso(),
    }
    payload_str = json.dumps(payload)

    # Log the webhook attempt
    with engine.connect() as conn:
        conn.execute(
            text("INSERT INTO webhook_log (event_type, payload, fired_at) VALUES (:et, :p, :fa)"),
            {"et": event_type, "p": payload_str, "fa": now_iso()},
        )
        conn.commit()

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(WEBHOOK_TARGET_URL, json=payload)
    except Exception:
        pass  # Best-effort; demo only


def fire_webhook_background(event_type: str, reservation_id: str, new_state: str,
                             enterprise_id: str, group_id: str):
    asyncio.create_task(
        _fire_webhook(event_type, reservation_id, new_state, enterprise_id, group_id)
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def row_to_reservation(row) -> dict:
    return {
        "Id": row.id,
        "GroupId": row.group_id,
        "EnterpriseId": row.enterprise_id,
        "ResourceId": row.resource_id,
        "CustomerId": row.customer_id,
        "CompanyId": row.company_id,
        "RateId": row.rate_id,
        "StartUtc": row.start_utc,
        "EndUtc": row.end_utc,
        "State": row.state,
        "PersonCount": row.person_count,
        "Notes": row.notes,
        "CreatedAt": row.created_at,
    }


def get_reservation(conn, reservation_id: str):
    result = conn.execute(
        text("SELECT * FROM reservations WHERE id = :id"),
        {"id": reservation_id},
    )
    return result.fetchone()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ReservationAddRequest(BaseModel):
    ConfigurationToken: Optional[str] = None
    ClientToken: Optional[str] = None
    ResourceId: str
    StartUtc: str
    EndUtc: str
    RateId: Optional[str] = None
    PersonCount: Optional[int] = 1
    Notes: Optional[str] = None
    PartnerCompanyId: Optional[str] = None
    EnterpriseId: Optional[str] = None
    CustomerId: Optional[str] = None


class ReservationIdsRequest(BaseModel):
    ReservationIds: list[str]


class ReservationUpdateIntervalRequest(BaseModel):
    ReservationId: str
    StartUtc: str
    EndUtc: str


class CustomerAddRequest(BaseModel):
    FirstName: str
    LastName: str
    Email: str
    Phone: Optional[str] = None
    EnterpriseId: Optional[str] = None


class CompanyAddRequest(BaseModel):
    Name: str
    Identifier: Optional[str] = None
    EnterpriseId: Optional[str] = None


class CompanyContractAddRequest(BaseModel):
    CompanyId: str
    ContractName: str


class PaymentPlanAddRequest(BaseModel):
    ReservationGroupId: str
    Amount: float
    Frequency: str


class ResourcesGetAllRequest(BaseModel):
    EnterpriseIds: list[str]
    Limitation: Optional[Any] = None


class AdminFireWebhookRequest(BaseModel):
    event_type: str
    reservation_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Reservation endpoints
# ---------------------------------------------------------------------------

@app.post("/api/connector/v1/reservations/add")
async def reservations_add(req: ReservationAddRequest):
    res_id = new_id()
    group_id = new_id()
    created = now_iso()

    # Attempt to look up enterprise from resource
    enterprise_id = req.EnterpriseId
    if not enterprise_id:
        with engine.connect() as conn:
            r = conn.execute(
                text("SELECT enterprise_id FROM resources WHERE id = :rid"),
                {"rid": req.ResourceId},
            ).fetchone()
            if r:
                enterprise_id = r.enterprise_id
    if not enterprise_id:
        enterprise_id = ""

    with engine.connect() as conn:
        conn.execute(
            text("""
                INSERT INTO reservations
                    (id, group_id, enterprise_id, resource_id, customer_id, company_id,
                     rate_id, start_utc, end_utc, state, person_count, notes, created_at)
                VALUES
                    (:id, :gid, :eid, :rid, :cid, :cpid,
                     :rateid, :start, :end, 'Inquired', :pc, :notes, :created)
            """),
            {
                "id": res_id,
                "gid": group_id,
                "eid": enterprise_id,
                "rid": req.ResourceId,
                "cid": req.CustomerId or "",
                "cpid": req.PartnerCompanyId or "",
                "rateid": req.RateId or "",
                "start": req.StartUtc,
                "end": req.EndUtc,
                "pc": req.PersonCount or 1,
                "notes": req.Notes or "",
                "created": created,
            },
        )
        conn.commit()

    fire_webhook_background("ReservationAdded", res_id, "Inquired", enterprise_id, group_id)

    return {
        "Reservations": [
            {
                "Id": res_id,
                "GroupId": group_id,
                "State": "Inquired",
                "ResourceId": req.ResourceId,
                "StartUtc": req.StartUtc,
                "EndUtc": req.EndUtc,
                "EnterpriseId": enterprise_id,
                "PersonCount": req.PersonCount or 1,
                "Notes": req.Notes or "",
                "CreatedAt": created,
            }
        ]
    }


def _transition_reservations(reservation_ids: list[str], new_state: str, event_type: str):
    results = []
    with engine.connect() as conn:
        for rid in reservation_ids:
            conn.execute(
                text("UPDATE reservations SET state = :state WHERE id = :id"),
                {"state": new_state, "id": rid},
            )
            row = get_reservation(conn, rid)
            if row:
                results.append(row_to_reservation(row))
                fire_webhook_background(event_type, rid, new_state, row.enterprise_id or "", row.group_id or "")
        conn.commit()
    return {"Reservations": results}


@app.post("/api/connector/v1/reservations/confirm")
async def reservations_confirm(req: ReservationIdsRequest):
    return _transition_reservations(req.ReservationIds, "Confirmed", "ReservationConfirmed")


@app.post("/api/connector/v1/reservations/start")
async def reservations_start(req: ReservationIdsRequest):
    return _transition_reservations(req.ReservationIds, "Started", "ReservationStarted")


@app.post("/api/connector/v1/reservations/process")
async def reservations_process(req: ReservationIdsRequest):
    return _transition_reservations(req.ReservationIds, "Processed", "ReservationProcessed")


@app.post("/api/connector/v1/reservations/updateInterval")
async def reservations_update_interval(req: ReservationUpdateIntervalRequest):
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE reservations SET start_utc = :start, end_utc = :end WHERE id = :id"),
            {"start": req.StartUtc, "end": req.EndUtc, "id": req.ReservationId},
        )
        conn.commit()
        row = get_reservation(conn, req.ReservationId)

    if row:
        fire_webhook_background(
            "ReservationIntervalUpdated",
            req.ReservationId,
            row.state or "",
            row.enterprise_id or "",
            row.group_id or "",
        )
        return {"Reservations": [row_to_reservation(row)]}
    return {"Reservations": []}


# ---------------------------------------------------------------------------
# Customer endpoints
# ---------------------------------------------------------------------------

@app.post("/api/connector/v1/customers/add")
async def customers_add(req: CustomerAddRequest):
    cid = new_id()
    with engine.connect() as conn:
        conn.execute(
            text("""
                INSERT INTO customers (id, first_name, last_name, email, phone, enterprise_id)
                VALUES (:id, :fn, :ln, :email, :phone, :eid)
            """),
            {
                "id": cid,
                "fn": req.FirstName,
                "ln": req.LastName,
                "email": req.Email,
                "phone": req.Phone or "",
                "eid": req.EnterpriseId or "",
            },
        )
        conn.commit()

    return {
        "Customer": {
            "Id": cid,
            "FirstName": req.FirstName,
            "LastName": req.LastName,
            "Email": req.Email,
            "Phone": req.Phone or "",
            "EnterpriseId": req.EnterpriseId or "",
        }
    }


# ---------------------------------------------------------------------------
# Company endpoints
# ---------------------------------------------------------------------------

@app.post("/api/connector/v1/companies/add")
async def companies_add(req: CompanyAddRequest):
    cid = new_id()
    with engine.connect() as conn:
        conn.execute(
            text("""
                INSERT INTO companies (id, name, identifier, enterprise_id)
                VALUES (:id, :name, :identifier, :eid)
            """),
            {
                "id": cid,
                "name": req.Name,
                "identifier": req.Identifier or "",
                "eid": req.EnterpriseId or "",
            },
        )
        conn.commit()

    return {
        "Company": {
            "Id": cid,
            "Name": req.Name,
            "Identifier": req.Identifier or "",
            "EnterpriseId": req.EnterpriseId or "",
        }
    }


# ---------------------------------------------------------------------------
# Company contract endpoints
# ---------------------------------------------------------------------------

@app.post("/api/connector/v1/companyContracts/add")
async def company_contracts_add(req: CompanyContractAddRequest):
    cid = new_id()
    created = now_iso()
    with engine.connect() as conn:
        conn.execute(
            text("""
                INSERT INTO company_contracts (id, company_id, contract_name, created_at)
                VALUES (:id, :cid, :cn, :created)
            """),
            {"id": cid, "cid": req.CompanyId, "cn": req.ContractName, "created": created},
        )
        conn.commit()

    return {
        "CompanyContract": {
            "Id": cid,
            "CompanyId": req.CompanyId,
            "ContractName": req.ContractName,
            "CreatedAt": created,
        }
    }


# ---------------------------------------------------------------------------
# Payment plan endpoints
# ---------------------------------------------------------------------------

@app.post("/api/connector/v1/paymentPlans/add")
async def payment_plans_add(req: PaymentPlanAddRequest):
    pid = new_id()
    created = now_iso()
    amount_cents = int(req.Amount * 100)
    with engine.connect() as conn:
        conn.execute(
            text("""
                INSERT INTO payment_plans (id, reservation_group_id, amount_cents, frequency, created_at)
                VALUES (:id, :rgid, :ac, :freq, :created)
            """),
            {
                "id": pid,
                "rgid": req.ReservationGroupId,
                "ac": amount_cents,
                "freq": req.Frequency,
                "created": created,
            },
        )
        conn.commit()

    return {
        "PaymentPlan": {
            "Id": pid,
            "ReservationGroupId": req.ReservationGroupId,
            "Amount": req.Amount,
            "AmountCents": amount_cents,
            "Frequency": req.Frequency,
            "CreatedAt": created,
        }
    }


# ---------------------------------------------------------------------------
# Resources endpoints
# ---------------------------------------------------------------------------

@app.post("/api/connector/v1/resources/getAll")
async def resources_get_all(req: ResourcesGetAllRequest):
    if not req.EnterpriseIds:
        return {"Resources": []}

    with engine.connect() as conn:
        placeholders = ", ".join(f":eid{i}" for i in range(len(req.EnterpriseIds)))
        params = {f"eid{i}": eid for i, eid in enumerate(req.EnterpriseIds)}
        rows = conn.execute(
            text(f"SELECT * FROM resources WHERE enterprise_id IN ({placeholders})"),
            params,
        ).fetchall()

    resources = [
        {
            "Id": r.id,
            "EnterpriseId": r.enterprise_id,
            "Name": r.name,
            "ResourceCategoryId": r.resource_category_id,
            "Floor": r.floor,
            "MaxOccupancy": r.max_occupancy,
        }
        for r in rows
    ]
    return {"Resources": resources}


# ---------------------------------------------------------------------------
# Admin: seed
# ---------------------------------------------------------------------------

ENTERPRISES_SEED = [
    {
        "id": "9b8e7a6d-1001-4000-a000-000000000001",
        "name": "Revisn Nashville",
        "address": "1 Peabody St",
        "city": "Nashville",
        "state": "TN",
        "zip": "37210",
    },
    {
        "id": "9b8e7a6d-1001-4000-a000-000000000002",
        "name": "Olympia Nashville",
        "address": "200 Rosa Parks Blvd",
        "city": "Nashville",
        "state": "TN",
        "zip": "37203",
    },
    {
        "id": "9b8e7a6d-1001-4000-a000-000000000003",
        "name": "Kasa Dallas Uptown",
        "address": "2555 N Pearl St",
        "city": "Dallas",
        "state": "TX",
        "zip": "75201",
    },
    {
        "id": "9b8e7a6d-1001-4000-a000-000000000004",
        "name": "Zeus Living Dallas",
        "address": "3100 McKinnon St",
        "city": "Dallas",
        "state": "TX",
        "zip": "75201",
    },
    {
        "id": "9b8e7a6d-1001-4000-a000-000000000005",
        "name": "Reside NC Raleigh",
        "address": "421 Fayetteville St",
        "city": "Raleigh",
        "state": "NC",
        "zip": "27601",
    },
    {
        "id": "9b8e7a6d-1001-4000-a000-000000000006",
        "name": "Furnished Finder Raleigh",
        "address": "150 Fayetteville St",
        "city": "Raleigh",
        "state": "NC",
        "zip": "27601",
    },
    {
        "id": "9b8e7a6d-1001-4000-a000-000000000007",
        "name": "Sonder Phoenix",
        "address": "1 E Washington St",
        "city": "Phoenix",
        "state": "AZ",
        "zip": "85004",
    },
    {
        "id": "9b8e7a6d-1001-4000-a000-000000000008",
        "name": "Lyric Phoenix",
        "address": "2 N Central Ave",
        "city": "Phoenix",
        "state": "AZ",
        "zip": "85004",
    },
    {
        "id": "9b8e7a6d-1001-4000-a000-000000000009",
        "name": "Kasa Boston",
        "address": "1 Boylston St",
        "city": "Boston",
        "state": "MA",
        "zip": "02116",
    },
    {
        "id": "9b8e7a6d-1001-4000-a000-000000000010",
        "name": "Blueground Boston",
        "address": "100 Summer St",
        "city": "Boston",
        "state": "MA",
        "zip": "02110",
    },
]

SAMPLE_CUSTOMERS = [
    {"first_name": "Alice", "last_name": "Chen", "email": "alice.chen@example.com", "phone": "615-555-0101"},
    {"first_name": "Bob", "last_name": "Patel", "email": "bob.patel@example.com", "phone": "214-555-0102"},
    {"first_name": "Carol", "last_name": "Williams", "email": "carol.williams@example.com", "phone": "919-555-0103"},
    {"first_name": "David", "last_name": "Kim", "email": "david.kim@example.com", "phone": "602-555-0104"},
    {"first_name": "Eve", "last_name": "Johnson", "email": "eve.johnson@example.com", "phone": "617-555-0105"},
]


@app.post("/admin/seed")
async def admin_seed():
    category_id = "cat-" + new_id()
    resource_count = 0
    customer_count = 0

    with engine.connect() as conn:
        # Insert enterprises (upsert-style: delete then insert for idempotency)
        for ent in ENTERPRISES_SEED:
            conn.execute(text("DELETE FROM enterprises WHERE id = :id"), {"id": ent["id"]})
            conn.execute(
                text("""
                    INSERT INTO enterprises (id, name, address, city, state, zip, country)
                    VALUES (:id, :name, :address, :city, :state, :zip, 'US')
                """),
                ent,
            )

            # Create 5 resources per enterprise
            for floor_num in range(1, 6):
                rid = new_id()
                conn.execute(
                    text("""
                        INSERT INTO resources (id, enterprise_id, name, resource_category_id, floor, max_occupancy)
                        VALUES (:id, :eid, :name, :rcid, :floor, :occ)
                    """),
                    {
                        "id": rid,
                        "eid": ent["id"],
                        "name": f"Unit {floor_num}0{floor_num} - {ent['name']}",
                        "rcid": category_id,
                        "floor": floor_num,
                        "occ": 2,
                    },
                )
                resource_count += 1

        # Insert sample customers
        conn.execute(text("DELETE FROM customers WHERE email IN ('alice.chen@example.com','bob.patel@example.com','carol.williams@example.com','david.kim@example.com','eve.johnson@example.com')"))
        for cust in SAMPLE_CUSTOMERS:
            conn.execute(
                text("""
                    INSERT INTO customers (id, first_name, last_name, email, phone, enterprise_id)
                    VALUES (:id, :fn, :ln, :email, :phone, '')
                """),
                {
                    "id": new_id(),
                    "fn": cust["first_name"],
                    "ln": cust["last_name"],
                    "email": cust["email"],
                    "phone": cust["phone"],
                },
            )
            customer_count += 1

        conn.commit()

    return {
        "message": "Seeded",
        "enterprises": len(ENTERPRISES_SEED),
        "resources": resource_count,
        "customers": customer_count,
    }


# ---------------------------------------------------------------------------
# Admin: fire-webhook
# ---------------------------------------------------------------------------

@app.post("/admin/fire-webhook")
async def admin_fire_webhook(req: AdminFireWebhookRequest):
    reservation_id = req.reservation_id or new_id()
    enterprise_id = ""
    group_id = ""
    state = "Inquired"

    if req.reservation_id:
        with engine.connect() as conn:
            row = get_reservation(conn, req.reservation_id)
            if row:
                enterprise_id = row.enterprise_id or ""
                group_id = row.group_id or ""
                state = row.state or "Inquired"

    await _fire_webhook(req.event_type, reservation_id, state, enterprise_id, group_id)
    return {"fired": True, "event_type": req.event_type, "reservation_id": reservation_id}


# ---------------------------------------------------------------------------
# Admin: state dump
# ---------------------------------------------------------------------------

@app.get("/admin/state")
async def admin_state():
    tables = [
        "enterprises",
        "resources",
        "customers",
        "companies",
        "company_contracts",
        "reservations",
        "payment_plans",
        "webhook_log",
    ]
    result = {}
    with engine.connect() as conn:
        for table in tables:
            count_row = conn.execute(text(f"SELECT COUNT(*) as cnt FROM {table}")).fetchone()
            rows = conn.execute(text(f"SELECT * FROM {table} LIMIT 20")).fetchall()
            result[table] = {
                "count": count_row.cnt,
                "rows": [dict(r._mapping) for r in rows],
            }
    return result


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "service": "mock-mews-api"}
