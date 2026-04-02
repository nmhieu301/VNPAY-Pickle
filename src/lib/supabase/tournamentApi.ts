// ═══════════════════════════════════════════
// VNPAY Pickle — Tournament API Service Layer
// Supabase queries for Tournament Module
// ═══════════════════════════════════════════

import { createClient } from './client';
import type {
  Tournament, TournamentEvent, TournamentTeamExtended,
  TournamentMatch, TournamentStanding, SetScore
} from '@/types';

const supabase = createClient();

// ─── Mappers ───

function mapTournament(row: Record<string, unknown>): Tournament {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    banner_url: row.banner_url as string | null,
    organizer_id: row.organizer_id as string,
    type: (row.type as Tournament['type']) || 'custom',
    format: (row.format as Tournament['format']) || 'round_robin',
    category: row.category as string || '',
    max_teams: row.max_teams as number || 16,
    registration_deadline: row.registration_deadline as string || '',
    registration_open_date: row.registration_open_date as string | null,
    start_date: row.start_date as string || '',
    end_date: row.end_date as string || '',
    venue_id: row.venue_id as string | null,
    group_id: row.group_id as string | null,
    status: (row.status as Tournament['status']) || 'draft',
    rules: row.rules as string | null,
    prizes: row.prizes as string | null,
    scoring_system: (row.scoring_system as Tournament['scoring_system']) || 'side_out',
    points_target: row.points_target as number || 11,
    sets_format: (row.sets_format as Tournament['sets_format']) || 'bo3',
    rest_minutes: row.rest_minutes as number || 10,
    has_third_place: row.has_third_place as boolean ?? true,
    is_paused: row.is_paused as boolean ?? false,
    entry_fee: row.entry_fee as number || 0,
    num_courts: row.num_courts as number || 2,
    max_match_minutes: row.max_match_minutes as number | null,
    special_rules: row.special_rules as string | null,
    created_at: row.created_at as string,
  };
}

function mapEvent(row: Record<string, unknown>): TournamentEvent {
  return {
    id: row.id as string,
    tournament_id: row.tournament_id as string,
    category: row.category as TournamentEvent['category'],
    division: (row.division as TournamentEvent['division']) || 'open',
    elo_min: row.elo_min as number | null,
    elo_max: row.elo_max as number | null,
    format: (row.format as TournamentEvent['format']) || 'pool_playoff',
    max_teams: row.max_teams as number || 16,
    num_pools: row.num_pools as number | null,
    teams_advance_per_pool: row.teams_advance_per_pool as number || 2,
    swiss_rounds: row.swiss_rounds as number | null,
    status: (row.status as TournamentEvent['status']) || 'registration',
    created_at: row.created_at as string,
  };
}

function mapTeam(row: Record<string, unknown>): TournamentTeamExtended {
  return {
    id: row.id as string,
    event_id: row.event_id as string,
    player1_id: row.player1_id as string,
    player2_id: row.player2_id as string | null,
    team_name: row.team_name as string | null,
    seed_number: row.seed_number as number | null,
    avg_elo: row.avg_elo as number | null,
    pool_letter: row.pool_letter as string | null,
    status: (row.status as TournamentTeamExtended['status']) || 'pending',
    checked_in: row.checked_in as boolean ?? false,
    registered_at: row.registered_at as string,
  };
}

function mapMatch(row: Record<string, unknown>): TournamentMatch {
  const sets: SetScore[] = [];
  const pairs = [[row.set1_a, row.set1_b],[row.set2_a, row.set2_b],[row.set3_a, row.set3_b],[row.set4_a, row.set4_b],[row.set5_a, row.set5_b]];
  for (const [a, b] of pairs) {
    if (a !== null && b !== null && a !== undefined && b !== undefined) {
      sets.push({ a: a as number, b: b as number });
    }
  }

  return {
    id: row.id as string,
    event_id: row.event_id as string,
    round_type: row.round_type as TournamentMatch['round_type'],
    round_number: row.round_number as number | null,
    match_number: row.match_number as number | null,
    team_a_id: row.team_a_id as string | null,
    team_b_id: row.team_b_id as string | null,
    court_number: row.court_number as number | null,
    scheduled_time: row.scheduled_time as string | null,
    sets,
    set1_a: row.set1_a as number | null, set1_b: row.set1_b as number | null,
    set2_a: row.set2_a as number | null, set2_b: row.set2_b as number | null,
    set3_a: row.set3_a as number | null, set3_b: row.set3_b as number | null,
    set4_a: row.set4_a as number | null, set4_b: row.set4_b as number | null,
    set5_a: row.set5_a as number | null, set5_b: row.set5_b as number | null,
    winner_team_id: row.winner_team_id as string | null,
    status: (row.status as TournamentMatch['status']) || 'scheduled',
    is_walkover: row.is_walkover as boolean ?? false,
    dispute_note: row.dispute_note as string | null,
    score_confirmed_by_a: row.score_confirmed_by_a as boolean ?? false,
    score_confirmed_by_b: row.score_confirmed_by_b as boolean ?? false,
    started_at: row.started_at as string | null,
    completed_at: row.completed_at as string | null,
    // Phase 3: Live scoring lock
    scoring_locked_by: row.scoring_locked_by as string | null ?? null,
    scoring_locked_at: row.scoring_locked_at as string | null ?? null,
  };
}

function mapStanding(row: Record<string, unknown>): TournamentStanding {
  return {
    id: row.id as string,
    event_id: row.event_id as string,
    team_id: row.team_id as string,
    pool_letter: row.pool_letter as string | null,
    wins: row.wins as number || 0,
    losses: row.losses as number || 0,
    points_for: row.points_for as number || 0,
    points_against: row.points_against as number || 0,
    point_differential: row.point_differential as number || 0,
    buchholz_score: row.buchholz_score as number | null,
    rank_in_pool: row.rank_in_pool as number | null,
  };
}

// ═══════════════════════════════════════════
// FETCH FUNCTIONS
// ═══════════════════════════════════════════

export async function fetchTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchTournaments:', error); return []; }
  return (data || []).map(mapTournament);
}

export async function fetchTournamentById(id: string): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return mapTournament(data);
}

export async function fetchTournamentEvents(tournamentId: string): Promise<TournamentEvent[]> {
  const { data, error } = await supabase
    .from('tournament_events')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at');
  if (error) { console.error('fetchTournamentEvents:', error); return []; }
  return (data || []).map(mapEvent);
}

export async function fetchTournamentTeams(eventId: string): Promise<TournamentTeamExtended[]> {
  const { data, error } = await supabase
    .from('tournament_teams')
    .select('*')
    .eq('event_id', eventId)
    .order('seed_number');
  if (error) { console.error('fetchTournamentTeams:', error); return []; }
  return (data || []).map(mapTeam);
}

export async function fetchTournamentMatches(eventId: string): Promise<TournamentMatch[]> {
  const { data, error } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('event_id', eventId)
    .order('round_number')
    .order('match_number');
  if (error) { console.error('fetchTournamentMatches:', error); return []; }
  return (data || []).map(mapMatch);
}

export async function fetchTournamentStandings(eventId: string): Promise<TournamentStanding[]> {
  const { data, error } = await supabase
    .from('tournament_standings')
    .select('*')
    .eq('event_id', eventId)
    .order('rank_in_pool');
  if (error) { console.error('fetchTournamentStandings:', error); return []; }
  return (data || []).map(mapStanding);
}

export async function fetchLiveMatches(tournamentId: string): Promise<TournamentMatch[]> {
  // Fetch all events for this tournament, then live matches
  const events = await fetchTournamentEvents(tournamentId);
  if (!events.length) return [];
  const eventIds = events.map(e => e.id);

  const { data, error } = await supabase
    .from('tournament_matches')
    .select('*')
    .in('event_id', eventIds)
    .in('status', ['live', 'scheduled'])
    .order('scheduled_time');
  if (error) return [];
  return (data || []).map(mapMatch);
}

// ═══════════════════════════════════════════
// MUTATION FUNCTIONS
// ═══════════════════════════════════════════

export async function createTournamentDB(data: {
  name: string;
  description?: string | null;
  banner_url?: string | null;
  organizer_id: string;
  type: string;
  status: string;
  venue_id?: string | null;
  group_id?: string | null;
  registration_open_date?: string | null;
  registration_deadline: string;
  start_date: string;
  end_date: string;
  scoring_system: string;
  points_target: number;
  sets_format: string;
  rest_minutes: number;
  has_third_place: boolean;
  entry_fee: number;
  num_courts: number;
  max_match_minutes?: number | null;
  rules?: string | null;
  prizes?: string | null;
  special_rules?: string | null;
  max_teams: number;
  format: string;
  category: string;
}): Promise<Tournament | null> {
  const { data: row, error } = await supabase
    .from('tournaments')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('createTournamentDB error:', error.code, error.message, error.details);
    if (error.code === '42P01') {
      console.error('⚠️ Bảng "tournaments" chưa tồn tại! Hãy chạy scripts/tournament_migration.sql trên Supabase SQL Editor.');
    }
    return null;
  }
  return mapTournament(row);
}

export async function createTournamentEventDB(data: {
  tournament_id: string;
  category: string;
  division: string;
  elo_min?: number | null;
  elo_max?: number | null;
  format: string;
  max_teams: number;
  num_pools?: number | null;
  teams_advance_per_pool: number;
  swiss_rounds?: number | null;
}): Promise<TournamentEvent | null> {
  const { data: row, error } = await supabase
    .from('tournament_events')
    .insert(data)
    .select()
    .single();
  if (error) { console.error('createTournamentEventDB:', error); return null; }
  return mapEvent(row);
}

export async function registerTeamDB(data: {
  event_id: string;
  player1_id: string;
  player2_id?: string | null;
  team_name?: string | null;
  avg_elo?: number;
}): Promise<TournamentTeamExtended | null> {
  const { data: row, error } = await supabase
    .from('tournament_teams')
    .insert({ ...data, status: 'pending' })
    .select()
    .single();
  if (error) { console.error('registerTeamDB:', error); return null; }
  return mapTeam(row);
}

export async function updateTeamStatusDB(
  teamId: string,
  status: string,
  seedNumber?: number | null
): Promise<boolean> {
  const updates: Record<string, unknown> = { status };
  if (seedNumber !== undefined) updates.seed_number = seedNumber;
  const { error } = await supabase.from('tournament_teams').update(updates).eq('id', teamId);
  if (error) { console.error('updateTeamStatusDB:', error); return false; }
  return true;
}

export async function updateTeamPoolDB(teamId: string, poolLetter: string): Promise<boolean> {
  const { error } = await supabase.from('tournament_teams').update({ pool_letter: poolLetter }).eq('id', teamId);
  return !error;
}

export async function saveBracketMatchesDB(
  matches: Array<{
    event_id: string;
    round_type: string;
    round_number: number;
    match_number: number;
    team_a_id: string | null;
    team_b_id: string | null;
    court_number?: number | null;
    scheduled_time?: string | null;
  }>
): Promise<boolean> {
  const { error } = await supabase.from('tournament_matches').insert(matches);
  if (error) { console.error('saveBracketMatchesDB:', error); return false; }
  return true;
}

export async function updateMatchResultDB(
  matchId: string,
  sets: Array<{ a: number; b: number }>,
  winnerTeamId: string,
  status: string = 'completed'
): Promise<boolean> {
  const updates: Record<string, unknown> = { winner_team_id: winnerTeamId, status, completed_at: new Date().toISOString() };
  for (let i = 0; i < 5; i++) {
    if (sets[i]) {
      updates[`set${i + 1}_a`] = sets[i].a;
      updates[`set${i + 1}_b`] = sets[i].b;
    }
  }
  const { error } = await supabase.from('tournament_matches').update(updates).eq('id', matchId);
  if (error) { console.error('updateMatchResultDB:', error); return false; }
  return true;
}

export async function updateMatchStatusDB(matchId: string, status: string): Promise<boolean> {
  const updates: Record<string, unknown> = { status };
  if (status === 'live') updates.started_at = new Date().toISOString();
  const { error } = await supabase.from('tournament_matches').update(updates).eq('id', matchId);
  return !error;
}

export async function updateMatchScheduleDB(
  matchId: string, courtNumber: number, scheduledTime: string
): Promise<boolean> {
  const { error } = await supabase.from('tournament_matches')
    .update({ court_number: courtNumber, scheduled_time: scheduledTime })
    .eq('id', matchId);
  return !error;
}

export async function upsertStandingDB(standing: {
  event_id: string;
  team_id: string;
  pool_letter?: string | null;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  point_differential: number;
  rank_in_pool?: number | null;
}): Promise<boolean> {
  const { error } = await supabase.from('tournament_standings')
    .upsert(standing, { onConflict: 'event_id,team_id' });
  if (error) { console.error('upsertStandingDB:', error); return false; }
  return true;
}

export async function updateTournamentStatusDB(id: string, status: string): Promise<boolean> {
  const { error } = await supabase.from('tournaments').update({ status }).eq('id', id);
  return !error;
}

export async function updateEventStatusDB(id: string, status: string): Promise<boolean> {
  const { error } = await supabase.from('tournament_events').update({ status }).eq('id', id);
  return !error;
}

export async function checkInTeamDB(teamId: string, checkedIn: boolean): Promise<boolean> {
  const { error } = await supabase.from('tournament_teams')
    .update({ checked_in: checkedIn }).eq('id', teamId);
  return !error;
}

export async function flagDisputeDB(matchId: string, note: string): Promise<boolean> {
  const { error } = await supabase.from('tournament_matches')
    .update({ status: 'dispute', dispute_note: note }).eq('id', matchId);
  return !error;
}
