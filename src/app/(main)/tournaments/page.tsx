'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTournamentStore } from '@/lib/tournamentStore';
import { useAppStore } from '@/lib/store';
import { TournamentCard } from '@/components/tournament/TournamentCard';
import { Plus, Search, Filter, Trophy } from 'lucide-react';

export default function TournamentsPage() {
  const currentUser = useAppStore(s => s.currentUser);
  const venues = useAppStore(s => s.venues);
  const tournaments = useTournamentStore(s => s.tournaments);
  const fetchTournamentList = useTournamentStore(s => s.fetchTournamentList);
  const isLoading = useTournamentStore(s => s.isLoading);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'registration' | 'in_progress' | 'completed'>('all');

  useEffect(() => { fetchTournamentList(); }, []);

  const getVenueName = (venueId: string | null) => venues.find(v => v.id === venueId)?.name;

  const company = tournaments.filter(t => t.type === 'company' && (t.status === 'registration' || t.status === 'in_progress'));
  const filtered = tournaments.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || t.status === filter;
    return matchSearch && matchFilter;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6">
      {/* Company tournament banner */}
      {company.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--muted-fg)] uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" /> Giải Công ty Đang Diễn Ra
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {company.map(t => (
              <TournamentCard key={t.id} tournament={t} venueName={getVenueName(t.venue_id)} />
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🏆 Giải đấu</h1>
        <Link href="/tournaments/new" className="btn btn-gradient flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> Tạo giải
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm giải..." className="input pl-9" />
        </div>
        <div className="flex gap-1.5">
          {[['all','Tất cả'],['registration','Đăng ký'],['in_progress','Đang đấu'],['completed','Kết thúc']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val as typeof filter)} className={`btn btn-sm text-xs ${filter === val ? 'btn-primary' : 'btn-ghost'}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="h-40 skeleton" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-5 rounded w-3/4" />
                <div className="skeleton h-4 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <TournamentCard key={t.id} tournament={t} venueName={getVenueName(t.venue_id)} />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <span className="text-6xl block mb-4">🏆</span>
          <h2 className="text-lg font-bold mb-2">{search ? 'Không tìm thấy giải' : 'Chưa có giải nào'}</h2>
          <p className="text-[var(--muted-fg)] text-sm mb-6">
            {search ? 'Thử từ khóa khác' : 'Hãy tạo giải đấu đầu tiên!'}
          </p>
          {!search && (
            <Link href="/tournaments/new" className="btn btn-gradient inline-flex">
              <Plus className="w-4 h-4 mr-1.5" /> Tạo giải đấu
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
