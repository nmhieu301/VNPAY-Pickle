// ═══════════════════════════════════════════
// VNPAY Pickle — Copy Text Utility
// Format kết quả chia cặp để gửi Zalo
// ═══════════════════════════════════════════

import { CourtAssignment, Player, MatchingResult } from '@/types';
import { getTierConfig } from '@/lib/constants/tiers';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

function playerLine(p: Player): string {
  const tier = getTierConfig(p.tier);
  return `${p.nickname || p.full_name} (${tier.label} ${tier.icon})`;
}

function formatCourt(court: CourtAssignment): string {
  const teamANames = court.team_a.map(playerLine).join(' + ');
  const teamBNames = court.team_b.map(playerLine).join(' + ');
  const balance = court.tier_diff === 0 ? '✅' : court.tier_diff <= 1 ? '⚠️' : '❌';

  return [
    `🔸 Sân ${court.court_number}:`,
    `  🟥 ${teamANames}`,
    `  VS`,
    `  🟦 ${teamBNames}`,
    `  🏅 Tier: ${court.team_a_tier} vs ${court.team_b_tier} — Chênh: ${court.tier_diff} ${balance}`,
  ].join('\n');
}

export function formatMatchingResult(
  result: MatchingResult,
  sessionTitle: string,
  venueName: string,
  matchMode: string,
  date?: Date
): string {
  const dateStr = date
    ? format(date, "EEEE, dd/MM/yyyy", { locale: vi })
    : format(new Date(), "EEEE, dd/MM/yyyy", { locale: vi });

  const modeLabel = matchMode === 'elo_balanced' ? 'Cân bằng Tier' : matchMode === 'random' ? 'Ngẫu nhiên' : 'Thủ công';

  const lines = [
    `🎾 VNPAY PICKLE — ${sessionTitle}`,
    `📅 ${dateStr} | 📍 ${venueName} | 🎯 ${modeLabel}`,
    '',
    ...result.courts.map(formatCourt),
  ];

  if (result.waiting.length > 0) {
    lines.push('');
    lines.push(`⏳ Hàng chờ: ${result.waiting.map(p => p.nickname || p.full_name).join(', ')}`);
  }

  lines.push('');
  lines.push('🎾 VNPAY Pickle — pickle.vnpay.vn');

  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
