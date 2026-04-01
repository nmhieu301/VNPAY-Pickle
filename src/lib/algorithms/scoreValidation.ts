// ═══════════════════════════════════════════
// Score Validation — USA Pickleball 2025 Rules
// ═══════════════════════════════════════════

export interface SetValidationResult {
  valid: boolean;
  error?: string;
  winner: 'A' | 'B' | null;
}

export interface MatchValidationResult {
  valid: boolean;
  error?: string;
  setsWonA: number;
  setsWonB: number;
  winner: 'A' | 'B' | null;
}

/**
 * Validate một set theo luật USA Pickleball 2025
 * - Winner phải đạt target HOẶC nhiều hơn (nếu deuce)
 * - Phải thắng cách 2 điểm
 */
export function validateSet(
  scoreA: number,
  scoreB: number,
  target: number = 11
): SetValidationResult {
  if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) {
    return { valid: false, error: 'Điểm số phải là số dương', winner: null };
  }

  const maxScore = Math.max(scoreA, scoreB);
  const minScore = Math.min(scoreA, scoreB);
  const diff = maxScore - minScore;

  // Phải có người đạt hoặc vượt target
  if (maxScore < target) {
    return {
      valid: false,
      error: `Điểm thắng phải đạt ít nhất ${target} điểm (hiện tại: ${maxScore})`,
      winner: null,
    };
  }

  // Nếu cả 2 cùng chưa qua target-1 → deuce chưa bắt đầu
  if (minScore === maxScore) {
    return { valid: false, error: 'Không thể hòa', winner: null };
  }

  // Phải thắng cách 2 (bắt buộc theo luật)
  if (diff < 2) {
    return {
      valid: false,
      error: `Phải thắng cách ít nhất 2 điểm (hiệu số hiện tại: ${diff})`,
      winner: null,
    };
  }

  // Nếu 1 người đạt target mà không phải deuce → phải đúng target
  // Ví dụ: 11-8 hợp lệ (11 = target, diff = 3 ≥ 2)
  // Ví dụ: 13-11 hợp lệ (deuce, diff = 2)
  // Ví dụ: 12-9 hợp lệ (vượt target nhưng diff = 3 ≥ 2)
  // Ví dụ: 12-11 KHÔNG hợp lệ (diff = 1 < 2)

  const winner = scoreA > scoreB ? 'A' : 'B';
  return { valid: true, winner };
}

/**
 * Validate toàn bộ match (theo format bo1/bo3/bo5)
 */
export function validateMatch(
  sets: Array<{ a: number; b: number }>,
  format: 'bo1' | 'bo3' | 'bo5',
  target: number = 11
): MatchValidationResult {
  const setsNeeded = format === 'bo1' ? 1 : format === 'bo3' ? 2 : 3;
  let setsWonA = 0;
  let setsWonB = 0;

  for (let i = 0; i < sets.length; i++) {
    const { a, b } = sets[i];
    const result = validateSet(a, b, target);
    if (!result.valid) {
      return {
        valid: false,
        error: `Set ${i + 1}: ${result.error}`,
        setsWonA,
        setsWonB,
        winner: null,
      };
    }
    if (result.winner === 'A') setsWonA++;
    else setsWonB++;

    // Check: không thể có set thêm nếu đã có người thắng
    if (setsWonA === setsNeeded && i < sets.length - 1) {
      return {
        valid: false,
        error: `Đội A đã thắng ở set ${i + 1}, không thể có set ${i + 2}`,
        setsWonA,
        setsWonB,
        winner: null,
      };
    }
    if (setsWonB === setsNeeded && i < sets.length - 1) {
      return {
        valid: false,
        error: `Đội B đã thắng ở set ${i + 1}, không thể có set ${i + 2}`,
        setsWonA,
        setsWonB,
        winner: null,
      };
    }
  }

  if (setsWonA === setsNeeded) {
    return { valid: true, setsWonA, setsWonB, winner: 'A' };
  }
  if (setsWonB === setsNeeded) {
    return { valid: true, setsWonA, setsWonB, winner: 'B' };
  }

  return {
    valid: false,
    error: `Chưa đủ set để xác định thắng/thua (cần thắng ${setsNeeded} set)`,
    setsWonA,
    setsWonB,
    winner: null,
  };
}

/**
 * Parse sets từ DB format (set1_a, set1_b...) thành array
 */
export function parseSets(match: {
  set1_a: number | null; set1_b: number | null;
  set2_a: number | null; set2_b: number | null;
  set3_a: number | null; set3_b: number | null;
  set4_a: number | null; set4_b: number | null;
  set5_a: number | null; set5_b: number | null;
}): Array<{ a: number; b: number }> {
  const sets = [];
  const pairs = [
    [match.set1_a, match.set1_b],
    [match.set2_a, match.set2_b],
    [match.set3_a, match.set3_b],
    [match.set4_a, match.set4_b],
    [match.set5_a, match.set5_b],
  ];
  for (const [a, b] of pairs) {
    if (a !== null && b !== null) sets.push({ a, b });
  }
  return sets;
}
