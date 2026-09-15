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

Not yet implemented: Catalog, Tables/Orders, Kitchen Ticket printing,
Payments/Discounts/Expenses, Reporting, and the frontend — tracked as
later phases.
