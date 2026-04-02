-- ═══════════════════════════════════════════════════════════════
-- VNPAY Pickle — Recurring Sessions Migration PATCH
-- Chạy file này trên Supabase SQL Editor
-- (An toàn để chạy lại nhiều lần — dùng IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. recurring_schedules ───────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_schedules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(200) NOT NULL,
  description          TEXT,
  creator_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  group_id             UUID REFERENCES groups(id) ON DELETE CASCADE,
  venue_id             UUID REFERENCES venues(id) ON DELETE SET NULL,
  num_courts           INT NOT NULL DEFAULT 2,
  max_players          INT,
  sport_mode           VARCHAR(20) NOT NULL DEFAULT 'doubles',
  match_mode           VARCHAR(20) NOT NULL DEFAULT 'elo_balanced',
  track_elo            BOOLEAN NOT NULL DEFAULT true,
  scope                VARCHAR(20) NOT NULL DEFAULT 'public',

  -- Cấu hình lặp
  recurrence_type      VARCHAR(30) NOT NULL,
  days_of_week         INT[],
  days_of_month        INT[],
  monthly_week         INT,
  monthly_weekday      INT,
  custom_interval_days INT,

  -- Giờ
  start_time           TIME NOT NULL,
  end_time             TIME NOT NULL,

  -- Phạm vi
  starts_on            DATE NOT NULL,
  ends_on              DATE,
  max_occurrences      INT,
  occurrence_count     INT NOT NULL DEFAULT 0,

  notes                TEXT,
  status               VARCHAR(20) NOT NULL DEFAULT 'active',
  paused_from          DATE,
  paused_until         DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. recurring_subscribers ─────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_subscribers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id   UUID NOT NULL REFERENCES recurring_schedules(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(schedule_id, player_id)
);

-- ─── 3. recurring_exceptions ──────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_exceptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     UUID NOT NULL REFERENCES recurring_schedules(id) ON DELETE CASCADE,
  original_date   DATE NOT NULL,
  action          VARCHAR(20) NOT NULL,
  new_date        DATE,
  new_start_time  TIME,
  new_end_time    TIME,
  new_venue_id    UUID REFERENCES venues(id),
  cancel_reason   TEXT,
  created_by      UUID NOT NULL REFERENCES players(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(schedule_id, original_date)
);

-- ─── 4. Thêm columns vào sessions ────────────────────────────
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS recurring_schedule_id UUID REFERENCES recurring_schedules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurring_date        DATE;

-- ─── 5. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_creator  ON recurring_schedules(creator_id);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_group    ON recurring_schedules(group_id);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_status   ON recurring_schedules(status);
CREATE INDEX IF NOT EXISTS idx_recurring_subscribers_sched  ON recurring_subscribers(schedule_id);
CREATE INDEX IF NOT EXISTS idx_recurring_subscribers_player ON recurring_subscribers(player_id);
CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_sched   ON recurring_exceptions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_sessions_recurring_sched     ON sessions(recurring_schedule_id);

-- ─── 6. updated_at trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_recurring_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recurring_updated_at ON recurring_schedules;
CREATE TRIGGER trg_recurring_updated_at
  BEFORE UPDATE ON recurring_schedules
  FOR EACH ROW EXECUTE FUNCTION update_recurring_updated_at();

-- ─── 7. Enable RLS ────────────────────────────────────────────
ALTER TABLE recurring_schedules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_exceptions  ENABLE ROW LEVEL SECURITY;

-- ─── 8. Drop old policies trước khi tạo lại (tránh conflict) ──
DROP POLICY IF EXISTS "recurring_schedules_select"           ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_schedules_insert"           ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_schedules_update"           ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_schedules_delete"           ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_subscribers_select"         ON recurring_subscribers;
DROP POLICY IF EXISTS "recurring_subscribers_self_write"     ON recurring_subscribers;
DROP POLICY IF EXISTS "recurring_exceptions_select"          ON recurring_exceptions;
DROP POLICY IF EXISTS "recurring_exceptions_write"           ON recurring_exceptions;

-- ─── 9. RLS Policies ──────────────────────────────────────────

-- SELECT: public schedule visible to all authenticated users
--         group/private schedule visible to creator or group members
CREATE POLICY "recurring_schedules_select" ON recurring_schedules
  FOR SELECT TO authenticated USING (
    scope = 'public'
    OR creator_id = auth.uid()
    OR (
      group_id IN (
        SELECT group_id FROM group_members
        WHERE player_id = auth.uid()
          AND status = 'active'
      )
    )
  );

-- INSERT: chỉ cần là authenticated và creator_id = mình
CREATE POLICY "recurring_schedules_insert" ON recurring_schedules
  FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

-- UPDATE: creator only
CREATE POLICY "recurring_schedules_update" ON recurring_schedules
  FOR UPDATE TO authenticated USING (creator_id = auth.uid());

-- DELETE: creator only
CREATE POLICY "recurring_schedules_delete" ON recurring_schedules
  FOR DELETE TO authenticated USING (creator_id = auth.uid());

-- recurring_subscribers SELECT: self hoặc creator của schedule
CREATE POLICY "recurring_subscribers_select" ON recurring_subscribers
  FOR SELECT TO authenticated USING (
    player_id = auth.uid()
    OR schedule_id IN (
      SELECT id FROM recurring_schedules WHERE creator_id = auth.uid()
    )
  );

-- recurring_subscribers INSERT/DELETE: self only
CREATE POLICY "recurring_subscribers_self_write" ON recurring_subscribers
  FOR ALL TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- recurring_exceptions SELECT
CREATE POLICY "recurring_exceptions_select" ON recurring_exceptions
  FOR SELECT TO authenticated USING (
    schedule_id IN (
      SELECT id FROM recurring_schedules WHERE creator_id = auth.uid()
      UNION
      SELECT schedule_id FROM recurring_subscribers WHERE player_id = auth.uid()
    )
  );

-- recurring_exceptions INSERT/UPDATE/DELETE: creator of schedule only
CREATE POLICY "recurring_exceptions_write" ON recurring_exceptions
  FOR ALL TO authenticated
  USING (
    schedule_id IN (SELECT id FROM recurring_schedules WHERE creator_id = auth.uid())
  )
  WITH CHECK (
    schedule_id IN (SELECT id FROM recurring_schedules WHERE creator_id = auth.uid())
  );
