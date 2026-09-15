# Bakery-md

Cloud POS for bakeries, coffee shops and small restaurants — built for a
real pilot bakery in Colombia, architected as a multi-tenant SaaS platform
from day one.

## Structure

- `backend/` — NestJS + Prisma + PostgreSQL API. See `backend/README.md`
  for setup and what's implemented so far.
- `frontend/` — React + Vite PWA, styled to the Hornillas brand. See
  `frontend/README.md`.

## Status

Implementation is proceeding in phases, each reviewed before the next
starts:

1. ✅ Backend scaffold + Identity/Tenant/Auth module
2. ✅ Catalog + Tables/Orders modules
3. ✅ Kitchen Ticket + printer integration
4. ✅ Payments + Discounts + Expenses modules
5. ✅ Reporting module + monthly email summary
6. ✅ PWA frontend (login, floor/order-taking, cashier payment, owner dashboard, offline queue)

All six phases of the initial design are complete and verified live
end-to-end, backend and frontend together.
