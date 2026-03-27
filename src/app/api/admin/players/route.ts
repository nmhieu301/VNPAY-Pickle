// ═══════════════════════════════════════════
// Admin API: Delete Player (server-side, bypasses RLS)
// Optimized with parallel cascade deletes
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'hieunm2@vnpay.vn';

async function verifyAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email === ADMIN_EMAIL;
  } catch (err) {
    console.error('verifyAdmin error:', err);
    return false;
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let body: { playerId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { playerId } = body;
    if (!playerId) {
      return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch (err) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set' }, { status: 500 });
    }

    // ⚡ Run ALL cascade deletes in PARALLEL for maximum speed
    const cascadeResults = await Promise.allSettled([
      admin.from('session_players').delete().eq('player_id', playerId),
      admin.from('match_players').delete().eq('player_id', playerId),
      admin.from('group_members').delete().eq('player_id', playerId),
      admin.from('elo_history').delete().eq('player_id', playerId),
      admin.from('notifications').delete().eq('user_id', playerId),
      admin.from('group_invitations').delete().eq('invited_player_id', playerId),
      admin.from('group_join_requests').delete().eq('player_id', playerId),
      admin.from('sessions').delete().eq('organizer_id', playerId),
      admin.from('groups').delete().eq('owner_id', playerId),
    ]);

    const warnings = cascadeResults
      .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error))
      .map((r, i) => r.status === 'rejected' ? `cascade[${i}]: ${r.reason}` : `cascade[${i}]: ${(r as any).value.error.message}`);

    // Finally delete the player
    const { error } = await admin.from('players').delete().eq('id', playerId);

    if (error) {
      return NextResponse.json({ error: error.message, code: error.code, warnings }, { status: 500 });
    }

    return NextResponse.json({ success: true, warnings });
  } catch (err: any) {
    console.error('Admin DELETE error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
