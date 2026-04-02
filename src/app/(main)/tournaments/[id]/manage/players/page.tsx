'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — Manage Players Page
// /tournaments/:id/manage/players
// ═══════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useTournamentStore } from '@/lib/tournamentStore';
import { useAppStore } from '@/lib/store';
import { useTournamentCommittee } from '@/hooks/useTournamentCommittee';
import { PlayerManager } from '@/components/tournament/PlayerManager';
import type { TournamentEvent } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  mens_doubles: '👨‍👨 Đôi Nam', womens_doubles: '👩‍👩 Đôi Nữ',
  mixed_doubles: '👫 Hỗn hợp', mens_singles: '👨 Đơn Nam',
  womens_singles: '👩 Đơn Nữ', open_doubles: '🤝 Open',
};

export default function ManagePlayersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);
  const tournament = useTournamentStore(s => s.currentTournament);
  const events = useTournamentStore(s => s.currentEvents);
  const teamsMap = useTournamentStore(s => s.teamsMap);
  const loadTournament = useTournamentStore(s => s.loadTournament);
  const loadEventDetail = useTournamentStore(s => s.loadEventDetail);

  const [selectedEvent, setSelectedEvent] = useState<TournamentEvent | null>(null);
  const { isCommittee } = useTournamentCommittee(id, currentUser?.id ?? null);

  useEffect(() => { if (id && !tournament) loadTournament(id); }, [id]);
  useEffect(() => { if (events.length > 0 && !selectedEvent) setSelectedEvent(events[0]); }, [events]);
  useEffect(() => {
    if (selectedEvent && !teamsMap[selectedEvent.id]) loadEventDetail(selectedEvent.id);
  }, [selectedEvent]);

  const hasAccess = currentUser?.role === 'admin'
    || tournament?.organizer_id === currentUser?.id
    || isCommittee;

  if (tournament && currentUser && !hasAccess) {
    router.push(`/tournaments/${id}`);
    return null;
  }

  if (!tournament || !currentUser) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  const teams = selectedEvent ? (teamsMap[selectedEvent.id] || []) : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link
          href={`/tournaments/${id}/manage`}
          className="flex items-center gap-1.5 text-xs text-[var(--muted-fg)] hover:text-[var(--fg)] w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại Quản lý
        </Link>
        <h1 className="text-xl font-bold mt-2">👥 Quản lý VĐV — {tournament.name}</h1>
      </div>

      {/* Event selector */}
      {events.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {events.map(ev => (
            <button
              key={ev.id}
              onClick={() => setSelectedEvent(ev)}
              className={`btn btn-sm ${selectedEvent?.id === ev.id ? 'btn-primary' : 'btn-ghost'}`}
            >
              {CATEGORY_LABELS[ev.category] || ev.category}
            </button>
          ))}
        </div>
      )}

      {selectedEvent ? (
        <PlayerManager
          event={selectedEvent}
          teams={teams}
          currentUserId={currentUser.id}
          tournamentId={id}
          onRefresh={() => loadEventDetail(selectedEvent.id)}
        />
      ) : (
        <div className="text-center py-12 text-[var(--muted-fg)]">
          <p>Chưa có nội dung thi đấu nào.</p>
        </div>
      )}
    </div>
  );
}
