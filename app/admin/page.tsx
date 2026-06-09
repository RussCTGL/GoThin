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
      <h1>Admin · all usage</h1>
      <p className="muted">System-wide AI usage across every account.</p>

      <div className="stats">
        <div className="stat">
          <div className="v">${totalCost.toFixed(4)}</div>
          <div className="k">total spend (last 500)</div>
        </div>
        <div className="stat">
          <div className="v">{usage.length}</div>
          <div className="k">calls</div>
        </div>
        <div className="stat">
          <div className="v">{byUser.size}</div>
          <div className="k">users</div>
        </div>
      </div>

      <h2 className="section-title">By user</h2>
      <div className="panel">
        {users.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No usage yet.</p>
        ) : (
          <ul className="log">
            {users.map(([uid, e]) => (
              <li key={uid}>
                <span style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                  {uid}
                </span>
                <span className="muted">
                  {e.count} calls · ${e.cost.toFixed(4)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="section-title">Recent calls</h2>
      <div className="panel">
        <ul className="log">
          {usage.slice(0, 50).map((u) => (
            <li key={u.id}>
              <span>
                {u.feature}{" "}
                <span className="badge">{u.model.replace("claude-", "")}</span>
              </span>
              <span className="muted">
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
