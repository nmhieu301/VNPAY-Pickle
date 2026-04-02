'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — LiveScoringPanel Component
// Mobile-first live scoring interface
// ═══════════════════════════════════════════

import { useEffect, useState, useRef } from 'react';
import { Lock, Wifi, WifiOff, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLiveScoring } from '@/hooks/useLiveScoring';
import { MatchControlBar } from './MatchControlBar';
import { updateMatchScoreLive } from '@/lib/supabase/committeeApi';
import type { TournamentMatch, TournamentTeamExtended, Tournament } from '@/types';

interface LiveScoringPanelProps {
  match: TournamentMatch;
  teams: TournamentTeamExtended[];
  tournament: Tournament;
  currentUserId: string;
  isDirector: boolean;
  onMatchEnd?: () => void;
}

function getTeamName(team: TournamentTeamExtended | undefined): string {
  if (!team) return 'TBD';
  if (team.team_name) return team.team_name;
  const p1 = team.player1?.full_name?.split(' ').pop() ?? '?';
  const p2 = team.player2?.full_name?.split(' ').pop();
  return p2 ? `${p1} + ${p2}` : p1;
}

const ROUND_LABELS: Record<string, string> = {
  pool: 'Vòng bảng', quarter: 'Tứ kết', semi: 'Bán kết',
  final: 'Chung kết', third_place: 'Tranh hạng 3', grand_final: 'Grand Final',
};

export function LiveScoringPanel({
  match, teams, tournament, currentUserId, isDirector, onMatchEnd,
}: LiveScoringPanelProps) {
  const teamA = teams.find(t => t.id === match.team_a_id);
  const teamB = teams.find(t => t.id === match.team_b_id);
  const [isOnline, setIsOnline] = useState(true);
  const [showSetEnd, setShowSetEnd] = useState<{ a: number; b: number } | null>(null);
  const [showMatchEnd, setShowMatchEnd] = useState<'A' | 'B' | null>(null);
  const [lockedByConfirmed, setLockedByConfirmed] = useState(false);
  const [timeoutActive, setTimeoutActive] = useState(false);
  const gamepointRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scoring = useLiveScoring(match, teams, currentUserId, {
    pointsTarget: tournament.points_target,
    setsFormat: tournament.sets_format,
    isDirector,
  });

  // Online/offline status
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Show set end popup
  useEffect(() => {
    if (scoring.matchWinner) {
      setShowMatchEnd(scoring.matchWinner);
      // Confetti!
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 }, colors: ['#4361ee', '#f72585', '#7209b7', '#4cc9f0'] });
      onMatchEnd?.();
    }
  }, [scoring.matchWinner]);

  // Lock on mount
  useEffect(() => {
    scoring.lockForMe().then(ok => setLockedByConfirmed(ok));
    return () => { scoring.unlockForMe(); };
  }, []);

  const currentScores = scoring.setScores[0] ?? { scoreA: 0, scoreB: 0 };
  const setWinsA = scoring.completedSets.filter(s => s.a > s.b).length;
  const setWinsB = scoring.completedSets.filter(s => s.b > s.a).length;

  const handleCancelMatch = async () => {
    await updateMatchScoreLive({ matchId: match.id, setScores: [], status: 'live' });
    window.history.back();
  };

  const gpTeam = scoring.isGamePoint?.team;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col select-none" style={{ touchAction: 'manipulation' }}>
      {/* Header */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--border-color)] px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--muted-fg)] font-medium">
            🏓 {match.court_number ? `Sân ${match.court_number}` : 'Chưa có sân'} — {ROUND_LABELS[match.round_type] ?? match.round_type}
          </p>
          <p className="text-sm font-bold">
            Set {scoring.currentSet}
            <span className="text-[var(--muted-fg)] font-normal">
              {' / '}{tournament.sets_format === 'bo5' ? 'Bo5' : tournament.sets_format === 'bo1' ? 'Bo1' : 'Bo3'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && <WifiOff className="w-4 h-4 text-red-400" />}
          {isOnline && <Wifi className="w-4 h-4 text-green-400" />}
          {scoring.isLocked && !lockedByConfirmed && (
            <div className="flex items-center gap-1 text-amber-400 text-xs">
              <Lock className="w-3.5 h-3.5" /> Bị khoá
            </div>
          )}
        </div>
      </div>

      {/* Game Point banner */}
      {gpTeam && (
        <div
          className="py-2 text-center text-sm font-bold animate-pulse"
          style={{ background: gpTeam === 'A' ? '#ef444420' : '#3b82f620', color: gpTeam === 'A' ? '#ef4444' : '#3b82f6' }}
        >
          ⚡ GAME POINT — {gpTeam === 'A' ? getTeamName(teamA) : getTeamName(teamB)}
        </div>
      )}

      {/* Set wins display */}
      <div className="flex justify-center gap-6 py-2">
        <div className="flex gap-1">
          {Array.from({ length: setWinsA }).map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-red-400" />
          ))}
        </div>
        <span className="text-xs text-[var(--muted-fg)]">Sets</span>
        <div className="flex gap-1">
          {Array.from({ length: setWinsB }).map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          ))}
        </div>
      </div>

      {/* Main scoring area */}
      <div className="flex-1 flex">
        {/* Team A */}
        <button
          onClick={() => scoring.addPoint('A')}
          disabled={scoring.isLocked || !!scoring.matchWinner}
          className="flex-1 flex flex-col items-center justify-center gap-4 active:scale-95 transition-transform"
          style={{
            background: gpTeam === 'A' ? 'radial-gradient(circle at center, rgba(239,68,68,0.15), transparent)' : 'transparent',
          }}
        >
          <div className="text-center px-4">
            <p className="text-base font-bold text-red-400 leading-tight">{getTeamName(teamA)}</p>
          </div>
          <div
            className="text-8xl font-black tabular-nums leading-none"
            style={{ color: '#ef4444', textShadow: '0 0 30px rgba(239,68,68,0.4)' }}
          >
            {currentScores.scoreA}
          </div>
          <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center text-red-400 text-2xl font-bold hover:bg-red-500/30 transition-colors">
            +1
          </div>
        </button>

        {/* Divider */}
        <div className="flex flex-col items-center justify-center px-2">
          <div className="h-48 w-px bg-[var(--border-color)]" />
          <span className="text-2xl font-light text-[var(--muted-fg)] my-3">:</span>
          <div className="h-48 w-px bg-[var(--border-color)]" />
        </div>

        {/* Team B */}
        <button
          onClick={() => scoring.addPoint('B')}
          disabled={scoring.isLocked || !!scoring.matchWinner}
          className="flex-1 flex flex-col items-center justify-center gap-4 active:scale-95 transition-transform"
          style={{
            background: gpTeam === 'B' ? 'radial-gradient(circle at center, rgba(59,130,246,0.15), transparent)' : 'transparent',
          }}
        >
          <div className="text-center px-4">
            <p className="text-base font-bold text-blue-400 leading-tight">{getTeamName(teamB)}</p>
          </div>
          <div
            className="text-8xl font-black tabular-nums leading-none"
            style={{ color: '#3b82f6', textShadow: '0 0 30px rgba(59,130,246,0.4)' }}
          >
            {currentScores.scoreB}
          </div>
          <div className="w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-500/40 flex items-center justify-center text-blue-400 text-2xl font-bold hover:bg-blue-500/30 transition-colors">
            +1
          </div>
        </button>
      </div>

      {/* Completed sets history */}
      {scoring.completedSets.length > 0 && (
        <div className="flex gap-3 justify-center px-4 py-2">
          {scoring.completedSets.map((s, i) => (
            <div key={i} className="text-xs text-[var(--muted-fg)] text-center">
              <span className="text-[var(--fg)] font-medium">{s.a}-{s.b}</span>
              <p className="text-[10px]">Set {i + 1}</p>
            </div>
          ))}
        </div>
      )}

      {/* Control bar */}
      <div className="p-4 border-t border-[var(--border-color)]">
        <MatchControlBar
          canUndo={scoring.canUndo}
          undoSecondsLeft={scoring.undoSecondsLeft}
          onUndo={scoring.undoPoint}
          onTimeout={() => setTimeoutActive(true)}
          onEndSet={scoring.endSet}
          onCancelMatch={handleCancelMatch}
          disabled={scoring.isLocked || !!scoring.matchWinner}
        />
      </div>

      {/* Lock overlay */}
      {scoring.isLocked && !lockedByConfirmed && (
        <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-6">
          <div className="bg-[var(--card-bg)] border border-amber-500/40 rounded-2xl p-6 text-center max-w-sm w-full">
            <Lock className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-2">Trận đang được ghi bởi người khác</h3>
            <p className="text-sm text-[var(--muted-fg)] mb-4">
              Một committee member khác đang ghi điểm trận này.
            </p>
            {isDirector && (
              <button
                onClick={() => scoring.lockForMe().then(ok => setLockedByConfirmed(ok))}
                className="btn btn-gradient w-full"
              >
                Override (Director)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Timeout modal */}
      {timeoutActive && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="bg-[var(--card-bg)] rounded-2xl p-6 text-center">
            <Clock className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <p className="font-bold text-lg">Timeout</p>
            <p className="text-sm text-[var(--muted-fg)] mb-4">Đồng hồ đã dừng</p>
            <button onClick={() => setTimeoutActive(false)} className="btn btn-gradient px-8">Tiếp tục</button>
          </div>
        </div>
      )}

      {/* Match winner popup */}
      {showMatchEnd && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-6">
          <div className="bg-[var(--card-bg)] border border-[var(--primary)]/40 rounded-2xl p-8 text-center max-w-sm w-full">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-xl font-black mb-2">
              {showMatchEnd === 'A' ? getTeamName(teamA) : getTeamName(teamB)} thắng!
            </h2>
            <p className="text-[var(--muted-fg)] text-sm mb-2">
              {scoring.completedSets.filter(s => s.a > s.b).length}-{scoring.completedSets.filter(s => s.b > s.a).length} sets
            </p>
            <div className="flex gap-2 mt-4">
              {scoring.completedSets.map((s, i) => (
                <div key={i} className={`flex-1 rounded-lg p-2 text-xs text-center font-bold ${s.a > s.b ? 'bg-red-400/20 text-red-400' : 'bg-blue-400/20 text-blue-400'}`}>
                  {s.a}-{s.b}
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowMatchEnd(null); scoring.confirmEndMatch(showMatchEnd); }}
              className="btn btn-gradient w-full mt-6"
            >
              ✅ Xác nhận kết quả
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
