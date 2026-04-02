'use client';
// ─── StreakBadge — hiển thị 🔥N cạnh tên người chơi ───
import React from 'react';

interface Props {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  showZero?: boolean;
}

export function StreakBadge({ streak, size = 'sm', showZero = false }: Props) {
  if (streak === 0 && !showZero) return null;

  const emoji = streak >= 50 ? '👑' : streak >= 20 ? '💎' : streak >= 10 ? '🔥' : streak >= 5 ? '⚡' : '✨';
  const cls = {
    sm: 'text-xs px-1.5 py-0.5 gap-0.5',
    md: 'text-sm px-2 py-1 gap-1',
    lg: 'text-base px-3 py-1.5 gap-1',
  }[size];

  const color = streak >= 20
    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    : streak >= 10
    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
    : streak >= 5
    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${cls} ${color}`}>
      {emoji}<span>{streak}</span>
    </span>
  );
}
