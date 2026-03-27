// ═══════════════════════════════════════════
// Admin API: Delete Player (server-side, bypasses RLS)
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
    // Verify admin authorization
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
      console.error('createAdminClient error:', err);
      return NextResponse.json({ error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set' }, { status: 500 });
    }

    // Cascade delete all FK references
    const cascadeTables = [
      { table: 'session_players', col: 'player_id' },
      { table: 'match_players', col: 'player_id' },
      { table: 'group_members', col: 'player_id' },
      { table: 'elo_history', col: 'player_id' },
      { table: 'notifications', col: 'user_id' },
      { table: 'group_invitations', col: 'invited_player_id' },
      { table: 'group_join_requests', col: 'player_id' },
    ];

    const warnings: string[] = [];

    for (const { table, col } of cascadeTables) {
      const { error } = await admin.from(table).delete().eq(col, playerId);
      if (error) warnings.push(`${table}.${col}: ${error.message}`);
    }

    // Delete sessions organized by this player
    const { error: sessErr } = await admin.from('sessions').delete().eq('organizer_id', playerId);
    if (sessErr) warnings.push(`sessions.organizer_id: ${sessErr.message}`);

    // Delete groups owned by this player
    const { error: grpErr } = await admin.from('groups').delete().eq('owner_id', playerId);
    if (grpErr) warnings.push(`groups.owner_id: ${grpErr.message}`);

    // Finally delete the player
    const { error } = await admin
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code, warnings },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, warnings });
  } catch (err: any) {
    console.error('Admin DELETE /api/admin/players unhandled error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
