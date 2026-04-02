'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — Group Schedule Detail Page
// /groups/:groupId/schedules/:scheduleId
// ═══════════════════════════════════════════

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Users, Clock, CalendarRange,
  Repeat, Settings, ChevronDown, ChevronUp, Loader2, CalendarCheck,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useRecurringSchedule } from '@/hooks/useRecurringSchedule';
import { useAttendance } from '@/hooks/useAttendance';
import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar';
import { SubscribeButton } from '@/components/schedule/SubscribeButton';
import { ExceptionModal } from '@/components/schedule/ExceptionModal';
import { SessionCard } from '@/components/session/SessionCard';
import { TierBadge } from '@/components/player/TierBadge';
import { RsvpButtons } from '@/components/attendance/RsvpButtons';
import { AttendanceSummary } from '@/components/attendance/AttendanceSummary';
import { CheckInButton } from '@/components/attendance/CheckInButton';
import { HostCheckInPanel } from '@/components/attendance/HostCheckInPanel';
import { StreakBadge } from '@/components/attendance/StreakBadge';
import { sendNotification } from '@/lib/supabase/committeeApi';

export default function GroupScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string; scheduleId: string }>;
}) {
  const { id: groupId, scheduleId } = use(params);
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);

  const {
    schedule, subscribers, exceptions, upcomingSessions, pastSessions,
    stats, isLoading, isSubscribed, recurrenceDesc, nextDate,
    subscribe, unsubscribe, cancelSession, refresh,
  } = useRecurringSchedule(scheduleId, currentUser?.id ?? null);

  const [showPast, setShowPast] = useState(false);
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [exceptionModal, setExceptionModal] = useState<{ date: string } | null>(null);

  // Buổi sắp tới: dùng nextDate để lấy occurrence_date cho RSVP
  const nextOccurrenceDate: string | null = nextDate
    ? (nextDate instanceof Date ? nextDate.toISOString().split('T')[0] : String(nextDate))
    : (upcomingSessions[0]?.date ?? null);
  const attendance = useAttendance({
    scheduleId,
    occurrenceDate: nextOccurrenceDate ?? '',
    currentPlayerId: currentUser?.id ?? '',
    startTime: schedule?.start_time?.slice(0, 5),
  });

  if (isLoading || !schedule) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  const isCreator = schedule.creator_id === currentUser?.id;
  const nextSessionId = upcomingSessions[0]?.id ?? null;

  const handleCalendarClick = (date: string) => {
    setSelectedCalDate(date === selectedCalDate ? null : date);
    if (isCreator) setExceptionModal({ date });
  };

  const handleException = async (params: {
    action: 'cancel' | 'reschedule';
    reason?: string;
    newDate?: string;
    newStartTime?: string;
    newEndTime?: string;
  }) => {
    if (!exceptionModal || !currentUser) return;
    await cancelSession(exceptionModal.date, params.reason ?? '');

    // Send notification to subscribers
    if (params.action === 'cancel') {
      await Promise.all(
        subscribers.map(s =>
          sendNotification({
            userId: s.player_id,
            type: 'session',
            title: `❌ Buổi chơi ${exceptionModal.date} đã huỷ`,
            content: `${schedule.name}: ${params.reason ?? 'Không có lý do'}`,
            linkTo: `/groups/${groupId}/schedules/${scheduleId}`,
          })
        )
      );
    }
    await refresh();
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Back */}
      <Link
        href={`/groups/${groupId}`}
        className="flex items-center gap-1.5 text-xs text-[var(--muted-fg)] hover:text-[var(--fg)] w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Quay lại nhóm
      </Link>

      {/* Header card */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white flex-shrink-0">
              <Repeat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{schedule.name}</h1>
              {schedule.description && (
                <p className="text-sm text-[var(--muted-fg)] mt-0.5">{schedule.description}</p>
              )}
            </div>
          </div>
          {isCreator && (
            <Link
              href={`/groups/${groupId}/schedules/${scheduleId}/settings`}
              className="btn btn-ghost btn-icon btn-sm flex-shrink-0"
            >
              <Settings className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Meta */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-fg)]">
            <CalendarRange className="w-4 h-4" />
            <span>{recurrenceDesc}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--muted-fg)]">
            <Clock className="w-4 h-4" />
            <span>{schedule.start_time.slice(0, 5)} – {schedule.end_time.slice(0, 5)}</span>
          </div>
          {schedule.venue && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-fg)]">
              <MapPin className="w-4 h-4" />
              <span>{schedule.venue.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-[var(--muted-fg)]">
            <Users className="w-4 h-4" />
            <span>{subscribers.length} người theo dõi cố định</span>
          </div>
        </div>

        {/* Stats row */}
        {stats && stats.totalSessions > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-[var(--border-color)]">
            {[
              { label: 'Buổi đã chơi', value: stats.totalSessions },
              { label: 'Trung bình', value: `${stats.avgPlayers} người` },
              { label: 'Người theo', value: stats.subscriberCount },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-[var(--muted-fg)]">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Subscribe */}
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <SubscribeButton
            isSubscribed={isSubscribed}
            isCreator={isCreator}
            onSubscribe={subscribe}
            onUnsubscribe={unsubscribe}
            nextSessionId={nextSessionId}
          />
        </div>
      </div>

      {/* ─── RSVP & Check-in section ─── */}
      {currentUser && nextOccurrenceDate && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[var(--primary)]" />
              Điểm danh buổi tới
            </h2>
            {attendance.myStreak && attendance.myStreak.current_streak > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-fg)]">
                Streak của bạn: <StreakBadge streak={attendance.myStreak.current_streak} size="md" />
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Left: RSVP + check-in cá nhân */}
            <div className="card p-4 space-y-4">
              <RsvpButtons
                currentStatus={attendance.myRecord?.rsvp_status ?? 'no_response'}
                onRsvp={attendance.handleRsvp}
                isSubmitting={attendance.isSubmitting}
                occurrenceDate={nextOccurrenceDate}
              />
              {/* Check-in (chỉ hiện khi đã RSVP 'going' hoặc 'maybe') */}
              {(attendance.myRecord?.rsvp_status === 'going' || attendance.myRecord?.rsvp_status === 'maybe') && (
                <CheckInButton
                  isCheckedIn={attendance.myRecord?.checked_in ?? false}
                  canCheckIn={attendance.canCheckIn}
                  isSubmitting={attendance.isSubmitting}
                  onCheckIn={attendance.handleSelfCheckIn}
                  startTime={schedule.start_time.slice(0, 5)}
                />
              )}
            </div>

            {/* Right: Tổng hợp RSVP */}
            <div className="card p-4">
              <AttendanceSummary
                going={attendance.going}
                notGoing={attendance.notGoing}
                maybe={attendance.maybe}
                noResponse={attendance.noResponse}
                checkedIn={attendance.checkedIn}
                numCourts={schedule.num_courts}
                isBeforeSession={!attendance.canCheckIn || new Date() < new Date(`${nextOccurrenceDate}T${schedule.start_time}`)}
              />
            </div>
          </div>

          {/* Host panel */}
          {isCreator && attendance.records.length > 0 && (
            <div className="card p-4">
              <HostCheckInPanel
                records={attendance.records}
                onCheckIn={attendance.handleHostCheckIn}
              />
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      <ScheduleCalendar
        schedule={schedule}
        exceptions={exceptions}
        sessions={[...upcomingSessions, ...pastSessions]}
        onDateClick={handleCalendarClick}
        selectedDate={selectedCalDate}
      />
      {isCreator && (
        <p className="text-xs text-[var(--muted-fg)] -mt-3 px-1">
          💡 Nhấn vào ngày trên lịch để huỷ hoặc dời buổi đó
        </p>
      )}

      {/* Upcoming sessions */}
      <div>
        <h2 className="font-semibold text-sm mb-3">📅 Buổi sắp tới</h2>
        {upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            {upcomingSessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-[var(--muted-fg)] text-sm">
            Chưa có buổi nào được tạo trong 4 tuần tới
          </div>
        )}
      </div>

      {/* Subscribers */}
      {subscribers.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-3">👥 Thành viên cố định ({subscribers.length})</h2>
          <div className="card divide-y divide-[var(--border-color)]">
            {subscribers.map(sub => (
              <div key={sub.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-sm font-bold">
                  {sub.player?.full_name?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {sub.player?.nickname || sub.player?.full_name || 'Ẩn danh'}
                  </p>
                </div>
                {sub.player && <TierBadge elo={sub.player.elo_rating} size="sm" showLabel={false} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past sessions (collapsible) */}
      {pastSessions.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(p => !p)}
            className="flex items-center gap-2 text-sm font-semibold text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors"
          >
            {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Buổi đã chơi ({pastSessions.length})
          </button>
          {showPast && (
            <div className="space-y-3 mt-3">
              {pastSessions.map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exception modal */}
      {exceptionModal && (
        <ExceptionModal
          isOpen
          date={exceptionModal.date}
          scheduleStartTime={schedule.start_time}
          scheduleEndTime={schedule.end_time}
          onConfirm={handleException}
          onClose={() => setExceptionModal(null)}
        />
      )}
    </div>
  );
}
