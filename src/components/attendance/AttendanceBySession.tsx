'use client';
// ─── AttendanceBySession — Timeline lịch sử từng buổi ───

import { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import type { SessionAttendanceSummary, Attendance } from '@/types';

interface Props {
  sessions: SessionAttendanceSummary[];
  isLoading: boolean;
}

function getName(a: Attendance) {
  const p = (a as Attendance & { player?: { full_name: string; nickname?: string | null } }).player;
  return p?.nickname || p?.full_name?.split(' ').pop() || a.player_id.slice(0, 6);
}

function DateLabel({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = d.toLocaleDateString('vi-VN', { weekday: 'short' });
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return (
    <span className="font-semibold">
      <span className="text-[var(--primary)]">{weekday}</span> {date}
    </span>
  );
}

function SessionRow({ summary }: { summary: SessionAttendanceSummary }) {
  const [open, setOpen] = useState(false);

  const presentNames = summary.checked_in.map(getName).join(', ') || '—';
  const absentNames = summary.not_going.map(getName).join(', ');
  const noShowNames = summary.no_show.map(getName).join(', ');

  return (
    <div className="border border-[var(--border-color)] rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--muted)]/50 transition-colors"
      >
        {open
          ? <ChevronDown className="w-4 h-4 text-[var(--muted-fg)] shrink-0" />
          : <ChevronRight className="w-4 h-4 text-[var(--muted-fg)] shrink-0" />
        }
        <Calendar className="w-4 h-4 text-[var(--primary)] shrink-0" />
        <span className="flex-1 text-sm"><DateLabel dateStr={summary.occurrence_date} /></span>

        {/* Counters */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold">
            ✅ {summary.checked_in.length}
          </span>
          {summary.not_going.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold">
              ❌ {summary.not_going.length}
            </span>
          )}
          {summary.no_show.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-semibold">
              🚫 {summary.no_show.length}
            </span>
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-[var(--border-color)] px-4 py-3 space-y-2 bg-[var(--muted)]/20">
          <div className="text-xs space-y-1.5">
            {summary.checked_in.length > 0 && (
              <p><span className="text-green-600 font-semibold">✅ Có mặt ({summary.checked_in.length}):</span>{' '}
                <span className="text-[var(--muted-fg)]">{presentNames}</span>
              </p>
            )}
            {summary.not_going.length > 0 && (
              <p><span className="text-red-600 font-semibold">❌ Vắng ({summary.not_going.length}):</span>{' '}
                <span className="text-[var(--muted-fg)]">
                  {summary.not_going.map(a => {
                    const reason = a.rsvp_reason ? ` (${a.rsvp_reason})` : '';
                    return getName(a) + reason;
                  }).join(', ')}
                </span>
              </p>
            )}
            {summary.no_show.length > 0 && (
              <p><span className="text-orange-600 font-semibold">🚫 No-show ({summary.no_show.length}):</span>{' '}
                <span className="text-[var(--muted-fg)]">{noShowNames}</span>
                <span className="text-orange-500 italic"> (RSVP "Đến" nhưng không check-in)</span>
              </p>
            )}
            {summary.maybe.length > 0 && (
              <p><span className="text-yellow-600 font-semibold">🤔 Chưa chắc ({summary.maybe.length}):</span>{' '}
                <span className="text-[var(--muted-fg)]">{summary.maybe.map(getName).join(', ')}</span>
              </p>
            )}
          </div>
          <p className="text-xs text-[var(--muted-fg)] pt-1 border-t border-[var(--border-color)]">
            Tổng: {summary.total_members} thành viên
          </p>
        </div>
      )}
    </div>
  );
}

export function AttendanceBySession({ sessions, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-[var(--muted)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="text-center py-12 text-[var(--muted-fg)]">
        <p className="text-4xl mb-3">📅</p>
        <p className="font-semibold">Chưa có buổi nào hoàn thành</p>
        <p className="text-sm mt-1">Lịch sử điểm danh sẽ xuất hiện sau buổi đầu tiên</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map(s => (
        <SessionRow key={s.occurrence_date} summary={s} />
      ))}
    </div>
  );
}
