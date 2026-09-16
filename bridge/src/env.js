import { readFileSync } from 'node:fs';

/// Minimal .env loader - no dependency needed for something this small,
/// and it keeps the bridge runnable with zero `npm install` on whatever
/// old PC ends up sitting at the bakery counter.
export function loadEnvFile(path = '.env') {
  let contents;
  try {
    contents = readFileSync(path, 'utf8');
  } catch {
    return; // no .env file - fine if vars are set another way
  }

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
