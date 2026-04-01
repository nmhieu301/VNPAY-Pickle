// ═══════════════════════════════════════════
// Auto-Schedule — Court & Time Slot Assignment
// ═══════════════════════════════════════════

export interface ScheduleInput {
  matchId: string;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  priority: number; // lower = higher priority
}

export interface ScheduleSlot {
  matchId: string;
  courtNumber: number;
  startTime: Date;
  endTime: Date;
}

export interface AutoScheduleConfig {
  numCourts: number;
  matchDurationMinutes: number;
  restMinutes: number;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  startDate: string; // "YYYY-MM-DD"
}

function parseTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Auto-schedule matches onto courts
 * Algorithm:
 * 1. Sort matches by priority
 * 2. For each match, find earliest available court slot
 * 3. Check player conflicts (no player in 2 matches at same time + rest time)
 * 4. Assign slot
 */
export function autoScheduleMatches(
  matches: ScheduleInput[],
  config: AutoScheduleConfig
): ScheduleSlot[] {
  const sorted = [...matches].sort((a, b) => a.priority - b.priority);
  const slots: ScheduleSlot[] = [];

  // Track next available time per court
  const courtAvailable: Date[] = Array.from(
    { length: config.numCourts },
    () => parseTime(config.startDate, config.startTime)
  );

  const dayEnd = parseTime(config.startDate, config.endTime);
  const totalMinutes = config.matchDurationMinutes + config.restMinutes;

  for (const match of sorted) {
    let assigned = false;

    // Try each court in order
    for (let court = 0; court < config.numCourts; court++) {
      const proposedStart = courtAvailable[court];

      // Check if within day bounds
      const proposedEnd = addMinutes(proposedStart, config.matchDurationMinutes);
      if (proposedEnd > dayEnd) continue;

      // Check player conflicts (no player already scheduled in overlapping time)
      const allPlayerIds = [...match.teamAPlayerIds, ...match.teamBPlayerIds];
      const hasConflict = slots.some(s => {
        // Find match for this slot
        const slotMatch = sorted.find(m => m.matchId === s.matchId);
        if (!slotMatch) return false;
        const slotPlayers = [...slotMatch.teamAPlayerIds, ...slotMatch.teamBPlayerIds];
        const overlaps = allPlayerIds.some(pid => slotPlayers.includes(pid));
        if (!overlaps) return false;

        // Check time overlap (including rest)
        const slotRestEnd = addMinutes(s.endTime, config.restMinutes);
        const proposedRestEnd = addMinutes(proposedEnd, config.restMinutes);
        return proposedStart < slotRestEnd && s.startTime < proposedRestEnd;
      });

      if (!hasConflict) {
        slots.push({
          matchId: match.matchId,
          courtNumber: court + 1,
          startTime: proposedStart,
          endTime: proposedEnd,
        });
        courtAvailable[court] = addMinutes(proposedEnd, config.restMinutes);
        assigned = true;
        break;
      }
    }

    // If no slot found today, skip (organizer can manually adjust)
    if (!assigned) {
      // Schedule on earliest available court regardless of conflict
      const earliestCourt = courtAvailable.reduce(
        (minIdx, t, idx) => (t < courtAvailable[minIdx] ? idx : minIdx),
        0
      );
      const start = courtAvailable[earliestCourt];
      const end = addMinutes(start, config.matchDurationMinutes);
      slots.push({ matchId: match.matchId, courtNumber: earliestCourt + 1, startTime: start, endTime: end });
      courtAvailable[earliestCourt] = addMinutes(end, config.restMinutes);
    }
  }

  return slots;
}
