// ═══════════════════════════════════════════
// VNPAY Pickle — useTournamentCommittee Hook
// ═══════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  fetchCommittee, addCommitteeMember, removeCommitteeMember, checkIsCommittee,
} from '@/lib/supabase/committeeApi';
import type { TournamentCommitteeMember, CommitteeRole } from '@/types';

interface UseTournamentCommitteeReturn {
  committee: TournamentCommitteeMember[];
  currentRole: CommitteeRole | null;
  isDirector: boolean;
  isCommittee: boolean;
  isLoading: boolean;
  addMember: (playerId: string, role?: CommitteeRole) => Promise<boolean>;
  removeMember: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useTournamentCommittee(
  tournamentId: string | null,
  currentUserId: string | null
): UseTournamentCommitteeReturn {
  const [committee, setCommittee] = useState<TournamentCommitteeMember[]>([]);
  const [currentRole, setCurrentRole] = useState<CommitteeRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!tournamentId) return;
    setIsLoading(true);
    const [members, role] = await Promise.all([
      fetchCommittee(tournamentId),
      currentUserId ? checkIsCommittee(tournamentId, currentUserId) : Promise.resolve(null),
    ]);
    setCommittee(members);
    setCurrentRole(role);
    setIsLoading(false);
  }, [tournamentId, currentUserId]);

  useEffect(() => { refresh(); }, [refresh]);

  const addMember = useCallback(async (playerId: string, role: CommitteeRole = 'committee') => {
    if (!tournamentId) return false;
    const member = await addCommitteeMember(tournamentId, playerId, role);
    if (member) {
      setCommittee(prev => [...prev, member]);
      return true;
    }
    return false;
  }, [tournamentId]);

  const removeMember = useCallback(async (id: string) => {
    const ok = await removeCommitteeMember(id);
    if (ok) setCommittee(prev => prev.filter(m => m.id !== id));
    return ok;
  }, []);

  return {
    committee,
    currentRole,
    isDirector: currentRole === 'director',
    isCommittee: currentRole === 'director' || currentRole === 'committee',
    isLoading,
    addMember,
    removeMember,
    refresh,
  };
}
