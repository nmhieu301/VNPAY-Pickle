'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Gamepad2, Trophy, BarChart3, User, Users2 } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Trang chủ', icon: Home },
  { href: '/sessions', label: 'Lịch thi đấu', icon: Gamepad2 },
  { href: '/groups', label: 'Nhóm', icon: Users2 },
  { href: '/rankings', label: 'Xếp hạng', icon: BarChart3 },
  { href: '/profile', label: 'Tôi', icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav glass border-t border-[var(--border-color)] md:hidden">
      <div className="flex items-stretch">
        {navItems.map(item => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                isActive
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted-fg)] hover:text-[var(--fg)]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[var(--primary)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
