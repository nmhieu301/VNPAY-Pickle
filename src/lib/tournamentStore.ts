// ═══════════════════════════════════════════
// VNPAY Pickle — Tournament Store (Zustand)
// ═══════════════════════════════════════════

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type {
  Tournament, TournamentEvent, TournamentTeamExtended,
  TournamentMatch, TournamentStanding
} from '@/types';
import {
  fetchTournaments,
  fetchTournamentById,
  fetchTournamentEvents,
  fetchTournamentTeams,
  fetchTournamentMatches,
  fetchTournamentStandings,
  fetchLiveMatches,
  createTournamentDB,
  createTournamentEventDB,
  registerTeamDB,
  updateTeamStatusDB,
  updateTeamPoolDB,
  saveBracketMatchesDB,
  updateMatchResultDB,
  updateMatchStatusDB,
  updateMatchScheduleDB,
  upsertStandingDB,
  updateTournamentStatusDB,
  updateEventStatusDB,
  checkInTeamDB,
  flagDisputeDB,
} from '@/lib/supabase/tournamentApi';
import { generateSEBracket, generateDEBracket } from '@/lib/algorithms/bracket';
import { generateRoundRobinSchedule } from '@/lib/algorithms/roundRobin';
import { drawPools, calculateSeeds } from '@/lib/algorithms/poolDraw';
import { calculatePoolStandings, applyTiebreakers } from '@/lib/algorithms/standingsCalculator';

// ─── Store Interface ───
interface TournamentStore {
  // Lists
  tournaments: Tournament[];
  isLoading: boolean;
  fetchTournamentList: () => Promise<void>;

  // Current tournament detail
  currentTournament: Tournament | null;
  currentEvents: TournamentEvent[];
  loadTournament: (id: string) => Promise<void>;

  // Event detail
  teamsMap: Record<string, TournamentTeamExtended[]>;   // eventId → teams
  matchesMap: Record<string, TournamentMatch[]>;         // eventId → matches
  standingsMap: Record<string, TournamentStanding[]>;   // eventId → standings
  loadEventDetail: (eventId: string) => Promise<void>;

  // Live
  liveMatches: TournamentMatch[];
  loadLiveMatches: (tournamentId: string) => Promise<void>;
  subscribeToLive: (tournamentId: string) => () => void;

  // Create tournament
  createTournament: (data: Parameters<typeof createTournamentDB>[0]) => Promise<Tournament | null>;
  createTournamentEvent: (data: Parameters<typeof createTournamentEventDB>[0]) => Promise<TournamentEvent | null>;

  // Registration
  registerTeam: (data: Parameters<typeof registerTeamDB>[0]) => Promise<TournamentTeamExtended | null>;
  approveTeam: (teamId: string) => Promise<boolean>;
  rejectTeam: (teamId: string) => Promise<boolean>;
  checkInTeam: (teamId: string, checked: boolean) => Promise<boolean>;

  // Bracket generation
  generateBracket: (eventId: string, format: string) => Promise<boolean>;

  // Score entry
  updateMatchResult: (
    matchId: string,
    eventId: string,
    sets: Array<{ a: number; b: number }>,
    winnerTeamId: string
  ) => Promise<boolean>;
  setMatchLive: (matchId: string) => Promise<boolean>;
  flagDispute: (matchId: string, note: string) => Promise<boolean>;
  updateSchedule: (matchId: string, court: number, time: string) => Promise<boolean>;

  // Standings
  recalculateStandings: (eventId: string) => Promise<void>;

  // Status management
  updateTournamentStatus: (id: string, status: string) => Promise<boolean>;
  updateEventStatus: (eventId: string, status: string) => Promise<boolean>;

  // Helpers
  getTournament: (id: string) => Tournament | undefined;
  getTeamDisplayName: (team: TournamentTeamExtended | null | undefined) => string;
}

export const useTournamentStore = create<TournamentStore>()((set, get) => ({
  tournaments: [],
  isLoading: false,
  currentTournament: null,
  currentEvents: [],
  teamsMap: {},
  matchesMap: {},
  standingsMap: {},
  liveMatches: [],

  fetchTournamentList: async () => {
    set({ isLoading: true });
    const tournaments = await fetchTournaments();
    set({ tournaments, isLoading: false });
  },

  loadTournament: async (id) => {
    set({ isLoading: true });
    const [tournament, events] = await Promise.all([
      fetchTournamentById(id),
      fetchTournamentEvents(id),
    ]);
    set({ currentTournament: tournament, currentEvents: events, isLoading: false });
  },

  loadEventDetail: async (eventId) => {
    const [teams, matches, standings] = await Promise.all([
      fetchTournamentTeams(eventId),
      fetchTournamentMatches(eventId),
      fetchTournamentStandings(eventId),
    ]);
    set(state => ({
      teamsMap: { ...state.teamsMap, [eventId]: teams },
      matchesMap: { ...state.matchesMap, [eventId]: matches },
      standingsMap: { ...state.standingsMap, [eventId]: standings },
    }));
  },

  loadLiveMatches: async (tournamentId) => {
    const matches = await fetchLiveMatches(tournamentId);
    set({ liveMatches: matches });
  },

  subscribeToLive: (tournamentId: string) => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tournament-live-${tournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_matches' },
        async () => {
          // Reload live matches on any change
          await get().loadLiveMatches(tournamentId);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  createTournament: async (data) => {
    const tournament = await createTournamentDB(data);
    if (tournament) {
      set(state => ({ tournaments: [tournament, ...state.tournaments] }));
    }
    return tournament;
  },

  createTournamentEvent: async (data) => {
    const event = await createTournamentEventDB(data);
    if (event) {
      set(state => ({ currentEvents: [...state.currentEvents, event] }));
    }
    return event;
  },

  registerTeam: async (data) => {
    const team = await registerTeamDB(data);
    if (team) {
      set(state => ({
        teamsMap: {
          ...state.teamsMap,
          [data.event_id]: [...(state.teamsMap[data.event_id] || []), team],
        },
      }));
    }
    return team;
  },

  approveTeam: async (teamId) => {
    const ok = await updateTeamStatusDB(teamId, 'confirmed');
    if (ok) {
      set(state => ({
        teamsMap: Object.fromEntries(
          Object.entries(state.teamsMap).map(([eid, teams]) => [
            eid,
            teams.map(t => t.id === teamId ? { ...t, status: 'confirmed' as const } : t),
          ])
        ),
      }));
    }
    return ok;
  },

  rejectTeam: async (teamId) => {
    const ok = await updateTeamStatusDB(teamId, 'withdrawn');
    if (ok) {
      set(state => ({
        teamsMap: Object.fromEntries(
          Object.entries(state.teamsMap).map(([eid, teams]) => [
            eid,
            teams.map(t => t.id === teamId ? { ...t, status: 'withdrawn' as const } : t),
          ])
        ),
      }));
    }
    return ok;
  },

  checkInTeam: async (teamId, checked) => {
    const ok = await checkInTeamDB(teamId, checked);
    if (ok) {
      set(state => ({
        teamsMap: Object.fromEntries(
          Object.entries(state.teamsMap).map(([eid, teams]) => [
            eid,
            teams.map(t => t.id === teamId ? { ...t, checked_in: checked } : t),
          ])
        ),
      }));
    }
    return ok;
  },

  generateBracket: async (eventId, format) => {
    const teams = get().teamsMap[eventId] || [];
    const confirmedTeams = teams.filter(t => t.status === 'confirmed');
    
    if (confirmedTeams.length < 2) return false;

    // Calculate seeds by ELO if not set
    const seeded = calculateSeeds(confirmedTeams);

    const tournament = get().currentTournament;
    let matchesToInsert: Array<{
      event_id: string;
      round_type: string;
      round_number: number;
      match_number: number;
      team_a_id: string | null;
      team_b_id: string | null;
    }> = [];

    if (format === 'single_elim') {
      const generated = generateSEBracket(seeded, tournament?.has_third_place ?? true);
      matchesToInsert = generated.map(m => ({
        event_id: eventId,
        round_type: m.round_type,
        round_number: m.round_number,
        match_number: m.match_number,
        team_a_id: m.team_a_id,
        team_b_id: m.team_b_id,
      }));
    } else if (format === 'double_elim') {
      const generated = generateDEBracket(seeded);
      matchesToInsert = generated.map(m => ({
        event_id: eventId,
        round_type: m.round_type,
        round_number: m.round_number,
        match_number: m.match_number,
        team_a_id: m.team_a_id,
        team_b_id: m.team_b_id,
      }));
    } else if (format === 'round_robin') {
      const teamIds = seeded.map(t => t.id);
      const rounds = generateRoundRobinSchedule(teamIds);
      for (const round of rounds) {
        for (let i = 0; i < round.matches.length; i++) {
          const m = round.matches[i];
          if (m.teamA === 'BYE' || m.teamB === 'BYE') continue;
          matchesToInsert.push({
            event_id: eventId,
            round_type: 'pool',
            round_number: round.roundNumber,
            match_number: i + 1,
            team_a_id: m.teamA,
            team_b_id: m.teamB,
          });
        }
      }
    } else if (format === 'pool_playoff') {
      const event = get().currentEvents.find(e => e.id === eventId);
      const numPools = event?.num_pools || Math.max(2, Math.floor(seeded.length / 4));
      const pools = drawPools(seeded, numPools);

      // Update pool assignments
      for (const pool of pools) {
        for (const team of pool.teams) {
          await updateTeamPoolDB(team.id, pool.poolLetter);
        }
        // Create RR matches within each pool
        const poolTeamIds = pool.teams.map(t => t.id);
        const rounds = generateRoundRobinSchedule(poolTeamIds);
        for (const round of rounds) {
          for (let i = 0; i < round.matches.length; i++) {
            const m = round.matches[i];
            if (m.teamA === 'BYE' || m.teamB === 'BYE') continue;
            matchesToInsert.push({
              event_id: eventId,
              round_type: 'pool',
              round_number: round.roundNumber,
              match_number: i + 1,
              team_a_id: m.teamA,
              team_b_id: m.teamB,
            });
          }
        }
      }
    }

    const ok = await saveBracketMatchesDB(matchesToInsert);
    if (ok) {
      await get().loadEventDetail(eventId);
      await updateEventStatusDB(eventId, 'bracket_set');
      set(state => ({
        currentEvents: state.currentEvents.map(e =>
          e.id === eventId ? { ...e, status: 'bracket_set' as const } : e
        ),
      }));
    }
    return ok;
  },

  updateMatchResult: async (matchId, eventId, sets, winnerTeamId) => {
    const ok = await updateMatchResultDB(matchId, sets, winnerTeamId);
    if (ok) {
      set(state => ({
        matchesMap: {
          ...state.matchesMap,
          [eventId]: (state.matchesMap[eventId] || []).map(m => {
            if (m.id !== matchId) return m;
            const updatedSets = sets.slice(0, 5);
            return {
              ...m,
              winner_team_id: winnerTeamId,
              status: 'completed' as const,
              set1_a: updatedSets[0]?.a ?? null, set1_b: updatedSets[0]?.b ?? null,
              set2_a: updatedSets[1]?.a ?? null, set2_b: updatedSets[1]?.b ?? null,
              set3_a: updatedSets[2]?.a ?? null, set3_b: updatedSets[2]?.b ?? null,
              set4_a: updatedSets[3]?.a ?? null, set4_b: updatedSets[3]?.b ?? null,
              set5_a: updatedSets[4]?.a ?? null, set5_b: updatedSets[4]?.b ?? null,
              sets,
            };
          }),
        },
      }));
      // Recalculate standings
      await get().recalculateStandings(eventId);
    }
    return ok;
  },

  setMatchLive: async (matchId) => {
    return await updateMatchStatusDB(matchId, 'live');
  },

  flagDispute: async (matchId, note) => {
    return await flagDisputeDB(matchId, note);
  },

  updateSchedule: async (matchId, court, time) => {
    return await updateMatchScheduleDB(matchId, court, time);
  },

  recalculateStandings: async (eventId) => {
    const teams = (get().teamsMap[eventId] || []).filter(t => t.status === 'confirmed');
    const matches = get().matchesMap[eventId] || [];
    const poolMatches = matches.filter(m => m.round_type === 'pool');

    // Group by pool
    const pools = [...new Set(teams.map(t => t.pool_letter).filter(Boolean))];
    
    if (pools.length > 0) {
      for (const pool of pools) {
        const poolTeams = teams.filter(t => t.pool_letter === pool);
        const poolTeamIds = new Set(poolTeams.map(t => t.id));
        const poolMatches2 = poolMatches.filter(m =>
          (m.team_a_id && poolTeamIds.has(m.team_a_id)) &&
          (m.team_b_id && poolTeamIds.has(m.team_b_id))
        );
        const standings = calculatePoolStandings(poolTeams, poolMatches2, pool || undefined);
        const ranked = applyTiebreakers(standings, poolMatches2);
        for (const s of ranked) {
          await upsertStandingDB({ ...s, rank_in_pool: s.rank_in_pool });
        }
      }
    } else {
      // No pools — treat all as one group
      const standings = calculatePoolStandings(teams, poolMatches);
      const ranked = applyTiebreakers(standings, poolMatches);
      for (const s of ranked) {
        await upsertStandingDB({ ...s, rank_in_pool: s.rank_in_pool });
      }
    }

    // Refresh standings
    const newStandings = await fetchTournamentStandings(eventId);
    set(state => ({
      standingsMap: { ...state.standingsMap, [eventId]: newStandings },
    }));
  },

  updateTournamentStatus: async (id, status) => {
    const ok = await updateTournamentStatusDB(id, status);
    if (ok) {
      set(state => ({
        currentTournament: state.currentTournament?.id === id
          ? { ...state.currentTournament, status: status as Tournament['status'] }
          : state.currentTournament,
        tournaments: state.tournaments.map(t =>
          t.id === id ? { ...t, status: status as Tournament['status'] } : t
        ),
      }));
    }
    return ok;
  },

  updateEventStatus: async (eventId, status) => {
    const ok = await updateEventStatusDB(eventId, status);
    if (ok) {
      set(state => ({
        currentEvents: state.currentEvents.map(e =>
          e.id === eventId ? { ...e, status: status as TournamentEvent['status'] } : e
        ),
      }));
    }
    return ok;
  },

  getTournament: (id) => get().tournaments.find(t => t.id === id),

  getTeamDisplayName: (team) => {
    if (!team) return 'TBD';
    if (team.team_name) return team.team_name;
    // Will be enriched with player data at component level
    return `Đội #${team.seed_number || '?'}`;
  },
}));
