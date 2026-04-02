// ═══════════════════════════════════════════
// VNPAY Pickle — Recurrence Date Calculator
// Tính ngày buổi tiếp theo từ config lặp
// ═══════════════════════════════════════════

import type { RecurringSchedule, RecurringException } from '@/types';

// Tên ngày tiếng Việt (0=CN, 1=T2,...6=T7)
const VI_DAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/**
 * Thư viện-style constant: JS getDay() = 0 (Sun)..6 (Sat)
 * DB days_of_week (PostgreSQL): 1=CN, 2=T2 ...7=T7 (ISO-like but Sun=1)
 * Mapping: db=1 → js=0 (Sun), db=2 → js=1 (Mon), ...db=7 → js=6 (Sat)
 */
function dbDayToJs(dbDay: number): number {
  return dbDay % 7; // db1=Sun → 1%7=1? No: db1→0, db2→1...db7→6
  // Actually: db=1→Sun(0), db=2→Mon(1),...db=7→Sat(6)
  // So: js = db - 1
}
// Simpler explicit map
const DB_TO_JS: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6 };

/** Format a date as YYYY-MM-DD string (local timezone) */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string to a local Date (midnight) */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Add `n` days to a date */
function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

/** Get all occurrence dates for a recurring schedule in [from, to] range */
export function getOccurrenceDates(
  schedule: RecurringSchedule,
  from: Date,
  to: Date,
): Date[] {
  const dates: Date[] = [];
  const start = parseDate(schedule.starts_on);
  const endBound = schedule.ends_on ? parseDate(schedule.ends_on) : null;

  // Clamp from/to with schedule bounds
  const rangeStart = from < start ? start : from;
  const rangeEnd = endBound && endBound < to ? endBound : to;

  if (rangeStart > rangeEnd) return [];

  switch (schedule.recurrence_type) {
    case 'weekly': {
      const jsTargetDays = (schedule.days_of_week ?? []).map(d => DB_TO_JS[d] ?? 0);
      if (!jsTargetDays.length) break;

      let cur = new Date(rangeStart);
      while (cur <= rangeEnd) {
        if (jsTargetDays.includes(cur.getDay())) {
          dates.push(new Date(cur));
        }
        cur = addDays(cur, 1);
      }
      break;
    }

    case 'monthly_date': {
      const targetDays = schedule.days_of_month ?? [];
      if (!targetDays.length) break;

      let cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      while (cur <= rangeEnd) {
        for (const d of targetDays) {
          const candidate = new Date(cur.getFullYear(), cur.getMonth(), d);
          if (candidate >= rangeStart && candidate <= rangeEnd) {
            dates.push(candidate);
          }
        }
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
      break;
    }

    case 'monthly_weekday': {
      const week = schedule.monthly_week ?? 1;     // 1-5, -1=last
      const weekday = DB_TO_JS[schedule.monthly_weekday ?? 2]; // default Monday

      let cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      while (cur <= rangeEnd) {
        const candidate = getNthWeekdayOfMonth(cur.getFullYear(), cur.getMonth(), weekday, week);
        if (candidate && candidate >= rangeStart && candidate <= rangeEnd) {
          dates.push(candidate);
        }
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
      break;
    }

    case 'custom_days': {
      const interval = schedule.custom_interval_days ?? 7;
      let cur = new Date(start);
      while (cur > rangeStart) cur = addDays(cur, interval); // fast-forward
      while (cur < rangeStart) cur = addDays(cur, interval);
      while (cur <= rangeEnd) {
        dates.push(new Date(cur));
        cur = addDays(cur, interval);
      }
      break;
    }
  }

  // Apply max_occurrences
  if (schedule.max_occurrences != null) {
    const remaining = schedule.max_occurrences - schedule.occurrence_count;
    return dates.slice(0, Math.max(0, remaining));
  }

  return dates;
}

/** Get Nth weekday in a month (week=-1 = last) */
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, week: number): Date | null {
  if (week === -1) {
    // Last occurrence
    const lastDay = new Date(year, month + 1, 0);
    let d = lastDay;
    while (d.getDay() !== weekday) d = addDays(d, -1);
    return d;
  }
  // Forward search
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const candidate = new Date(year, month, d);
    if (candidate.getMonth() !== month) break;
    if (candidate.getDay() === weekday) {
      count++;
      if (count === week) return candidate;
    }
  }
  return null;
}

/** Check if a date is in a pause window */
export function isDateInPause(dateStr: string, schedule: RecurringSchedule): boolean {
  if (!schedule.paused_from || !schedule.paused_until) return false;
  return dateStr >= schedule.paused_from && dateStr <= schedule.paused_until;
}

/** Check if a date has a 'cancel' exception */
export function isDateCancelled(dateStr: string, exceptions: RecurringException[]): boolean {
  return exceptions.some(e => e.original_date === dateStr && e.action === 'cancel');
}

/** Get exception for a date (any type) */
export function getException(dateStr: string, exceptions: RecurringException[]): RecurringException | null {
  return exceptions.find(e => e.original_date === dateStr) ?? null;
}

/** Human-readable description of recurrence */
export function describeRecurrence(schedule: RecurringSchedule): string {
  const { recurrence_type: type } = schedule;

  if (type === 'weekly') {
    const days = (schedule.days_of_week ?? [])
      .sort()
      .map(d => VI_DAY[DB_TO_JS[d] ?? 0])
      .join(', ');
    return `Hàng tuần — ${days}`;
  }
  if (type === 'monthly_date') {
    const days = (schedule.days_of_month ?? []).sort().join(', ');
    return `Hàng tháng — ngày ${days}`;
  }
  if (type === 'monthly_weekday') {
    const week = schedule.monthly_week === -1 ? 'cuối' : `thứ ${schedule.monthly_week}`;
    const day = VI_DAY[DB_TO_JS[schedule.monthly_weekday ?? 2] ?? 1];
    return `Hàng tháng — ${day} tuần ${week}`;
  }
  if (type === 'custom_days') {
    return `Mỗi ${schedule.custom_interval_days ?? 7} ngày`;
  }
  return '';
}

/** Get next occurrence date from today */
export function getNextOccurrence(
  schedule: RecurringSchedule,
  exceptions: RecurringException[] = [],
  after?: Date,
): Date | null {
  const from = after ?? new Date();
  const to = addDays(from, 60); // look ahead 60 days
  const dates = getOccurrenceDates(schedule, from, to);

  return dates.find(d => {
    const ds = toDateString(d);
    return !isDateInPause(ds, schedule) && !isDateCancelled(ds, exceptions);
  }) ?? null;
}
