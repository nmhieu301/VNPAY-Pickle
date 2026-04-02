'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — useRecurringSchedule hook
// ═══════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import type { RecurringSchedule, RecurringSubscriber, RecurringException, Session } from '@/types';
import {
  fetchRecurringScheduleById, fetchSubscribers, fetchExceptions,
  fetchSessionsForSchedule, generateUpcomingSessions,
  checkIsSubscribed, subscribeToSchedule, unsubscribeFromSchedule,
  createException, fetchScheduleStats, type RecurringStats,
} from '@/lib/supabase/recurringApi';
import { describeRecurrence, getNextOccurrence } from '@/lib/utils/recurrenceCalculator';

interface UseRecurringScheduleReturn {
  schedule: RecurringSchedule | null;
  subscribers: RecurringSubscriber[];
  exceptions: RecurringException[];
  upcomingSessions: Session[];
  pastSessions: Session[];
  stats: RecurringStats | null;
  isLoading: boolean;
  isSubscribed: boolean;
  recurrenceDesc: string;
  nextDate: Date | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  cancelSession: (date: string, reason: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useRecurringSchedule(
  scheduleId: string,
  currentUserId: string | null
): UseRecurringScheduleReturn {
  const [schedule, setSchedule] = useState<RecurringSchedule | null>(null);
  const [subscribers, setSubscribers] = useState<RecurringSubscriber[]>([]);
  const [exceptions, setExceptions] = useState<RecurringException[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<RecurringStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [sched, subs, excs, upcoming, past] = await Promise.all([
      fetchRecurringScheduleById(scheduleId),
      fetchSubscribers(scheduleId),
      fetchExceptions(scheduleId),
      fetchSessionsForSchedule(scheduleId, true),
      fetchSessionsForSchedule(scheduleId, false),
    ]);

    if (!sched) { setIsLoading(false); return; }
    setSchedule(sched);
    setSubscribers(subs);
    setExceptions(excs);
    setPastSessions(past);

    // Generate upcoming sessions if needed (on-demand)
    if (currentUserId && sched.status === 'active') {
      const generated = await generateUpcomingSessions(sched, excs, sched.creator_id);
      const freshUpcoming = generated > 0
        ? await fetchSessionsForSchedule(scheduleId, true)
        : upcoming;
      setUpcomingSessions(freshUpcoming);
    } else {
      setUpcomingSessions(upcoming);
    }

    if (currentUserId) {
      const subscribed = await checkIsSubscribed(scheduleId, currentUserId);
      setIsSubscribed(subscribed);
    }

    const statsData = await fetchScheduleStats(scheduleId);
    setStats(statsData);
    setIsLoading(false);
  }, [scheduleId, currentUserId]);

  useEffect(() => { load(); }, [load]);

  const subscribe = async () => {
    if (!currentUserId || !schedule) return;
    await subscribeToSchedule(scheduleId, currentUserId);
    setIsSubscribed(true);
    setSubscribers(prev => [...prev, {
      id: crypto.randomUUID(),
      schedule_id: scheduleId,
      player_id: currentUserId,
      subscribed_at: new Date().toISOString(),
    }]);
  };

  const unsubscribe = async () => {
    if (!currentUserId) return;
    await unsubscribeFromSchedule(scheduleId, currentUserId);
    setIsSubscribed(false);
    setSubscribers(prev => prev.filter(s => s.player_id !== currentUserId));
  };

  const cancelSession = async (date: string, reason: string) => {
    if (!currentUserId || !schedule) return;
    await createException({
      scheduleId,
      originalDate: date,
      action: 'cancel',
      cancelReason: reason,
      createdBy: currentUserId,
    });
    await load();
  };

  const recurrenceDesc = schedule ? describeRecurrence(schedule) : '';
  const nextDate = schedule ? getNextOccurrence(schedule, exceptions) : null;

  return {
    schedule, subscribers, exceptions, upcomingSessions, pastSessions,
    stats, isLoading, isSubscribed, recurrenceDesc, nextDate,
    subscribe, unsubscribe, cancelSession, refresh: load,
  };
}
