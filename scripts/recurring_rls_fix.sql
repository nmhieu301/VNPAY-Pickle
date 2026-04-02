-- ═══════════════════════════════════════════════════════════════
-- VNPAY Pickle — RLS Fix cho recurring_schedules
-- Chạy script này nếu vẫn gặp lỗi 403 sau khi chạy migration chính
-- ═══════════════════════════════════════════════════════════════

-- Xoá hết policy cũ (phòng trường hợp conflict)
DROP POLICY IF EXISTS "recurring_schedules_select"       ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_schedules_insert"       ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_schedules_update"       ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_schedules_delete"       ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_subscribers_select"     ON recurring_subscribers;
DROP POLICY IF EXISTS "recurring_subscribers_self_write" ON recurring_subscribers;
DROP POLICY IF EXISTS "recurring_exceptions_select"      ON recurring_exceptions;
DROP POLICY IF EXISTS "recurring_exceptions_write"       ON recurring_exceptions;

-- Đảm bảo RLS bật
ALTER TABLE recurring_schedules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_exceptions  ENABLE ROW LEVEL SECURITY;

-- ─── recurring_schedules ───────────────────────────────────────

-- Tất cả user đã đăng nhập đều xem được (đơn giản hoá)
CREATE POLICY "recurring_schedules_select" ON recurring_schedules
  FOR SELECT TO authenticated USING (true);

-- User đã đăng nhập tạo được, creator_id phải là chính mình
CREATE POLICY "recurring_schedules_insert" ON recurring_schedules
  FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

-- Chỉ creator mới sửa được
CREATE POLICY "recurring_schedules_update" ON recurring_schedules
  FOR UPDATE TO authenticated USING (creator_id = auth.uid());

-- Chỉ creator mới xoá được
CREATE POLICY "recurring_schedules_delete" ON recurring_schedules
  FOR DELETE TO authenticated USING (creator_id = auth.uid());

-- ─── recurring_subscribers ─────────────────────────────────────

CREATE POLICY "recurring_subscribers_select" ON recurring_subscribers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "recurring_subscribers_self_write" ON recurring_subscribers
  FOR ALL TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- ─── recurring_exceptions ──────────────────────────────────────

CREATE POLICY "recurring_exceptions_select" ON recurring_exceptions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "recurring_exceptions_write" ON recurring_exceptions
  FOR ALL TO authenticated
  USING (
    schedule_id IN (SELECT id FROM recurring_schedules WHERE creator_id = auth.uid())
  )
  WITH CHECK (
    schedule_id IN (SELECT id FROM recurring_schedules WHERE creator_id = auth.uid())
  );

-- ─── Kiểm tra: xem danh sách policy hiện tại ──────────────────
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('recurring_schedules', 'recurring_subscribers', 'recurring_exceptions')
ORDER BY tablename, policyname;
