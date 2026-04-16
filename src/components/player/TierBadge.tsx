'use client';

import { getTierConfig } from '@/lib/constants/tiers';

interface TierBadgeProps {
  tier: number; // 0–4
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showSublabel?: boolean;
}

export function TierBadge({ tier, size = 'md', showLabel = true, showSublabel = false }: TierBadgeProps) {
  const config = getTierConfig(tier);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-0.5',
    md: 'text-sm px-2.5 py-0.5 gap-1',
    lg: 'text-base px-3 py-1 gap-1',
  };

  return (
    <span
      className={`badge inline-flex items-center ${config.bgColor} ${config.textColor} ${sizeClasses[size]}`}
      style={{ borderColor: config.color, borderWidth: '1px' }}
    >
      <span>{config.icon}</span>
      {showLabel && <span className="font-semibold">{config.label}</span>}
      {showSublabel && <span className="opacity-75">{config.sublabel}</span>}
    </span>
  );
}
