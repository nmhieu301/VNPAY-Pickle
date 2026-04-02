// ═══════════════════════════════════════════
// VNPAY Pickle — Fuzzy Player Search
// ═══════════════════════════════════════════

import type { Player, FuzzyMatchResult, FuzzyMatchStatus } from '@/types';

// Levenshtein distance
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalize(s: string): string {
  return s.toLowerCase().trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

// Score how well query matches player name
function matchScore(query: string, player: Player): number {
  const qNorm = normalize(query);
  const nameParts = [
    normalize(player.full_name),
    player.nickname ? normalize(player.nickname) : '',
    player.email ? normalize(player.email.split('@')[0]) : '',
  ];

  let best = Infinity;
  for (const part of nameParts) {
    if (!part) continue;
    // Exact contains → highest priority
    if (part.includes(qNorm) || qNorm.includes(part)) {
      best = Math.min(best, 0);
      break;
    }
    // Word match
    const words = part.split(/\s+/);
    for (const word of words) {
      const dist = levenshtein(qNorm, word);
      best = Math.min(best, dist);
    }
    // Full name distance
    best = Math.min(best, levenshtein(qNorm, part));
  }
  return best;
}

const MATCH_THRESHOLD = 2; // max Levenshtein distance for a match

export function fuzzySearchPlayers(
  query: string,
  players: Player[],
  limit = 5
): { player: Player; score: number }[] {
  if (!query.trim()) return [];
  const scored = players
    .map(p => ({ player: p, score: matchScore(query, p) }))
    .filter(x => x.score <= MATCH_THRESHOLD)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
  return scored;
}

function determineStatus(matches: { player: Player; score: number }[]): FuzzyMatchStatus {
  if (matches.length === 0) return 'not_found';
  if (matches.length === 1 || matches[0].score < matches[1]?.score) return 'matched';
  return 'ambiguous';
}

// ─── Parse bulk text ───
// Input lines like:
//   "Minh + Hùng"  → pair
//   "Phong"        → single
export function parseBulkText(text: string): Array<{ player: string; partner?: string }> {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split('+').map(p => p.trim());
      return { player: parts[0], partner: parts[1] };
    });
}

export function fuzzyMatchBulk(
  lines: Array<{ player: string; partner?: string }>,
  allPlayers: Player[]
): FuzzyMatchResult[] {
  return lines.map(line => {
    const playerMatches = fuzzySearchPlayers(line.player, allPlayers);
    const playerStatus = determineStatus(playerMatches);

    let partnerStatus: FuzzyMatchStatus | undefined;
    let partnerCandidates: Player[] | undefined;

    if (line.partner) {
      const pm = fuzzySearchPlayers(line.partner, allPlayers);
      partnerStatus = determineStatus(pm);
      partnerCandidates = pm.map(m => m.player);
    }

    return {
      rawText: line.partner ? `${line.player} + ${line.partner}` : line.player,
      status: playerStatus,
      candidates: playerMatches.map(m => m.player),
      selectedPlayer: playerStatus === 'matched' ? playerMatches[0].player : null,
      partnerText: line.partner,
      partnerStatus,
      partnerCandidates,
      selectedPartner:
        partnerStatus === 'matched'
          ? (partnerCandidates?.[0] ?? null)
          : null,
    } satisfies FuzzyMatchResult;
  });
}
