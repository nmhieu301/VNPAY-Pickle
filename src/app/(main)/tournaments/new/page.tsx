'use client';

import { TournamentWizard } from '@/components/tournament/TournamentWizard';

export default function NewTournamentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">🏆 Tạo giải đấu mới</h1>
        <p className="text-sm text-[var(--muted-fg)] mt-1">Điền thông tin để tạo giải đấu pickleball</p>
      </div>
      <TournamentWizard />
    </div>
  );
}
