# Bakery-md

Cloud POS for bakeries, coffee shops and small restaurants — built for a
real pilot bakery in Colombia, architected as a multi-tenant SaaS platform
from day one.

## Structure

- `backend/` — NestJS + Prisma + PostgreSQL API. See `backend/README.md`
  for setup and what's implemented so far.
- `frontend/` — React + Vite PWA, styled to the Hornillas brand. See
  `frontend/README.md`.
- `bridge/` — small standalone service that runs at the bakery and
  relays kitchen tickets from the cloud backend to the local printer
  (the backend has no route into the bakery's local network). See
  `bridge/README.md`.

See **`DEPLOYMENT.md`** for how to actually host this and reach it from
the bakery.

## Status

Implementation is proceeding in phases, each reviewed before the next
starts:

1. ✅ Backend scaffold + Identity/Tenant/Auth module
2. ✅ Catalog + Tables/Orders modules
3. ✅ Kitchen Ticket + printer integration
4. ✅ Payments + Discounts + Expenses modules
5. ✅ Reporting module + monthly email summary
6. ✅ PWA frontend (login, floor/order-taking, cashier payment, owner dashboard, offline queue)
7. ✅ Local print bridge (cloud backend ↔ local printer)

8. ✅ Production Dockerfiles (verified by building and running both containers)
9. ✅ Deployment documentation (`DEPLOYMENT.md`)

All six design phases, the print bridge, and the path to a real
deployment are complete. Not yet done: an actual production deployment
(this has all been built and verified locally/in containers, not hosted
anywhere reachable yet), real production data (catalog, tables, staff),
and the printer hasn't been tested against real hardware.
