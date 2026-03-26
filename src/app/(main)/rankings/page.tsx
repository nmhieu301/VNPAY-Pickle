'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { TierBadge } from '@/components/player/TierBadge';
import { motion } from 'framer-motion';
import { Search, ChevronUp, ChevronDown, Minus, Filter } from 'lucide-react';

type FilterTab = 'all' | 'department';

export default function RankingsPage() {
  const { players, departments } = useAppStore();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [deptFilter, setDeptFilter] = useState('');

  const sortedPlayers = useMemo(() => {
    let filtered = [...players].filter(p => p.is_active);

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.full_name.toLowerCase().includes(q) ||
        (p.nickname && p.nickname.toLowerCase().includes(q)) ||
        p.email.toLowerCase().includes(q)
      );
    }

    if (deptFilter) {
      filtered = filtered.filter(p => p.department_id === deptFilter);
    }

    return filtered.sort((a, b) => b.elo_rating - a.elo_rating);
  }, [players, search, deptFilter]);

  // Department ranking
  const deptRankings = useMemo(() => {
    return departments.map(dept => {
      const deptPlayers = players.filter(p => p.department_id === dept.id && p.is_active);
      const avgElo = deptPlayers.length > 0
        ? Math.round(deptPlayers.reduce((sum, p) => sum + p.elo_rating, 0) / deptPlayers.length)
        : 0;
      const totalMatches = deptPlayers.reduce((sum, p) => sum + p.total_matches, 0);
      const totalWins = deptPlayers.reduce((sum, p) => sum + p.total_wins, 0);
      const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
      return { ...dept, playerCount: deptPlayers.length, avgElo, totalMatches, winRate };
    }).filter(d => d.playerCount > 0).sort((a, b) => b.avgElo - a.avgElo);
  }, [departments, players]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">🏅 Bảng xếp hạng</h1>
        <p className="text-sm text-[var(--muted-fg)]">VNPAY Pickleball Rankings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setTab('all'); setDeptFilter(''); }}
          className={`badge text-sm cursor-pointer ${tab === 'all' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-fg)]'}`}
        >
          🏅 Cá nhân
        </button>
        <button
          onClick={() => setTab('department')}
          className={`badge text-sm cursor-pointer ${tab === 'department' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-fg)]'}`}
        >
          🏢 Phòng ban
        </button>
      </div>

      {/* Individual Ranking */}
      {tab === 'all' && (
        <>
          {/* Search + Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm người chơi..."
                className="input pl-10"
              />
            </div>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">Tất cả phòng ban</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Leaderboard */}
          <div className="card overflow-hidden">
            {/* Header */}
            <div className="hidden md:grid grid-cols-[3rem_1fr_8rem_5rem_5rem_4rem_5rem] gap-2 px-4 py-2 bg-[var(--muted)] text-xs font-semibold text-[var(--muted-fg)] uppercase">
              <span>#</span>
              <span>Player</span>
              <span>Phòng ban</span>
              <span className="text-center">ELO</span>
              <span className="text-center">Tier</span>
              <span className="text-center">Trận</span>
              <span className="text-center">Win%</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-[var(--border-color)]">
              {sortedPlayers.map((player, i) => {
                const rank = i + 1;
                const dept = departments.find(d => d.id === player.department_id);
                const winRate = player.total_matches > 0
                  ? Math.round((player.total_wins / player.total_matches) * 100)
                  : 0;

                return (
                  <motion.div
                    key={player.id}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="grid grid-cols-[3rem_1fr_auto] md:grid-cols-[3rem_1fr_8rem_5rem_5rem_4rem_5rem] gap-2 px-4 py-3 items-center hover:bg-[var(--muted)] transition-colors"
                  >
                    {/* Rank */}
                    <span className={`text-center font-bold font-mono ${
                      rank === 1 ? 'text-yellow-500 text-lg' :
                      rank === 2 ? 'text-gray-400 text-lg' :
                      rank === 3 ? 'text-orange-400 text-lg' :
                      'text-[var(--muted-fg)]'
                    }`}>
                      {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                    </span>

                    {/* Player */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {player.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{player.nickname || player.full_name}</p>
                        <p className="text-xs text-[var(--muted-fg)] truncate md:hidden">{dept?.name || ''}</p>
                      </div>
                    </div>

                    {/* Mobile: ELO + Tier */}
                    <div className="flex items-center gap-2 md:hidden">
                      <span className="font-mono font-bold text-sm">{player.elo_rating}</span>
                      <TierBadge elo={player.elo_rating} size="sm" showLabel={false} />
                    </div>

                    {/* Desktop columns */}
                    <span className="text-sm text-[var(--muted-fg)] hidden md:block truncate">{dept?.name || '-'}</span>
                    <span className="font-mono font-bold text-sm text-center hidden md:block">{player.elo_rating}</span>
                    <span className="text-center hidden md:flex justify-center"><TierBadge elo={player.elo_rating} size="sm" /></span>
                    <span className="text-sm text-center hidden md:block">{player.total_matches}</span>
                    <span className="text-sm text-center hidden md:block font-mono" style={{ color: winRate >= 60 ? '#22C55E' : winRate >= 40 ? 'inherit' : '#EF4444' }}>
                      {winRate}%
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Department Ranking */}
      {tab === 'department' && (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[3rem_1fr_5rem_5rem_5rem_5rem] gap-2 px-4 py-2 bg-[var(--muted)] text-xs font-semibold text-[var(--muted-fg)] uppercase">
            <span>#</span>
            <span>Phòng ban</span>
            <span className="text-center">Người chơi</span>
            <span className="text-center">ELO TB</span>
            <span className="text-center">Trận</span>
            <span className="text-center">Win%</span>
          </div>

          <div className="divide-y divide-[var(--border-color)]">
            {deptRankings.map((dept, i) => (
              <motion.div
                key={dept.id}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-[3rem_1fr_auto] md:grid-cols-[3rem_1fr_5rem_5rem_5rem_5rem] gap-2 px-4 py-3 items-center hover:bg-[var(--muted)] transition-colors cursor-pointer"
                onClick={() => { setTab('all'); setDeptFilter(dept.id); }}
              >
                <span className={`text-center font-bold font-mono ${
                  i === 0 ? 'text-yellow-500 text-lg' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-[var(--muted-fg)]'
                }`}>
                  {i <= 2 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                </span>

                <div>
                  <p className="font-medium text-sm">🏢 {dept.name}</p>
                  <p className="text-xs text-[var(--muted-fg)] md:hidden">{dept.playerCount} người · ELO {dept.avgElo}</p>
                </div>

                <div className="flex items-center gap-2 md:hidden">
                  <span className="font-mono font-bold text-sm">{dept.winRate}%</span>
                </div>

                <span className="text-sm text-center hidden md:block">{dept.playerCount}</span>
                <span className="font-mono font-bold text-sm text-center hidden md:block">{dept.avgElo}</span>
                <span className="text-sm text-center hidden md:block">{dept.totalMatches}</span>
                <span className="text-sm text-center hidden md:block font-mono" style={{ color: dept.winRate >= 55 ? '#22C55E' : '#inherit' }}>
                  {dept.winRate}%
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
