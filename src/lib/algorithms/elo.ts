// ═══════════════════════════════════════════
// VNPAY Pickle — ELO module (legacy stub)
// ELO calculation is no longer used.
// Tier (0–4) is assigned manually by admin.
// ═══════════════════════════════════════════

// Retained as a no-op stub so any remaining imports don't break.

export function calculateEloChanges() {
  return { teamAChanges: [], teamBChanges: [] };
}

/** @deprecated — tier is now a plain integer (0–4) set by admin */
export function calculateTier(_elo: number): number {
  return 0;
}
