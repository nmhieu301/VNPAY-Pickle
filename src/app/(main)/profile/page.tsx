'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { TierBadge } from '@/components/player/TierBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { PickleballIcon } from '@/components/icons/PickleballIcon';
import { LogOut, Edit2, Save, X, Gamepad2, Trophy, TrendingUp, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ExperienceLevel, HandPreference, PositionPreference } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, logout, departments, players, updateProfile } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [editForm, setEditForm] = useState({
    nickname: '' as string,
    hand_preference: 'right' as HandPreference,
    position_preference: 'flexible' as PositionPreference,
    experience: 'beginner' as ExperienceLevel,
    bio: '' as string,
  });

  if (!currentUser) return null;

  const dept = departments.find(d => d.id === currentUser.department_id);
  const winRate = currentUser.total_matches > 0
    ? Math.round((currentUser.total_wins / currentUser.total_matches) * 100)
    : 0;
  const rank = [...players]
    .sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0))
    .findIndex(p => p.id === currentUser.id) + 1;

  const handleLogout = async () => {
    await logout();
    // logout() already redirects via window.location.href = '/'
  };

  const startEdit = () => {
    // Normalize raw DB value 'any' → 'flexible' for the UI toggle
    const pos = (currentUser.position_preference as string) === 'any'
      ? 'flexible' as PositionPreference
      : currentUser.position_preference || 'flexible';
    setEditForm({
      nickname: currentUser.nickname || '',
      hand_preference: currentUser.hand_preference || 'right',
      position_preference: pos,
      experience: currentUser.experience || 'beginner',
      bio: currentUser.bio || '',
    });
    setIsEditing(true);
    setFeedback(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await updateProfile(editForm);
    setIsSaving(false);
    if (ok) {
      setIsEditing(false);
      setFeedback({ type: 'success', msg: 'Đã lưu thông tin!' });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', msg: 'Không thể lưu thay đổi.' });
    }
  };

  const stats = [
    { icon: <Gamepad2 className="w-5 h-5" />, value: currentUser.total_matches, label: 'Tổng trận' },
    { icon: <Trophy className="w-5 h-5" />, value: currentUser.total_wins, label: 'Thắng' },
    { icon: <TrendingUp className="w-5 h-5" />, value: `${winRate}%`, label: 'Win rate' },
    { icon: <Star className="w-5 h-5" />, value: currentUser.best_win_streak, label: 'Streak tốt nhất' },
  ];

  const experienceLabels: Record<string, string> = {
    beginner: 'Mới bắt đầu',
    under_6m: 'Dưới 6 tháng',
    '6_12m': '6-12 tháng',
    '1_2y': '1-2 năm',
    over_2y: 'Trên 2 năm',
  };

  const handLabels: Record<string, string> = { right: '🫱 Phải', left: '🫲 Trái' };
  const posLabels: Record<string, string> = { forehand: '🎯 Forehand', backhand: '🔄 Backhand', flexible: '🔀 Linh hoạt' };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`px-4 py-3 rounded-xl text-sm font-medium ${feedback.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
          >
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Header */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
          {currentUser.full_name.charAt(0)}
        </div>
        <h1 className="text-xl font-bold">{currentUser.full_name}</h1>
        {currentUser.nickname && <p className="text-[var(--muted-fg)]">@{currentUser.nickname}</p>}
        {dept && <p className="text-sm text-[var(--muted-fg)] mt-1">🏢 {dept.name}</p>}

        <div className="flex items-center justify-center gap-3 mt-4">
          <TierBadge tier={currentUser.tier} showSublabel size="lg" />
          <span className="badge bg-[var(--muted)] text-[var(--muted-fg)]">#{rank} toàn công ty</span>
        </div>

        {currentUser.bio && <p className="mt-3 text-sm text-[var(--muted-fg)] italic">&quot;{currentUser.bio}&quot;</p>}
      </motion.div>

      {/* Stats Grid */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className="card p-4 text-center">
            <div className="flex justify-center mb-2 text-[var(--primary)]">{stat.icon}</div>
            <p className="text-2xl font-bold font-mono">{stat.value}</p>
            <p className="text-xs text-[var(--muted-fg)]">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Tier Card */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="gradient-vnpay rounded-2xl p-5 text-white">
        <h3 className="font-semibold mb-3">🏅 Hạng thi đấu</h3>
        <div className="flex items-end gap-4">
          <div>
            <TierBadge tier={currentUser.tier} size="lg" showSublabel />
            <p className="text-white/70 text-sm mt-2">Xếp hạng #{rank}</p>
          </div>
          <div className="flex-1">
            {currentUser.win_streak > 0 && <p className="text-sm">🔥 {currentUser.win_streak} thắng liên tiếp</p>}
            <p className="text-sm text-white/70">📊 {currentUser.total_matches} trận đã đấu</p>
          </div>
        </div>
      </motion.div>

      {/* Info Details — with Edit */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">📋 Thông tin</h3>
          {!isEditing ? (
            <button onClick={startEdit} className="btn btn-ghost btn-sm flex items-center gap-1.5 text-[var(--primary)]">
              <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button onClick={() => setIsEditing(false)} className="btn btn-ghost btn-sm flex items-center gap-1" disabled={isSaving}>
                <X className="w-3.5 h-3.5" /> Hủy
              </button>
              <button onClick={handleSave} className="btn btn-gradient btn-sm flex items-center gap-1" disabled={isSaving}>
                <Save className="w-3.5 h-3.5" /> {isSaving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!isEditing ? (
            /* ── Read-only view ── */
            <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-fg)]">Email</span>
                <span className="font-medium">{currentUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-fg)]">Nickname</span>
                <span>{currentUser.nickname || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-fg)]">Tay thuận</span>
                <span>{handLabels[currentUser.hand_preference] || '🫱 Phải'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-fg)]">Vị trí</span>
                <span>{posLabels[currentUser.position_preference] || '🔀 Linh hoạt'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-fg)]">Kinh nghiệm</span>
                <span>{experienceLabels[currentUser.experience] || currentUser.experience}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-fg)]">Giới thiệu</span>
                <span className="text-right max-w-[200px] truncate">{currentUser.bio || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-fg)]">Ngày tham gia</span>
                <span>{new Date(currentUser.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
            </motion.div>
          ) : (
            /* ── Edit form ── */
            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Nickname</label>
                <input className="input" value={editForm.nickname} onChange={e => setEditForm({ ...editForm, nickname: e.target.value })} placeholder="Tên hiển thị" />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1.5 block">Tay thuận</label>
                <div className="flex gap-2">
                  {(['right', 'left'] as const).map(hand => (
                    <button key={hand} type="button" onClick={() => setEditForm({ ...editForm, hand_preference: hand })}
                      className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${editForm.hand_preference === hand ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--border-color)] hover:bg-[var(--muted)]'}`}
                    >
                      {handLabels[hand]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1.5 block">Vị trí ưa thích</label>
                <div className="flex gap-2">
                  {(['forehand', 'backhand', 'flexible'] as const).map(pos => (
                    <button key={pos} type="button" onClick={() => setEditForm({ ...editForm, position_preference: pos })}
                      className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${editForm.position_preference === pos ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--border-color)] hover:bg-[var(--muted)]'}`}
                    >
                      {posLabels[pos]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Kinh nghiệm</label>
                <select className="input" value={editForm.experience} onChange={e => setEditForm({ ...editForm, experience: e.target.value as ExperienceLevel })}>
                  {Object.entries(experienceLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Giới thiệu bản thân</label>
                <textarea className="input min-h-[80px] resize-none" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Một vài dòng về bạn..." maxLength={200} />
                <p className="text-xs text-[var(--muted-fg)] mt-1 text-right">{editForm.bio.length}/200</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Actions */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="space-y-2">
        <button onClick={handleLogout} className="btn btn-ghost w-full justify-start text-red-500">
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </motion.div>

      {/* Footer */}
      <div className="text-center text-xs text-[var(--muted-fg)] pb-8">
        <p><PickleballIcon size={14} className="inline-block mr-1 -mt-0.5" /> VNPAY Pickle v1.0.0</p>
        <p className="mt-1">Developed by nmhieu301 | © 2024-2026</p>
      </div>
    </div>
  );
}
