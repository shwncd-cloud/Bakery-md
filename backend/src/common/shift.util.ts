import { Shift } from '@prisma/client';
import { bogotaCurrentHour } from './timezone.util';

/// Discovery confirmed a single till shared across two shifts, but not
/// their exact boundary. Derived from the clock rather than asked of staff
/// per order, using a configurable hour so the real cutoff can be set
/// without a code change - revisit SHIFT_BOUNDARY_HOUR once the owner
/// confirms actual shift times. Uses Bogotá wall-clock time (see
/// timezone.util), not the server's own timezone.
export function getCurrentShift(): Shift {
  const boundaryHour = Number(process.env.SHIFT_BOUNDARY_HOUR ?? 14);
  const currentHour = bogotaCurrentHour();
  return currentHour < boundaryHour ? Shift.MORNING : Shift.AFTERNOON;
}
