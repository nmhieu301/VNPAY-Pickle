'use client';
// ─── HostCheckInPanel — Host tick từng người đã đến ───

import { useState } from 'react';
import { UserCheck, CheckSquare, Square, Loader2 } from 'lucide-react';
import type { Attendance } from '@/types';

interface Props {
  records: Attendance[];
  onCheckIn: (playerId: string, checkedIn: boolean) => Promise<boolean>;
}

function getName(a: Attendance) {
  const p = (a as Attendance & { player?: { full_name: string; nickname?: string | null } }).player;
  return p?.full_name || a.player_id.slice(0, 8);
}
function getNick(a: Attendance) {
  const p = (a as Attendance & { player?: { full_name: string; nickname?: string | null } }).player;
  return p?.nickname;
}

export function HostCheckInPanel({ records, onCheckIn }: Props) {
  const [pending, setPending] = useState<string | null>(null);

  // Sort: going first, then maybe, then no_response
  const sorted = [...records].sort((a, b) => {
    const order = { going: 0, maybe: 1, no_response: 2, not_going: 3 };
    return (order[a.rsvp_status] ?? 3) - (order[b.rsvp_status] ?? 3);
  });

  const checkedCount = records.filter(r => r.checked_in).length;

  const toggle = async (rec: Attendance) => {
    setPending(rec.player_id);
    await onCheckIn(rec.player_id, !rec.checked_in);
    setPending(null);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-[var(--primary)]" />
          <span className="font-semibold text-sm">Điểm danh (Host)</span>
        </div>
        <span className="text-sm font-bold text-green-600">
          {checkedCount}/{records.length} người
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
          style={{ width: records.length > 0 ? `${(checkedCount / records.length) * 100}%` : '0%' }}
        />
      </div>

      {/* Player list */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {sorted.filter(r => r.rsvp_status !== 'not_going').map(rec => {
          const isChecked = rec.checked_in;
          const isLoading = pending === rec.player_id;
          return (
            <button
              key={rec.player_id}
              onClick={() => toggle(rec)}
              disabled={!!pending}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 ${
                isChecked
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                  : 'bg-[var(--card-bg)] border-[var(--border-color)] hover:border-[var(--primary)]/50'
              } disabled:opacity-60`}
            >
              {isLoading
                ? <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)] shrink-0" />
                : isChecked
                ? <CheckSquare className="w-5 h-5 text-green-600 shrink-0" />
                : <Square className="w-5 h-5 text-[var(--muted-fg)] shrink-0" />
              }

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {getName(rec).charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isChecked ? 'text-green-700 dark:text-green-400' : ''}`}>
                  {getName(rec)}
                </p>
                {getNick(rec) && (
                  <p className="text-xs text-[var(--muted-fg)] truncate">{getNick(rec)}</p>
                )}
              </div>

              {/* RSVP tag */}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                rec.rsvp_status === 'going'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : rec.rsvp_status === 'maybe'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {rec.rsvp_status === 'going' ? '✅ Đến' : rec.rsvp_status === 'maybe' ? '🤔 Chưa chắc' : '–'}
              </span>
            </button>
          );
        })}

        {/* Báo vắng — readonly */}
        {sorted.filter(r => r.rsvp_status === 'not_going').map(rec => (
          <div key={rec.player_id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 opacity-60">
            <Square className="w-5 h-5 text-red-300 shrink-0" />
            <div className="w-8 h-8 rounded-full bg-red-200 dark:bg-red-900/40 flex items-center justify-center text-red-600 text-xs font-bold shrink-0">
              {getName(rec).charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--muted-fg)] truncate">{getName(rec)}</p>
              {rec.rsvp_reason && <p className="text-xs text-[var(--muted-fg)] truncate italic">{rec.rsvp_reason}</p>}
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 shrink-0">❌ Vắng</span>
          </div>
        ))}
      </div>
    </div>
  );
}
