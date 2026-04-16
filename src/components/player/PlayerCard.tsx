'use client';

import { Player } from '@/types';
import { TierBadge } from './TierBadge';
import { useAppStore } from '@/lib/store';
import { UserCircle } from 'lucide-react';
import { getTierConfig } from '@/lib/constants/tiers';

interface PlayerCardProps {
  player: Player;
  compact?: boolean;
  showDepartment?: boolean;
  onClick?: () => void;
}

export function PlayerCard({ player, compact = false, showDepartment = true, onClick }: PlayerCardProps) {
  const getDepartment = useAppStore(s => s.getDepartment);
  const dept = player.department_id ? getDepartment(player.department_id) : null;
  const winRate = player.total_matches > 0
    ? Math.round((player.total_wins / player.total_matches) * 100)
    : 0;
  const tierCfg = getTierConfig(player.tier);

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--muted)] transition-colors cursor-pointer"
        onClick={onClick}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-sm font-bold overflow-hidden">
          {player.avatar_url ? (
            <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            player.full_name.charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{player.nickname || player.full_name}</p>
          {showDepartment && dept && (
            <p className="text-xs text-[var(--muted-fg)] truncate">{dept.name}</p>
          )}
        </div>
        <TierBadge tier={player.tier} size="sm" />
      </div>
    );
  }

  return (
    <div
      className="card p-4 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
          {player.avatar_url ? (
            <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserCircle className="w-7 h-7" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{player.nickname || player.full_name}</h3>
            <TierBadge tier={player.tier} size="sm" />
          </div>
          <p className="text-sm text-[var(--muted-fg)]">{player.full_name}</p>
          {showDepartment && dept && (
            <p className="text-xs text-[var(--muted-fg)] mt-0.5">{dept.name}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--border-color)]">
        <div className="text-center">
          <p className="text-2xl">{tierCfg.icon}</p>
          <p className="text-xs text-[var(--muted-fg)]">{tierCfg.sublabel}</p>
        </div>
        <div className="text-center">
          <p className="font-mono font-bold text-lg">{player.total_matches}</p>
          <p className="text-xs text-[var(--muted-fg)]">Trận</p>
        </div>
        <div className="text-center">
          <p className="font-mono font-bold text-lg" style={{ color: '#00A651' }}>{winRate}%</p>
          <p className="text-xs text-[var(--muted-fg)]">Thắng</p>
        </div>
      </div>
    </div>
  );
}
