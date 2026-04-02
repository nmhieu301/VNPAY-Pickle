'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — DirectorDashboard Component
// Tổng quan điều hành tất cả sân realtime
// ═══════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Activity, AlertTriangle, Clock, TrendingUp, Play } from 'lucide-react';
import type { TournamentMatch, TournamentTeamExtended, Tournament } from '@/types';

interface CourtStatus {
  court: number;
  match: TournamentMatch | null;
  status: 'live' | 'ready' | 'empty' | 'done';
  isLate: boolean;
}

interface DirectorDashboardProps {
  initialMatches: TournamentMatch[];
  teams: TournamentTeamExtended[];
  tournament: Tournament;
  tournamentId: string;
  onPause?: () => void;
}

const STATUS_ICONS: Record<string, string> = {
  live: '🔴', ready: '🟡', empty: '⚪', done: '🟢',
};

function getTeamName(team: TournamentTeamExtended | undefined): string {
  if (!team) return 'TBD';
  const p1 = team.player1?.full_name?.split(' ').pop() ?? '?';
  const p2 = team.player2?.full_name?.split(' ').pop();
  return p2 ? `${p1}+${p2}` : p1;
}

function estimateEndTime(matches: TournamentMatch[], matchDuration = 45): string {
  const pending = matches.filter(m => m.status !== 'completed' && m.status !== 'cancelled');
  if (pending.length === 0) return 'Sắp xong';
  const lastScheduled = pending
    .map(m => m.scheduled_time)
    .filter(Boolean) as string[];
  if (lastScheduled.length === 0) return '—';
  const maxTime = Math.max(...lastScheduled.map(t => new Date(t).getTime()));
  const est = new Date(maxTime + matchDuration * 60_000);
  return est.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function DirectorDashboard({ initialMatches, teams, tournament, tournamentId, onPause }: DirectorDashboardProps) {
  const router = useRouter();
  const [matches, setMatches] = useState<TournamentMatch[]>(initialMatches);

  const teamById = Object.fromEntries(teams.map(t => [t.id, t]));

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`director-dashboard-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_matches',
      }, (payload) => {
        const updated = payload.new as TournamentMatch;
        setMatches(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  // Build court status
  const courts = [...new Set([
    ...matches.map(m => m.court_number).filter(Boolean),
    ...Array.from({ length: tournament.num_courts }, (_, i) => i + 1),
  ])] as number[];

  const now = new Date();

  const courtStatuses: CourtStatus[] = courts.map(court => {
    const courtMatches = matches.filter(m => m.court_number === court);
    const live = courtMatches.find(m => m.status === 'live');
    const scheduled = courtMatches
      .filter(m => m.status === 'scheduled' && m.scheduled_time)
      .sort((a, b) => new Date(a.scheduled_time!).getTime() - new Date(b.scheduled_time!).getTime())[0];

    if (live) {
      const startedAt = live.started_at ? new Date(live.started_at) : null;
      const isLate = startedAt
        ? (now.getTime() - startedAt.getTime()) > (tournament.max_match_minutes ?? 60) * 60_000
        : false;
      return { court, match: live, status: 'live', isLate };
    }
    if (scheduled) {
      const schedTime = new Date(scheduled.scheduled_time!);
      const isLate = (now.getTime() - schedTime.getTime()) > 5 * 60_000; // 5 min overdue
      return { court, match: scheduled, status: 'ready', isLate };
    }
    return { court, match: null, status: 'empty', isLate: false };
  });

  const completedCount = matches.filter(m => m.status === 'completed').length;
  const totalCount = matches.filter(m => m.status !== 'cancelled').length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const disputes = matches.filter(m => m.status === 'dispute');
  const late = courtStatuses.filter(c => c.isLate);

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <Activity className="w-5 h-5 text-[var(--primary)] mx-auto mb-1" />
          <p className="text-xl font-black">{completedCount}/{totalCount}</p>
          <p className="text-xs text-[var(--muted-fg)]">Trận hoàn thành</p>
        </div>
        <div className="card p-4 text-center">
          <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <p className="text-xl font-black">{progressPct}%</p>
          <p className="text-xs text-[var(--muted-fg)]">Tiến độ</p>
        </div>
        <div className="card p-4 text-center">
          <Clock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <p className="text-xl font-black">{estimateEndTime(matches, tournament.max_match_minutes ?? 45)}</p>
          <p className="text-xs text-[var(--muted-fg)]">Dự kiến xong</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Alerts */}
      {(disputes.length > 0 || late.length > 0) && (
        <div className="space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Cần xử lý
          </p>
          {disputes.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <span className="text-orange-400 text-sm">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-400">Tranh chấp — Sân {m.court_number}</p>
                <p className="text-xs text-[var(--muted-fg)]">{m.dispute_note ?? 'Không có ghi chú'}</p>
              </div>
              <button
                onClick={() => router.push(`/tournaments/${tournamentId}/manage/scoring/${m.id}`)}
                className="btn btn-sm btn-ghost text-orange-400"
              >
                Xử lý →
              </button>
            </div>
          ))}
          {late.filter(c => c.status === 'ready').map(c => (
            <div key={c.court} className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <span className="text-amber-400 text-sm">⏰</span>
              <p className="text-sm text-amber-400">
                Sân {c.court} trễ hơn 5 phút so với lịch
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Court cards */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--muted-fg)] uppercase tracking-wider">Tình trạng sân</p>
        {courtStatuses.map(cs => (
          <button
            key={cs.court}
            onClick={() => cs.match && router.push(`/tournaments/${tournamentId}/manage/scoring/${cs.match.id}`)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
              cs.status === 'live'
                ? 'border-red-400/40 bg-red-400/5 hover:bg-red-400/10'
                : cs.status === 'ready'
                ? 'border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10'
                : 'border-[var(--border-color)] bg-[var(--card-bg)]'
            }`}
          >
            {/* Status indicator */}
            <div className="text-2xl leading-none">
              {STATUS_ICONS[cs.status]}
            </div>

            {/* Court number */}
            <div className="text-center w-8">
              <p className="text-[10px] text-[var(--muted-fg)]">Sân</p>
              <p className="text-lg font-black">{cs.court}</p>
            </div>

            {/* Match info */}
            <div className="flex-1 min-w-0">
              {cs.match ? (
                <>
                  <p className="text-sm font-bold truncate">
                    {getTeamName(teamById[cs.match.team_a_id ?? ''])}
                    <span className="text-[var(--muted-fg)] font-normal mx-1">vs</span>
                    {getTeamName(teamById[cs.match.team_b_id ?? ''])}
                  </p>
                  {cs.isLate && (
                    <p className="text-xs text-amber-400">⚠️ Trễ hơn lịch</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-[var(--muted-fg)]">
                  {cs.status === 'empty' ? 'Trống — không có trận' : 'Trống'}
                </p>
              )}
            </div>

            {/* Live score */}
            {cs.match && cs.status === 'live' && (
              <div className="text-right shrink-0">
                <p className="text-xs text-[var(--muted-fg)]">Điểm</p>
                <p className="text-xl font-black tabular-nums text-red-400">
                  {cs.match.set1_a ?? 0}
                  <span className="text-[var(--muted-fg)] font-light">-</span>
                  {cs.match.set1_b ?? 0}
                </p>
              </div>
            )}

            {cs.match && <span className="text-[var(--muted-fg)]">→</span>}
          </button>
        ))}
      </div>

      {/* Control buttons */}
      <div className="flex gap-3 pt-2">
        <button onClick={onPause} className="btn btn-secondary flex-1 flex items-center justify-center gap-2">
          ⏸ Tạm dừng giải
        </button>
        <button
          onClick={() => router.push(`/tournaments/${tournamentId}/manage/schedule`)}
          className="btn btn-ghost flex-1 flex items-center justify-center gap-2"
        >
          📅 Quản lý lịch
        </button>
      </div>
    </div>
  );
}
