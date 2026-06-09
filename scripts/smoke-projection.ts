// Verifies the goal-date projection math. Run: npx tsx scripts/smoke-projection.ts
import { projectGoalDate } from "../lib/projection";

function entry(daysAgo: number, weightKg: number) {
  return {
    id: String(daysAgo),
    userId: "t",
    weightKg,
    loggedAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  };
}

// Losing ~0.2 kg/day from 110 → 106 over 20 days, goal 100.
const losing = [
  entry(20, 110),
  entry(15, 109),
  entry(10, 108),
  entry(5, 107),
  entry(0, 106),
];
console.log("losing toward goal 100:", projectGoalDate(losing, 100));

// Not enough data.
console.log("single entry:", projectGoalDate([entry(0, 106)], 100));

// Trend going the wrong way (gaining) — no goal date.
const gaining = [entry(10, 100), entry(0, 104)];
console.log("gaining, goal 95:", projectGoalDate(gaining, 95));
