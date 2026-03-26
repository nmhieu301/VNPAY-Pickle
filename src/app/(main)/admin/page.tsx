'use client';

import { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TierBadge } from '@/components/player/TierBadge';
import { fetchPlayersAdmin } from '@/lib/supabase/api';
import { Player, Session } from '@/types';

type AdminTab = 'players' | 'sessions' | 'system';

export default function AdminPage() {
  const router = useRouter();
  const { currentUser, isAdmin, players, sessions, adminUpdatePlayer, adminDeleteSession } = useAppStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('players');
  const [searchQuery, setSearchQuery] = useState('');
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Player>>({});

  // Security check
  useEffect(() => {
    if (!isAdmin()) {
      router.push('/dashboard');
    }
  }, [isAdmin, router]);

  useEffect(() => {
    if (activeTab === 'players') {
      loadAllPlayers();
    }
  }, [activeTab]);

  async function loadAllPlayers() {
    setIsDataLoading(true);
    const data = await fetchPlayersAdmin();
    setAllPlayers(data);
    setIsDataLoading(false);
  }

  const filteredPlayers = allPlayers.filter(p => 
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditPlayer = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditForm({
      full_name: player.full_name,
      nickname: player.nickname || '',
      elo_rating: player.elo_rating,
      role: player.role,
      is_active: player.is_active
    });
  };

  const handleSavePlayer = async () => {
    if (!editingPlayerId) return;
    const ok = await adminUpdatePlayer(editingPlayerId, editForm);
    if (ok) {
      setEditingPlayerId(null);
      loadAllPlayers();
    } else {
      alert('Lỗi khi cập nhật người chơi');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa buổi chơi này? Mọi dữ liệu liên quan sẽ bị mất.')) {
      const ok = await adminDeleteSession(id);
      if (!ok) alert('Lỗi khi xóa buổi chơi');
    }
  };

  if (!isAdmin()) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">🛡️ Bảng Điều Khiển Quản Trị</h1>
          <p className="text-[var(--muted-fg)]">Chào Admin, hãy thận trọng khi thay đổi dữ liệu hệ thống.</p>
        </div>
        <div className="flex bg-[var(--surface)] border border-[var(--border-color)] rounded-xl p-1">
          <button 
            onClick={() => setActiveTab('players')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'players' ? 'bg-[var(--primary)] text-white shadow-sm' : 'hover:bg-[var(--muted)]'}`}
          >
            Người chơi
          </button>
          <button 
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'sessions' ? 'bg-[var(--primary)] text-white shadow-sm' : 'hover:bg-[var(--muted)]'}`}
          >
            Lịch thi đấu
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'system' ? 'bg-[var(--primary)] text-white shadow-sm' : 'hover:bg-[var(--muted)]'}`}
          >
            Hệ thống
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'players' && (
          <motion.div 
            key="players"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
              <input 
                type="text"
                placeholder="Tìm kiếm theo tên, email, nickname..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full md:max-w-md"
              />
            </div>

            <div className="card overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--muted)]/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Người chơi</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">ELO / Tier</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Vai trò</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredPlayers.map(player => (
                    <tr key={player.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-bold">
                            {player.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{player.full_name}</p>
                            <p className="text-xs text-[var(--muted-fg)]">{player.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold">{player.elo_rating}</span>
                          <TierBadge elo={player.elo_rating} size="sm" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          player.role === 'admin' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' :
                          player.role === 'organizer' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800'
                        }`}>
                          {player.role === 'admin' ? 'Quản trị' : player.role === 'organizer' ? 'BTC' : 'Người chơi'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {player.is_active ? (
                          <span className="flex items-center gap-1 text-green-500 text-xs font-medium">
                            <UserCheck className="w-3 h-3" /> Hoạt động
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[var(--muted-fg)] text-xs font-medium">
                            <XCircle className="w-3 h-3" /> Bị khóa
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleEditPlayer(player)}
                          className="btn btn-ghost btn-sm btn-icon" title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'sessions' && (
          <motion.div 
            key="sessions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="card overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--muted)]/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Phiên chơi</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Thời gian</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Người tổ chức</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {sessions.map(session => (
                    <tr key={session.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold">{session.title}</p>
                        <p className="text-xs text-[var(--muted-fg)] uppercase font-medium">{session.sport_mode} • {session.match_mode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{session.date}</p>
                        <p className="text-xs text-[var(--muted-fg)]">{session.start_time} - {session.end_time}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {players.find(p => p.id === session.host_id)?.full_name || 'Hệ thống'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleDeleteSession(session.id)}
                          className="btn btn-ghost btn-sm btn-icon text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
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

        {activeTab === 'system' && (
          <motion.div 
            key="system"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
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
                {Math.round(allPlayers.reduce((acc, p) => acc + p.elo_rating, 0) / allPlayers.length || 0)}
              </p>
              <p className="text-[var(--muted-fg)]">ELO Trung bình</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Player Modal */}
      {editingPlayerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingPlayerId(null)} 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="card p-6 w-full max-w-md relative z-10 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Chỉnh sửa người chơi</h3>
              <button onClick={() => setEditingPlayerId(null)} className="btn btn-ghost btn-sm btn-icon"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Full Name</label>
                <input 
                  className="input" 
                  value={editForm.full_name} 
                  onChange={e => setEditForm({...editForm, full_name: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Nickname</label>
                <input 
                  className="input" 
                  value={editForm.nickname} 
                  onChange={e => setEditForm({...editForm, nickname: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">ELO Rating</label>
                <input 
                  type="number"
                  className="input" 
                  value={editForm.elo_rating} 
                  onChange={e => setEditForm({...editForm, elo_rating: parseInt(e.target.value)})} 
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-[var(--muted-fg)] mb-1 block">Vai trò</label>
                <select 
                  className="input"
                  value={editForm.role}
                  onChange={e => setEditForm({...editForm, role: e.target.value as any})}
                >
                  <option value="player">Người chơi</option>
                  <option value="organizer">Ban tổ chức</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="active_check" 
                  checked={editForm.is_active}
                  onChange={e => setEditForm({...editForm, is_active: e.target.checked})}
                />
                <label htmlFor="active_check" className="text-sm font-medium">Đang hoạt động</label>
              </div>

              <div className="flex gap-2 pt-4">
                <button onClick={() => setEditingPlayerId(null)} className="btn btn-secondary flex-1">Hủy</button>
                <button onClick={handleSavePlayer} className="btn btn-gradient flex-1">
                  <Save className="w-4 h-4" /> Lưu thay đổi
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
