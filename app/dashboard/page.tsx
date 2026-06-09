import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth/user";
import { buildCoachContext } from "@/lib/coach-context";
import { projectGoalDate } from "@/lib/projection";
import WeightForm from "./weight-form";
import WeightChart from "./weight-chart";
import MidnightRefresher from "./midnight-refresher";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export default async function Dashboard() {
  const userId = await getUserId();
  const [weights, usage, ctx] = await Promise.all([
    db.listWeights(userId),
    db.listUsage(20),
    buildCoachContext(userId),
  ]);

  const latest = weights[0];
  const last7 = weights.filter((w) => Date.now() - Date.parse(w.loggedAt) <= 7 * DAY);
  const avg7 = last7.length
    ? last7.reduce((s, w) => s + w.weightKg, 0) / last7.length
    : null;

  // Trend + goal-date projection from the weigh-ins.
  const { trendKgPerWeek, goalDate } = projectGoalDate(weights, ctx.goalWeightKg);
  // Chart wants oldest → newest.
  const chartData = [...weights]
    .sort((a, b) => Date.parse(a.loggedAt) - Date.parse(b.loggedAt))
    .map((w) => ({
      date: new Date(w.loggedAt).toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
      }),
      weight: w.weightKg,
    }));

  const totalCost = usage.reduce((s, u) => s + u.costUsd, 0);
  const ttfts = usage.filter((u) => u.ttftMs != null).map((u) => u.ttftMs!);
  const avgTtft = ttfts.length
    ? Math.round(ttfts.reduce((s, t) => s + t, 0) / ttfts.length)
    : null;

  return (
    <section>
      <MidnightRefresher />
      <h1>Dashboard</h1>

      <h2 className="section-title">Today</h2>
      <div className="stats">
        <div className="stat">
          <div className="v">
            {ctx.caloriesToday}
            <span className="muted"> / {ctx.targetCalories}</span>
          </div>
          <div className="k">calories</div>
        </div>
        <div className="stat">
          <div className="v">
            {ctx.proteinToday}
            <span className="muted"> / {ctx.targetProtein} g</span>
          </div>
          <div className="k">protein</div>
        </div>
        <div className="stat">
          <div className="v">
            {Math.max(ctx.targetCalories - ctx.caloriesToday, 0)}
          </div>
          <div className="k">kcal left</div>
        </div>
      </div>
      <p className="muted" style={{ marginTop: "0.5rem" }}>
        <a href="/meal">Log a meal</a> · <a href="/profile">Edit targets</a>
      </p>

      <h2 className="section-title">Weight</h2>
      <div className="stats">
        <div className="stat">
          <div className="v">{latest ? `${latest.weightKg} kg` : "—"}</div>
          <div className="k">current</div>
        </div>
        <div className="stat">
          <div className="v">{avg7 != null ? `${avg7.toFixed(1)} kg` : "—"}</div>
          <div className="k">7-day avg</div>
        </div>
        <div className="stat">
          <div className="v">{ctx.goalWeightKg ?? "—"}</div>
          <div className="k">goal</div>
        </div>
      </div>

      <div className="panel">
        <WeightChart data={chartData} goal={ctx.goalWeightKg} />
        <p className="muted" style={{ marginBottom: 0 }}>
          {trendKgPerWeek != null
            ? `Trend: ${trendKgPerWeek > 0 ? "+" : ""}${trendKgPerWeek} kg/week`
            : "Trend: need more weigh-ins"}
          {goalDate ? ` · Estimated goal date: ${goalDate}` : ""}
        </p>
      </div>

      <div className="panel">
        <WeightForm />
        {weights.length > 0 && (
          <ul className="log">
            {weights.slice(0, 8).map((w) => (
              <li key={w.id}>
                <span>{w.weightKg} kg</span>
                <span className="muted">
                  {new Date(w.loggedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="section-title">AI efficiency</h2>
      <div className="stats">
        <div className="stat">
          <div className="v">${totalCost.toFixed(4)}</div>
          <div className="k">spend (last 20)</div>
        </div>
        <div className="stat">
          <div className="v">{avgTtft != null ? `${avgTtft} ms` : "—"}</div>
          <div className="k">avg TTFT</div>
        </div>
        <div className="stat">
          <div className="v">{usage.length}</div>
          <div className="k">calls</div>
        </div>
      </div>

      <div className="panel">
        {usage.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No AI calls yet — try the meal logger or coach.
          </p>
        ) : (
          <ul className="log">
            {usage.map((u) => (
              <li key={u.id}>
                <span>
                  {u.feature}{" "}
                  <span className="badge">{u.model.replace("claude-", "")}</span>
                </span>
                <span className="muted">
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
