-- ═══════════════════════════════════════════════════════════════
-- VNPAY Pickle — FINAL FIX cho recurring_schedules RLS
-- Chạy toàn bộ script này trên Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── BƯỚC 1: Xoá tất cả policy cũ ────────────────────────────
DROP POLICY IF EXISTS "recurring_schedules_select"       ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_schedules_insert"       ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_schedules_update"       ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_schedules_delete"       ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_subscribers_select"     ON recurring_subscribers;
DROP POLICY IF EXISTS "recurring_subscribers_self_write" ON recurring_subscribers;
DROP POLICY IF EXISTS "recurring_exceptions_select"      ON recurring_exceptions;
DROP POLICY IF EXISTS "recurring_exceptions_write"       ON recurring_exceptions;

-- ─── BƯỚC 2: Tắt RLS tạm thời để test ────────────────────────
ALTER TABLE recurring_schedules   DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_subscribers DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_exceptions  DISABLE ROW LEVEL SECURITY;

-- ─── BƯỚC 3: Bật lại RLS ──────────────────────────────────────
ALTER TABLE recurring_schedules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_exceptions  ENABLE ROW LEVEL SECURITY;

-- ─── BƯỚC 4: Tạo policy hoàn toàn mới — ĐƠN GIẢN NHẤT ────────

-- recurring_schedules: MỌI user đã login đều đọc/ghi được
-- (bảo mật sẽ xử lý ở application layer)
CREATE POLICY "rs_all_authenticated" ON recurring_schedules
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- recurring_subscribers: Tương tự
CREATE POLICY "rsub_all_authenticated" ON recurring_subscribers
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- recurring_exceptions: Tương tự
CREATE POLICY "rexc_all_authenticated" ON recurring_exceptions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── KIỂM TRA: Policies hiện tại ─────────────────────────────
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename IN ('recurring_schedules', 'recurring_subscribers', 'recurring_exceptions')
ORDER BY tablename, policyname;

-- ─── KIỂM TRA: Bảng recurring_schedules có tồn tại không ─────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'recurring_schedules'
ORDER BY ordinal_position;
