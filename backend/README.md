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
- `PATCH /users/:id` (same `ASSIGN_ROLES` gate) to correct a role
  assigned by mistake or deactivate an account — added after real-world
  use surfaced that there was no way to fix a wrong role short of
  deleting and recreating the user. Refuses to touch Platform Admin
  accounts either as the target or the requested role. Verified live:
  created a user as the wrong role, corrected it, confirmed promoting to
  Platform Admin is rejected (400), confirmed a Waiter is blocked (403),
  and confirmed deactivation works.

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
  prep into one ticket and locks those items to `SENT_TO_KITCHEN`. Items
  that don't require prep (bakery goods, beverages) are left alone and
  stay editable.
- Verified live: a table with one kitchen item and one non-kitchen item
  sends only the kitchen item, the non-kitchen item stays `ORDERED` and
  editable, and sending an already-cleared table is rejected with 400.

**Reworked for deployment** (see root `DEPLOYMENT.md`): the backend never
talks to the printer directly — a cloud-hosted server has no route into
the bakery's local network. It only queues tickets (`printedAt` stays
null); `GET /kitchen-tickets/pending` and `POST
/kitchen-tickets/:id/mark-printed` are polled/called by the local print
bridge (`bridge/`), which is the only thing that ever opens a TCP
connection to the printer. `POST /kitchen-tickets/:id/reprint` now means
"re-queue" — it clears `printedAt` back to null so the bridge's next poll
picks it up again, whether it never printed or the copy needs reprinting.
Verified live: send-to-kitchen queues without attempting to print, the
pending endpoint returns the exact rendered ticket text, mark-printed
clears it from the pending list, and reprint re-queues it.

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

## Phase 5

- `GET /reports/{summary,products,waiters,expenses}?period=day|week|month|quarter|semester|year&date=...`,
  gated behind `VIEW_DASHBOARD` (Owner, Manager). "Sales" is money actually
  collected (`Payment.createdAt`), not orders placed - matching the
  cash-accounting mental model from discovery. Per-item discounts are
  applied when computing product/waiter revenue
  (`src/common/order-item-pricing.util.ts`), so these numbers match what
  was actually charged.
- `User.email` (optional) added for Owner/Manager - needed to have
  somewhere to send the monthly summary.
- `MonthlySummaryService` (`src/reports/monthly-summary.service.ts`) runs
  automatically on the 1st of each month via `@nestjs/schedule`, and can
  be triggered on demand with `POST /reports/monthly-summary/trigger` to
  check or resend without waiting for the schedule. Reports on the
  previous calendar month, per Owner/Manager with an email on file.
- `EmailService` (`src/email/email.service.ts`) mirrors the printer
  pattern: real SMTP when `SMTP_HOST` is configured, otherwise logs the
  email instead of failing, so this runs in dev/CI without mail
  credentials.
- Verified live: a Waiter is blocked from the dashboard (403); an Owner's
  daily summary, product breakdown, waiter performance, and expense
  breakdown all compute correctly against real Payment/Expense data
  (including the 10% discount from Phase 4 flowing through correctly);
  the monthly trigger correctly scopes to the *previous* calendar month
  (verified $0 for August when all test data was from September) and logs
  a fully rendered simulated email.

Not yet implemented: the frontend — tracked as the final phase.

## Docker

`Dockerfile` is a multi-stage build (installs, generates the Prisma
client, builds, then a slim runtime image) that runs `prisma migrate
deploy` before starting. Verified locally: built and run against a real
Postgres, served a real authenticated login request. Includes `openssl`
in both stages — Prisma's query engine needs it on Alpine (musl) or it
silently guesses an engine version and can fail at runtime.

## Production safety guards

With `NODE_ENV=production` (set in the Dockerfile's runtime stage), the
app refuses to start unless `JWT_SECRET` has been changed from the
`change-me-in-production` placeholder — verified directly: it boots fine
in dev with the default, boots fine in production with a real secret,
and refuses to boot in production with either the default or a missing
secret. CORS is also restrictable via `CORS_ORIGIN` (defaults to `*`,
which is fine for dev but should be set to the deployed frontend's exact
URL in production).

## Owner permissions expanded (post-launch)

Real usage surfaced that the Owner role, as originally scoped
(`VIEW_DASHBOARD` + `MANAGE_CATALOG` only), couldn't help out
operationally - a real small-bakery owner routinely covers the floor
when short-staffed. Owner now also has `TAKE_ORDER`,
`EDIT_PRE_KITCHEN_ITEM`, `SEND_TO_KITCHEN`, `APPLY_DISCOUNT`,
`HANDLE_PAYMENT`, and `ENTER_EXPENSE` - everything Cashier has, plus the
dashboard/catalog access unique to Owner. `ASSIGN_ROLES` remains the one
deliberate exception: staff-account management stays Platform-Admin-only
(or explicitly delegated) regardless of this change, since "can help on
the floor" and "can manage who works here" are different questions.

## Product categories (post-launch)

Added `Product.category` (nullable free-text string, migration
`add_product_category`) so the frontend's order-taking product picker
can group items instead of showing one flat list as the menu grows.
Deliberately not a separate normalized Category entity - a small
bakery's categories are few and change rarely enough that owner-typed
free text is simpler than a categories CRUD to maintain. `CreateProductDto`/
`UpdateProductDto` both accept it as optional; existing products without
one just show as uncategorized.

## Payment methods: CASH/NEQUI/DAVIPLATA (post-launch)

Replaced the generic `TRANSFER` enum value with the two Colombian
digital wallets this bakery actually gets paid through - `NEQUI` and
`DAVIPLATA` - since a generic "bank transfer" doesn't reflect how
reconciliation actually works here (different wallet, different
destination account). Postgres has no built-in way to remove an enum
value, so migration `update_payment_methods` recreates the type and
remaps any existing `TRANSFER` rows to `DAVIPLATA` rather than assuming
none exist - verified against the local database, which genuinely had
one historical `TRANSFER` payment from earlier testing, and it came out
the other side as `DAVIPLATA` with everything else about that row
untouched.

## Expenses: provider + voucher number (post-launch)

Renamed `Expense.category` to `Expense.provider` and added an optional
`voucherNumber` field. Real usage showed the free-text "category" field
was actually always being used to record who the money went to (a
supplier name), not a spending category - and the bakery keeps the
paper receipt/voucher a supplier hands over at time of payment, so
having its number on file matters for reconciling an expense back to
that physical proof later. Migration `expense_provider_and_voucher`
does a plain column rename (`category` → `provider`, no enum involved)
plus an additive nullable column - verified against the local database,
which had two real expense rows, and both came out the other side with
their values intact under the new column name. `CreateExpenseDto`,
`ExpensesService`, and both report paths (`ReportsService.getExpenseBreakdown`,
`MonthlySummaryService`) all use `provider`/`voucherNumber` now.

## Custom orders (post-launch)

Added a `CustomOrder` model for made-to-order requests that don't fit the
walk-in table flow - a special cake, a wholesale quantity of a regular
product - taken ahead of a delivery date rather than served immediately.
Deliberately a separate model from `OrderItem` rather than a table/order
extension: it has no table, and needs a due date and deposit that
per-item table billing has no place for. Fields: `productId` (an
existing catalog product), `quantity`, an optional free-text
`description` (flavor, message, size), `depositCents` (defaults to 0 -
not every custom order takes a deposit), `deliveryDate`, and a
`fulfilled` boolean toggled once delivered. `createdAt` doubles as "date
the order was placed" without a separate field.

New `MANAGE_CUSTOM_ORDERS` permission, granted to the same roles as
`ENTER_EXPENSE` (Cashier, Manager, Owner) since taking a deposit is a
money-handling action like entering an expense. `POST /custom-orders`,
`GET /custom-orders` (sorted by delivery date, soonest first), and
`PATCH /custom-orders/:id` (toggles `fulfilled`) - migration
`custom_orders` creates the table fresh, no existing data to migrate.
Verified live: created a custom order with a description and deposit,
confirmed it renders correctly in the list, and confirmed toggling
"Entregado" updates immediately and persists.

## Custom orders: free-text product (post-launch)

Changed `CustomOrder.productId` (a required catalog `Product` FK) to a
free-text `productName` field. A one-off custom cake is often not, and
doesn't need to be, an existing menu item - requiring it to match the
catalog forced picking the closest existing product as a stand-in,
which was the wrong model. Migration `custom_order_free_text_product`
adds the new column, backfills it from the linked product's name for
any existing rows, then drops the old column and foreign key -
verified against the local database, which had a real custom order
row, and it came out the other side with the same product name
preserved as plain text.

## Order item notes + faster order-taking search (post-launch)

Real usage surfaced that hunting through the category-grouped product
dropdown was slowing down order-taking. Rather than change how products
are browsed everywhere, added `OrderItem.note` (nullable free text) so
this became primarily a frontend change - see the frontend README for
the search UI. `note` flows through `CreateOrderItemDto` into
`OrderItemsService.create()`, and `KitchenTicketsService.renderTicketText()`
appends it after the item name (`1x Desayuno con Huevos - Sin cebolla,
extra caliente`) so instructions like "sin cebolla" or "para llevar"
actually reach the kitchen ticket, not just the POS screen. Migration
`order_item_note` is a single additive nullable column. Verified live:
created an order item with a note through the API, confirmed it's
stored and returned correctly, sent it to the kitchen, and confirmed
the note appears in the rendered ticket text.

## Partial-quantity payments (post-launch)

Real usage surfaced that paying for one line of a multi-unit item (e.g.
2 coffees) settled the whole line at once - there was no way to collect
for just 1 of them and leave the other open for someone else to pay
later. `POST /payments` now takes `items: [{ orderItemId, quantity }]`
instead of a flat `orderItemIds` array. When `quantity` equals the
item's full remaining quantity, behavior is unchanged (marks it PAID).
When it's less, the service splits the line: the original row shrinks
by the paid quantity and stays open (same status, same
`kitchenTicketId` if it was already sent), and a new row is created for
just the paid units, linked to the new payment. Partially paying a
discounted item is rejected (400) - a discount is recorded against the
whole line, so splitting it would make "how much of the discount
applies to which half" ambiguous; pay the full quantity or remove the
discount first. Verified live via direct API calls: paid 1 of 2 units,
confirmed the payment settled for the correct partial amount, confirmed
the remaining 1 unit stayed `ORDERED` and unpaid on the table, confirmed
overpaying past the available quantity is rejected (400), and confirmed
partial payment on a discounted item is rejected (400).
