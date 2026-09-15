# Bakery-MD backend

NestJS + Prisma + PostgreSQL API. Multi-tenant: every business is a `Tenant`,
every tenant-owned row carries a `tenantId`, and access is enforced by a
role/permission matrix (`src/common/permissions.ts`).

## Setup

```bash
cp .env.example .env   # edit DATABASE_URL / JWT_SECRET as needed
npm install
npm run prisma:migrate  # creates the schema in your local Postgres
npm run prisma:seed     # creates the Platform Admin + pilot bakery tenant + its Owner
npm run start:dev
```

Seed credentials (override via `SEED_ADMIN_NATIONAL_ID` / `SEED_ADMIN_PASSWORD` /
`SEED_OWNER_NATIONAL_ID` / `SEED_OWNER_PASSWORD` env vars before seeding):

- Platform Admin: `0000000000` / `change-me-now`
- Pilot bakery Owner: `1111111111` / `change-me-now`

**Change these before any real deployment.**

## What's implemented so far (Phase 1)

- Tenant, User (with `Role`), and the full data model for Products, Tables,
  Order Items, Kitchen Tickets, Payments, Discounts, and Expenses
  (`prisma/schema.prisma`) — later phases build on this schema, it isn't
  expected to change shape much.
- Login (`POST /auth/login` with `nationalId` + `password`) issuing a JWT.
- Role/permission matrix enforced via `@RequirePermissions(...)` guards.
- Tenant management and staff-account creation, gated so that only a
  Platform Admin can assign roles until a tenant's
  `roleAssignmentDelegated` flag is turned on for its Owner.

## Phase 2

- Product catalog (`requiresKitchenTicket` / `trackQuantitySold` flags),
  gated behind `MANAGE_CATALOG` (Owner, Manager, Platform Admin).
- Tables, and `POST /tables/:id/merge` for the confirmed merge/move
  scenario — reassigns all open (non-paid, non-canceled) Order Items from
  one table to another, covering both "combine two tables" and "move a
  party."
- Order Items as the addressable, independently-billable unit: creating,
  editing and canceling are all blocked once an item leaves the `ORDERED`
  state (i.e. once it's been sent to the kitchen), enforcing the
  pre-kitchen-only edit rule from discovery.
- `getCurrentShift()` (`src/common/shift.util.ts`) derives MORNING/
  AFTERNOON from the clock via a configurable `SHIFT_BOUNDARY_HOUR` env
  var — the bakery's actual shift boundary wasn't specified, so this is a
  reasonable default to revisit, not a confirmed business rule.
- Verified live: shared-table ordering (two "parties" on one table, each
  item independently priced/tracked), the pre-kitchen edit lock (edit and
  cancel both rejected with 403 once an item is marked `SENT_TO_KITCHEN`),
  the table-merge flow (items move, source table's tab empties), and that
  a Cook account — which holds no permissions — is correctly blocked from
  every POS action.

Not yet implemented: Kitchen Ticket printing, Payments/Discounts/
Expenses, Reporting, and the frontend — tracked as later phases.
