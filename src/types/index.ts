// ═══════════════════════════════════════════
// VNPAY Pickle — Type Definitions
// ═══════════════════════════════════════════

export type PlayerRole = 'player' | 'organizer' | 'admin';
export type HandPreference = 'left' | 'right';
export type PositionPreference = 'forehand' | 'backhand' | 'flexible';
export type ExperienceLevel = 'beginner' | 'under_6m' | '6_12m' | '1_2y' | 'over_2y';
export type TierName = 'beginner' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'challenger';

export interface Player {
  id: string;
  email: string;
  full_name: string;
  nickname: string | null;
  department_id: string | null;
  department?: Department;
  avatar_url: string | null;
  phone: string | null;
  hand_preference: HandPreference;
  position_preference: PositionPreference;
  experience: ExperienceLevel;
  bio: string | null;
  elo_rating: number;
  tier: TierName;
  role: PlayerRole;
  is_active: boolean;
  total_matches: number;
  total_wins: number;
  win_streak: number;
  best_win_streak: number;
  created_at: string;
  last_played_at: string | null;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  num_courts: number | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  phone: string | null;
  hours: string | null;
  features: string[] | null;
  place_id: string | null;
  price_note: string | null;
  map_url: string | null;
  notes: string | null;
  image_url: string | null;
  is_active: boolean;
  is_indoor: boolean;
}

// ─── Session Types ───
export type SessionStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type SportMode = 'doubles' | 'singles' | 'mixed' | 'womens_doubles';
export type MatchMode = 'random' | 'elo_balanced' | 'manual';
export type SessionScope = 'public' | 'department' | 'private';

export interface Session {
  id: string;
  title: string;
  host_id: string;
  host?: Player;
  date: string;
  start_time: string;
  end_time: string;
  venue_id: string | null;
  venue?: Venue;
  sport_mode: SportMode;
  match_mode: MatchMode;
  scope: SessionScope;
  num_courts: number;
  max_players: number | null;
  is_scored: boolean;
  notes: string | null;
  status: SessionStatus;
  current_round: number;
  created_at: string;
  player_count?: number;
}

export interface SessionPlayer {
  id: string;
  session_id: string;
  player_id: string;
  player?: Player;
  checked_in: boolean;
  joined_at: string;
}

// ─── Match Types ───
export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type Team = 'A' | 'B';

export interface Match {
  id: string;
  session_id: string | null;
  tournament_id: string | null;
  round: number;
  court_number: number;
  team_a_score: number;
  team_b_score: number;
  status: MatchStatus;
  scheduled_time: string | null;
  winner_team: Team | null;
  created_at: string;
  players?: MatchPlayer[];
}

export interface MatchPlayer {
  id: string;
  match_id: string;
  player_id: string;
  player?: Player;
  team: Team;
}

// ─── Tournament Types ───
export type TournamentType = 'company' | 'group' | 'custom';
export type TournamentFormat = 'group_knockout' | 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss';
export type TournamentStatus = 'draft' | 'registration' | 'in_progress' | 'completed' | 'cancelled';

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  organizer_id: string;
  organizer?: Player;
  type: TournamentType;
  format: TournamentFormat;
  category: string;
  max_teams: number;
  registration_deadline: string;
  start_date: string;
  end_date: string;
  venue_id: string | null;
  venue?: Venue;
  status: TournamentStatus;
  rules: string | null;
  prizes: string | null;
  created_at: string;
}

export interface TournamentTeam {
  id: string;
  tournament_id: string;
  name: string;
  player_1_id: string;
  player_2_id: string | null;
  player_1?: Player;
  player_2?: Player;
  seed_number: number | null;
  avg_elo: number;
}

// ─── ELO History ───
export interface EloHistory {
  id: string;
  player_id: string;
  match_id: string;
  elo_before: number;
  elo_after: number;
  changed_at: string;
}

// ─── Notification Types ───
export type NotificationType = 'session' | 'match' | 'tournament' | 'achievement' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  is_read: boolean;
  link_to: string | null;
  created_at: string;
}

// ─── Court Assignment (for matching) ───
export interface CourtAssignment {
  court_number: number;
  team_a: Player[];
  team_b: Player[];
  team_a_elo: number;
  team_b_elo: number;
  elo_diff: number;
}

export interface MatchingResult {
  courts: CourtAssignment[];
  waiting: Player[];
  totalEloDiff: number;
}

// ─── Group Types ───
export type GroupPrivacy = 'private' | 'hidden';
export type GroupJoinMode = 'invite_only' | 'request' | 'invite_link';
export type GroupMemberRole = 'owner' | 'admin' | 'member';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  owner_id: string;
  privacy: GroupPrivacy;
  join_mode: GroupJoinMode;
  max_members: number;
  enable_group_elo: boolean;
  enable_auto_matching: boolean;
  invite_code: string;
  member_count: number;
  is_active: boolean;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  player_id: string;
  player?: Player;
  role: GroupMemberRole;
  joined_at: string;
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  group?: Group;
  invited_by: string;
  inviter?: Player;
  invited_player_id: string;
  message: string | null;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  responded_at: string | null;
}

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  player_id: string;
  player?: Player;
  status: JoinRequestStatus;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface GroupInviteLink {
  id: string;
  group_id: string;
  token: string;
  created_by: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  requires_approval: boolean;
  is_active: boolean;
  created_at: string;
}
