// ═══════════════════════════════════════════
// VNPAY Pickle — useLiveScoring Hook
// Realtime live scoring with offline queue + undo
// ═══════════════════════════════════════════

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  appendScoreLog, updateMatchScoreLive, fetchScoreLog,
  lockMatch, unlockMatch,
} from '@/lib/supabase/committeeApi';
import type { TournamentMatch, TournamentTeamExtended, ScoreLog } from '@/types';

const UNDO_WINDOW_MS = 10_000;
const OFFLINE_QUEUE_KEY = (matchId: string) => `score_queue_${matchId}`;

interface SetState {
  scoreA: number;
  scoreB: number;
}

interface UseLiveScoringReturn {
  currentSet: number;
  setScores: SetState[];
  completedSets: Array<{ a: number; b: number }>;
  isLocked: boolean;
  lockOwnerName: string | null;
  canUndo: boolean;
  undoSecondsLeft: number;
  isGamePoint: { team: 'A' | 'B'; score: string } | null;
  matchWinner: 'A' | 'B' | null;
  addPoint: (team: 'A' | 'B') => Promise<void>;
  undoPoint: () => Promise<boolean>;
  endSet: () => void;
  confirmEndMatch: (winner: 'A' | 'B') => Promise<void>;
  lockForMe: () => Promise<boolean>;
  unlockForMe: () => Promise<void>;
}

export function useLiveScoring(
  match: TournamentMatch,
  teams: TournamentTeamExtended[],
  currentUserId: string,
  options: {
    pointsTarget?: number;
    setsFormat?: 'bo1' | 'bo3' | 'bo5';
    isDirector?: boolean;
  } = {}
): UseLiveScoringReturn {
  const { pointsTarget = 11, setsFormat = 'bo3', isDirector = false } = options;
  const setsToWin = setsFormat === 'bo5' ? 3 : setsFormat === 'bo1' ? 1 : 2;

  const [currentSet, setCurrentSet] = useState(1);
  const [setScores, setSetScores] = useState<SetState[]>([{ scoreA: 0, scoreB: 0 }]);
  const [completedSets, setCompletedSets] = useState<Array<{ a: number; b: number }>>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockOwnerName, setLockOwnerName] = useState<string | null>(null);
  const [lastPointTime, setLastPointTime] = useState<number | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const [matchWinner, setMatchWinner] = useState<'A' | 'B' | null>(null);

  // Load existing score from DB on mount
  useEffect(() => {
    fetchScoreLog(match.id).then(logs => {
      if (logs.length === 0) return;
      // Reconstruct state from logs
      const maxSet = Math.max(...logs.map(l => l.set_number));
      const sets: Array<{ a: number; b: number }> = [];
      for (let s = 1; s < maxSet; s++) {
        const setLogs = logs.filter(l => l.set_number === s);
        const last = setLogs[setLogs.length - 1];
        if (last) sets.push({ a: last.score_a, b: last.score_b });
      }
      setCompletedSets(sets);
      setCurrentSet(maxSet);
      const currentSetLogs = logs.filter(l => l.set_number === maxSet);
      const lastLog = currentSetLogs[currentSetLogs.length - 1];
      if (lastLog) {
        setSetScores([{ scoreA: lastLog.score_a, scoreB: lastLog.score_b }]);
      }
    });

    // Check lock
    if (match.scoring_locked_by && match.scoring_locked_by !== currentUserId) {
      setIsLocked(true);
    }
  }, [match.id]);

  // Undo countdown timer
  useEffect(() => {
    if (lastPointTime === null) { setUndoSecondsLeft(0); return; }
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastPointTime;
      const left = Math.max(0, UNDO_WINDOW_MS - elapsed);
      setUndoSecondsLeft(Math.ceil(left / 1000));
      if (left === 0) { setLastPointTime(null); clearInterval(interval); }
    }, 200);
    return () => clearInterval(interval);
  }, [lastPointTime]);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-scoring-${match.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_matches',
        filter: `id=eq.${match.id}`,
      }, (payload) => {
        const updated = payload.new as TournamentMatch;
        if (updated.scoring_locked_by && updated.scoring_locked_by !== currentUserId) {
          setIsLocked(true);
        } else if (!updated.scoring_locked_by) {
          setIsLocked(false);
          setLockOwnerName(null);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [match.id, currentUserId]);

  // Offline queue: flush on reconnect
  useEffect(() => {
    const handleOnline = async () => {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY(match.id));
      if (!raw) return;
      const queue: Parameters<typeof appendScoreLog>[0][] = JSON.parse(raw);
      for (const item of queue) await appendScoreLog(item);
      localStorage.removeItem(OFFLINE_QUEUE_KEY(match.id));
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [match.id]);

  const current = setScores[0] ?? { scoreA: 0, scoreB: 0 };

  // Game point detection
  const isGamePoint = (() => {
    const { scoreA, scoreB } = current;
    const target = Math.max(pointsTarget, Math.max(scoreA, scoreB) + 1);
    const needsDiff2 = Math.max(scoreA, scoreB) >= pointsTarget - 1;
    if (scoreA === target - 1 && (!needsDiff2 || scoreA > scoreB)) {
      return { team: 'A' as const, score: `${scoreA}-${scoreB}` };
    }
    if (scoreB === target - 1 && (!needsDiff2 || scoreB > scoreA)) {
      return { team: 'B' as const, score: `${scoreA}-${scoreB}` };
    }
    return null;
  })();

  const checkSetEnd = useCallback((scoreA: number, scoreB: number): boolean => {
    const maxScore = Math.max(scoreA, scoreB);
    const minScore = Math.min(scoreA, scoreB);
    return maxScore >= pointsTarget && maxScore - minScore >= 2;
  }, [pointsTarget]);

  const getCurrentWins = useCallback(() => {
    let winsA = 0, winsB = 0;
    for (const s of completedSets) {
      if (s.a > s.b) winsA++; else winsB++;
    }
    return { winsA, winsB };
  }, [completedSets]);

  const savePointLog = useCallback(async (
    team: 'A' | 'B', scoreA: number, scoreB: number, action: ScoreLog['action'] = 'point'
  ) => {
    const params = {
      matchId: match.id,
      setNumber: currentSet,
      team,
      scoreA,
      scoreB,
      action,
      scoredBy: currentUserId,
    };
    if (!navigator.onLine) {
      const key = OFFLINE_QUEUE_KEY(match.id);
      const existing = JSON.parse(localStorage.getItem(key) ?? '[]');
      localStorage.setItem(key, JSON.stringify([...existing, params]));
      return;
    }
    await appendScoreLog(params);
  }, [match.id, currentSet, currentUserId]);

  const addPoint = useCallback(async (team: 'A' | 'B') => {
    if (isLocked || matchWinner) return;

    // Haptic
    try { navigator.vibrate?.(30); } catch {}

    const newScoreA = team === 'A' ? current.scoreA + 1 : current.scoreA;
    const newScoreB = team === 'B' ? current.scoreB + 1 : current.scoreB;

    setSetScores([{ scoreA: newScoreA, scoreB: newScoreB }]);
    setLastPointTime(Date.now());

    await savePointLog(team, newScoreA, newScoreB);

    // Update match scores in DB
    const allSets = [
      ...completedSets.map(s => ({ a: s.a, b: s.b })),
      { a: newScoreA, b: newScoreB },
    ];
    await updateMatchScoreLive({ matchId: match.id, setScores: allSets, status: 'live' });

    // Auto-detect set end
    if (checkSetEnd(newScoreA, newScoreB)) {
      const newCompleted = [...completedSets, { a: newScoreA, b: newScoreB }];
      const { winsA, winsB } = getCurrentWins();
      const wa = newScoreA > newScoreB ? winsA + 1 : winsA;
      const wb = newScoreB > newScoreA ? winsB + 1 : winsB;
      if (wa >= setsToWin || wb >= setsToWin) {
        setMatchWinner(wa >= setsToWin ? 'A' : 'B');
      } else {
        setCompletedSets(newCompleted);
        setCurrentSet(prev => prev + 1);
        setSetScores([{ scoreA: 0, scoreB: 0 }]);
      }
    }
  }, [isLocked, matchWinner, current, currentSet, completedSets, savePointLog, checkSetEnd, getCurrentWins, setsToWin, match.id]);

  const undoPoint = useCallback(async (): Promise<boolean> => {
    if (!lastPointTime || Date.now() - lastPointTime > UNDO_WINDOW_MS) return false;

    const newScoreA = Math.max(0, current.scoreA - (current.scoreA > 0 ? 1 : 0));
    const newScoreB = Math.max(0, current.scoreB - (current.scoreB > 0 ? 1 : 0));

    // Both cannot be reduced — find which was last
    // Read from score_log to know which team's point to remove
    const logs = await fetchScoreLog(match.id);
    const lastLog = logs.filter(l => l.action === 'point').pop();
    if (!lastLog) return false;

    const undoneA = lastLog.team === 'A' ? current.scoreA - 1 : current.scoreA;
    const undoneB = lastLog.team === 'B' ? current.scoreB - 1 : current.scoreB;

    setSetScores([{ scoreA: Math.max(0, undoneA), scoreB: Math.max(0, undoneB) }]);
    setLastPointTime(null);

    await savePointLog('A', Math.max(0, undoneA), Math.max(0, undoneB), 'undo');
    const allSets = [
      ...completedSets,
      { a: Math.max(0, undoneA), b: Math.max(0, undoneB) },
    ];
    await updateMatchScoreLive({ matchId: match.id, setScores: allSets, status: 'live' });
    return true;
  }, [lastPointTime, current, match.id, completedSets, savePointLog]);

  const endSet = useCallback(() => {
    setCompletedSets(prev => [...prev, { a: current.scoreA, b: current.scoreB }]);
    setCurrentSet(prev => prev + 1);
    setSetScores([{ scoreA: 0, scoreB: 0 }]);
  }, [current]);

  const confirmEndMatch = useCallback(async (winner: 'A' | 'B') => {
    setMatchWinner(winner);
    const { winsA, winsB } = getCurrentWins();
    const allSets = [...completedSets, { a: current.scoreA, b: current.scoreB }];

    // Find winner team id
    const teamAId = match.team_a_id;
    const teamBId = match.team_b_id;
    const winnerTeamId = winner === 'A' ? teamAId : teamBId;

    await updateMatchScoreLive({
      matchId: match.id,
      setScores: allSets,
      status: 'completed',
      winnerTeamId,
      completedAt: new Date().toISOString(),
    });
    await unlockMatch(match.id, currentUserId, isDirector);
  }, [completedSets, current, match, currentUserId, isDirector, getCurrentWins]);

  const lockForMe = useCallback(async (): Promise<boolean> => {
    const ok = await lockMatch(match.id, currentUserId);
    if (ok) { setIsLocked(false); }
    else { setIsLocked(true); }
    return ok;
  }, [match.id, currentUserId]);

  const unlockForMe = useCallback(async () => {
    await unlockMatch(match.id, currentUserId, isDirector);
    setIsLocked(false);
  }, [match.id, currentUserId, isDirector]);

  return {
    currentSet,
    setScores,
    completedSets,
    isLocked,
    lockOwnerName,
    canUndo: lastPointTime !== null && Date.now() - lastPointTime < UNDO_WINDOW_MS,
    undoSecondsLeft,
    isGamePoint,
    matchWinner,
    addPoint,
    undoPoint,
    endSet,
    confirmEndMatch,
    lockForMe,
    unlockForMe,
  };
}
