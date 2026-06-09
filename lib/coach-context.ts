import { db } from "@/lib/db";
import type { CoachContext } from "@/lib/ai/schemas";

// Used when the user hasn't set up a profile yet.
const DEFAULT_TARGET_CALORIES = 2000;
const DEFAULT_TARGET_PROTEIN = 150;
const DAY = 86_400_000;

/**
 * The calendar day (YYYY-MM-DD) of an instant in a given IANA timezone. Two
 * instants are "the same day" for the user iff their day-keys match — which is
 * how we decide whether a meal counts toward "today" in the user's timezone,
 * not the server's. Falls back to the server's timezone if `timeZone` is bad.
 */
function dayKey(when: string | Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(when));
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(when));
  }
}

/**
 * Assemble the coach's real context for a user from the database: their
 * targets (profile or defaults), what they've eaten today (summed meals), and
 * their weight trend. This replaces the old hard-coded DEMO_CONTEXT.
 */
export async function buildCoachContext(userId: string): Promise<CoachContext> {
  const [profile, meals, weights] = await Promise.all([
    db.getProfile(userId),
    db.listMeals(userId, 100),
    db.listWeights(userId),
  ]);

  // "Today" is the user's calendar day in their own timezone (falls back to the
  // server's timezone if the profile has none yet).
  const tz =
    profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const todayKey = dayKey(new Date(), tz);
  const todays = meals.filter((m) => dayKey(m.eatenAt, tz) === todayKey);
  const caloriesToday = Math.round(todays.reduce((s, m) => s + m.calories, 0));
  const proteinToday = Math.round(todays.reduce((s, m) => s + m.proteinG, 0));

  const last7 = weights.filter((w) => Date.now() - Date.parse(w.loggedAt) <= 7 * DAY);
  const weeklyAvgWeightKg = last7.length
    ? Number((last7.reduce((s, w) => s + w.weightKg, 0) / last7.length).toFixed(1))
    : weights[0]?.weightKg;

  return {
    targetCalories: profile?.targetCalories ?? DEFAULT_TARGET_CALORIES,
    targetProtein: profile?.targetProteinG ?? DEFAULT_TARGET_PROTEIN,
    caloriesToday,
    proteinToday,
    weeklyAvgWeightKg,
    goalWeightKg: profile?.goalWeightKg,
    dietaryPreferences: profile?.dietaryPreferences,
  };
}
