import { bogotaWallClock, fromBogotaWallClock } from './timezone.util';

const PLAIN_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/// Parses an optional query-string date. A plain "YYYY-MM-DD" (as a date
/// picker sends) is anchored to Bogotá noon, not UTC midnight - the
/// default `new Date(str)` parsing would otherwise land on the *previous*
/// Bogotá day once getPeriodRange converts it, since Bogotá is UTC-5.
/// Anything else (a full ISO timestamp) is parsed as-is.
export function parseReportDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const match = PLAIN_DATE_PATTERN.exec(value);
  if (!match) return new Date(value);
  const [, year, month, day] = match;
  return fromBogotaWallClock(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12)));
}

export type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year';

export const REPORT_PERIODS: ReportPeriod[] = ['day', 'week', 'month', 'quarter', 'semester', 'year'];

/// The owner asked for sales/expenses/product figures at every one of
/// these granularities. Boundaries are computed in Bogotá wall-clock time
/// (see timezone.util) so "day" actually means 00:00-23:59 Bogotá time,
/// not the server's own midnight.
export function getPeriodRange(period: ReportPeriod, reference: Date = new Date()): { start: Date; end: Date } {
  const wall = bogotaWallClock(reference);
  wall.setUTCHours(0, 0, 0, 0);

  switch (period) {
    case 'day': {
      const end = new Date(wall);
      end.setUTCDate(end.getUTCDate() + 1);
      return { start: fromBogotaWallClock(wall), end: fromBogotaWallClock(end) };
    }
    case 'week': {
      const dayOfWeek = (wall.getUTCDay() + 6) % 7; // Monday = 0
      wall.setUTCDate(wall.getUTCDate() - dayOfWeek);
      const end = new Date(wall);
      end.setUTCDate(end.getUTCDate() + 7);
      return { start: fromBogotaWallClock(wall), end: fromBogotaWallClock(end) };
    }
    case 'month': {
      wall.setUTCDate(1);
      const end = new Date(wall);
      end.setUTCMonth(end.getUTCMonth() + 1);
      return { start: fromBogotaWallClock(wall), end: fromBogotaWallClock(end) };
    }
    case 'quarter': {
      const quarterStartMonth = Math.floor(wall.getUTCMonth() / 3) * 3;
      wall.setUTCMonth(quarterStartMonth, 1);
      const end = new Date(wall);
      end.setUTCMonth(end.getUTCMonth() + 3);
      return { start: fromBogotaWallClock(wall), end: fromBogotaWallClock(end) };
    }
    case 'semester': {
      const semesterStartMonth = wall.getUTCMonth() < 6 ? 0 : 6;
      wall.setUTCMonth(semesterStartMonth, 1);
      const end = new Date(wall);
      end.setUTCMonth(end.getUTCMonth() + 6);
      return { start: fromBogotaWallClock(wall), end: fromBogotaWallClock(end) };
    }
    case 'year': {
      wall.setUTCMonth(0, 1);
      const end = new Date(wall);
      end.setUTCFullYear(end.getUTCFullYear() + 1);
      return { start: fromBogotaWallClock(wall), end: fromBogotaWallClock(end) };
    }
  }
}

/// The previous calendar month's [start, end) - used by the monthly
/// summary email, which reports on the month that just closed.
export function getPreviousMonthRange(reference: Date = new Date()): { start: Date; end: Date } {
  const wall = bogotaWallClock(reference);
  wall.setUTCDate(1);
  wall.setUTCMonth(wall.getUTCMonth() - 1);
  wall.setUTCHours(0, 0, 0, 0);
  const end = new Date(wall);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start: fromBogotaWallClock(wall), end: fromBogotaWallClock(end) };
}
