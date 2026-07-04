import { SHOT_TYPES, type ShotType } from "@/types/database";

const EPOCH = Date.UTC(2026, 0, 1); // 2026-01-01 UTC, fixed reference point
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ShotSelector = {
  type: ShotType;
  cycleForType: number;
};

// Deterministic, stateless: everyone sees the same Shot on the same UTC
// calendar day. `type` cycles daily through the 8 types; `cycleForType`
// increments each time the rotation loops back to a given type, so the
// caller can pick the next question in that type's bank (mod bank length).
export function getTodaysShotSelector(now: Date = new Date()): ShotSelector {
  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const daysSinceEpoch = Math.floor((todayUTC - EPOCH) / MS_PER_DAY);
  const typeIndex = ((daysSinceEpoch % SHOT_TYPES.length) + SHOT_TYPES.length) % SHOT_TYPES.length;
  const cycleForType = Math.floor(daysSinceEpoch / SHOT_TYPES.length);

  return { type: SHOT_TYPES[typeIndex], cycleForType };
}
