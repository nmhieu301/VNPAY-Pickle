'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — useAttendanceStats Hook
// Bảng tổng hợp điểm danh theo nhóm/schedule
// ═══════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  fetchGroupAttendanceStats,
  fetchAttendanceBySession,
  fetchStreaks,
} from '@/lib/supabase/attendanceApi';
import type { MemberAttendanceStat, SessionAttendanceSummary, AttendanceStreak } from '@/types';

export function useAttendanceStats(scheduleId: string, weeksBack = 8) {
  const [memberStats, setMemberStats] = useState<MemberAttendanceStat[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SessionAttendanceSummary[]>([]);
  const [streaks, setStreaks] = useState<AttendanceStreak[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!scheduleId) return;
    setIsLoading(true);
    const [stats, history, streakData] = await Promise.all([
      fetchGroupAttendanceStats(scheduleId, weeksBack),
      fetchAttendanceBySession(scheduleId, 12),
      fetchStreaks(scheduleId),
    ]);
    setMemberStats(stats);
    setSessionHistory(history);
    setStreaks(streakData);
    setIsLoading(false);
  }, [scheduleId, weeksBack]);

  useEffect(() => { load(); }, [load]);

  // Summary numbers
  const totalSessions = sessionHistory.length;
  const avgAttendance = memberStats.length > 0
    ? Math.round(memberStats.reduce((s, m) => s + m.attendance_rate, 0) / memberStats.length)
    : 0;
  const topStreak = streaks[0]?.current_streak ?? 0;
  const inactiveCount = memberStats.filter(m => m.attendance_rate < 30).length;

  return {
    memberStats, sessionHistory, streaks, isLoading,
    totalSessions, avgAttendance, topStreak, inactiveCount,
    reload: load,
  };
}
