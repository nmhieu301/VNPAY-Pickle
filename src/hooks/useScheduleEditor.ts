// ═══════════════════════════════════════════
// VNPAY Pickle — useScheduleEditor Hook
// Drag-drop schedule management with undo
// ═══════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';
import { updateMatchSchedule, logScheduleChange } from '@/lib/supabase/committeeApi';
import { checkMoveConflicts } from '@/lib/utils/conflictChecker';
import type { TournamentMatch, ConflictResult } from '@/types';

const MAX_UNDO_STEPS = 20;

interface ScheduleSnapshot {
  matchId: string;
  court: number | null;
  time: string | null;
}

interface UseScheduleEditorReturn {
  matches: TournamentMatch[];
  setMatches: React.Dispatch<React.SetStateAction<TournamentMatch[]>>;
  canUndo: boolean;
  isSaving: boolean;
  moveMatch: (
    matchId: string,
    newCourt: number,
    newTimeISO: string,
    changedBy: string,
    options?: { matchDurationMinutes?: number; minRestMinutes?: number }
  ) => Promise<ConflictResult[]>;
  swapMatches: (matchIdA: string, matchIdB: string, changedBy: string) => Promise<void>;
  undo: () => Promise<void>;
  validateMove: (
    matchId: string,
    newCourt: number,
    newTimeISO: string,
    options?: { matchDurationMinutes?: number; minRestMinutes?: number }
  ) => ConflictResult[];
}

export function useScheduleEditor(
  initialMatches: TournamentMatch[]
): UseScheduleEditorReturn {
  const [matches, setMatches] = useState<TournamentMatch[]>(initialMatches);
  const [isSaving, setIsSaving] = useState(false);
  const undoStack = useRef<ScheduleSnapshot[][]>([]);

  const pushUndo = (snapshots: ScheduleSnapshot[]) => {
    undoStack.current = [
      ...undoStack.current.slice(-MAX_UNDO_STEPS + 1),
      snapshots,
    ];
  };

  const validateMove = useCallback((
    matchId: string,
    newCourt: number,
    newTimeISO: string,
    options: { matchDurationMinutes?: number; minRestMinutes?: number } = {}
  ): ConflictResult[] => {
    return checkMoveConflicts(matchId, newCourt, newTimeISO, matches, options);
  }, [matches]);

  const moveMatch = useCallback(async (
    matchId: string,
    newCourt: number,
    newTimeISO: string,
    changedBy: string,
    options: { matchDurationMinutes?: number; minRestMinutes?: number } = {}
  ): Promise<ConflictResult[]> => {
    const conflicts = checkMoveConflicts(matchId, newCourt, newTimeISO, matches, options);
    // Block on errors; allow warnings
    if (conflicts.some(c => c.severity === 'error')) return conflicts;

    const match = matches.find(m => m.id === matchId);
    if (!match) return [];

    // Save undo snapshot
    pushUndo([{ matchId, court: match.court_number, time: match.scheduled_time }]);

    // Optimistic update
    setMatches(prev => prev.map(m =>
      m.id === matchId
        ? { ...m, court_number: newCourt, scheduled_time: newTimeISO }
        : m
    ));

    // Persist to DB
    setIsSaving(true);
    await Promise.all([
      updateMatchSchedule(matchId, newCourt, newTimeISO),
      logScheduleChange({
        matchId,
        changedBy,
        oldCourt: match.court_number,
        newCourt,
        oldTime: match.scheduled_time,
        newTime: newTimeISO,
      }),
    ]);
    setIsSaving(false);

    return conflicts; // Return any warnings
  }, [matches]);

  const swapMatches = useCallback(async (
    matchIdA: string,
    matchIdB: string,
    changedBy: string
  ) => {
    const matchA = matches.find(m => m.id === matchIdA);
    const matchB = matches.find(m => m.id === matchIdB);
    if (!matchA || !matchB) return;

    // Save undo snapshot for both
    pushUndo([
      { matchId: matchIdA, court: matchA.court_number, time: matchA.scheduled_time },
      { matchId: matchIdB, court: matchB.court_number, time: matchB.scheduled_time },
    ]);

    // Swap
    setMatches(prev => prev.map(m => {
      if (m.id === matchIdA) return { ...m, court_number: matchB.court_number, scheduled_time: matchB.scheduled_time };
      if (m.id === matchIdB) return { ...m, court_number: matchA.court_number, scheduled_time: matchA.scheduled_time };
      return m;
    }));

    setIsSaving(true);
    await Promise.all([
      updateMatchSchedule(matchIdA, matchB.court_number, matchB.scheduled_time),
      updateMatchSchedule(matchIdB, matchA.court_number, matchA.scheduled_time),
      logScheduleChange({ matchId: matchIdA, changedBy, oldCourt: matchA.court_number, newCourt: matchB.court_number, oldTime: matchA.scheduled_time, newTime: matchB.scheduled_time }),
      logScheduleChange({ matchId: matchIdB, changedBy, oldCourt: matchB.court_number, newCourt: matchA.court_number, oldTime: matchB.scheduled_time, newTime: matchA.scheduled_time }),
    ]);
    setIsSaving(false);
  }, [matches]);

  const undo = useCallback(async () => {
    const stack = undoStack.current;
    if (stack.length === 0) return;

    const last = stack[stack.length - 1];
    undoStack.current = stack.slice(0, -1);

    // Restore
    setMatches(prev => prev.map(m => {
      const snap = last.find(s => s.matchId === m.id);
      if (!snap) return m;
      return { ...m, court_number: snap.court, scheduled_time: snap.time };
    }));

    setIsSaving(true);
    await Promise.all(last.map(snap =>
      updateMatchSchedule(snap.matchId, snap.court, snap.time)
    ));
    setIsSaving(false);
  }, []);

  return {
    matches,
    setMatches,
    canUndo: undoStack.current.length > 0,
    isSaving,
    moveMatch,
    swapMatches,
    undo,
    validateMove,
  };
}
