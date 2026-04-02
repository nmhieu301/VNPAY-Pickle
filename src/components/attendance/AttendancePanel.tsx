'use client';
// ─── AttendancePanel — Tab điểm danh inline trong group detail ───
// Gồm: bảng thống kê thành viên + lịch sử buổi + settings

import { useState } from 'react';
import { BarChart3, CalendarDays, Settings2, Trophy, TrendingUp, UserX } from 'lucide-react';
import { AttendanceTable } from './AttendanceTable';
import { AttendanceBySession } from './AttendanceBySession';
import { AttendanceSettingsPanel } from './AttendanceSettings';
import { StreakBadge } from './StreakBadge';
import { useAttendanceStats } from '@/hooks/useAttendanceStats';
import type { RecurringSchedule } from '@/types';

interface Props {
  groupId: string;
  schedules: RecurringSchedule[];
  isAdmin: boolean;
}

type SubTab = 'members' | 'sessions' | 'settings';

export function AttendancePanel({ groupId, schedules, isAdmin }: Props) {
  const [selectedScheduleId, setSelectedScheduleId] = useState(schedules[0]?.id ?? '');
  const [weeksBack, setWeeksBack] = useState(8);
  const [subTab, setSubTab] = useState<SubTab>('members');

  const { memberStats, sessionHistory, isLoading, totalSessions, avgAttendance, topStreak, inactiveCount } =
    useAttendanceStats(selectedScheduleId, weeksBack);

  const selectedSchedule = schedules.find(s => s.id === selectedScheduleId);

  if (!schedules.length) {
    return (
      <div className="text-center py-16 text-[var(--muted-fg)]">
        <p className="text-5xl mb-4">📅</p>
        <p className="font-semibold text-lg">Nhóm chưa có lịch định kỳ</p>
        <p className="text-sm mt-1">Tạo lịch chơi định kỳ trước để bật tính năng điểm danh</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Schedule selector */}
      {schedules.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {schedules.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedScheduleId(s.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                selectedScheduleId === s.id
                  ? 'bg-[var(--primary)] text-white border-transparent'
                  : 'border-[var(--border-color)] text-[var(--muted-fg)] hover:border-[var(--primary)]/60 hover:text-[var(--primary)]'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <CalendarDays className="w-4 h-4" />, label: 'Buổi đã chơi', value: totalSessions, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { icon: <TrendingUp className="w-4 h-4" />, label: 'Tỷ lệ TB', value: `${avgAttendance}%`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
          { icon: <Trophy className="w-4 h-4" />, label: 'Streak cao nhất', value: topStreak, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
          { icon: <UserX className="w-4 h-4" />, label: 'Ít hoạt động', value: inactiveCount, color: inactiveCount > 0 ? 'text-red-600' : 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/30' },
        ].map(card => (
          <div key={card.label} className={`rounded-2xl p-3 ${card.bg}`}>
            <div className={`flex items-center gap-1.5 ${card.color} mb-1`}>
              {card.icon}
              <span className="text-xs font-medium">{card.label}</span>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Sub-tab nav */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--muted)]">
        {([
          { key: 'members', icon: <BarChart3 className="w-4 h-4" />, label: 'Thành viên' },
          { key: 'sessions', icon: <CalendarDays className="w-4 h-4" />, label: 'Theo buổi' },
          ...(isAdmin ? [{ key: 'settings', icon: <Settings2 className="w-4 h-4" />, label: 'Cài đặt' }] : []),
        ] as { key: SubTab; icon: React.ReactNode; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              subTab === t.key
                ? 'bg-[var(--card-bg)] text-[var(--primary)] shadow-sm'
                : 'text-[var(--muted-fg)] hover:text-[var(--fg)]'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Week filter (members tab) */}
      {subTab === 'members' && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--muted-fg)]">
            {selectedSchedule?.name} — {weeksBack} tuần gần nhất
          </p>
          <div className="flex gap-1">
            {[4, 8, 12].map(w => (
              <button
                key={w}
                onClick={() => setWeeksBack(w)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  weeksBack === w
                    ? 'bg-[var(--primary)] text-white border-transparent'
                    : 'border-[var(--border-color)] text-[var(--muted-fg)] hover:border-[var(--primary)]/50'
                }`}
              >
                {w}t
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {subTab === 'members' && (
        <AttendanceTable stats={memberStats} isLoading={isLoading} />
      )}
      {subTab === 'sessions' && (
        <AttendanceBySession sessions={sessionHistory} isLoading={isLoading} />
      )}
      {subTab === 'settings' && isAdmin && (
        <AttendanceSettingsPanel
          groupId={groupId}
          scheduleId={selectedScheduleId || undefined}
        />
      )}
    </div>
  );
}
