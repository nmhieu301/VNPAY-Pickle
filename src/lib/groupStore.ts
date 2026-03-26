// ═══════════════════════════════════════════
// VNPAY Pickle — Group Store (Zustand)
// ═══════════════════════════════════════════

import { create } from 'zustand';
import type { Group, GroupMember, GroupInvitation, GroupJoinRequest, GroupInviteLink } from '@/types';
import * as api from '@/lib/supabase/groupsApi';

interface GroupStore {
  // State
  myGroups: Group[];
  discoverGroups: Group[];
  currentGroup: Group | null;
  members: GroupMember[];
  invitations: GroupInvitation[];
  myPendingInvitations: GroupInvitation[];
  joinRequests: GroupJoinRequest[];
  inviteLinks: GroupInviteLink[];
  isLoading: boolean;

  // Fetch
  fetchMyGroups: (playerId: string) => Promise<void>;
  fetchDiscoverGroups: (playerId: string) => Promise<void>;
  loadGroupDetail: (groupId: string) => Promise<void>;
  fetchMyPendingInvitations: (playerId: string) => Promise<void>;

  // Create
  createGroup: (data: Parameters<typeof api.createGroup>[0]) => Promise<Group | null>;

  // Group Actions
  updateGroupSettings: (groupId: string, updates: Parameters<typeof api.updateGroupSettings>[1]) => Promise<boolean>;
  deleteGroup: (groupId: string) => Promise<boolean>;

  // Member Actions
  updateMemberRole: (groupId: string, playerId: string, role: GroupMember['role']) => Promise<boolean>;
  removeMember: (groupId: string, playerId: string) => Promise<boolean>;
  transferOwnership: (groupId: string, currentOwnerId: string, newOwnerId: string) => Promise<boolean>;

  // Invitation Actions
  inviteMember: (data: Parameters<typeof api.createGroupInvitation>[0]) => Promise<GroupInvitation | null>;
  respondToInvitation: (invitationId: string, accept: boolean, playerId: string) => Promise<boolean>;

  // Join Request Actions
  joinViaCode: (code: string, playerId: string) => Promise<{ success: boolean; group?: Group; needsApproval?: boolean; error?: string }>;
  joinViaLink: (token: string, playerId: string) => Promise<{ success: boolean; group?: Group; needsApproval?: boolean }>;
  respondToJoinRequest: (requestId: string, approve: boolean, reviewerId: string) => Promise<boolean>;

  // Invite Link Actions
  createInviteLink: (data: Parameters<typeof api.createGroupInviteLink>[0]) => Promise<GroupInviteLink | null>;
  revokeInviteLink: (linkId: string) => Promise<boolean>;

  // Helpers
  getMyRole: (playerId: string) => GroupMember['role'] | null;
}

export const useGroupStore = create<GroupStore>()((set, get) => ({
  myGroups: [],
  discoverGroups: [],
  currentGroup: null,
  members: [],
  invitations: [],
  myPendingInvitations: [],
  joinRequests: [],
  inviteLinks: [],
  isLoading: false,

  fetchMyGroups: async (playerId) => {
    const myGroups = await api.fetchMyGroups(playerId);
    set({ myGroups });
  },

  fetchDiscoverGroups: async (playerId) => {
    const discoverGroups = await api.fetchDiscoverGroups(playerId);
    set({ discoverGroups });
  },

  loadGroupDetail: async (groupId) => {
    set({ isLoading: true });
    const [group, members, invitations, joinRequests, inviteLinks] = await Promise.all([
      api.fetchGroupById(groupId),
      api.fetchGroupMembers(groupId),
      api.fetchGroupInvitations(groupId),
      api.fetchJoinRequests(groupId),
      api.fetchInviteLinks(groupId),
    ]);
    set({ currentGroup: group, members, invitations, joinRequests, inviteLinks, isLoading: false });
  },

  fetchMyPendingInvitations: async (playerId) => {
    const myPendingInvitations = await api.fetchMyPendingInvitations(playerId);
    set({ myPendingInvitations });
  },

  createGroup: async (data) => {
    const group = await api.createGroup(data);
    if (group) {
      set(s => ({ myGroups: [group, ...s.myGroups] }));
    }
    return group;
  },

  updateGroupSettings: async (groupId, updates) => {
    const ok = await api.updateGroupSettings(groupId, updates);
    if (ok) {
      set(s => ({
        currentGroup: s.currentGroup ? { ...s.currentGroup, ...updates } : null,
        myGroups: s.myGroups.map(g => g.id === groupId ? { ...g, ...updates } : g),
      }));
    }
    return ok;
  },

  deleteGroup: async (groupId) => {
    const ok = await api.deleteGroup(groupId);
    if (ok) {
      set(s => ({
        myGroups: s.myGroups.filter(g => g.id !== groupId),
        currentGroup: null,
      }));
    }
    return ok;
  },

  updateMemberRole: async (groupId, playerId, role) => {
    const ok = await api.updateMemberRole(groupId, playerId, role);
    if (ok) {
      set(s => ({ members: s.members.map(m => m.player_id === playerId ? { ...m, role } : m) }));
    }
    return ok;
  },

  removeMember: async (groupId, playerId) => {
    const ok = await api.removeGroupMember(groupId, playerId);
    if (ok) {
      set(s => ({
        members: s.members.filter(m => m.player_id !== playerId),
        currentGroup: s.currentGroup ? { ...s.currentGroup, member_count: s.currentGroup.member_count - 1 } : null,
      }));
    }
    return ok;
  },

  transferOwnership: async (groupId, currentOwnerId, newOwnerId) => {
    const ok = await api.transferOwnership(groupId, currentOwnerId, newOwnerId);
    if (ok) {
      set(s => ({
        members: s.members.map(m => {
          if (m.player_id === currentOwnerId) return { ...m, role: 'admin' as const };
          if (m.player_id === newOwnerId) return { ...m, role: 'owner' as const };
          return m;
        }),
        currentGroup: s.currentGroup ? { ...s.currentGroup, owner_id: newOwnerId } : null,
      }));
    }
    return ok;
  },

  inviteMember: async (data) => {
    const inv = await api.createGroupInvitation(data);
    if (inv) {
      set(s => ({ invitations: [inv, ...s.invitations] }));
    }
    return inv;
  },

  respondToInvitation: async (invitationId, accept, playerId) => {
    const ok = await api.respondToInvitation(invitationId, accept, playerId);
    if (ok) {
      set(s => ({
        myPendingInvitations: s.myPendingInvitations.filter(i => i.id !== invitationId),
      }));
    }
    return ok;
  },

  joinViaCode: async (code, playerId) => {
    return api.joinGroupViaCode(code, playerId);
  },

  joinViaLink: async (token, playerId) => {
    return api.joinGroupViaLink(token, playerId);
  },

  respondToJoinRequest: async (requestId, approve, reviewerId) => {
    const ok = await api.respondToJoinRequest(requestId, approve, reviewerId);
    if (ok) {
      set(s => ({ joinRequests: s.joinRequests.filter(r => r.id !== requestId) }));
      // Reload members if approved
      if (approve && get().currentGroup) {
        const members = await api.fetchGroupMembers(get().currentGroup!.id);
        set({ members });
      }
    }
    return ok;
  },

  createInviteLink: async (data) => {
    const link = await api.createGroupInviteLink(data);
    if (link) {
      set(s => ({ inviteLinks: [link, ...s.inviteLinks] }));
    }
    return link;
  },

  revokeInviteLink: async (linkId) => {
    const ok = await api.revokeInviteLink(linkId);
    if (ok) {
      set(s => ({ inviteLinks: s.inviteLinks.filter(l => l.id !== linkId) }));
    }
    return ok;
  },

  getMyRole: (playerId) => {
    const member = get().members.find(m => m.player_id === playerId);
    return member?.role || null;
  },
}));
