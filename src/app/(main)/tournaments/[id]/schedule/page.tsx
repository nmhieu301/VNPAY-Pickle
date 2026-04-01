'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTournamentStore } from '@/lib/tournamentStore';
import { useAppStore } from '@/lib/store';
import { MatchCard } from '@/components/tournament/MatchCard';

const CATEGORY_LABELS: Record<string, string> = {
  mens_doubles: '👨‍👨 Đôi Nam', womens_doubles: '👩‍👩 Đôi Nữ',
  mixed_doubles: '👫 Hỗn hợp', mens_singles: '👨 Đơn Nam',
  womens_singles: '👩 Đơn Nữ', open_doubles: '🤝 Open',
};

export default function SchedulePage() {
  const { id } = useParams<{ id: string }>();
  const tournament = useTournamentStore(s => s.currentTournament);
  const events = useTournamentStore(s => s.currentEvents);
  const teamsMap = useTournamentStore(s => s.teamsMap);
  const matchesMap = useTournamentStore(s => s.matchesMap);
  const loadTournament = useTournamentStore(s => s.loadTournament);
  const loadEventDetail = useTournamentStore(s => s.loadEventDetail);

  const [filterCourt, setFilterCourt] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => { if (id && !tournament) loadTournament(id); }, [id]);
  useEffect(() => {
    for (const ev of events) { if (!matchesMap[ev.id]) loadEventDetail(ev.id); }
  }, [events]);

  const allMatches = events.flatMap(ev => {
    const matches = matchesMap[ev.id] || [];
    return matches.map(m => ({
      ...m,
      eventCategory: CATEGORY_LABELS[ev.category] || ev.category,
      teams: teamsMap[ev.id] || [],
    }));
  });

  const courts = [...new Set(allMatches.map(m => m.court_number).filter(Boolean))].sort();

  const filtered = allMatches.filter(m => {
    if (filterCourt && m.court_number !== filterCourt) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => {
    if (a.scheduled_time && b.scheduled_time) return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
    if (a.round_number && b.round_number) return a.round_number - b.round_number;
    return 0;
  });

  // Group by date
  const byDate: Record<string, typeof filtered> = {};
  for (const m of filtered) {
    const dateKey = m.scheduled_time ? new Date(m.scheduled_time).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }) : 'Chưa xếp lịch';
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(m);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/tournaments/${id}`} className="text-[var(--muted-fg)] hover:text-[var(--fg)] text-sm">← Quay lại</Link>
        <h1 className="text-xl font-bold">📅 Lịch thi đấu</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {courts.length > 0 && (
          <div className="flex gap-1">
            <button onClick={() => setFilterCourt(null)} className={`btn btn-sm ${!filterCourt ? 'btn-primary' : 'btn-ghost'}`}>Tất cả sân</button>
            {courts.map(c => (
              <button key={c} onClick={() => setFilterCourt(c!)} className={`btn btn-sm ${filterCourt === c ? 'btn-primary' : 'btn-ghost'}`}>Sân {c}</button>
            ))}
          </div>
        )}
        <div className="flex gap-1">
          {[['all','Tất cả'],['scheduled','Chờ đấu'],['live','Live'],['completed','Xong']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)} className={`btn btn-sm ${filterStatus === val ? 'btn-primary' : 'btn-ghost'}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Schedule */}
      {Object.entries(byDate).map(([date, matches]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-[var(--muted-fg)] mb-3 flex items-center gap-2">
            <span className="w-full h-px bg-[var(--border-color)]" />
            <span className="whitespace-nowrap">{date}</span>
            <span className="w-full h-px bg-[var(--border-color)]" />
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {matches.map(m => (
              <div key={m.id} className="space-y-1">
                <p className="text-xs text-[var(--muted-fg)] pl-1">{m.eventCategory}</p>
                <MatchCard match={m} teams={m.teams} compact />
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-[var(--muted-fg)]">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm">Chưa có lịch thi đấu</p>
        </div>
      )}
    </div>
  );
}
