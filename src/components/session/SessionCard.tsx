'use client';

import { Session } from '@/types';
import { useAppStore } from '@/lib/store';
import { Calendar, MapPin, Users, Clock, Zap } from 'lucide-react';
import Link from 'next/link';

interface SessionCardProps {
  session: Session;
}

const statusConfig = {
  open: { label: '📝 Đang mở', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  in_progress: { label: '▶️ Đang diễn ra', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { label: '✅ Đã kết thúc', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  cancelled: { label: '❌ Đã huỷ', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const modeConfig = {
  random: { label: 'Ngẫu nhiên', icon: '🎲' },
  elo_balanced: { label: 'Cân bằng ELO', icon: '⚖️' },
  manual: { label: 'Thủ công', icon: '✏️' },
};

export function SessionCard({ session }: SessionCardProps) {
  const getPlayer = useAppStore(s => s.getPlayer);
  const getVenue = useAppStore(s => s.getVenue);
  const sessionPlayers = useAppStore(s => s.sessionPlayers);

  const host = getPlayer(session.host_id);
  const venue = session.venue_id ? getVenue(session.venue_id) : null;
  const playerIds = sessionPlayers[session.id] || [];
  const status = statusConfig[session.status];
  const mode = modeConfig[session.match_mode];

  return (
    <Link href={`/sessions/${session.id}`}>
      <div className="card p-4 group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate group-hover:text-[var(--primary)] transition-colors">
              {session.title}
            </h3>
            <p className="text-sm text-[var(--muted-fg)] mt-0.5">
              Tổ chức bởi {host?.nickname || host?.full_name || 'N/A'}
            </p>
          </div>
          <span className={`badge text-xs ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="space-y-2 text-sm text-[var(--muted-fg)]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>{session.date}</span>
            <Clock className="w-4 h-4 ml-2 flex-shrink-0" />
            <span>{session.start_time} – {session.end_time}</span>
          </div>

          {venue && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{venue.name}</span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>
                {playerIds.length}
                {session.max_players ? `/${session.max_players}` : ''} người
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 flex-shrink-0" />
              <span>{mode.icon} {mode.label}</span>
            </div>
          </div>
        </div>

        {session.status === 'open' && (
          <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
            <div className="flex gap-2">
              <div className="flex -space-x-2">
                {playerIds.slice(0, 5).map((pid, i) => {
                  const p = getPlayer(pid);
                  return (
                    <div
                      key={pid}
                      className="w-7 h-7 rounded-full border-2 border-[var(--surface)] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ zIndex: 5 - i }}
                      title={p?.full_name}
                    >
                      {p?.full_name?.charAt(0) || '?'}
                    </div>
                  );
                })}
                {playerIds.length > 5 && (
                  <div className="w-7 h-7 rounded-full border-2 border-[var(--surface)] bg-[var(--muted)] flex items-center justify-center text-xs font-medium">
                    +{playerIds.length - 5}
                  </div>
                )}
              </div>
              <span className="btn btn-gradient btn-sm ml-auto">
                Tham gia
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
