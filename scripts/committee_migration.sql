-- ═══════════════════════════════════════════
-- VNPAY Pickle — Committee Module Migration
-- Phase 3: Ban tổ chức, Guest Players, Live Scoring
-- Chạy trong Supabase SQL Editor
-- ═══════════════════════════════════════════

-- 1. Bảng tournament_committee (phân quyền Ban tổ chức)
CREATE TABLE IF NOT EXISTS tournament_committee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id),
  role VARCHAR(20) DEFAULT 'committee', -- 'director' | 'committee'
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);

-- 2. Bảng guest_players (VĐV tạm chưa có tài khoản)
CREATE TABLE IF NOT EXISTS guest_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  company VARCHAR(100) DEFAULT 'VNPAY',
  estimated_tier VARCHAR(20) DEFAULT 'Silver',
  linked_player_id UUID REFERENCES players(id),
  created_by UUID NOT NULL REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng score_log (log từng điểm cho live scoring + undo)
CREATE TABLE IF NOT EXISTS score_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  team VARCHAR(1) NOT NULL, -- 'A' hoặc 'B'
  score_a INT NOT NULL,
  score_b INT NOT NULL,
  action VARCHAR(20) DEFAULT 'point', -- 'point' | 'undo' | 'timeout' | 'side_out'
  scored_by UUID REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng schedule_change_log (lịch sử thay đổi lịch thi đấu)
CREATE TABLE IF NOT EXISTS schedule_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES players(id),
  old_court INT,
  new_court INT,
  old_time TIMESTAMPTZ,
  new_time TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Thêm lock columns vào tournament_matches
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS scoring_locked_by UUID REFERENCES players(id);
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS scoring_locked_at TIMESTAMPTZ;

-- 6. Enable Realtime cho score_log
ALTER PUBLICATION supabase_realtime ADD TABLE score_log;

-- 7. RLS Policies cho bảng mới
ALTER TABLE tournament_committee ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_change_log ENABLE ROW LEVEL SECURITY;

-- tournament_committee
CREATE POLICY "Allow read committee" ON tournament_committee FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert committee" ON tournament_committee FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update committee" ON tournament_committee FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete committee" ON tournament_committee FOR DELETE TO authenticated USING (true);

-- guest_players
CREATE POLICY "Allow read guest_players" ON guest_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert guest_players" ON guest_players FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update guest_players" ON guest_players FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete guest_players" ON guest_players FOR DELETE TO authenticated USING (true);

-- score_log
CREATE POLICY "Allow read score_log" ON score_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow public read score_log" ON score_log FOR SELECT TO anon USING (true);
CREATE POLICY "Allow insert score_log" ON score_log FOR INSERT TO authenticated WITH CHECK (true);

-- schedule_change_log
CREATE POLICY "Allow read schedule_change_log" ON schedule_change_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert schedule_change_log" ON schedule_change_log FOR INSERT TO authenticated WITH CHECK (true);

-- 8. Auto-insert Director khi tạo giải đấu (trigger)
CREATE OR REPLACE FUNCTION fn_add_tournament_director()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tournament_committee (tournament_id, player_id, role)
  VALUES (NEW.id, NEW.organizer_id, 'director')
  ON CONFLICT (tournament_id, player_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_add_tournament_director ON tournaments;
CREATE TRIGGER trg_add_tournament_director
  AFTER INSERT ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION fn_add_tournament_director();

-- Backfill director cho giải đấu đã có sẵn
INSERT INTO tournament_committee (tournament_id, player_id, role)
SELECT id, organizer_id, 'director'
FROM tournaments
ON CONFLICT (tournament_id, player_id) DO NOTHING;
