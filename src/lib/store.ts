// ═══════════════════════════════════════════
// VNPAY Pickle — App Store (Zustand + Supabase)
// Fetches data from Supabase, caches locally
// ═══════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthChangeEvent, Session as SupabaseSession, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Player, Session, Department, Venue, Notification, MatchingResult, Group } from '@/types';
import { getClient } from '@/lib/supabase/client';
import {
  fetchPlayers,
  fetchPlayerByEmail,
  fetchDepartments,
  fetchVenues,
  fetchSessions,
  fetchAllSessionPlayersMap,
  fetchAllCheckedInMap,
  createPlayer,
  insertSession,
  joinSessionDB,
  leaveSessionDB,
  toggleCheckInDB,
  createVenueDB,
  updatePlayerDB,
  deleteSessionDB,
  adminCreatePlayerDB,
  adminDeletePlayerDB,
  adminCreateGroupDB,
  adminUpdateGroupDB,
  adminDeleteGroupDB,
} from '@/lib/supabase/api';

// ─── Store Interface ───
interface AppStore {
  // Auth
  currentUser: Player | null;
  isAuthenticated: boolean;
  authEmail: string | null;
  initAuth: () => (() => void);
  loginWithEmail: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;

  // Admin Actions
  adminUpdatePlayer: (playerId: string, updates: Partial<Player>) => Promise<boolean>;
  adminDeleteSession: (sessionId: string) => Promise<boolean>;
  adminCreatePlayer: (data: { email: string; full_name: string; nickname?: string; elo_rating?: number }) => Promise<Player | null>;
  adminDeletePlayer: (playerId: string) => Promise<boolean>;
  adminCreateGroup: (data: { name: string; description?: string; owner_id: string; max_members?: number }) => Promise<Group | null>;
  adminUpdateGroup: (groupId: string, updates: Partial<Group>) => Promise<boolean>;
  adminDeleteGroup: (groupId: string) => Promise<boolean>;

  // Profile
  updateProfile: (updates: Partial<Player>) => Promise<boolean>;

  // Data
  players: Player[];
  departments: Department[];
  venues: Venue[];
  sessions: Session[];
  notifications: Notification[];
  matchingResults: Record<string, MatchingResult>;

  // O(1) lookup Maps (not persisted, rebuilt on load)
  playerMap: Map<string, Player>;
  venueMap: Map<string, Venue>;
  departmentMap: Map<string, Department>;
  sessionMap: Map<string, Session>;

  // Loading / error state
  isLoading: boolean;
  isInitialized: boolean;
  initError: string | null;
  initializeData: () => Promise<void>;

  // Session actions
  createSession: (session: Omit<Session, 'id' | 'created_at' | 'player_count' | 'current_round' | 'recurring_schedule_id' | 'recurring_date'>) => Promise<Session | null>;
  joinSession: (sessionId: string) => Promise<void>;
  leaveSession: (sessionId: string) => Promise<void>;
  setMatchingResult: (sessionId: string, result: MatchingResult) => void;

  // Player helpers — O(1) via Maps
  getPlayer: (id: string) => Player | undefined;
  getDepartment: (id: string) => Department | undefined;
  getVenue: (id: string) => Venue | undefined;
  getSession: (id: string) => Session | undefined;

  // Session player tracking
  sessionPlayers: Record<string, string[]>;
  checkedInPlayers: Record<string, string[]>;
  toggleCheckIn: (sessionId: string, playerId: string) => Promise<void>;
  addVenue: (data: { name: string; address: string; district?: string | null; num_courts?: number | null; phone?: string | null; notes?: string | null }) => Promise<Venue | null>;

  // Real-time sync
  realtimeChannel: ReturnType<ReturnType<typeof getClient>['channel']> | null;
  subscribeRealtime: (sessionId: string) => () => void;
  unsubscribeRealtime: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ─── Auth ───
      currentUser: null,
      isAuthenticated: false,
      authEmail: null,

      initAuth: () => {
        const supabase = getClient();
        let loginHandled = false; // Prevent duplicate loginWithEmail calls
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event: AuthChangeEvent, session: SupabaseSession | null) => {
            if (session?.user?.email) {
              // INITIAL_SESSION fires first from onAuthStateChange — no need for getSession()
              if (!loginHandled) {
                loginHandled = true;
                set({ authEmail: session.user.email });
                await get().loginWithEmail(session.user.email);
              }
            } else {
              loginHandled = false;
              set({
                currentUser: null,
                isAuthenticated: false,
                authEmail: null,
                isInitialized: false,
              });
            }
          }
        );
        return () => subscription.unsubscribe();
      },

      loginWithEmail: async (email: string) => {
        // Try to find player in Supabase
        let player = await fetchPlayerByEmail(email);

        if (!player) {
          // Create new player in Supabase
          player = await createPlayer(email);
        }

        if (player) {
          set({ currentUser: player, isAuthenticated: true });
          // Trigger data initialization
          get().initializeData();
          return true;
        }

        return false;
      },

      logout: async () => {
        const supabase = getClient();
        get().unsubscribeRealtime();
        await supabase.auth.signOut();
        // Clear all state (including persisted cache)
        set({
          currentUser: null,
          isAuthenticated: false,
          authEmail: null,
          isInitialized: false,
          sessions: [],
          players: [],
          departments: [],
          venues: [],
          sessionPlayers: {},
          checkedInPlayers: {},
          notifications: [],
          matchingResults: {},
          playerMap: new Map(),
          venueMap: new Map(),
          departmentMap: new Map(),
          sessionMap: new Map(),
          realtimeChannel: null,
        });
        // Hard redirect ensures no stale React state
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      },

      isAdmin: () => get().currentUser?.role === 'admin',

      adminUpdatePlayer: async (playerId, updates) => {
        const ok = await updatePlayerDB(playerId, updates);
        if (ok) {
          set(state => {
            const newPlayers = state.players.map(p =>
              p.id === playerId ? { ...p, ...updates } : p
            );
            return {
              players: newPlayers,
              playerMap: new Map(newPlayers.map(p => [p.id, p])),
              currentUser: state.currentUser?.id === playerId
                ? { ...state.currentUser, ...updates }
                : state.currentUser,
            };
          });
        }
        return ok;
      },

      adminDeleteSession: async (sessionId) => {
        const ok = await deleteSessionDB(sessionId);
        if (ok) {
          set(state => {
            const newSessions = state.sessions.filter(s => s.id !== sessionId);
            return {
              sessions: newSessions,
              sessionMap: new Map(newSessions.map(s => [s.id, s])),
            };
          });
        }
        return ok;
      },

      adminCreatePlayer: async (data) => {
        const player = await adminCreatePlayerDB(data);
        if (player) {
          set(state => {
            const newPlayers = [player, ...state.players];
            return {
              players: newPlayers,
              playerMap: new Map(newPlayers.map(p => [p.id, p])),
            };
          });
        }
        return player;
      },

      adminDeletePlayer: async (playerId) => {
        const ok = await adminDeletePlayerDB(playerId);
        if (ok) {
          set(state => {
            const newPlayers = state.players.filter(p => p.id !== playerId);
            return {
              players: newPlayers,
              playerMap: new Map(newPlayers.map(p => [p.id, p])),
            };
          });
        }
        return ok;
      },

      adminCreateGroup: async (data) => {
        return await adminCreateGroupDB(data);
      },

      adminUpdateGroup: async (groupId, updates) => {
        return await adminUpdateGroupDB(groupId, updates);
      },

      adminDeleteGroup: async (groupId) => {
        return await adminDeleteGroupDB(groupId);
      },

      updateProfile: async (updates) => {
        const user = get().currentUser;
        if (!user) return false;
        const ok = await updatePlayerDB(user.id, updates);
        if (ok) {
          const updated = { ...user, ...updates };
          set(state => {
            const newPlayers = state.players.map(p => p.id === user.id ? updated : p);
            return {
              currentUser: updated,
              players: newPlayers,
              playerMap: new Map(newPlayers.map(p => [p.id, p])),
            };
          });
        }
        return ok;
      },

      // ─── Data ───
      players: [],
      departments: [],
      venues: [],
      sessions: [],
      notifications: [],
      matchingResults: {},
      playerMap: new Map(),
      venueMap: new Map(),
      departmentMap: new Map(),
      sessionMap: new Map(),
      isLoading: false,
      isInitialized: false,
      initError: null,

      // ─── Initialize: Fetch all data from Supabase ───
      initializeData: async () => {
        if (get().isLoading) return;
        set({ isLoading: true, initError: null });

        try {
          const [players, departments, venues, sessions, sessionPlayersMap, checkedInMap] =
            await Promise.all([
              fetchPlayers(),
              fetchDepartments(),
              fetchVenues(),
              fetchSessions(),
              fetchAllSessionPlayersMap(),
              fetchAllCheckedInMap(),
            ]);

          // Compute player_count per session
          const sessionsWithCount = sessions.map(s => ({
            ...s,
            player_count: (sessionPlayersMap[s.id] || []).length,
          }));

          set({
            players,
            departments,
            venues,
            sessions: sessionsWithCount,
            sessionPlayers: sessionPlayersMap,
            checkedInPlayers: checkedInMap,
            // Rebuild O(1) lookup Maps
            playerMap: new Map(players.map(p => [p.id, p])),
            venueMap: new Map(venues.map(v => [v.id, v])),
            departmentMap: new Map(departments.map(d => [d.id, d])),
            sessionMap: new Map(sessionsWithCount.map(s => [s.id, s])),
            isInitialized: true,
            isLoading: false,
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Không thể tải dữ liệu';
          console.error('Failed to initialize data:', error);
          set({ isLoading: false, initError: msg });
        }
      },

      // ─── Session Players ───
      sessionPlayers: {},
      checkedInPlayers: {},

      // ─── Session Actions ───
      createSession: async (sessionData) => {
        const dbSession = await insertSession({
          title: sessionData.title,
          organizer_id: sessionData.host_id,
          venue_id: sessionData.venue_id,
          session_date: sessionData.date,
          start_time: sessionData.start_time,
          end_time: sessionData.end_time,
          sport_mode: sessionData.sport_mode,
          match_mode: sessionData.match_mode,
          scope: sessionData.scope === 'public' ? 'open' : sessionData.scope === 'private' ? 'invite' : sessionData.scope,
          max_players: sessionData.max_players,
          num_courts: sessionData.num_courts,
          notes: sessionData.notes,
        });

        if (!dbSession) return null;

        // Auto-join organizer
        await joinSessionDB(dbSession.id, sessionData.host_id);

        set(state => {
          const newSessions = [dbSession, ...state.sessions];
          return {
            sessions: newSessions,
            sessionMap: new Map(newSessions.map(s => [s.id, s])),
            sessionPlayers: { ...state.sessionPlayers, [dbSession.id]: [sessionData.host_id] },
            checkedInPlayers: { ...state.checkedInPlayers, [dbSession.id]: [] },
          };
        });

        return dbSession;
      },

      joinSession: async (sessionId: string) => {
        const user = get().currentUser;
        if (!user) return;

        const current = get().sessionPlayers[sessionId] || [];
        if (current.includes(user.id)) return;

        const ok = await joinSessionDB(sessionId, user.id);
        if (!ok) return;

        set(state => {
          const newSessions = state.sessions.map(s =>
            s.id === sessionId ? { ...s, player_count: (s.player_count || 0) + 1 } : s
          );
          return {
            sessionPlayers: { ...state.sessionPlayers, [sessionId]: [...current, user.id] },
            sessions: newSessions,
            sessionMap: new Map(newSessions.map(s => [s.id, s])),
          };
        });
      },

      leaveSession: async (sessionId: string) => {
        const user = get().currentUser;
        if (!user) return;

        const ok = await leaveSessionDB(sessionId, user.id);
        if (!ok) return;

        set(state => {
          const newSessions = state.sessions.map(s =>
            s.id === sessionId ? { ...s, player_count: Math.max(0, (s.player_count || 1) - 1) } : s
          );
          return {
            sessionPlayers: {
              ...state.sessionPlayers,
              [sessionId]: (state.sessionPlayers[sessionId] || []).filter(id => id !== user.id),
            },
            checkedInPlayers: {
              ...state.checkedInPlayers,
              [sessionId]: (state.checkedInPlayers[sessionId] || []).filter(id => id !== user.id),
            },
            sessions: newSessions,
            sessionMap: new Map(newSessions.map(s => [s.id, s])),
          };
        });
      },

      toggleCheckIn: async (sessionId: string, playerId: string) => {
        const current = get().checkedInPlayers[sessionId] || [];
        const isCheckedIn = current.includes(playerId);
        const newCheckedIn = !isCheckedIn;

        const ok = await toggleCheckInDB(sessionId, playerId, newCheckedIn);
        if (!ok) return;

        set(state => ({
          checkedInPlayers: {
            ...state.checkedInPlayers,
            [sessionId]: newCheckedIn
              ? [...current, playerId]
              : current.filter(id => id !== playerId),
          },
        }));
      },

      addVenue: async (venueData) => {
        const venue = await createVenueDB(venueData);
        if (!venue) return null;
        set(state => {
          const newVenues = [...state.venues, venue];
          return {
            venues: newVenues,
            venueMap: new Map(newVenues.map(v => [v.id, v])),
          };
        });
        return venue;
      },

      setMatchingResult: (sessionId, result) => {
        set(state => ({
          matchingResults: { ...state.matchingResults, [sessionId]: result },
        }));
      },

      // ─── O(1) Helpers via Maps ───
      getPlayer: (id) => get().playerMap.get(id),
      getDepartment: (id) => get().departmentMap.get(id),
      getVenue: (id) => get().venueMap.get(id),
      getSession: (id) => get().sessionMap.get(id),

      // ─── Real-time ───
      realtimeChannel: null,

      subscribeRealtime: (sessionId: string) => {
        const supabase = getClient();
        // Clean up any existing subscription first
        get().unsubscribeRealtime();

        const channel = supabase
          .channel(`session-players:${sessionId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'session_players',
              filter: `session_id=eq.${sessionId}`,
            },
            (payload: RealtimePostgresChangesPayload<{ player_id: string; session_id: string }>) => {
              const newPlayerId = (payload.new as { player_id: string }).player_id;
              set(state => {
                const current = state.sessionPlayers[sessionId] || [];
                if (current.includes(newPlayerId)) return state;
                const updated = [...current, newPlayerId];
                const newSessions = state.sessions.map(s =>
                  s.id === sessionId ? { ...s, player_count: updated.length } : s
                );
                return {
                  sessionPlayers: { ...state.sessionPlayers, [sessionId]: updated },
                  sessions: newSessions,
                  sessionMap: new Map(newSessions.map(s => [s.id, s])),
                };
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'session_players',
              filter: `session_id=eq.${sessionId}`,
            },
            (payload: RealtimePostgresChangesPayload<{ player_id: string; session_id: string }>) => {
              const removedPlayerId = (payload.old as { player_id: string }).player_id;
              set(state => {
                const updated = (state.sessionPlayers[sessionId] || [])
                  .filter(id => id !== removedPlayerId);
                const newSessions = state.sessions.map(s =>
                  s.id === sessionId ? { ...s, player_count: updated.length } : s
                );
                return {
                  sessionPlayers: { ...state.sessionPlayers, [sessionId]: updated },
                  checkedInPlayers: {
                    ...state.checkedInPlayers,
                    [sessionId]: (state.checkedInPlayers[sessionId] || [])
                      .filter(id => id !== removedPlayerId),
                  },
                  sessions: newSessions,
                  sessionMap: new Map(newSessions.map(s => [s.id, s])),
                };
              });
            }
          )
          .subscribe();

        set({ realtimeChannel: channel });
        return () => get().unsubscribeRealtime();
      },

      unsubscribeRealtime: () => {
        const channel = get().realtimeChannel;
        if (channel) {
          const supabase = getClient();
          supabase.removeChannel(channel);
          set({ realtimeChannel: null });
        }
      },
    }),
    {
      name: 'vnpay-pickle-store-v3',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        authEmail: state.authEmail,
        matchingResults: state.matchingResults,
        // Large arrays (players, sessions, venues, sessionPlayers) are NOT persisted
        // to avoid localStorage quota issues. Data is fetched fresh on each load.
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Maps are derived — initialize empty (will be populated by initializeData)
        state.playerMap = new Map();
        state.venueMap = new Map();
        state.departmentMap = new Map();
        state.sessionMap = new Map();
        state.realtimeChannel = null;
        // Always re-fetch data on load
        state.isInitialized = false;
      },
    }
  )
);
