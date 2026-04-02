'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — MatchControlBar Component
// Undo, Timeout, Set End, Cancel match
// ═══════════════════════════════════════════

import { useState } from 'react';
import { Undo2, Clock, CheckCircle2, XCircle, TimerReset } from 'lucide-react';

interface MatchControlBarProps {
  canUndo: boolean;
  undoSecondsLeft: number;
  onUndo: () => Promise<boolean>;
  onTimeout: () => void;
  onEndSet: () => void;
  onCancelMatch: () => void;
  disabled?: boolean;
}

export function MatchControlBar({
  canUndo, undoSecondsLeft, onUndo, onTimeout, onEndSet, onCancelMatch, disabled,
}: MatchControlBarProps) {
  const [undoing, setUndoing] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const handleUndo = async () => {
    if (!canUndo) return;
    setUndoing(true);
    const success = await onUndo();
    setUndoing(false);
    if (!success) alert('Chỉ có thể Undo trong 10 giây sau khi bấm điểm!');
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={disabled || undoing || !canUndo}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
            canUndo
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 active:scale-95'
              : 'border-[var(--border-color)] text-[var(--muted-fg)] opacity-40 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">
            {undoing ? '...' : canUndo ? `Undo (${undoSecondsLeft}s)` : 'Undo'}
          </span>
        </button>

        {/* Timeout */}
        <button
          onClick={onTimeout}
          disabled={disabled}
          className="flex flex-col items-center gap-1 p-3 rounded-xl border border-[var(--border-color)] text-[var(--muted-fg)] hover:border-blue-400/50 hover:text-blue-400 hover:bg-blue-400/10 transition-all active:scale-95"
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-medium">Timeout</span>
        </button>

        {/* End Set */}
        <button
          onClick={onEndSet}
          disabled={disabled}
          className="flex flex-col items-center gap-1 p-3 rounded-xl border border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all active:scale-95"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Xong set</span>
        </button>

        {/* Cancel */}
        <button
          onClick={() => setShowCancel(true)}
          disabled={disabled}
          className="flex flex-col items-center gap-1 p-3 rounded-xl border border-red-500/30 text-red-400/70 hover:border-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
        >
          <XCircle className="w-5 h-5" />
          <span className="text-[10px] font-medium">Huỷ trận</span>
        </button>
      </div>

      {/* Cancel confirmation dialog */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => setShowCancel(false)} />
          <div className="relative bg-[var(--card-bg)] border border-red-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center space-y-3">
              <XCircle className="w-12 h-12 text-red-400 mx-auto" />
              <h3 className="font-bold text-lg">Huỷ trận đấu?</h3>
              <p className="text-sm text-[var(--muted-fg)]">
                Hành động này không thể hoàn tác. Trận sẽ được đánh dấu là đã huỷ.
              </p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCancel(false)} className="btn btn-ghost flex-1">Không</button>
                <button
                  onClick={() => { setShowCancel(false); onCancelMatch(); }}
                  className="btn flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
                >
                  Huỷ trận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
