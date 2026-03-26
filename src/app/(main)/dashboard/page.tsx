'use client';

import { useAppStore } from '@/lib/store';
import { SessionCard } from '@/components/session/SessionCard';
import { PickleballIcon } from '@/components/icons/PickleballIcon';
import { TierBadge } from '@/components/player/TierBadge';
import { motion } from 'framer-motion';
import { Plus, Gamepad2, Trophy, BarChart3, TrendingUp, Zap, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const currentUser = useAppStore(s => s.currentUser);
  const sessions = useAppStore(s => s.sessions);
  const players = useAppStore(s => s.players);

  if (!currentUser) return null;

  const upcomingSessions = sessions
    .filter(s => s.status === 'open')
    .slice(0, 3);

  const winRate = currentUser.total_matches > 0
    ? Math.round((currentUser.total_wins / currentUser.total_matches) * 100)
    : 0;

  const rank = [...players]
    .sort((a, b) => b.elo_rating - a.elo_rating)
    .findIndex(p => p.id === currentUser.id) + 1;

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="gradient-vnpay rounded-2xl p-6 text-white relative overflow-hidden"
      >
        <div className="absolute top-2 right-2 opacity-20 leading-none select-none">
          <img
            src="/logo.png"
            alt=""
            className="w-32 h-32 object-contain"
            style={{ filter: 'drop-shadow(0 4px 16px rgba(255, 255, 255, 0.2))' }}
          />
        </div>
        <div className="relative z-10">
          <p className="text-white/80 text-sm">{(() => {
            const h = new Date().getHours();
            if (h < 12) return 'Chào buổi sáng! ☀️';
            if (h < 13) return 'Chào buổi trưa! 🌤️';
            if (h < 18) return 'Chào buổi chiều! 🌅';
            return 'Chào buổi tối! 🌙';
          })()}</p>
          <h1 className="text-2xl font-display font-bold mt-1">
            {(() => {
              const username = currentUser.email.split('@')[0];
              return username.charAt(0).toUpperCase() + username.slice(1);
            })()}
          </h1>
          <div className="flex items-center gap-3 mt-3">
            <TierBadge elo={currentUser.elo_rating} showElo size="md" />
            {currentUser.win_streak > 0 && (
              <span className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                🔥 {currentUser.win_streak} thắng liên tiếp
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {[
          { icon: <Zap className="w-5 h-5" style={{ color: '#005BAA' }} />, value: currentUser.elo_rating, label: 'ELO Rating', fontClass: 'font-mono' },
          { icon: <BarChart3 className="w-5 h-5" style={{ color: '#00A651' }} />, value: `#${rank}`, label: 'Xếp hạng', fontClass: 'font-mono' },
          { icon: <Gamepad2 className="w-5 h-5" style={{ color: '#FF6B35' }} />, value: currentUser.total_matches, label: 'Tổng trận', fontClass: 'font-mono' },
          { icon: <TrendingUp className="w-5 h-5" style={{ color: '#9B59B6' }} />, value: `${winRate}%`, label: 'Tỷ lệ thắng', fontClass: 'font-mono' },
        ].map((stat, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              {stat.icon}
              <span className="text-xs text-[var(--muted-fg)]">{stat.label}</span>
            </div>
            <p className={`text-2xl font-bold ${stat.fontClass}`}>{stat.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-3"
      >
        <Link href="/sessions/new" className="card p-4 flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Plus className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-sm group-hover:text-[var(--primary)] transition-colors">Tạo lịch thi đấu</p>
            <p className="text-xs text-[var(--muted-fg)]">Tạo buổi chơi mới</p>
          </div>
        </Link>
        <Link href="/sessions" className="card p-4 flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-sm group-hover:text-[var(--primary)] transition-colors">Tham gia chơi</p>
            <p className="text-xs text-[var(--muted-fg)]">Xem phiên mở</p>
          </div>
        </Link>
        <Link href="/rankings" className="card p-4 flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-sm group-hover:text-[var(--primary)] transition-colors">Bảng xếp hạng</p>
            <p className="text-xs text-[var(--muted-fg)]">Xem top player</p>
          </div>
        </Link>
      </motion.div>

      {/* Upcoming Sessions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold"><PickleballIcon size={22} className="inline-block mr-1 -mt-0.5" /> Lịch thi đấu sắp tới</h2>
          <Link href="/sessions" className="text-sm text-[var(--primary)] hover:underline">
            Xem tất cả →
          </Link>
        </div>
        {upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            {upcomingSessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <span className="block mb-3"><PickleballIcon size={48} className="mx-auto" /></span>
            <p className="font-medium">Chưa có lịch thi đấu nào</p>
            <p className="text-sm text-[var(--muted-fg)] mt-1">Hãy tạo lịch thi đấu đầu tiên!</p>
            <Link href="/sessions/new" className="btn btn-gradient mt-4">
              <Plus className="w-4 h-4" /> Tạo lịch thi đấu
            </Link>
          </div>
        )}
      </motion.div>

      {/* Top Players Preview */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">🏅 Top Player</h2>
          <Link href="/rankings" className="text-sm text-[var(--primary)] hover:underline">
            Xem tất cả →
          </Link>
        </div>
        <div className="card divide-y divide-[var(--border-color)]">
          {[...players]
            .sort((a, b) => b.elo_rating - a.elo_rating)
            .slice(0, 5)
            .map((player, i) => (
              <div key={player.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-7 text-center font-bold font-mono ${
                  i === 0 ? 'text-yellow-500 text-lg' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-[var(--muted-fg)]'
                }`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-sm font-bold">
                  {player.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{player.nickname || player.full_name}</p>
                </div>
                <span className="font-mono text-sm font-bold">{player.elo_rating}</span>
                <TierBadge elo={player.elo_rating} size="sm" showLabel={false} />
              </div>
            ))}
        </div>
      </motion.div>
    </div>
  );
}
