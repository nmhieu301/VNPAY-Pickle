// ═══════════════════════════════════════════
// Pool Draw — Snake Draft / Pot System
// ═══════════════════════════════════════════

import type { TournamentTeamExtended } from '@/types';

export interface PoolDrawResult {
  poolLetter: string;
  teams: TournamentTeamExtended[];
}

/**
 * Chia bảng theo pot system (snake draft):
 * - Sort teams by seed
 * - Round 1: seed 1→A, 2→B, 3→C...
 * - Round 2 (snake): seed N+1→C, N+2→B, N+3→A...
 * - Đảm bảo hai hạt giống cao không cùng bảng
 */
export function drawPools(
  teams: TournamentTeamExtended[],
  numPools: number
): PoolDrawResult[] {
  const sorted = [...teams].sort(
    (a, b) => (a.seed_number || 999) - (b.seed_number || 999)
  );

  const pools: TournamentTeamExtended[][] = Array.from(
    { length: numPools },
    () => []
  );

  // Snake draft
  let direction = 1;
  let poolIdx = 0;

  for (const team of sorted) {
    pools[poolIdx].push(team);
    poolIdx += direction;

    if (poolIdx >= numPools) {
      poolIdx = numPools - 1;
      direction = -1;
    } else if (poolIdx < 0) {
      poolIdx = 0;
      direction = 1;
    }
  }

  return pools.map((teams, i) => ({
    poolLetter: String.fromCharCode(65 + i), // A, B, C...
    teams,
  }));
}

/**
 * Tính seed tối ưu bằng ELO trung bình
 */
export function calculateSeeds(
  teams: TournamentTeamExtended[]
): TournamentTeamExtended[] {
  return [...teams]
    .sort((a, b) => (b.avg_elo || 0) - (a.avg_elo || 0))
    .map((team, idx) => ({ ...team, seed_number: idx + 1 }));
}
