'use client';

import { useEffect, useState } from 'react';
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
  const [authChecked, setAuthChecked] = useState(false);

  // Initialize Supabase auth listener
  useEffect(() => {
    const unsubscribe = initAuth();
    // Give auth a moment to check session
    const timer = setTimeout(() => setAuthChecked(true), 1500);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect to login if not authenticated after auth check
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      router.push('/');
    }
  }, [authChecked, isAuthenticated, router]);

  // Initialize data when authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitialized && !isLoading) {
      initializeData();
    }
  }, [isAuthenticated, isInitialized, isLoading, initializeData]);

  // Still checking auth
  if (!authChecked || (!isAuthenticated && !authChecked)) {
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
          <span className="text-[var(--muted-fg)] text-sm">Đang xác thực...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Show loading screen while fetching data from Supabase
  if (!isInitialized) {
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
          <span className="text-[var(--muted-fg)] text-sm">Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

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
