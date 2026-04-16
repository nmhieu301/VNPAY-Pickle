'use client';

import { CourtAssignment, Player } from '@/types';
import { TierBadge } from '@/components/player/TierBadge';
import { PickleballIcon } from '@/components/icons/PickleballIcon';
import { UserCircle } from 'lucide-react';

interface CourtViewProps {
  court: CourtAssignment;
  onScore?: () => void;
}

function TeamPlayer({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/10 backdrop-blur-sm">
      <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
        {player.avatar_url ? (
          <img src={player.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          <UserCircle className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-white truncate">{player.nickname || player.full_name}</p>
        <div className="flex items-center gap-1">
          <TierBadge tier={player.tier} size="sm" />
        </div>
      </div>
    </div>
  );
}

export function CourtView({ court, onScore }: CourtViewProps) {
  const balanceLabel = court.tier_diff === 0
    ? '✅ Cân bằng hoàn hảo'
    : court.tier_diff === 1
      ? '✅ Rất cân bằng'
      : court.tier_diff === 2
        ? '⚠️ Chấp nhận được'
        : '❌ Chênh lệch lớn';

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg">
      {/* Court Header */}
      <div className="gradient-vnpay px-4 py-2 text-white text-center font-bold text-sm">
        <PickleballIcon size={16} className="inline-block mr-1 -mt-0.5" /> SÂN {court.court_number}
      </div>

      {/* Court Body */}
      <div className="court p-4 min-h-[200px]">
        <div className="grid grid-cols-2 gap-3">
          {/* Team A */}
          <div>
            <div className="text-center mb-2">
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                🟥 Team A
              </span>
            </div>
            <div className="space-y-2">
              {court.team_a.map(p => (
                <TeamPlayer key={p.id} player={p} />
              ))}
            </div>
          </div>

          {/* Team B */}
          <div>
            <div className="text-center mb-2">
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                🟦 Team B
              </span>
            </div>
            <div className="space-y-2">
              {court.team_b.map(p => (
                <TeamPlayer key={p.id} player={p} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Court Footer */}
      <div className="bg-[var(--surface)] px-4 py-3 border-t border-[var(--border-color)]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted-fg)]">
            Tier: <span className="font-mono font-semibold text-red-500">{court.team_a_tier}</span>
            {' vs '}
            <span className="font-mono font-semibold text-blue-500">{court.team_b_tier}</span>
          </span>
          <span className="text-xs">{balanceLabel}</span>
        </div>
        {onScore && (
          <button
            onClick={onScore}
            className="btn btn-gradient btn-sm w-full mt-2"
          >
            📝 Ghi điểm
          </button>
        )}
      </div>
    </div>
  );
}
