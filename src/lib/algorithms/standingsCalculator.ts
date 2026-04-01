// ═══════════════════════════════════════════
// Standings Calculator — Pool & Swiss
// ═══════════════════════════════════════════

import type { TournamentMatch, TournamentStanding, TournamentTeamExtended } from '@/types';

/**
 * Tính standings cho pool round robin
 * Tiêu chí sắp xếp:
 * 1. Số trận thắng (wins)
 * 2. Đối đầu trực tiếp (head-to-head)
 * 3. Hiệu số điểm (point differential)
 * 4. Tổng điểm ghi được (points_for)
 */
export function calculatePoolStandings(
  teams: TournamentTeamExtended[],
  matches: TournamentMatch[],
  poolLetter?: string
): Omit<TournamentStanding, 'id' | 'buchholz_score' | 'rank_in_pool'>[] {
  const completedMatches = matches.filter(m => m.status === 'completed' && !m.is_walkover);

  const statsMap: Record<string, {
    team_id: string;
    event_id: string;
    pool_letter: string | null;
    wins: number;
    losses: number;
    points_for: number;
    points_against: number;
  }> = {};

  // Initialize stats
  for (const team of teams) {
    statsMap[team.id] = {
      team_id: team.id,
      event_id: team.event_id,
      pool_letter: poolLetter || team.pool_letter,
      wins: 0,
      losses: 0,
      points_for: 0,
      points_against: 0,
    };
  }

  // Process match results
  for (const match of completedMatches) {
    if (!match.team_a_id || !match.team_b_id) continue;
    if (!statsMap[match.team_a_id] || !statsMap[match.team_b_id]) continue;

    // Count sets won
    let setsA = 0, setsB = 0;
    let ptsA = 0, ptsB = 0;
    const setData = [
      { a: match.set1_a, b: match.set1_b },
      { a: match.set2_a, b: match.set2_b },
      { a: match.set3_a, b: match.set3_b },
      { a: match.set4_a, b: match.set4_b },
      { a: match.set5_a, b: match.set5_b },
    ];

    for (const set of setData) {
      if (set.a !== null && set.b !== null) {
        ptsA += set.a;
        ptsB += set.b;
        if (set.a > set.b) setsA++;
        else if (set.b > set.a) setsB++;
      }
    }

    // Match winner
    const teamAWon = match.winner_team_id === match.team_a_id;
    if (teamAWon) {
      statsMap[match.team_a_id].wins++;
      statsMap[match.team_b_id].losses++;
    } else {
      statsMap[match.team_b_id].wins++;
      statsMap[match.team_a_id].losses++;
    }

    statsMap[match.team_a_id].points_for += ptsA;
    statsMap[match.team_a_id].points_against += ptsB;
    statsMap[match.team_b_id].points_for += ptsB;
    statsMap[match.team_b_id].points_against += ptsA;
  }

  // Walkover matches
  for (const match of matches.filter(m => m.is_walkover)) {
    if (!match.team_a_id || !match.team_b_id || !match.winner_team_id) continue;
    if (statsMap[match.winner_team_id]) statsMap[match.winner_team_id].wins++;
    const loser = match.winner_team_id === match.team_a_id ? match.team_b_id : match.team_a_id;
    if (statsMap[loser]) statsMap[loser].losses++;
  }

  return Object.values(statsMap).map(s => ({
    ...s,
    point_differential: s.points_for - s.points_against,
  }));
}

/**
 * Áp dụng tiebreakers và gắn rank
 */
export function applyTiebreakers(
  standings: Omit<TournamentStanding, 'id' | 'buchholz_score' | 'rank_in_pool'>[],
  matches: TournamentMatch[]
): (Omit<TournamentStanding, 'id' | 'buchholz_score'> & { rank_in_pool: number })[] {
  const sorted = [...standings].sort((a, b) => {
    // 1. Wins
    if (b.wins !== a.wins) return b.wins - a.wins;

    // 2. Head-to-head
    const h2hMatch = matches.find(m =>
      m.status === 'completed' &&
      ((m.team_a_id === a.team_id && m.team_b_id === b.team_id) ||
       (m.team_a_id === b.team_id && m.team_b_id === a.team_id))
    );
    if (h2hMatch?.winner_team_id === a.team_id) return -1;
    if (h2hMatch?.winner_team_id === b.team_id) return 1;

    // 3. Point differential
    if (b.point_differential !== a.point_differential)
      return b.point_differential - a.point_differential;

    // 4. Total points
    return b.points_for - a.points_for;
  });

  return sorted.map((s, idx) => ({ ...s, rank_in_pool: idx + 1 }));
}
