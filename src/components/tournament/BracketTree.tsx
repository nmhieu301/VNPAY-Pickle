'use client';

import { TournamentMatch, TournamentTeamExtended } from '@/types';
import { useAppStore } from '@/lib/store';
import { useState } from 'react';

interface Props {
  matches: TournamentMatch[];
  teams: TournamentTeamExtended[];
  onSelectMatch?: (match: TournamentMatch) => void;
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

function getSets(m: TournamentMatch) {
  const pairs = [[m.set1_a, m.set1_b],[m.set2_a, m.set2_b],[m.set3_a, m.set3_b]];
  let a = 0, b = 0;
  for (const [sa, sb] of pairs) {
    if (sa !== null && sb !== null) {
      if (sa > sb) a++;
      else if (sb > sa) b++;
    }
  }
  return { a, b };
}

// Single bracket match node
function BracketNode({
  match,
  teams,
  getPlayer,
  onClick,
}: {
  match: TournamentMatch;
  teams: TournamentTeamExtended[];
  getPlayer: (id: string) => { full_name: string; nickname: string | null } | undefined;
  onClick?: () => void;
}) {
  const teamA = getTeamLabel(match.team_a_id, teams, getPlayer);
  const teamB = getTeamLabel(match.team_b_id, teams, getPlayer);
  const sets = getSets(match);
  const isLive = match.status === 'live';
  const isDone = match.status === 'completed';
  const aWon = match.winner_team_id === match.team_a_id;
  const bWon = match.winner_team_id === match.team_b_id;

  return (
    <button
      onClick={onClick}
      className={`w-[180px] border rounded-lg overflow-hidden text-left transition-all ${
        isLive ? 'ring-2 ring-red-400 border-red-300' :
        isDone ? 'border-[var(--border-color)]' :
        'border-[var(--border-color)] opacity-70'
      } bg-[var(--surface)] hover:shadow-md hover:scale-[1.02]`}
    >
      {isLive && (
        <div className="bg-red-500 text-white text-xs text-center py-0.5 font-medium animate-pulse">
          🔴 LIVE
        </div>
      )}
      {[
        { label: teamA, won: aWon, sets: sets.a },
        { label: teamB, won: bWon, sets: sets.b },
      ].map((side, idx) => (
        <div
          key={idx}
          className={`flex items-center justify-between px-2.5 py-1.5 text-xs ${
            idx === 0 ? 'border-b border-[var(--border-color)]' : ''
          } ${side.won ? 'bg-green-50 dark:bg-green-900/20 font-bold' : ''}`}
        >
          <span className={`truncate max-w-[110px] ${side.won ? 'text-green-700 dark:text-green-300' : 'text-[var(--fg)]'}`}>
            {side.won && '✓ '}{side.label}
          </span>
          {isDone && (
            <span className={`font-bold text-sm ${side.won ? 'text-green-600 dark:text-green-400' : 'text-[var(--muted-fg)]'}`}>
              {side.sets}
            </span>
          )}
        </div>
      ))}
    </button>
  );
}

const ROUND_NAME: Record<string, string> = {
  winner_r1: 'Vòng 1',
  winner_r2: 'Vòng 2',
  winner_r3: 'Vòng 3',
  quarter: 'Tứ kết',
  semi: 'Bán kết',
  final: 'Chung kết',
  third_place: 'Hạng 3',
  grand_final: 'Grand Final',
};

export function BracketTree({ matches, teams, onSelectMatch }: Props) {
  const getPlayer = useAppStore(s => s.getPlayer);

  // Group matches by round_type for SE/DE display
  const roundOrder = ['winner_r1','winner_r2','winner_r3','quarter','semi','final','third_place','grand_final'];
  const elim = matches.filter(m => m.round_type !== 'pool');
  
  // Build rounds map
  const roundsMap: Record<string, TournamentMatch[]> = {};
  for (const match of elim) {
    const r = match.round_type;
    if (!roundsMap[r]) roundsMap[r] = [];
    roundsMap[r].push(match);
  }

  const orderedRounds = roundOrder.filter(r => roundsMap[r]?.length > 0);

  if (orderedRounds.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--muted-fg)]">
        <p className="text-4xl mb-3">🏆</p>
        <p>Bracket chưa được tạo</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-stretch gap-0 min-w-max">
        {orderedRounds.map((roundType, roundIdx) => {
          const roundMatches = roundsMap[roundType] || [];
          const isFinal = roundType === 'final' || roundType === 'grand_final';

          return (
            <div key={roundType} className="flex flex-col items-center min-w-[220px]">
              {/* Round header */}
              <div className={`text-xs font-bold px-4 py-2 mb-4 rounded-full ${
                isFinal ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900' :
                roundType === 'semi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                'bg-[var(--muted)] text-[var(--muted-fg)]'
              }`}>
                {ROUND_NAME[roundType] || roundType}
              </div>

              {/* Matches in this round */}
              <div className={`flex flex-col gap-6 flex-1 ${isFinal ? 'justify-center' : 'justify-around'}`}>
                {roundMatches.map(m => (
                  <div key={m.id} className="flex items-center gap-0">
                    <BracketNode
                      match={m}
                      teams={teams}
                      getPlayer={getPlayer}
                      onClick={() => onSelectMatch?.(m)}
                    />
                    {/* Connector lines */}
                    {roundIdx < orderedRounds.length - 1 && !isFinal && (
                      <div className="w-8 h-px bg-[var(--border-color)] flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[var(--muted-fg)] mt-4 text-center">
        Click vào trận để xem chi tiết / nhập điểm
      </p>
    </div>
  );
}
