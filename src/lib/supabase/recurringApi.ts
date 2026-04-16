// ═══════════════════════════════════════════
// VNPAY Pickle — Recurring Schedule API
// Supabase queries for recurring sessions
// ═══════════════════════════════════════════

import { createClient } from '@/lib/supabase/client';
import type {
  RecurringSchedule, RecurringSubscriber, RecurringException,
  Session, RecurrenceType, RecurringScheduleStatus,
} from '@/types';
import {
  getOccurrenceDates, toDateString, parseDate, isDateInPause,
  isDateCancelled, getException,
} from '@/lib/utils/recurrenceCalculator';

// ─── CRUD ───

export async function fetchGroupSchedules(groupId: string): Promise<RecurringSchedule[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('recurring_schedules')
    .select(`
      *,
      creator:players!recurring_schedules_creator_id_fkey(id, full_name, nickname, avatar_url),
      venue:venues(id, name, address)
    `)
    .eq('group_id', groupId)
    .neq('status', 'ended')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchGroupSchedules:', error); return []; }
  return (data ?? []) as RecurringSchedule[];
}


export async function fetchMyRecurringSchedules(playerId: string): Promise<RecurringSchedule[]> {
  const supabase = createClient();
  // Schedules I created OR subscribed to
  const { data, error } = await supabase
    .from('recurring_schedules')
    .select(`
      *,
      creator:players!recurring_schedules_creator_id_fkey(id, full_name, nickname),
      venue:venues(id, name, address),
      recurring_subscribers!inner(player_id)
    `)
    .or(`creator_id.eq.${playerId},recurring_subscribers.player_id.eq.${playerId}`)
    .neq('status', 'ended')
    .order('starts_on');
  if (error) { console.error('fetchMyRecurringSchedules:', error); return []; }
  return (data ?? []) as RecurringSchedule[];
}

export async function fetchRecurringScheduleById(id: string): Promise<RecurringSchedule | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('recurring_schedules')
    .select(`
      *,
      creator:players!recurring_schedules_creator_id_fkey(*),
      venue:venues(*)
    `)
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as RecurringSchedule;
}

export async function createRecurringSchedule(
  params: Omit<RecurringSchedule, 'id' | 'creator' | 'venue' | 'occurrence_count' | 'created_at' | 'updated_at' | 'subscriber_count' | 'upcoming_session'>
): Promise<RecurringSchedule | null> {
  const supabase = createClient();

  // Lấy auth.uid() thực tế — PHẢI dùng cái này cho creator_id để RLS pass
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('createRecurringSchedule: not authenticated', authError);
    return null;
  }

  // Override creator_id bằng auth.uid() thực tế (tránh mismatch với players.id)
  const payload = { ...params, creator_id: user.id };

  console.log('createRecurringSchedule payload creator_id:', user.id);

  const { data, error } = await supabase
    .from('recurring_schedules')
    .insert(payload)
    .select('*')
    .single();
  if (error) {
    console.error('createRecurringSchedule error:', JSON.stringify(error));
    return null;
  }
  return data as RecurringSchedule;
}

export async function updateRecurringSchedule(
  id: string,
  updates: Partial<RecurringSchedule>
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('recurring_schedules')
    .update(updates)
    .eq('id', id);
  return !error;
}

export async function endRecurringSchedule(id: string): Promise<boolean> {
  return updateRecurringSchedule(id, { status: 'ended' as RecurringScheduleStatus });
}

export async function pauseSchedule(
  id: string, from: string, until: string
): Promise<boolean> {
  return updateRecurringSchedule(id, {
    status: 'paused' as RecurringScheduleStatus,
    paused_from: from,
    paused_until: until,
  });
}

export async function resumeSchedule(id: string): Promise<boolean> {
  return updateRecurringSchedule(id, {
    status: 'active' as RecurringScheduleStatus,
    paused_from: null,
    paused_until: null,
  });
}

// ─── Subscribers ───

export async function fetchSubscribers(scheduleId: string): Promise<RecurringSubscriber[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('recurring_subscribers')
    .select(`*, player:players(id, full_name, nickname, avatar_url, tier)`)
    .eq('schedule_id', scheduleId)
    .order('subscribed_at');
  return (data ?? []) as RecurringSubscriber[];
}

export async function checkIsSubscribed(scheduleId: string, playerId: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from('recurring_subscribers')
    .select('id')
    .eq('schedule_id', scheduleId)
    .eq('player_id', playerId)
    .single();
  return !!data;
}

export async function subscribeToSchedule(scheduleId: string, playerId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('recurring_subscribers')
    .upsert({ schedule_id: scheduleId, player_id: playerId });
  return !error;
}

export async function unsubscribeFromSchedule(scheduleId: string, playerId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('recurring_subscribers')
    .delete()
    .eq('schedule_id', scheduleId)
    .eq('player_id', playerId);
  return !error;
}

// ─── Exceptions ───

export async function fetchExceptions(scheduleId: string): Promise<RecurringException[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('recurring_exceptions')
    .select('*')
    .eq('schedule_id', scheduleId)
    .gte('original_date', toDateString(new Date()))
    .order('original_date');
  return (data ?? []) as RecurringException[];
}

export async function createException(params: {
  scheduleId: string;
  originalDate: string;
  action: 'cancel' | 'reschedule' | 'modify';
  cancelReason?: string;
  newDate?: string;
  newStartTime?: string;
  newEndTime?: string;
  newVenueId?: string;
  createdBy: string;
}): Promise<RecurringException | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('recurring_exceptions')
    .upsert({
      schedule_id: params.scheduleId,
      original_date: params.originalDate,
      action: params.action,
      cancel_reason: params.cancelReason ?? null,
      new_date: params.newDate ?? null,
      new_start_time: params.newStartTime ?? null,
      new_end_time: params.newEndTime ?? null,
      new_venue_id: params.newVenueId ?? null,
      created_by: params.createdBy,
    }, { onConflict: 'schedule_id,original_date' })
    .select()
    .single();
  if (error) { console.error('createException:', error); return null; }
  return data as RecurringException;
}

// ─── Sessions API ───

export async function fetchSessionsForSchedule(
  scheduleId: string,
  upcoming = true
): Promise<Session[]> {
  const supabase = createClient();
  const today = toDateString(new Date());
  const query = supabase
    .from('sessions')
    .select('*')
    .eq('recurring_schedule_id', scheduleId)
    .order('date', { ascending: upcoming });

  if (upcoming) query.gte('date', today);
  else query.lt('date', today);

  const { data, error } = await query.limit(20);
  if (error) return [];
  return (data ?? []) as Session[];
}

/**
 * Generate sessions for next 4 weeks (lazy, on-demand)
 * Only creates sessions that don't exist yet.
 */
export async function generateUpcomingSessions(
  schedule: RecurringSchedule,
  exceptions: RecurringException[],
  hostId: string
): Promise<number> {
  const supabase = createClient();

  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 28); // 4 tuần tới

  const occurrenceDates = getOccurrenceDates(schedule, from, to);

  // Fetch existing sessions in this range to avoid duplicates
  const { data: existing } = await supabase
    .from('sessions')
    .select('recurring_date')
    .eq('recurring_schedule_id', schedule.id)
    .gte('date', toDateString(from))
    .lte('date', toDateString(to));

  const existingDates = new Set((existing ?? []).map(s => s.recurring_date));

  // Filter: skip paused, cancelled, already generated
  const toGenerate = occurrenceDates.filter(d => {
    const ds = toDateString(d);
    return (
      !existingDates.has(ds) &&
      !isDateInPause(ds, schedule) &&
      !isDateCancelled(ds, exceptions)
    );
  });

  if (toGenerate.length === 0) return 0;

  // Check for 'reschedule' exceptions to use modified date/time
  const rows = toGenerate.map(d => {
    const ds = toDateString(d);
    const exc = getException(ds, exceptions);
    const effectiveDate = exc?.new_date ?? ds;
    const effectiveStartTime = exc?.new_start_time ?? schedule.start_time;
    const effectiveEndTime = exc?.new_end_time ?? schedule.end_time;
    const effectiveVenueId = exc?.new_venue_id ?? schedule.venue_id;

    return {
      title: schedule.name,
      host_id: hostId,
      date: effectiveDate,
      start_time: effectiveStartTime,
      end_time: effectiveEndTime,
      venue_id: effectiveVenueId,
      sport_mode: schedule.sport_mode,
      match_mode: schedule.match_mode,
      scope: schedule.scope,
      num_courts: schedule.num_courts,
      max_players: schedule.max_players,
      is_scored: schedule.track_elo,
      notes: schedule.notes,
      status: 'open',
      current_round: 0,
      recurring_schedule_id: schedule.id,
      recurring_date: ds,
    };
  });

  const { data, error } = await supabase.from('sessions').insert(rows).select('id');
  if (error) { console.error('generateUpcomingSessions:', error); return 0; }

  // Update occurrence_count
  await supabase
    .from('recurring_schedules')
    .update({ occurrence_count: schedule.occurrence_count + (data?.length ?? 0) })
    .eq('id', schedule.id);

  return data?.length ?? 0;
}

// ─── Stats ───

export interface RecurringStats {
  totalSessions: number;
  avgPlayers: number;
  subscriberCount: number;
  mostActivePlayers: Array<{ playerId: string; name: string; count: number }>;
}

export async function fetchScheduleStats(scheduleId: string): Promise<RecurringStats> {
  const supabase = createClient();

  const [sessionsRes, subscribersRes] = await Promise.all([
    supabase.from('sessions')
      .select('id, player_count')
      .eq('recurring_schedule_id', scheduleId)
      .eq('status', 'completed'),
    supabase.from('recurring_subscribers')
      .select('player_id, players(full_name, nickname)', { count: 'exact' })
      .eq('schedule_id', scheduleId),
  ]);

  const sessions = sessionsRes.data ?? [];
  const totalSessions = sessions.length;
  const avgPlayers = totalSessions > 0
    ? Math.round(sessions.reduce((s, r) => s + (r.player_count ?? 0), 0) / totalSessions)
    : 0;

  return {
    totalSessions,
    avgPlayers,
    subscriberCount: subscribersRes.count ?? 0,
    mostActivePlayers: [], // Would require session_players join — kept simple for now
  };
}
