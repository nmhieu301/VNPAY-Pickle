// ═══════════════════════════════════════════
// VNPAY Pickle — ELO Calculation Algorithm
// ═══════════════════════════════════════════

import { PLACEMENT_MATCHES } from '@/lib/constants/tiers';

/**
 * K-factor dựa trên ELO và số trận đã đấu
 */
export function getKFactor(elo: number, totalMatches: number): number {
  if (totalMatches < PLACEMENT_MATCHES) return 40; // Placement matches
  if (elo < 1400) return 32;
  if (elo <= 1700) return 24;
  return 16;
}

/**
 * Tính xác suất thắng (Expected Score)
 * E_A = 1 / (1 + 10^((ELO_B - ELO_A) / 400))
 */
export function expectedScore(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/**
 * Score margin bonus
 * Thắng càng đậm → bonus càng cao (tối đa 1.2)
 */
export function scoreMarginMultiplier(winnerScore: number, loserScore: number): number {
  const diff = winnerScore - loserScore;
  if (diff >= 6) return 1.2;  // 11-5 hoặc hơn
  if (diff >= 3) return 1.1;  // 11-8 hoặc hơn
  return 1.0;                  // 11-9 trở lên (sát nút)
}

/**
 * Input cho tính ELO doubles
 */
export interface EloInput {
  teamAElo: number[];          // ELO của từng player team A
  teamBElo: number[];          // ELO của từng player team B
  teamAMatches: number[];      // Tổng trận đã đấu team A
  teamBMatches: number[];      // Tổng trận đã đấu team B
  teamAScore: number;
  teamBScore: number;
  isRanked: boolean;           // Có tính ELO không
}

export interface EloResult {
  teamAChanges: number[];      // ELO thay đổi cho từng player team A
  teamBChanges: number[];      // ELO thay đổi cho từng player team B
}

/**
 * Tính ELO thay đổi cho trận doubles
 */
export function calculateEloChanges(input: EloInput): EloResult {
  if (!input.isRanked) {
    return {
      teamAChanges: input.teamAElo.map(() => 0),
      teamBChanges: input.teamBElo.map(() => 0),
    };
  }

  // ELO trung bình team
  const avgA = input.teamAElo.reduce((a, b) => a + b, 0) / input.teamAElo.length;
  const avgB = input.teamBElo.reduce((a, b) => a + b, 0) / input.teamBElo.length;

  // Xác suất thắng
  const expectedA = expectedScore(avgA, avgB);
  const expectedB = 1 - expectedA;

  // Actual result: 1 = thắng, 0 = thua
  const teamAWon = input.teamAScore > input.teamBScore;
  const actualA = teamAWon ? 1 : 0;
  const actualB = teamAWon ? 0 : 1;

  // Score margin bonus
  const winnerScore = Math.max(input.teamAScore, input.teamBScore);
  const loserScore = Math.min(input.teamAScore, input.teamBScore);
  const marginBonus = scoreMarginMultiplier(winnerScore, loserScore);

  // Tính ELO change cho từng player
  const teamAChanges = input.teamAElo.map((elo, i) => {
    const k = getKFactor(elo, input.teamAMatches[i]);
    const change = k * (actualA - expectedA) * marginBonus;
    return Math.round(change);
  });

  const teamBChanges = input.teamBElo.map((elo, i) => {
    const k = getKFactor(elo, input.teamBMatches[i]);
    const change = k * (actualB - expectedB) * marginBonus;
    return Math.round(change);
  });

  return { teamAChanges, teamBChanges };
}

/**
 * Tính tier name dựa trên ELO
 */
export function calculateTier(elo: number): string {
  if (elo >= 2000) return 'challenger';
  if (elo >= 1700) return 'diamond';
  if (elo >= 1500) return 'platinum';
  if (elo >= 1300) return 'gold';
  if (elo >= 1100) return 'silver';
  if (elo >= 900) return 'bronze';
  return 'beginner';
}
