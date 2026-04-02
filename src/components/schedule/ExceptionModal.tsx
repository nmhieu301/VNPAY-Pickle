'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — ExceptionModal Component
// Modal huỷ / đổi giờ 1 buổi cụ thể
// ═══════════════════════════════════════════

import { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  date: string; // YYYY-MM-DD
  scheduleStartTime: string;
  scheduleEndTime: string;
  onConfirm: (params: {
    action: 'cancel' | 'reschedule';
    reason?: string;
    newDate?: string;
    newStartTime?: string;
    newEndTime?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export function ExceptionModal({
  isOpen, date, scheduleStartTime, scheduleEndTime, onConfirm, onClose,
}: Props) {
  const [action, setAction] = useState<'cancel' | 'reschedule'>('cancel');
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState(date);
  const [newStart, setNewStart] = useState(scheduleStartTime);
  const [newEnd, setNewEnd] = useState(scheduleEndTime);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('vi', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm({
      action,
      reason: reason || undefined,
      newDate: action === 'reschedule' ? newDate : undefined,
      newStartTime: action === 'reschedule' ? newStart : undefined,
      newEndTime: action === 'reschedule' ? newEnd : undefined,
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">Chỉnh sửa buổi chơi</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-[var(--muted)] text-sm">
          📅 <span className="font-medium">{displayDate}</span>
          <br />
          <span className="text-[var(--muted-fg)] text-xs">{scheduleStartTime.slice(0, 5)} – {scheduleEndTime.slice(0, 5)}</span>
        </div>

        {/* Action choice */}
        <div className="space-y-2">
          {([
            { v: 'cancel', label: '❌ Huỷ buổi này', desc: 'Không diễn ra, thông báo cho người đăng ký' },
            { v: 'reschedule', label: '🔄 Dời buổi này', desc: 'Chuyển sang ngày/giờ khác' },
          ] as const).map(opt => (
            <label
              key={opt.v}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                action === opt.v
                  ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-950/30'
                  : 'border-[var(--border-color)] hover:border-[var(--muted-fg)]'
              }`}
            >
              <input
                type="radio"
                name="exception-action"
                checked={action === opt.v}
                onChange={() => setAction(opt.v)}
                className="mt-0.5 accent-[var(--primary)]"
              />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-[var(--muted-fg)]">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Reschedule fields */}
        {action === 'reschedule' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Ngày mới</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="input"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Giờ bắt đầu</label>
                <input
                  type="time"
                  value={newStart}
                  onChange={e => setNewStart(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Giờ kết thúc</label>
                <input
                  type="time"
                  value={newEnd}
                  onChange={e => setNewEnd(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="text-xs font-medium mb-1 block">
            Lý do {action === 'cancel' ? '(thông báo cho thành viên)' : '(tuỳ chọn)'}
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={action === 'cancel' ? 'VD: Sân bảo trì, mưa to...' : 'Tuỳ chọn'}
            className="input min-h-[72px] resize-none"
          />
        </div>

        {action === 'cancel' && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-700 dark:text-orange-400">
              Tất cả người đã đăng ký buổi này sẽ nhận notification thông báo huỷ.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn btn-ghost flex-1">Huỷ bỏ</button>
          <button
            onClick={handleConfirm}
            disabled={loading || (action === 'cancel' && !reason.trim())}
            className="btn btn-gradient flex-1"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}
