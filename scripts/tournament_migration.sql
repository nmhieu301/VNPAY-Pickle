-- ═══════════════════════════════════════════
-- VNPAY Pickle — Tournament Module Migration (Full)
-- Phase 2: Hệ thống Giải đấu
-- ✅ Tạo bảng tournaments từ đầu (không cần bảng cũ)
-- Chạy trong Supabase SQL Editor
-- ═══════════════════════════════════════════

-- 1. Bảng tournaments (tạo mới hoàn chỉnh)
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  banner_url TEXT,
  organizer_id UUID NOT NULL REFERENCES players(id),
  type VARCHAR(20) DEFAULT 'custom',                    -- 'company','group','custom'
  format VARCHAR(30) DEFAULT 'round_robin',             -- legacy field
  category VARCHAR(200) DEFAULT '',                     -- comma-separated event categories
  max_teams INT DEFAULT 16,
  registration_open_date TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  venue_id UUID REFERENCES venues(id),
  group_id UUID REFERENCES groups(id),
  status VARCHAR(20) DEFAULT 'draft',                   -- 'draft','registration','in_progress','completed','cancelled'
  rules TEXT,
  prizes TEXT,
  -- Scoring rules
  scoring_system VARCHAR(20) DEFAULT 'side_out',        -- 'side_out','rally'
  points_target INT DEFAULT 11,
  sets_format VARCHAR(10) DEFAULT 'bo3',                -- 'bo1','bo3','bo5'
  rest_minutes INT DEFAULT 10,
  has_third_place BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  entry_fee INT DEFAULT 0,
  num_courts INT DEFAULT 2,
  max_match_minutes INT,
  special_rules TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Nội dung thi đấu (event = 1 nội dung trong giải)
CREATE TABLE IF NOT EXISTS tournament_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL,   -- 'mens_doubles','womens_doubles','mixed_doubles','mens_singles','womens_singles','open_doubles'
  division VARCHAR(30) DEFAULT 'open',  -- 'open','advanced','intermediate','beginner'
  elo_min INT,
  elo_max INT,
  format VARCHAR(30) DEFAULT 'pool_playoff', -- 'round_robin','single_elim','double_elim','pool_playoff','swiss','king_of_court'
  max_teams INT DEFAULT 16,
  num_pools INT,
  teams_advance_per_pool INT DEFAULT 2,
  swiss_rounds INT,
  status VARCHAR(20) DEFAULT 'registration', -- 'registration','bracket_set','in_progress','completed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Đội đăng ký tham gia (1 event)
CREATE TABLE IF NOT EXISTS tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL REFERENCES players(id),
  player2_id UUID REFERENCES players(id),   -- NULL cho singles
  team_name VARCHAR(100),
  seed_number INT,
  avg_elo DECIMAL(7,2),
  pool_letter CHAR(1),                       -- A, B, C, D...
  status VARCHAR(20) DEFAULT 'pending',      -- 'pending','confirmed','withdrawn','disqualified'
  checked_in BOOLEAN DEFAULT false,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Trận đấu trong giải
CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
  round_type VARCHAR(30) NOT NULL,   -- 'pool','winner_r1','winner_r2','loser_r1','quarter','semi','final','third_place','grand_final'
  round_number INT,
  match_number INT,
  team_a_id UUID REFERENCES tournament_teams(id),
  team_b_id UUID REFERENCES tournament_teams(id),
  court_number INT,
  scheduled_time TIMESTAMPTZ,
  -- Set scores (team A - team B)
  set1_a INT, set1_b INT,
  set2_a INT, set2_b INT,
  set3_a INT, set3_b INT,
  set4_a INT, set4_b INT,
  set5_a INT, set5_b INT,
  winner_team_id UUID REFERENCES tournament_teams(id),
  status VARCHAR(20) DEFAULT 'scheduled',   -- 'scheduled','live','completed','forfeit','dispute','cancelled'
  is_walkover BOOLEAN DEFAULT false,
  dispute_note TEXT,
  score_confirmed_by_a BOOLEAN DEFAULT false,
  score_confirmed_by_b BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 5. Bảng xếp hạng (vòng bảng / swiss)
CREATE TABLE IF NOT EXISTS tournament_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  pool_letter CHAR(1),
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  points_for INT DEFAULT 0,
  points_against INT DEFAULT 0,
  point_differential INT DEFAULT 0,
  buchholz_score DECIMAL(7,2),
  rank_in_pool INT,
  UNIQUE(event_id, team_id)
);

-- 6. Enable Realtime cho tournament_matches (live score)
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_matches;

-- 7. RLS Policies
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_standings ENABLE ROW LEVEL SECURITY;

-- Cho phép authenticated đọc tất cả
CREATE POLICY "Allow read tournaments" ON tournaments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read tournament_events" ON tournament_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read tournament_teams" ON tournament_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read tournament_matches" ON tournament_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read tournament_standings" ON tournament_standings FOR SELECT TO authenticated USING (true);

-- Cho phép public đọc (live score không cần login)
CREATE POLICY "Allow public read tournament_matches" ON tournament_matches FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read tournament_events" ON tournament_events FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read tournaments" ON tournaments FOR SELECT TO anon USING (true);

-- Cho phép authenticated insert/update
CREATE POLICY "Allow insert tournaments" ON tournaments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update tournaments" ON tournaments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow insert tournament_events" ON tournament_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update tournament_events" ON tournament_events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow insert tournament_teams" ON tournament_teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update tournament_teams" ON tournament_teams FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow insert tournament_matches" ON tournament_matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update tournament_matches" ON tournament_matches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow insert tournament_standings" ON tournament_standings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update tournament_standings" ON tournament_standings FOR UPDATE TO authenticated USING (true);
