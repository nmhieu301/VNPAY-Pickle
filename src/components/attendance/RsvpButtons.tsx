'use client';
// ─── RsvpButtons — 3 nút RSVP: Đến / Chưa chắc / Vắng ───

import { useState } from 'react';
import { Check, HelpCircle, X, Loader2 } from 'lucide-react';
import type { RsvpStatus } from '@/types';

interface Props {
  currentStatus: RsvpStatus;
  onRsvp: (status: RsvpStatus, reason?: string) => Promise<void>;
  isSubmitting?: boolean;
  occurrenceDate: string;
  disabled?: boolean;
}

export function RsvpButtons({ currentStatus, onRsvp, isSubmitting, occurrenceDate, disabled }: Props) {
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState('');

  const dateLabel = new Date(occurrenceDate + 'T00:00:00').toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  });

  const handleClick = async (status: RsvpStatus) => {
    if (status === 'not_going') {
      if (!showReasonInput) { setShowReasonInput(true); return; }
      await onRsvp(status, reason || undefined);
      setShowReasonInput(false);
      setReason('');
    } else {
      setShowReasonInput(false);
      await onRsvp(status);
    }
  };

  const buttons: { status: RsvpStatus; label: string; icon: React.ReactNode; active: string; hover: string }[] = [
    {
      status: 'going',
      label: 'Đến',
      icon: <Check className="w-4 h-4" />,
      active: 'bg-green-500 text-white shadow-lg shadow-green-500/30',
      hover: 'hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-400',
    },
    {
      status: 'maybe',
      label: 'Chưa chắc',
      icon: <HelpCircle className="w-4 h-4" />,
      active: 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30',
      hover: 'hover:bg-yellow-50 hover:text-yellow-700 dark:hover:bg-yellow-900/30 dark:hover:text-yellow-400',
    },
    {
      status: 'not_going',
      label: 'Vắng',
      icon: <X className="w-4 h-4" />,
      active: 'bg-red-500 text-white shadow-lg shadow-red-500/30',
      hover: 'hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400',
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--muted-fg)] font-medium">
        📅 Buổi {dateLabel} — Bạn có tham gia không?
      </p>

      <div className="flex gap-2">
        {buttons.map(btn => {
          const isActive = currentStatus === btn.status;
          return (
            <button
              key={btn.status}
              onClick={() => handleClick(btn.status)}
              disabled={disabled || isSubmitting}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                isActive
                  ? btn.active + ' border-transparent'
                  : 'border-[var(--border-color)] text-[var(--muted-fg)] ' + btn.hover
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting && isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : btn.icon}
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Lý do vắng */}
      {showReasonInput && (
        <div className="flex gap-2 items-center animate-in slide-in-from-top-1 duration-200">
          <input
            autoFocus
            value={reason}
            onChange={e => setReason(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleClick('not_going')}
            placeholder="Lý do (Họp, Ốm, Đi công tác...)"
            className="input text-sm flex-1"
            maxLength={80}
          />
          <button
            onClick={() => handleClick('not_going')}
            disabled={isSubmitting}
            className="btn btn-gradient btn-sm whitespace-nowrap"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Xác nhận'}
          </button>
        </div>
      )}

      {currentStatus !== 'no_response' && (
        <p className="text-xs text-[var(--muted-fg)]">
          {currentStatus === 'going' && '✅ Bạn đã xác nhận tham gia'}
          {currentStatus === 'maybe' && '🤔 Bạn chưa chắc — nhớ cập nhật trước buổi chơi nhé!'}
          {currentStatus === 'not_going' && '❌ Bạn đã báo vắng'}
        </p>
      )}
    </div>
  );
}
