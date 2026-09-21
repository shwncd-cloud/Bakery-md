/// Colombia is UTC-5 year-round (no DST), and this pilot's only tenant is
/// there. A fixed offset computed here is simpler and more reliable than
/// depending on the host's TZ configuration, which varies by deploy target
/// (Railway's containers default to UTC) and silently shifts every "today"
/// boundary by 5 hours if unset. Revisit with a real timezone library once
/// tenants outside Colombia exist.
const BOGOTA_UTC_OFFSET_HOURS = 5;

export const BOGOTA_TIME_ZONE = 'America/Bogota';

/// A Date whose UTC-getters/setters (getUTCHours, getUTCDate, setUTCDate,
/// ...) read and write as Bogotá wall-clock time, regardless of the
/// server's own timezone. Callers must use ONLY UTC accessors on the
/// result - local accessors (getHours, setDate, ...) would reintroduce a
/// dependency on the server's timezone and defeat the point of this.
export function bogotaWallClock(reference: Date = new Date()): Date {
  return new Date(reference.getTime() - BOGOTA_UTC_OFFSET_HOURS * 3600_000);
}

/// Converts a Date produced by (and possibly mutated via UTC accessors
/// from) bogotaWallClock back into the real UTC instant it represents.
export function fromBogotaWallClock(wallClock: Date): Date {
  return new Date(wallClock.getTime() + BOGOTA_UTC_OFFSET_HOURS * 3600_000);
}

/// The current hour in Bogotá wall-clock time (0-23), independent of the
/// server's own timezone.
export function bogotaCurrentHour(reference: Date = new Date()): number {
  return bogotaWallClock(reference).getUTCHours();
}
