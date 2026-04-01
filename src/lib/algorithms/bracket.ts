// ═══════════════════════════════════════════
// Single & Double Elimination Bracket Generator
// ═══════════════════════════════════════════

import type { TournamentTeamExtended, TournamentMatch, MatchRoundType } from '@/types';

export interface GeneratedMatch {
  round_type: MatchRoundType;
  round_number: number;
  match_number: number;
  team_a_id: string | null; // null = TBD or BYE
  team_b_id: string | null;
  next_winner_match?: number; // index in array
  next_winner_side?: 'A' | 'B';
  next_loser_match?: number;  // for double elim
  next_loser_side?: 'A' | 'B';
}

/**
 * Tính số vòng cần thiết cho N đội
 */
function numRounds(n: number): number {
  return Math.ceil(Math.log2(n));
}

/**
 * Tính số BYE cần thêm vào (fill lên lũy thừa 2 gần nhất)
 */
function numByes(n: number): number {
  const rounds = numRounds(n);
  return Math.pow(2, rounds) - n;
}

/**
 * Seeding order cho single elimination:
 * Hạt giống 1 vs hạt giống cuối, 2 vs n-1, ...
 * → Standard bracket draw
 */
function getSeedingOrder(n: number): number[] {
  if (n === 1) return [1];
  const half = n / 2;
  const order: number[] = [];
  const top = getSeedingOrder(half);
  for (let i = 0; i < top.length; i++) {
    order.push(top[i]);
    order.push(n + 1 - top[i]);
  }
  return order;
}

/**
 * Generate Single Elimination bracket
 */
export function generateSEBracket(
  teams: TournamentTeamExtended[],
  hasThirdPlace: boolean = true
): GeneratedMatch[] {
  const n = teams.length;
  if (n < 2) return [];

  // Sort teams by seed
  const sorted = [...teams].sort((a, b) => (a.seed_number || 99) - (b.seed_number || 99));
  const byes = numByes(n);
  const totalSlots = n + byes;
  
  // Seeding order
  const seedOrder = getSeedingOrder(totalSlots);
  // Map slot → team (null = BYE)
  const slots: (string | null)[] = seedOrder.map(seed => {
    if (seed > n) return null; // BYE
    return sorted[seed - 1]?.id || null;
  });

  const matches: GeneratedMatch[] = [];
  const rounds = numRounds(totalSlots);

  // Round 1: pair up slots
  const r1Count = totalSlots / 2;
  for (let i = 0; i < r1Count; i++) {
    const teamA = slots[i * 2];
    const teamB = slots[i * 2 + 1];
    
    matches.push({
      round_type: 'winner_r1',
      round_number: 1,
      match_number: i + 1,
      team_a_id: teamA,
      team_b_id: teamB,
    });
  }

  // Build subsequent rounds
  let prevRoundStart = 0;
  let prevRoundCount = r1Count;

  for (let r = 2; r <= rounds; r++) {
    const roundCount = prevRoundCount / 2;
    const isFinal = r === rounds;
    const isSemi = r === rounds - 1;
    
    for (let i = 0; i < roundCount; i++) {
      const roundType: MatchRoundType = isFinal
        ? 'final'
        : isSemi && roundCount === 2
        ? 'semi'
        : roundCount === 4
        ? 'quarter'
        : `winner_r${r}` as MatchRoundType;

      const matchIdx = matches.length;
      matches.push({
        round_type: roundType,
        round_number: r,
        match_number: i + 1,
        team_a_id: null, // TBD
        team_b_id: null,
      });

      // Link previous round matches to this one
      const feedA = prevRoundStart + i * 2;
      const feedB = prevRoundStart + i * 2 + 1;
      if (matches[feedA]) {
        matches[feedA].next_winner_match = matchIdx;
        matches[feedA].next_winner_side = 'A';
      }
      if (matches[feedB]) {
        matches[feedB].next_winner_match = matchIdx;
        matches[feedB].next_winner_side = 'B';
      }
    }

    prevRoundStart += prevRoundCount;
    prevRoundCount = roundCount;
  }

  // Third place match
  if (hasThirdPlace && rounds >= 2) {
    const semiMatches = matches.filter(m => m.round_type === 'semi');
    if (semiMatches.length === 2) {
      matches.push({
        round_type: 'third_place',
        round_number: rounds,
        match_number: 99,
        team_a_id: null,
        team_b_id: null,
      });
    }
  }

  return matches;
}

/**
 * Generate Double Elimination bracket
 * Winners bracket + Losers bracket + Grand Final
 */
export function generateDEBracket(teams: TournamentTeamExtended[]): GeneratedMatch[] {
  const n = teams.length;
  if (n < 2) return [];

  const wMatches: GeneratedMatch[] = [];
  const lMatches: GeneratedMatch[] = [];

  const sorted = [...teams].sort((a, b) => (a.seed_number || 99) - (b.seed_number || 99));
  const byes = numByes(n);
  const totalSlots = n + byes;
  const rounds = numRounds(totalSlots);

  // Winners bracket R1
  const seedOrder = getSeedingOrder(totalSlots);
  const slots: (string | null)[] = seedOrder.map(seed =>
    seed > n ? null : sorted[seed - 1]?.id || null
  );

  const r1Count = totalSlots / 2;
  for (let i = 0; i < r1Count; i++) {
    wMatches.push({
      round_type: 'winner_r1',
      round_number: 1,
      match_number: i + 1,
      team_a_id: slots[i * 2],
      team_b_id: slots[i * 2 + 1],
    });
  }

  // Winners subsequent rounds
  let prevWStart = 0;
  let prevWCount = r1Count;

  for (let r = 2; r <= rounds; r++) {
    const count = prevWCount / 2;
    const isFinal = r === rounds;
    for (let i = 0; i < count; i++) {
      const roundType: MatchRoundType = isFinal ? 'final' 
        : count === 2 ? 'semi' 
        : count === 4 ? 'quarter' 
        : `winner_r${r}` as MatchRoundType;
      const idx = wMatches.length;
      wMatches.push({ round_type: roundType, round_number: r, match_number: i+1, team_a_id: null, team_b_id: null });
      const fA = prevWStart + i * 2;
      const fB = prevWStart + i * 2 + 1;
      if (wMatches[fA]) { wMatches[fA].next_winner_match = idx; wMatches[fA].next_winner_side = 'A'; }
      if (wMatches[fB]) { wMatches[fB].next_winner_match = idx; wMatches[fB].next_winner_side = 'B'; }
    }
    prevWStart += prevWCount;
    prevWCount = count;
  }

  // Losers bracket (simplified: loser_r1, loser_r2, ...)
  let loserRound = 1;
  let loserCount = r1Count / 2;
  for (let rc = loserCount; rc >= 1; rc = Math.floor(rc / 2)) {
    for (let i = 0; i < rc; i++) {
      lMatches.push({
        round_type: `loser_r${loserRound}` as MatchRoundType,
        round_number: loserRound,
        match_number: i + 1,
        team_a_id: null,
        team_b_id: null,
      });
    }
    loserRound++;
    if (rc === 1) break;
  }

  // Grand Final
  const grandFinal: GeneratedMatch = {
    round_type: 'grand_final',
    round_number: rounds + loserRound,
    match_number: 1,
    team_a_id: null,
    team_b_id: null,
  };

  return [...wMatches, ...lMatches, grandFinal];
}
