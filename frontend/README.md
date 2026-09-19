# Bakery-MD frontend

React + Vite PWA, styled to the Hornillas brand board (Cormorant Garamond
display font, Raleway body font, cream/terracotta/gold palette).

## Setup

```bash
cp .env.example .env   # point VITE_API_BASE_URL at the backend if not localhost:3000
npm install
npm run dev
```

## Screens

- **Login** — national ID + password, matching the backend's login model.
- **Floor** (Waiter/Cashier) — table grid → table detail. Add items,
  edit/cancel while `ORDERED` (locked once sent to kitchen), send eligible
  items to the kitchen printer, merge tables, and — Cashier only — apply a
  discount (mandatory reason) and pay one or more selected items in a
  single payment. This is what makes per-item billing on a shared table
  real in the UI: check exactly the items one party ordered, charge just
  those.
- **Dashboard** (Owner/Manager) — period selector (day through year),
  sales/expenses/net, product and waiter breakdowns, expense-by-category,
  and a button to trigger the monthly summary email on demand.
- **Catálogo** (Owner/Manager, via a nav link next to Panel) — add,
  edit, and deactivate products (price entered in plain pesos, converted
  to `unitPriceCents` before it hits the API), and add tables. The
  backend has supported this since Phase 2 (`MANAGE_CATALOG`, including
  `PATCH /products/:id`); the frontend just never had a screen for it
  until real production data needed to go in. The add and edit forms
  share one `ProductForm` component - same fields, different initial
  values and submit label - rather than duplicating the form. Products
  also carry an optional free-text `category` (with a `<datalist>`
  suggesting categories already in use, so names stay consistent instead
  of drifting between "Panadería"/"panaderia"/etc.) — the order-taking
  product picker (`AddItemModal`) groups by this category via
  `<optgroup>`, with uncategorized items falling into a catch-all "Otros"
  group at the end, so the picker stays usable as the menu grows past a
  handful of items.
- **Gastos** (Cashier/Manager, via a nav link) — record a daily expense
  (category, amount in pesos, optional description) and see the running
  list. Same gap as Catálogo had: the backend supported `POST /expenses`
  since Phase 4, but nothing in the frontend ever exposed it - only the
  Owner's read-only expense-breakdown report existed, with no way to
  actually enter one. Note this is gated on `ENTER_EXPENSE`, which the
  Owner role does *not* have (only Cashier and Manager do, per the
  original permission matrix) - so the Owner won't see this link, by
  design, not by omission.

All screen visibility and action buttons are gated by
`src/auth/permissions.ts`, a UI-only mirror of the backend's role matrix —
it only hides/shows controls; the API is the real enforcement point.

## Offline behavior

`src/offline/` implements the "queue and sync" resilience the
architecture called for, scoped to exactly the two actions flagged as
needing it: taking an order and recording a payment. If either fails due
to a network error, it's queued in `localStorage`, shown immediately in
the UI with a "pendiente de enviar" badge, and retried automatically on
the `online` event and every 15s until it succeeds. This is not a general
offline mode - browsing/reporting still requires a connection.

## Verified live (Phase 6)

Ran both dev servers together and drove every screen with Playwright
against the real backend: login, the floor grid with live open-item
counts, adding an item, the pre-kitchen lock (locked items hide their
edit controls), cashier-only discount and per-item payment on a
shared-table scenario, and the offline queue (item added while offline,
shown as pending, auto-synced on reconnect with the outbox left empty
afterward). Two real bugs were found and fixed this way: `GET
/tables/:id/items` and the order-item update endpoint weren't including
the `discounts` relation, so an applied discount was invisible in the UI
despite existing correctly in the database.

## Owner permissions expanded (post-launch)

Owner now mirrors Cashier's full operational permission set (order
taking, kitchen, discounts, payment, expenses) in addition to Panel and
Catálogo - see the backend README for why. Routing changed to match:
`/` now prioritizes the Dashboard over the Floor when a role has both
(previously Floor always won), and a separate `/floor` route plus a
"Mesas" nav link exist specifically for roles - like Owner - that need
an explicit way to reach the floor rather than landing there by default.
Verified live: Owner still lands on the Dashboard on login, all four nav
links (Panel, Mesas, Catálogo, Gastos) appear, and taking a real order
from the floor as the Owner works correctly (add item, discount, send to
kitchen, payment checkbox all present).

## Payment methods (post-launch)

The cashier's payment dropdown now offers Efectivo, Nequi, and
Daviplata (replacing the generic Transferencia option) - matches how
this bakery actually gets paid. `PaymentMethod` is a single shared type
in `api/types.ts` used by the client, `TableDetail`, and the payment
modal, rather than repeating the literal union in each. Verified live:
all three options render, and a real payment made with Nequi is
recorded correctly.

## Expenses: provider + voucher number (post-launch)

The Gastos form's "Proveedor" field (previously "Categoría") now
reflects what it was actually always used for - who the money went to -
and a new optional "Número de comprobante" field records the
receipt/voucher number the supplier hands over, for matching an expense
back to its physical proof later. `Expense`/`ExpenseBreakdownRow` types,
`api/client.ts`, `ExpensesPage`, and the Dashboard's "Gastos por
proveedor" card all updated to match the backend rename - see the
backend README for the migration details. Verified live: added a real
expense with both a provider name and a voucher number, confirmed it
displays correctly in the Gastos list alongside pre-existing rows
(rename preserved their data), and confirmed the Dashboard's expense
card still totals correctly under the new field name.

## Custom orders (post-launch)

New "Pedidos especiales" page/nav link (`CustomOrdersPage`, gated by the
new `MANAGE_CUSTOM_ORDERS` permission) for made-to-order requests taken
ahead of a delivery date - a special cake, a wholesale quantity - rather
than served immediately from a table. Form captures product, quantity,
description, deposit, and delivery date; the list shows both the date
the order was placed and the delivery date, and a checkbox toggles
"Entregado" once fulfilled. Verified live: created a custom order with a
description and deposit, confirmed it displays correctly, and confirmed
toggling delivered updates immediately.

## Custom orders: free-text product (post-launch)

The "Producto" field on a custom order is now a plain text input
(with a `datalist` suggesting existing catalog product names for
convenience) instead of a dropdown limited to the catalog - a one-off
custom cake often isn't an existing menu item, and forcing a pick from
the catalog meant choosing the closest stand-in rather than describing
what was actually ordered. Matches the backend's `productName` rename -
see the backend README. Verified live: no `<select>` remains on the
form, and a product name that isn't in the catalog at all ("Torta de
tres leches personalizada") saves and displays correctly alongside an
existing catalog-linked order.

## Order item notes + faster order-taking search (post-launch)

Real usage surfaced that `AddItemModal`'s category-grouped dropdown was
slowing down order-taking - scanning through a long `<select>` under
time pressure doesn't scale as the menu grows. Replaced it with
search-as-you-type: an autofocused text input filters the product list
by substring match on name (case-insensitive, up to 8 results shown),
and picking a result replaces the input with a "Producto - precio" chip
plus a "Cambiar" button to search again. Also added an optional "Nota"
field (e.g. "sin cebolla", "para llevar") that shows up under the item
in the table's order list and flows through to the kitchen ticket - see
the backend README. Verified live: typing "jugo" correctly surfaced
only the matching product, and an item added with a note displayed
correctly both in the table view and (via a direct API check) in the
rendered kitchen ticket text.

## Partial-quantity payments (post-launch)

Selecting a multi-unit item for payment (the checkbox in `TableDetail`)
no longer commits the whole line - when the item's quantity is more than
1 and it has no discount, a quantity stepper appears next to the
checkbox (defaulting to the full quantity, same as before) letting the
cashier collect for fewer units and leave the rest open. A "Cobrando X
de Y" note appears under the item while a partial quantity is selected,
and the "Cobrar seleccionados" total reflects just the selected units.
`api.createPayment` now takes `{ item, quantity }` pairs instead of a
flat list of IDs, matching the backend's new `items` shape - see the
backend README for the split logic. Verified live: selected 1 of a
3-unit line, confirmed the pay button showed the correct partial total,
and confirmed that after paying, the remaining 2 units stayed on the
table as an open, unpaid line.

## Docker

`Dockerfile` is a portable fallback for self-hosting the built static
site behind nginx (with SPA fallback routing for react-router). The
primary deploy path is a static host like Cloudflare Pages, which builds
straight from the repo and doesn't need this file — see root
`DEPLOYMENT.md`. Verified locally: built, served the app, and confirmed a
deep link falls back to `index.html` instead of 404ing.
