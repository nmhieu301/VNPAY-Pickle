// ═══════════════════════════════════════════
// VNPAY Pickle — App Store (Zustand + Supabase)
// Fetches data from Supabase, caches locally
// ═══════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Player, Session, Department, Venue, Notification, MatchingResult, Group } from '@/types';
import { INITIAL_ELO } from '@/lib/constants/tiers';
import { calculateTier } from '@/lib/algorithms/elo';
import { createClient } from '@/lib/supabase/client';
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
  fetchGroupsAdmin,
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

  // Loading state
  isLoading: boolean;
  isInitialized: boolean;
  initializeData: () => Promise<void>;

  // Session actions
  createSession: (session: Omit<Session, 'id' | 'created_at' | 'player_count' | 'current_round' | 'recurring_schedule_id' | 'recurring_date'>) => Promise<Session | null>;
  joinSession: (sessionId: string) => Promise<void>;
  leaveSession: (sessionId: string) => Promise<void>;
  setMatchingResult: (sessionId: string, result: MatchingResult) => void;

  // Player helpers
  getPlayer: (id: string) => Player | undefined;
  getDepartment: (id: string) => Department | undefined;
  getVenue: (id: string) => Venue | undefined;
  getSession: (id: string) => Session | undefined;

  // Session player tracking
  sessionPlayers: Record<string, string[]>;
  checkedInPlayers: Record<string, string[]>;
  toggleCheckIn: (sessionId: string, playerId: string) => Promise<void>;
  addVenue: (data: { name: string; address: string; district?: string | null; num_courts?: number | null; phone?: string | null; notes?: string | null }) => Promise<Venue | null>;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ─── Auth ───
      currentUser: null,
      isAuthenticated: false,
      authEmail: null,

      initAuth: () => {
        const supabase = createClient();
        let loginHandled = false; // Prevent duplicate loginWithEmail calls
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
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
        const supabase = createClient();
        await supabase.auth.signOut();
        set({
          currentUser: null,
          isAuthenticated: false,
          authEmail: null,
          isInitialized: false,
        });
      },
      
      isAdmin: () => get().currentUser?.role === 'admin',

      adminUpdatePlayer: async (playerId, updates) => {
        const ok = await updatePlayerDB(playerId, updates);
        if (ok) {
          set(state => ({
            players: state.players.map(p => p.id === playerId ? { ...p, ...updates } : p),
            currentUser: state.currentUser?.id === playerId ? { ...state.currentUser, ...updates } : state.currentUser,
          }));
        }
        return ok;
      },

      adminDeleteSession: async (sessionId) => {
        const ok = await deleteSessionDB(sessionId);
        if (ok) {
          set(state => ({
            sessions: state.sessions.filter(s => s.id !== sessionId),
          }));
        }
        return ok;
      },

      adminCreatePlayer: async (data) => {
        const player = await adminCreatePlayerDB(data);
        if (player) {
          set(state => ({ players: [player, ...state.players] }));
        }
        return player;
      },

      adminDeletePlayer: async (playerId) => {
        const ok = await adminDeletePlayerDB(playerId);
        if (ok) {
          set(state => ({ players: state.players.filter(p => p.id !== playerId) }));
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
          set({ currentUser: { ...user, ...updates } });
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
      isLoading: false,
      isInitialized: false,

      // ─── Initialize: Fetch all data from Supabase ───
      initializeData: async () => {
        if (get().isLoading) return;
        set({ isLoading: true });

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
            isInitialized: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to initialize data:', error);
          set({ isLoading: false });
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

        set(state => ({
          sessions: [dbSession, ...state.sessions],
          sessionPlayers: { ...state.sessionPlayers, [dbSession.id]: [sessionData.host_id] },
          checkedInPlayers: { ...state.checkedInPlayers, [dbSession.id]: [] },
        }));

        return dbSession;
      },

      joinSession: async (sessionId: string) => {
        const user = get().currentUser;
        if (!user) return;

        const current = get().sessionPlayers[sessionId] || [];
        if (current.includes(user.id)) return;

        const ok = await joinSessionDB(sessionId, user.id);
        if (!ok) return;

        set(state => ({
          sessionPlayers: { ...state.sessionPlayers, [sessionId]: [...current, user.id] },
          sessions: state.sessions.map(s =>
            s.id === sessionId ? { ...s, player_count: (s.player_count || 0) + 1 } : s
          ),
        }));
      },

      leaveSession: async (sessionId: string) => {
        const user = get().currentUser;
        if (!user) return;

        const ok = await leaveSessionDB(sessionId, user.id);
        if (!ok) return;

        set(state => ({
          sessionPlayers: {
            ...state.sessionPlayers,
            [sessionId]: (state.sessionPlayers[sessionId] || []).filter(id => id !== user.id),
          },
          checkedInPlayers: {
            ...state.checkedInPlayers,
            [sessionId]: (state.checkedInPlayers[sessionId] || []).filter(id => id !== user.id),
          },
          sessions: state.sessions.map(s =>
            s.id === sessionId ? { ...s, player_count: Math.max(0, (s.player_count || 1) - 1) } : s
          ),
        }));
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
        set(state => ({ venues: [...state.venues, venue] }));
        return venue;
      },

      setMatchingResult: (sessionId, result) => {
        set(state => ({
          matchingResults: { ...state.matchingResults, [sessionId]: result },
        }));
      },

      // ─── Helpers ───
      getPlayer: (id) => get().players.find(p => p.id === id),
      getDepartment: (id) => get().departments.find(d => d.id === id),
      getVenue: (id) => get().venues.find(v => v.id === id),
      getSession: (id) => get().sessions.find(s => s.id === id),
    }),
    {
      name: 'vnpay-pickle-store-v2',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        matchingResults: state.matchingResults,
        // ⚡ Persist data so no reload spinner on revisit
        players: state.players,
        sessions: state.sessions,
        departments: state.departments,
        venues: state.venues,
        sessionPlayers: state.sessionPlayers,
        checkedInPlayers: state.checkedInPlayers,
        isInitialized: state.isInitialized,
      }),
    }
  )
);
