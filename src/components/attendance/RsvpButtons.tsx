'use client';
// ─── RsvpButtons — 3 nút RSVP: Tham gia / Chưa chắc / Không tham gia ───

import { useState } from 'react';
import { Check, HelpCircle, X, Loader2, AlertCircle } from 'lucide-react';
import type { RsvpStatus } from '@/types';

interface Props {
  currentStatus: RsvpStatus;
  onRsvp: (status: RsvpStatus, reason?: string) => Promise<boolean>;
  isSubmitting?: boolean;
  occurrenceDate: string;
  disabled?: boolean;
  error?: string | null;
}

export function RsvpButtons({
  currentStatus,
  onRsvp,
  isSubmitting,
  occurrenceDate,
  disabled,
  error,
}: Props) {
  const [activeBtn, setActiveBtn] = useState<RsvpStatus | null>(null);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const dateLabel = occurrenceDate
    ? new Date(occurrenceDate + 'T00:00:00').toLocaleDateString('vi-VN', {
        weekday: 'long', day: '2-digit', month: '2-digit',
      })
    : '';

  const submit = async (status: RsvpStatus, r?: string) => {
    setActiveBtn(status);
    setLocalError(null);
    const ok = await onRsvp(status, r);
    if (!ok) {
      setLocalError('Không thể lưu. Kiểm tra kết nối và thử lại.');
    }
    setActiveBtn(null);
  };

  const handleClick = async (status: RsvpStatus) => {
    if (status === 'not_going') {
      if (!showReasonInput) {
        setShowReasonInput(true);
        // Submit with no reason immediately (reason is optional)
        await submit(status);
        return;
      }
    } else {
      setShowReasonInput(false);
      setReason('');
      await submit(status);
    }
  };

  const handleReasonSubmit = async () => {
    await submit('not_going', reason || undefined);
    setShowReasonInput(false);
    setReason('');
  };

  const buttons: {
    status: RsvpStatus;
    label: string;
    icon: React.ReactNode;
    activeClass: string;
    hoverClass: string;
  }[] = [
    {
      status: 'going',
      label: 'Tham gia',
      icon: <Check className="w-4 h-4" />,
      activeClass: 'bg-green-500 text-white border-transparent shadow-lg shadow-green-500/25',
      hoverClass: 'hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-900/20 dark:hover:text-green-400 dark:hover:border-green-700',
    },
    {
      status: 'maybe',
      label: 'Chưa chắc',
      icon: <HelpCircle className="w-4 h-4" />,
      activeClass: 'bg-yellow-500 text-white border-transparent shadow-lg shadow-yellow-500/25',
      hoverClass: 'hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-300 dark:hover:bg-yellow-900/20 dark:hover:text-yellow-400 dark:hover:border-yellow-700',
    },
    {
      status: 'not_going',
      label: 'Không tham gia',
      icon: <X className="w-4 h-4" />,
      activeClass: 'bg-red-500 text-white border-transparent shadow-lg shadow-red-500/25',
      hoverClass: 'hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-700',
    },
  ];

  const isInactive = disabled || isSubmitting;
  const displayError = error || localError;

  return (
    <div className="space-y-3">
      {/* Date label */}
      {dateLabel && (
        <p className="text-xs font-medium text-[var(--muted-fg)]">
          📅 {dateLabel} — Bạn có tham gia không?
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        {buttons.map(btn => {
          const isActive = currentStatus === btn.status;
          const isThisLoading = isSubmitting && activeBtn === btn.status;

          return (
            <button
              key={btn.status}
              onClick={() => handleClick(btn.status)}
              disabled={isInactive}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5
                rounded-xl text-sm font-semibold border transition-all duration-200
                ${isActive
                  ? btn.activeClass
                  : `border-[var(--border-color)] text-[var(--muted-fg)] bg-[var(--card-bg)] ${btn.hoverClass}`
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-95
              `}
            >
              {isThisLoading
                ? <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                : btn.icon
              }
              <span className="truncate">{btn.label}</span>
            </button>
          );
        })}
      </div>

      {/* Lý do vắng (optional, sau khi bấm Không tham gia) */}
      {showReasonInput && currentStatus === 'not_going' && (
        <div className="animate-in slide-in-from-top-1 duration-200 space-y-2">
          <p className="text-xs text-[var(--muted-fg)]">Thêm lý do (tuỳ chọn):</p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={reason}
              onChange={e => setReason(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReasonSubmit()}
              placeholder="Họp, Ốm, Đi công tác..."
              className="input text-sm flex-1"
              maxLength={80}
            />
            <button
              onClick={handleReasonSubmit}
              disabled={isInactive}
              className="btn btn-gradient btn-sm whitespace-nowrap px-3"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cập nhật'}
            </button>
          </div>
        </div>
      )}

      {/* Trạng thái hiện tại */}
      {currentStatus !== 'no_response' && !displayError && (
        <p className="text-xs text-[var(--muted-fg)]">
          {currentStatus === 'going' && '✅ Bạn đã xác nhận tham gia'}
          {currentStatus === 'maybe' && '🤔 Bạn chưa chắc — hãy cập nhật trước buổi chơi!'}
          {currentStatus === 'not_going' && '❌ Bạn đã báo không tham gia'}
        </p>
      )}

      {/* Error message */}
      {displayError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {displayError}
        </div>
      )}
    </div>
  );
}
