'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useGroupStore } from '@/lib/groupStore';
import { motion } from 'framer-motion';
import { ArrowLeft, Users2, Copy, Check, Settings, Crown, Shield, UserPlus, Search, X, Clock, UserMinus, Link2, Mail, CalendarRange, Plus, Gamepad2, Repeat } from 'lucide-react';
import { PickleballIcon } from '@/components/icons/PickleballIcon';
import { TierBadge } from '@/components/player/TierBadge';
import { ScheduleCard } from '@/components/schedule/ScheduleCard';
import { SessionCard } from '@/components/session/SessionCard';
import { fetchGroupSchedules } from '@/lib/supabase/recurringApi';
import type { GroupMember, RecurringSchedule, Session } from '@/types';

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);
  const players = useAppStore(s => s.players);
  const {
    currentGroup, members, joinRequests, inviteLinks, isLoading,
    loadGroupDetail, inviteMember, respondToJoinRequest,
    removeMember, updateMemberRole, createInviteLink, revokeInviteLink,
  } = useGroupStore();

  const [tab, setTab] = useState<'members' | 'invite' | 'requests' | 'schedules'>('members');
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showInviteSearch, setShowInviteSearch] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [groupSchedules, setGroupSchedules] = useState<RecurringSchedule[]>([]);
  const [groupSessions, setGroupSessions] = useState<Session[]>([]);

  useEffect(() => {
    loadGroupDetail(id);
    fetchGroupSchedules(id).then(setGroupSchedules);
    // Fetch group sessions
    import('@/lib/supabase/client').then(async ({ createClient }) => {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('scope', 'private') // group sessions will be matched by venue/group context
        .gte('date', today)
        .limit(10);
      // For now showing sessions that belong to recurring schedules of this group
      // A proper implementation would need a group_id column on sessions
    });
  }, [id, loadGroupDetail]);

  if (isLoading || !currentGroup || !currentUser) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myRole = members.find(m => m.player_id === currentUser.id)?.role;
  const isOwner = myRole === 'owner';
  const isAdmin = myRole === 'admin' || isOwner;
  const memberPlayerIds = members.map(m => m.player_id);

  const copyCode = () => {
    navigator.clipboard.writeText(currentGroup.invite_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleCreateLink = async () => {
    await createInviteLink({
      group_id: id,
      created_by: currentUser.id,
      expires_days: 7,
      requires_approval: currentGroup.join_mode === 'request',
    });
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleInvite = async (playerId: string) => {
    await inviteMember({
      group_id: id,
      invited_by: currentUser.id,
      invited_player_id: playerId,
      message: inviteMessage || undefined,
    });
    setInviteSearch('');
  };

  const handleBulkInvite = async () => {
    const emails = bulkEmails.split('\n').map(e => e.trim()).filter(e => e.endsWith('@vnpay.vn'));
    if (!emails.length) return;
    setBulkSending(true);
    for (const email of emails) {
      const player = players.find(p => p.email === email);
      if (player && !memberPlayerIds.includes(player.id)) {
        await inviteMember({
          group_id: id,
          invited_by: currentUser.id,
          invited_player_id: player.id,
          message: inviteMessage || undefined,
        });
      }
    }
    setBulkSending(false);
    setBulkEmails('');
  };

  const filteredPlayers = inviteSearch
    ? players.filter(p =>
        !memberPlayerIds.includes(p.id) &&
        (p.full_name.toLowerCase().includes(inviteSearch.toLowerCase()) ||
         p.email.toLowerCase().includes(inviteSearch.toLowerCase()))
      ).slice(0, 10)
    : [];

  // Sort: owner first, admin second, then members. Prioritize same department
  const sortedMembers = [...members].sort((a, b) => {
    const order: Record<string, number> = { owner: 0, admin: 1, member: 2 };
    return (order[a.role] ?? 2) - (order[b.role] ?? 2);
  });

  const roleIcon = (role: GroupMember['role']) => {
    if (role === 'owner') return <Crown className="w-3.5 h-3.5 text-yellow-500" />;
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-blue-500" />;
    return null;
  };

  const roleBadge = (role: GroupMember['role']) => {
    const classes = role === 'owner'
      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
      : role === 'admin'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    return <span className={`badge text-[10px] ${classes}`}>{role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Member'}</span>;
  };

  const adminCount = members.filter(m => m.role === 'admin').length;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => router.push('/groups')} className="btn btn-ghost">
        <ArrowLeft className="w-4 h-4" /> Nhóm chơi
      </button>

      {/* Group Header */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {currentGroup.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold">{currentGroup.name}</h1>
              {currentGroup.description && (
                <p className="text-sm text-[var(--muted-fg)] mt-0.5">{currentGroup.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--muted-fg)]">
                <span className="flex items-center gap-1"><Users2 className="w-3 h-3" /> {currentGroup.member_count} thành viên</span>
                {currentGroup.enable_group_elo && <span className="text-green-500 font-medium">⚡ ELO riêng</span>}
              </div>
            </div>
          </div>

          {isOwner && (
            <button onClick={() => router.push(`/groups/${id}/settings`)} className="btn btn-ghost btn-icon">
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Invite Code */}
        <div className="mt-4 p-3 rounded-xl bg-[var(--muted)] flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted-fg)]">Mã mời</p>
            <p className="font-mono font-bold text-lg">{currentGroup.invite_code}</p>
          </div>
          <button onClick={copyCode} className="btn btn-secondary btn-sm">
            {codeCopied ? <><Check className="w-4 h-4" /> Đã copy!</> : <><Copy className="w-4 h-4" /> Copy</>}
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { key: 'schedules' as const, label: '📅 Lịch chơi', show: true },
          { key: 'members' as const, label: `👥 Thành viên (${members.length})`, show: true },
          { key: 'invite' as const, label: '✉️ Mời', show: isAdmin },
          { key: 'requests' as const, label: `📥 Yêu cầu (${joinRequests.length})`, show: isAdmin },
        ] as const).filter(t => t.show).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`badge text-sm cursor-pointer transition-colors ${
              tab === t.key
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--muted)] text-[var(--muted-fg)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Lịch chơi Tab ─── */}
      {tab === 'schedules' && (
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href={`/groups/${id}/schedules/new`}
              className="btn btn-gradient flex items-center gap-2"
            >
              <Repeat className="w-4 h-4" /> Tạo lịch định kỳ
            </Link>
            <Link
              href={`/sessions/new`}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Gamepad2 className="w-4 h-4" /> Tạo buổi chơi lẻ
            </Link>
          </div>

          {/* Recurring schedules list */}
          {groupSchedules.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[var(--muted-fg)] uppercase tracking-wide">📅 Lịch định kỳ</p>
              {groupSchedules.map((sched, i) => (
                <ScheduleCard
                  key={sched.id}
                  schedule={sched}
                  groupId={id}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <CalendarRange className="w-12 h-12 mx-auto mb-3 text-[var(--muted-fg)] opacity-40" />
              <p className="font-medium">Chưa có lịch chơi định kỳ</p>
              <p className="text-sm text-[var(--muted-fg)] mt-1">
                Tạo lịch sinh hoạt cố định cho nhóm (VD: trưa T3 & T5 hàng tuần)
              </p>
              <Link
                href={`/groups/${id}/schedules/new`}
                className="btn btn-gradient mt-4 inline-flex items-center gap-2"
              >
                <Repeat className="w-4 h-4" /> Tạo lịch định kỳ đầu tiên
              </Link>
            </div>
          )}
        </motion.div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="card divide-y divide-[var(--border-color)]">
            {sortedMembers.map(member => {
              const player = players.find(p => p.id === member.player_id);
              if (!player) return null;
              return (
                <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-sm font-bold">
                    {player.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {roleIcon(member.role)}
                      <p className="font-medium text-sm truncate">{player.nickname || player.full_name}</p>
                      {roleBadge(member.role)}
                    </div>
                    <p className="text-xs text-[var(--muted-fg)]">{player.email}</p>
                  </div>
                  <TierBadge elo={player.elo_rating} size="sm" showLabel={false} />

                  {/* Actions */}
                  {isAdmin && member.role === 'member' && (
                    <div className="flex gap-1">
                      {isOwner && adminCount < 5 && (
                        <button
                          onClick={() => updateMemberRole(id, member.player_id, 'admin')}
                          className="btn btn-ghost btn-sm text-xs"
                          title="Thăng Admin"
                        >
                          <Shield className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => removeMember(id, member.player_id)}
                        className="btn btn-ghost btn-sm text-xs text-red-500"
                        title="Kick"
                      >
                        <UserMinus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {isOwner && member.role === 'admin' && (
                    <button
                      onClick={() => updateMemberRole(id, member.player_id, 'member')}
                      className="btn btn-ghost btn-sm text-xs text-orange-500"
                      title="Hạ cấp Member"
                    >
                      <UserMinus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Invite Tab */}
      {tab === 'invite' && isAdmin && (
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
          {/* 1. Search & invite in-app */}
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-1"><UserPlus className="w-4 h-4" /> Tìm & mời in-app</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
              <input
                type="text"
                value={inviteSearch}
                onChange={e => { setInviteSearch(e.target.value); setShowInviteSearch(true); }}
                placeholder="Tìm tên hoặc email..."
                className="input pl-9"
              />
              {inviteSearch && (
                <button onClick={() => { setInviteSearch(''); setShowInviteSearch(false); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-[var(--muted-fg)]" />
                </button>
              )}
            </div>
            {showInviteSearch && filteredPlayers.length > 0 && (
              <div className="border border-[var(--border-color)] rounded-xl divide-y divide-[var(--border-color)] max-h-60 overflow-y-auto">
                {filteredPlayers.map(player => (
                  <button
                    key={player.id}
                    onClick={() => handleInvite(player.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--muted)] transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-xs font-bold">
                      {player.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{player.nickname || player.full_name}</p>
                      <p className="text-xs text-[var(--muted-fg)]">{player.email}</p>
                    </div>
                    <UserPlus className="w-4 h-4 text-[var(--primary)]" />
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              value={inviteMessage}
              onChange={e => setInviteMessage(e.target.value)}
              placeholder="Lời nhắn kèm theo (tuỳ chọn)"
              className="input text-sm"
            />
          </div>

          {/* 2. Invite Code */}
          <div className="card p-4 space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-1">🔑 Invite Code</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 rounded-lg bg-[var(--muted)] font-mono text-lg font-bold text-center">
                {currentGroup.invite_code}
              </code>
              <button onClick={copyCode} className="btn btn-secondary">
                {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 3. Invite Link */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-1"><Link2 className="w-4 h-4" /> Invite Link</h3>
              <button onClick={handleCreateLink} className="btn btn-secondary btn-sm">+ Tạo link mới</button>
            </div>
            {inviteLinks.map(link => (
              <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--muted)]">
                <code className="flex-1 text-xs truncate">{window.location.origin}/invite/{link.token}</code>
                <button onClick={() => copyLink(link.token)} className="btn btn-ghost btn-sm">
                  {linkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
                <button onClick={() => revokeInviteLink(link.id)} className="btn btn-ghost btn-sm text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {inviteLinks.length === 0 && (
              <p className="text-xs text-[var(--muted-fg)]">Chưa có link nào. Nhấn &quot;Tạo link mới&quot; để tạo.</p>
            )}
          </div>

          {/* 4. Bulk Email */}
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-1"><Mail className="w-4 h-4" /> Mời hàng loạt (email @vnpay.vn)</h3>
            <textarea
              value={bulkEmails}
              onChange={e => setBulkEmails(e.target.value)}
              placeholder={"nguyenvana@vnpay.vn\ntranthib@vnpay.vn\n..."}
              className="input min-h-[80px] resize-none font-mono text-sm"
            />
            <button
              onClick={handleBulkInvite}
              disabled={bulkSending || !bulkEmails.trim()}
              className="btn btn-secondary btn-sm"
            >
              {bulkSending ? 'Đang gửi...' : `Gửi lời mời (${bulkEmails.split('\n').filter(e => e.trim().endsWith('@vnpay.vn')).length} email)`}
            </button>
          </div>
        </motion.div>
      )}

      {/* Requests Tab */}
      {tab === 'requests' && isAdmin && (
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          {joinRequests.length > 0 ? (
            <div className="card divide-y divide-[var(--border-color)]">
              {joinRequests.map(req => {
                const player = players.find(p => p.id === req.player_id);
                if (!player) return null;
                return (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-sm font-bold">
                      {player.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{player.nickname || player.full_name}</p>
                      <p className="text-xs text-[var(--muted-fg)] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(req.created_at).toLocaleDateString('vi')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => respondToJoinRequest(req.id, true, currentUser.id)}
                        className="btn btn-gradient btn-sm text-xs"
                      >
                        ✅ Duyệt
                      </button>
                      <button
                        onClick={() => respondToJoinRequest(req.id, false, currentUser.id)}
                        className="btn btn-ghost btn-sm text-xs text-red-500"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-[var(--muted-fg)]">Không có yêu cầu xin vào nào</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
