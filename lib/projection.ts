import type { WeightEntry } from "@/lib/db";

export interface Projection {
  trendKgPerWeek: number | null; // negative = losing weight
  goalDate: string | null; // ISO date (YYYY-MM-DD), or null if not on track
}

/**
 * Linear-regression trend over the user's weigh-ins, and a projected date to
 * reach the goal weight. Returns nulls when there isn't enough data or the
 * trend isn't moving toward the goal (we don't fabricate a date).
 */
export function projectGoalDate(
  weights: WeightEntry[],
  goalWeightKg?: number,
): Projection {
  if (weights.length < 2) return { trendKgPerWeek: null, goalDate: null };

  const pts = [...weights]
    .sort((a, b) => Date.parse(a.loggedAt) - Date.parse(b.loggedAt))
    .map((w) => ({ t: Date.parse(w.loggedAt), y: w.weightKg }));

  const t0 = pts[0].t;
  const xs = pts.map((p) => (p.t - t0) / 86_400_000); // days since first entry
  const ys = pts.map((p) => p.y);
  const n = xs.length;

  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);

  const denom = n * sxx - sx * sx;
  if (denom === 0) return { trendKgPerWeek: null, goalDate: null }; // all same day

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
