'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — Manage Schedule Page
// /tournaments/:id/manage/schedule
// ═══════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, RefreshCw, Calendar } from 'lucide-react';
import { useTournamentStore } from '@/lib/tournamentStore';
import { useAppStore } from '@/lib/store';
import { useTournamentCommittee } from '@/hooks/useTournamentCommittee';
import { ScheduleGrid } from '@/components/tournament/ScheduleGrid';
import { sendNotification } from '@/lib/supabase/committeeApi';
import type { TournamentEvent } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  mens_doubles: '👨‍👨 Đôi Nam', womens_doubles: '👩‍👩 Đôi Nữ',
  mixed_doubles: '👫 Hỗn hợp', mens_singles: '👨 Đơn Nam',
  womens_singles: '👩 Đơn Nữ', open_doubles: '🤝 Open',
};

export default function ManageSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);
  const tournament = useTournamentStore(s => s.currentTournament);
  const events = useTournamentStore(s => s.currentEvents);
  const teamsMap = useTournamentStore(s => s.teamsMap);
  const matchesMap = useTournamentStore(s => s.matchesMap);
  const loadTournament = useTournamentStore(s => s.loadTournament);
  const loadEventDetail = useTournamentStore(s => s.loadEventDetail);
  const generateBracket = useTournamentStore(s => s.generateBracket);

  const [selectedEvent, setSelectedEvent] = useState<TournamentEvent | null>(null);
  const [generating, setGenerating] = useState(false);
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
  const matches = selectedEvent ? (matchesMap[selectedEvent.id] || []) : [];

  const handleAutoSchedule = async () => {
    if (!selectedEvent) return;
    if (!confirm('Chạy lại lịch tự động sẽ ghi đè lịch hiện tại. Tiếp tục?')) return;
    setGenerating(true);
    await generateBracket(selectedEvent.id, selectedEvent.format);
    await loadEventDetail(selectedEvent.id);
    setGenerating(false);
  };

  const handlePublish = async () => {
    // Send notification to all registered players
    const playerIds = new Set<string>();
    teams.forEach(t => {
      if (t.player1_id) playerIds.add(t.player1_id);
      if (t.player2_id) playerIds.add(t.player2_id);
    });
    await Promise.all([...playerIds].map(uid =>
      sendNotification({
        userId: uid,
        type: 'tournament',
        title: `📅 Lịch thi đấu đã được cập nhật`,
        content: `Lịch thi đấu của ${tournament.name} vừa được ban tổ chức cập nhật. Vui lòng kiểm tra lại.`,
        linkTo: `/tournaments/${id}/schedule`,
      })
    ));
    alert(`✅ Đã gửi thông báo cho ${playerIds.size} VĐV!`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href={`/tournaments/${id}/manage`}
            className="flex items-center gap-1.5 text-xs text-[var(--muted-fg)] hover:text-[var(--fg)] w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại Quản lý
          </Link>
          <h1 className="text-xl font-bold mt-2">📅 Lịch thi đấu — {tournament.name}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAutoSchedule}
            disabled={generating}
            className="btn btn-sm btn-secondary flex items-center gap-1.5"
          >
            {generating
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            Auto-schedule
          </button>
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

      {selectedEvent && matches.length > 0 ? (
        <ScheduleGrid
          initialMatches={matches}
          teams={teams}
          tournament={tournament}
          currentUserId={currentUser.id}
          onPublish={handlePublish}
        />
      ) : (
        <div className="text-center py-16 text-[var(--muted-fg)]">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chưa có lịch thi đấu. Hãy tạo bracket trước.</p>
          <Link href={`/tournaments/${id}/manage`} className="btn btn-primary btn-sm mt-4 inline-flex">
            → Tạo bracket
          </Link>
        </div>
      )}
    </div>
  );
}

