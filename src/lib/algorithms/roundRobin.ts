// ═══════════════════════════════════════════
// Round Robin Schedule Generator (Circle Method)
// ═══════════════════════════════════════════

export interface RoundRobinRound {
  roundNumber: number;
  matches: Array<{ teamA: string; teamB: string }>;
}

/**
 * Tạo lịch round robin bằng Circle Method
 * - N đội → N-1 vòng (nếu N chẵn), N vòng (nếu N lẻ — thêm BYE)
 * - Mỗi vòng mỗi đội chơi 1 lần
 */
export function generateRoundRobinSchedule(teamIds: string[]): RoundRobinRound[] {
  const teams = [...teamIds];
  let hasBye = false;

  // Nếu số đội lẻ → thêm BYE
  if (teams.length % 2 !== 0) {
    teams.push('BYE');
    hasBye = true;
  }

  const n = teams.length;
  const numRounds = n - 1;
  const rounds: RoundRobinRound[] = [];

  // Circle method: pin đội đầu, xoay các đội còn lại
  const rotation = [...teams];

  for (let round = 0; round < numRounds; round++) {
    const matches: Array<{ teamA: string; teamB: string }> = [];

    for (let i = 0; i < n / 2; i++) {
      const teamA = rotation[i];
      const teamB = rotation[n - 1 - i];

      // Bỏ qua cặp có BYE
      if (teamA !== 'BYE' && teamB !== 'BYE') {
        matches.push({ teamA, teamB });
      }
    }

    rounds.push({ roundNumber: round + 1, matches });

    // Xoay: giữ rotation[0] cố định, xoay phần còn lại
    const last = rotation.pop()!;
    rotation.splice(1, 0, last);
  }

  return rounds;
}

/**
 * Double Round Robin: mỗi cặp gặp nhau 2 lần (đổi sân)
 */
export function generateDoubleRoundRobin(teamIds: string[]): RoundRobinRound[] {
  const firstLeg = generateRoundRobinSchedule(teamIds);
  const secondLeg = firstLeg.map((round, idx) => ({
    roundNumber: firstLeg.length + idx + 1,
    matches: round.matches.map(m => ({ teamA: m.teamB, teamB: m.teamA })), // đổi sân
  }));
  return [...firstLeg, ...secondLeg];
}

/**
 * Kiểm tra xem tất cả đội đã gặp nhau chưa
 */
export function getAllMatchups(rounds: RoundRobinRound[]): Set<string> {
  const matchups = new Set<string>();
  for (const round of rounds) {
    for (const match of round.matches) {
      const key = [match.teamA, match.teamB].sort().join('--');
      matchups.add(key);
    }
  }
  return matchups;
}
