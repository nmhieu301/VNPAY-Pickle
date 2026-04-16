// ═══════════════════════════════════════════
// VNPAY Pickle — Tier Constants (0–4)
// Admin sets tier manually; no ELO calculation
// ═══════════════════════════════════════════

export interface TierConfig {
  level: number;    // 0–4
  label: string;
  sublabel: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: string;
}

export const TIERS: TierConfig[] = [
  {
    level: 0,
    label: 'Tier 0',
    sublabel: 'Tập sự',
    color: '#6B7280',
    bgColor: 'bg-gray-100 dark:bg-gray-700/30',
    textColor: 'text-gray-600 dark:text-gray-300',
    icon: '🌱',
  },
  {
    level: 1,
    label: 'Tier 1',
    sublabel: 'Trung cấp',
    color: '#E67E22',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-300',
    icon: '🥉',
  },
  {
    level: 2,
    label: 'Tier 2',
    sublabel: 'Khá',
    color: '#BDC3C7',
    bgColor: 'bg-slate-100 dark:bg-slate-700/30',
    textColor: 'text-slate-600 dark:text-slate-300',
    icon: '🥈',
  },
  {
    level: 3,
    label: 'Tier 3',
    sublabel: 'Giỏi',
    color: '#F1C40F',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    icon: '🥇',
  },
  {
    level: 4,
    label: 'Tier 4',
    sublabel: 'Xuất sắc',
    color: '#9B59B6',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-300',
    icon: '👑',
  },
];

/** Get tier config by numeric level (0–4). Falls back to Tier 0. */
export function getTierConfig(level: number): TierConfig {
  return TIERS[Math.max(0, Math.min(4, level ?? 0))] ?? TIERS[0];
}
