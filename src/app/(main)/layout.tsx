'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  const isInitialized = useAppStore(s => s.isInitialized);
  const isLoading = useAppStore(s => s.isLoading);
  const initializeData = useAppStore(s => s.initializeData);
  const initAuth = useAppStore(s => s.initAuth);
  const authInitialized = useRef(false);

  // Initialize Supabase auth listener once
  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;
    const unsubscribe = initAuth();
    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect to login if not authenticated (only after Supabase responds)
  // We wait until we know auth state — onAuthStateChange fires "INITIAL_SESSION" quickly
  useEffect(() => {
    // Short grace period for Supabase to fire INITIAL_SESSION
    const timer = setTimeout(() => {
      if (!isAuthenticated) router.push('/');
    }, 400); // was 1500ms — reduced to 400ms minimum Supabase needs
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Background refresh when authenticated but already showing cached data
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      if (!isInitialized) {
        // First load — need to fetch
        initializeData();
      } else {
        // Stale-while-revalidate: refresh in background after 30s
        const timer = setTimeout(() => initializeData(), 30_000);
        return () => clearTimeout(timer);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isInitialized]);

  // ⚡ If we have cached data — show UI immediately, no splash screen
  if (isAuthenticated && isInitialized) {
    return (
      <>
        <Header />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24 md:pb-6">
          {children}
        </main>
        <footer className="hidden md:block border-t border-[var(--border-color)] py-6 text-center text-sm text-[var(--muted-fg)]">
          <div className="flex items-center justify-center gap-3">
            <img src="/vnpay-logo-v2.png" alt="VNPAY" className="h-6 object-contain" />
            <span>VNPAY Pickle — Nền tảng Pickleball nội bộ VNPAY</span>
          </div>
        </footer>
        <MobileNav />
      </>
    );
  }

  // ── Loading splash (first‑ever load or not authenticated) ──
  const text = isAuthenticated && !isInitialized
    ? 'Đang tải dữ liệu...'
    : 'Đang xác thực...';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <img
        src="/logo-128-v2.png"
        alt="VNPAY Pickle"
        className="w-24 h-24 object-contain animate-pulse"
        style={{ filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.15))' }}
      />
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <span className="text-[var(--muted-fg)] text-sm">{text}</span>
      </div>
    </div>
  );
}
