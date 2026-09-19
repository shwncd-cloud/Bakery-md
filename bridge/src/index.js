import { ApiClient } from './apiClient.js';
import { loadEnvFile } from './env.js';
import { printToLocalPrinter } from './printer.js';

loadEnvFile();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name} (see .env.example)`);
    process.exit(1);
  }
  return value;
}

const apiBaseUrl = requireEnv('API_BASE_URL');
const nationalId = requireEnv('BRIDGE_NATIONAL_ID');
const password = requireEnv('BRIDGE_PASSWORD');
const printerHost = requireEnv('PRINTER_HOST');
const printerPort = Number(process.env.PRINTER_PORT ?? 9100);
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS ?? 3000);

const api = new ApiClient(apiBaseUrl, nationalId, password);

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/// Print failures are left in the pending queue and retried on the next
/// poll rather than raised as errors - a jammed printer shouldn't crash
/// the bridge, it should just keep trying. If mark-printed itself fails
/// after a successful print, the ticket gets printed again next cycle:
/// an occasional duplicate copy is a much smaller problem than a
/// silently lost order, so that tradeoff is intentional.
async function pollOnce() {
  const tickets = await api.getPendingTickets();
  for (const ticket of tickets) {
    const result = await printToLocalPrinter(printerHost, printerPort, ticket.ticketText);
    if (result.success) {
      await api.markPrinted(ticket.id);
      log(`Printed ticket ${ticket.id} (table ${ticket.table?.label ?? ticket.tableId})`);
    } else {
      log(`Failed to print ticket ${ticket.id}: ${result.error} - will retry next poll`);
    }
  }
}

async function loop() {
  try {
    await pollOnce();
  } catch (err) {
    log(`Poll error: ${err.message}`);
  }
  setTimeout(loop, pollIntervalMs);
}

log(`Bakery-MD print bridge starting. Backend: ${apiBaseUrl}, printer: ${printerHost}:${printerPort}`);
loop();
