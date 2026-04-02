'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — SeedEditor Component
// Drag-drop seed ordering for tournament teams
// ═══════════════════════════════════════════

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, RotateCcw, Trophy } from 'lucide-react';
import { updateTeamSeed } from '@/lib/supabase/committeeApi';
import type { TournamentTeamExtended } from '@/types';

const TIER_COLORS: Record<string, string> = {
  challenger: '#ff4757', diamond: '#a29bfe', platinum: '#00cec9',
  gold: '#f9ca24', silver: '#b2bec3', bronze: '#cd853f', beginner: '#74b9ff',
};

interface SeedEditorProps {
  teams: TournamentTeamExtended[];
  onUpdate?: (teams: TournamentTeamExtended[]) => void;
}

function getTeamName(team: TournamentTeamExtended): string {
  if (team.team_name) return team.team_name;
  const p1 = team.player1?.full_name ?? 'VĐV 1';
  const p2 = team.player2?.full_name;
  return p2 ? `${p1} + ${p2}` : p1;
}

export function SeedEditor({ teams, onUpdate }: SeedEditorProps) {
  const [ordered, setOrdered] = useState<TournamentTeamExtended[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sorted = [...teams].sort((a, b) => (a.seed_number ?? 99) - (b.seed_number ?? 99));
    setOrdered(sorted);
  }, [teams]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const reordered = [...ordered];
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    const updated = reordered.map((t, i) => ({ ...t, seed_number: i + 1 }));
    setOrdered(updated);
    onUpdate?.(updated);

    setSaving(true);
    await Promise.all(updated.map(t => updateTeamSeed(t.id, t.seed_number ?? 0)));
    setSaving(false);
  };

  const autoSeedByElo = async () => {
    const sorted = [...ordered].sort((a, b) => (b.avg_elo ?? 0) - (a.avg_elo ?? 0));
    const updated = sorted.map((t, i) => ({ ...t, seed_number: i + 1 }));
    setOrdered(updated);
    onUpdate?.(updated);
    setSaving(true);
    await Promise.all(updated.map(t => updateTeamSeed(t.id, t.seed_number ?? 0)));
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-fg)]">Kéo để thay đổi thứ tự seed</p>
        <button
          onClick={autoSeedByElo}
          disabled={saving}
          className="btn btn-sm btn-secondary flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {saving ? 'Đang lưu...' : 'Auto-seed theo ELO'}
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="seed-list">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-2"
            >
              {ordered.map((team, index) => (
                <Draggable key={team.id} draggableId={team.id} index={index}>
                  {(drag, snapshot) => (
                    <div
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        snapshot.isDragging
                          ? 'border-[var(--primary)] bg-[var(--primary)]/10 shadow-lg scale-[1.02]'
                          : 'border-[var(--border-color)] bg-[var(--card-bg)]'
                      }`}
                    >
                      {/* Drag Handle */}
                      <div {...drag.dragHandleProps} className="text-[var(--muted-fg)] cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Seed badge */}
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-xs font-bold text-[var(--primary)]">
                        {index + 1}
                      </div>

                      {/* Team info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{getTeamName(team)}</p>
                        <p className="text-xs text-[var(--muted-fg)]">
                          ELO avg: {Math.round(team.avg_elo ?? 0)}
                        </p>
                      </div>

                      {/* Tier badge */}
                      {team.player1?.tier && (
                        <span
                          className="px-2 py-0.5 rounded text-xs font-semibold"
                          style={{
                            background: (TIER_COLORS[team.player1.tier] ?? '#888') + '22',
                            color: TIER_COLORS[team.player1.tier] ?? '#888',
                          }}
                        >
                          {team.player1.tier.toUpperCase()}
                        </span>
                      )}

                      {/* Trophy for top 3 */}
                      {index < 3 && (
                        <Trophy
                          className="w-4 h-4"
                          style={{ color: ['#f9ca24', '#b2bec3', '#cd853f'][index] }}
                        />
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
