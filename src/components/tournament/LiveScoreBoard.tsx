'use client';

import { useEffect } from 'react';
import { TournamentMatch, TournamentTeamExtended } from '@/types';
import { useTournamentStore } from '@/lib/tournamentStore';
import { useAppStore } from '@/lib/store';

interface Props {
  tournamentId: string;
  teams: TournamentTeamExtended[];
}

function getTeamLabel(
  teamId: string | null,
  teams: TournamentTeamExtended[],
  getPlayer: (id: string) => { full_name: string; nickname: string | null } | undefined
): string {
  if (!teamId) return 'TBD';
  const team = teams.find(t => t.id === teamId);
  if (!team) return 'TBD';
  if (team.team_name) return team.team_name;
  const p1 = team.player1_id ? getPlayer(team.player1_id) : null;
  const p2 = team.player2_id ? getPlayer(team.player2_id) : null;
  const n1 = p1?.nickname || p1?.full_name || '?';
  const n2 = p2 ? (p2.nickname || p2.full_name) : null;
  return n2 ? `${n1} + ${n2}` : n1;
}

function LiveMatchRow({ match, teams }: { match: TournamentMatch; teams: TournamentTeamExtended[] }) {
  const getPlayer = useAppStore(s => s.getPlayer);
  const teamA = getTeamLabel(match.team_a_id, teams, getPlayer);
  const teamB = getTeamLabel(match.team_b_id, teams, getPlayer);

  const setPairs = [
    [match.set1_a, match.set1_b],
    [match.set2_a, match.set2_b],
    [match.set3_a, match.set3_b],
  ].filter(([a]) => a !== null);

  let setsA = 0, setsB = 0;
  for (const [a, b] of setPairs) {
    if ((a as number) > (b as number)) setsA++;
    else if ((b as number) > (a as number)) setsB++;
  }

  const isLive = match.status === 'live';
  const isDone = match.status === 'completed';

  return (
    <div className={`card p-4 ${isLive ? 'ring-2 ring-red-400' : ''}`}>
      {isLive && (
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
          <span className="text-xs font-bold text-red-500">LIVE</span>
          {match.court_number && <span className="text-xs text-[var(--muted-fg)] ml-auto">Sân {match.court_number}</span>}
        </div>
      )}

      <div className="space-y-2">
        {[
          { label: teamA, sets: setsA, won: match.winner_team_id === match.team_a_id },
          { label: teamB, sets: setsB, won: match.winner_team_id === match.team_b_id },
        ].map((side, i) => (
          <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${side.won ? 'bg-green-50 dark:bg-green-900/10' : 'bg-[var(--muted)]'}`}>
            <span className={`text-sm font-medium truncate ${side.won ? 'text-green-700 dark:text-green-300' : ''}`}>
              {side.won && '🏆 '}{side.label}
            </span>
            {(isLive || isDone) && (
              <span className={`text-2xl font-black ml-2 ${side.won ? 'text-green-600 dark:text-green-400' : 'text-[var(--muted-fg)]'}`}>
                {side.sets}
              </span>
            )}
          </div>
        ))}
      </div>

      {setPairs.length > 0 && (
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {setPairs.map(([a, b], i) => (
            <span key={i} className="text-xs font-mono bg-[var(--muted)] px-2 py-0.5 rounded">
              {a}-{b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveScoreBoard({ tournamentId, teams }: Props) {
  const liveMatches = useTournamentStore(s => s.liveMatches);
  const loadLiveMatches = useTournamentStore(s => s.loadLiveMatches);
  const subscribeToLive = useTournamentStore(s => s.subscribeToLive);

  useEffect(() => {
    loadLiveMatches(tournamentId);
    const unsub = subscribeToLive(tournamentId);
    return unsub;
  }, [tournamentId]);

  const live = liveMatches.filter(m => m.status === 'live');
  const upcoming = liveMatches.filter(m => m.status === 'scheduled').slice(0, 4);

  return (
    <div className="space-y-6">
      {live.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-red-500 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            Đang thi đấu ({live.length} trận)
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {live.map(m => <LiveMatchRow key={m.id} match={m} teams={teams} />)}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-[var(--muted-fg)]">
          <p className="text-3xl mb-2">🏓</p>
          <p className="text-sm">Không có trận đang diễn ra</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--muted-fg)] mb-3">
            📅 Trận sắp tới
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {upcoming.map(m => <LiveMatchRow key={m.id} match={m} teams={teams} />)}
          </div>
        </div>
      )}
    </div>
  );
}
