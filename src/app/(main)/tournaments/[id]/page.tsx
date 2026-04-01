'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTournamentStore } from '@/lib/tournamentStore';
import { useAppStore } from '@/lib/store';
import { RegistrationList } from '@/components/tournament/RegistrationList';
import { Calendar, MapPin, Trophy, Users, Clock, ArrowRight, Settings, Eye, Activity } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  mens_doubles: '👨‍👨 Đôi Nam',
  womens_doubles: '👩‍👩 Đôi Nữ',
  mixed_doubles: '👫 Hỗn hợp',
  mens_singles: '👨 Đơn Nam',
  womens_singles: '👩 Đơn Nữ',
  open_doubles: '🤝 Open',
};

const FORMAT_LABELS: Record<string, string> = {
  pool_playoff: 'Vòng bảng + Playoff',
  round_robin: 'Vòng tròn',
  single_elim: 'Loại đơn',
  double_elim: 'Loại kép',
  swiss: 'Thụy Sĩ',
  king_of_court: 'Vua Sân',
};

const EVENT_STATUS = {
  registration: { label: '📋 Đăng ký', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  bracket_set: { label: '🔲 Bracket sẵn', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  in_progress: { label: '⚔️ Đang đấu', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  completed: { label: '✅ Xong', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800' },
};

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAppStore(s => s.currentUser);
  const getVenue = useAppStore(s => s.getVenue);
  const getPlayer = useAppStore(s => s.getPlayer);
  const loadTournament = useTournamentStore(s => s.loadTournament);
  const currentTournament = useTournamentStore(s => s.currentTournament);
  const currentEvents = useTournamentStore(s => s.currentEvents);
  const loadEventDetail = useTournamentStore(s => s.loadEventDetail);
  const teamsMap = useTournamentStore(s => s.teamsMap);
  const isLoading = useTournamentStore(s => s.isLoading);
  const registerTeam = useTournamentStore(s => s.registerTeam);

  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'register'>('overview');
  const [registering, setRegistering] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadTournament(id);
  }, [id]);

  useEffect(() => {
    for (const ev of currentEvents) {
      if (!teamsMap[ev.id]) loadEventDetail(ev.id);
    }
  }, [currentEvents]);

  if (isLoading || !currentTournament) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-48 rounded-xl" />
        <div className="skeleton h-8 rounded w-1/2" />
        <div className="skeleton h-4 rounded w-3/4" />
      </div>
    );
  }

  const t = currentTournament;
  const venue = t.venue_id ? getVenue(t.venue_id) : null;
  const organizer = getPlayer(t.organizer_id);
  const isOrganizer = currentUser?.id === t.organizer_id || currentUser?.role === 'admin';
  const fmt = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const handleQuickRegister = async (eventId: string) => {
    if (!currentUser) return;
    setRegistering(eventId);
    await registerTeam({ event_id: eventId, player1_id: currentUser.id });
    setRegistering(null);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden h-48">
        {t.banner_url ? (
          <img src={t.banner_url} alt={t.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--primary)] via-blue-600 to-indigo-700 flex items-center justify-center">
            <Trophy className="w-20 h-20 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-white font-bold text-xl">{t.name}</h1>
          <p className="text-white/80 text-sm">{organizer?.full_name || 'Organizer'}</p>
        </div>
        {isOrganizer && (
          <Link href={`/tournaments/${id}/manage`} className="absolute top-3 right-3 btn btn-sm bg-black/40 text-white border border-white/20 hover:bg-black/60 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Quản lý
          </Link>
        )}
      </div>

      {/* Quick info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <Calendar className="w-5 h-5 mx-auto text-[var(--primary)] mb-1" />
          <p className="text-xs text-[var(--muted-fg)]">Thi đấu</p>
          <p className="text-sm font-semibold">{fmt(t.start_date)} – {fmt(t.end_date)}</p>
        </div>
        {venue && (
          <div className="card p-3 text-center">
            <MapPin className="w-5 h-5 mx-auto text-[var(--primary)] mb-1" />
            <p className="text-xs text-[var(--muted-fg)]">Địa điểm</p>
            <p className="text-sm font-semibold line-clamp-1">{venue.name}</p>
          </div>
        )}
        <div className="card p-3 text-center">
          <Activity className="w-5 h-5 mx-auto text-[var(--primary)] mb-1" />
          <p className="text-xs text-[var(--muted-fg)]">Luật</p>
          <p className="text-sm font-semibold">{t.points_target}đ · {t.sets_format.toUpperCase()}</p>
        </div>
        <div className="card p-3 text-center">
          <Clock className="w-5 h-5 mx-auto text-[var(--primary)] mb-1" />
          <p className="text-xs text-[var(--muted-fg)]">ĐK đến</p>
          <p className="text-sm font-semibold">{fmt(t.registration_deadline)}</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-2 flex-wrap">
        <Link href={`/tournaments/${id}/bracket`} className="btn btn-secondary btn-sm flex items-center gap-1.5">
          🔲 Bracket
        </Link>
        <Link href={`/tournaments/${id}/schedule`} className="btn btn-secondary btn-sm flex items-center gap-1.5">
          📅 Lịch
        </Link>
        <Link href={`/tournaments/${id}/live`} className="btn btn-secondary btn-sm flex items-center gap-1.5">
          🔴 Live Score
        </Link>
        <Link href={`/tournaments/${id}/results`} className="btn btn-secondary btn-sm flex items-center gap-1.5">
          🏆 Kết quả
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border-color)]">
        {[['overview','Tổng quan'],['events','Nội dung thi đấu'],['register','Đăng ký']].map(([val, label]) => (
          <button key={val} onClick={() => setActiveTab(val as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === val ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted-fg)] hover:text-[var(--fg)]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {t.description && (
            <div className="card p-4">
              <h3 className="font-semibold mb-2">📋 Mô tả</h3>
              <p className="text-sm text-[var(--muted-fg)] whitespace-pre-line">{t.description}</p>
            </div>
          )}
          {t.prizes && (
            <div className="card p-4">
              <h3 className="font-semibold mb-2">🏆 Giải thưởng</h3>
              <p className="text-sm whitespace-pre-line">{t.prizes}</p>
            </div>
          )}
          <div className="card p-4">
            <h3 className="font-semibold mb-3">⚖️ Luật thi đấu</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--muted-fg)]">Tính điểm:</span><span className="font-medium">{t.scoring_system === 'rally' ? 'Rally' : 'Side-out'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-fg)]">Điểm tới:</span><span className="font-medium">{t.points_target}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-fg)]">Số set:</span><span className="font-medium">{t.sets_format.toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-fg)]">Hạng 3:</span><span className="font-medium">{t.has_third_place ? 'Có' : 'Không'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-fg)]">Phí:</span><span className="font-medium">{t.entry_fee > 0 ? `${t.entry_fee.toLocaleString('vi-VN')}đ` : 'Miễn phí'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-fg)]">Nghỉ giữa trận:</span><span className="font-medium">{t.rest_minutes} phút</span></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-4">
          {currentEvents.map(ev => {
            const teams = teamsMap[ev.id] || [];
            const confirmed = teams.filter(t => t.status === 'confirmed').length;
            const evStatus = EVENT_STATUS[ev.status];

            return (
              <div key={ev.id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{CATEGORY_LABELS[ev.category] || ev.category}</h3>
                    <p className="text-xs text-[var(--muted-fg)]">{FORMAT_LABELS[ev.format] || ev.format}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${evStatus.cls}`}>{evStatus.label}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-[var(--muted-fg)] mb-3">
                  <span><Users className="w-3.5 h-3.5 inline mr-1" />{confirmed}/{ev.max_teams} đội</span>
                  <span>Hạng: {ev.division}</span>
                </div>
                <div className="flex gap-2">
                  {t.status === 'registration' && (
                    <button onClick={() => handleQuickRegister(ev.id)} disabled={registering === ev.id} className="btn btn-gradient btn-sm">
                      {registering === ev.id ? 'Đang đăng ký...' : '+ Đăng ký'}
                    </button>
                  )}
                  {ev.status !== 'registration' && (
                    <Link href={`/tournaments/${id}/bracket/${ev.id}`} className="btn btn-sm btn-secondary flex items-center gap-1.5">
                      🔲 Xem Bracket <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
          {currentEvents.length === 0 && (
            <div className="text-center py-8 text-[var(--muted-fg)] text-sm">Chưa có nội dung thi đấu</div>
          )}
        </div>
      )}

      {activeTab === 'register' && (
        <div className="space-y-4">
          {currentEvents.map(ev => (
            <div key={ev.id}>
              <h3 className="font-semibold mb-3">{CATEGORY_LABELS[ev.category]}</h3>
              <RegistrationList event={ev} teams={teamsMap[ev.id] || []} isOrganizer={isOrganizer} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
