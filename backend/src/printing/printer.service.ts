import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'net';

export interface PrintResult {
  success: boolean;
  error?: string;
}

const ESC_INIT = Buffer.from([0x1b, 0x40]);
// Typical ESC/POS full-cut sequence. Byte-exact command sets vary by
// printer model/firmware - verify against the actual Wi-Fi thermal
// printer once one is purchased; this is a reasonable default, not a
// tested one.
const CUT = Buffer.from([0x1d, 0x56, 0x00]);
const CONNECT_TIMEOUT_MS = 5000;

/// Single abstraction point for "print a ticket," per the architecture
/// decision to treat printing as a capability the app calls, not a fixed
/// device assumption. Today: one Wi-Fi/network ESC/POS printer, configured
/// via PRINTER_HOST/PRINTER_PORT. Adding more printers later means
/// extending this service, not rewriting the modules that call it.
@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);

  async print(text: string): Promise<PrintResult> {
    const host = process.env.PRINTER_HOST;
    const port = Number(process.env.PRINTER_PORT ?? 9100);

    if (!host) {
      this.logger.warn(
        `No PRINTER_HOST configured - simulating print:\n${text}`,
      );
      return { success: true };
    }

    return new Promise<PrintResult>((resolve) => {
      const socket = new Socket();
      let settled = false;

      const finish = (result: PrintResult) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(CONNECT_TIMEOUT_MS);
      socket.once('timeout', () => finish({ success: false, error: 'Printer connection timed out' }));
      socket.once('error', (err) => finish({ success: false, error: err.message }));

      socket.connect(port, host, () => {
        const payload = Buffer.concat([ESC_INIT, Buffer.from(text, 'ascii'), Buffer.from('\n\n\n'), CUT]);
        socket.write(payload, (err) => {
          if (err) {
            finish({ success: false, error: err.message });
          } else {
            finish({ success: true });
          }
        });
      });
    });
  }
}
