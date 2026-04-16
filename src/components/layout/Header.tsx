'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { TierBadge } from '@/components/player/TierBadge';
import { Bell, Moon, Sun, LogOut, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useGroupStore } from '@/lib/groupStore';

const desktopNavItems = [
  { href: '/dashboard', label: 'Trang chủ' },
  { href: '/sessions', label: 'Lịch thi đấu' },
  { href: '/groups', label: 'Nhóm' },
  { href: '/tournaments', label: 'Giải đấu' },
  { href: '/rankings', label: 'Xếp hạng' },
];

export function Header() {
  const pathname = usePathname();
  const currentUser = useAppStore(s => s.currentUser);
  const logout = useAppStore(s => s.logout);
  const isAdmin = useAppStore(s => s.isAdmin());
  const myPendingInvitations = useGroupStore(s => s.myPendingInvitations);
  const respondToInvitation = useGroupStore(s => s.respondToInvitation);
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const hasNotifications = myPendingInvitations.length > 0;

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  const handleRespond = async (invitationId: string, accept: boolean) => {
    if (!currentUser) return;
    setRespondingId(invitationId);
    await respondToInvitation(invitationId, accept, currentUser.id);
    setRespondingId(null);
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo-128-v2.png" alt="VNPAY Pickle" className="w-9 h-9 object-contain" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }} />
          <span className="font-display font-bold text-lg">
            <span className="text-vnpay-blue">VNPAY</span>
            <span className="text-vnpay-red"> Pickle</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 ml-8">
          {desktopNavItems.map(item => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                    : 'text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith('/admin')
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
              }`}
            >
              Quản trị
            </Link>
          )}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="btn btn-ghost btn-icon hidden sm:flex">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* 🔔 Notification Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen(o => !o); setMenuOpen(false); }}
              className="btn btn-ghost btn-icon relative"
              title="Thông báo"
            >
              <Bell className="w-4 h-4" />
              {hasNotifications && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xl z-50 overflow-hidden">
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
                    <h3 className="font-semibold text-sm">🔔 Thông báo</h3>
                    {hasNotifications && (
                      <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                        {myPendingInvitations.length} mới
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="max-h-80 overflow-y-auto">
                    {myPendingInvitations.length === 0 ? (
                      <div className="py-10 text-center">
                        <p className="text-2xl mb-2">🎉</p>
                        <p className="text-sm text-[var(--muted-fg)]">Không có thông báo mới</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border-color)]">
                        {myPendingInvitations.map(inv => (
                          <div key={inv.id} className="px-4 py-3">
                            <p className="text-sm font-medium mb-0.5">👥 Lời mời tham gia nhóm</p>
                            <p className="text-xs text-[var(--muted-fg)] mb-3">
                              Bạn được mời vào nhóm{' '}
                              <span className="font-semibold text-[var(--fg)]">
                                {(inv as any).group_name || 'một nhóm'}
                              </span>
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRespond(inv.id, true)}
                                disabled={respondingId === inv.id}
                                className="flex-1 btn btn-gradient btn-sm text-xs"
                              >
                                {respondingId === inv.id ? '...' : '✓ Chấp nhận'}
                              </button>
                              <button
                                onClick={() => handleRespond(inv.id, false)}
                                disabled={respondingId === inv.id}
                                className="flex-1 btn btn-ghost btn-sm text-xs"
                              >
                                ✕ Từ chối
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-[var(--border-color)] px-4 py-2">
                    <Link href="/groups" onClick={() => setNotifOpen(false)} className="text-xs text-[var(--primary)] hover:underline">
                      Xem tất cả nhóm →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {currentUser && (
            <Link href="/profile" className="hidden sm:flex items-center gap-2 ml-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-sm font-bold">
                {currentUser.full_name.charAt(0)}
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium leading-tight">{currentUser.nickname || currentUser.full_name}</p>
                <TierBadge tier={currentUser.tier} size="sm" />
              </div>
            </Link>
          )}

          {/* Menu toggle */}
          <div className="relative">
            <button
              onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }}
              className="btn btn-ghost btn-icon"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-lg z-50 overflow-hidden animate-in">
                  <div className="py-1">
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[var(--muted)] transition-colors">
                      🏠 Trang chủ
                    </Link>
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[var(--muted)] transition-colors">
                      👤 Hồ sơ
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-purple-600 font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                        🛡️ Quản trị viên
                      </Link>
                    )}
                    <button onClick={() => { toggleTheme(); setMenuOpen(false); }} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[var(--muted)] transition-colors w-full text-left">
                      {isDark ? '☀️ Sáng' : '🌙 Tối'}
                    </button>
                  </div>
                  <div className="border-t border-[var(--border-color)] px-4 py-2 text-[10px] text-[var(--muted-fg)]">
                    VNPAY Pickle v1.0
                  </div>
                  <div className="border-t border-[var(--border-color)]">
                    <button onClick={async () => { await logout(); setMenuOpen(false); window.location.href = '/'; }} className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left">
                      <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
