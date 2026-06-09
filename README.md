# Mews Corporate Long-Stay Network

A B2B brokerage marketplace built as a façade on top of the Mews Connector API. Travel staffing agencies, corporate mobility buyers, and project workforce companies can source, lease, and manage corporate housing across a curated network of Mews-enabled properties — without building their own integrations.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           Next.js 15 Frontend (port 3000)            │
│  /booker  /operator  /mews/contracts  /resident      │
└───────────────────┬─────────────────────────────────┘
                    │ REST
┌───────────────────▼─────────────────────────────────┐
│       Mews Resident Platform – FastAPI (port 8000)   │
│    Postgres + SQLAlchemy + jurisdictional contracts   │
└───────────────────┬─────────────────────────────────┘
                    │ REST (mimics Mews Connector API)
┌───────────────────▼─────────────────────────────────┐
│     Mock Mews Connector API – FastAPI (port 8001)    │
│              SQLite · full state machine              │
└─────────────────────────────────────────────────────┘
```

## Deployed URLs

> Add Railway URLs here after deployment

- **Frontend:** https://web-production.up.railway.app
- **Resident Platform:** https://resident-platform-production.up.railway.app
- **Mock Mews API:** https://mock-mews-api-production.up.railway.app

## 13-Step Demo Flow

Sarah Chen at **Stanford Healthcare Travel Staffing** has 6 travel nurses arriving in Nashville July 15 for 13-week contracts at St. Thomas West Hospital.

1. Go to `/booker?as=booker&id=a0000000-0000-0000-0000-000000000001`
2. Search: **Nashville**, July 15 – Oct 14, 6 units
3. Select **Revisn Nashville** from results (pre-seeded Network property)
4. Assign 6 nurses: Maria Santos, James Park, Aisha Mohammed, Carlos Reyes, Jennifer Liu, Devon Williams
5. Click **Create Lease** → lease in `draft` state, US-TN contract generated
6. Click **Send for Signature** → state `contract_sent` → mock-signed immediately → `signed`
7. Click **Activate** → platform calls Mews: `companies/add`, `customers/add ×6`, `reservations/add ×6`, `paymentPlans/add` → state `active`
8. Switch to `/operator?as=operator&id=c0000000-0000-0000-0000-000000000001` → see 6 incoming Network bookings, revenue dashboard
9. Switch to `/mews/contracts/[lease_id]?as=mews` → NMA + NPA + Individual Lease tabs, payment routing diagram, audit trail
10. Switch to `/resident?as=resident&id=b0000000-0000-0000-0000-000000000001` → Maria Santos's stay card + lease document
11. Click **Check In** → Mews `reservations/start` fired
12. Click **Extend Stay 4 weeks** → new end date, Mews `reservations/updateInterval` fired
13. Click **Check Out** → Mews `reservations/process` → state `completed`

## Run Locally

**Prerequisites:** Python 3.12, Node.js 18+, PostgreSQL 14+

```bash
# 1. Create database
psql postgres -c "CREATE USER mews WITH PASSWORD 'mews';"
psql postgres -c "CREATE DATABASE resident_platform OWNER mews;"

# 2. Start Mock Mews API
cd apps/mock-mews-api
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
WEBHOOK_TARGET_URL=http://localhost:8000/webhooks/mews \
  .venv/bin/uvicorn main:app --port 8001 &

# 3. Start Resident Platform
cd ../resident-platform
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
DATABASE_URL=postgresql+asyncpg://mews:mews@localhost:5432/resident_platform \
MEWS_CONNECTOR_BASE_URL=http://localhost:8001 \
  .venv/bin/uvicorn main:app --port 8000 &

# 4. Seed both services
curl -X POST http://localhost:8001/admin/seed
curl -X POST http://localhost:8000/admin/seed

# 5. Start frontend
cd ../web
npm install
NEXT_PUBLIC_PLATFORM_URL=http://localhost:8000 npm run dev

# Open http://localhost:3000
```

**Or with Docker:**
```bash
docker compose up
# Then seed:
curl -X POST http://localhost:8001/admin/seed
curl -X POST http://localhost:8000/admin/seed
```

## Jurisdictional Contract Library

11 templates built in: US-TN, US-CA, US-TX, US-NY, US-MA, US-FL, US-DEFAULT, FR-BAIL-MOBILITE, DE-BOARDINGHOUSE, UK-CORPORATE-LET, INTERNATIONAL-DEFAULT.

## What's on the Roadmap

- Standalone B2C long-stay booking engine
- Real OAuth / SSO (Okta, Google Workspace)
- Multi-currency and i18n
- Email notifications (DocuSign, SendGrid)
- Real payment processing (Stripe Connect)
- Mobile app (React Native)
- Production Mews Connector integration (replace mock)

---

*[Link to project pitch summary PDF — Tim will add]*
