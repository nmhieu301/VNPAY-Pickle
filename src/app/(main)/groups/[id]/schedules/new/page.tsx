'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — New Recurring Schedule Page
// /groups/:id/schedules/new
// ═══════════════════════════════════════════

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Repeat } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { RecurrenceSelector, type RecurrenceValue } from '@/components/schedule/RecurrenceSelector';
import VenueSearchInput from '@/components/session/VenueSearchInput';
import AddVenueModal from '@/components/session/AddVenueModal';
import { createRecurringSchedule } from '@/lib/supabase/recurringApi';
import type { SportMode, MatchMode } from '@/types';

export default function NewGroupSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = use(params);
  const router = useRouter();
  const { currentUser, venues } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    venue_id: '',
    num_courts: 2,
    max_players: 12 as number | null,
    sport_mode: 'doubles' as SportMode,
    match_mode: 'elo_balanced' as MatchMode,
    track_elo: true,
    starts_on: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [recurrence, setRecurrence] = useState<RecurrenceValue>({
    type: 'weekly',
    daysOfWeek: [2], // T2 mặc định
    endMode: 'never',
  });

  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:30');

  const isValid = () => {
    if (!form.name.trim()) return false;
    if (recurrence.type === 'weekly' && !recurrence.daysOfWeek?.length) return false;
    if (recurrence.type === 'monthly_date' && !recurrence.daysOfMonth?.length) return false;
    if (recurrence.endMode === 'date' && !recurrence.endsOn) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isValid()) return;
    setIsSubmitting(true);

    const schedule = await createRecurringSchedule({
      name: form.name.trim(),
      description: form.description || null,
      creator_id: currentUser.id,
      group_id: groupId,
      venue_id: form.venue_id || null,
      num_courts: form.num_courts,
      max_players: form.max_players,
      sport_mode: form.sport_mode,
      match_mode: form.match_mode,
      track_elo: form.track_elo,
      scope: 'private' as const,
      recurrence_type: recurrence.type,
      days_of_week: recurrence.type === 'weekly' ? (recurrence.daysOfWeek ?? null) : null,
      days_of_month: recurrence.type === 'monthly_date' ? (recurrence.daysOfMonth ?? null) : null,
      monthly_week: recurrence.type === 'monthly_weekday' ? (recurrence.monthlyWeek ?? 1) : null,
      monthly_weekday: recurrence.type === 'monthly_weekday' ? (recurrence.monthlyWeekday ?? 2) : null,
      custom_interval_days: recurrence.type === 'custom_days' ? (recurrence.customIntervalDays ?? 7) : null,
      start_time: startTime,
      end_time: endTime,
      starts_on: form.starts_on,
      ends_on: recurrence.endMode === 'date' ? (recurrence.endsOn ?? null) : null,
      max_occurrences: recurrence.endMode === 'count' ? (recurrence.maxOccurrences ?? null) : null,
      notes: form.notes || null,
      status: 'active',
      paused_from: null,
      paused_until: null,
    });

    if (schedule) {
      router.push(`/groups/${groupId}/schedules/${schedule.id}`);
    } else {
      setErrorMsg('Tạo lịch thất bại. Vui lòng chạy recurring_migration.sql trên Supabase trước, hoặc thử lại.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/groups/${groupId}`}
        className="flex items-center gap-1.5 text-xs text-[var(--muted-fg)] hover:text-[var(--fg)] mb-4 w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Quay lại nhóm
      </Link>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Tạo lịch chơi định kỳ</h1>
            <p className="text-sm text-[var(--muted-fg)]">Lịch sinh hoạt cố định cho nhóm</p>
          </div>
        </div>

        {/* Error toast */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tên lịch */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Tên lịch chơi *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Pickle trưa T3 & T5 — Nhóm Dev"
              className="input"
              required
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Mô tả (tuỳ chọn)</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Thông tin thêm cho thành viên..."
              className="input resize-none min-h-[72px]"
            />
          </div>

          {/* Bắt đầu từ ngày */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Bắt đầu từ ngày *</label>
            <input
              type="date"
              value={form.starts_on}
              onChange={e => setForm({ ...form, starts_on: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="input"
              required
            />
          </div>

          {/* Giờ cố định mỗi buổi */}
          <div>
            <label className="block text-sm font-medium mb-2">⏰ Giờ chơi mỗi buổi</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted-fg)] mb-1 block">Bắt đầu</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-fg)] mb-1 block">Kết thúc</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Kiểu lặp */}
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-4">🔄 Cấu hình lặp</h3>
            <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
          </div>

          {/* Địa điểm */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">📍 Địa điểm</label>
            <VenueSearchInput
              venues={venues}
              selectedVenueId={form.venue_id}
              onSelect={id => setForm({ ...form, venue_id: id })}
              onAddNew={() => setShowAddVenue(true)}
            />
          </div>

          {/* Sân & Người */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Số sân</label>
              <input
                type="number"
                min={1} max={10}
                value={form.num_courts}
                onChange={e => setForm({ ...form, num_courts: Number(e.target.value) || 2 })}
                className="input"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tối đa người/buổi</label>
              <input
                type="number"
                min={2} max={40}
                value={form.max_players ?? ''}
                onChange={e => setForm({ ...form, max_players: Number(e.target.value) || null })}
                className="input"
                placeholder="Không giới hạn"
              />
            </div>
          </div>

          {/* Thể thức */}
          <div>
            <label className="text-sm font-medium mb-2 block">Thể thức chơi</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {([
                { value: 'doubles', label: '👥', desc: 'Đôi nam' },
                { value: 'mixed', label: '🔄', desc: 'Mix đôi' },
                { value: 'singles', label: '🏏', desc: 'Đơn' },
                { value: 'womens_doubles', label: '👩‍👩', desc: 'Đôi nữ' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, sport_mode: opt.value })}
                  className={`card p-3 text-center text-sm transition-colors ${
                    form.sport_mode === opt.value ? 'ring-2 ring-[var(--primary)] bg-blue-50 dark:bg-blue-950/30' : ''
                  }`}
                >
                  <span className="text-xl block">{opt.label}</span>
                  <span className="text-xs text-[var(--muted-fg)]">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ELO toggle */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] cursor-pointer">
            <input
              type="checkbox"
              checked={form.track_elo}
              onChange={e => setForm({ ...form, track_elo: e.target.checked })}
              className="accent-[var(--primary)]"
            />
            <div>
              <p className="font-medium text-sm">📊 Ghi điểm (tính ELO)</p>
              <p className="text-xs text-[var(--muted-fg)]">Bỏ tick nếu chỉ chơi vui</p>
            </div>
          </label>

          {/* Ghi chú */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Ghi chú</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="VD: Mang giày sân indoor..."
              className="input resize-none min-h-[72px]"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid() || isSubmitting}
            className="btn btn-gradient btn-lg w-full"
          >
            {isSubmitting
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <><Repeat className="w-5 h-5" /> Tạo lịch định kỳ</>
            }
          </button>
        </form>
      </motion.div>

      <AddVenueModal
        isOpen={showAddVenue}
        onClose={() => setShowAddVenue(false)}
        onCreated={id => { setForm({ ...form, venue_id: id }); setShowAddVenue(false); }}
      />
    </div>
  );
}
