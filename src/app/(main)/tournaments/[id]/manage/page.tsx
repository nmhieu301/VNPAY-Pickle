'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTournamentStore } from '@/lib/tournamentStore';
import { useAppStore } from '@/lib/store';
import { RegistrationList } from '@/components/tournament/RegistrationList';
import { BracketTree } from '@/components/tournament/BracketTree';
import { ScoreInput } from '@/components/tournament/ScoreInput';
import { MatchCard } from '@/components/tournament/MatchCard';
import { TournamentEvent, TournamentMatch } from '@/types';
import { Play, Pause, Settings, Users, LayoutList, Activity } from 'lucide-react';

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
  const generateBracket = useTournamentStore(s => s.generateBracket);
  const updateTournamentStatus = useTournamentStore(s => s.updateTournamentStatus);
  const setMatchLive = useTournamentStore(s => s.setMatchLive);

  const [section, setSection] = useState<'teams' | 'bracket' | 'schedule'>('teams');
  const [selectedEvent, setSelectedEvent] = useState<TournamentEvent | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { if (id && !tournament) loadTournament(id); }, [id]);
  useEffect(() => { if (events.length > 0 && !selectedEvent) setSelectedEvent(events[0]); }, [events]);
  useEffect(() => { if (selectedEvent && !teamsMap[selectedEvent.id]) loadEventDetail(selectedEvent.id); }, [selectedEvent]);

  // Access check
  if (tournament && currentUser?.id !== tournament.organizer_id && currentUser?.role !== 'admin') {
    router.push(`/tournaments/${id}`);
    return null;
  }

  const teams = selectedEvent ? (teamsMap[selectedEvent.id] || []) : [];
  const matches = selectedEvent ? (matchesMap[selectedEvent.id] || []) : [];

  const handleGenerateBracket = async () => {
    if (!selectedEvent) return;
    setGenerating(true);
    await generateBracket(selectedEvent.id, selectedEvent.format);
    setGenerating(false);
  };

  const handleStartTournament = async () => {
    setActionLoading(true);
    await updateTournamentStatus(id, 'in_progress');
    setActionLoading(false);
  };

  const handlePauseTournament = async () => {
    setActionLoading(true);
    await updateTournamentStatus(id, tournament?.is_paused ? 'in_progress' : 'in_progress');
    setActionLoading(false);
  };

  if (!tournament) return <div className="skeleton h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/tournaments/${id}`} className="text-xs text-[var(--muted-fg)] hover:text-[var(--fg)]">← Quay lại giải</Link>
          <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-[var(--primary)]" /> Quản lý: {tournament.name}</h1>
        </div>
        <div className="flex gap-2">
          {tournament.status === 'registration' && (
            <button onClick={handleStartTournament} disabled={actionLoading} className="btn btn-gradient flex items-center gap-1.5">
              <Play className="w-4 h-4" /> Bắt đầu
            </button>
          )}
          {tournament.status === 'in_progress' && (
            <button onClick={() => updateTournamentStatus(id, 'completed')} className="btn btn-secondary text-sm">
              ✅ Kết thúc
            </button>
          )}
        </div>
      </div>

      {/* Event selector */}
      {events.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {events.map(ev => (
            <button key={ev.id} onClick={() => setSelectedEvent(ev)} className={`btn btn-sm ${selectedEvent?.id === ev.id ? 'btn-primary' : 'btn-ghost'}`}>
              {CATEGORY_LABELS[ev.category] || ev.category}
            </button>
          ))}
        </div>
      )}

      {/* Section nav */}
      <div className="flex gap-1 border-b border-[var(--border-color)]">
        {[['teams','👥 Đăng ký'],['bracket','🔲 Bracket'],['schedule','📅 Lịch đấu']].map(([val, label]) => (
          <button key={val} onClick={() => setSection(val as typeof section)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${section === val ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted-fg)]'}`}>
            {label}
          </button>
        ))}
      </div>

      {section === 'teams' && selectedEvent && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleGenerateBracket} disabled={generating} className="btn btn-gradient btn-sm">
              {generating ? 'Đang tạo...' : '🔲 Tạo bracket'}
            </button>
          </div>
          <RegistrationList event={selectedEvent} teams={teams} isOrganizer />
        </div>
      )}

      {section === 'bracket' && selectedEvent && (
        <div className="space-y-4">
          <div className="card p-4">
            <BracketTree matches={matches} teams={teams} onSelectMatch={m => setSelectedMatch(m)} />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Danh sách trận</h3>
            {matches.filter(m => m.status !== 'completed').map(m => (
              <MatchCard key={m.id} match={m} teams={teams}
                onClick={() => { setSection('schedule'); setSelectedMatch(m); }} compact />
            ))}
          </div>
        </div>
      )}

      {section === 'schedule' && selectedEvent && (
        <div className="space-y-3">
          {matches.map(m => (
            <div key={m.id} className="space-y-0">
              <MatchCard match={m} teams={teams} onClick={() => setSelectedMatch(m)} />
            </div>
          ))}
          {matches.length === 0 && (
            <div className="text-center py-8 text-[var(--muted-fg)] text-sm">
              <p>Chưa có trận đấu nào. Hãy tạo bracket trước.</p>
            </div>
          )}
        </div>
      )}

      {/* Score modal */}
      {selectedMatch && selectedEvent && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedMatch(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Nhập kết quả</h3>
                <button onClick={() => setSelectedMatch(null)} className="btn btn-ghost btn-icon text-xl">✕</button>
              </div>
              {[
                selectedMatch.status === 'scheduled' && (
                  <button key="live" onClick={async () => { await setMatchLive(selectedMatch.id); setSelectedMatch(null); }} className="btn btn-secondary w-full mb-3 text-sm">
                    ▶ Đánh dấu đang Live
                  </button>
                ),
              ]}
              {selectedMatch.status === 'completed' ? (
                <MatchCard match={selectedMatch} teams={teams} />
              ) : (
                <ScoreInput
                  match={selectedMatch}
                  teams={teams}
                  setsFormat={tournament.sets_format}
                  pointsTarget={tournament.points_target}
                  onClose={() => setSelectedMatch(null)}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
