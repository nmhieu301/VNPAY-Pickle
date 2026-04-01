'use client';

import { TournamentStanding, TournamentTeamExtended } from '@/types';
import { useAppStore } from '@/lib/store';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  standings: TournamentStanding[];
  teams: TournamentTeamExtended[];
  advanceCount?: number;
  poolLetter?: string;
}

export function PoolTable({ standings, teams, advanceCount = 2, poolLetter }: Props) {
  const getPlayer = useAppStore(s => s.getPlayer);

  function getTeamLabel(teamId: string): string {
    const team = teams.find(t => t.id === teamId);
    if (!team) return 'TBD';
    if (team.team_name) return team.team_name;
    const p1 = team.player1_id ? getPlayer(team.player1_id) : null;
    const p2 = team.player2_id ? getPlayer(team.player2_id) : null;
    const n1 = p1?.nickname || p1?.full_name || '?';
    const n2 = p2 ? (p2.nickname || p2.full_name) : null;
    return n2 ? `${n1} + ${n2}` : n1;
  }

  const sorted = [...standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.point_differential - a.point_differential;
  });

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-color)]">
      {poolLetter && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <span className="font-bold">Bảng {poolLetter}</span>
          {advanceCount > 0 && (
            <span className="text-xs text-blue-100 ml-2">
              (Top {advanceCount} vào vòng playoff)
            </span>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--muted)] text-[var(--muted-fg)] text-xs uppercase">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Đội</th>
              <th className="px-2 py-2 text-center">T</th>
              <th className="px-2 py-2 text-center">B</th>
              <th className="px-2 py-2 text-center">HD</th>
              <th className="px-2 py-2 text-center hidden sm:table-cell">Điểm+</th>
              <th className="px-2 py-2 text-center hidden sm:table-cell">Điểm-</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {sorted.map((standing, idx) => {
              const rank = idx + 1;
              const advancing = rank <= advanceCount;
              const eliminated = standings.length > advanceCount && rank > standings.length - (standings.length - advanceCount > 0 ? 0 : 1);
              const isBottom = rank === sorted.length;

              return (
                <tr
                  key={standing.team_id}
                  className={`transition-colors ${
                    advancing
                      ? 'bg-green-50 dark:bg-green-900/10'
                      : isBottom  
                      ? 'bg-red-50/50 dark:bg-red-900/5'
                      : 'hover:bg-[var(--muted)]'
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                      rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                      rank === 2 ? 'bg-gray-300 text-gray-700' :
                      rank === 3 ? 'bg-orange-400 text-orange-900' :
                      'text-[var(--muted-fg)]'
                    }`}>
                      {rank}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate max-w-[150px]">
                        {getTeamLabel(standing.team_id)}
                      </span>
                      {advancing && (
                        <TrendingUp className="w-3 h-3 text-green-500 flex-shrink-0" />
                      )}
                      {isBottom && eliminated && (
                        <TrendingDown className="w-3 h-3 text-red-400 flex-shrink-0" />
                      )}
                    </div>
                    {teams.find(t => t.id === standing.team_id)?.avg_elo && (
                      <span className="text-xs text-[var(--muted-fg)]">
                        ELO {Math.round(teams.find(t => t.id === standing.team_id)?.avg_elo || 0)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center font-bold text-green-600 dark:text-green-400">
                    {standing.wins}
                  </td>
                  <td className="px-2 py-2.5 text-center font-medium text-red-500 dark:text-red-400">
                    {standing.losses}
                  </td>
                  <td className="px-2 py-2.5 text-center font-medium">
                    <span className={standing.point_differential >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>
                      {standing.point_differential > 0 ? '+' : ''}{standing.point_differential}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center text-[var(--muted-fg)] hidden sm:table-cell">
                    {standing.points_for}
                  </td>
                  <td className="px-2 py-2.5 text-center text-[var(--muted-fg)] hidden sm:table-cell">
                    {standing.points_against}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted-fg)] text-sm">
                  Chưa có kết quả
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {advanceCount > 0 && sorted.length > 0 && (
        <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--muted)] flex items-center gap-4 text-xs text-[var(--muted-fg)]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Vào playoff</span>
          <span>T: Thắng · B: Thua · HD: Hiệu số</span>
        </div>
      )}
    </div>
  );
}
