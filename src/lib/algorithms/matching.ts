// ═══════════════════════════════════════════
// VNPAY Pickle — Matching Algorithm
// Chia cặp Random + ELO-balanced
// ═══════════════════════════════════════════

import { Player, CourtAssignment, MatchingResult } from '@/types';

/**
 * Fisher-Yates Shuffle
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Chia cặp ngẫu nhiên (Random)
 */
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
    const courtPlayers = activePlayers.slice(
      c * playersPerCourt,
      (c + 1) * playersPerCourt
    );

    if (courtPlayers.length < playersPerCourt) break;

    const half = playersPerCourt / 2;
    const teamA = courtPlayers.slice(0, half);
    const teamB = courtPlayers.slice(half);

    const teamAElo = teamA.reduce((sum, p) => sum + p.elo_rating, 0);
    const teamBElo = teamB.reduce((sum, p) => sum + p.elo_rating, 0);

    courts.push({
      court_number: c + 1,
      team_a: teamA,
      team_b: teamB,
      team_a_elo: teamAElo,
      team_b_elo: teamBElo,
      elo_diff: Math.abs(teamAElo - teamBElo),
    });
  }

  return {
    courts,
    waiting,
    totalEloDiff: courts.reduce((sum, c) => sum + c.elo_diff, 0),
  };
}

/**
 * Chia cặp cân bằng ELO (Recommended ⭐)
 * Mục tiêu: |ELO_team_A - ELO_team_B| < 50
 */
export function eloBalancedMatching(
  players: Player[],
  numCourts: number,
  isDoubles: boolean = true
): MatchingResult {
  const playersPerCourt = isDoubles ? 4 : 2;
  const totalSlots = numCourts * playersPerCourt;

  // Sort by ELO descending
  const sorted = [...players].sort((a, b) => b.elo_rating - a.elo_rating);
  const activePlayers = sorted.slice(0, totalSlots);
  const waiting = sorted.slice(totalSlots);

  if (!isDoubles) {
    // Singles: ghép 2 người có ELO gần nhau
    return singleMatching(activePlayers, waiting, numCourts);
  }

  // Doubles: tìm cách chia cặp tối ưu
  return doublesMatching(activePlayers, waiting, numCourts);
}

function singleMatching(
  players: Player[],
  waiting: Player[],
  numCourts: number
): MatchingResult {
  const courts: CourtAssignment[] = [];

  for (let c = 0; c < numCourts && c * 2 + 1 < players.length; c++) {
    const p1 = players[c * 2];
    const p2 = players[c * 2 + 1];

    courts.push({
      court_number: c + 1,
      team_a: [p1],
      team_b: [p2],
      team_a_elo: p1.elo_rating,
      team_b_elo: p2.elo_rating,
      elo_diff: Math.abs(p1.elo_rating - p2.elo_rating),
    });
  }

  return {
    courts,
    waiting,
    totalEloDiff: courts.reduce((sum, c) => sum + c.elo_diff, 0),
  };
}

function doublesMatching(
  players: Player[],
  waiting: Player[],
  numCourts: number
): MatchingResult {
  const courts: CourtAssignment[] = [];

  // Greedy approach: xen kẽ ELO cao-thấp để cân bằng
  // Player sorted by ELO: [1, 2, 3, 4, 5, 6, 7, 8]
  // Court 1: Team A = [1, 4], Team B = [2, 3]
  // Court 2: Team A = [5, 8], Team B = [6, 7]
  for (let c = 0; c < numCourts; c++) {
    const base = c * 4;
    if (base + 3 >= players.length) break;

    const p = [players[base], players[base + 1], players[base + 2], players[base + 3]];

    // Team A: highest + lowest, Team B: middle two
    const teamA = [p[0], p[3]];
    const teamB = [p[1], p[2]];

    const teamAElo = teamA.reduce((sum, pl) => sum + pl.elo_rating, 0);
    const teamBElo = teamB.reduce((sum, pl) => sum + pl.elo_rating, 0);

    courts.push({
      court_number: c + 1,
      team_a: teamA,
      team_b: teamB,
      team_a_elo: teamAElo,
      team_b_elo: teamBElo,
      elo_diff: Math.abs(teamAElo - teamBElo),
    });
  }

  return {
    courts,
    waiting,
    totalEloDiff: courts.reduce((sum, c) => sum + c.elo_diff, 0),
  };
}

/**
 * Swap 2 player giữa các sân (manual adjust)
 */
export function swapPlayers(
  result: MatchingResult,
  court1Index: number,
  team1: 'A' | 'B',
  player1Index: number,
  court2Index: number,
  team2: 'A' | 'B',
  player2Index: number
): MatchingResult {
  const courts = result.courts.map(c => ({
    ...c,
    team_a: [...c.team_a],
    team_b: [...c.team_b],
  }));

  const c1 = courts[court1Index];
  const c2 = courts[court2Index];

  const arr1 = team1 === 'A' ? c1.team_a : c1.team_b;
  const arr2 = team2 === 'A' ? c2.team_a : c2.team_b;

  // Swap
  const temp = arr1[player1Index];
  arr1[player1Index] = arr2[player2Index];
  arr2[player2Index] = temp;

  // Recalculate ELOs
  courts.forEach(c => {
    c.team_a_elo = c.team_a.reduce((sum, p) => sum + p.elo_rating, 0);
    c.team_b_elo = c.team_b.reduce((sum, p) => sum + p.elo_rating, 0);
    c.elo_diff = Math.abs(c.team_a_elo - c.team_b_elo);
  });

  return {
    courts,
    waiting: [...result.waiting],
    totalEloDiff: courts.reduce((sum, c) => sum + c.elo_diff, 0),
  };
}
