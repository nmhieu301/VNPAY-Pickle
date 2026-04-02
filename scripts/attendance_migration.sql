-- ═══════════════════════════════════════════════════════════════
-- VNPAY Pickle — Attendance Migration
-- Chạy trên Supabase SQL Editor
-- RSVP có thể tạo trước khi session được generate (dùng schedule_id + occurrence_date)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. attendance (điểm danh chính) ─────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Key: theo lịch định kỳ + ngày buổi (RSVP trước khi session tồn tại)
  schedule_id      UUID NOT NULL REFERENCES recurring_schedules(id) ON DELETE CASCADE,
  occurrence_date  DATE NOT NULL,

  -- Link session sau khi được generate (nullable)
  session_id       UUID REFERENCES sessions(id) ON DELETE SET NULL,

  player_id        UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- RSVP (trước buổi chơi)
  rsvp_status      VARCHAR(20) NOT NULL DEFAULT 'no_response',
  -- 'going' | 'not_going' | 'maybe' | 'no_response'
  rsvp_reason      TEXT,
  rsvp_at          TIMESTAMPTZ,

  -- Check-in (tại sân)
  checked_in       BOOLEAN NOT NULL DEFAULT false,
  checkin_method   VARCHAR(20),   -- 'self' | 'host' | 'qr'
  checkin_at       TIMESTAMPTZ,

  -- Final (tự động sau buổi)
  final_status     VARCHAR(20),
  -- 'present' | 'excused' | 'no_show' | 'no_response'

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(schedule_id, occurrence_date, player_id)
);

-- ─── 2. attendance_streaks (cache streak per player/schedule) ──
CREATE TABLE IF NOT EXISTS attendance_streaks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  schedule_id         UUID NOT NULL REFERENCES recurring_schedules(id) ON DELETE CASCADE,
  current_streak      INT NOT NULL DEFAULT 0,
  longest_streak      INT NOT NULL DEFAULT 0,
  last_present_date   DATE,
  last_updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, schedule_id)
);

-- ─── 3. attendance_settings (cấu hình per group hoặc schedule) ─
CREATE TABLE IF NOT EXISTS attendance_settings (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id                        UUID REFERENCES groups(id) ON DELETE CASCADE,
  schedule_id                     UUID REFERENCES recurring_schedules(id) ON DELETE CASCADE,
  require_rsvp                    BOOLEAN NOT NULL DEFAULT true,
  rsvp_deadline_hours             INT NOT NULL DEFAULT 2,
  checkin_open_before_minutes     INT NOT NULL DEFAULT 30,
  checkin_close_after_minutes     INT NOT NULL DEFAULT 15,
  qr_checkin_enabled              BOOLEAN NOT NULL DEFAULT false,
  inactive_reminder_enabled       BOOLEAN NOT NULL DEFAULT true,
  inactive_threshold_sessions     INT NOT NULL DEFAULT 3,
  monthly_digest_enabled          BOOLEAN NOT NULL DEFAULT true,
  show_streak                     BOOLEAN NOT NULL DEFAULT true,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_schedule_date ON attendance(schedule_id, occurrence_date);
CREATE INDEX IF NOT EXISTS idx_attendance_player        ON attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session       ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_rsvp          ON attendance(rsvp_status);
CREATE INDEX IF NOT EXISTS idx_attendance_final         ON attendance(final_status);
CREATE INDEX IF NOT EXISTS idx_streaks_player           ON attendance_streaks(player_id);
CREATE INDEX IF NOT EXISTS idx_streaks_schedule         ON attendance_streaks(schedule_id);

-- ─── 5. updated_at triggers ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON attendance;
CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

DROP TRIGGER IF EXISTS trg_attendance_settings_updated_at ON attendance_settings;
CREATE TRIGGER trg_attendance_settings_updated_at
  BEFORE UPDATE ON attendance_settings
  FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

-- ─── 6. RLS ───────────────────────────────────────────────────
ALTER TABLE attendance          ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_streaks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;

-- Drop cũ nếu có
DROP POLICY IF EXISTS "att_all_auth"      ON attendance;
DROP POLICY IF EXISTS "streak_all_auth"   ON attendance_streaks;
DROP POLICY IF EXISTS "attset_all_auth"   ON attendance_settings;

-- Authenticated users: full access (app-level security)
CREATE POLICY "att_all_auth" ON attendance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "streak_all_auth" ON attendance_streaks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "attset_all_auth" ON attendance_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Kiểm tra ─────────────────────────────────────────────────
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('attendance', 'attendance_streaks', 'attendance_settings')
ORDER BY table_name, ordinal_position;
