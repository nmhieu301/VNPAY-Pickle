'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — ScoreKeeperHub Component
// Hub chọn sân/trận để ghi điểm
// ═══════════════════════════════════════════

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Play, Circle, CheckCircle2, Clock } from 'lucide-react';
import type { TournamentMatch, TournamentTeamExtended } from '@/types';

const STATUS_CONFIG = {
  scheduled: { icon: Clock, color: 'text-amber-400', label: 'Chờ đấu', bg: 'bg-amber-400/10 border-amber-400/30' },
  live: { icon: Play, color: 'text-red-400', label: 'Đang live', bg: 'bg-red-400/10 border-red-400/40' },
  completed: { icon: CheckCircle2, color: 'text-green-400', label: 'Xong', bg: 'bg-green-400/10 border-green-400/30' },
  forfeit: { icon: Circle, color: 'text-[var(--muted-fg)]', label: 'Forfeit', bg: '' },
  dispute: { icon: Circle, color: 'text-orange-400', label: 'Tranh chấp', bg: 'bg-orange-400/10 border-orange-400/30' },
  cancelled: { icon: Circle, color: 'text-[var(--muted-fg)]', label: 'Đã huỷ', bg: '' },
};

const ROUND_LABELS: Record<string, string> = {
  pool: 'Vòng bảng', quarter: 'Tứ kết', semi: 'Bán kết',
  final: 'Chung kết', third_place: 'Hạng 3', grand_final: 'Grand Final',
};

function getTeamName(team: TournamentTeamExtended | undefined): string {
  if (!team) return 'TBD';
  if (team.team_name) return team.team_name;
  const p1 = team.player1?.full_name ?? '?';
  const p2 = team.player2?.full_name;
  return p2 ? `${p1} + ${p2}` : p1;
}

interface ScoreKeeperHubProps {
  matches: TournamentMatch[];
  teams: TournamentTeamExtended[];
  tournamentId: string;
}

export function ScoreKeeperHub({ matches, teams, tournamentId }: ScoreKeeperHubProps) {
  const router = useRouter();
  const [courtFilter, setCourtFilter] = useState<number | 'all'>('all');

  const courts = [...new Set(matches.map(m => m.court_number).filter(Boolean))] as number[];
  const actionable = matches.filter(m =>
    (m.status === 'scheduled' || m.status === 'live') &&
    (courtFilter === 'all' || m.court_number === courtFilter)
  );
  const recent = matches.filter(m =>
    m.status === 'completed' &&
    (courtFilter === 'all' || m.court_number === courtFilter)
  ).slice(-5);

  const teamById = Object.fromEntries(teams.map(t => [t.id, t]));

  return (
    <div className="space-y-5">
      {/* Court filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCourtFilter('all')}
          className={`btn btn-sm ${courtFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
        >
          Tất cả sân
        </button>
        {courts.map(c => (
          <button
            key={c}
            onClick={() => setCourtFilter(c)}
            className={`btn btn-sm ${courtFilter === c ? 'btn-primary' : 'btn-ghost'}`}
          >
            Sân {c}
          </button>
        ))}
      </div>

      {/* Active / upcoming matches */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--muted-fg)] uppercase tracking-wider">
          Đang đấu & Chờ đấu ({actionable.length})
        </h3>
        {actionable.length === 0 ? (
          <div className="text-center py-10 text-[var(--muted-fg)]">
            <Circle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Không có trận nào cần ghi điểm</p>
          </div>
        ) : (
          actionable.map(match => {
            const cfg = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.scheduled;
            const StatusIcon = cfg.icon;
            const teamA = teamById[match.team_a_id ?? ''];
            const teamB = teamById[match.team_b_id ?? ''];

            return (
              <button
                key={match.id}
                onClick={() => router.push(`/tournaments/${tournamentId}/manage/scoring/${match.id}`)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.01] text-left ${cfg.bg} ${match.status === 'live' ? 'shadow-lg' : ''}`}
              >
                {/* Court badge */}
                <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${match.status === 'live' ? 'bg-red-400/20' : 'bg-[var(--bg)]'}`}>
                  <span className="text-[10px] text-[var(--muted-fg)]">Sân</span>
                  <span className="text-sm font-bold">{match.court_number ?? '?'}</span>
                </div>

                {/* Match info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusIcon className={`w-3.5 h-3.5 ${cfg.color} ${match.status === 'live' ? 'animate-pulse' : ''}`} />
                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-[var(--muted-fg)]">
                      {ROUND_LABELS[match.round_type] ?? match.round_type}
                    </span>
                  </div>
                  <p className="text-sm font-bold truncate">
                    {getTeamName(teamA)}
                    <span className="text-[var(--muted-fg)] font-normal mx-2">vs</span>
                    {getTeamName(teamB)}
                  </p>
                  {match.scheduled_time && (
                    <p className="text-xs text-[var(--muted-fg)] mt-0.5">
                      {new Date(match.scheduled_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                {/* Current score (if live) */}
                {match.status === 'live' && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[var(--muted-fg)]">Hiện tại</p>
                    <p className="text-lg font-black text-red-400">
                      {match.set1_a ?? 0}-{match.set1_b ?? 0}
                    </p>
                  </div>
                )}

                <div className="text-[var(--muted-fg)] text-lg">→</div>
              </button>
            );
          })
        )}
      </div>

      {/* Recent completed */}
      {recent.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--muted-fg)] uppercase tracking-wider">
            Vừa kết thúc
          </h3>
          {recent.map(match => {
            const teamA = teamById[match.team_a_id ?? ''];
            const teamB = teamById[match.team_b_id ?? ''];
            return (
              <div key={match.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] opacity-60">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <p className="text-sm flex-1 truncate">{getTeamName(teamA)} vs {getTeamName(teamB)}</p>
                <p className="text-sm font-bold tabular-nums">
                  {match.set1_a}-{match.set1_b}
                  {match.set2_a !== null ? `, ${match.set2_a}-${match.set2_b}` : ''}
                  {match.set3_a !== null ? `, ${match.set3_a}-${match.set3_b}` : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
