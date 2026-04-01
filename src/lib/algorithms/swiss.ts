// ═══════════════════════════════════════════
// Swiss System — Pairing & Buchholz Tiebreaker
// ═══════════════════════════════════════════

import type { TournamentStanding } from '@/types';

export interface SwissPairing {
  teamA: string;
  teamB: string;
}

interface TeamScore {
  teamId: string;
  wins: number;
  previousOpponents: string[];
}

/**
 * Swiss pairing cho vòng tiếp theo
 * - Ghép đội có cùng số thắng
 * - Ưu tiên không ghép 2 đội đã gặp nhau
 */
export function generateSwissPairing(
  teams: TeamScore[],
  roundNumber: number
): SwissPairing[] {
  // Sort by wins desc, then by teamId for stability
  const sorted = [...teams].sort((a, b) => b.wins - a.wins || a.teamId.localeCompare(b.teamId));

  const pairings: SwissPairing[] = [];
  const used = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].teamId)) continue;

    // Tìm đối thủ phù hợp nhất (cùng wins, chưa gặp)
    let found = false;
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(sorted[j].teamId)) continue;

      const alreadyMet = sorted[i].previousOpponents.includes(sorted[j].teamId);
      if (!alreadyMet || roundNumber === 1) {
        pairings.push({ teamA: sorted[i].teamId, teamB: sorted[j].teamId });
        used.add(sorted[i].teamId);
        used.add(sorted[j].teamId);
        found = true;
        break;
      }
    }

    // Nếu không tìm được (tất cả đã gặp) → ghép với người gần nhất chưa paired
    if (!found) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (!used.has(sorted[j].teamId)) {
          pairings.push({ teamA: sorted[i].teamId, teamB: sorted[j].teamId });
          used.add(sorted[i].teamId);
          used.add(sorted[j].teamId);
          break;
        }
      }
    }
  }

  // Nếu số đội lẻ → đội cuối được BYE (thắng bất chiến thắng)
  if (sorted.length % 2 !== 0) {
    const unpaired = sorted.find(t => !used.has(t.teamId));
    if (unpaired) {
      pairings.push({ teamA: unpaired.teamId, teamB: 'BYE' });
    }
  }

  return pairings;
}

/**
 * Tính Buchholz score: tổng điểm thắng của tất cả đối thủ đã gặp
 * Dùng làm tiebreaker trong Swiss system
 */
export function calculateBuchholz(
  teamId: string,
  previousOpponents: string[],
  standings: TournamentStanding[]
): number {
  let buchholz = 0;
  for (const opponentId of previousOpponents) {
    const opponentStanding = standings.find(s => s.team_id === opponentId);
    if (opponentStanding) {
      buchholz += opponentStanding.wins;
    }
  }
  return buchholz;
}

/**
 * Xếp hạng cuối Swiss: wins desc → buchholz desc → point_diff desc
 */
export function sortSwissStandings(
  standings: (TournamentStanding & { buchholz: number })[]
): (TournamentStanding & { buchholz: number })[] {
  return [...standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    return b.point_differential - a.point_differential;
  });
}
