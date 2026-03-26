// ═══════════════════════════════════════════
// VNPAY Pickle — Auth Callback Route
// Handles Supabase Magic Link redirect (PKCE)
// ═══════════════════════════════════════════

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // If Supabase returned an error (e.g. expired token)
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('auth_error', errorDescription || error);
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError.message);
      // PKCE code_verifier missing — user likely opened the link on a different browser/device.
      // Redirect to login with a helpful error message.
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set(
        'auth_error',
        'Đường dẫn không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đường dẫn mới từ chính trình duyệt này.'
      );
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect to dashboard after successful auth
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
