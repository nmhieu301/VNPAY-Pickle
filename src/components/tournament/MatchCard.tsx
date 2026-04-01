'use client';

import { TournamentMatch, TournamentTeamExtended } from '@/types';
import { useAppStore } from '@/lib/store';
import { Clock, MapPin, Shield } from 'lucide-react';

const STATUS_CONFIG = {
  scheduled: { label: 'Chờ đấu', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800' },
  live: { label: '🔴 Live', cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse' },
  completed: { label: '✅ Xong', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  forfeit: { label: '🚫 Walkover', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30' },
  dispute: { label: '⚠️ Tranh chấp', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30' },
  cancelled: { label: 'Hủy', cls: 'bg-gray-100 text-gray-600' },
};

const ROUND_LABELS: Record<string, string> = {
  pool: 'Vòng bảng',
  quarter: 'Tứ kết',
  semi: 'Bán kết',
  final: 'Chung kết',
  third_place: 'Tranh hạng 3',
  grand_final: 'Chung kết lớn (GF)',
  winner_r1: 'Vòng 1 (W)',
  winner_r2: 'Vòng 2 (W)',
  loser_r1: 'Vòng 1 (L)',
  loser_r2: 'Vòng 2 (L)',
};

interface Props {
  match: TournamentMatch;
  teams: TournamentTeamExtended[];
  onClick?: () => void;
  compact?: boolean;
}

function getTeamLabel(
  teamId: string | null,
  teams: TournamentTeamExtended[],
  getPlayerFn: (id: string) => { full_name: string; nickname: string | null } | undefined
): string {
  if (!teamId) return 'TBD';
  const team = teams.find(t => t.id === teamId);
  if (!team) return 'TBD';
  if (team.team_name) return team.team_name;
  const p1 = team.player1_id ? getPlayerFn(team.player1_id) : null;
  const p2 = team.player2_id ? getPlayerFn(team.player2_id) : null;
  const n1 = p1?.nickname || p1?.full_name || '?';
  const n2 = p2?.nickname || p2?.full_name;
  return n2 ? `${n1} + ${n2}` : n1;
}

export function MatchCard({ match, teams, onClick, compact = false }: Props) {
  const getPlayer = useAppStore(s => s.getPlayer);
  const status = STATUS_CONFIG[match.status] || STATUS_CONFIG.scheduled;

  const teamALabel = getTeamLabel(match.team_a_id, teams, getPlayer);
  const teamBLabel = getTeamLabel(match.team_b_id, teams, getPlayer);
  const isTeamAWinner = match.winner_team_id === match.team_a_id;
  const isTeamBWinner = match.winner_team_id === match.team_b_id;

  const roundLabel = ROUND_LABELS[match.round_type] || match.round_type;

  // Calculate sets won per team
  let setsA = 0, setsB = 0;
  const setPairs = [
    [match.set1_a, match.set1_b],
    [match.set2_a, match.set2_b],
    [match.set3_a, match.set3_b],
  ];
  for (const [a, b] of setPairs) {
    if (a !== null && b !== null) {
      if (a > b) setsA++;
      else if (b > a) setsB++;
    }
  }

  if (compact) {
    return (
      <button onClick={onClick} className={`card p-3 w-full text-left hover:shadow-md transition-all ${match.status === 'live' ? 'ring-2 ring-red-400' : ''}`}>
        <div className="flex items-center gap-2 text-xs text-[var(--muted-fg)] mb-2">
          <span>{roundLabel}</span>
          {match.court_number && <span>· Sân {match.court_number}</span>}
          <span className={`ml-auto px-1.5 py-0.5 rounded text-xs font-medium ${status.cls}`}>{status.label}</span>
        </div>
        <div className="space-y-1">
          {[
            { label: teamALabel, winner: isTeamAWinner, sets: setsA },
            { label: teamBLabel, winner: isTeamBWinner, sets: setsB },
          ].map((team, idx) => (
            <div key={idx} className={`flex items-center justify-between text-sm ${team.winner ? 'font-bold text-[var(--fg)]' : 'text-[var(--muted-fg)]'}`}>
              <span className="flex items-center gap-1.5 min-w-0">
                {team.winner && <Shield className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                <span className="truncate">{team.label}</span>
              </span>
              {match.status === 'completed' && (
                <span className={`font-bold ${team.winner ? 'text-green-600 dark:text-green-400' : ''}`}>{team.sets}</span>
              )}
            </div>
          ))}
        </div>
        {/* Score detail */}
        {match.status === 'completed' && match.set1_a !== null && (
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {setPairs.filter(([a]) => a !== null).map(([a, b], i) => (
              <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-fg)]">
                {a}-{b}
              </span>
            ))}
          </div>
        )}
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`card p-4 ${onClick ? 'cursor-pointer hover:shadow-lg' : ''} ${match.status === 'live' ? 'ring-2 ring-red-400 ring-offset-2' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-[var(--muted-fg)]">
          <span className="font-medium">{roundLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {match.court_number && (
            <span className="flex items-center gap-1 text-xs text-[var(--muted-fg)]">
              <MapPin className="w-3 h-3" />Sân {match.court_number}
            </span>
          )}
          {match.scheduled_time && (
            <span className="flex items-center gap-1 text-xs text-[var(--muted-fg)]">
              <Clock className="w-3 h-3" />
              {new Date(match.scheduled_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="space-y-2">
        {[
          { label: teamALabel, winner: isTeamAWinner, sets: setsA, id: match.team_a_id },
          { label: teamBLabel, winner: isTeamBWinner, sets: setsB, id: match.team_b_id },
        ].map((team, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-2.5 rounded-lg ${
              team.winner ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800' : 'bg-[var(--muted)]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {team.winner && <span className="text-yellow-500">🏆</span>}
              <span className={`font-medium truncate ${team.winner ? 'text-green-700 dark:text-green-300' : ''}`}>
                {team.label}
              </span>
            </div>
            {match.status === 'completed' && (
              <span className={`text-xl font-bold ${team.winner ? 'text-green-600 dark:text-green-400' : 'text-[var(--muted-fg)]'}`}>
                {team.sets}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Set scores */}
      {match.status === 'completed' && match.set1_a !== null && (
        <div className="mt-3 flex gap-2 items-center flex-wrap">
          <span className="text-xs text-[var(--muted-fg)]">Sets:</span>
          {setPairs.filter(([a]) => a !== null).map(([a, b], i) => (
            <span key={i} className="text-xs font-mono bg-[var(--muted)] px-2 py-0.5 rounded">
              {a}-{b}
            </span>
          ))}
        </div>
      )}

      {match.dispute_note && (
        <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded p-2">
          ⚠️ {match.dispute_note}
        </div>
      )}
    </div>
  );
}
