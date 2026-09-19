import { Socket } from 'node:net';

const ESC_INIT = Buffer.from([0x1b, 0x40]);
// Typical ESC/POS full-cut sequence. Byte-exact command sets vary by
// printer model/firmware - verify against the actual printer and adjust
// if it doesn't cut, but most network thermal printers accept this.
const CUT = Buffer.from([0x1d, 0x56, 0x00]);
const CONNECT_TIMEOUT_MS = 5000;

/// Prints raw ESC/POS text to the printer on the local network. This is
/// the one piece of the whole system that talks to the printer directly -
/// by design, it only runs on a device physically at the bakery.
export function printToLocalPrinter(host, port, text) {
  return new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;

    const finish = (result) => {
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
        if (err) finish({ success: false, error: err.message });
        else finish({ success: true });
      });
    });
  });
}
