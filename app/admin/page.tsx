import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth/user";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // 404 for non-admins — don't reveal the page exists.
  if (!(await isAdmin())) notFound();

  const usage = await db.listAllUsage(500);
  const totalCost = usage.reduce((s, u) => s + u.costUsd, 0);

  const byUser = new Map<string, { count: number; cost: number }>();
  for (const u of usage) {
    const key = u.userId || "(unattributed)";
    const e = byUser.get(key) ?? { count: 0, cost: 0 };
    e.count += 1;
    e.cost += u.costUsd;
    byUser.set(key, e);
  }
  const users = [...byUser.entries()].sort((a, b) => b[1].cost - a[1].cost);

  return (
    <section>
      <h1 className="text-3xl font-bold md:text-4xl">Admin · all usage</h1>
      <p className="mt-1 text-muted">System-wide AI usage across every account.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total spend (last 500)" value={`$${totalCost.toFixed(4)}`} />
        <StatCard label="Calls" value={`${usage.length}`} />
        <StatCard label="Users" value={`${byUser.size}`} />
      </div>

      <h2 className="mb-3 mt-10 font-display text-sm font-semibold uppercase tracking-wider text-muted">
        By user
      </h2>
      <div className="card p-5">
        {users.length === 0 ? (
          <p className="text-sm text-muted">No usage yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {users.map(([uid, e]) => (
              <li key={uid} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="truncate font-mono text-xs text-muted">{uid}</span>
                <span className="whitespace-nowrap text-muted">
                  {e.count} calls · ${e.cost.toFixed(4)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="mb-3 mt-10 font-display text-sm font-semibold uppercase tracking-wider text-muted">
        Recent calls
      </h2>
      <div className="card p-5">
        <ul className="divide-y divide-border">
          {usage.slice(0, 50).map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="flex items-center gap-2">
                {u.feature}
                <span className="badge">{u.model.replace("claude-", "")}</span>
              </span>
              <span className="text-right text-xs text-muted">
                {(u.userId || "(none)").slice(0, 8)} · ${u.costUsd.toFixed(4)} ·{" "}
                {u.latencyMs}ms
                {u.cacheReadTokens > 0 ? ` · cache ${u.cacheReadTokens}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5 text-center">
      <div className="font-display text-3xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
