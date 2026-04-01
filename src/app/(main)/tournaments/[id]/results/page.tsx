'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTournamentStore } from '@/lib/tournamentStore';
import { useAppStore } from '@/lib/store';
import { MatchCard } from '@/components/tournament/MatchCard';
import { PoolTable } from '@/components/tournament/PoolTable';
import { Trophy, Medal } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  mens_doubles: '👨‍👨 Đôi Nam', womens_doubles: '👩‍👩 Đôi Nữ',
  mixed_doubles: '👫 Hỗn hợp', mens_singles: '👨 Đơn Nam',
  womens_singles: '👩 Đơn Nữ', open_doubles: '🤝 Open',
};

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const getPlayer = useAppStore(s => s.getPlayer);
  const tournament = useTournamentStore(s => s.currentTournament);
  const events = useTournamentStore(s => s.currentEvents);
  const teamsMap = useTournamentStore(s => s.teamsMap);
  const matchesMap = useTournamentStore(s => s.matchesMap);
  const standingsMap = useTournamentStore(s => s.standingsMap);
  const loadTournament = useTournamentStore(s => s.loadTournament);
  const loadEventDetail = useTournamentStore(s => s.loadEventDetail);

  useEffect(() => { if (id && !tournament) loadTournament(id); }, [id]);
  useEffect(() => {
    for (const ev of events) { if (!matchesMap[ev.id]) loadEventDetail(ev.id); }
  }, [events]);

  if (!tournament) return <div className="skeleton h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/tournaments/${id}`} className="text-[var(--muted-fg)] hover:text-[var(--fg)] text-sm">← Quay lại</Link>
        <h1 className="text-xl font-bold">🏆 Kết quả</h1>
      </div>

      {events.map(ev => {
        const teams = teamsMap[ev.id] || [];
        const matches = matchesMap[ev.id] || [];
        const standings = standingsMap[ev.id] || [];

        const finalMatch = matches.find(m => m.round_type === 'final' && m.status === 'completed');
        const grandFinal = matches.find(m => m.round_type === 'grand_final' && m.status === 'completed');
        const thirdPlace = matches.find(m => m.round_type === 'third_place' && m.status === 'completed');
        const champion = grandFinal?.winner_team_id || finalMatch?.winner_team_id;

        const getTeamLabel = (teamId: string | null) => {
          if (!teamId) return 'TBD';
          const team = teams.find(t => t.id === teamId);
          if (!team) return 'TBD';
          if (team.team_name) return team.team_name;
          const p1 = getPlayer(team.player1_id);
          const p2 = team.player2_id ? getPlayer(team.player2_id) : null;
          const n1 = p1?.nickname || p1?.full_name || '?';
          const n2 = p2 ? (p2.nickname || p2.full_name) : null;
          return n2 ? `${n1} + ${n2}` : n1;
        };

        const completedMatches = matches.filter(m => m.status === 'completed');

        return (
          <div key={ev.id} className="space-y-4">
            <h2 className="text-base font-bold">{CATEGORY_LABELS[ev.category] || ev.category}</h2>

            {/* Champion podium */}
            {champion && (
              <div className="card p-5 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800">
                <div className="text-center">
                  <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                  <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">🥇 VÔ ĐỊCH</p>
                  <p className="text-xl font-black">{getTeamLabel(champion)}</p>
                </div>
                {thirdPlace?.winner_team_id && (
                  <div className="mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-800 flex justify-center gap-6">
                    {[
                      { place: '🥈 Á quân', teamId: (finalMatch || grandFinal) ? [finalMatch?.team_a_id, finalMatch?.team_b_id].find(t => t !== champion) || null : null },
                      { place: '🥉 Hạng 3', teamId: thirdPlace.winner_team_id },
                    ].map(({ place, teamId }) => teamId && (
                      <div key={place} className="text-center">
                        <p className="text-xs text-[var(--muted-fg)]">{place}</p>
                        <p className="font-semibold text-sm">{getTeamLabel(teamId)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Final matches */}
            {['final', 'grand_final', 'semi', 'quarter'].map(rt => {
              const ms = completedMatches.filter(m => m.round_type === rt);
              if (!ms.length) return null;
              return (
                <div key={rt}>
                  <h3 className="text-sm font-semibold text-[var(--muted-fg)] mb-2">
                    {rt === 'final' ? 'Chung kết' : rt === 'grand_final' ? 'Grand Final' : rt === 'semi' ? 'Bán kết' : 'Tứ kết'}
                  </h3>
                  <div className="space-y-2">
                    {ms.map(m => <MatchCard key={m.id} match={m} teams={teams} compact />)}
                  </div>
                </div>
              );
            })}

            {/* Final standings */}
            {standings.length > 0 && (
              <>
                <h3 className="text-sm font-semibold">Xếp hạng bảng</h3>
                <PoolTable standings={standings} teams={teams} advanceCount={0} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
