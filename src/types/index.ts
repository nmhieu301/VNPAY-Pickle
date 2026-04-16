// ═══════════════════════════════════════════
// VNPAY Pickle — Type Definitions
// ═══════════════════════════════════════════

export type PlayerRole = 'player' | 'organizer' | 'admin';
export type HandPreference = 'left' | 'right';
export type PositionPreference = 'forehand' | 'backhand' | 'flexible';
export type ExperienceLevel = 'beginner' | 'under_6m' | '6_12m' | '1_2y' | 'over_2y';
/** 0 = Tập sự · 1 = Trung cấp · 2 = Khá · 3 = Giỏi · 4 = Xuất sắc */
export type TierLevel = 0 | 1 | 2 | 3 | 4;
/** @deprecated — kept for legacy DB references, use TierLevel instead */
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
  tier: number; // 0–4, set by admin
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
  // Recurring
  recurring_schedule_id: string | null;
  recurring_date: string | null;
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
export type TournamentFormat = 'group_knockout' | 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss' | 'pool_playoff' | 'single_elim' | 'double_elim' | 'king_of_court';
export type TournamentStatus = 'draft' | 'registration' | 'in_progress' | 'completed' | 'cancelled';
export type ScoringSystem = 'side_out' | 'rally';
export type SetsFormat = 'bo1' | 'bo3' | 'bo5';

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
  registration_open_date?: string | null;
  start_date: string;
  end_date: string;
  venue_id: string | null;
  venue?: Venue;
  group_id?: string | null;
  status: TournamentStatus;
  rules: string | null;
  prizes: string | null;
  // Phase 2 extended fields
  scoring_system: ScoringSystem;
  points_target: number;
  sets_format: SetsFormat;
  rest_minutes: number;
  has_third_place: boolean;
  is_paused: boolean;
  entry_fee: number;
  num_courts: number;
  max_match_minutes: number | null;
  special_rules: string | null;
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

// ─── Tournament Event (nội dung thi đấu) ───
export type EventCategory =
  | 'mens_doubles'
  | 'womens_doubles'
  | 'mixed_doubles'
  | 'mens_singles'
  | 'womens_singles'
  | 'open_doubles';

export type Division = 'open' | 'advanced' | 'intermediate' | 'beginner' | 'custom';

export type EventFormat =
  | 'round_robin'
  | 'single_elim'
  | 'double_elim'
  | 'pool_playoff'
  | 'swiss'
  | 'king_of_court';

export type EventStatus = 'registration' | 'bracket_set' | 'in_progress' | 'completed';

export interface TournamentEvent {
  id: string;
  tournament_id: string;
  category: EventCategory;
  division: Division;
  elo_min: number | null;
  elo_max: number | null;
  format: EventFormat;
  max_teams: number;
  num_pools: number | null;
  teams_advance_per_pool: number;
  swiss_rounds: number | null;
  status: EventStatus;
  created_at: string;
  // Computed
  teams?: TournamentTeamExtended[];
  matches?: TournamentMatch[];
  standings?: TournamentStanding[];
}

// Extended team (from tournament_teams table)
export type TeamStatus = 'pending' | 'confirmed' | 'withdrawn' | 'disqualified';

export interface TournamentTeamExtended {
  id: string;
  event_id: string;
  player1_id: string;
  player2_id: string | null;
  player1?: Player;
  player2?: Player;
  team_name: string | null;
  seed_number: number | null;
  avg_elo: number | null;
  pool_letter: string | null;
  status: TeamStatus;
  checked_in: boolean;
  registered_at: string;
}

// Tournament match
export type MatchRoundType =
  | 'pool'
  | 'winner_r1' | 'winner_r2' | 'winner_r3' | 'winner_r4'
  | 'loser_r1' | 'loser_r2' | 'loser_r3' | 'loser_r4'
  | 'quarter' | 'semi' | 'final' | 'third_place' | 'grand_final'
  | 'swiss_r1' | 'swiss_r2' | 'swiss_r3' | 'swiss_r4' | 'swiss_r5' | 'swiss_r6'
  | 'kotc_round';

export type TournamentMatchStatus = 'scheduled' | 'live' | 'completed' | 'forfeit' | 'dispute' | 'cancelled';

export interface SetScore {
  a: number | null;
  b: number | null;
}

export interface TournamentMatch {
  id: string;
  event_id: string;
  round_type: MatchRoundType;
  round_number: number | null;
  match_number: number | null;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a?: TournamentTeamExtended;
  team_b?: TournamentTeamExtended;
  court_number: number | null;
  scheduled_time: string | null;
  sets: SetScore[]; // Computed from set1_a/set1_b...
  set1_a: number | null; set1_b: number | null;
  set2_a: number | null; set2_b: number | null;
  set3_a: number | null; set3_b: number | null;
  set4_a: number | null; set4_b: number | null;
  set5_a: number | null; set5_b: number | null;
  winner_team_id: string | null;
  status: TournamentMatchStatus;
  is_walkover: boolean;
  dispute_note: string | null;
  score_confirmed_by_a: boolean;
  score_confirmed_by_b: boolean;
  started_at: string | null;
  completed_at: string | null;
  // Phase 3: Live scoring lock
  scoring_locked_by: string | null;
  scoring_locked_at: string | null;
}

export interface TournamentStanding {
  id: string;
  event_id: string;
  team_id: string;
  team?: TournamentTeamExtended;
  pool_letter: string | null;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  point_differential: number;
  buchholz_score: number | null;
  rank_in_pool: number | null;
}

// Bracket node types for UI
export interface BracketSlot {
  matchId: string | null; // null = bye
  teamId: string | null;
  score: number | null;
  isWinner: boolean;
}

export interface BracketMatch {
  id: string;
  round: number;
  position: number;
  slotA: BracketSlot;
  slotB: BracketSlot;
  nextMatchId: string | null; // where winner goes
  nextMatchSide: 'A' | 'B' | null;
  roundType: MatchRoundType;
  status: TournamentMatchStatus;
}

// Auto-schedule config
export interface ScheduleConfig {
  numCourts: number;
  matchDurationMinutes: number;
  restMinutes: number;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  startDate: string; // YYYY-MM-DD
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
  team_a_tier: number; // sum of tier values in team A
  team_b_tier: number; // sum of tier values in team B
  tier_diff: number;   // |team_a_tier - team_b_tier|
}

export interface MatchingResult {
  courts: CourtAssignment[];
  waiting: Player[];
  totalTierDiff: number;
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

// ─── Tournament Committee Types ───
export type CommitteeRole = 'director' | 'committee';

export interface TournamentCommitteeMember {
  id: string;
  tournament_id: string;
  player_id: string;
  player?: Player;
  role: CommitteeRole;
  added_at: string;
}

// ─── Guest Player Types ───
export type GuestTier = 'Beginner' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface GuestPlayer {
  id: string;
  tournament_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  company: string;
  estimated_tier: GuestTier;
  linked_player_id: string | null;
  created_by: string;
  created_at: string;
}

// ─── Score Log Types ───
export type ScoreLogAction = 'point' | 'undo' | 'timeout' | 'side_out';

export interface ScoreLog {
  id: string;
  match_id: string;
  set_number: number;
  team: 'A' | 'B';
  score_a: number;
  score_b: number;
  action: ScoreLogAction;
  scored_by: string | null;
  created_at: string;
}

// ─── Schedule Change Log ───
export interface ScheduleChangeLog {
  id: string;
  match_id: string;
  changed_by: string;
  old_court: number | null;
  new_court: number | null;
  old_time: string | null;
  new_time: string | null;
  reason: string | null;
  created_at: string;
}

// ─── Bulk Add Types ───
export type FuzzyMatchStatus = 'matched' | 'ambiguous' | 'not_found';

export interface FuzzyMatchResult {
  rawText: string;
  status: FuzzyMatchStatus;
  candidates: Player[];
  selectedPlayer: Player | null;
  partnerText?: string;
  partnerStatus?: FuzzyMatchStatus;
  partnerCandidates?: Player[];
  selectedPartner?: Player | null;
}

// ─── Conflict Check Result ───
export type ConflictSeverity = 'error' | 'warning';

export interface ConflictResult {
  severity: ConflictSeverity;
  message: string;
  conflictMatchId?: string;
}

// ─── Recurring Schedule Types ───
export type RecurrenceType =
  | 'weekly'
  | 'monthly_date'
  | 'monthly_weekday'
  | 'custom_days';

export type RecurringScheduleStatus = 'active' | 'paused' | 'ended';
export type RecurringExceptionAction = 'cancel' | 'reschedule' | 'modify';

export interface RecurringSchedule {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  creator?: Player;
  group_id: string | null;
  venue_id: string | null;
  venue?: Venue;
  num_courts: number;
  max_players: number | null;
  sport_mode: SportMode;
  match_mode: MatchMode;
  track_elo: boolean;
  scope: SessionScope;
  // Recurrence config
  recurrence_type: RecurrenceType;
  days_of_week: number[] | null;        // [2,4] = T3+T5 (1=CN,2=T2...7=T7)
  days_of_month: number[] | null;       // [1,15]
  monthly_week: number | null;          // tuần thứ mấy (1-5, -1=last)
  monthly_weekday: number | null;       // thứ mấy 1-7
  custom_interval_days: number | null;  // mỗi N ngày
  // Time
  start_time: string;                   // "12:00"
  end_time: string;                     // "13:30"
  // Range
  starts_on: string;                    // date string
  ends_on: string | null;
  max_occurrences: number | null;
  occurrence_count: number;
  notes: string | null;
  status: RecurringScheduleStatus;
  paused_from: string | null;
  paused_until: string | null;
  created_at: string;
  updated_at: string;
  // Computed (from join)
  subscriber_count?: number;
  upcoming_session?: {
    id: string;
    date: string;
    player_count: number;
  } | null;
}

export interface RecurringSubscriber {
  id: string;
  schedule_id: string;
  player_id: string;
  player?: Player;
  subscribed_at: string;
}

export interface RecurringException {
  id: string;
  schedule_id: string;
  original_date: string;
  action: RecurringExceptionAction;
  new_date: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
  new_venue_id: string | null;
  cancel_reason: string | null;
  created_by: string;
  created_at: string;
}

// Helper: human-readable recurrence description
export interface RecurrenceConfig {
  type: RecurrenceType;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  monthlyWeek?: number;
  monthlyWeekday?: number;
  customIntervalDays?: number;
  startTime: string;
  endTime: string;
  startsOn: string;
  endsOn?: string;
  maxOccurrences?: number;
}

// ─── Attendance Types ───────────────────────────────────────
export type RsvpStatus = 'going' | 'not_going' | 'maybe' | 'no_response';
export type CheckinMethod = 'self' | 'host' | 'qr';
export type AttendanceFinalStatus = 'present' | 'excused' | 'no_show' | 'no_response';

export interface Attendance {
  id: string;
  schedule_id: string;
  occurrence_date: string;     // 'YYYY-MM-DD' — key cho RSVP trước khi session tồn tại
  session_id: string | null;   // null cho đến khi session được generate
  player_id: string;
  player?: Player;

  // RSVP
  rsvp_status: RsvpStatus;
  rsvp_reason: string | null;
  rsvp_at: string | null;

  // Check-in
  checked_in: boolean;
  checkin_method: CheckinMethod | null;
  checkin_at: string | null;

  // Final (tính sau buổi)
  final_status: AttendanceFinalStatus | null;

  created_at: string;
  updated_at: string;
}

export interface AttendanceStreak {
  id: string;
  player_id: string;
  player?: Player;
  schedule_id: string;
  current_streak: number;
  longest_streak: number;
  last_present_date: string | null;
  last_updated_at: string;
}

export interface AttendanceSettings {
  id: string;
  group_id: string | null;
  schedule_id: string | null;
  require_rsvp: boolean;
  rsvp_deadline_hours: number;
  checkin_open_before_minutes: number;
  checkin_close_after_minutes: number;
  qr_checkin_enabled: boolean;
  inactive_reminder_enabled: boolean;
  inactive_threshold_sessions: number;
  monthly_digest_enabled: boolean;
  show_streak: boolean;
}

// Computed stats per member (for AttendanceTable)
export interface MemberAttendanceStat {
  player_id: string;
  player: Player;
  total_sessions: number;
  present_count: number;
  excused_count: number;
  no_show_count: number;
  no_response_count: number;
  attendance_rate: number;    // present / (total - excused) * 100
  current_streak: number;
  longest_streak: number;
}

// Summary for a single occurrence (for AttendanceBySession)
export interface SessionAttendanceSummary {
  occurrence_date: string;
  session_id: string | null;
  going: Attendance[];
  not_going: Attendance[];
  maybe: Attendance[];
  no_response: Attendance[];
  checked_in: Attendance[];
  no_show: Attendance[];
  total_members: number;
}
