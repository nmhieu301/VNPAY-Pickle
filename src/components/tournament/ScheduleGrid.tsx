'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — ScheduleGrid Component
// Lưới sân × thời gian với drag-drop
// ═══════════════════════════════════════════

import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { RotateCcw, Bell, Undo2, Save, AlertCircle } from 'lucide-react';
import { useScheduleEditor } from '@/hooks/useScheduleEditor';
import type { TournamentMatch, TournamentTeamExtended, Tournament, ConflictResult } from '@/types';

const ROUND_COLORS: Record<string, string> = {
  pool: '#4361ee',
  quarter: '#f9ca24',
  semi: '#f97316',
  final: '#ef4444',
  third_place: '#a29bfe',
  grand_final: '#f72585',
  winner_r1: '#4361ee', winner_r2: '#4361ee',
  loser_r1: '#74b9ff', loser_r2: '#74b9ff',
};

const ROUND_LABELS: Record<string, string> = {
  pool: 'Vòng bảng', quarter: 'Tứ kết', semi: 'Bán kết',
  final: 'Chung kết', third_place: 'Hạng 3', grand_final: 'Grand Final',
  winner_r1: 'SB Thua 1', winner_r2: 'SB Thua 2',
  loser_r1: 'SB Thua 1', loser_r2: 'SB Thua 2',
};

const SLOT_MINUTES = 30;

function slotKey(court: number, slotIndex: number) {
  return `court-${court}-slot-${slotIndex}`;
}

function getSlotIndex(timeISO: string, baseTime: Date): number {
  const t = new Date(timeISO);
  return Math.floor((t.getTime() - baseTime.getTime()) / (SLOT_MINUTES * 60_000));
}

function slotToTime(slotIndex: number, baseTime: Date): Date {
  return new Date(baseTime.getTime() + slotIndex * SLOT_MINUTES * 60_000);
}

function getTeamName(team: TournamentTeamExtended | undefined): string {
  if (!team) return 'TBD';
  if (team.team_name) return team.team_name;
  const p1 = team.player1?.full_name?.split(' ').pop() ?? '?';
  const p2 = team.player2?.full_name?.split(' ').pop();
  return p2 ? `${p1}+${p2}` : p1;
}

interface ScheduleGridProps {
  initialMatches: TournamentMatch[];
  teams: TournamentTeamExtended[];
  tournament: Tournament;
  currentUserId: string;
  onPublish?: () => void;
}

export function ScheduleGrid({ initialMatches, teams, tournament, currentUserId, onPublish }: ScheduleGridProps) {
  const { matches, canUndo, isSaving, moveMatch, swapMatches, undo, validateMove } = useScheduleEditor(initialMatches);
  const [conflictWarning, setConflictWarning] = useState<ConflictResult[]>([]);
  const [pendingSwap, setPendingSwap] = useState<string[]>([]);
  const [dragConflict, setDragConflict] = useState<string | null>(null); // slot key with error

  const teamById = useMemo(() =>
    Object.fromEntries(teams.map(t => [t.id, t])), [teams]
  );

  // Build time range from matches
  const scheduledTimes = matches
    .map(m => m.scheduled_time)
    .filter(Boolean) as string[];
  const baseTime = useMemo(() => {
    if (scheduledTimes.length === 0) {
      const d = new Date();
      d.setHours(8, 0, 0, 0);
      return d;
    }
    const min = Math.min(...scheduledTimes.map(t => new Date(t).getTime()));
    const base = new Date(min);
    base.setMinutes(0, 0, 0);
    return base;
  }, [scheduledTimes]);

  const maxSlot = useMemo(() => {
    if (scheduledTimes.length === 0) return 16; // 8 hours default
    const max = Math.max(...scheduledTimes.map(t => getSlotIndex(t, baseTime)));
    return Math.max(max + 4, 8);
  }, [scheduledTimes, baseTime]);

  const courts = useMemo(() => {
    const courtNums = matches.map(m => m.court_number).filter(Boolean) as number[];
    if (courtNums.length === 0) return Array.from({ length: tournament.num_courts }, (_, i) => i + 1);
    return [...new Set(courtNums)].sort((a, b) => a - b);
  }, [matches, tournament.num_courts]);

  // Build occupancy map: slotKey → match
  const occupancy = useMemo(() => {
    const map = new Map<string, TournamentMatch>();
    for (const m of matches) {
      if (!m.scheduled_time || !m.court_number) continue;
      const si = getSlotIndex(m.scheduled_time, baseTime);
      map.set(slotKey(m.court_number, si), m);
    }
    return map;
  }, [matches, baseTime]);

  const handleDragEnd = async (result: DropResult) => {
    setDragConflict(null);
    if (!result.destination) return;

    const matchId = result.draggableId;
    const destParts = result.destination.droppableId.split('-');
    const court = parseInt(destParts[1]);
    const slotIdx = parseInt(destParts[3]);
    const newTime = slotToTime(slotIdx, baseTime).toISOString();

    // Check if destination has another match → offer swap
    const existing = occupancy.get(slotKey(court, slotIdx));
    if (existing && existing.id !== matchId) {
      const ok = confirm(`Slot đã có trận khác. Hoán đổi 2 trận?`);
      if (!ok) return;
      await swapMatches(matchId, existing.id, currentUserId);
      return;
    }

    // Validate
    const conflicts = await moveMatch(matchId, court, newTime, currentUserId, {
      matchDurationMinutes: tournament.max_match_minutes ?? 45,
      minRestMinutes: tournament.rest_minutes,
    });

    const errors = conflicts.filter(c => c.severity === 'error');
    const warnings = conflicts.filter(c => c.severity === 'warning');

    if (errors.length > 0) {
      setDragConflict(slotKey(court, slotIdx));
      setConflictWarning(errors);
      return;
    }
    if (warnings.length > 0) {
      setConflictWarning(warnings);
    }
  };

  const handleSelectForSwap = (matchId: string) => {
    if (pendingSwap.includes(matchId)) {
      setPendingSwap(prev => prev.filter(id => id !== matchId));
      return;
    }
    if (pendingSwap.length === 1) {
      swapMatches(pendingSwap[0], matchId, currentUserId);
      setPendingSwap([]);
    } else {
      setPendingSwap([matchId]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={undo}
          disabled={!canUndo || isSaving}
          className="btn btn-sm btn-ghost flex items-center gap-1.5 disabled:opacity-40"
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>
        <button
          onClick={onPublish}
          className="btn btn-sm btn-secondary flex items-center gap-1.5"
        >
          <Bell className="w-3.5 h-3.5" /> Publish lịch
        </button>
        {isSaving && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <Save className="w-3 h-3 animate-pulse" /> Đang lưu...
          </span>
        )}
        {pendingSwap.length === 1 && (
          <span className="text-xs text-blue-400 ml-auto border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 rounded-lg">
            Đã chọn 1 trận — click trận 2 để hoán đổi
          </span>
        )}
      </div>

      {/* Conflict warning */}
      {conflictWarning.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            {conflictWarning.map((c, i) => (
              <p key={i} className={`text-xs ${c.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                {c.severity === 'error' ? '❌' : '⚠️'} {c.message}
              </p>
            ))}
          </div>
          <button onClick={() => setConflictWarning([])} className="text-[var(--muted-fg)] text-xs">✕</button>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-2 flex-wrap text-xs text-[var(--muted-fg)]">
        {Object.entries({ pool: 'Vòng bảng', quarter: 'Tứ kết', semi: 'Bán kết', final: 'Chung kết' }).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ROUND_COLORS[k] }} />
            {label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `80px repeat(${courts.length}, minmax(160px, 1fr))`,
              minWidth: `${80 + courts.length * 160}px`,
            }}
          >
            {/* Header row */}
            <div className="bg-[var(--card-bg)] border-b border-r border-[var(--border-color)] p-2 text-xs text-[var(--muted-fg)] font-semibold flex items-end">
              Giờ
            </div>
            {courts.map(c => (
              <div
                key={c}
                className="bg-[var(--card-bg)] border-b border-r border-[var(--border-color)] p-2 text-xs font-bold text-center text-[var(--primary)]"
              >
                🏓 Sân {c}
              </div>
            ))}

            {/* Time slots */}
            {Array.from({ length: maxSlot }, (_, slotIdx) => {
              const slotTime = slotToTime(slotIdx, baseTime);
              const timeStr = slotTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              return (
                <>
                  {/* Time label */}
                  <div
                    key={`time-${slotIdx}`}
                    className="border-b border-r border-[var(--border-color)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--muted-fg)] flex items-center"
                    style={{ minHeight: 64 }}
                  >
                    {timeStr}
                  </div>
                  {/* Court cells */}
                  {courts.map(court => {
                    const key = slotKey(court, slotIdx);
                    const match = occupancy.get(key);
                    const hasConflict = dragConflict === key;

                    return (
                      <Droppable key={key} droppableId={key}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`border-b border-r border-[var(--border-color)] p-1 transition-colors ${
                              snapshot.isDraggingOver
                                ? hasConflict
                                  ? 'bg-red-500/20 border-red-500/40'
                                  : 'bg-[var(--primary)]/10 border-[var(--primary)]/30'
                                : 'bg-transparent'
                            }`}
                            style={{ minHeight: 64 }}
                          >
                            {match && match.status !== 'completed' && match.status !== 'cancelled' && (
                              <Draggable
                                draggableId={match.id}
                                index={0}
                                isDragDisabled={match.status === 'live'}
                              >
                                {(drag, snapDrag) => (
                                  <div
                                    ref={drag.innerRef}
                                    {...drag.draggableProps}
                                    {...drag.dragHandleProps}
                                    onClick={() => handleSelectForSwap(match.id)}
                                    className={`rounded-lg p-1.5 text-[10px] leading-tight cursor-grab active:cursor-grabbing transition-all ${
                                      snapDrag.isDragging ? 'shadow-xl scale-105 opacity-90' : ''
                                    } ${pendingSwap.includes(match.id) ? 'ring-2 ring-blue-400' : ''} ${
                                      match.status === 'live' ? 'cursor-not-allowed opacity-80' : ''
                                    }`}
                                    style={{
                                      background: (ROUND_COLORS[match.round_type] ?? '#4361ee') + '22',
                                      borderLeft: `3px solid ${ROUND_COLORS[match.round_type] ?? '#4361ee'}`,
                                    }}
                                  >
                                    <div className="font-semibold" style={{ color: ROUND_COLORS[match.round_type] ?? '#4361ee' }}>
                                      {ROUND_LABELS[match.round_type] ?? match.round_type}
                                      {match.status === 'live' && ' 🔴'}
                                    </div>
                                    <div className="text-[var(--fg)] opacity-90 truncate">
                                      {getTeamName(teamById[match.team_a_id ?? ''])}
                                    </div>
                                    <div className="text-[var(--muted-fg)]">vs</div>
                                    <div className="text-[var(--fg)] opacity-90 truncate">
                                      {getTeamName(teamById[match.team_b_id ?? ''])}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            )}
                            {match && (match.status === 'completed' || match.status === 'cancelled') && (
                              <div className="rounded-lg p-1.5 text-[10px] opacity-40 bg-[var(--bg)] truncate">
                                {getTeamName(teamById[match.team_a_id ?? ''])} vs {getTeamName(teamById[match.team_b_id ?? ''])}
                                {match.status === 'completed' && ' ✓'}
                              </div>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      <p className="text-xs text-[var(--muted-fg)] text-center">
        💡 Kéo trận vào ô khác để đổi sân/giờ. Click 2 trận để hoán đổi. Trận đang live 🔴 không thể di chuyển.
      </p>
    </div>
  );
}
