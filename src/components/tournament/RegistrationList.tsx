'use client';

import { useState } from 'react';
import { TournamentEvent, TournamentTeamExtended } from '@/types';
import { useTournamentStore } from '@/lib/tournamentStore';
import { useAppStore } from '@/lib/store';
import { Users, UserCheck, Search, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props {
  event: TournamentEvent;
  teams: TournamentTeamExtended[];
  isOrganizer?: boolean;
}

const STATUS_ICONS = {
  pending: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  confirmed: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  withdrawn: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  disqualified: <XCircle className="w-3.5 h-3.5 text-red-600" />,
};

const STATUS_LABEL = {
  pending: 'Chờ duyệt',
  confirmed: 'Đã xác nhận',
  withdrawn: 'Đã rút',
  disqualified: 'Bị loại',
};

export function RegistrationList({ event, teams, isOrganizer }: Props) {
  const getPlayer = useAppStore(s => s.getPlayer);
  const approveTeam = useTournamentStore(s => s.approveTeam);
  const rejectTeam = useTournamentStore(s => s.rejectTeam);
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  function getTeamLabel(team: TournamentTeamExtended): string {
    if (team.team_name) return team.team_name;
    const p1 = getPlayer(team.player1_id);
    const p2 = team.player2_id ? getPlayer(team.player2_id) : null;
    const n1 = p1?.nickname || p1?.full_name || '?';
    const n2 = p2 ? (p2.nickname || p2.full_name) : null;
    return n2 ? `${n1} + ${n2}` : n1;
  }

  const sorted = [...teams].sort((a, b) =>
    new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime()
  );

  const filtered = sorted.filter(t => {
    if (!search) return true;
    const label = getTeamLabel(t).toLowerCase();
    return label.includes(search.toLowerCase());
  });

  const confirmed = filtered.filter(t => t.status === 'confirmed');
  const pending = filtered.filter(t => t.status === 'pending');
  const others = filtered.filter(t => t.status !== 'confirmed' && t.status !== 'pending');

  const handleApprove = async (teamId: string) => {
    setActionId(teamId);
    await approveTeam(teamId);
    setActionId(null);
  };

  const handleReject = async (teamId: string) => {
    setActionId(teamId);
    await rejectTeam(teamId);
    setActionId(null);
  };

  const renderTeamRow = (team: TournamentTeamExtended) => {
    const label = getTeamLabel(team);
    const p1 = getPlayer(team.player1_id);
    const dept = p1?.department_id;

    return (
      <div
        key={team.id}
        className={`flex items-center gap-3 p-3 rounded-lg ${
          team.status === 'confirmed' ? 'bg-green-50 dark:bg-green-900/10' :
          team.status === 'pending' ? 'bg-amber-50 dark:bg-amber-900/10' :
          'bg-[var(--muted)] opacity-60'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {team.seed_number && (
              <span className="text-xs font-bold text-[var(--muted-fg)] w-5 text-center">#{team.seed_number}</span>
            )}
            <span className="font-medium text-sm truncate">{label}</span>
            {STATUS_ICONS[team.status]}
          </div>
          <div className="flex items-center gap-2 mt-0.5 ml-7">
            {team.avg_elo && (
              <span className="text-xs text-[var(--muted-fg)]">ELO {Math.round(team.avg_elo)}</span>
            )}
            {team.pool_letter && (
              <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 rounded">
                Bảng {team.pool_letter}
              </span>
            )}
            <span className="text-xs text-[var(--muted-fg)]">{STATUS_LABEL[team.status]}</span>
          </div>
        </div>

        {isOrganizer && team.status === 'pending' && (
          <div className="flex gap-1.5">
            <button
              onClick={() => handleApprove(team.id)}
              disabled={actionId === team.id}
              className="btn btn-sm bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2"
            >
              {actionId === team.id ? '...' : '✓'}
            </button>
            <button
              onClick={() => handleReject(team.id)}
              disabled={actionId === team.id}
              className="btn btn-sm bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-green-600">{teams.filter(t => t.status === 'confirmed').length}</div>
          <div className="text-xs text-[var(--muted-fg)]">Xác nhận</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-amber-600">{teams.filter(t => t.status === 'pending').length}</div>
          <div className="text-xs text-[var(--muted-fg)]">Chờ duyệt</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold">{event.max_teams}</div>
          <div className="text-xs text-[var(--muted-fg)]">Tối đa</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm kiếm đội..."
          className="input pl-9"
        />
      </div>

      {/* Lists */}
      {pending.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Chờ duyệt ({pending.length})
          </h4>
          <div className="space-y-2">{pending.map(renderTeamRow)}</div>
        </div>
      )}

      {confirmed.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" /> Đã xác nhận ({confirmed.length})
          </h4>
          <div className="space-y-2">{confirmed.map(renderTeamRow)}</div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[var(--muted-fg)] mb-2">Khác</h4>
          <div className="space-y-2">{others.map(renderTeamRow)}</div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-8 text-[var(--muted-fg)]">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Chưa có đội đăng ký</p>
        </div>
      )}
    </div>
  );
}
