'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTournamentStore } from '@/lib/tournamentStore';
import { useAppStore } from '@/lib/store';
import { BracketTree } from '@/components/tournament/BracketTree';
import { PoolTable } from '@/components/tournament/PoolTable';
import { MatchCard } from '@/components/tournament/MatchCard';
import { ScoreInput } from '@/components/tournament/ScoreInput';
import { TournamentMatch, TournamentEvent } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  mens_doubles: '👨‍👨 Đôi Nam', womens_doubles: '👩‍👩 Đôi Nữ',
  mixed_doubles: '👫 Hỗn hợp', mens_singles: '👨 Đơn Nam',
  womens_singles: '👩 Đơn Nữ', open_doubles: '🤝 Open',
};

export default function BracketPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAppStore(s => s.currentUser);
  const currentTournament = useTournamentStore(s => s.currentTournament);
  const currentEvents = useTournamentStore(s => s.currentEvents);
  const teamsMap = useTournamentStore(s => s.teamsMap);
  const matchesMap = useTournamentStore(s => s.matchesMap);
  const standingsMap = useTournamentStore(s => s.standingsMap);
  const loadTournament = useTournamentStore(s => s.loadTournament);
  const loadEventDetail = useTournamentStore(s => s.loadEventDetail);
  const isLoading = useTournamentStore(s => s.isLoading);

  const [selectedEvent, setSelectedEvent] = useState<TournamentEvent | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [view, setView] = useState<'bracket' | 'pools' | 'all'>('bracket');

  const isOrganizer = currentUser?.id === currentTournament?.organizer_id || currentUser?.role === 'admin';

  useEffect(() => {
    if (id && !currentTournament) loadTournament(id);
  }, [id]);

  useEffect(() => {
    if (currentEvents.length > 0 && !selectedEvent) {
      setSelectedEvent(currentEvents[0]);
    }
  }, [currentEvents]);

  useEffect(() => {
    if (selectedEvent && !teamsMap[selectedEvent.id]) {
      loadEventDetail(selectedEvent.id);
    }
  }, [selectedEvent]);

  const teams = selectedEvent ? (teamsMap[selectedEvent.id] || []) : [];
  const matches = selectedEvent ? (matchesMap[selectedEvent.id] || []) : [];
  const standings = selectedEvent ? (standingsMap[selectedEvent.id] || []) : [];
  const tournament = currentTournament;

  const poolMatches = matches.filter(m => m.round_type === 'pool');
  const elimMatches = matches.filter(m => m.round_type !== 'pool');

  // Group pool standings by pool letter
  const poolLetters = [...new Set(standings.map(s => s.pool_letter).filter(Boolean))].sort();

  if (!tournament) return <div className="skeleton h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/tournaments/${id}`} className="text-[var(--muted-fg)] hover:text-[var(--fg)] text-sm">← Quay lại</Link>
        <h1 className="text-xl font-bold">🔲 Bracket</h1>
      </div>

      {/* Event selector */}
      {currentEvents.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {currentEvents.map(ev => (
            <button key={ev.id} onClick={() => setSelectedEvent(ev)} className={`btn btn-sm ${selectedEvent?.id === ev.id ? 'btn-primary' : 'btn-ghost'}`}>
              {CATEGORY_LABELS[ev.category] || ev.category}
            </button>
          ))}
        </div>
      )}

      {selectedEvent && (
        <>
          {/* View switcher */}
          <div className="flex gap-1">
            {['bracket','pools'].map(v => (
              <button key={v} onClick={() => setView(v as typeof view)} className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-ghost'}`}>
                {v === 'bracket' ? '🔲 Bracket' : '📊 Bảng đấu'}
              </button>
            ))}
          </div>

          {view === 'bracket' && (
            <div className="card p-4">
              <BracketTree
                matches={elimMatches.length > 0 ? elimMatches : matches}
                teams={teams}
                onSelectMatch={m => setSelectedMatch(m)}
              />
            </div>
          )}

          {view === 'pools' && (
            <div className="space-y-4">
              {poolLetters.length > 0 ? poolLetters.map(pool => (
                <PoolTable
                  key={pool}
                  standings={standings.filter(s => s.pool_letter === pool)}
                  teams={teams}
                  advanceCount={selectedEvent.teams_advance_per_pool}
                  poolLetter={pool || undefined}
                />
              )) : (
                <div>
                  <PoolTable standings={standings} teams={teams} advanceCount={0} />
                  <div className="mt-4 space-y-3">
                    {poolMatches.map(m => (
                      <MatchCard key={m.id} match={m} teams={teams} onClick={() => setSelectedMatch(m)} compact />
                    ))}
                  </div>
                </div>
              )}
              {/* Pool matches grouped */}
              {poolLetters.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Danh sách trận vòng bảng</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {poolMatches.map(m => (
                      <MatchCard key={m.id} match={m} teams={teams} onClick={() => setSelectedMatch(m)} compact />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Score input modal */}
      {selectedMatch && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedMatch(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Kết quả trận đấu</h3>
                <button onClick={() => setSelectedMatch(null)} className="btn btn-ghost btn-icon text-xl">✕</button>
              </div>
              {isOrganizer && selectedMatch.status !== 'completed' ? (
                <ScoreInput
                  match={selectedMatch}
                  teams={teams}
                  setsFormat={tournament.sets_format}
                  pointsTarget={tournament.points_target}
                  onClose={() => setSelectedMatch(null)}
                />
              ) : (
                <MatchCard match={selectedMatch} teams={teams} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
