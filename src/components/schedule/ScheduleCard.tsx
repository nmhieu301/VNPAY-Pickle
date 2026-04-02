'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — ScheduleCard Component
// Card hiển thị 1 lịch định kỳ trong danh sách
// ═══════════════════════════════════════════

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Users, CalendarRange, ChevronRight, Repeat } from 'lucide-react';
import type { RecurringSchedule } from '@/types';
import { describeRecurrence, getNextOccurrence } from '@/lib/utils/recurrenceCalculator';

interface Props {
  schedule: RecurringSchedule;
  groupId: string;
  isSubscribed?: boolean;
  index?: number;
}

const STATUS_DOT: Record<string, string> = {
  active: 'bg-green-500',
  paused: 'bg-yellow-400',
  ended: 'bg-gray-400',
};

const SPORT_MODE_LABEL: Record<string, string> = {
  doubles: '👥 Đôi nam',
  mixed: '🔄 Mix đôi',
  singles: '🏏 Đơn',
  womens_doubles: '👩‍👩 Đôi nữ',
};

function formatNextDate(d: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dateStr = d.toLocaleDateString('vi', { weekday: 'short', day: '2-digit', month: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Hôm nay, ${d.toLocaleDateString('vi', { day: '2-digit', month: '2-digit' })}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Ngày mai, ${d.toLocaleDateString('vi', { day: '2-digit', month: '2-digit' })}`;
  return dateStr;
}

export function ScheduleCard({ schedule, groupId, isSubscribed, index = 0 }: Props) {
  const recurrenceDesc = describeRecurrence(schedule);
  const nextDate = getNextOccurrence(schedule, []);
  const upcoming = schedule.upcoming_session;

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/groups/${groupId}/schedules/${schedule.id}`}
        className="card p-4 block hover:shadow-md transition-shadow group"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white flex-shrink-0">
            <Repeat className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[schedule.status] ?? 'bg-gray-400'}`}
              />
              <h3 className="font-semibold text-sm truncate group-hover:text-[var(--primary)] transition-colors">
                {schedule.name}
              </h3>
              {isSubscribed && (
                <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] flex-shrink-0">
                  ✓ Đã theo
                </span>
              )}
            </div>

            {/* Recurrence */}
            <div className="flex items-center gap-1 text-xs text-[var(--muted-fg)] mb-1">
              <CalendarRange className="w-3 h-3" />
              <span>{recurrenceDesc}</span>
              <span>•</span>
              <span>{schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}</span>
            </div>

            {/* Venue & sport */}
            <div className="flex items-center gap-2 flex-wrap">
              {schedule.venue && (
                <span className="flex items-center gap-1 text-xs text-[var(--muted-fg)]">
                  <MapPin className="w-3 h-3" />
                  {schedule.venue.name}
                </span>
              )}
              <span className="text-xs text-[var(--muted-fg)]">
                {SPORT_MODE_LABEL[schedule.sport_mode] ?? schedule.sport_mode}
              </span>
              {(schedule.subscriber_count ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-[var(--muted-fg)]">
                  <Users className="w-3 h-3" />
                  {schedule.subscriber_count} theo dõi
                </span>
              )}
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[var(--muted-fg)] flex-shrink-0 group-hover:text-[var(--primary)] transition-colors" />
        </div>

        {/* Next session bar */}
        {nextDate && (
          <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
            <span className="text-xs text-[var(--muted-fg)]">
              Buổi tới: <span className="font-medium text-[var(--fg)]">{formatNextDate(nextDate)}</span>
            </span>
            {upcoming && upcoming.player_count > 0 && (
              <span className="text-xs text-[var(--muted-fg)]">
                {upcoming.player_count} người đã đăng ký
              </span>
            )}
          </div>
        )}

        {schedule.status === 'paused' && (
          <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
              ⏸ Tạm dừng đến {schedule.paused_until}
            </span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
