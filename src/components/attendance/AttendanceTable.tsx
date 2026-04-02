'use client';
// ─── AttendanceTable — Bảng tổng hợp điểm danh theo thành viên ───

import { useState } from 'react';
import { ArrowUpDown, AlertTriangle } from 'lucide-react';
import { StreakBadge } from './StreakBadge';
import type { MemberAttendanceStat } from '@/types';

type SortKey = 'name' | 'attendance_rate' | 'present_count' | 'no_show_count' | 'current_streak';
type SortDir = 'asc' | 'desc';

interface Props {
  stats: MemberAttendanceStat[];
  isLoading: boolean;
}

export function AttendanceTable({ stats, isLoading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('attendance_rate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...stats].sort((a, b) => {
    let va: string | number, vb: string | number;
    if (sortKey === 'name') {
      va = a.player.full_name; vb = b.player.full_name;
    } else {
      va = a[sortKey]; vb = b[sortKey];
    }
    return sortDir === 'desc'
      ? (typeof va === 'string' ? vb.toString().localeCompare(va) : (vb as number) - (va as number))
      : (typeof va === 'string' ? va.localeCompare(vb.toString()) : (va as number) - (vb as number));
  });

  const ThBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(col)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide hover:text-[var(--primary)] transition-colors ${
        sortKey === col ? 'text-[var(--primary)]' : 'text-[var(--muted-fg)]'
      }`}
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === col ? 'opacity-100' : 'opacity-30'}`} />
    </button>
  );

  const getRateColor = (rate: number) =>
    rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-yellow-600' : rate >= 30 ? 'text-orange-600' : 'text-red-600';

  const getRateBg = (rate: number) =>
    rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-yellow-500' : rate >= 30 ? 'bg-orange-500' : 'bg-red-500';

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-[var(--muted)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats.length) {
    return (
      <div className="text-center py-12 text-[var(--muted-fg)]">
        <p className="text-4xl mb-3">📊</p>
        <p className="font-semibold">Chưa có dữ liệu điểm danh</p>
        <p className="text-sm mt-1">Dữ liệu sẽ xuất hiện sau khi hoàn tất buổi chơi đầu tiên</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-[var(--border-color)]">
            <th className="text-left py-2 pr-3 w-8 text-xs font-semibold text-[var(--muted-fg)]">#</th>
            <th className="text-left py-2 pr-3"><ThBtn col="name" label="Thành viên" /></th>
            <th className="text-right py-2 px-2"><ThBtn col="present_count" label="Có mặt" /></th>
            <th className="text-right py-2 px-2 hidden sm:table-cell">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-fg)]">Vắng</span>
            </th>
            <th className="text-right py-2 px-2"><ThBtn col="no_show_count" label="No-show" /></th>
            <th className="text-right py-2 px-2"><ThBtn col="attendance_rate" label="Tỷ lệ" /></th>
            <th className="text-right py-2 pl-2"><ThBtn col="current_streak" label="Streak" /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-color)]/50">
          {sorted.map((stat, idx) => {
            const isInactive = stat.attendance_rate < 30;
            return (
              <tr key={stat.player_id} className="hover:bg-[var(--muted)]/50 transition-colors group">
                {/* Rank */}
                <td className="py-3 pr-3 text-[var(--muted-fg)] font-bold">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </td>

                {/* Player */}
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {stat.player.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate flex items-center gap-1.5">
                        {stat.player.nickname || stat.player.full_name.split(' ').pop()}
                        {isInactive && <AlertTriangle className="w-3 h-3 text-orange-500" />}
                      </p>
                      <p className="text-xs text-[var(--muted-fg)] truncate hidden sm:block">
                        {stat.player.full_name}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Present */}
                <td className="py-3 px-2 text-right">
                  <span className="font-bold">{stat.present_count}</span>
                  <span className="text-[var(--muted-fg)] text-xs">/{stat.total_sessions}</span>
                </td>

                {/* Excused */}
                <td className="py-3 px-2 text-right hidden sm:table-cell text-[var(--muted-fg)]">
                  {stat.excused_count}
                </td>

                {/* No-show */}
                <td className="py-3 px-2 text-right">
                  <span className={stat.no_show_count > 0 ? 'text-red-600 font-semibold' : 'text-[var(--muted-fg)]'}>
                    {stat.no_show_count}
                  </span>
                </td>

                {/* Rate */}
                <td className="py-3 px-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-12 h-1.5 rounded-full bg-[var(--muted)] hidden md:block">
                      <div
                        className={`h-full rounded-full ${getRateBg(stat.attendance_rate)} transition-all`}
                        style={{ width: `${stat.attendance_rate}%` }}
                      />
                    </div>
                    <span className={`font-bold ${getRateColor(stat.attendance_rate)}`}>
                      {stat.attendance_rate}%
                    </span>
                  </div>
                </td>

                {/* Streak */}
                <td className="py-3 pl-2 text-right">
                  <StreakBadge streak={stat.current_streak} size="sm" showZero />
                </td>
              </tr>
            );
          })}
        </tbody>

        {/* Footer */}
        <tfoot className="border-t-2 border-[var(--border-color)]">
          <tr>
            <td colSpan={2} className="py-3 text-xs font-semibold text-[var(--muted-fg)]">
              Trung bình nhóm
            </td>
            <td colSpan={5} className="py-3 text-right">
              {stats.length > 0 && (
                <span className="text-sm font-bold text-[var(--primary)]">
                  {Math.round(stats.reduce((s, m) => s + m.attendance_rate, 0) / stats.length)}%
                </span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
