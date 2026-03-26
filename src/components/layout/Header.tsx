'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { TierBadge } from '@/components/player/TierBadge';
import { Bell, Moon, Sun, LogOut, Menu, X, Users2 } from 'lucide-react';
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
  const myPendingInvitations = useGroupStore(s => s.myPendingInvitations);
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-40 glass border-b border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo.png" alt="VNPAY Pickle" className="w-9 h-9 object-contain" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }} />
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
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="btn btn-ghost btn-icon hidden sm:flex">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link href="/groups" className="btn btn-ghost btn-icon relative" title="Lời mời nhóm">
            <Bell className="w-4 h-4" />
            {hasNotifications && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </Link>

          {currentUser && (
            <Link href="/profile" className="hidden sm:flex items-center gap-2 ml-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-sm font-bold">
                {currentUser.full_name.charAt(0)}
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium leading-tight">{currentUser.nickname || currentUser.full_name}</p>
                <TierBadge elo={currentUser.elo_rating} size="sm" />
              </div>
            </Link>
          )}

          {/* Menu toggle */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="btn btn-ghost btn-icon"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Dropdown popup */}
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
