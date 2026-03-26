'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useGroupStore } from '@/lib/groupStore';
import { motion } from 'framer-motion';
import { Plus, Users2, Search, Globe, Lock } from 'lucide-react';
import Link from 'next/link';
import { PickleballIcon } from '@/components/icons/PickleballIcon';

type TabType = 'my' | 'discover';

export default function GroupsPage() {
  const currentUser = useAppStore(s => s.currentUser);
  const { myGroups, discoverGroups, fetchMyGroups, fetchDiscoverGroups } = useGroupStore();
  const [tab, setTab] = useState<TabType>('my');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchMyGroups(currentUser.id);
      fetchDiscoverGroups(currentUser.id);
    }
  }, [currentUser, fetchMyGroups, fetchDiscoverGroups]);

  const groups = tab === 'my' ? myGroups : discoverGroups;
  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            <Users2 className="w-6 h-6 inline-block mr-1 -mt-0.5" /> Nhóm chơi
          </h1>
          <p className="text-sm text-[var(--muted-fg)]">{myGroups.length} nhóm của tôi</p>
        </div>
        <div className="flex gap-2">
          <Link href="/groups/join" className="btn btn-secondary">
            🔑 Nhập code
          </Link>
          <Link href="/groups/new" className="btn btn-gradient">
            <Plus className="w-4 h-4" /> Tạo nhóm
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {([
          { key: 'my' as const, label: 'Nhóm của tôi', icon: <Lock className="w-3.5 h-3.5" /> },
          { key: 'discover' as const, label: 'Khám phá', icon: <Globe className="w-3.5 h-3.5" /> },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`badge text-sm cursor-pointer transition-colors flex items-center gap-1 ${
              tab === t.key
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--muted)] text-[var(--muted-fg)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm nhóm..."
          className="input pl-9"
        />
      </div>

      {/* Groups Grid */}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.length > 0 ? (
          filtered.map((group, i) => (
            <motion.div
              key={group.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/groups/${group.id}`} className="card p-4 block group hover:ring-1 hover:ring-[var(--primary)] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {group.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate group-hover:text-[var(--primary)] transition-colors">{group.name}</h3>
                    {group.description && (
                      <p className="text-xs text-[var(--muted-fg)] truncate mt-0.5">{group.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--muted-fg)]">
                      <span className="flex items-center gap-1">
                        <Users2 className="w-3 h-3" /> {group.member_count}/{group.max_members}
                      </span>
                      <span className="flex items-center gap-1">
                        {group.privacy === 'private' ? <Lock className="w-3 h-3" /> : '👁️‍🗨️'}
                        {group.privacy === 'private' ? 'Kín' : 'Ẩn'}
                      </span>
                      {group.enable_group_elo && (
                        <span className="text-green-500 font-medium">ELO riêng</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        ) : (
          <div className="card p-8 text-center col-span-2">
            <span className="block mb-3"><PickleballIcon size={48} className="mx-auto" /></span>
            <p className="font-medium">
              {tab === 'my' ? 'Bạn chưa tham gia nhóm nào' : 'Không tìm thấy nhóm nào'}
            </p>
            <p className="text-sm text-[var(--muted-fg)] mt-1">
              {tab === 'my' ? 'Tạo nhóm mới hoặc nhập mã mời!' : 'Hãy thử tìm kiếm với từ khoá khác'}
            </p>
            {tab === 'my' && (
              <Link href="/groups/new" className="btn btn-gradient mt-4">
                <Plus className="w-4 h-4" /> Tạo nhóm
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
