'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — useAttendance Hook
// RSVP + Check-in lifecycle cho 1 occurrence
// ═══════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchRsvpForOccurrence,
  fetchMyRsvp,
  fetchMyStreak,
  upsertRsvp,
  selfCheckIn,
  hostCheckIn,
} from '@/lib/supabase/attendanceApi';
import type { Attendance, AttendanceSettings, AttendanceStreak, RsvpStatus } from '@/types';

interface UseAttendanceOptions {
  scheduleId: string;
  occurrenceDate: string;   // 'YYYY-MM-DD'
  currentPlayerId: string;
  settings?: AttendanceSettings | null;
  startTime?: string;       // e.g. '12:00'
}

export function useAttendance({
  scheduleId,
  occurrenceDate,
  currentPlayerId,
  settings,
  startTime = '12:00',
}: UseAttendanceOptions) {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [myRecord, setMyRecord] = useState<Attendance | null>(null);
  const [myStreak, setMyStreak] = useState<AttendanceStreak | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if we're inside the check-in window
  const canCheckIn = (() => {
    if (!occurrenceDate || !startTime) return false;
    const openBefore = settings?.checkin_open_before_minutes ?? 30;
    const closeAfter = settings?.checkin_close_after_minutes ?? 15;
    const [h, m] = startTime.split(':').map(Number);
    const sessionStart = new Date(`${occurrenceDate}T${startTime}`);
    const openTime = new Date(sessionStart.getTime() - openBefore * 60000);
    const closeTime = new Date(sessionStart.getTime() + closeAfter * 60000);
    const now = new Date();
    return now >= openTime && now <= closeTime;
  })();

  const load = useCallback(async () => {
    setIsLoading(true);
    const [recs, mine, streak] = await Promise.all([
      fetchRsvpForOccurrence(scheduleId, occurrenceDate),
      fetchMyRsvp(scheduleId, occurrenceDate, currentPlayerId),
      fetchMyStreak(scheduleId, currentPlayerId),
    ]);
    setRecords(recs);
    setMyRecord(mine);
    setMyStreak(streak);
    setIsLoading(false);
  }, [scheduleId, occurrenceDate, currentPlayerId]);

  useEffect(() => {
    load();

    // Realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`attendance:${scheduleId}:${occurrenceDate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `schedule_id=eq.${scheduleId}`,
        },
        () => load(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load, scheduleId, occurrenceDate]);

  const handleRsvp = async (status: RsvpStatus, reason?: string) => {
    setIsSubmitting(true);
    const result = await upsertRsvp(scheduleId, occurrenceDate, currentPlayerId, status, reason);
    if (result) {
      setMyRecord(result);
      setRecords(prev => {
        const idx = prev.findIndex(r => r.player_id === currentPlayerId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...result };
          return next;
        }
        return [result, ...prev];
      });
    }
    setIsSubmitting(false);
  };

  const handleSelfCheckIn = async () => {
    setIsSubmitting(true);
    const ok = await selfCheckIn(scheduleId, occurrenceDate, currentPlayerId);
    if (ok) await load();
    setIsSubmitting(false);
    return ok;
  };

  const handleHostCheckIn = async (playerId: string, checkedIn: boolean) => {
    const ok = await hostCheckIn(scheduleId, occurrenceDate, playerId, checkedIn);
    if (ok) await load();
    return ok;
  };

  // Summary counts
  const going = records.filter(r => r.rsvp_status === 'going');
  const notGoing = records.filter(r => r.rsvp_status === 'not_going');
  const maybe = records.filter(r => r.rsvp_status === 'maybe');
  const noResponse = records.filter(r => r.rsvp_status === 'no_response');
  const checkedIn = records.filter(r => r.checked_in);

  return {
    records, myRecord, myStreak, isLoading, isSubmitting,
    canCheckIn,
    going, notGoing, maybe, noResponse, checkedIn,
    handleRsvp, handleSelfCheckIn, handleHostCheckIn,
    reload: load,
  };
}
