# Deploying Bakery-MD

This is a step-by-step guide to taking the app from "running on a
developer's machine" to "reachable by the bakery, for real." It assumes
no prior hosting experience.

## Architecture

```
                    ┌─────────────────────┐
   staff phones/    │   Cloudflare Pages   │   owner's phone/
   tablets  ───────▶│   (frontend, PWA)    │◀─── laptop, anywhere
   at the bakery     └──────────┬───────────┘
                                 │ HTTPS
                                 ▼
                      ┌─────────────────────┐
                      │       Railway        │
                      │  backend (NestJS)    │
                      │  + PostgreSQL         │
                      └──────────┬───────────┘
                                 │ HTTPS (polling)
                                 ▼
                    ┌─────────────────────────┐
                    │  print bridge (bridge/)  │  ← runs at the bakery,
                    │  on a device at the      │     same Wi-Fi as the
                    │  bakery                  │     printer
                    └──────────┬───────────────┘
                                 │ local network (TCP)
                                 ▼
                         kitchen printer
```

The backend and database are cloud-hosted (so the owner can check the
dashboard from anywhere, and so this can scale to more tenants later).
The one thing that *can't* be cloud-hosted is the kitchen printer
connection — see `bridge/README.md` for why. Everything else (staff
taking orders, cashier payments, owner's dashboard) works from any
browser, anywhere, once deployed.

## Prerequisites

- A GitHub account with access to this repo (you have this already).
- A Railway account (railway.app) — free to create, pay-as-you-go
  pricing, no credit card required to start exploring.
- A Cloudflare account (cloudflare.com) — free tier is enough for this.
- A device that will stay at the bakery on the same Wi-Fi as the
  printer, for the print bridge (an old laptop, a cheap mini-PC, even a
  phone running Termux — anything that can stay on and run Node.js).

## Step 1: Deploy the backend + database (Railway)

1. In Railway, create a new project.
2. Add a **PostgreSQL** database to the project (Railway's "+ New" →
   "Database" → "PostgreSQL"). Railway provisions it automatically.
3. Add a second service: "+ New" → "GitHub Repo" → select this repo.
   When asked for the root directory, set it to `backend`. Railway will
   detect `backend/Dockerfile` and build from it.
4. In the backend service's **Variables** tab, set:
   - `DATABASE_URL` → reference the Postgres service's connection string
     (Railway's variable picker offers this — usually
     `${{Postgres.DATABASE_URL}}`).
   - `JWT_SECRET` → a long random string. Generate one with
     `openssl rand -base64 48` on any machine, or any password
     generator set to 48+ characters. **Do not use the placeholder from
     `.env.example`** — the app will refuse to start in production if
     you do (see `backend/README.md`).
   - `JWT_EXPIRES_IN` → `12h` (or leave default).
   - `NODE_ENV` → `production`.
   - `CORS_ORIGIN` → leave blank for now; come back and set it after
     Step 3, once you have the frontend's URL.
   - `SMTP_HOST` etc. → leave blank for now (the monthly email will log
     instead of sending — fine for the pilot; fill these in later with
     real SMTP credentials, e.g. from your email provider, when you
     want the owner to actually receive it).
5. Deploy. Railway builds the Docker image and starts the container; the
   Dockerfile's `CMD` runs `prisma migrate deploy` automatically before
   starting the server, so the database schema is created on first
   deploy with no manual step.
6. Once it's running, note the public URL Railway assigns (Settings →
   Networking → "Generate Domain" if one isn't already there).

## Step 2: Seed the database

The backend needs a Platform Admin, the pilot tenant, and its Owner
before anyone can log in. Run the seed script once, using Railway's CLI
or its "Run a command" feature against the deployed service, with real
values (don't leave the sample password/email from `.env.example`):

```bash
SEED_ADMIN_NATIONAL_ID=<your real ID or a chosen admin ID> \
SEED_ADMIN_PASSWORD=<a strong password> \
SEED_OWNER_NATIONAL_ID=<the bakery owner's real ID> \
SEED_OWNER_PASSWORD=<a strong password> \
SEED_OWNER_EMAIL=<the owner's real email> \
npm run prisma:seed
```

Write down the Platform Admin and Owner credentials somewhere safe — you
(as Platform Admin) will use yours to create the real staff accounts and
product catalog; the Owner will use theirs to check the dashboard.

## Step 3: Deploy the frontend (Cloudflare Pages)

1. In Cloudflare, go to Workers & Pages → Create → Pages → connect to
   this GitHub repo.
2. Set the build configuration:
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Add an environment variable: `VITE_API_BASE_URL` = the Railway URL
   from Step 1.
4. Deploy. Cloudflare gives you a public HTTPS URL immediately, and will
   auto-redeploy on every push to this branch from now on.
5. **Go back to Railway** and set `CORS_ORIGIN` on the backend service to
   this exact Cloudflare Pages URL, then redeploy the backend so it
   takes effect.

At this point the app is reachable from any browser, anywhere — the
owner can check the dashboard from home, and staff can use it from the
bakery's own Wi-Fi or phone data.

## Step 4: Set up the print bridge

On a device at the bakery, on the same Wi-Fi as the printer:

1. Install Node.js 18+ if it isn't already there.
2. Copy the `bridge/` folder to that device (or `git clone` the repo).
3. Follow `bridge/README.md` — set `API_BASE_URL` to the Railway URL,
   create a dedicated bridge staff account (as Platform Admin, via
   `POST /users`), and set `PRINTER_HOST` to the printer's own IP
   address on the Wi-Fi network.
4. Run it, and set it up to restart automatically (see the README for
   `pm2` or an OS-level service).

## Step 5: Before this touches real orders

- [ ] Real product catalog entered (replace any test products).
- [ ] Real tables entered (matching the bakery's actual 9 tables).
- [ ] Real staff accounts created (cashier, both waiters, cook) with
      their own passwords — not shared with the seed credentials.
- [ ] Owner's monthly-email delegation decided: role assignment stays
      Platform-Admin-only unless you explicitly turn on
      `roleAssignmentDelegated` for the tenant (see backend README).
- [ ] SMTP configured with real credentials if you want the monthly
      email to actually send, not just log.
- [ ] Printer's real IP address confirmed and the bridge tested against
      the actual hardware (the ESC/POS cut command is a common default
      but hasn't been verified against your specific printer model).
- [ ] DIAN electronic-invoicing question resolved with an accountant —
      this was explicitly deferred during design and is a legal
      question, not a technical one.
- [ ] Run it alongside the paper system for a few days before switching
      over completely.

## Ongoing deploys

Both Railway and Cloudflare Pages watch this GitHub branch. Any commit
pushed here redeploys automatically — no manual steps needed for future
changes, beyond the one-time setup above.
