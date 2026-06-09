import type { WeightEntry } from "@/lib/db";

export interface Projection {
  trendKgPerWeek: number | null; // negative = losing weight
  goalDate: string | null; // ISO date (YYYY-MM-DD), or null if not on track
}

/**
 * Linear-regression trend over the user's weigh-ins, and a projected date to
 * reach the goal weight.
 *
 * Entries are first collapsed to ONE point per calendar day (their average) so
 * that several weigh-ins minutes apart can't produce an absurd per-day slope
 * (e.g. a 2 kg change over 5 minutes extrapolating to +200 kg/week). A real
 * trend needs at least two distinct days; otherwise we return nulls rather than
 * fabricate one.
 */
export function projectGoalDate(
  weights: WeightEntry[],
  goalWeightKg?: number,
): Projection {
  if (weights.length < 2) return { trendKgPerWeek: null, goalDate: null };

  // Average per calendar day (UTC date key), one point per day.
  const byDay = new Map<string, { sum: number; n: number; t: number }>();
  for (const w of weights) {
    const key = new Date(w.loggedAt).toISOString().slice(0, 10); // YYYY-MM-DD
    const t = Date.parse(`${key}T00:00:00Z`);
    const e = byDay.get(key) ?? { sum: 0, n: 0, t };
    e.sum += w.weightKg;
    e.n += 1;
    byDay.set(key, e);
  }
  const days = [...byDay.values()]
    .map((e) => ({ t: e.t, y: e.sum / e.n }))
    .sort((a, b) => a.t - b.t);

  if (days.length < 2) return { trendKgPerWeek: null, goalDate: null };

  const t0 = days[0].t;
  const xs = days.map((p) => (p.t - t0) / 86_400_000); // whole days, 0,1,2,…
  const ys = days.map((p) => p.y);
  const n = xs.length;

  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);

  const denom = n * sxx - sx * sx;
  if (denom === 0) return { trendKgPerWeek: null, goalDate: null };

  const slope = (n * sxy - sx * sy) / denom; // kg per day
  const intercept = (sy - slope * sx) / n;
  const trendKgPerWeek = Number((slope * 7).toFixed(2));

  let goalDate: string | null = null;
  if (goalWeightKg != null && slope !== 0) {
    const current = ys[n - 1];
    const movingToward =
      (goalWeightKg < current && slope < 0) ||
      (goalWeightKg > current && slope > 0);
    const xGoalDays = (goalWeightKg - intercept) / slope;
    const etaMs = t0 + xGoalDays * 86_400_000;
    if (movingToward && etaMs > Date.now()) {
      goalDate = new Date(etaMs).toISOString().slice(0, 10);
    }
  }

  return { trendKgPerWeek, goalDate };
}
