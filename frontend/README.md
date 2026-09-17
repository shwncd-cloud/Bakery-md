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
  values and submit label - rather than duplicating the form.

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

## Docker

`Dockerfile` is a portable fallback for self-hosting the built static
site behind nginx (with SPA fallback routing for react-router). The
primary deploy path is a static host like Cloudflare Pages, which builds
straight from the repo and doesn't need this file — see root
`DEPLOYMENT.md`. Verified locally: built, served the app, and confirmed a
deep link falls back to `index.html` instead of 404ing.
