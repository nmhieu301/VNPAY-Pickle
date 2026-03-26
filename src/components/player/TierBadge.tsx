'use client';

import { getTierByElo, getTierByName, TierConfig } from '@/lib/constants/tiers';
import { TierName } from '@/types';

interface TierBadgeProps {
  elo?: number;
  tier?: TierName;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showElo?: boolean;
}

export function TierBadge({ elo, tier, size = 'md', showLabel = true, showElo = false }: TierBadgeProps) {
  const config: TierConfig = elo !== undefined ? getTierByElo(elo) : getTierByName(tier || 'silver');

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <span
      className={`badge ${config.bgColor} ${config.textColor} ${sizeClasses[size]}`}
      style={{ borderColor: config.color, borderWidth: '1px' }}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
      {showElo && elo !== undefined && (
        <span className="font-mono ml-1">{elo}</span>
      )}
    </span>
  );
}
