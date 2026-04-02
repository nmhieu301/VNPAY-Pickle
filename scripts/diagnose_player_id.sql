-- ═══════════════════════════════════════════════════════════════
-- VNPAY Pickle — Chẩn đoán & Fix player ID mismatch
-- Chạy từng phần trên Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── BƯỚC 1: Xem danh sách auth users và players ──────────────
-- Kiểm tra xem auth.uid() có khớp với players.id không
SELECT
  au.id AS auth_uid,
  au.email AS auth_email,
  p.id AS player_id,
  p.email AS player_email,
  CASE WHEN au.id = p.id THEN '✅ MATCH' ELSE '❌ MISMATCH' END AS status
FROM auth.users au
LEFT JOIN players p ON p.email = au.email
ORDER BY au.email;

-- ─── BƯỚC 2 (nếu có MISMATCH): Sync player.id = auth.uid() ─────
-- Câu này sẽ UPDATE players.id để khớp với auth.uid()
-- ⚠️ CẢNH BÁO: Chạy bước này nếu bước 1 có dòng MISMATCH
-- Phải chạy trước khi có bất kỳ foreign key references nào đến players.id

-- Cách an toàn: Xoá player cũ và tạo lại với id đúng
-- (Chỉ làm nếu chưa có session/match data quan trọng)

-- Uncomment để chạy:
/*
WITH mapping AS (
  SELECT
    au.id AS correct_id,
    p.id AS old_id,
    p.email
  FROM auth.users au
  JOIN players p ON p.email = au.email
  WHERE au.id != p.id
)
UPDATE players
SET id = mapping.correct_id
FROM mapping
WHERE players.id = mapping.old_id;
*/

-- ─── BƯỚC 3: Verify recurring_schedules RLS ───────────────────
-- Test insert với auth context của chính Supabase
-- Xem auth.uid() hiện tại là gì
SELECT auth.uid() AS current_auth_uid;

-- ─── BƯỚC 4: Kiểm tra policy hiện tại ────────────────────────
SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'recurring_schedules'
ORDER BY policyname;
