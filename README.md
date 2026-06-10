# Mews Corporate Long-Stay Network

A B2B brokerage marketplace built as a façade on top of the Mews Connector API. Travel staffing agencies, corporate mobility buyers, and project workforce companies can source, lease, and manage corporate housing across a curated network of Mews-enabled properties — without building their own integrations.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           Next.js 16 Frontend (port 3000)            │
│  /booker  /operator  /mews  /mews/contracts  /resident│
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

- **Frontend:** https://web-production-b7d05.up.railway.app
- **Resident Platform:** https://resident-platform-production.up.railway.app
- **Mock Mews API:** https://mock-mews-api-production.up.railway.app

## Four Roles, Four Views

| URL | Role | What it shows |
|-----|------|---------------|
| `/booker` | Corporate buyer (e.g. Stanford Healthcare) | Search properties, create and manage leases, manage traveler roster |
| `/operator` | Property operator (e.g. Revisn Nashville) | Incoming bookings, revenue dashboard, network participation toggle |
| `/mews` | Mews admin | Network-wide lease table, GMV, take-rate revenue |
| `/mews/contracts/[id]` | Mews admin – contract deep dive | NMA + NPA + individual lease tabs, payment routing, audit trail |
| `/resident` | Individual traveler (e.g. Maria Santos) | Current stay card, lease document, extension request |

## 13-Step Demo Flow

Sarah Chen at **Stanford Healthcare Travel Staffing** needs to place 2 travel nurses in Nashville for a 13-week rotation at St. Thomas West Hospital.

1. Open `/booker` — you land as Stanford Healthcare (demo buyer, pre-loaded)
2. In the search bar set **City/Metro → Nashville**, check-in **Jul 15**, check-out **Oct 14**, **2 units** → click **Search**
3. Select **Revisn Nashville** from results → click **Create Lease**
4. In the lease form (Step 1): confirm the property, set dates and monthly rent → click **Next: Assign Travelers**
5. In Step 2: assign **Aisha Mohammed** to Unit 1 and **Carlos Reyes** to Unit 2 → click **Create Lease** → lease appears in `draft` state below
6. Click the lease card to open the detail panel → click **Send for Signature** → a 2-second signing animation plays → lease moves to `signed`, US-TN contract timestamped
7. Click **Activate** → platform calls the Mock Mews API: `companies/add`, `customers/add ×2`, `reservations/add ×2`, `paymentPlans/add` → state becomes `active`
8. Switch to `/operator` → see the new booking in the **Network Bookings** list alongside historical stays; click any lease card to open a read-only detail panel with traveler names and unit assignments
9. Switch to `/mews` → **Network Overview** shows all leases across all 5 properties, total GMV, and Mews revenue at 5.5%
10. Click the lease row → opens `/mews/contracts/[id]` → review NMA, NPA, and the signed individual lease; inspect the payment routing diagram and full audit event trail
11. Switch to `/resident?as=resident&id=b0000000-0000-0000-0000-000000000001` → Maria Santos's stay card: property name, dates, rent summary, and the simplified lease document
12. Click **Request Extension** → pick a new end date → Mews `reservations/updateInterval` fires → extension confirmed
13. Back on `/booker` → open the lease detail panel → click **Check In** (Mews `reservations/start`) → then **Check Out** (Mews `reservations/process`) → state becomes `completed`

## Traveler Management

The booker's **Your Travelers** panel (left side of `/booker`) lets the corporate buyer manage their roster:

- **Add** new travelers (name, email, phone)
- **Edit** contact info at any time; name is locked once a lease passes `draft`
- **Delete** travelers not on an active lease (cascades cleanly from all lease assignments)
- **View booking history** per traveler — clock icon opens a slide-up showing every past, current, and upcoming stay with property, dates, rent, and unit
- **Overlap protection** — the assignment step warns inline if a traveler is already booked at another property for overlapping dates; the server enforces it with a 409 if the client check is bypassed

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

## Seed Data

The `/admin/seed` endpoint on the Resident Platform loads:

- **3 buyers**: Stanford Healthcare Travel Staffing, Accenture Federal Services, Cigna Healthcare Mobility
- **12 travelers**: 6 Stanford nurses, 3 Accenture consultants, 3 Cigna relocators
- **5 properties**: Nashville (US-TN), Dallas (US-TX), Raleigh (US-NC), Phoenix (US-AZ), Boston (US-MA)
- **13 historical leases**: 10 completed + 3 currently active (~23%), with full contracts, resident assignments, and event histories

## Lease State Machine

```
draft → signed → active → completed
                        ↘ cancelled
```

`contract_sent` is a valid state (returned by the API and shown in the UI) for leases routing through a real e-signature provider. In the current demo, clicking **Send for Signature** advances directly to `signed` with a simulated signing animation.

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

## Project Documents

- [Pitch Deck](Mews_Long_Stay_Network_Pitch.pdf) — investor-facing overview of the opportunity, product, and go-to-market
- [Presentation](Mews_Long_Stay_Network_Presentation.pdf) — stakeholder walkthrough of the platform and demo
- [Project Journal](Mews_Long_Stay_Network_Journal.pdf) — build log covering architecture decisions, tradeoffs, and implementation notes
