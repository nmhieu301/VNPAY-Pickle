'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — ScheduleCalendar Component
// Mini calendar hiển thị các buổi định kỳ
// Dùng CSS Grid thuần - không cần thư viện
// ═══════════════════════════════════════════

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RecurringSchedule, RecurringException, Session } from '@/types';
import {
  getOccurrenceDates, toDateString, parseDate,
  isDateInPause, isDateCancelled, getException,
} from '@/lib/utils/recurrenceCalculator';

interface Props {
  schedule: RecurringSchedule;
  exceptions: RecurringException[];
  sessions: Session[]; // upcoming + past
  onDateClick?: (date: string) => void;
  selectedDate?: string | null;
}

const VI_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];
const VI_DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function ScheduleCalendar({ schedule, exceptions, sessions, onDateClick, selectedDate }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const sessionDateSet = useMemo(
    () => new Set(sessions.map(s => s.date)),
    [sessions]
  );

  // Calculate occurrence dates for this month view
  const occurrenceDates = useMemo(() => {
    const from = new Date(viewYear, viewMonth, 1);
    const to = new Date(viewYear, viewMonth + 1, 0);
    return new Set(
      getOccurrenceDates(schedule, from, to).map(d => toDateString(d))
    );
  }, [schedule, viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = toDateString(today);

  const cells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr });
  }

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="btn btn-ghost btn-icon btn-sm">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-sm">
          {VI_MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} className="btn btn-ghost btn-icon btn-sm">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* DoW headers */}
      <div className="grid grid-cols-7 mb-1">
        {VI_DOW.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-[var(--muted-fg)] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((cell, idx) => {
          if (!cell.day || !cell.dateStr) {
            return <div key={`empty-${idx}`} />;
          }

          const ds = cell.dateStr;
          const isOccurrence = occurrenceDates.has(ds);
          const isToday = ds === todayStr;
          const isPast = ds < todayStr;
          const isCancelled = isDateCancelled(ds, exceptions);
          const isPaused = isDateInPause(ds, schedule);
          const exc = getException(ds, exceptions);
          const hasSession = sessionDateSet.has(ds);
          const isSelected = selectedDate === ds;

          let dotColor = '';
          let dayBg = '';
          let dayText = '';
          let dimmed = false;

          if (isSelected) {
            dayBg = 'bg-[var(--primary)] text-white rounded-full';
          } else if (isToday) {
            dayBg = 'ring-2 ring-[var(--primary)] rounded-full';
          }

          if (isOccurrence) {
            if (isCancelled) {
              dotColor = 'bg-red-400';
              dimmed = true;
            } else if (isPaused) {
              dotColor = 'bg-yellow-400';
              dimmed = true;
            } else if (isPast) {
              dotColor = hasSession ? 'bg-green-500' : 'bg-gray-400';
            } else {
              dotColor = 'bg-[var(--primary)]';
            }
          }

          return (
            <button
              key={ds}
              onClick={() => isOccurrence && onDateClick?.(ds)}
              disabled={!isOccurrence}
              className={`flex flex-col items-center py-1 relative transition-colors ${
                isOccurrence ? 'cursor-pointer hover:bg-[var(--muted)] rounded-lg' : ''
              } ${dimmed ? 'opacity-40' : ''}`}
            >
              <span className={`w-7 h-7 flex items-center justify-center text-xs ${
                isPast && isOccurrence ? 'text-[var(--muted-fg)]' : ''
              } ${dayBg}`}>
                {cell.day}
              </span>
              {isOccurrence && (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor}`} />
              )}
              {exc?.action === 'reschedule' && (
                <span className="absolute top-0 right-0 text-[8px] text-orange-500">↗</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border-color)] flex-wrap">
        {[
          { color: 'bg-[var(--primary)]', label: 'Sắp tới' },
          { color: 'bg-green-500', label: 'Đã chơi' },
          { color: 'bg-red-400', label: 'Đã huỷ' },
          { color: 'bg-yellow-400', label: 'Tạm dừng' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1 text-[10px] text-[var(--muted-fg)]">
            <span className={`w-2 h-2 rounded-full ${l.color}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
