// ═══════════════════════════════════════════
// VNPAY Pickle — Attendance API
// RSVP dùng schedule_id + occurrence_date (trước khi session tồn tại)
// ═══════════════════════════════════════════

import { createClient } from '@/lib/supabase/client';
import type {
  Attendance, AttendanceStreak, AttendanceSettings,
  MemberAttendanceStat, SessionAttendanceSummary,
  RsvpStatus, CheckinMethod, Player,
} from '@/types';

// ─── RSVP ─────────────────────────────────────────────────────

export async function upsertRsvp(
  scheduleId: string,
  occurrenceDate: string,
  playerId: string,
  status: RsvpStatus,
  reason?: string,
): Promise<Attendance | null> {
  if (!scheduleId || !occurrenceDate || !playerId) {
    console.error('upsertRsvp: missing required params', { scheduleId, occurrenceDate, playerId });
    return null;
  }

  const supabase = createClient();

  // Verify auth first
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('upsertRsvp: not authenticated');
    return null;
  }

  // Upsert (không dùng .single() để tránh PGRST116)
  const { error: upsertError } = await supabase
    .from('attendance')
    .upsert({
      schedule_id: scheduleId,
      occurrence_date: occurrenceDate,
      player_id: playerId,
      rsvp_status: status,
      rsvp_reason: reason ?? null,
      rsvp_at: new Date().toISOString(),
    }, { onConflict: 'schedule_id,occurrence_date,player_id' });

  if (upsertError) {
    console.error('upsertRsvp error:', JSON.stringify(upsertError));
    return null;
  }

  // Fetch lại record vừa upsert
  const { data, error: fetchError } = await supabase
    .from('attendance')
    .select('*')
    .eq('schedule_id', scheduleId)
    .eq('occurrence_date', occurrenceDate)
    .eq('player_id', playerId)
    .single();

  if (fetchError) {
    console.error('upsertRsvp fetch-back error:', fetchError);
    return null;
  }

  return data as Attendance;
}

export async function fetchRsvpForOccurrence(
  scheduleId: string,
  occurrenceDate: string,
): Promise<Attendance[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('attendance')
    .select(`*, player:players(id, full_name, nickname, avatar_url, elo_rating, tier)`)
    .eq('schedule_id', scheduleId)
    .eq('occurrence_date', occurrenceDate)
    .order('rsvp_at', { ascending: true });
  if (error) { console.error('fetchRsvpForOccurrence:', error); return []; }
  return (data ?? []) as Attendance[];
}

export async function fetchMyRsvp(
  scheduleId: string,
  occurrenceDate: string,
  playerId: string,
): Promise<Attendance | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('attendance')
    .select('*')
    .eq('schedule_id', scheduleId)
    .eq('occurrence_date', occurrenceDate)
    .eq('player_id', playerId)
    .single();
  return data as Attendance | null;
}

// ─── Check-in ─────────────────────────────────────────────────

export async function selfCheckIn(
  scheduleId: string,
  occurrenceDate: string,
  playerId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('attendance')
    .upsert({
      schedule_id: scheduleId,
      occurrence_date: occurrenceDate,
      player_id: playerId,
      checked_in: true,
      checkin_method: 'self' as CheckinMethod,
      checkin_at: new Date().toISOString(),
    }, { onConflict: 'schedule_id,occurrence_date,player_id' });
  if (error) { console.error('selfCheckIn:', error); return false; }
  return true;
}

export async function hostCheckIn(
  scheduleId: string,
  occurrenceDate: string,
  playerId: string,
  checkedIn: boolean,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('attendance')
    .upsert({
      schedule_id: scheduleId,
      occurrence_date: occurrenceDate,
      player_id: playerId,
      checked_in: checkedIn,
      checkin_method: checkedIn ? ('host' as CheckinMethod) : null,
      checkin_at: checkedIn ? new Date().toISOString() : null,
    }, { onConflict: 'schedule_id,occurrence_date,player_id' });
  if (error) { console.error('hostCheckIn:', error); return false; }
  return true;
}

// ─── Finalize (tính final_status sau buổi) ────────────────────

export async function finalizeAttendance(
  scheduleId: string,
  occurrenceDate: string,
): Promise<void> {
  const supabase = createClient();
  const records = await fetchRsvpForOccurrence(scheduleId, occurrenceDate);

  const updates = records.map(r => {
    let final_status: string;
    if (r.checked_in) {
      final_status = 'present';
    } else if (r.rsvp_status === 'not_going') {
      final_status = 'excused';
    } else if (r.rsvp_status === 'going' || r.rsvp_status === 'maybe') {
      final_status = 'no_show';
    } else {
      final_status = 'no_response';
    }
    return { id: r.id, final_status };
  });

  for (const u of updates) {
    await supabase.from('attendance').update({ final_status: u.final_status }).eq('id', u.id);
  }

  // Cập nhật streak cho những ai có final_status
  await recalcStreaksForOccurrence(scheduleId, occurrenceDate, records);
}

// ─── Streak ───────────────────────────────────────────────────

async function recalcStreaksForOccurrence(
  scheduleId: string,
  occurrenceDate: string,
  records: Attendance[],
): Promise<void> {
  const supabase = createClient();

  for (const r of records) {
    // Lấy streak hiện tại
    const { data: streak } = await supabase
      .from('attendance_streaks')
      .select('*')
      .eq('player_id', r.player_id)
      .eq('schedule_id', scheduleId)
      .single();

    const current = streak?.current_streak ?? 0;
    const longest = streak?.longest_streak ?? 0;

    let newCurrent = current;
    let newLongest = longest;

    if (r.final_status === 'present') {
      newCurrent = current + 1;
      newLongest = Math.max(longest, newCurrent);
    } else if (r.final_status === 'excused') {
      // Không reset streak, không tăng
    } else {
      // no_show | no_response → reset
      newCurrent = 0;
    }

    await supabase.from('attendance_streaks').upsert({
      player_id: r.player_id,
      schedule_id: scheduleId,
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_present_date: r.final_status === 'present' ? occurrenceDate : streak?.last_present_date ?? null,
      last_updated_at: new Date().toISOString(),
    }, { onConflict: 'player_id,schedule_id' });
  }
}

export async function fetchStreaks(scheduleId: string): Promise<AttendanceStreak[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('attendance_streaks')
    .select(`*, player:players(id, full_name, nickname, avatar_url, tier)`)
    .eq('schedule_id', scheduleId)
    .order('current_streak', { ascending: false });
  if (error) { console.error('fetchStreaks:', error); return []; }
  return (data ?? []) as AttendanceStreak[];
}

export async function fetchMyStreak(
  scheduleId: string,
  playerId: string,
): Promise<AttendanceStreak | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('attendance_streaks')
    .select('*')
    .eq('schedule_id', scheduleId)
    .eq('player_id', playerId)
    .single();
  return data as AttendanceStreak | null;
}

// ─── Stats (bảng tổng hợp) ────────────────────────────────────

export async function fetchGroupAttendanceStats(
  scheduleId: string,
  weeksBack = 8,
): Promise<MemberAttendanceStat[]> {
  const supabase = createClient();

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - weeksBack * 7);
  const fromStr = fromDate.toISOString().split('T')[0];

  // Fetch all attendance for schedule in range
  const { data: records, error } = await supabase
    .from('attendance')
    .select(`*, player:players(id, full_name, nickname, avatar_url, elo_rating, tier)`)
    .eq('schedule_id', scheduleId)
    .gte('occurrence_date', fromStr)
    .not('final_status', 'is', null);

  if (error || !records) return [];

  // Fetch streaks
  const { data: streaks } = await supabase
    .from('attendance_streaks')
    .select('*')
    .eq('schedule_id', scheduleId);

  const streakMap = new Map((streaks ?? []).map(s => [s.player_id, s]));

  // Group by player
  const byPlayer = new Map<string, Attendance[]>();
  for (const r of records) {
    const arr = byPlayer.get(r.player_id) ?? [];
    arr.push(r as Attendance);
    byPlayer.set(r.player_id, arr);
  }

  const stats: MemberAttendanceStat[] = [];
  for (const [pid, recs] of byPlayer) {
    const player = (recs[0] as Attendance & { player: Player }).player;
    if (!player) continue;

    const present = recs.filter(r => r.final_status === 'present').length;
    const excused = recs.filter(r => r.final_status === 'excused').length;
    const no_show = recs.filter(r => r.final_status === 'no_show').length;
    const no_resp = recs.filter(r => r.final_status === 'no_response').length;
    const total = recs.length;
    const denominator = total - excused;
    const rate = denominator > 0 ? Math.round((present / denominator) * 100) : 0;
    const streak = streakMap.get(pid);

    stats.push({
      player_id: pid,
      player,
      total_sessions: total,
      present_count: present,
      excused_count: excused,
      no_show_count: no_show,
      no_response_count: no_resp,
      attendance_rate: rate,
      current_streak: streak?.current_streak ?? 0,
      longest_streak: streak?.longest_streak ?? 0,
    });
  }

  return stats.sort((a, b) => b.attendance_rate - a.attendance_rate);
}

// ─── History by occurrence ─────────────────────────────────────

export async function fetchAttendanceBySession(
  scheduleId: string,
  limit = 10,
): Promise<SessionAttendanceSummary[]> {
  const supabase = createClient();

  // Distinct occurrence dates
  const { data: dates } = await supabase
    .from('attendance')
    .select('occurrence_date, session_id')
    .eq('schedule_id', scheduleId)
    .not('final_status', 'is', null)
    .order('occurrence_date', { ascending: false })
    .limit(limit);

  if (!dates?.length) return [];

  const uniqueDates = [...new Set(dates.map(d => d.occurrence_date))];
  const summaries: SessionAttendanceSummary[] = [];

  for (const date of uniqueDates) {
    const records = await fetchRsvpForOccurrence(scheduleId, date);
    const sessionId = dates.find(d => d.occurrence_date === date)?.session_id ?? null;

    summaries.push({
      occurrence_date: date,
      session_id: sessionId,
      going: records.filter(r => r.rsvp_status === 'going'),
      not_going: records.filter(r => r.rsvp_status === 'not_going'),
      maybe: records.filter(r => r.rsvp_status === 'maybe'),
      no_response: records.filter(r => r.rsvp_status === 'no_response'),
      checked_in: records.filter(r => r.checked_in),
      no_show: records.filter(r => r.final_status === 'no_show'),
      total_members: records.length,
    });
  }

  return summaries;
}

// ─── Settings ─────────────────────────────────────────────────

export async function fetchAttendanceSettings(
  groupId?: string,
  scheduleId?: string,
): Promise<AttendanceSettings | null> {
  const supabase = createClient();
  let query = supabase.from('attendance_settings').select('*');
  if (scheduleId) query = query.eq('schedule_id', scheduleId);
  else if (groupId) query = query.eq('group_id', groupId);
  const { data } = await query.single();
  return data as AttendanceSettings | null;
}

export async function upsertAttendanceSettings(
  groupId: string | null,
  scheduleId: string | null,
  settings: Partial<Omit<AttendanceSettings, 'id' | 'group_id' | 'schedule_id'>>,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('attendance_settings')
    .upsert({ group_id: groupId, schedule_id: scheduleId, ...settings });
  if (error) { console.error('upsertAttendanceSettings:', error); return false; }
  return true;
}
