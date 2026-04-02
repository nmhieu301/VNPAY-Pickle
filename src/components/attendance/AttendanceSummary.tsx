'use client';
// ─── AttendanceSummary — Panel tổng hợp RSVP realtime ───

import { Users, Check, X, HelpCircle, Clock } from 'lucide-react';
import type { Attendance } from '@/types';

interface Props {
  going: Attendance[];
  notGoing: Attendance[];
  maybe: Attendance[];
  noResponse: Attendance[];
  checkedIn: Attendance[];
  numCourts?: number;
  isBeforeSession: boolean;   // trước buổi: hiện RSVP / sau buổi: hiện check-in
}

function PlayerPill({ name }: { name: string }) {
  const initials = name.split(' ').slice(-2).map(w => w[0]).join('');
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--muted)] text-xs font-medium">
      <span className="w-4 h-4 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white text-[9px] flex items-center justify-center font-bold">
        {initials}
      </span>
      {name.split(' ').slice(-1)[0]}
    </span>
  );
}

function getName(a: Attendance) {
  const p = (a as Attendance & { player?: { full_name: string; nickname?: string | null } }).player;
  return p?.nickname || p?.full_name || a.player_id.slice(0, 6);
}

export function AttendanceSummary({ going, notGoing, maybe, noResponse, checkedIn, numCourts = 2, isBeforeSession }: Props) {
  const confirmed = going.length;
  const suggestedCourts = Math.max(1, Math.ceil(confirmed / 4));

  const sections = isBeforeSession
    ? [
        { icon: <Check className="w-4 h-4" />, label: 'Đến', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800', list: going },
        { icon: <X className="w-4 h-4" />, label: 'Vắng', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800', list: notGoing },
        { icon: <HelpCircle className="w-4 h-4" />, label: 'Chưa chắc', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800', list: maybe },
        { icon: <Clock className="w-4 h-4" />, label: 'Chưa phản hồi', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800', list: noResponse },
      ]
    : [
        { icon: <Check className="w-4 h-4" />, label: 'Đã check-in', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800', list: checkedIn },
        { icon: <X className="w-4 h-4" />, label: 'Vắng', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800', list: notGoing },
      ];

  return (
    <div className="space-y-3">
      {/* Header counts */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { v: going.length, label: 'Đến', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { v: notGoing.length, label: 'Vắng', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          { v: maybe.length, label: 'Chưa chắc', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
          { v: noResponse.length, label: 'Chưa phản hồi', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20' },
        ].map(({ v, label, color, bg }) => (
          <div key={label} className={`rounded-xl py-2 ${bg}`}>
            <p className={`text-xl font-bold ${color}`}>{v}</p>
            <p className="text-[10px] text-[var(--muted-fg)] leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Court suggestion */}
      {isBeforeSession && confirmed > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
          <Users className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-blue-700 dark:text-blue-400">
            {confirmed} người xác nhận → gợi ý <strong>{suggestedCourts} sân</strong>
            {suggestedCourts !== numCourts && ` (hiện đặt ${numCourts} sân)`}
          </span>
        </div>
      )}

      {/* Player lists */}
      {sections.filter(s => s.list.length > 0).map(sec => (
        <div key={sec.label} className={`rounded-xl p-3 border ${sec.bg}`}>
          <div className={`flex items-center gap-1.5 font-semibold text-sm mb-2 ${sec.color}`}>
            {sec.icon} {sec.label} ({sec.list.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sec.list.map(a => (
              <PlayerPill key={a.player_id} name={getName(a)} />
            ))}
          </div>
          {/* Lý do vắng */}
          {sec.label === 'Vắng' && sec.list.some(a => a.rsvp_reason) && (
            <div className="mt-2 space-y-0.5">
              {sec.list.filter(a => a.rsvp_reason).map(a => (
                <p key={a.player_id} className="text-xs text-[var(--muted-fg)]">
                  {getName(a)}: <em>{a.rsvp_reason}</em>
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
