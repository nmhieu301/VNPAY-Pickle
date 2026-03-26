'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useGroupStore } from '@/lib/groupStore';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Trash2, Crown, Users2 } from 'lucide-react';
import type { GroupPrivacy, GroupJoinMode } from '@/types';

export default function GroupSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);
  const players = useAppStore(s => s.players);
  const { currentGroup, members, loadGroupDetail, updateGroupSettings, deleteGroup, transferOwnership } = useGroupStore();

  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    privacy: 'private' as GroupPrivacy,
    join_mode: 'request' as GroupJoinMode,
    max_members: 50,
    enable_group_elo: false,
    enable_auto_matching: true,
  });

  useEffect(() => {
    loadGroupDetail(id);
  }, [id, loadGroupDetail]);

  useEffect(() => {
    if (currentGroup) {
      setForm({
        name: currentGroup.name,
        description: currentGroup.description || '',
        privacy: currentGroup.privacy,
        join_mode: currentGroup.join_mode,
        max_members: currentGroup.max_members,
        enable_group_elo: currentGroup.enable_group_elo,
        enable_auto_matching: currentGroup.enable_auto_matching,
      });
    }
  }, [currentGroup]);

  if (!currentGroup || !currentUser) return null;

  const isOwner = currentGroup.owner_id === currentUser.id;
  if (!isOwner) { router.push(`/groups/${id}`); return null; }

  const handleSave = async () => {
    setSaving(true);
    await updateGroupSettings(id, {
      name: form.name,
      description: form.description || null,
      privacy: form.privacy,
      join_mode: form.join_mode,
      max_members: form.max_members,
      enable_group_elo: form.enable_group_elo,
      enable_auto_matching: form.enable_auto_matching,
    });
    setSaving(false);
    router.push(`/groups/${id}`);
  };

  const handleDelete = async () => {
    await deleteGroup(id);
    router.push('/groups');
  };

  const handleTransfer = async () => {
    if (!transferTo) return;
    await transferOwnership(id, currentUser.id, transferTo);
    router.push(`/groups/${id}`);
  };

  const eligibleForTransfer = members.filter(m => m.player_id !== currentUser.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.push(`/groups/${id}`)} className="btn btn-ghost">
        <ArrowLeft className="w-4 h-4" /> Quay lại nhóm
      </button>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-xl font-bold mb-6">⚙️ Cài đặt nhóm</h1>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tên nhóm</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Mô tả</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input min-h-[80px] resize-none" />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Chế độ bảo mật</label>
            <select value={form.privacy} onChange={e => setForm({ ...form, privacy: e.target.value as GroupPrivacy })} className="input">
              <option value="private">🔒 Kín — tìm thấy được nhưng cần duyệt</option>
              <option value="hidden">👁️‍🗨️ Ẩn — chỉ có link mời mới thấy</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Cách tham gia</label>
            <select value={form.join_mode} onChange={e => setForm({ ...form, join_mode: e.target.value as GroupJoinMode })} className="input">
              <option value="invite_only">Chỉ mời</option>
              <option value="request">Xin vào (Admin duyệt)</option>
              <option value="invite_link">Link mời (vào thẳng)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5"><Users2 className="w-3.5 h-3.5 inline -mt-0.5" /> Giới hạn thành viên</label>
            <input type="number" min={2} max={200} value={form.max_members} onChange={e => setForm({ ...form, max_members: parseInt(e.target.value) || 50 })} className="input w-32" />
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] cursor-pointer">
            <input type="checkbox" checked={form.enable_group_elo} onChange={e => setForm({ ...form, enable_group_elo: e.target.checked })} className="accent-[var(--primary)]" />
            <div>
              <p className="font-medium text-sm">⚡ ELO riêng</p>
              <p className="text-xs text-[var(--muted-fg)]">Bảng xếp hạng ELO riêng cho nhóm</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] cursor-pointer">
            <input type="checkbox" checked={form.enable_auto_matching} onChange={e => setForm({ ...form, enable_auto_matching: e.target.checked })} className="accent-[var(--primary)]" />
            <div>
              <p className="font-medium text-sm">🔀 Chia cặp tự động</p>
              <p className="text-xs text-[var(--muted-fg)]">Tự động chia cặp khi đủ người</p>
            </div>
          </label>

          <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn btn-gradient btn-lg w-full">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Lưu thay đổi</>}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 p-4 rounded-xl border-2 border-red-200 dark:border-red-900/50 space-y-3">
          <h3 className="font-bold text-red-500">⚠️ Vùng nguy hiểm</h3>

          {/* Transfer Owner */}
          <div>
            <button onClick={() => setShowTransfer(!showTransfer)} className="btn btn-ghost text-sm text-orange-500 w-full justify-start">
              <Crown className="w-4 h-4" /> Chuyển quyền Owner
            </button>
            {showTransfer && (
              <div className="ml-6 mt-2 space-y-2">
                <select value={transferTo} onChange={e => setTransferTo(e.target.value)} className="input text-sm">
                  <option value="">Chọn thành viên...</option>
                  {eligibleForTransfer.map(m => {
                    const p = players.find(pl => pl.id === m.player_id);
                    return <option key={m.player_id} value={m.player_id}>{p?.nickname || p?.full_name} ({p?.email})</option>;
                  })}
                </select>
                <button onClick={handleTransfer} disabled={!transferTo} className="btn btn-secondary btn-sm text-orange-500">Xác nhận chuyển</button>
              </div>
            )}
          </div>

          {/* Delete */}
          <div>
            <button onClick={() => setShowDeleteConfirm(!showDeleteConfirm)} className="btn btn-ghost text-sm text-red-500 w-full justify-start">
              <Trash2 className="w-4 h-4" /> Xoá nhóm
            </button>
            {showDeleteConfirm && (
              <div className="ml-6 mt-2 space-y-2">
                <p className="text-xs text-red-500">Hành động này không thể hoàn tác!</p>
                <button onClick={handleDelete} className="btn btn-sm bg-red-500 text-white hover:bg-red-600">Xác nhận xoá nhóm</button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
