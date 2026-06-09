# Mews Corporate Long-Stay Network — Locked API Contracts

## Mock Mews API endpoints (Agent 1 implements, Agent 2 calls)

```
POST /api/connector/v1/reservations/add
  body: { ConfigurationToken, ClientToken, ResourceId, StartUtc, EndUtc, RateId, PersonCount, Notes, PartnerCompanyId? }
  returns: { Reservations: [{ Id, GroupId, State: "Inquired", ... }] }

POST /api/connector/v1/reservations/confirm
  body: { ReservationIds: [string] }
  returns: { Reservations: [{ Id, State: "Confirmed", ... }] }

POST /api/connector/v1/reservations/start
  body: { ReservationIds: [string] }
  returns: { Reservations: [{ Id, State: "Started", ... }] }

POST /api/connector/v1/reservations/process
  body: { ReservationIds: [string] }
  returns: { Reservations: [{ Id, State: "Processed", ... }] }

POST /api/connector/v1/reservations/updateInterval
  body: { ReservationId, StartUtc, EndUtc }
  returns: { Reservations: [{ Id, StartUtc, EndUtc, ... }] }

POST /api/connector/v1/customers/add
  body: { FirstName, LastName, Email, ... }
  returns: { Customer: { Id, ... } }

POST /api/connector/v1/companies/add
  body: { Name, ... }
  returns: { Company: { Id, ... } }

POST /api/connector/v1/companyContracts/add
  body: { CompanyId, ContractName, ... }
  returns: { CompanyContract: { Id, ... } }

POST /api/connector/v1/paymentPlans/add
  body: { ReservationGroupId, Amount, Frequency }
  returns: { PaymentPlan: { Id, ... } }

POST /api/connector/v1/resources/getAll
  body: { EnterpriseIds, Limitation }
  returns: { Resources: [{ Id, Name, ResourceCategoryId }] }

POST /admin/seed
POST /admin/fire-webhook
GET  /admin/state
```

State machine: Inquired → Confirmed → Started → Processed (+ Canceled)
Webhook fires on every state change to WEBHOOK_TARGET_URL env var.
Mock Mews API runs on port 8001.

## Resident Platform endpoints (Agent 2 implements, Agent 3 calls)

Base URL: http://localhost:8000

```
GET    /api/properties/search?metro=Nashville&start=2026-07-15&end=2026-10-14&units=6
GET    /api/properties/{id}
PATCH  /api/properties/{id}/participation

GET    /api/buyers/{id}
POST   /api/buyers/{id}/nma

POST   /api/leases
POST   /api/leases/{id}/sign
POST   /api/leases/{id}/activate
POST   /api/leases/{id}/check-in
POST   /api/leases/{id}/extend
POST   /api/leases/{id}/check-out
GET    /api/leases/{id}
GET    /api/leases?buyer_id={id}
GET    /api/leases?property_id={id}
GET    /api/leases?resident_id={id}

GET    /api/residents/{id}
GET    /api/residents/{id}/leases

POST   /webhooks/mews

POST   /admin/seed
GET    /admin/lifecycle/{lease_id}
```

Resident Platform runs on port 8000.
