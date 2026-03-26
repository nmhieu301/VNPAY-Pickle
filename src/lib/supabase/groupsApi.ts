// ═══════════════════════════════════════════
// VNPAY Pickle — Groups API Service Layer
// ═══════════════════════════════════════════

import { createClient } from './client';
import type { Group, GroupMember, GroupInvitation, GroupJoinRequest, GroupInviteLink } from '@/types';

const supabase = createClient();

// ─── Helpers ───

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PKL-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function mapGroup(row: Record<string, unknown>): Group {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    avatar_url: row.avatar_url as string | null,
    owner_id: row.owner_id as string,
    privacy: row.privacy as Group['privacy'],
    join_mode: row.join_mode as Group['join_mode'],
    max_members: row.max_members as number,
    enable_group_elo: row.enable_group_elo as boolean,
    enable_auto_matching: row.enable_auto_matching as boolean,
    invite_code: row.invite_code as string,
    member_count: row.member_count as number,
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
  };
}

function mapMember(row: Record<string, unknown>): GroupMember {
  return {
    id: row.id as string,
    group_id: row.group_id as string,
    player_id: row.player_id as string,
    role: row.role as GroupMember['role'],
    joined_at: row.joined_at as string,
  };
}

function mapInvitation(row: Record<string, unknown>): GroupInvitation {
  return {
    id: row.id as string,
    group_id: row.group_id as string,
    invited_by: row.invited_by as string,
    invited_player_id: row.invited_player_id as string,
    message: row.message as string | null,
    status: row.status as GroupInvitation['status'],
    expires_at: row.expires_at as string,
    created_at: row.created_at as string,
    responded_at: row.responded_at as string | null,
  };
}

function mapJoinRequest(row: Record<string, unknown>): GroupJoinRequest {
  return {
    id: row.id as string,
    group_id: row.group_id as string,
    player_id: row.player_id as string,
    status: row.status as GroupJoinRequest['status'],
    reviewed_by: row.reviewed_by as string | null,
    created_at: row.created_at as string,
    reviewed_at: row.reviewed_at as string | null,
  };
}

function mapInviteLink(row: Record<string, unknown>): GroupInviteLink {
  return {
    id: row.id as string,
    group_id: row.group_id as string,
    token: row.token as string,
    created_by: row.created_by as string,
    expires_at: row.expires_at as string | null,
    max_uses: row.max_uses as number | null,
    use_count: row.use_count as number,
    requires_approval: row.requires_approval as boolean,
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
  };
}

// ═══════════════════════════════════════════
// FETCH FUNCTIONS
// ═══════════════════════════════════════════

export async function fetchMyGroups(playerId: string): Promise<Group[]> {
  const { data: memberRows, error: mErr } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('player_id', playerId);

  if (mErr || !memberRows?.length) return [];

  const groupIds = memberRows.map(r => r.group_id);
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .in('id', groupIds)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) { console.error('fetchMyGroups error:', error); return []; }
  return (data || []).map(mapGroup);
}

export async function fetchDiscoverGroups(playerId: string): Promise<Group[]> {
  // Fetch groups that are 'private' (discoverable) and user is NOT a member
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('player_id', playerId);

  const myGroupIds = (memberRows || []).map(r => r.group_id);

  let query = supabase
    .from('groups')
    .select('*')
    .eq('privacy', 'private')
    .eq('is_active', true)
    .order('member_count', { ascending: false });

  if (myGroupIds.length > 0) {
    // Filter out groups user is already in - use not.in filter
    query = query.not('id', 'in', `(${myGroupIds.join(',')})`);
  }

  const { data, error } = await query;
  if (error) { console.error('fetchDiscoverGroups error:', error); return []; }
  return (data || []).map(mapGroup);
}

export async function fetchGroupById(groupId: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error || !data) return null;
  return mapGroup(data);
}

export async function fetchGroupByInviteCode(code: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return mapGroup(data);
}

export async function fetchGroupByInviteLinkToken(token: string): Promise<{ group: Group; link: GroupInviteLink } | null> {
  const { data: linkData, error: linkErr } = await supabase
    .from('group_invite_links')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .single();

  if (linkErr || !linkData) return null;

  const link = mapInviteLink(linkData);

  // Check if expired
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;
  // Check max uses
  if (link.max_uses && link.use_count >= link.max_uses) return null;

  const group = await fetchGroupById(link.group_id);
  if (!group) return null;

  return { group, link };
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .order('role', { ascending: true });

  if (error) { console.error('fetchGroupMembers error:', error); return []; }
  return (data || []).map(mapMember);
}

export async function fetchGroupInvitations(groupId: string): Promise<GroupInvitation[]> {
  const { data, error } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []).map(mapInvitation);
}

export async function fetchMyPendingInvitations(playerId: string): Promise<GroupInvitation[]> {
  const { data, error } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('invited_player_id', playerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []).map(mapInvitation);
}

export async function fetchJoinRequests(groupId: string): Promise<GroupJoinRequest[]> {
  const { data, error } = await supabase
    .from('group_join_requests')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []).map(mapJoinRequest);
}

export async function fetchInviteLinks(groupId: string): Promise<GroupInviteLink[]> {
  const { data, error } = await supabase
    .from('group_invite_links')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []).map(mapInviteLink);
}

// ═══════════════════════════════════════════
// MUTATION FUNCTIONS
// ═══════════════════════════════════════════

export async function createGroup(data: {
  name: string;
  description?: string;
  avatar_url?: string;
  owner_id: string;
  privacy: Group['privacy'];
  join_mode: Group['join_mode'];
  max_members: number;
  enable_group_elo: boolean;
  enable_auto_matching: boolean;
}): Promise<Group | null> {
  const invite_code = generateInviteCode();

  const { data: groupData, error } = await supabase
    .from('groups')
    .insert({
      name: data.name,
      description: data.description || null,
      avatar_url: data.avatar_url || null,
      owner_id: data.owner_id,
      privacy: data.privacy,
      join_mode: data.join_mode,
      max_members: data.max_members,
      enable_group_elo: data.enable_group_elo,
      enable_auto_matching: data.enable_auto_matching,
      invite_code,
      member_count: 1,
    })
    .select()
    .single();

  if (error) { console.error('createGroup error:', error); return null; }

  // Auto-add owner as member
  await supabase.from('group_members').insert({
    group_id: groupData.id,
    player_id: data.owner_id,
    role: 'owner',
  });

  return mapGroup(groupData);
}

export async function updateGroupSettings(groupId: string, updates: Partial<{
  name: string;
  description: string | null;
  avatar_url: string | null;
  privacy: Group['privacy'];
  join_mode: Group['join_mode'];
  max_members: number;
  enable_group_elo: boolean;
  enable_auto_matching: boolean;
}>): Promise<boolean> {
  const { error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', groupId);

  if (error) { console.error('updateGroupSettings error:', error); return false; }
  return true;
}

export async function deleteGroup(groupId: string): Promise<boolean> {
  const { error } = await supabase
    .from('groups')
    .update({ is_active: false })
    .eq('id', groupId);

  if (error) { console.error('deleteGroup error:', error); return false; }
  return true;
}

export async function createGroupInvitation(data: {
  group_id: string;
  invited_by: string;
  invited_player_id: string;
  message?: string;
}): Promise<GroupInvitation | null> {
  // Check if already invited or already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', data.group_id)
    .eq('player_id', data.invited_player_id)
    .single();

  if (existing) return null; // Already a member

  const { data: invData, error } = await supabase
    .from('group_invitations')
    .insert({
      group_id: data.group_id,
      invited_by: data.invited_by,
      invited_player_id: data.invited_player_id,
      message: data.message || null,
    })
    .select()
    .single();

  if (error) { console.error('createGroupInvitation error:', error); return null; }
  return mapInvitation(invData);
}

export async function respondToInvitation(invitationId: string, accept: boolean, playerId: string): Promise<boolean> {
  const { data: inv, error: fetchErr } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (fetchErr || !inv) return false;

  const { error } = await supabase
    .from('group_invitations')
    .update({
      status: accept ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', invitationId);

  if (error) return false;

  if (accept) {
    // Add to group
    await supabase.from('group_members').insert({
      group_id: inv.group_id,
      player_id: playerId,
      role: 'member',
    });
    // Increment member count
    const { data: g } = await supabase.from('groups').select('member_count').eq('id', inv.group_id).single();
    if (g) {
      await supabase.from('groups').update({ member_count: (g.member_count as number) + 1 }).eq('id', inv.group_id);
    }
  }

  return true;
}

export async function createGroupJoinRequest(groupId: string, playerId: string): Promise<boolean> {
  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('player_id', playerId)
    .single();

  if (existing) return false;

  const { error } = await supabase
    .from('group_join_requests')
    .insert({ group_id: groupId, player_id: playerId });

  if (error) { console.error('createGroupJoinRequest error:', error); return false; }
  return true;
}

export async function respondToJoinRequest(requestId: string, approve: boolean, reviewerId: string): Promise<boolean> {
  const { data: req, error: fetchErr } = await supabase
    .from('group_join_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchErr || !req) return false;

  const { error } = await supabase
    .from('group_join_requests')
    .update({
      status: approve ? 'approved' : 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) return false;

  if (approve) {
    await supabase.from('group_members').insert({
      group_id: req.group_id,
      player_id: req.player_id,
      role: 'member',
    });
    // Increment member count
    const { data: g } = await supabase.from('groups').select('member_count').eq('id', req.group_id).single();
    if (g) await supabase.from('groups').update({ member_count: (g.member_count as number) + 1 }).eq('id', req.group_id);
  }

  return true;
}

export async function updateMemberRole(groupId: string, playerId: string, newRole: GroupMember['role']): Promise<boolean> {
  const { error } = await supabase
    .from('group_members')
    .update({ role: newRole })
    .eq('group_id', groupId)
    .eq('player_id', playerId);

  if (error) { console.error('updateMemberRole error:', error); return false; }
  return true;
}

export async function removeGroupMember(groupId: string, playerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('player_id', playerId);

  if (error) { console.error('removeGroupMember error:', error); return false; }

  // Decrement member count
  const { data: g } = await supabase.from('groups').select('member_count').eq('id', groupId).single();
  if (g) await supabase.from('groups').update({ member_count: Math.max(0, (g.member_count as number) - 1) }).eq('id', groupId);

  return true;
}

export async function joinGroupViaCode(code: string, playerId: string): Promise<{ success: boolean; group?: Group; needsApproval?: boolean; error?: string }> {
  const group = await fetchGroupByInviteCode(code);
  if (!group) return { success: false, error: 'not_found' };

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('player_id', playerId)
    .single();

  if (existing) return { success: false, group, error: 'already_member' };

  if (group.join_mode === 'invite_only') {
    return { success: false, group, error: 'invite_only' };
  }

  if (group.join_mode === 'request') {
    await createGroupJoinRequest(group.id, playerId);
    return { success: true, group, needsApproval: true };
  }

  // invite_link mode - join directly
  await supabase.from('group_members').insert({
    group_id: group.id,
    player_id: playerId,
    role: 'member',
  });
  const { data: g } = await supabase.from('groups').select('member_count').eq('id', group.id).single();
  if (g) await supabase.from('groups').update({ member_count: (g.member_count as number) + 1 }).eq('id', group.id);

  return { success: true, group };
}

export async function joinGroupViaLink(token: string, playerId: string): Promise<{ success: boolean; group?: Group; needsApproval?: boolean }> {
  const result = await fetchGroupByInviteLinkToken(token);
  if (!result) return { success: false };

  const { group, link } = result;

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('player_id', playerId)
    .single();

  if (existing) return { success: false };

  // Increment use count
  await supabase.from('group_invite_links').update({ use_count: link.use_count + 1 }).eq('id', link.id);

  if (link.requires_approval) {
    await createGroupJoinRequest(group.id, playerId);
    return { success: true, group, needsApproval: true };
  }

  // Join directly
  await supabase.from('group_members').insert({
    group_id: group.id,
    player_id: playerId,
    role: 'member',
  });
  const { data: g } = await supabase.from('groups').select('member_count').eq('id', group.id).single();
  if (g) await supabase.from('groups').update({ member_count: (g.member_count as number) + 1 }).eq('id', group.id);

  return { success: true, group };
}

export async function createGroupInviteLink(data: {
  group_id: string;
  created_by: string;
  expires_days?: number;
  max_uses?: number;
  requires_approval?: boolean;
}): Promise<GroupInviteLink | null> {
  const { data: linkData, error } = await supabase
    .from('group_invite_links')
    .insert({
      group_id: data.group_id,
      created_by: data.created_by,
      expires_at: data.expires_days ? new Date(Date.now() + data.expires_days * 86400000).toISOString() : null,
      max_uses: data.max_uses || null,
      requires_approval: data.requires_approval || false,
    })
    .select()
    .single();

  if (error) { console.error('createGroupInviteLink error:', error); return null; }
  return mapInviteLink(linkData);
}

export async function revokeInviteLink(linkId: string): Promise<boolean> {
  const { error } = await supabase
    .from('group_invite_links')
    .update({ is_active: false })
    .eq('id', linkId);

  if (error) return false;
  return true;
}

export async function transferOwnership(groupId: string, currentOwnerId: string, newOwnerId: string): Promise<boolean> {
  // Demote current owner to admin
  await supabase.from('group_members').update({ role: 'admin' }).eq('group_id', groupId).eq('player_id', currentOwnerId);
  // Promote new owner
  await supabase.from('group_members').update({ role: 'owner' }).eq('group_id', groupId).eq('player_id', newOwnerId);
  // Update groups table
  const { error } = await supabase.from('groups').update({ owner_id: newOwnerId }).eq('id', groupId);
  if (error) return false;
  return true;
}
