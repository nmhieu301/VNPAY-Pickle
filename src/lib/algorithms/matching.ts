// ═══════════════════════════════════════════
// VNPAY Pickle — Matching Algorithm
// Chia cặp Random + Tier-balanced
// Dùng tier (0–4) thay cho ELO rating
// ═══════════════════════════════════════════

import { Player, CourtAssignment, MatchingResult } from '@/types';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Chia cặp ngẫu nhiên */
export function randomMatching(
  players: Player[],
  numCourts: number,
  isDoubles: boolean = true
): MatchingResult {
  const playersPerCourt = isDoubles ? 4 : 2;
  const totalSlots = numCourts * playersPerCourt;
  const shuffled = shuffle(players);
  const activePlayers = shuffled.slice(0, totalSlots);
  const waiting = shuffled.slice(totalSlots);
  const courts: CourtAssignment[] = [];

  for (let c = 0; c < numCourts; c++) {
    const courtPlayers = activePlayers.slice(c * playersPerCourt, (c + 1) * playersPerCourt);
    if (courtPlayers.length < playersPerCourt) break;
    const half = playersPerCourt / 2;
    const teamA = courtPlayers.slice(0, half);
    const teamB = courtPlayers.slice(half);
    const tA = teamA.reduce((sum, p) => sum + (p.tier ?? 0), 0);
    const tB = teamB.reduce((sum, p) => sum + (p.tier ?? 0), 0);
    courts.push({ court_number: c + 1, team_a: teamA, team_b: teamB, team_a_tier: tA, team_b_tier: tB, tier_diff: Math.abs(tA - tB) });
  }

  return { courts, waiting, totalTierDiff: courts.reduce((sum, c) => sum + c.tier_diff, 0) };
}

/**
 * Chia cặp cân bằng Tier ⭐ (mặc định)
 * Sắp theo tier giảm dần, ghép xen kẽ cao-thấp.
 * Đổi: team A = [cao nhất + thấp nhất], team B = [2 trung bình]
 */
export function eloBalancedMatching(
  players: Player[],
  numCourts: number,
  isDoubles: boolean = true
): MatchingResult {
  const playersPerCourt = isDoubles ? 4 : 2;
  const totalSlots = numCourts * playersPerCourt;
  const sorted = [...players].sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0));
  const activePlayers = sorted.slice(0, totalSlots);
  const waiting = sorted.slice(totalSlots);

  if (!isDoubles) return singleMatching(activePlayers, waiting, numCourts);
  return doublesMatching(activePlayers, waiting, numCourts);
}

function singleMatching(players: Player[], waiting: Player[], numCourts: number): MatchingResult {
  const courts: CourtAssignment[] = [];
  for (let c = 0; c < numCourts && c * 2 + 1 < players.length; c++) {
    const p1 = players[c * 2];
    const p2 = players[c * 2 + 1];
    const t1 = p1.tier ?? 0;
    const t2 = p2.tier ?? 0;
    courts.push({ court_number: c + 1, team_a: [p1], team_b: [p2], team_a_tier: t1, team_b_tier: t2, tier_diff: Math.abs(t1 - t2) });
  }
  return { courts, waiting, totalTierDiff: courts.reduce((sum, c) => sum + c.tier_diff, 0) };
}

function doublesMatching(players: Player[], waiting: Player[], numCourts: number): MatchingResult {
  const courts: CourtAssignment[] = [];
  for (let c = 0; c < numCourts; c++) {
    const base = c * 4;
    if (base + 3 >= players.length) break;
    const p = [players[base], players[base + 1], players[base + 2], players[base + 3]];
    const teamA = [p[0], p[3]]; // cao nhất + thấp nhất
    const teamB = [p[1], p[2]]; // 2 trung bình
    const tA = teamA.reduce((sum, pl) => sum + (pl.tier ?? 0), 0);
    const tB = teamB.reduce((sum, pl) => sum + (pl.tier ?? 0), 0);
    courts.push({ court_number: c + 1, team_a: teamA, team_b: teamB, team_a_tier: tA, team_b_tier: tB, tier_diff: Math.abs(tA - tB) });
  }
  return { courts, waiting, totalTierDiff: courts.reduce((sum, c) => sum + c.tier_diff, 0) };
}

/** Hoán đổi 2 player giữa các sân (điều chỉnh thủ công) */
export function swapPlayers(
  result: MatchingResult,
  court1Index: number, team1: 'A' | 'B', player1Index: number,
  court2Index: number, team2: 'A' | 'B', player2Index: number
): MatchingResult {
  const courts = result.courts.map(c => ({ ...c, team_a: [...c.team_a], team_b: [...c.team_b] }));
  const c1 = courts[court1Index];
  const c2 = courts[court2Index];
  const arr1 = team1 === 'A' ? c1.team_a : c1.team_b;
  const arr2 = team2 === 'A' ? c2.team_a : c2.team_b;
  const temp = arr1[player1Index];
  arr1[player1Index] = arr2[player2Index];
  arr2[player2Index] = temp;

  courts.forEach(c => {
    c.team_a_tier = c.team_a.reduce((sum, p) => sum + (p.tier ?? 0), 0);
    c.team_b_tier = c.team_b.reduce((sum, p) => sum + (p.tier ?? 0), 0);
    c.tier_diff = Math.abs(c.team_a_tier - c.team_b_tier);
  });

  return { courts, waiting: [...result.waiting], totalTierDiff: courts.reduce((sum, c) => sum + c.tier_diff, 0) };
}
