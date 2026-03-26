'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useGroupStore } from '@/lib/groupStore';
import { motion } from 'framer-motion';
import { Users2, Lock, Check } from 'lucide-react';
import { PickleballIcon } from '@/components/icons/PickleballIcon';
import type { Group, GroupInviteLink } from '@/types';

export default function InviteLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  const { joinViaLink } = useGroupStore();
  const [group, setGroup] = useState<Group | null>(null);
  const [link, setLink] = useState<GroupInviteLink | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'joining' | 'success' | 'needs_approval' | 'error'>('loading');

  useEffect(() => {
    const load = async () => {
      const { fetchGroupByInviteLinkToken } = await import('@/lib/supabase/groupsApi');
      const result = await fetchGroupByInviteLinkToken(token);
      if (result) {
        setGroup(result.group);
        setLink(result.link);
        setStatus('ready');
      } else {
        setStatus('error');
      }
    };
    load();
  }, [token]);

  const handleJoin = async () => {
    if (!currentUser) {
      // Redirect to login with return URL
      router.push(`/?redirect=/invite/${token}`);
      return;
    }
    setStatus('joining');
    const result = await joinViaLink(token, currentUser.id);
    if (result.success) {
      setStatus(result.needsApproval ? 'needs_approval' : 'success');
    } else {
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-sm w-full space-y-6">
        {/* Logo */}
        <div className="text-center">
          <PickleballIcon size={48} className="mx-auto mb-3" />
          <h1 className="text-lg font-bold text-[var(--primary)]">VNPAY Pickle</h1>
        </div>

        {status === 'error' && (
          <div className="card p-6 text-center space-y-3">
            <p className="text-3xl">😕</p>
            <h3 className="font-bold text-red-500">Link không hợp lệ</h3>
            <p className="text-sm text-[var(--muted-fg)]">Link mời đã hết hạn hoặc không tồn tại</p>
            <button onClick={() => router.push('/groups')} className="btn btn-secondary">Về trang chủ</button>
          </div>
        )}

        {status === 'ready' && group && (
          <div className="card p-6 space-y-4">
            <p className="text-center text-sm text-[var(--muted-fg)]">Bạn được mời tham gia nhóm</p>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {group.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-bold">{group.name}</h2>
                {group.description && <p className="text-sm text-[var(--muted-fg)]">{group.description}</p>}
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted-fg)]">
                  <span className="flex items-center gap-1"><Users2 className="w-3 h-3" /> {group.member_count} thành viên</span>
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> {group.privacy === 'private' ? 'Kín' : 'Ẩn'}</span>
                </div>
              </div>
            </div>

            <button onClick={handleJoin} className="btn btn-gradient btn-lg w-full">
              {!isAuthenticated ? '🔑 Đăng nhập & Tham gia' : '🏓 Tham gia nhóm'}
            </button>
          </div>
        )}

        {status === 'joining' && (
          <div className="card p-6 text-center">
            <div className="w-8 h-8 mx-auto border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-[var(--muted-fg)]">Đang tham gia...</p>
          </div>
        )}

        {status === 'success' && group && (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="font-bold text-green-500">Tham gia thành công! 🎉</h3>
            <p className="text-sm text-[var(--muted-fg)]">Chào mừng bạn đến với <strong>{group.name}</strong></p>
            <button onClick={() => router.push(`/groups/${group.id}`)} className="btn btn-gradient">Vào nhóm →</button>
          </motion.div>
        )}

        {status === 'needs_approval' && (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card p-6 text-center space-y-3">
            <p className="text-3xl">⏳</p>
            <h3 className="font-bold text-yellow-500">Đã gửi yêu cầu!</h3>
            <p className="text-sm text-[var(--muted-fg)]">Admin sẽ duyệt yêu cầu của bạn</p>
            <button onClick={() => router.push('/groups')} className="btn btn-secondary">Quay lại</button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
