'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — PlayerManager Component
// Quản lý VĐV: thêm thủ công, bulk, guest
// ═══════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  Search, UserPlus, Users, Upload, Shield, ChevronDown,
  RefreshCw, Shuffle, ArrowUpDown,
} from 'lucide-react';
import {
  searchPlayers, addPlayerToEvent, fetchAllPlayers,
  changeTeamStatus, changeTeamPartner,
} from '@/lib/supabase/committeeApi';
import { BulkAddModal } from './BulkAddModal';
import { GuestPlayerForm } from './GuestPlayerForm';
import dynamic from 'next/dynamic';

// Lazy-load SeedEditor — it uses @hello-pangea/dnd which is a heavy dependency
const SeedEditor = dynamic(
  () => import('./SeedEditor').then(m => ({ default: m.SeedEditor })),
  {
    loading: () => <div className="card p-8 text-center text-[var(--muted-fg)]">Đang tải...</div>,
    ssr: false,
  }
);
import type { TournamentTeamExtended, TournamentEvent, Player } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  confirmed: '✅ Xác nhận', pending: '⏳ Chờ', withdrawn: '🚫 Rút', disqualified: '❌ Loại',
};
const STATUS_COLORS: Record<string, string> = {
  confirmed: 'text-green-400 bg-green-400/10',
  pending: 'text-amber-400 bg-amber-400/10',
  withdrawn: 'text-[var(--muted-fg)] bg-[var(--bg)]',
  disqualified: 'text-red-400 bg-red-400/10',
};

interface PlayerManagerProps {
  event: TournamentEvent;
  teams: TournamentTeamExtended[];
  currentUserId: string;
  tournamentId: string;
  onRefresh: () => void;
}

function getTeamName(team: TournamentTeamExtended): string {
  if (team.team_name) return team.team_name;
  const p1 = team.player1?.full_name ?? '?';
  const p2 = team.player2?.full_name;
  return p2 ? `${p1} + ${p2}` : p1;
}

// ─── Add Single Player Form ───
function AddSinglePlayerForm({
  event, currentUserId, allPlayers, onAdded,
}: {
  event: TournamentEvent;
  currentUserId: string;
  allPlayers: Player[];
  onAdded: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Player | null>(null);
  const [partner, setPartner] = useState<Player | null>(null);
  const [partnerQuery, setPartnerQuery] = useState('');
  const [partnerResults, setPartnerResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  const isDoubles = event.category.includes('doubles');

  const handleSearch = async (q: string, isPartner = false) => {
    if (q.length < 1) { isPartner ? setPartnerResults([]) : setResults([]); return; }
    const found = await searchPlayers(q, 8);
    isPartner ? setPartnerResults(found) : setResults(found);
  };

  const handleAdd = async () => {
    if (!selected) return;
    setLoading(true);
    await addPlayerToEvent(
      event.id,
      selected.id,
      isDoubles ? partner?.id : undefined,
      undefined,
    );
    setLoading(false);
    setQuery(''); setSelected(null); setResults([]);
    setPartnerQuery(''); setPartner(null); setPartnerResults([]);
    onAdded();
  };

  return (
    <div className="card p-4 space-y-3 border border-[var(--border-color)]">
      <p className="text-sm font-semibold text-[var(--primary)] flex items-center gap-1.5">
        <UserPlus className="w-4 h-4" /> Thêm VĐV có tài khoản
      </p>

      {/* Player 1 search */}
      <div className="space-y-1.5 relative">
        <label className="text-xs text-[var(--muted-fg)]">
          {isDoubles ? 'Cầu thủ 1' : 'Cầu thủ'}
        </label>
        {selected ? (
          <div className="flex items-center gap-2 p-2 bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-xs font-bold text-[var(--primary)]">
              {selected.full_name[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{selected.full_name}</p>
              <p className="text-xs text-[var(--muted-fg)]">Tier {selected.tier ?? 0}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs text-[var(--muted-fg)] hover:text-red-400">✕</button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
              <input
                className="input w-full pl-9"
                placeholder="Tìm tên / email / nickname..."
                value={query}
                onChange={e => { setQuery(e.target.value); handleSearch(e.target.value); }}
              />
            </div>
            {results.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden">
                {results.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelected(p); setResults([]); setQuery(p.full_name); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--primary)]/10 text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-xs font-bold text-[var(--primary)] shrink-0">
                      {p.full_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.full_name}</p>
                      <p className="text-xs text-[var(--muted-fg)]">{p.department?.name ?? p.email} — Tier {p.tier ?? 0}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Partner search (doubles only) */}
      {isDoubles && (
        <div className="space-y-1.5 relative">
          <label className="text-xs text-[var(--muted-fg)]">Cầu thủ 2 (partner)</label>
          {partner ? (
            <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                {partner.full_name[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{partner.full_name}</p>
                <p className="text-xs text-[var(--muted-fg)]">Tier {partner.tier ?? 0}</p>
              </div>
              <button onClick={() => setPartner(null)} className="text-xs text-[var(--muted-fg)] hover:text-red-400">✕</button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                <input
                  className="input w-full pl-9"
                  placeholder="Tìm partner (để trống = ghép sau)..."
                  value={partnerQuery}
                  onChange={e => { setPartnerQuery(e.target.value); handleSearch(e.target.value, true); }}
                />
              </div>
              {partnerResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden">
                  {partnerResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setPartner(p); setPartnerResults([]); setPartnerQuery(p.full_name); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-500/10 text-left transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                        {p.full_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.full_name}</p>
                        <p className="text-xs text-[var(--muted-fg)]">{p.department?.name ?? p.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={loading || !selected}
        className="btn btn-gradient btn-sm w-full"
      >
        {loading ? 'Đang thêm...' : '+ Thêm vào giải'}
      </button>
    </div>
  );
}

// ─── Team Row in List ───
function TeamRow({
  team, onStatusChange,
}: { team: TournamentTeamExtended; onStatusChange: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [changing, setChanging] = useState(false);

  const handleStatus = async (status: 'withdrawn' | 'disqualified' | 'confirmed') => {
    setMenuOpen(false);
    setChanging(true);
    await changeTeamStatus(team.id, status);
    setChanging(false);
    onStatusChange();
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--primary)]/30 transition-colors">
      <div className="w-6 h-6 rounded bg-[var(--primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--primary)]">
        {team.seed_number ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{getTeamName(team)}</p>
        <p className="text-xs text-[var(--muted-fg)]">ELO avg {Math.round(team.avg_elo ?? 0)}</p>
      </div>
      {team.pool_letter && (
        <span className="text-xs font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded">
          Pool {team.pool_letter}
        </span>
      )}
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[team.status]}`}>
        {STATUS_LABELS[team.status]}
      </span>

      {/* Actions menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={changing}
          className="btn btn-ghost btn-icon btn-sm"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-xl min-w-[160px] py-1 overflow-hidden">
              {team.status !== 'confirmed' && (
                <button onClick={() => handleStatus('confirmed')} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--primary)]/10 text-green-400">
                  ✅ Xác nhận
                </button>
              )}
              {team.status !== 'withdrawn' && (
                <button onClick={() => handleStatus('withdrawn')} className="w-full text-left px-4 py-2 text-sm hover:bg-red-500/10 text-[var(--muted-fg)]">
                  🚫 Rút lui
                </button>
              )}
              {team.status !== 'disqualified' && (
                <button onClick={() => handleStatus('disqualified')} className="w-full text-left px-4 py-2 text-sm hover:bg-red-500/10 text-red-400">
                  ❌ Loại khỏi giải
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───
export function PlayerManager({ event, teams, currentUserId, tournamentId, onRefresh }: PlayerManagerProps) {
  const [tab, setTab] = useState<'add' | 'list' | 'seed'>('list');
  const [showBulk, setShowBulk] = useState(false);
  const [showGuest, setShowGuest] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending' | 'withdrawn'>('all');

  useEffect(() => {
    fetchAllPlayers().then(setAllPlayers);
  }, []);

  const filtered = teams.filter(t =>
    filter === 'all' ? true : t.status === filter
  );

  const handleBulkSuccess = (count: number) => {
    setShowBulk(false);
    onRefresh();
    alert(`✅ Đã thêm ${count} đội/VĐV thành công!`);
  };

  return (
    <div className="space-y-4">
      {/* Tab nav */}
      <div className="flex gap-1 border-b border-[var(--border-color)]">
        {[
          ['list', `👥 Danh sách (${teams.length})`],
          ['add', '➕ Thêm VĐV'],
          ['seed', '🎯 Seed'],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTab(val as typeof tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === val
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-fg)] hover:text-[var(--fg)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Danh sách ── */}
      {tab === 'list' && (
        <div className="space-y-3">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'confirmed', 'pending', 'withdrawn'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              >
                {f === 'all' ? 'Tất cả' : STATUS_LABELS[f]}
              </button>
            ))}
            <button onClick={onRefresh} className="btn btn-ghost btn-sm ml-auto">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-[var(--muted-fg)]">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có VĐV nào</p>
              </div>
            ) : (
              filtered.map(team => (
                <TeamRow key={team.id} team={team} onStatusChange={onRefresh} />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Thêm VĐV ── */}
      {tab === 'add' && (
        <div className="space-y-4">
          <AddSinglePlayerForm
            event={event}
            currentUserId={currentUserId}
            allPlayers={allPlayers}
            onAdded={onRefresh}
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowBulk(true)}
              className="card p-4 text-center hover:border-[var(--primary)]/50 transition-colors cursor-pointer border-dashed"
            >
              <Upload className="w-6 h-6 mx-auto mb-2 text-[var(--primary)]" />
              <p className="text-sm font-medium">Thêm hàng loạt</p>
              <p className="text-xs text-[var(--muted-fg)] mt-1">Paste danh sách tên</p>
            </button>
            <button
              onClick={() => setShowGuest(true)}
              className="card p-4 text-center hover:border-[var(--primary)]/50 transition-colors cursor-pointer border-dashed"
            >
              <Shield className="w-6 h-6 mx-auto mb-2 text-amber-400" />
              <p className="text-sm font-medium">VĐV tạm (Guest)</p>
              <p className="text-xs text-[var(--muted-fg)] mt-1">Chưa có tài khoản</p>
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Seed ── */}
      {tab === 'seed' && (
        <SeedEditor
          teams={teams.filter(t => t.status === 'confirmed')}
          onUpdate={onRefresh}
        />
      )}

      {/* Modals */}
      {showBulk && (
        <BulkAddModal
          eventId={event.id}
          allPlayers={allPlayers}
          onSuccess={handleBulkSuccess}
          onClose={() => setShowBulk(false)}
        />
      )}
      {showGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGuest(false)} />
          <div className="relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <GuestPlayerForm
              tournamentId={tournamentId}
              createdBy={currentUserId}
              allPlayers={allPlayers}
              onCreated={() => { setShowGuest(false); onRefresh(); }}
              onCancel={() => setShowGuest(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
