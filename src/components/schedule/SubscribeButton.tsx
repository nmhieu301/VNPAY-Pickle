'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — SubscribeButton Component
// Tham gia cố định / Vắng buổi này
// ═══════════════════════════════════════════

import { useState } from 'react';
import { Bell, BellOff, UserCheck, UserMinus, Loader2 } from 'lucide-react';

interface Props {
  isSubscribed: boolean;
  isCreator: boolean;
  onSubscribe: () => Promise<void>;
  onUnsubscribe: () => Promise<void>;
  onMarkAbsent?: (sessionId: string) => Promise<void>;
  nextSessionId?: string | null;
  className?: string;
}

export function SubscribeButton({
  isSubscribed, isCreator, onSubscribe, onUnsubscribe,
  onMarkAbsent, nextSessionId, className = '',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    await onSubscribe();
    setLoading(false);
  };

  const handleUnsubscribe = async () => {
    setShowConfirm(false);
    setLoading(true);
    await onUnsubscribe();
    setLoading(false);
  };

  const handleMarkAbsent = async () => {
    if (!onMarkAbsent || !nextSessionId) return;
    setLoading(true);
    await onMarkAbsent(nextSessionId);
    setLoading(false);
  };

  if (isCreator) return null; // Creator không cần subscribe

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {/* Subscribe / Unsubscribe */}
      {!isSubscribed ? (
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="btn btn-gradient flex items-center gap-2"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Bell className="w-4 h-4" />
          }
          Tham gia cố định
        </button>
      ) : (
        <>
          <button
            disabled
            className="btn btn-secondary flex items-center gap-2 opacity-80"
          >
            <UserCheck className="w-4 h-4 text-green-500" />
            Đang theo dõi
          </button>

          {/* Mark absent for next session */}
          {nextSessionId && onMarkAbsent && (
            <button
              onClick={handleMarkAbsent}
              disabled={loading}
              className="btn btn-ghost flex items-center gap-2 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <BellOff className="w-4 h-4" />
              }
              Vắng buổi tới
            </button>
          )}

          {/* Unsubscribe */}
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="btn btn-ghost btn-sm text-red-500 flex items-center gap-1"
            >
              <UserMinus className="w-3.5 h-3.5" />
              Huỷ theo dõi
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleUnsubscribe}
                disabled={loading}
                className="btn btn-sm bg-red-500 text-white hover:bg-red-600"
              >
                Xác nhận huỷ
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="btn btn-ghost btn-sm"
              >
                Không
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
