// ═══════════════════════════════════════════
// VNPAY Pickle — Schedule Conflict Checker
// ═══════════════════════════════════════════

import type { TournamentMatch, TournamentTeamExtended, ConflictResult } from '@/types';

function getMatchEndTime(match: TournamentMatch, durationMinutes = 45): Date | null {
  if (!match.scheduled_time) return null;
  const start = new Date(match.scheduled_time);
  return new Date(start.getTime() + durationMinutes * 60_000);
}

function getMatchStart(match: TournamentMatch): Date | null {
  if (!match.scheduled_time) return null;
  return new Date(match.scheduled_time);
}

function rangesOverlap(
  start1: Date, end1: Date,
  start2: Date, end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

function getPlayersInMatch(match: TournamentMatch): string[] {
  const ids: string[] = [];
  const push = (t: TournamentTeamExtended | undefined) => {
    if (!t) return;
    if (t.player1_id) ids.push(t.player1_id);
    if (t.player2_id) ids.push(t.player2_id);
  };
  push(match.team_a);
  push(match.team_b);
  return ids;
}

/**
 * Check if moving matchId to (newCourt, newTime) causes conflicts.
 */
export function checkMoveConflicts(
  matchId: string,
  newCourt: number,
  newTimeISO: string,
  allMatches: TournamentMatch[],
  options: {
    matchDurationMinutes?: number;
    minRestMinutes?: number;
  } = {}
): ConflictResult[] {
  const { matchDurationMinutes = 45, minRestMinutes = 10 } = options;
  const results: ConflictResult[] = [];
  const newStart = new Date(newTimeISO);
  const newEnd = new Date(newStart.getTime() + matchDurationMinutes * 60_000);

  const movingMatch = allMatches.find(m => m.id === matchId);
  if (!movingMatch) return results;

  const movingPlayers = new Set(getPlayersInMatch(movingMatch));

  for (const match of allMatches) {
    if (match.id === matchId) continue;
    if (match.status === 'completed' || match.status === 'cancelled') continue;

    const mStart = getMatchStart(match);
    const mEnd = getMatchEndTime(match, matchDurationMinutes);
    if (!mStart || !mEnd) continue;

    // ── Court conflict ──
    if (match.court_number === newCourt && rangesOverlap(newStart, newEnd, mStart, mEnd)) {
      results.push({
        severity: 'error',
        message: `Sân ${newCourt} đã có trận khác trong khung giờ này`,
        conflictMatchId: match.id,
      });
    }

    // ── Player conflict ──
    const otherPlayers = getPlayersInMatch(match);
    const sharedPlayers = otherPlayers.filter(p => movingPlayers.has(p));
    if (sharedPlayers.length > 0 && rangesOverlap(newStart, newEnd, mStart, mEnd)) {
      results.push({
        severity: 'error',
        message: `Cầu thủ đang đấu trận khác ở cùng khung giờ`,
        conflictMatchId: match.id,
      });
    }

    // ── Rest time warning ──
    for (const pid of sharedPlayers) {
      const restMs = Math.min(
        Math.abs(newStart.getTime() - mEnd.getTime()),
        Math.abs(mStart.getTime() - newEnd.getTime())
      );
      const restMin = restMs / 60_000;
      if (restMin > 0 && restMin < minRestMinutes) {
        results.push({
          severity: 'warning',
          message: `Cầu thủ chỉ có ${Math.round(restMin)} phút nghỉ (yêu cầu ${minRestMinutes} phút)`,
          conflictMatchId: match.id,
        });
      }
    }
  }

  return results;
}

/**
 * Build a time-slot occupancy map for the schedule grid.
 * Returns a Map<`court-slot`, matchId>
 */
export function buildOccupancyMap(
  matches: TournamentMatch[],
  slotMinutes = 30
): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of matches) {
    if (!m.scheduled_time || !m.court_number) continue;
    const start = new Date(m.scheduled_time);
    const slotKey = `${m.court_number}-${Math.floor(start.getTime() / (slotMinutes * 60_000))}`;
    map.set(slotKey, m.id);
  }
  return map;
}
