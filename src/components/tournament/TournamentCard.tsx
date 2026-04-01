'use client';

import Link from 'next/link';
import { Tournament } from '@/types';
import { Calendar, MapPin, Trophy, Users, Clock, ChevronRight } from 'lucide-react';

const STATUS_CONFIG = {
  draft: { label: 'Nháp', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  registration: { label: '📋 Đang đăng ký', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  in_progress: { label: '⚔️ Đang thi đấu', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  completed: { label: '✅ Đã kết thúc', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  cancelled: { label: '❌ Đã hủy', cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

const TYPE_BADGE = {
  company: { label: '🏢 Giải Công ty', cls: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' },
  group: { label: '👥 Giải Nhóm', cls: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' },
  custom: { label: '🎯 Giải Tự do', cls: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' },
};

interface Props {
  tournament: Tournament;
  venueName?: string;
}

export function TournamentCard({ tournament, venueName }: Props) {
  const status = STATUS_CONFIG[tournament.status];
  const typeBadge = TYPE_BADGE[tournament.type];

  const formatDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const isRegistrationOpen = tournament.status === 'registration';
  const deadlinePassed = new Date(tournament.registration_deadline) < new Date();

  return (
    <Link href={`/tournaments/${tournament.id}`} className="block">
      <div className="card overflow-hidden group cursor-pointer">
        {/* Banner */}
        <div className="relative h-40 overflow-hidden">
          {tournament.banner_url ? (
            <img
              src={tournament.banner_url}
              alt={tournament.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--primary)] via-blue-600 to-indigo-700 flex items-center justify-center">
              <Trophy className="w-16 h-16 text-white/30" />
            </div>
          )}
          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeBadge.cls}`}>
              {typeBadge.label}
            </span>
          </div>
          {tournament.is_paused && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white font-bold text-lg">⏸ Tạm dừng</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-bold text-base leading-tight line-clamp-2">{tournament.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium ${status.cls}`}>
              {status.label}
            </span>
          </div>

          <div className="space-y-1.5 text-sm text-[var(--muted-fg)]">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{formatDate(tournament.start_date)} – {formatDate(tournament.end_date)}</span>
            </div>
            {venueName && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="line-clamp-1">{venueName}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Max {tournament.max_teams} đội
              </span>
              {tournament.entry_fee > 0 ? (
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  {tournament.entry_fee.toLocaleString('vi-VN')}đ/người
                </span>
              ) : (
                <span className="text-green-600 dark:text-green-400 font-medium">Miễn phí</span>
              )}
            </div>
            {isRegistrationOpen && !deadlinePassed && (
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">Đăng ký đến: {formatDate(tournament.registration_deadline)}</span>
              </div>
            )}
          </div>

          {tournament.prizes && (
            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium line-clamp-1">
                🏆 {tournament.prizes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted-fg)]">
                {tournament.scoring_system === 'rally' ? '⚡ Rally' : '🏐 Side-out'} · {tournament.points_target}đ · {tournament.sets_format.toUpperCase()}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--muted-fg)] group-hover:text-[var(--primary)] transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}
