'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — BulkAddModal Component
// Paste danh sách + fuzzy match + confirm
// ═══════════════════════════════════════════

import { useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, Loader2, Users } from 'lucide-react';
import { parseBulkText, fuzzyMatchBulk } from '@/lib/utils/fuzzyPlayerSearch';
import { bulkAddTeams } from '@/lib/supabase/committeeApi';
import type { Player, FuzzyMatchResult } from '@/types';

interface BulkAddModalProps {
  eventId: string;
  allPlayers: Player[];
  onSuccess: (count: number) => void;
  onClose: () => void;
}

export function BulkAddModal({ eventId, allPlayers, onSuccess, onClose }: BulkAddModalProps) {
  const [rawText, setRawText] = useState('');
  const [results, setResults] = useState<FuzzyMatchResult[]>([]);
  const [parsed, setParsed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleParse = useCallback(() => {
    const lines = parseBulkText(rawText);
    const matched = fuzzyMatchBulk(lines, allPlayers);
    setResults(matched);
    setParsed(true);
  }, [rawText, allPlayers]);

  const selectCandidate = (rowIndex: number, player: Player, isPartner = false) => {
    setResults(prev => prev.map((r, i) => {
      if (i !== rowIndex) return r;
      return isPartner ? { ...r, selectedPartner: player } : { ...r, selectedPlayer: player };
    }));
  };

  const handleConfirmAll = async () => {
    const valid = results.filter(r => r.selectedPlayer !== null);
    if (valid.length === 0) return;
    setLoading(true);
    const pairs = valid.map(r => ({
      player1Id: r.selectedPlayer!.id,
      player2Id: r.selectedPartner?.id,
      avgElo: r.selectedPlayer && r.selectedPartner
        ? ((r.selectedPlayer.elo_rating ?? 1000) + (r.selectedPartner.elo_rating ?? 1000)) / 2
        : r.selectedPlayer?.elo_rating ?? 1000,
    }));
    const count = await bulkAddTeams(eventId, pairs);
    setLoading(false);
    onSuccess(count);
  };

  const readyCount = results.filter(r => r.selectedPlayer !== null).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="font-bold text-lg">Thêm hàng loạt VĐV</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!parsed ? (
            /* Step 1: Paste text */
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted-fg)]">
                Mỗi dòng là 1 người hoặc 1 cặp (dùng dấu <code className="bg-[var(--bg)] px-1 rounded">+</code>):
              </p>
              <div className="bg-[var(--bg)] border border-[var(--border-color)] rounded-lg p-3 text-xs text-[var(--muted-fg)] font-mono space-y-0.5">
                <div>Minh + Hùng</div>
                <div>Tuấn + Nam</div>
                <div>Phong</div>
                <div>Đức + Long</div>
              </div>
              <textarea
                className="input w-full h-44 font-mono text-sm resize-none"
                placeholder={"Minh + Hùng\nTuấn + Nam\nPhong\n..."}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                autoFocus
              />
              <button
                onClick={handleParse}
                disabled={!rawText.trim()}
                className="btn btn-gradient w-full"
              >
                Phân tích danh sách →
              </button>
            </div>
          ) : (
            /* Step 2: Review matches */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  <span className="text-green-400">{readyCount} sẵn sàng</span>
                  {' / '}
                  <span className="text-[var(--muted-fg)]">{results.length} tổng</span>
                </p>
                <button onClick={() => setParsed(false)} className="text-xs text-[var(--primary)] hover:underline">
                  ← Sửa danh sách
                </button>
              </div>

              {results.map((r, i) => (
                <div key={i} className="border border-[var(--border-color)] rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {r.selectedPlayer !== null
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      : r.status === 'ambiguous'
                      ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    <p className="text-sm font-medium">{r.rawText}</p>
                  </div>

                  {/* Player selection */}
                  {r.status === 'matched' && r.selectedPlayer && (
                    <div className="ml-6 text-xs text-green-400">
                      ✓ {r.selectedPlayer.full_name}
                      {r.selectedPlayer.department?.name && ` (${r.selectedPlayer.department.name})`}
                      {' — ELO '}{r.selectedPlayer.elo_rating}
                    </div>
                  )}

                  {r.status === 'ambiguous' && (
                    <div className="ml-6 space-y-1">
                      <p className="text-xs text-amber-400">Chọn 1 người:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {r.candidates.map(c => (
                          <button
                            key={c.id}
                            onClick={() => selectCandidate(i, c)}
                            className={`px-2 py-1 rounded text-xs border transition-colors ${
                              r.selectedPlayer?.id === c.id
                                ? 'border-green-400 bg-green-400/10 text-green-400'
                                : 'border-[var(--border-color)] text-[var(--muted-fg)] hover:border-[var(--primary)]'
                            }`}
                          >
                            {c.full_name} ({c.department?.name ?? c.email?.split('@')[0]})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {r.status === 'not_found' && (
                    <p className="ml-6 text-xs text-red-400">❌ Không tìm thấy — sẽ bỏ qua</p>
                  )}

                  {/* Partner selection (doubles) */}
                  {r.partnerText && (
                    <div className="ml-6 border-t border-[var(--border-color)] pt-2 space-y-1">
                      <p className="text-xs text-[var(--muted-fg)]">Partner: <span className="font-medium">{r.partnerText}</span></p>
                      {r.partnerStatus === 'matched' && r.selectedPartner && (
                        <p className="text-xs text-green-400">✓ {r.selectedPartner.full_name}</p>
                      )}
                      {r.partnerStatus === 'ambiguous' && (
                        <div className="flex flex-wrap gap-1.5">
                          {(r.partnerCandidates ?? []).map(c => (
                            <button
                              key={c.id}
                              onClick={() => selectCandidate(i, c, true)}
                              className={`px-2 py-1 rounded text-xs border transition-colors ${
                                r.selectedPartner?.id === c.id
                                  ? 'border-green-400 bg-green-400/10 text-green-400'
                                  : 'border-[var(--border-color)] text-[var(--muted-fg)] hover:border-[var(--primary)]'
                              }`}
                            >
                              {c.full_name}
                            </button>
                          ))}
                        </div>
                      )}
                      {r.partnerStatus === 'not_found' && (
                        <p className="text-xs text-red-400">❌ Không tìm thấy partner</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {parsed && (
          <div className="p-5 border-t border-[var(--border-color)] flex gap-3">
            <button onClick={onClose} className="btn btn-ghost flex-1">Huỷ</button>
            <button
              onClick={handleConfirmAll}
              disabled={loading || readyCount === 0}
              className="btn btn-gradient flex-1 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Đang thêm...' : `Thêm ${readyCount} VĐV/đội`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
