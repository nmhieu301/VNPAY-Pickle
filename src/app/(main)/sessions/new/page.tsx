'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Users, Zap, FileText } from 'lucide-react';
import { PickleballIcon } from '@/components/icons/PickleballIcon';
import { SportMode, MatchMode, SessionScope } from '@/types';
import AddVenueModal from '@/components/session/AddVenueModal';
import VenueSearchInput from '@/components/session/VenueSearchInput';

export default function NewSessionPage() {
  const router = useRouter();
  const { currentUser, venues, createSession } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddVenue, setShowAddVenue] = useState(false);

  const [form, setForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '12:00',
    end_time: '13:30',
    venue_id: '',
    sport_mode: 'doubles' as SportMode,
    match_mode: 'elo_balanced' as MatchMode,
    scope: 'public' as SessionScope,
    num_courts: 2,
    max_players: 12,
    is_scored: true,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmitting(true);

    const session = await createSession({
      ...form,
      host_id: currentUser.id,
      status: 'open',
      max_players: form.max_players || null,
    });

    if (session) {
      router.push(`/sessions/${session.id}`);
    } else {
      setIsSubmitting(false);
    }
  };



  const handleVenueCreated = (venueId: string) => {
    setForm({ ...form, venue_id: venueId });
    setShowAddVenue(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-xl font-bold mb-1">📋 Tạo lịch thi đấu mới</h1>
        <p className="text-sm text-[var(--muted-fg)] mb-6">Tạo buổi chơi Pickleball cho nhóm/phòng ban</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Tên lịch thi đấu</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="VD: Trưa T4 - Nhóm Kỹ thuật"
              className="input"
              required
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium mb-1.5">
                <Calendar className="w-3.5 h-3.5" /> Ngày
              </label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium mb-1.5">
                <Clock className="w-3.5 h-3.5" /> Bắt đầu
              </label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => setForm({ ...form, start_time: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium mb-1.5">
                <Clock className="w-3.5 h-3.5" /> Kết thúc
              </label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => setForm({ ...form, end_time: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">📍 Địa điểm</label>
            <VenueSearchInput
              venues={venues}
              selectedVenueId={form.venue_id}
              onSelect={(id) => setForm({ ...form, venue_id: id })}
              onAddNew={() => setShowAddVenue(true)}
            />
          </div>

          {/* Courts & Players */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Số sân</label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.num_courts}
                onChange={e => setForm({ ...form, num_courts: parseInt(e.target.value) || 1 })}
                className="input"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium mb-1.5">
                <Users className="w-3.5 h-3.5" /> Tối đa
              </label>
              <input
                type="number"
                min={2}
                max={40}
                value={form.max_players}
                onChange={e => setForm({ ...form, max_players: parseInt(e.target.value) || 12 })}
                className="input"
              />
            </div>
          </div>

          {/* Sport mode */}
          <div>
            <label className="text-sm font-medium mb-2 block">Thể thức chơi</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {([
                { value: 'doubles', label: '👥 Đánh đôi nam', desc: 'Đôi nam' },
                { value: 'mixed', label: '🔄 Đôi nam nữ', desc: 'Mix đôi' },
                { value: 'singles', label: '🏏 Đánh đơn', desc: 'Đơn' },
                { value: 'womens_doubles', label: '👩‍👩‍ Đôi nữ', desc: 'Đôi nữ' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, sport_mode: opt.value })}
                  className={`card p-3 text-center text-sm transition-colors ${
                    form.sport_mode === opt.value
                      ? 'ring-2 ring-[var(--primary)] bg-blue-50 dark:bg-blue-950/30'
                      : ''
                  }`}
                >
                  <span className="text-lg block">{opt.label.split(' ')[0]}</span>
                  <span className="text-xs text-[var(--muted-fg)]">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Match mode */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium mb-2">
              <Zap className="w-3.5 h-3.5" /> Chế độ chia cặp
            </label>
            <div className="space-y-2">
              {([
                { value: 'elo_balanced', label: '⚖️ Cân bằng ELO', desc: 'Recommended ⭐ — Chia cặp dựa trên ELO' },
                { value: 'random', label: '🎲 Ngẫu nhiên', desc: 'Xáo ngẫu nhiên, vui vẻ' },
                { value: 'manual', label: '✏️ Thủ công', desc: 'Host tự chia cặp' },
              ] as const).map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    form.match_mode === opt.value
                      ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-950/30'
                      : 'border-[var(--border-color)] hover:border-[var(--muted-fg)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="match_mode"
                    value={opt.value}
                    checked={form.match_mode === opt.value}
                    onChange={() => setForm({ ...form, match_mode: opt.value })}
                    className="mt-0.5 accent-[var(--primary)]"
                  />
                  <div>
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-[var(--muted-fg)]">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Scored */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_scored}
              onChange={e => setForm({ ...form, is_scored: e.target.checked })}
              className="accent-[var(--primary)]"
            />
            <div>
              <p className="font-medium text-sm">📊 Ghi điểm (tính ELO)</p>
              <p className="text-xs text-[var(--muted-fg)]">Bỏ tick nếu chỉ chơi vui</p>
            </div>
          </label>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium mb-1.5">
              <FileText className="w-3.5 h-3.5" /> Ghi chú
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="VD: Mang giày sân indoor, có nước uống"
              className="input min-h-[80px] resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!form.title || isSubmitting}
            className="btn btn-gradient btn-lg w-full"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><PickleballIcon size={18} className="inline-block mr-1" /> Tạo lịch thi đấu</>
            )}
          </button>
        </form>
      </motion.div>

      {/* Add Venue Modal */}
      <AddVenueModal
        isOpen={showAddVenue}
        onClose={() => setShowAddVenue(false)}
        onCreated={handleVenueCreated}
      />
    </div>
  );
}

