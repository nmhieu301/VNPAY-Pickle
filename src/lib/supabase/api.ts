// ═══════════════════════════════════════════
// VNPAY Pickle — Supabase API Service Layer
// Centralized database queries
// ═══════════════════════════════════════════

import { createClient } from './client';
import type { Player, Session, Department, Venue, SessionPlayer, Group } from '@/types';
import { calculateTier } from '@/lib/algorithms/elo';

const supabase = createClient();

// ─── Helper: Map DB row → Player type ───
function mapPlayer(row: Record<string, unknown>): Player {
  const elo = row.elo_rating as number;
  const email = row.email as string;
  const isAdmin = email === 'hieunm2@vnpay.vn';
  
  return {
    id: row.id as string,
    email: email,
    full_name: row.full_name as string,
    nickname: row.nickname as string | null,
    department_id: row.department_id as string | null,
    avatar_url: row.avatar_url as string | null,
    phone: null,
    hand_preference: (row.preferred_hand as Player['hand_preference']) || 'right',
    position_preference: (row.preferred_position as Player['position_preference']) || 'flexible',
    experience: mapExperience(row.experience_level as string),
    bio: row.bio as string | null,
    elo_rating: elo,
    tier: calculateTier(elo) as Player['tier'],
    role: isAdmin ? 'admin' : 'player',
    is_active: row.is_active as boolean ?? true,
    total_matches: row.total_matches as number ?? 0,
    total_wins: row.wins as number ?? 0,
    win_streak: row.current_streak as number ?? 0,
    best_win_streak: row.best_streak as number ?? 0,
    created_at: row.joined_at as string ?? row.created_at as string,
    last_played_at: row.last_played_at as string | null,
  };
}

function mapExperience(level: string | null): Player['experience'] {
  const map: Record<string, Player['experience']> = {
    beginner: 'beginner',
    intermediate: '6_12m',
    advanced: '1_2y',
    expert: 'over_2y',
  };
  return map[level || 'beginner'] || 'beginner';
}

// ─── Helper: Map DB row → Session type ───
function mapSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    title: row.title as string,
    host_id: row.organizer_id as string,
    date: row.session_date as string,
    start_time: row.start_time as string,
    end_time: row.end_time as string,
    venue_id: row.venue_id as string | null,
    sport_mode: row.sport_mode as Session['sport_mode'],
    match_mode: row.match_mode as Session['match_mode'],
    scope: mapScope(row.scope as string),
    num_courts: row.num_courts as number ?? 2,
    max_players: row.max_players as number | null,
    is_scored: true,
    notes: row.notes as string | null,
    status: row.status as Session['status'],
    current_round: 0,
    created_at: row.created_at as string,
    player_count: 0, // will be computed from session_players
  };
}

function mapScope(scope: string | null): Session['scope'] {
  const map: Record<string, Session['scope']> = {
    open: 'public',
    department: 'department',
    invite: 'private',
  };
  return map[scope || 'open'] || 'public';
}

function mapDepartment(row: Record<string, unknown>): Department {
  return {
    id: row.id as string,
    name: row.name as string,
    code: row.short_name as string || '',
    description: null,
  };
}

function mapVenue(row: Record<string, unknown>): Venue {
  return {
    id: row.id as string,
    name: row.name as string,
    address: row.address as string || '',
    num_courts: row.num_courts as number | null,
    district: row.district as string | null,
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    rating: row.rating as number | null,
    phone: row.phone as string | null,
    hours: row.hours as string | null,
    features: row.features as string[] | null,
    place_id: row.place_id as string | null,
    price_note: row.price_note as string | null,
    map_url: null,
    notes: row.notes as string | null,
    image_url: null,
    is_active: true,
    is_indoor: row.is_indoor as boolean ?? false,
  };
}

// ═══════════════════════════════════════════
// FETCH FUNCTIONS
// ═══════════════════════════════════════════

export async function fetchPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('is_active', true)
    .order('elo_rating', { ascending: false });

  if (error) { console.error('fetchPlayers error:', error); return []; }
  return (data || []).map(mapPlayer);
}

export async function fetchPlayersAdmin(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('joined_at', { ascending: false });

  if (error) { console.error('fetchPlayersAdmin error:', error); return []; }
  return (data || []).map(mapPlayer);
}

export async function fetchPlayerByEmail(email: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return null;
  return mapPlayer(data);
}

export async function fetchDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name');

  if (error) { console.error('fetchDepartments error:', error); return []; }
  return (data || []).map(mapDepartment);
}

export async function fetchVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .order('name');

  if (error) { console.error('fetchVenues error:', error); return []; }
  return (data || []).map(mapVenue);
}

export async function fetchSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('session_date', { ascending: false });

  if (error) { console.error('fetchSessions error:', error); return []; }
  return (data || []).map(mapSession);
}

export async function fetchSessionPlayers(sessionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('session_players')
    .select('player_id')
    .eq('session_id', sessionId);

  if (error) { console.error('fetchSessionPlayers error:', error); return []; }
  return (data || []).map(r => r.player_id);
}

export async function fetchCheckedInPlayers(sessionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('session_players')
    .select('player_id')
    .eq('session_id', sessionId)
    .eq('checked_in', true);

  if (error) return [];
  return (data || []).map(r => r.player_id);
}

export async function fetchAllSessionPlayersMap(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from('session_players')
    .select('session_id, player_id');

  if (error) return {};
  const map: Record<string, string[]> = {};
  for (const row of data || []) {
    if (!map[row.session_id]) map[row.session_id] = [];
    map[row.session_id].push(row.player_id);
  }
  return map;
}

export async function fetchAllCheckedInMap(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from('session_players')
    .select('session_id, player_id')
    .eq('checked_in', true);

  if (error) return {};
  const map: Record<string, string[]> = {};
  for (const row of data || []) {
    if (!map[row.session_id]) map[row.session_id] = [];
    map[row.session_id].push(row.player_id);
  }
  return map;
}

// ═══════════════════════════════════════════
// MUTATION FUNCTIONS
// ═══════════════════════════════════════════

export async function createPlayer(email: string): Promise<Player | null> {
  const nameParts = email.split('@')[0].split('.');
  const fullName = nameParts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const nickname = nameParts[0];

  const { data, error } = await supabase
    .from('players')
    .insert({
      email,
      full_name: fullName,
      nickname,
      elo_rating: 1200,
      total_matches: 0,
      wins: 0,
      losses: 0,
      win_rate: 0,
      best_streak: 0,
      current_streak: 0,
    })
    .select()
    .single();

  if (error) { console.error('createPlayer error:', error); return null; }
  return mapPlayer(data);
}

export async function insertSession(sessionData: {
  title: string;
  organizer_id: string;
  venue_id: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  sport_mode: string;
  match_mode: string;
  scope: string;
  max_players: number | null;
  num_courts: number;
  notes: string | null;
}): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .insert(sessionData)
    .select()
    .single();

  if (error) { console.error('insertSession error:', error); return null; }
  return mapSession(data);
}

export async function joinSessionDB(sessionId: string, playerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('session_players')
    .insert({ session_id: sessionId, player_id: playerId, checked_in: false });

  if (error) { console.error('joinSession error:', error); return false; }
  return true;
}

export async function leaveSessionDB(sessionId: string, playerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('session_players')
    .delete()
    .eq('session_id', sessionId)
    .eq('player_id', playerId);

  if (error) { console.error('leaveSession error:', error); return false; }
  return true;
}

export async function toggleCheckInDB(sessionId: string, playerId: string, checkedIn: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('session_players')
    .update({ checked_in: checkedIn, checked_in_at: checkedIn ? new Date().toISOString() : null })
    .eq('session_id', sessionId)
    .eq('player_id', playerId);

  if (error) { console.error('toggleCheckIn error:', error); return false; }
  return true;
}

export async function createVenueDB(venueData: {
  name: string;
  address: string;
  district?: string | null;
  num_courts?: number | null;
  phone?: string | null;
  notes?: string | null;
}): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('venues')
    .insert({
      name: venueData.name,
      address: venueData.address,
      district: venueData.district || null,
      num_courts: venueData.num_courts || null,
      phone: venueData.phone || null,
      notes: venueData.notes || null,
    })
    .select()
    .single();

  if (error) { console.error('createVenue error:', error); return null; }
  return mapVenue(data);
}

export async function updatePlayerDB(playerId: string, updates: Partial<Player> & Record<string, unknown>): Promise<boolean> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name;
  if (updates.nickname !== undefined) dbUpdates.nickname = updates.nickname;
  if (updates.elo_rating !== undefined) dbUpdates.elo_rating = updates.elo_rating;
  if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  // Profile fields (map frontend names → DB column names)
  if (updates.hand_preference !== undefined) dbUpdates.preferred_hand = updates.hand_preference;
  if (updates.position_preference !== undefined) dbUpdates.preferred_position = updates.position_preference;
  if (updates.experience !== undefined) {
    const expMap: Record<string, string> = {
      beginner: 'beginner', under_6m: 'beginner', '6_12m': 'intermediate',
      '1_2y': 'advanced', over_2y: 'expert',
    };
    dbUpdates.experience_level = expMap[updates.experience] || 'beginner';
  }
  if (updates.bio !== undefined) dbUpdates.bio = updates.bio;

  const { error } = await supabase
    .from('players')
    .update(dbUpdates)
    .eq('id', playerId);

  if (error) { console.error('updatePlayerDB error:', error); return false; }
  return true;
}

export async function deleteSessionDB(sessionId: string): Promise<boolean> {
  // Delete session_players first (handled by cascade usually, but being safe)
  await supabase.from('session_players').delete().eq('session_id', sessionId);
  
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);

  if (error) { console.error('deleteSessionDB error:', error); return false; }
  return true;
}

// ═══════════════════════════════════════════
// ADMIN — PLAYER CRUD
// ═══════════════════════════════════════════

export async function adminCreatePlayerDB(data: {
  email: string;
  full_name: string;
  nickname?: string;
  elo_rating?: number;
}): Promise<Player | null> {
  const { data: row, error } = await supabase
    .from('players')
    .insert({
      email: data.email,
      full_name: data.full_name,
      nickname: data.nickname || data.email.split('@')[0],
      elo_rating: data.elo_rating || 1200,
      total_matches: 0,
      wins: 0,
      losses: 0,
      win_rate: 0,
      best_streak: 0,
      current_streak: 0,
    })
    .select()
    .single();

  if (error) { console.error('adminCreatePlayerDB error:', error); return null; }
  return mapPlayer(row);
}

export async function adminDeletePlayerDB(playerId: string): Promise<boolean> {
  // Call server-side API route which uses service role key to bypass RLS
  try {
    const res = await fetch('/api/admin/players', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });

    if (!res.ok) {
      // Read as text first to avoid "body stream already read" errors
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        console.error('adminDeletePlayerDB error:', data);
      } catch {
        console.error('adminDeletePlayerDB error (raw):', res.status, text);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error('adminDeletePlayerDB fetch error:', err);
    return false;
  }
}

// ═══════════════════════════════════════════
// ADMIN — GROUP CRUD
// ═══════════════════════════════════════════

function mapGroup(row: Record<string, unknown>): Group {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    avatar_url: row.avatar_url as string | null,
    owner_id: row.owner_id as string,
    privacy: (row.privacy as Group['privacy']) || 'private',
    join_mode: (row.join_mode as Group['join_mode']) || 'invite_only',
    max_members: row.max_members as number ?? 50,
    enable_group_elo: row.enable_group_elo as boolean ?? false,
    enable_auto_matching: row.enable_auto_matching as boolean ?? true,
    invite_code: row.invite_code as string ?? '',
    member_count: row.member_count as number ?? 0,
    is_active: row.is_active as boolean ?? true,
    created_at: row.created_at as string,
  };
}

export async function fetchGroupsAdmin(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error('fetchGroupsAdmin error:', error); return []; }
  return (data || []).map(mapGroup);
}

export async function adminCreateGroupDB(data: {
  name: string;
  description?: string;
  owner_id: string;
  max_members?: number;
}): Promise<Group | null> {
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  const { data: row, error } = await supabase
    .from('groups')
    .insert({
      name: data.name,
      description: data.description || null,
      owner_id: data.owner_id,
      max_members: data.max_members || 50,
      invite_code: inviteCode,
    })
    .select()
    .single();

  if (error) { console.error('adminCreateGroupDB error:', error); return null; }
  return mapGroup(row);
}

export async function adminUpdateGroupDB(groupId: string, updates: Partial<Group>): Promise<boolean> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.max_members !== undefined) dbUpdates.max_members = updates.max_members;
  if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

  const { error } = await supabase
    .from('groups')
    .update(dbUpdates)
    .eq('id', groupId);

  if (error) { console.error('adminUpdateGroupDB error:', error); return false; }
  return true;
}

export async function adminDeleteGroupDB(groupId: string): Promise<boolean> {
  // Cascade: remove members, invitations, invite_links, join_requests
  await supabase.from('group_invite_links').delete().eq('group_id', groupId);
  await supabase.from('group_join_requests').delete().eq('group_id', groupId);
  await supabase.from('group_invitations').delete().eq('group_id', groupId);
  await supabase.from('group_members').delete().eq('group_id', groupId);

  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) { console.error('adminDeleteGroupDB error:', error); return false; }
  return true;
}

