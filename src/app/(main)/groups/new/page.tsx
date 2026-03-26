'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useGroupStore } from '@/lib/groupStore';
import { motion } from 'framer-motion';
import { ArrowLeft, Users2, Lock, Eye, EyeOff, UserPlus, Link2, Zap, Shuffle } from 'lucide-react';
import { PickleballIcon } from '@/components/icons/PickleballIcon';
import type { GroupPrivacy, GroupJoinMode } from '@/types';

export default function NewGroupPage() {
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);
  const createGroup = useGroupStore(s => s.createGroup);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    privacy: 'private' as GroupPrivacy,
    join_mode: 'request' as GroupJoinMode,
    max_members: 50,
    enable_group_elo: false,
    enable_auto_matching: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !form.name.trim()) return;
    setIsSubmitting(true);

    const group = await createGroup({
      ...form,
      owner_id: currentUser.id,
    });

    if (group) {
      router.push(`/groups/${group.id}`);
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-xl font-bold mb-1">
          <Users2 className="w-6 h-6 inline-block mr-1 -mt-0.5" /> Tạo nhóm mới
        </h1>
        <p className="text-sm text-[var(--muted-fg)] mb-6">Tạo nhóm Pickleball riêng cho bạn bè & đồng nghiệp</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Tên nhóm *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Nhóm Pickle KTVT"
              className="input"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Mô tả</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả ngắn về nhóm..."
              className="input min-h-[80px] resize-none"
            />
          </div>

          {/* Privacy */}
          <div>
            <label className="text-sm font-medium mb-2 block">Chế độ bảo mật</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'private' as const, icon: <Lock className="w-5 h-5" />, label: 'Kín', desc: 'Tìm thấy được nhưng phải được mời/duyệt' },
                { value: 'hidden' as const, icon: <EyeOff className="w-5 h-5" />, label: 'Ẩn', desc: 'Chỉ có link mời mới biết nhóm tồn tại' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, privacy: opt.value })}
                  className={`card p-3 text-left text-sm transition-colors ${
                    form.privacy === opt.value
                      ? 'ring-2 ring-[var(--primary)] bg-blue-50 dark:bg-blue-950/30'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">{opt.icon} <span className="font-medium">{opt.label}</span></div>
                  <p className="text-xs text-[var(--muted-fg)]">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Join Mode */}
          <div>
            <label className="text-sm font-medium mb-2 block">Cách tham gia</label>
            <div className="space-y-2">
              {([
                { value: 'invite_only' as const, icon: <UserPlus className="w-4 h-4" />, label: 'Chỉ mời', desc: 'Chỉ Owner/Admin mời trực tiếp' },
                { value: 'request' as const, icon: <Eye className="w-4 h-4" />, label: 'Xin vào', desc: 'Ai cũng xin được, Admin duyệt' },
                { value: 'invite_link' as const, icon: <Link2 className="w-4 h-4" />, label: 'Link mời', desc: 'Có link là vào được' },
              ]).map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    form.join_mode === opt.value
                      ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-950/30'
                      : 'border-[var(--border-color)] hover:border-[var(--muted-fg)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="join_mode"
                    value={opt.value}
                    checked={form.join_mode === opt.value}
                    onChange={() => setForm({ ...form, join_mode: opt.value })}
                    className="mt-0.5 accent-[var(--primary)]"
                  />
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1">{opt.icon} {opt.label}</p>
                    <p className="text-xs text-[var(--muted-fg)]">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Max Members */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              <Users2 className="w-3.5 h-3.5 inline -mt-0.5" /> Giới hạn thành viên
            </label>
            <input
              type="number"
              min={2}
              max={200}
              value={form.max_members}
              onChange={e => setForm({ ...form, max_members: parseInt(e.target.value) || 50 })}
              className="input w-32"
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] cursor-pointer">
              <input
                type="checkbox"
                checked={form.enable_group_elo}
                onChange={e => setForm({ ...form, enable_group_elo: e.target.checked })}
                className="accent-[var(--primary)]"
              />
              <div>
                <p className="font-medium text-sm flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> ELO riêng trong nhóm</p>
                <p className="text-xs text-[var(--muted-fg)]">Bảng xếp hạng ELO riêng cho nhóm</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] cursor-pointer">
              <input
                type="checkbox"
                checked={form.enable_auto_matching}
                onChange={e => setForm({ ...form, enable_auto_matching: e.target.checked })}
                className="accent-[var(--primary)]"
              />
              <div>
                <p className="font-medium text-sm flex items-center gap-1"><Shuffle className="w-3.5 h-3.5" /> Chia cặp tự động</p>
                <p className="text-xs text-[var(--muted-fg)]">Tự động chia cặp khi đủ người</p>
              </div>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!form.name.trim() || isSubmitting}
            className="btn btn-gradient btn-lg w-full"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><PickleballIcon size={18} className="inline-block mr-1" /> Tạo nhóm</>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
