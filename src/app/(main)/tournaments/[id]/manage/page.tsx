'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — Tournament Manage Page
// Dashboard điều hành tổng quan (refactored)
// ═══════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings, Users, Calendar, Play as PlayIcon,
  LayoutGrid, Loader2, Shield,
} from 'lucide-react';
import { useTournamentStore } from '@/lib/tournamentStore';
import { useAppStore } from '@/lib/store';
import { useTournamentCommittee } from '@/hooks/useTournamentCommittee';
import { DirectorDashboard } from '@/components/tournament/DirectorDashboard';
import type { TournamentEvent } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  mens_doubles: '👨‍👨 Đôi Nam', womens_doubles: '👩‍👩 Đôi Nữ',
  mixed_doubles: '👫 Hỗn hợp', mens_singles: '👨 Đơn Nam',
  womens_singles: '👩 Đơn Nữ', open_doubles: '🤝 Open',
};

export default function ManagePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);
  const tournament = useTournamentStore(s => s.currentTournament);
  const events = useTournamentStore(s => s.currentEvents);
  const teamsMap = useTournamentStore(s => s.teamsMap);
  const matchesMap = useTournamentStore(s => s.matchesMap);
  const loadTournament = useTournamentStore(s => s.loadTournament);
  const loadEventDetail = useTournamentStore(s => s.loadEventDetail);
  const updateTournamentStatus = useTournamentStore(s => s.updateTournamentStatus);

  const [selectedEvent, setSelectedEvent] = useState<TournamentEvent | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { isCommittee, isDirector, currentRole } = useTournamentCommittee(id, currentUser?.id ?? null);

  useEffect(() => { if (id && !tournament) loadTournament(id); }, [id]);
  useEffect(() => { if (events.length > 0 && !selectedEvent) setSelectedEvent(events[0]); }, [events]);
  useEffect(() => {
    if (selectedEvent && !teamsMap[selectedEvent.id]) loadEventDetail(selectedEvent.id);
  }, [selectedEvent]);

  // Access check: organizer or committee member
  const hasAccess = currentUser?.role === 'admin'
    || tournament?.organizer_id === currentUser?.id
    || isCommittee;

  if (tournament && currentUser && !hasAccess) {
    router.push(`/tournaments/${id}`);
    return null;
  }

  if (!tournament) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  const teams = selectedEvent ? (teamsMap[selectedEvent.id] || []) : [];
  const matches = selectedEvent ? (matchesMap[selectedEvent.id] || []) : [];

  const handleStartTournament = async () => {
    setActionLoading(true);
    await updateTournamentStatus(id, 'in_progress');
    setActionLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href={`/tournaments/${id}`} className="text-xs text-[var(--muted-fg)] hover:text-[var(--fg)]">
            ← Quay lại giải
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2 mt-1">
            <Settings className="w-5 h-5 text-[var(--primary)]" />
            Quản lý: {tournament.name}
          </h1>
          {currentRole && (
            <div className="flex items-center gap-1.5 mt-1">
              <Shield className={`w-3.5 h-3.5 ${isDirector ? 'text-[var(--primary)]' : 'text-amber-400'}`} />
              <span className="text-xs text-[var(--muted-fg)]">
                {isDirector ? 'Tournament Director' : 'Committee Member'}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {tournament.status === 'registration' && isDirector && (
            <button
              onClick={handleStartTournament}
              disabled={actionLoading}
              className="btn btn-gradient flex items-center gap-1.5"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayIcon className="w-4 h-4" />}
              Bắt đầu giải
            </button>
          )}
          {tournament.status === 'in_progress' && isDirector && (
            <button
              onClick={() => updateTournamentStatus(id, 'completed')}
              className="btn btn-secondary text-sm"
            >
              ✅ Kết thúc giải
            </button>
          )}
        </div>
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

      {/* Navigation cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          href={`/tournaments/${id}/manage/players`}
          className="card p-4 hover:border-[var(--primary)]/50 transition-colors text-center group"
        >
          <Users className="w-6 h-6 text-[var(--primary)] mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-semibold">Vận động viên</p>
          <p className="text-xs text-[var(--muted-fg)] mt-0.5">{teams.length} đã đăng ký</p>
        </Link>

        <Link
          href={`/tournaments/${id}/manage/schedule`}
          className="card p-4 hover:border-[var(--primary)]/50 transition-colors text-center group"
        >
          <Calendar className="w-6 h-6 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-semibold">Lịch thi đấu</p>
          <p className="text-xs text-[var(--muted-fg)] mt-0.5">{matches.length} trận</p>
        </Link>

        <Link
          href={`/tournaments/${id}/manage/scoring`}
          className="card p-4 hover:border-red-400/50 transition-colors text-center group relative"
        >
          <PlayIcon className="w-6 h-6 text-red-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-semibold">Ghi điểm</p>
          <p className="text-xs text-[var(--muted-fg)] mt-0.5">Live scoring</p>
          {matches.filter(m => m.status === 'live').length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center animate-pulse font-bold">
              {matches.filter(m => m.status === 'live').length}
            </span>
          )}
        </Link>

        <Link
          href={`/tournaments/${id}/bracket`}
          className="card p-4 hover:border-[var(--primary)]/50 transition-colors text-center group"
        >
          <LayoutGrid className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-semibold">Bracket</p>
          <p className="text-xs text-[var(--muted-fg)] mt-0.5">Xem sơ đồ</p>
        </Link>
      </div>

      {/* Director Dashboard (in_progress only) */}
      {tournament.status === 'in_progress' && selectedEvent && (
        <div className="space-y-3">
          <h2 className="text-base font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            Dashboard điều hành — {CATEGORY_LABELS[selectedEvent.category] ?? selectedEvent.category}
          </h2>
          <DirectorDashboard
            initialMatches={matches}
            teams={teams}
            tournament={tournament}
            tournamentId={id}
            onPause={isDirector ? () => updateTournamentStatus(id, 'in_progress') : undefined}
          />
        </div>
      )}
    </div>
  );
}
