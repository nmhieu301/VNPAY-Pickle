'use client';
// ─── CheckInButton — Nút check-in 1-chạm tự đến ───

import { MapPin, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  isCheckedIn: boolean;
  canCheckIn: boolean;
  isSubmitting: boolean;
  onCheckIn: () => Promise<boolean>;
  startTime?: string;
  checkinOpenBefore?: number;  // minutes
  checkinCloseAfter?: number;  // minutes
}

export function CheckInButton({
  isCheckedIn,
  canCheckIn,
  isSubmitting,
  onCheckIn,
  startTime = '12:00',
  checkinOpenBefore = 30,
  checkinCloseAfter = 15,
}: Props) {
  if (isCheckedIn) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
      >
        <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-bold text-green-700 dark:text-green-400">Đã check-in! ✅</p>
          <p className="text-xs text-green-600 dark:text-green-500">Bạn đã xác nhận có mặt tại sân</p>
        </div>
      </motion.div>
    );
  }

  if (!canCheckIn) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--muted)] border border-[var(--border-color)] opacity-75">
        <div className="w-12 h-12 rounded-xl bg-[var(--border-color)] flex items-center justify-center shrink-0">
          <Clock className="w-6 h-6 text-[var(--muted-fg)]" />
        </div>
        <div>
          <p className="font-semibold text-[var(--muted-fg)]">Check-in chưa mở</p>
          <p className="text-xs text-[var(--muted-fg)]">
            Mở {checkinOpenBefore} phút trước {startTime}, đóng {checkinCloseAfter} phút sau giờ bắt đầu
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onCheckIn}
      disabled={isSubmitting}
      className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shadow-xl shadow-[var(--primary)]/30 font-bold text-lg transition-all disabled:opacity-50"
    >
      {isSubmitting
        ? <Loader2 className="w-6 h-6 animate-spin" />
        : <MapPin className="w-6 h-6" />
      }
      📍 Check-in ngay
    </motion.button>
  );
}
