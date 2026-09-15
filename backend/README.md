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

## Phase 3

- Kitchen tickets: `POST /kitchen-tickets { tableId }` bundles every
  currently-`ORDERED` item on that table whose product requires kitchen
  prep into one ticket, locks those items to `SENT_TO_KITCHEN`, and
  attempts to print. Items that don't require prep (bakery goods,
  beverages) are left alone and stay editable.
- `PrinterService` (`src/printing/printer.service.ts`) is the single
  abstraction point for "print a ticket" per the architecture decision —
  today it's one Wi-Fi/network ESC/POS printer (`PRINTER_HOST` /
  `PRINTER_PORT`, raw TCP on port 9100). With no `PRINTER_HOST`
  configured it logs the ticket instead of failing, so this runs without
  physical hardware in dev/CI.
- Printing is best-effort: a failed print does not lose the order. The
  `KitchenTicket` row is always created and the items are always locked;
  `printedAt` stays null on failure and `POST /kitchen-tickets/:id/reprint`
  retries — matching "if another printout is needed, it can be requested
  through the app."
- Verified live: a table with one kitchen item and one non-kitchen item
  sends only the kitchen item, the non-kitchen item stays `ORDERED` and
  editable, the simulated printer logs the exact ticket text, reprint
  works, and sending an already-cleared table is rejected with 400.

## Phase 4

- `POST /order-items/:orderItemId/discounts` — PERCENT or FIXED, mandatory
  `reason`, gated behind `APPLY_DISCOUNT` (Cashier+). At most one discount
  per item in v1; a second attempt is rejected rather than stacking.
- `POST /payments { orderItemIds, method }` settles one or more items in a
  single payment. This is what makes per-item billing on a shared table
  real: a cashier can pay for exactly the items one party ordered, leaving
  the rest of the table's tab open. Rejects if any item is already paid
  or canceled. Amount is computed from `orderItemLineTotalCents`
  (`src/common/order-item-pricing.util.ts`), applying each item's
  discount.
- `POST /expenses` / `GET /expenses`, gated behind `ENTER_EXPENSE`
  (Cashier, Manager — not Owner, matching the Phase 1 permission matrix).
- Verified live: a waiter is blocked from applying a discount (403), a
  cashier's 10% discount on a 2-coffee item computes correctly (6000 →
  5400 cents), paying only one item on a two-item shared table leaves the
  other open, double-discounting and double-paying are both rejected
  (400), and an Owner is correctly blocked from entering an expense (403).

Not yet implemented: Reporting and the frontend — tracked as later phases.
