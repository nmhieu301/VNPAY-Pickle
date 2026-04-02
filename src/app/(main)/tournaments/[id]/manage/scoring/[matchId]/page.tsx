'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — Live Scoring Match Page
// /tournaments/:id/manage/scoring/:matchId
// Full-screen mobile scoring interface
// ═══════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useTournamentStore } from '@/lib/tournamentStore';
import { useAppStore } from '@/lib/store';
import { useTournamentCommittee } from '@/hooks/useTournamentCommittee';
import { LiveScoringPanel } from '@/components/tournament/LiveScoringPanel';

export default function LiveScoringMatchPage() {
  const { id, matchId } = useParams<{ id: string; matchId: string }>();
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);
  const tournament = useTournamentStore(s => s.currentTournament);
  const events = useTournamentStore(s => s.currentEvents);
  const teamsMap = useTournamentStore(s => s.teamsMap);
  const matchesMap = useTournamentStore(s => s.matchesMap);
  const loadTournament = useTournamentStore(s => s.loadTournament);
  const loadEventDetail = useTournamentStore(s => s.loadEventDetail);

  const { isCommittee, isDirector } = useTournamentCommittee(id, currentUser?.id ?? null);

  useEffect(() => { if (id && !tournament) loadTournament(id); }, [id]);

  // Load all events detail to find the match
  useEffect(() => {
    if (events.length > 0) {
      events.forEach(ev => {
        if (!teamsMap[ev.id]) loadEventDetail(ev.id);
      });
    }
  }, [events]);

  if (!tournament || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  const hasAccess = currentUser.role === 'admin'
    || tournament.organizer_id === currentUser.id
    || isCommittee;

  if (!hasAccess) {
    router.push(`/tournaments/${id}`);
    return null;
  }

  // Find the match across all events
  let match = null;
  let teams: ReturnType<typeof Object.values<(typeof teamsMap)[string]>>[0] = [];

  for (const [eventId, eventMatches] of Object.entries(matchesMap)) {
    const found = eventMatches.find(m => m.id === matchId);
    if (found) {
      match = found;
      teams = teamsMap[eventId] ?? [];
      break;
    }
  }

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--muted-fg)]">
        <div className="text-center">
          <p className="text-lg mb-2">Không tìm thấy trận đấu</p>
          <button onClick={() => router.back()} className="btn btn-ghost btn-sm">← Quay lại</button>
        </div>
      </div>
    );
  }

  return (
    <LiveScoringPanel
      match={match}
      teams={teams}
      tournament={tournament}
      currentUserId={currentUser.id}
      isDirector={isDirector}
      onMatchEnd={() => {
        setTimeout(() => router.push(`/tournaments/${id}/manage/scoring`), 3000);
      }}
    />
  );
}
