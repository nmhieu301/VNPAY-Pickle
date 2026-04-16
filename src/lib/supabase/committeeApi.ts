// ═══════════════════════════════════════════
// VNPAY Pickle — Committee API (Supabase)
// Phase 3: Quản lý ban tổ chức, VĐV, Live Scoring
// ═══════════════════════════════════════════

import { createClient } from '@/lib/supabase/client';
import type {
  TournamentCommitteeMember, GuestPlayer, ScoreLog,
  TournamentTeamExtended, Player, GuestTier,
} from '@/types';

// ─── Committee Management ───

export async function fetchCommittee(tournamentId: string): Promise<TournamentCommitteeMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tournament_committee')
    .select(`*, player:players(*)`)
    .eq('tournament_id', tournamentId)
    .order('added_at');
  if (error) { console.error('fetchCommittee:', error); return []; }
  return data as unknown as TournamentCommitteeMember[];
}

export async function addCommitteeMember(
  tournamentId: string,
  playerId: string,
  role: 'committee' | 'director' = 'committee'
): Promise<TournamentCommitteeMember | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tournament_committee')
    .insert({ tournament_id: tournamentId, player_id: playerId, role })
    .select(`*, player:players(*)`)
    .single();
  if (error) { console.error('addCommitteeMember:', error); return null; }
  return data as unknown as TournamentCommitteeMember;
}

export async function removeCommitteeMember(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('tournament_committee').delete().eq('id', id);
  if (error) { console.error('removeCommitteeMember:', error); return false; }
  return true;
}

export async function checkIsCommittee(tournamentId: string, playerId: string): Promise<'director' | 'committee' | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('tournament_committee')
    .select('role')
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId)
    .single();
  return (data?.role as 'director' | 'committee') ?? null;
}

// ─── Player Search ───

export async function searchPlayers(query: string, limit = 10): Promise<Player[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .or(`full_name.ilike.%${query}%, nickname.ilike.%${query}%, email.ilike.%${query}%`)
    .limit(limit)
    .order('full_name');
  if (error) { console.error('searchPlayers:', error); return []; }
  return (data ?? []) as unknown as Player[];
}

export async function fetchAllPlayers(): Promise<Player[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('players')
    .select('*')
    .order('full_name');
  return (data ?? []) as unknown as Player[];
}

// ─── Manual Player Registration ───

export async function addPlayerToEvent(
  eventId: string,
  player1Id: string,
  player2Id?: string,
  teamName?: string
): Promise<TournamentTeamExtended | null> {
  const supabase = createClient();

  // Calculate avg tier
  const { data: p1 } = await supabase
    .from('players')
    .select('tier')
    .eq('id', player1Id)
    .single();

  let avgElo = p1?.tier ?? 0;
  if (player2Id) {
    const { data: p2 } = await supabase
      .from('players')
      .select('tier')
      .eq('id', player2Id)
      .single();
    avgElo = ((p1?.tier ?? 0) + (p2?.tier ?? 0)) / 2;
  }

  const { data, error } = await supabase
    .from('tournament_teams')
    .insert({
      event_id: eventId,
      player1_id: player1Id,
      player2_id: player2Id ?? null,
      team_name: teamName ?? null,
      avg_elo: avgElo,
      status: 'confirmed', // bypass approval
    })
    .select(`*,
      player1:players!tournament_teams_player1_id_fkey(*),
      player2:players!tournament_teams_player2_id_fkey(*)
    `)
    .single();
  if (error) { console.error('addPlayerToEvent:', error); return null; }
  return data as unknown as TournamentTeamExtended;
}

export async function bulkAddTeams(
  eventId: string,
  pairs: Array<{ player1Id: string; player2Id?: string; avgElo?: number }>
): Promise<number> {
  const supabase = createClient();
  const rows = pairs.map(p => ({
    event_id: eventId,
    player1_id: p.player1Id,
    player2_id: p.player2Id ?? null,
    avg_elo: p.avgElo ?? 1000,
    status: 'confirmed',
  }));
  const { data, error } = await supabase
    .from('tournament_teams')
    .insert(rows)
    .select('id');
  if (error) { console.error('bulkAddTeams:', error); return 0; }
  return data?.length ?? 0;
}

// ─── Guest Players ───

export async function createGuestPlayer(params: {
  tournamentId: string;
  fullName: string;
  phone?: string;
  email?: string;
  company?: string;
  estimatedTier?: GuestTier;
  createdBy: string;
}): Promise<GuestPlayer | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('guest_players')
    .insert({
      tournament_id: params.tournamentId,
      full_name: params.fullName,
      phone: params.phone ?? null,
      email: params.email ?? null,
      company: params.company ?? 'VNPAY',
      estimated_tier: params.estimatedTier ?? 'Silver',
      created_by: params.createdBy,
    })
    .select('*')
    .single();
  if (error) { console.error('createGuestPlayer:', error); return null; }
  return data as unknown as GuestPlayer;
}

export async function linkGuestPlayer(guestId: string, playerId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('guest_players')
    .update({ linked_player_id: playerId })
    .eq('id', guestId);
  return !error;
}

export async function fetchGuestPlayers(tournamentId: string): Promise<GuestPlayer[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('guest_players')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at');
  return (data ?? []) as unknown as GuestPlayer[];
}

// ─── Team Management (Seed / Status) ───

export async function updateTeamSeed(teamId: string, seed: number): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tournament_teams')
    .update({ seed_number: seed })
    .eq('id', teamId);
  return !error;
}

export async function changeTeamStatus(
  teamId: string,
  status: 'confirmed' | 'withdrawn' | 'disqualified'
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tournament_teams')
    .update({ status })
    .eq('id', teamId);
  return !error;
}

export async function changeTeamPartner(teamId: string, newPlayer2Id: string | null): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tournament_teams')
    .update({ player2_id: newPlayer2Id })
    .eq('id', teamId);
  return !error;
}

// ─── Schedule Management ───

export async function updateMatchSchedule(
  matchId: string,
  court: number | null,
  time: string | null
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tournament_matches')
    .update({ court_number: court, scheduled_time: time })
    .eq('id', matchId);
  return !error;
}

export async function logScheduleChange(params: {
  matchId: string;
  changedBy: string;
  oldCourt?: number | null;
  newCourt?: number | null;
  oldTime?: string | null;
  newTime?: string | null;
  reason?: string;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from('schedule_change_log').insert({
    match_id: params.matchId,
    changed_by: params.changedBy,
    old_court: params.oldCourt ?? null,
    new_court: params.newCourt ?? null,
    old_time: params.oldTime ?? null,
    new_time: params.newTime ?? null,
    reason: params.reason ?? null,
  });
}

// ─── Live Scoring ───

export async function lockMatch(matchId: string, lockedBy: string): Promise<boolean> {
  const supabase = createClient();
  // Check if already locked
  const { data: match } = await supabase
    .from('tournament_matches')
    .select('scoring_locked_by')
    .eq('id', matchId)
    .single();

  const matchData = match as { scoring_locked_by?: string | null } | null;
  if (matchData?.scoring_locked_by && matchData.scoring_locked_by !== lockedBy) return false;

  const { error } = await supabase
    .from('tournament_matches')
    .update({ scoring_locked_by: lockedBy, scoring_locked_at: new Date().toISOString() })
    .eq('id', matchId);
  return !error;
}

export async function unlockMatch(matchId: string, playerId: string, isDirector = false): Promise<boolean> {
  const supabase = createClient();
  const { data: match } = await supabase
    .from('tournament_matches')
    .select('scoring_locked_by')
    .eq('id', matchId)
    .single();

  const matchData = match as { scoring_locked_by?: string | null } | null;
  if (!isDirector && matchData?.scoring_locked_by !== playerId) return false;

  const { error } = await supabase
    .from('tournament_matches')
    .update({ scoring_locked_by: null, scoring_locked_at: null })
    .eq('id', matchId);
  return !error;
}

export async function appendScoreLog(params: {
  matchId: string;
  setNumber: number;
  team: 'A' | 'B';
  scoreA: number;
  scoreB: number;
  action?: ScoreLog['action'];
  scoredBy?: string;
}): Promise<ScoreLog | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('score_log')
    .insert({
      match_id: params.matchId,
      set_number: params.setNumber,
      team: params.team,
      score_a: params.scoreA,
      score_b: params.scoreB,
      action: params.action ?? 'point',
      scored_by: params.scoredBy ?? null,
    })
    .select()
    .single();
  if (error) { console.error('appendScoreLog:', error); return null; }
  return data as unknown as ScoreLog;
}

export async function fetchScoreLog(matchId: string): Promise<ScoreLog[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('score_log')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at');
  return (data ?? []) as unknown as ScoreLog[];
}

export async function updateMatchScoreLive(params: {
  matchId: string;
  setScores: Array<{ a: number; b: number }>;
  status?: 'live' | 'completed';
  winnerTeamId?: string | null;
  startedAt?: string;
  completedAt?: string;
}): Promise<boolean> {
  const supabase = createClient();
  const s = params.setScores;
  const { error } = await supabase
    .from('tournament_matches')
    .update({
      status: params.status ?? 'live',
      set1_a: s[0]?.a ?? null, set1_b: s[0]?.b ?? null,
      set2_a: s[1]?.a ?? null, set2_b: s[1]?.b ?? null,
      set3_a: s[2]?.a ?? null, set3_b: s[2]?.b ?? null,
      set4_a: s[3]?.a ?? null, set4_b: s[3]?.b ?? null,
      set5_a: s[4]?.a ?? null, set5_b: s[4]?.b ?? null,
      winner_team_id: params.winnerTeamId ?? null,
      started_at: params.startedAt ?? undefined,
      completed_at: params.completedAt ?? undefined,
    })
    .eq('id', params.matchId);
  return !error;
}

export async function sendNotification(params: {
  userId: string;
  type: string;
  title: string;
  content: string;
  linkTo?: string;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    content: params.content,
    link_to: params.linkTo ?? null,
  });
}
