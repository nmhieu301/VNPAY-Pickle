'use client';

import { useAppStore } from '@/lib/store';
import { SessionCard } from '@/components/session/SessionCard';
import { Plus, Filter } from 'lucide-react';
import { PickleballIcon } from '@/components/icons/PickleballIcon';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';

type FilterType = 'all' | 'today' | 'week' | 'mine';

const PAGE_SIZE = 20;

export default function SessionsPage() {
  const sessions = useAppStore(s => s.sessions);
  const currentUser = useAppStore(s => s.currentUser);
  const sessionPlayers = useAppStore(s => s.sessionPlayers);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever filter changes
  useEffect(() => { setPage(1); }, [filter]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const filteredSessions = useMemo(() => {
    return sessions
      .filter(s => {
        if (filter === 'today') return s.date === todayStr;
        if (filter === 'mine' && currentUser) {
          const playerSet = new Set(sessionPlayers[s.id] || []);
          return s.host_id === currentUser.id || playerSet.has(currentUser.id);
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status === 'open' && b.status !== 'open') return -1;
        if (a.status !== 'open' && b.status === 'open') return 1;
        // ISO date strings sort correctly as plain strings — no Date() allocation
        return b.date.localeCompare(a.date);
      });
  }, [sessions, filter, currentUser, sessionPlayers, todayStr]);

  const visibleSessions = filteredSessions.slice(0, page * PAGE_SIZE);
  const hasMore = filteredSessions.length > page * PAGE_SIZE;

  const filterOptions: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'today', label: 'Hôm nay' },
    { key: 'mine', label: 'Của tôi' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold"><PickleballIcon size={24} className="inline-block mr-1 -mt-0.5" /> Lịch thi đấu</h1>
          <p className="text-sm text-[var(--muted-fg)]">{filteredSessions.length} lịch thi đấu</p>
        </div>
        <Link href="/sessions/new" className="btn btn-gradient">
          <Plus className="w-4 h-4" /> Tạo mới
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[var(--muted-fg)]" />
        {filterOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`badge text-sm cursor-pointer transition-colors ${
              filter === opt.key
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--muted)] text-[var(--muted-fg)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sessions List — animate list as a whole when filter changes, not per-item */}
      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="space-y-3"
        >
          {visibleSessions.length > 0 ? (
            <>
              {visibleSessions.map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
              {hasMore && (
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="btn btn-secondary w-full"
                >
                  Xem thêm ({filteredSessions.length - visibleSessions.length} lịch)
                </button>
              )}
            </>
          ) : (
            <div className="card p-8 text-center">
              <span className="block mb-3"><PickleballIcon size={48} className="mx-auto" /></span>
              <p className="font-medium">Chưa có lịch thi đấu nào</p>
              <p className="text-sm text-[var(--muted-fg)] mt-1">Tạo lịch thi đấu đầu tiên cho nhóm của bạn!</p>
              <Link href="/sessions/new" className="btn btn-gradient mt-4">
                <Plus className="w-4 h-4" /> Tạo lịch thi đấu
              </Link>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
