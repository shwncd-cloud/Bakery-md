export type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year';

export const REPORT_PERIODS: ReportPeriod[] = ['day', 'week', 'month', 'quarter', 'semester', 'year'];

/// The owner asked for sales/expenses/product figures at every one of
/// these granularities. Boundaries are computed in server local time -
/// fine for a single-timezone pilot in Colombia, worth revisiting once
/// tenants span timezones.
export function getPeriodRange(period: ReportPeriod, reference: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'day': {
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }
    case 'week': {
      const dayOfWeek = (start.getDay() + 6) % 7; // Monday = 0
      start.setDate(start.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end };
    }
    case 'month': {
      start.setDate(1);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      return { start, end };
    }
    case 'quarter': {
      const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 3);
      return { start, end };
    }
    case 'semester': {
      const semesterStartMonth = start.getMonth() < 6 ? 0 : 6;
      start.setMonth(semesterStartMonth, 1);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 6);
      return { start, end };
    }
    case 'year': {
      start.setMonth(0, 1);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      return { start, end };
    }
  }
}

/// The previous calendar month's [start, end) - used by the monthly
/// summary email, which reports on the month that just closed.
export function getPreviousMonthRange(reference: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(reference);
  start.setDate(1);
  start.setMonth(start.getMonth() - 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}
