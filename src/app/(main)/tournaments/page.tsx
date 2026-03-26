'use client';

export default function TournamentsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">🏆 Giải đấu</h1>
        <p className="text-sm text-[var(--muted-fg)]">Sẽ ra mắt ở Phase 2</p>
      </div>

      <div className="card p-8 text-center">
        <span className="text-6xl block mb-4">🏆</span>
        <h2 className="text-lg font-bold mb-2">Hệ thống Giải đấu</h2>
        <p className="text-[var(--muted-fg)] max-w-md mx-auto">
          Tính năng tổ chức giải đấu với bracket tự động, lịch thi đấu, live score sẽ ra mắt ở Phase 2.
          Hãy theo dõi nhé!
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">🔲 Bracket tự động</span>
          <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">📅 Lịch thi đấu</span>
          <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">📺 Live Score</span>
          <span className="badge bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">🏅 Giải thưởng</span>
        </div>
      </div>
    </div>
  );
}
