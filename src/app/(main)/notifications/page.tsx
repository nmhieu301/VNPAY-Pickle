'use client';

export default function NotificationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">🔔 Thông báo</h1>

      <div className="card p-8 text-center">
        <span className="text-4xl block mb-3">🔕</span>
        <p className="font-medium">Chưa có thông báo nào</p>
        <p className="text-sm text-[var(--muted-fg)] mt-1">Thông báo sẽ xuất hiện khi có lịch thi đấu mới hoặc cập nhật kết quả</p>
      </div>
    </div>
  );
}
