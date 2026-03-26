'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useGroupStore } from '@/lib/groupStore';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Users2, Lock, Check } from 'lucide-react';
import { PickleballIcon } from '@/components/icons/PickleballIcon';
import type { Group } from '@/types';

type JoinStatus = 'idle' | 'loading' | 'success' | 'needs_approval';
type JoinError = null | 'not_found' | 'already_member' | 'invite_only' | 'unknown';

const ERROR_MESSAGES: Record<string, string> = {
  not_found: '❌ Mã không hợp lệ hoặc nhóm không tồn tại',
  already_member: '👋 Bạn đã là thành viên của nhóm này rồi!',
  invite_only: '🔒 Nhóm này chỉ cho phép tham gia qua lời mời trực tiếp',
  unknown: '❌ Không thể tham gia nhóm. Vui lòng thử lại sau',
};

export default function JoinGroupPage() {
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);
  const { joinViaCode } = useGroupStore();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<JoinStatus>('idle');
  const [joinError, setJoinError] = useState<JoinError>(null);
  const [resultGroup, setResultGroup] = useState<Group | null>(null);
  const [preview, setPreview] = useState<Group | null>(null);

  const handleLookup = async () => {
    if (!code.trim()) return;
    setStatus('loading');
    setJoinError(null);

    const { fetchGroupByInviteCode } = await import('@/lib/supabase/groupsApi');
    const group = await fetchGroupByInviteCode(code.trim());

    if (group) {
      setPreview(group);
      setStatus('idle');
    } else {
      setPreview(null);
      setJoinError('not_found');
      setStatus('idle');
    }
  };

  const handleJoin = async () => {
    if (!currentUser || !preview) return;
    setStatus('loading');
    setJoinError(null);

    const result = await joinViaCode(code.trim(), currentUser.id);

    if (result.success) {
      setResultGroup(result.group || null);
      setPreview(null);
      setStatus(result.needsApproval ? 'needs_approval' : 'success');
    } else {
      setJoinError((result.error as JoinError) || 'unknown');
      setStatus('idle');
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <button onClick={() => router.push('/groups')} className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Nhóm chơi
      </button>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
        <div className="text-center">
          <PickleballIcon size={48} className="mx-auto mb-3" />
          <h1 className="text-xl font-bold">Tham gia nhóm</h1>
          <p className="text-sm text-[var(--muted-fg)]">Nhập mã mời để tham gia nhóm Pickleball</p>
        </div>

        {/* Code Input */}
        <div className="card p-5 space-y-4">
          <label className="block text-sm font-medium">🔑 Mã mời</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={e => {
                setCode(e.target.value.toUpperCase());
                setPreview(null);
                setJoinError(null);
                setStatus('idle');
              }}
              placeholder="VD: PKL-DV26"
              className="input font-mono text-lg text-center tracking-wider flex-1"
              maxLength={8}
            />
            <button
              onClick={handleLookup}
              disabled={!code.trim() || status === 'loading'}
              className="btn btn-gradient"
            >
              {status === 'loading' && !preview ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </div>

          {joinError && (
            <p className={`text-sm text-center ${joinError === 'already_member' ? 'text-yellow-500' : 'text-red-500'}`}>
              {ERROR_MESSAGES[joinError]}
              {joinError === 'already_member' && preview && (
                <button onClick={() => router.push(`/groups/${preview.id}`)} className="block mx-auto mt-2 btn btn-secondary btn-sm">
                  Vào nhóm →
                </button>
              )}
            </p>
          )}
        </div>

        {/* Group Preview */}
        {preview && status !== 'success' && status !== 'needs_approval' && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-lg font-bold">
                {preview.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold">{preview.name}</h3>
                {preview.description && <p className="text-sm text-[var(--muted-fg)]">{preview.description}</p>}
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted-fg)]">
                  <span className="flex items-center gap-1"><Users2 className="w-3 h-3" /> {preview.member_count}/{preview.max_members}</span>
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> {preview.privacy === 'private' ? 'Kín' : 'Ẩn'}</span>
                </div>
              </div>
            </div>

            {!joinError && (
              <button
                onClick={handleJoin}
                disabled={status === 'loading'}
                className="btn btn-gradient w-full"
              >
                {status === 'loading' ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  '🏓 Xin tham gia'
                )}
              </button>
            )}
          </motion.div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="font-bold text-green-500">Tham gia thành công!</h3>
            <p className="text-sm text-[var(--muted-fg)]">Bạn đã là thành viên của nhóm <strong>{resultGroup?.name}</strong></p>
            <button onClick={() => router.push(`/groups/${resultGroup?.id}`)} className="btn btn-gradient">
              Vào nhóm →
            </button>
          </motion.div>
        )}

        {status === 'needs_approval' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center text-2xl">
              ⏳
            </div>
            <h3 className="font-bold text-yellow-500">Đã gửi yêu cầu!</h3>
            <p className="text-sm text-[var(--muted-fg)]">Admin của nhóm sẽ duyệt yêu cầu của bạn</p>
            <button onClick={() => router.push('/groups')} className="btn btn-secondary">
              Quay lại danh sách nhóm
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
