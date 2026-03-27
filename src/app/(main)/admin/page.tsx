'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { 
  Users, 
  Settings, 
  Calendar, 
  Search, 
  Edit2, 
  Trash2, 
  Shield, 
  User, 
  UserCheck, 
  XCircle,
  TrendingUp,
  Save,
  X,
  Plus,
  UsersRound,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TierBadge } from '@/components/player/TierBadge';
import { fetchPlayersAdmin, fetchGroupsAdmin } from '@/lib/supabase/api';
import { Player, Group } from '@/types';
import { calculateTier } from '@/lib/algorithms/elo';

type AdminTab = 'players' | 'groups' | 'sessions' | 'system';

// ─── Tier Select Data ───
const TIER_OPTIONS = [
  { value: 'beginner',   label: 'Beginner',   minElo: 0,    maxElo: 999,  color: 'bg-gray-100 text-gray-600' },
  { value: 'bronze',     label: 'Bronze',     minElo: 1000, maxElo: 1199, color: 'bg-amber-100 text-amber-700' },
  { value: 'silver',     label: 'Silver',     minElo: 1200, maxElo: 1399, color: 'bg-slate-100 text-slate-600' },
  { value: 'gold',       label: 'Gold',       minElo: 1400, maxElo: 1599, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'platinum',   label: 'Platinum',   minElo: 1600, maxElo: 1799, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'diamond',    label: 'Diamond',    minElo: 1800, maxElo: 1999, color: 'bg-blue-100 text-blue-600' },
  { value: 'challenger', label: 'Challenger', minElo: 2000, maxElo: 3000, color: 'bg-purple-100 text-purple-600' },
];

export default function AdminPage() {
  const router = useRouter();
  const { 
    currentUser, isAdmin, players, sessions, 
    adminUpdatePlayer, adminDeleteSession,
    adminCreatePlayer, adminDeletePlayer,
    adminCreateGroup, adminUpdateGroup, adminDeleteGroup,
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('players');
  const [searchQuery, setSearchQuery] = useState('');
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  // Player modals
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Player>>({});
  const [showCreatePlayer, setShowCreatePlayer] = useState(false);
  const [createPlayerForm, setCreatePlayerForm] = useState({ email: '', full_name: '', nickname: '', elo_rating: 1200 });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Group modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [createGroupForm, setCreateGroupForm] = useState({ name: '', description: '', max_members: 50 });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupForm, setEditGroupForm] = useState<Partial<Group>>({});
  const [deleteGroupConfirmId, setDeleteGroupConfirmId] = useState<string | null>(null);
  
  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Security check
  useEffect(() => {
    if (!isAdmin()) router.push('/dashboard');
  }, [isAdmin, router]);

  useEffect(() => {
    if (activeTab === 'players' || activeTab === 'system') loadAllPlayers();
    if (activeTab === 'groups') loadAllGroups();
  }, [activeTab]);

  async function loadAllPlayers() {
    setIsDataLoading(true);
    const data = await fetchPlayersAdmin();
    setAllPlayers(data);
    setIsDataLoading(false);
  }

  async function loadAllGroups() {
    setIsDataLoading(true);
    const data = await fetchGroupsAdmin();
    setAllGroups(data);
    setIsDataLoading(false);
  }

  function showFeedback(type: 'success' | 'error', msg: string) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  }

  const filteredPlayers = useMemo(() => allPlayers.filter(p => 
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  ), [allPlayers, searchQuery]);

  const filteredGroups = useMemo(() => allGroups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  ), [allGroups, searchQuery]);

  // ─── Player Handlers ───
  const handleEditPlayer = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditForm({
      full_name: player.full_name,
      nickname: player.nickname || '',
      elo_rating: player.elo_rating,
      role: player.role,
      is_active: player.is_active,
    });
  };

  const handleSavePlayer = async () => {
    if (!editingPlayerId) return;
    const ok = await adminUpdatePlayer(editingPlayerId, editForm);
    if (ok) {
      setEditingPlayerId(null);
      showFeedback('success', 'Đã cập nhật người chơi');
      loadAllPlayers();
    } else {
      showFeedback('error', 'Lỗi khi cập nhật người chơi');
    }
  };

  const handleCreatePlayer = async () => {
    if (!createPlayerForm.email || !createPlayerForm.full_name) {
      showFeedback('error', 'Vui lòng nhập Email và Họ tên');
      return;
    }
    const player = await adminCreatePlayer(createPlayerForm);
    if (player) {
      setShowCreatePlayer(false);
      setCreatePlayerForm({ email: '', full_name: '', nickname: '', elo_rating: 1200 });
      showFeedback('success', `Đã tạo người chơi ${player.full_name}`);
      loadAllPlayers();
    } else {
      showFeedback('error', 'Lỗi khi tạo người chơi (email có thể đã tồn tại)');
    }
  };

  const handleDeletePlayer = async (id: string) => {
    const ok = await adminDeletePlayer(id);
    setDeleteConfirmId(null);
    if (ok) {
      showFeedback('success', 'Đã xóa người chơi');
      loadAllPlayers();
    } else {
      showFeedback('error', 'Lỗi khi xóa người chơi');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa buổi chơi này?')) {
      const ok = await adminDeleteSession(id);
      if (!ok) showFeedback('error', 'Lỗi khi xóa buổi chơi');
      else showFeedback('success', 'Đã xóa buổi chơi');
    }
  };

  // ─── Group Handlers ───
  const handleCreateGroup = async () => {
    if (!createGroupForm.name || !currentUser) {
      showFeedback('error', 'Vui lòng nhập tên nhóm');
      return;
    }
    const group = await adminCreateGroup({
      name: createGroupForm.name,
      description: createGroupForm.description || undefined,
      owner_id: currentUser.id,
      max_members: createGroupForm.max_members,
    });
    if (group) {
      setShowCreateGroup(false);
      setCreateGroupForm({ name: '', description: '', max_members: 50 });
      showFeedback('success', `Đã tạo nhóm "${group.name}"`);
      loadAllGroups();
    } else {
      showFeedback('error', 'Lỗi khi tạo nhóm');
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroupId(group.id);
    setEditGroupForm({ name: group.name, description: group.description || '', max_members: group.max_members, is_active: group.is_active });
  };

  const handleSaveGroup = async () => {
    if (!editingGroupId) return;
    const ok = await adminUpdateGroup(editingGroupId, editGroupForm);
    if (ok) {
      setEditingGroupId(null);
      showFeedback('success', 'Đã cập nhật nhóm');
      loadAllGroups();
    } else {
      showFeedback('error', 'Lỗi khi cập nhật nhóm');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    const ok = await adminDeleteGroup(id);
    setDeleteGroupConfirmId(null);
    if (ok) {
      showFeedback('success', 'Đã xóa nhóm');
      loadAllGroups();
    } else {
      showFeedback('error', 'Lỗi khi xóa nhóm');
    }
  };

  // ─── Tier from ELO ───
  const getTierFromElo = (elo: number) => TIER_OPTIONS.find(t => elo >= t.minElo && elo <= t.maxElo) || TIER_OPTIONS[0];

  if (!isAdmin()) return null;

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'players', label: 'Người chơi', icon: <Users className="w-4 h-4" /> },
    { key: 'groups', label: 'Nhóm', icon: <UsersRound className="w-4 h-4" /> },
    { key: 'sessions', label: 'Lịch thi đấu', icon: <Calendar className="w-4 h-4" /> },
    { key: 'system', label: 'Hệ thống', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">🛡️ Bảng Điều Khiển Quản Trị</h1>
          <p className="text-[var(--muted-fg)]">Quản lý người chơi, nhóm và hệ thống.</p>
        </div>
        <div className="flex bg-[var(--surface)] border border-[var(--border-color)] rounded-xl p-1 overflow-x-auto">
          {tabs.map(tab => (
            <button 
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab.key ? 'bg-[var(--primary)] text-white shadow-sm' : 'hover:bg-[var(--muted)]'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Feedback Toast ─── */}
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`px-4 py-3 rounded-xl text-sm font-medium ${feedback.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
          >
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Tab Content ─── */}
      <AnimatePresence mode="wait">
        {/* ========== PLAYERS TAB ========== */}
        {activeTab === 'players' && (
          <motion.div key="players" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                <input 
                  type="text" placeholder="Tìm kiếm theo tên, email, nickname..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
              <button onClick={() => setShowCreatePlayer(true)} className="btn btn-gradient flex items-center gap-2 whitespace-nowrap">
                <Plus className="w-4 h-4" /> Tạo người chơi
              </button>
            </div>

            <div className="card overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--muted)]/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Người chơi</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">ELO / Tier</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Vai trò</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Trạng thái</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {isDataLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-fg)]">Đang tải...</td></tr>
                  ) : filteredPlayers.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-fg)]">Không tìm thấy người chơi</td></tr>
                  ) : filteredPlayers.map(player => (
                    <tr key={player.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {player.full_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{player.full_name}</p>
                            <p className="text-xs text-[var(--muted-fg)] truncate">{player.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold">{player.elo_rating}</span>
                          <TierBadge elo={player.elo_rating} size="sm" />
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          player.role === 'admin' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' :
                          player.role === 'organizer' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800'
                        }`}>
                          {player.role === 'admin' ? 'Quản trị' : player.role === 'organizer' ? 'BTC' : 'Người chơi'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {player.is_active ? (
                          <span className="flex items-center gap-1 text-green-500 text-xs font-medium"><UserCheck className="w-3 h-3" /> Hoạt động</span>
                        ) : (
                          <span className="flex items-center gap-1 text-[var(--muted-fg)] text-xs font-medium"><XCircle className="w-3 h-3" /> Bị khóa</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEditPlayer(player)} className="btn btn-ghost btn-sm btn-icon" title="Sửa">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirmId(player.id)} className="btn btn-ghost btn-sm btn-icon text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isDataLoading && <div className="px-4 py-2 border-t border-[var(--border-color)] text-xs text-[var(--muted-fg)]">Tổng: {filteredPlayers.length} người chơi</div>}
            </div>
          </motion.div>
        )}

        {/* ========== GROUPS TAB ========== */}
        {activeTab === 'groups' && (
          <motion.div key="groups" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                <input type="text" placeholder="Tìm kiếm nhóm..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10 w-full" />
              </div>
              <button onClick={() => setShowCreateGroup(true)} className="btn btn-gradient flex items-center gap-2 whitespace-nowrap">
                <Plus className="w-4 h-4" /> Tạo nhóm mới
              </button>
            </div>

            <div className="card overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--muted)]/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Tên nhóm</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Thành viên</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Trạng thái</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Mã mời</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {isDataLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-fg)]">Đang tải...</td></tr>
                  ) : filteredGroups.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-fg)]">Chưa có nhóm nào</td></tr>
                  ) : filteredGroups.map(group => (
                    <tr key={group.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{group.name}</p>
                          {group.description && <p className="text-xs text-[var(--muted-fg)] truncate">{group.description}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono">{group.member_count}/{group.max_members}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {group.is_active ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-600 dark:bg-green-900/30">Hoạt động</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-800">Tạm ngưng</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <code className="text-xs bg-[var(--muted)] px-2 py-1 rounded">{group.invite_code}</code>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEditGroup(group)} className="btn btn-ghost btn-sm btn-icon" title="Sửa"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteGroupConfirmId(group.id)} className="btn btn-ghost btn-sm btn-icon text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Xóa"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isDataLoading && <div className="px-4 py-2 border-t border-[var(--border-color)] text-xs text-[var(--muted-fg)]">Tổng: {filteredGroups.length} nhóm</div>}
            </div>
          </motion.div>
        )}

        {/* ========== SESSIONS TAB ========== */}
        {activeTab === 'sessions' && (
          <motion.div key="sessions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="card overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--muted)]/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Phiên chơi</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Thời gian</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Người tổ chức</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {sessions.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--muted-fg)]">Chưa có buổi chơi nào</td></tr>
                  ) : sessions.map(session => (
                    <tr key={session.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold">{session.title}</p>
                        <p className="text-xs text-[var(--muted-fg)] uppercase font-medium">{session.sport_mode} • {session.match_mode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{session.date}</p>
                        <p className="text-xs text-[var(--muted-fg)]">{session.start_time} - {session.end_time}</p>
                      </td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell">
                        {players.find(p => p.id === session.host_id)?.full_name || 'Hệ thống'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteSession(session.id)} className="btn btn-ghost btn-sm btn-icon text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ========== SYSTEM TAB ========== */}
        {activeTab === 'system' && (
          <motion.div key="system" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-6 flex flex-col items-center text-center gap-2">
              <Users className="w-10 h-10 text-[var(--primary)]" />
              <p className="text-3xl font-display font-bold">{allPlayers.length}</p>
              <p className="text-[var(--muted-fg)]">Tổng người chơi</p>
            </div>
            <div className="card p-6 flex flex-col items-center text-center gap-2">
              <Calendar className="w-10 h-10 text-vnpay-blue" />
              <p className="text-3xl font-display font-bold">{sessions.length}</p>
              <p className="text-[var(--muted-fg)]">Buổi chơi dự kiến</p>
            </div>
            <div className="card p-6 flex flex-col items-center text-center gap-2">
              <TrendingUp className="w-10 h-10 text-vnpay-red" />
              <p className="text-3xl font-display font-bold">
                {allPlayers.length > 0 ? Math.round(allPlayers.reduce((acc, p) => acc + p.elo_rating, 0) / allPlayers.length) : 0}
              </p>
              <p className="text-[var(--muted-fg)]">ELO Trung bình</p>
            </div>
            <div className="card p-6 flex flex-col items-center text-center gap-2">
              <UsersRound className="w-10 h-10 text-emerald-500" />
              <p className="text-3xl font-display font-bold">{allGroups.length}</p>
              <p className="text-[var(--muted-fg)]">Tổng nhóm</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ MODALS ═══════ */}

      {/* ── Create Player Modal ── */}
      <AnimatePresence>
        {showCreatePlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreatePlayer(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card p-6 w-full max-w-md relative z-10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-[var(--primary)]" /> Tạo người chơi mới</h3>
                <button onClick={() => setShowCreatePlayer(false)} className="btn btn-ghost btn-sm btn-icon"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Email *</label>
                  <input className="input" placeholder="example@vnpay.vn" value={createPlayerForm.email} onChange={e => setCreatePlayerForm({...createPlayerForm, email: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Họ và tên *</label>
                  <input className="input" placeholder="Nguyễn Văn A" value={createPlayerForm.full_name} onChange={e => setCreatePlayerForm({...createPlayerForm, full_name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Nickname</label>
                  <input className="input" placeholder="Optional" value={createPlayerForm.nickname} onChange={e => setCreatePlayerForm({...createPlayerForm, nickname: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">ELO Ban đầu</label>
                  <input type="number" className="input" value={createPlayerForm.elo_rating} onChange={e => setCreatePlayerForm({...createPlayerForm, elo_rating: parseInt(e.target.value) || 1200})} />
                  <p className="text-xs text-[var(--muted-fg)] mt-1">Tier: {getTierFromElo(createPlayerForm.elo_rating).label}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowCreatePlayer(false)} className="btn btn-secondary flex-1">Hủy</button>
                  <button onClick={handleCreatePlayer} className="btn btn-gradient flex-1"><Plus className="w-4 h-4" /> Tạo mới</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Player Modal ── */}
      <AnimatePresence>
        {editingPlayerId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingPlayerId(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card p-6 w-full max-w-md relative z-10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">✏️ Chỉnh sửa người chơi</h3>
                <button onClick={() => setEditingPlayerId(null)} className="btn btn-ghost btn-sm btn-icon"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Họ và tên</label>
                  <input className="input" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Nickname</label>
                  <input className="input" value={editForm.nickname || ''} onChange={e => setEditForm({...editForm, nickname: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">ELO Rating</label>
                  <input type="number" className="input" value={editForm.elo_rating} onChange={e => setEditForm({...editForm, elo_rating: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Chọn Tier (auto-set ELO)</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TIER_OPTIONS.map(tier => (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => setEditForm({...editForm, elo_rating: tier.minElo + Math.floor((tier.maxElo - tier.minElo) / 2)})}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                          getTierFromElo(editForm.elo_rating || 0).value === tier.value
                            ? `${tier.color} ring-2 ring-[var(--primary)] border-transparent`
                            : 'border-[var(--border-color)] hover:bg-[var(--muted)]'
                        }`}
                      >
                        {tier.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Vai trò</label>
                  <select className="input" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value as any})}>
                    <option value="player">Người chơi</option>
                    <option value="organizer">Ban tổ chức</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="active_check" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} />
                  <label htmlFor="active_check" className="text-sm font-medium">Đang hoạt động</label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEditingPlayerId(null)} className="btn btn-secondary flex-1">Hủy</button>
                  <button onClick={handleSavePlayer} className="btn btn-gradient flex-1"><Save className="w-4 h-4" /> Lưu thay đổi</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Player Confirm ── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card p-6 w-full max-w-sm relative z-10 shadow-2xl text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold mb-2">Xác nhận xóa?</h3>
              <p className="text-sm text-[var(--muted-fg)] mb-1">
                <strong>{allPlayers.find(p => p.id === deleteConfirmId)?.full_name}</strong>
              </p>
              <p className="text-xs text-[var(--muted-fg)] mb-6">Mọi dữ liệu liên quan (lịch sử, nhóm, phiên chơi) cũng sẽ bị xóa. Thao tác này không thể hoàn tác.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary flex-1">Hủy</button>
                <button onClick={() => handleDeletePlayer(deleteConfirmId)} className="btn flex-1 bg-red-500 text-white hover:bg-red-600">
                  <Trash2 className="w-4 h-4" /> Xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create Group Modal ── */}
      <AnimatePresence>
        {showCreateGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateGroup(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card p-6 w-full max-w-md relative z-10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-[var(--primary)]" /> Tạo nhóm mới</h3>
                <button onClick={() => setShowCreateGroup(false)} className="btn btn-ghost btn-sm btn-icon"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Tên nhóm *</label>
                  <input className="input" placeholder="VD: CLB Pickle VNPAY" value={createGroupForm.name} onChange={e => setCreateGroupForm({...createGroupForm, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Mô tả</label>
                  <input className="input" placeholder="Optional" value={createGroupForm.description} onChange={e => setCreateGroupForm({...createGroupForm, description: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Số thành viên tối đa</label>
                  <input type="number" className="input" value={createGroupForm.max_members} onChange={e => setCreateGroupForm({...createGroupForm, max_members: parseInt(e.target.value) || 50})} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowCreateGroup(false)} className="btn btn-secondary flex-1">Hủy</button>
                  <button onClick={handleCreateGroup} className="btn btn-gradient flex-1"><Plus className="w-4 h-4" /> Tạo nhóm</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Group Modal ── */}
      <AnimatePresence>
        {editingGroupId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingGroupId(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card p-6 w-full max-w-md relative z-10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">✏️ Chỉnh sửa nhóm</h3>
                <button onClick={() => setEditingGroupId(null)} className="btn btn-ghost btn-sm btn-icon"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Tên nhóm</label>
                  <input className="input" value={editGroupForm.name} onChange={e => setEditGroupForm({...editGroupForm, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Mô tả</label>
                  <input className="input" value={editGroupForm.description || ''} onChange={e => setEditGroupForm({...editGroupForm, description: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Thành viên tối đa</label>
                  <input type="number" className="input" value={editGroupForm.max_members} onChange={e => setEditGroupForm({...editGroupForm, max_members: parseInt(e.target.value) || 50})} />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="group_active_check" checked={editGroupForm.is_active} onChange={e => setEditGroupForm({...editGroupForm, is_active: e.target.checked})} />
                  <label htmlFor="group_active_check" className="text-sm font-medium">Đang hoạt động</label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEditingGroupId(null)} className="btn btn-secondary flex-1">Hủy</button>
                  <button onClick={handleSaveGroup} className="btn btn-gradient flex-1"><Save className="w-4 h-4" /> Lưu thay đổi</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Group Confirm ── */}
      <AnimatePresence>
        {deleteGroupConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteGroupConfirmId(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card p-6 w-full max-w-sm relative z-10 shadow-2xl text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold mb-2">Xóa nhóm?</h3>
              <p className="text-sm text-[var(--muted-fg)] mb-1">
                <strong>{allGroups.find(g => g.id === deleteGroupConfirmId)?.name}</strong>
              </p>
              <p className="text-xs text-[var(--muted-fg)] mb-6">Toàn bộ thành viên và lời mời sẽ bị xóa. Không thể hoàn tác.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteGroupConfirmId(null)} className="btn btn-secondary flex-1">Hủy</button>
                <button onClick={() => handleDeleteGroup(deleteGroupConfirmId)} className="btn flex-1 bg-red-500 text-white hover:bg-red-600">
                  <Trash2 className="w-4 h-4" /> Xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
