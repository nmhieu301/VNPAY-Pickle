'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTournamentStore } from '@/lib/tournamentStore';
import { LiveScoreBoard } from '@/components/tournament/LiveScoreBoard';

export default function LivePage() {
  const { id } = useParams<{ id: string }>();
  const tournament = useTournamentStore(s => s.currentTournament);
  const currentEvents = useTournamentStore(s => s.currentEvents);
  const teamsMap = useTournamentStore(s => s.teamsMap);
  const loadTournament = useTournamentStore(s => s.loadTournament);
  const loadEventDetail = useTournamentStore(s => s.loadEventDetail);

  useEffect(() => { if (id && !tournament) loadTournament(id); }, [id]);
  useEffect(() => {
    for (const ev of currentEvents) {
      if (!teamsMap[ev.id]) loadEventDetail(ev.id);
    }
  }, [currentEvents]);

  // Merge all teams from all events
  const allTeams = Object.values(teamsMap).flat();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/tournaments/${id}`} className="text-[var(--muted-fg)] hover:text-[var(--fg)] text-sm">← Quay lại</Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
          Live Score
        </h1>
        {tournament && <span className="text-sm text-[var(--muted-fg)]">{tournament.name}</span>}
      </div>
      <LiveScoreBoard tournamentId={id} teams={allTeams} />
    </div>
  );
}
