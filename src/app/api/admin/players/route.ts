// ═══════════════════════════════════════════
// Admin API: Delete Player (server-side, bypasses RLS)
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'hieunm2@vnpay.vn';

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

export async function DELETE(req: NextRequest) {
  // Verify admin authorization
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { playerId } = await req.json();
  if (!playerId) {
    return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
  }

  const admin = createAdminClient();

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
  await admin.from('sessions').delete().eq('organizer_id', playerId);

  // Delete groups owned by this player
  await admin.from('groups').delete().eq('owner_id', playerId);

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
}
