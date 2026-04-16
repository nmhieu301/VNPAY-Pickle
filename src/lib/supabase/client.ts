// ═══════════════════════════════════════════
// VNPAY Pickle — Supabase Browser Client
// ═══════════════════════════════════════════

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton instance — avoids re-creating the client on every call
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getClient() {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}
