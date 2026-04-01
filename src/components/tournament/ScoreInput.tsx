'use client';

import { useState } from 'react';
import { TournamentTeamExtended, TournamentMatch } from '@/types';
import { validateSet, validateMatch } from '@/lib/algorithms/scoreValidation';
import { useTournamentStore } from '@/lib/tournamentStore';
import { useAppStore } from '@/lib/store';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface Props {
  match: TournamentMatch;
  teams: TournamentTeamExtended[];
  setsFormat: 'bo1' | 'bo3' | 'bo5';
  pointsTarget: number;
  onClose?: () => void;
}

const MAX_SETS = { bo1: 1, bo3: 3, bo5: 5 };

export function ScoreInput({ match, teams, setsFormat, pointsTarget, onClose }: Props) {
  const updateMatchResult = useTournamentStore(s => s.updateMatchResult);
  const getPlayer = useAppStore(s => s.getPlayer);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxSets = MAX_SETS[setsFormat];
  const [scores, setScores] = useState<Array<{ a: string; b: string }>>(
    Array.from({ length: maxSets }, () => ({ a: '', b: '' }))
  );

  function getTeamLabel(teamId: string | null): string {
    if (!teamId) return 'TBD';
    const team = teams.find(t => t.id === teamId);
    if (!team) return 'TBD';
    if (team.team_name) return team.team_name;
    const p1 = team.player1_id ? getPlayer(team.player1_id) : null;
    const p2 = team.player2_id ? getPlayer(team.player2_id) : null;
    const n1 = p1?.nickname || p1?.full_name || '?';
    const n2 = p2 ? (p2.nickname || p2.full_name) : null;
    return n2 ? `${n1} + ${n2}` : n1;
  }

  const teamALabel = getTeamLabel(match.team_a_id);
  const teamBLabel = getTeamLabel(match.team_b_id);

  // Validate each set for live feedback
  const setValidations = scores.map(s => {
    const a = parseInt(s.a);
    const b = parseInt(s.b);
    if (isNaN(a) || isNaN(b) || (s.a === '' && s.b === '')) return null;
    return validateSet(a, b, pointsTarget);
  });

  const handleScoreChange = (setIdx: number, side: 'a' | 'b', val: string) => {
    setScores(prev => prev.map((s, i) => i === setIdx ? { ...s, [side]: val } : s));
    setError(null);
  };

  const handleSave = async () => {
    const filledSets = scores
      .map(s => ({ a: parseInt(s.a), b: parseInt(s.b) }))
      .filter(s => !isNaN(s.a) && !isNaN(s.b));

    if (filledSets.length === 0) {
      setError('Vui lòng nhập điểm ít nhất 1 set');
      return;
    }

    const validation = validateMatch(filledSets, setsFormat, pointsTarget);
    if (!validation.valid) {
      setError(validation.error || 'Điểm số không hợp lệ');
      return;
    }

    const winnerId = validation.winner === 'A' ? match.team_a_id : match.team_b_id;
    if (!winnerId) { setError('Không xác định được đội thắng'); return; }

    setSaving(true);
    const ok = await updateMatchResult(match.id, match.event_id, filledSets, winnerId);
    setSaving(false);

    if (ok) {
      onClose?.();
    } else {
      setError('Lỗi lưu điểm, vui lòng thử lại');
    }
  };

  // Calculate current sets won
  let setsA = 0, setsB = 0;
  for (const v of setValidations) {
    if (v?.valid) {
      if (v.winner === 'A') setsA++;
      else if (v.winner === 'B') setsB++;
    }
  }
  const setsNeeded = setsFormat === 'bo1' ? 1 : setsFormat === 'bo3' ? 2 : 3;
  const currentWinner = setsA >= setsNeeded ? teamALabel : setsB >= setsNeeded ? teamBLabel : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-center text-xl font-bold">{setsA}</div>
        <div className="flex-1 text-center">
          <div className="text-sm text-[var(--muted-fg)] mb-1">{setsFormat.toUpperCase()} · {pointsTarget} điểm</div>
          <div className="text-xs text-[var(--muted-fg)]">{teamALabel} vs {teamBLabel}</div>
        </div>
        <div className="text-center text-xl font-bold">{setsB}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-1">
        <div className="text-center text-sm font-medium truncate">{teamALabel}</div>
        <div className="text-center text-sm font-medium truncate">{teamBLabel}</div>
      </div>

      <div className="space-y-3">
        {scores.map((score, idx) => {
          const v = setValidations[idx];
          const hasData = score.a !== '' || score.b !== '';
          return (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs font-medium text-[var(--muted-fg)] w-12">Set {idx + 1}</span>
              <input
                type="number"
                min="0"
                max="99"
                value={score.a}
                onChange={e => handleScoreChange(idx, 'a', e.target.value)}
                className={`input text-center font-bold text-lg flex-1 ${v && hasData && !v.valid ? 'error' : ''} ${v?.valid && v.winner === 'A' ? 'border-green-400' : ''}`}
                placeholder="0"
              />
              <span className="text-[var(--muted-fg)] font-bold">:</span>
              <input
                type="number"
                min="0"
                max="99"
                value={score.b}
                onChange={e => handleScoreChange(idx, 'b', e.target.value)}
                className={`input text-center font-bold text-lg flex-1 ${v && hasData && !v.valid ? 'error' : ''} ${v?.valid && v.winner === 'B' ? 'border-green-400' : ''}`}
                placeholder="0"
              />
              <div className="w-5">
                {hasData && v && (
                  v.valid
                    ? <CheckCircle className="w-4 h-4 text-green-500" />
                    : <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {currentWinner && (
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
          <p className="text-green-700 dark:text-green-300 font-bold">
            🏆 {currentWinner} thắng!
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">{setsA} – {setsB} (sets)</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !currentWinner}
        className="btn btn-gradient w-full"
      >
        {saving ? 'Đang lưu...' : '✅ Xác nhận kết quả'}
      </button>

      <div className="text-xs text-[var(--muted-fg)] text-center space-y-0.5">
        <p>Luật USA Pickleball 2025: thắng cách 2 điểm · deuce cho phép vượt target</p>
        <p>VD hợp lệ: 11-9, 11-7, 12-10 | Không hợp lệ: 11-10, 10-8</p>
      </div>
    </div>
  );
}
