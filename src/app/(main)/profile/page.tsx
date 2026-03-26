'use client';

import { useAppStore } from '@/lib/store';
import { TierBadge } from '@/components/player/TierBadge';
import { motion } from 'framer-motion';
import { PickleballIcon } from '@/components/icons/PickleballIcon';
import { LogOut, Settings, Shield, Gamepad2, Trophy, TrendingUp, Calendar, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, logout, departments, players } = useAppStore();

  if (!currentUser) return null;

  const dept = departments.find(d => d.id === currentUser.department_id);
  const winRate = currentUser.total_matches > 0
    ? Math.round((currentUser.total_wins / currentUser.total_matches) * 100)
    : 0;
  const rank = [...players]
    .sort((a, b) => b.elo_rating - a.elo_rating)
    .findIndex(p => p.id === currentUser.id) + 1;

  const handleLogout = () => {
    logout();
    router.push('/');
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="card p-6 text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
          {currentUser.full_name.charAt(0)}
        </div>
        <h1 className="text-xl font-bold">{currentUser.full_name}</h1>
        {currentUser.nickname && (
          <p className="text-[var(--muted-fg)]">@{currentUser.nickname}</p>
        )}
        {dept && (
          <p className="text-sm text-[var(--muted-fg)] mt-1">🏢 {dept.name}</p>
        )}

        <div className="flex items-center justify-center gap-3 mt-4">
          <TierBadge elo={currentUser.elo_rating} showElo size="lg" />
          <span className="badge bg-[var(--muted)] text-[var(--muted-fg)]">
            #{rank} toàn công ty
          </span>
        </div>

        {currentUser.bio && (
          <p className="mt-3 text-sm text-[var(--muted-fg)] italic">&quot;{currentUser.bio}&quot;</p>
        )}
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {stats.map((stat, i) => (
          <div key={i} className="card p-4 text-center">
            <div className="flex justify-center mb-2 text-[var(--primary)]">{stat.icon}</div>
            <p className="text-2xl font-bold font-mono">{stat.value}</p>
            <p className="text-xs text-[var(--muted-fg)]">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* ELO Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="gradient-vnpay rounded-2xl p-5 text-white"
      >
        <h3 className="font-semibold mb-3">⚡ ELO Rating</h3>
        <div className="flex items-end gap-4">
          <div>
            <p className="text-4xl font-mono font-bold">{currentUser.elo_rating}</p>
            <p className="text-white/70 text-sm mt-1">Xếp hạng #{rank}</p>
          </div>
          <div className="flex-1">
            {currentUser.win_streak > 0 && (
              <p className="text-sm">🔥 {currentUser.win_streak} thắng liên tiếp</p>
            )}
            <p className="text-sm text-white/70">
              {currentUser.total_matches < 10
                ? `📍 Placement: ${currentUser.total_matches}/10 trận`
                : `📊 ${currentUser.total_matches} trận đã đấu`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Info Details */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="card p-5"
      >
        <h3 className="font-semibold mb-3">📋 Thông tin</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted-fg)]">Email</span>
            <span className="font-medium">{currentUser.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-fg)]">Tay thuận</span>
            <span>{currentUser.hand_preference === 'right' ? '🫱 Phải' : '🫲 Trái'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-fg)]">Vị trí</span>
            <span>{currentUser.position_preference === 'forehand' ? '🎯 Forehand' : currentUser.position_preference === 'backhand' ? '🔄 Backhand' : '🔀 Linh hoạt'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-fg)]">Kinh nghiệm</span>
            <span>{experienceLabels[currentUser.experience] || currentUser.experience}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-fg)]">Ngày tham gia</span>
            <span>{new Date(currentUser.created_at).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="space-y-2"
      >
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
