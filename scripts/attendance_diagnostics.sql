-- ═══════════════════════════════════════════════════════════════
-- VNPAY Pickle — Attendance Diagnostics & Quick Test
-- Chạy từng block trong Supabase SQL Editor để kiểm tra
-- ═══════════════════════════════════════════════════════════════

-- ─── BLOCK 1: Kiểm tra tables đã tồn tại chưa ─────────────────
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c2 WHERE c2.table_name = t.table_name) AS col_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('attendance', 'attendance_streaks', 'attendance_settings')
ORDER BY table_name;

-- Nếu kết quả trả về 0 row → Chạy scripts/attendance_migration.sql trước!

-- ─── BLOCK 2: Kiểm tra RLS policies ───────────────────────────
SELECT schemaname, tablename, policyname, roles
FROM pg_policies
WHERE tablename IN ('attendance', 'attendance_streaks', 'attendance_settings')
ORDER BY tablename;

-- ─── BLOCK 3: Kiểm tra recurring_schedules (lịch định kỳ) ──────
SELECT id, name, group_id, is_active
FROM recurring_schedules
LIMIT 10;

-- ─── BLOCK 4: Thử INSERT RSVP thủ công (test flow) ─────────────
-- Thay <schedule_uuid> và <player_uuid> bằng giá trị thực
/*
INSERT INTO attendance (schedule_id, occurrence_date, player_id, rsvp_status, rsvp_at)
VALUES (
  '<schedule_uuid>',
  CURRENT_DATE + 3,          -- 3 ngày từ hôm nay
  '<player_uuid>',
  'going',
  NOW()
)
ON CONFLICT (schedule_id, occurrence_date, player_id)
DO UPDATE SET rsvp_status = EXCLUDED.rsvp_status, rsvp_at = EXCLUDED.rsvp_at
RETURNING *;
*/

-- ─── BLOCK 5: Xem dữ liệu attendance hiện tại ─────────────────
SELECT
  a.id,
  rs.name AS schedule_name,
  a.occurrence_date,
  p.full_name,
  a.rsvp_status,
  a.checked_in,
  a.created_at
FROM attendance a
JOIN recurring_schedules rs ON rs.id = a.schedule_id
JOIN players p ON p.id = a.player_id
ORDER BY a.created_at DESC
LIMIT 20;

-- ─── BLOCK 6: Kiểm tra player_id khớp với auth.uid() ──────────
-- Đăng nhập bằng tài khoản muốn test, rồi chạy:
SELECT
  p.id AS player_id,
  p.email,
  p.full_name,
  auth.uid() AS auth_uid,
  (p.id = auth.uid()) AS id_matches
FROM players p
WHERE p.id = auth.uid();

-- Nếu id_matches = false → player.id chưa được sync với auth.uid()
-- Chạy BLOCK 7 dưới để fix:

-- ─── BLOCK 7 (FIX): Sync player_id với auth.uid() nếu cần ──────
/*
UPDATE players
SET id = auth.uid()
WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid());
*/

-- ─── BLOCK 8: Kiểm tra occurrence_date hợp lệ ─────────────────
-- Lấy danh sách ngày buổi chơi sắp tới từ recurring_schedules
-- (Dùng để copy occurrence_date khi test RSVP)
SELECT
  id,
  name,
  recurrence_days,
  start_time,
  CURRENT_DATE AS today,
  -- Ngày T3 tuần tới (thứ 3 = 2)
  (CURRENT_DATE + (2 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7 + 7) AS next_tue,
  -- Ngày T5 tuần tới (thứ 5 = 4)
  (CURRENT_DATE + (4 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7 + 7) AS next_thu
FROM recurring_schedules
WHERE is_active = true
LIMIT 10;
