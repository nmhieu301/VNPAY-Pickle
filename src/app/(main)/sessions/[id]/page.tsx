'use client';

import { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { PlayerCard } from '@/components/player/PlayerCard';
import { CourtView } from '@/components/session/CourtView';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, MapPin, Calendar, Clock, Zap, CheckCircle, XCircle, Shuffle, Copy, Bell, Play } from 'lucide-react';
import { PickleballIcon } from '@/components/icons/PickleballIcon';
import { randomMatching, eloBalancedMatching } from '@/lib/algorithms/matching';
import { formatMatchingResult, copyToClipboard } from '@/lib/utils/copyText';
import { Player } from '@/types';

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const {
    getSession, getPlayer, getVenue, sessionPlayers, checkedInPlayers,
    currentUser, joinSession, leaveSession, toggleCheckIn, players,
    matchingResults, setMatchingResult
  } = useAppStore();

  const session = getSession(id);
  const [copied, setCopied] = useState(false);
  const [showMatching, setShowMatching] = useState(false);

  const playerIds = sessionPlayers[id] || [];
  const checkedIds = checkedInPlayers[id] || [];

  const sessionPlayerList = useMemo(() =>
    playerIds.map(pid => players.find(p => p.id === pid)).filter(Boolean) as Player[],
    [playerIds, players]
  );

  const checkedInList = useMemo(() =>
    checkedIds.map(pid => players.find(p => p.id === pid)).filter(Boolean) as Player[],
    [checkedIds, players]
  );

  if (!session || !currentUser) {
    return (
      <div className="text-center py-16">
        <span className="text-4xl block mb-3">🔍</span>
        <p className="font-medium">Không tìm thấy lịch thi đấu</p>
        <button onClick={() => router.push('/sessions')} className="btn btn-primary mt-4">
          ← Quay lại
        </button>
      </div>
    );
  }

  const venue = session.venue_id ? getVenue(session.venue_id) : null;
  const host = getPlayer(session.host_id);
  const isHost = currentUser.id === session.host_id;
  const isJoined = playerIds.includes(currentUser.id);
  const isCheckedIn = checkedIds.includes(currentUser.id);
  const matchResult = matchingResults[id];

  const handleMatch = () => {
    const matchFn = session.match_mode === 'elo_balanced' ? eloBalancedMatching : randomMatching;
    const result = matchFn(checkedInList, session.num_courts, session.sport_mode !== 'singles');
    setMatchingResult(id, result);
    setShowMatching(true);
  };

  const handleReshuffle = () => {
    const matchFn = session.match_mode === 'elo_balanced' ? eloBalancedMatching : randomMatching;
    const result = matchFn(checkedInList, session.num_courts, session.sport_mode !== 'singles');
    setMatchingResult(id, result);
  };

  const handleCopy = async () => {
    if (!matchResult) return;
    const text = formatMatchingResult(
      matchResult,
      session.title,
      venue?.name || 'N/A',
      session.match_mode,
      new Date(session.date)
    );
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => router.push('/sessions')} className="btn btn-ghost">
        <ArrowLeft className="w-4 h-4" /> Lịch thi đấu
      </button>

      {/* Session Info */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{session.title}</h1>
            <p className="text-sm text-[var(--muted-fg)]">
              Tổ chức bởi {host?.nickname || host?.full_name}
            </p>
          </div>
          <span className={`badge ${
            session.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
            session.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {session.status === 'open' ? '📝 Đang mở' : session.status === 'in_progress' ? '▶️ Đang diễn ra' : '✅ Kết thúc'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-[var(--muted-fg)]">
            <Calendar className="w-4 h-4" /> {session.date}
          </div>
          <div className="flex items-center gap-2 text-[var(--muted-fg)]">
            <Clock className="w-4 h-4" /> {session.start_time} – {session.end_time}
          </div>
          {venue && (
            <div className="flex items-center gap-2 text-[var(--muted-fg)]">
              <MapPin className="w-4 h-4" /> {venue.name}
            </div>
          )}
          <div className="flex items-center gap-2 text-[var(--muted-fg)]">
            <Zap className="w-4 h-4" />
            {session.match_mode === 'elo_balanced' ? '⚖️ Cân bằng ELO' : session.match_mode === 'random' ? '🎲 Ngẫu nhiên' : '✏️ Thủ công'}
          </div>
          <div className="flex items-center gap-2 text-[var(--muted-fg)]">
            <Users className="w-4 h-4" /> {playerIds.length}{session.max_players ? `/${session.max_players}` : ''} người
          </div>
          <div className="flex items-center gap-2 text-[var(--muted-fg)]">
            <PickleballIcon size={16} className="inline-block mr-1 -mt-0.5" /> {session.num_courts} sân ∙ {session.sport_mode === 'doubles' ? 'Đôi nam' : session.sport_mode === 'singles' ? 'Đánh đơn' : session.sport_mode === 'mixed' ? 'Đôi nam nữ' : 'Đôi nữ'}
          </div>
        </div>

        {session.notes && (
          <p className="mt-3 p-2 rounded-lg bg-[var(--muted)] text-sm text-[var(--muted-fg)]">
            📝 {session.notes}
          </p>
        )}

        {/* Action Buttons */}
        {session.status === 'open' && (
          <div className="flex gap-2 mt-4">
            {!isJoined ? (
              <button onClick={() => joinSession(id)} className="btn btn-gradient flex-1">
                <PickleballIcon size={16} className="inline-block mr-1" /> Tham gia
              </button>
            ) : (
              <>
                {!isCheckedIn ? (
                  <button onClick={() => toggleCheckIn(id, currentUser.id)} className="btn btn-gradient flex-1">
                    <CheckCircle className="w-4 h-4" /> Check-in
                  </button>
                ) : (
                  <span className="btn flex-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 cursor-default">
                    ✅ Đã check-in
                  </span>
                )}
                <button onClick={() => leaveSession(id)} className="btn btn-ghost text-red-500">
                  <XCircle className="w-4 h-4" /> Rời
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>

      {/* Players */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">👥 Người chơi ({playerIds.length})</h2>
          <span className="text-sm text-[var(--muted-fg)]">
            ✅ {checkedIds.length} đã check-in
          </span>
        </div>

        <div className="card divide-y divide-[var(--border-color)]">
          {sessionPlayerList.map(player => {
            const checked = checkedIds.includes(player.id);
            return (
              <div key={player.id} className="flex items-center gap-2 px-3 py-2">
                <div className="flex-1">
                  <PlayerCard player={player} compact showDepartment={false} />
                </div>
                {checked && <span className="text-green-500 text-sm">✅</span>}
                {isHost && !checked && (
                  <button
                    onClick={() => toggleCheckIn(id, player.id)}
                    className="btn btn-ghost btn-sm text-xs"
                  >
                    Check-in
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Matching Section */}
      {(isHost || matchResult) && checkedInList.length >= 2 && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold"><PickleballIcon size={20} className="inline-block mr-1 -mt-0.5" /> Chia cặp</h2>
            {!matchResult && isHost && (
              <button onClick={handleMatch} className="btn btn-gradient">
                <Play className="w-4 h-4" /> Chia cặp ({checkedInList.length} người)
              </button>
            )}
          </div>

          {matchResult && (
            <div className="space-y-4">
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button onClick={handleReshuffle} className="btn btn-secondary btn-sm">
                  <Shuffle className="w-4 h-4" /> Xáo lại
                </button>
                <button onClick={handleCopy} className="btn btn-secondary btn-sm">
                  <Copy className="w-4 h-4" /> {copied ? '✅ Đã copy!' : 'Copy kết quả'}
                </button>
              </div>

              {/* Courts */}
              <div className="grid gap-4 md:grid-cols-2">
                {matchResult.courts.map((court) => (
                  <CourtView key={court.court_number} court={court} />
                ))}
              </div>

              {/* Waiting queue */}
              {matchResult.waiting.length > 0 && (
                <div className="card p-4">
                  <h3 className="font-semibold text-sm mb-2">⏳ Hàng chờ ({matchResult.waiting.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.waiting.map(p => (
                      <span key={p.id} className="badge bg-[var(--muted)] text-[var(--muted-fg)]">
                        {p.nickname || p.full_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="text-center text-sm text-[var(--muted-fg)]">
                Tổng chênh lệch ELO: <span className="font-mono font-bold">{matchResult.totalEloDiff}</span>
                {matchResult.totalEloDiff <= 50 * matchResult.courts.length ? ' ✅' : ' ⚠️'}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
