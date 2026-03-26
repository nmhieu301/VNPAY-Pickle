// ═══════════════════════════════════════════
// VNPAY Pickle — Tier Constants
// ═══════════════════════════════════════════

import { TierName } from '@/types';

export interface TierConfig {
  name: TierName;
  label: string;
  minElo: number;
  maxElo: number;
  color: string;
  bgColor: string;
  textColor: string;
  icon: string;
  description: string;
}

export const TIERS: TierConfig[] = [
  {
    name: 'challenger',
    label: 'Challenger',
    minElo: 2000,
    maxElo: Infinity,
    color: '#9B59B6',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-300',
    icon: '👑',
    description: 'Top cao thủ',
  },
  {
    name: 'diamond',
    label: 'Diamond',
    minElo: 1700,
    maxElo: 1999,
    color: '#00BCD4',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    icon: '💎',
    description: 'Rất giỏi',
  },
  {
    name: 'platinum',
    label: 'Platinum',
    minElo: 1500,
    maxElo: 1699,
    color: '#3498DB',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    icon: '🔷',
    description: 'Khá giỏi',
  },
  {
    name: 'gold',
    label: 'Gold',
    minElo: 1300,
    maxElo: 1499,
    color: '#F1C40F',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    icon: '🥇',
    description: 'Trên trung bình',
  },
  {
    name: 'silver',
    label: 'Silver',
    minElo: 1100,
    maxElo: 1299,
    color: '#BDC3C7',
    bgColor: 'bg-gray-100 dark:bg-gray-700/30',
    textColor: 'text-gray-600 dark:text-gray-300',
    icon: '🥈',
    description: 'Trung bình',
  },
  {
    name: 'bronze',
    label: 'Bronze',
    minElo: 900,
    maxElo: 1099,
    color: '#E67E22',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-300',
    icon: '🥉',
    description: 'Đang phát triển',
  },
  {
    name: 'beginner',
    label: 'Beginner',
    minElo: 0,
    maxElo: 899,
    color: '#2ECC71',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-300',
    icon: '🌱',
    description: 'Mới bắt đầu',
  },
];

export function getTierByElo(elo: number): TierConfig {
  return TIERS.find(t => elo >= t.minElo && elo <= t.maxElo) || TIERS[TIERS.length - 1];
}

export function getTierByName(name: TierName): TierConfig {
  return TIERS.find(t => t.name === name) || TIERS[TIERS.length - 1];
}

export const INITIAL_ELO = 1200;
export const PLACEMENT_MATCHES = 10;
