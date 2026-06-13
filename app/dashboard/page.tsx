import Link from "next/link";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth/user";
import { buildCoachContext } from "@/lib/coach-context";
import { projectGoalDate } from "@/lib/projection";
import WeightForm from "./weight-form";
import WeightChart from "./weight-chart";
import MidnightRefresher from "./midnight-refresher";
import LocalTime from "./local-time";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.min(Math.round((n / d) * 100), 100);
}

export default async function Dashboard() {
  const userId = await getUserId();
  const [weights, usage, ctx] = await Promise.all([
    db.listWeights(userId),
    db.listUsage(userId, 20),
    buildCoachContext(userId),
  ]);

  const latest = weights[0];
  const last7 = weights.filter((w) => Date.now() - Date.parse(w.loggedAt) <= 7 * DAY);
  const avg7 = last7.length
    ? last7.reduce((s, w) => s + w.weightKg, 0) / last7.length
    : null;

  const { trendKgPerWeek, goalDate } = projectGoalDate(weights, ctx.goalWeightKg);
  const chartData = [...weights]
    .sort((a, b) => Date.parse(a.loggedAt) - Date.parse(b.loggedAt))
    .map((w) => ({ iso: w.loggedAt, weight: w.weightKg }));

  const totalCost = usage.reduce((s, u) => s + u.costUsd, 0);
  const ttfts = usage.filter((u) => u.ttftMs != null).map((u) => u.ttftMs!);
  const avgTtft = ttfts.length
    ? Math.round(ttfts.reduce((s, t) => s + t, 0) / ttfts.length)
    : null;

  const calLeft = Math.max(ctx.targetCalories - ctx.caloriesToday, 0);

  return (
    <section>
      <MidnightRefresher />

      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Dashboard</h1>
          <p className="mt-1 text-muted">Here&apos;s where you stand today.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/meal" className="btn btn-primary !px-4 !py-2 text-sm">
            Log a meal
          </Link>
          <Link href="/profile" className="btn btn-ghost !px-4 !py-2 text-sm">
            Edit targets
          </Link>
        </div>
      </div>

      {/* Today */}
      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted">
        Today
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <ProgressCard
          label="Calories"
          value={ctx.caloriesToday}
          target={ctx.targetCalories}
          unit="kcal"
          from="from-lime-400"
          to="to-emerald-500"
        />
        <ProgressCard
          label="Protein"
          value={ctx.proteinToday}
          target={ctx.targetProtein}
          unit="g"
          from="from-cyan-400"
          to="to-emerald-500"
        />
        <div className="card flex flex-col justify-center p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">
            Calories left
          </div>
          <div className="mt-2 gradient-text font-display text-4xl font-extrabold">
            {calLeft}
          </div>
          <div className="mt-1 text-sm text-muted">to hit your target</div>
        </div>
      </div>

      {/* Weight */}
      <h2 className="mb-3 mt-10 font-display text-sm font-semibold uppercase tracking-wider text-muted">
        Weight
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Current" value={latest ? `${latest.weightKg}` : "—"} unit={latest ? "kg" : ""} />
        <StatCard label="7-day avg" value={avg7 != null ? avg7.toFixed(1) : "—"} unit={avg7 != null ? "kg" : ""} />
        <StatCard label="Goal" value={ctx.goalWeightKg != null ? `${ctx.goalWeightKg}` : "—"} unit={ctx.goalWeightKg != null ? "kg" : ""} />
      </div>

      <div className="card mt-4 p-5">
        <WeightChart data={chartData} goal={ctx.goalWeightKg} />
        <p className="mt-3 text-sm text-muted">
          {trendKgPerWeek != null
            ? `Trend: ${trendKgPerWeek > 0 ? "+" : ""}${trendKgPerWeek} kg/week`
            : "Trend: need more weigh-ins"}
          {goalDate ? ` · Estimated goal date: ${goalDate}` : ""}
        </p>
      </div>

      <div className="card mt-4 p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Log a weigh-in</h3>
        <WeightForm />
        {weights.length > 0 && (
          <ul className="mt-4 divide-y divide-border">
            {weights.slice(0, 8).map((w) => (
              <li key={w.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium">{w.weightKg} kg</span>
                <span className="text-muted">
                  <LocalTime iso={w.loggedAt} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* AI efficiency */}
      <h2 className="mb-3 mt-10 font-display text-sm font-semibold uppercase tracking-wider text-muted">
        AI efficiency
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Spend (last 20)" value={`$${totalCost.toFixed(4)}`} />
        <StatCard label="Avg TTFT" value={avgTtft != null ? `${avgTtft}` : "—"} unit={avgTtft != null ? "ms" : ""} />
        <StatCard label="Calls" value={`${usage.length}`} />
      </div>

      <div className="card mt-4 p-5">
        {usage.length === 0 ? (
          <p className="text-sm text-muted">No AI calls yet — try the meal logger or coach.</p>
        ) : (
          <ul className="divide-y divide-border">
            {usage.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  {u.feature}
                  <span className="badge">{u.model.replace("claude-", "")}</span>
                </span>
                <span className="text-right text-xs text-muted">
                  ${u.costUsd.toFixed(4)} · {u.latencyMs}ms
                  {u.ttftMs != null ? ` · ttft ${u.ttftMs}ms` : ""}
                  {u.cacheReadTokens > 0 ? ` · cache ${u.cacheReadTokens}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ProgressCard({
  label,
  value,
  target,
  unit,
  from,
  to,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  from: string;
  to: string;
}) {
  const p = pct(value, target);
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        <span className="text-xs text-muted">{p}%</span>
      </div>
      <div className="mt-2 font-display text-3xl font-extrabold">
        {value}
        <span className="text-lg font-semibold text-muted"> / {target} {unit}</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${from} ${to}`}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="card p-5 text-center">
      <div className="font-display text-3xl font-extrabold">
        {value}
        {unit ? <span className="text-lg font-semibold text-muted"> {unit}</span> : null}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
