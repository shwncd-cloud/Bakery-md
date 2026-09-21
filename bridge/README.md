# Bakery-MD print bridge

Runs at the bakery, on any always-on device on the same Wi-Fi network as
the kitchen ticket printer (a tablet, an old PC, a Raspberry Pi — nothing
special). It's the one piece of the whole system that talks to the
printer directly, and it exists because the backend usually won't be on
that network: a cloud-hosted server has no route into a router's private
LAN, so it can only queue tickets, not print them.

## How it works

1. Logs in to the backend as a dedicated staff account (any role with
   `SEND_TO_KITCHEN` — Waiter or Cashier).
2. Polls `GET /kitchen-tickets/pending` every few seconds.
3. Prints each one to the printer over the local network (raw ESC/POS
   over TCP, port 9100 by default).
4. Confirms success with `POST /kitchen-tickets/:id/mark-printed`.

If a print fails (printer off, out of paper, wrong IP), the ticket just
stays in the pending queue and gets retried on the next poll — nothing
is lost. If confirming success fails right after a successful print, the
ticket may print twice on the next cycle; that's an intentional tradeoff
(an extra copy is a minor annoyance, a silently dropped order is not).

## Setup

Requires Node.js 18+ (for built-in `fetch`) — nothing else. No
`npm install` needed; there are no dependencies.

```bash
cp .env.example .env
```

Edit `.env`:
- `API_BASE_URL` — the deployed backend's URL.
- `BRIDGE_NATIONAL_ID` / `BRIDGE_PASSWORD` — a dedicated staff account
  created for this purpose (not a real person). Create it the same way
  you'd create any staff account: `POST /users` as an Owner/Manager/
  Platform Admin, role `WAITER` or `CASHIER`, e.g. national ID
  `9999999999`, full name "Puente de Impresión".
- `PRINTER_HOST` / `PRINTER_PORT` — the printer's own IP address on the
  bakery's Wi-Fi (check the printer's network settings, not the router's).

Run it:

```bash
node src/index.js
```

Leave that running. For it to survive a reboot or an accidental window
close, run it as a background service — a process manager like `pm2`
(`npx pm2 start src/index.js --name bakery-bridge`) or a systemd/
Task Scheduler entry both work; any approach that restarts it
automatically is fine.

## Verified

Tested end-to-end against a live backend and a fake TCP printer listener
standing in for the real hardware: the bridge logged in, picked up a
backlog ticket immediately on startup, and picked up a freshly-sent
ticket within one poll interval — in both cases the printer received the
exact rendered ticket text plus the correct ESC/POS init and cut command
bytes, intact and unabridged, and the backend correctly showed the ticket
as printed afterward. The actual byte format hasn't been checked against
real printer hardware yet — verify the cut command works once one is
connected; it's a very commonly supported sequence but firmware varies.
