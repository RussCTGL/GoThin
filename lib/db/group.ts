import type { CoachMessage, CoachSessionSummary } from "./types";

/**
 * Derive session summaries from a flat list of coach messages: one entry per
 * session_id, titled by its first user message, ordered most-recent-first.
 * Shared by both store implementations so the grouping logic stays consistent.
 */
export function summarizeSessions(
  messages: CoachMessage[],
  limit = 20,
): CoachSessionSummary[] {
  const bySession = new Map<string, CoachMessage[]>();
  for (const m of messages) {
    const arr = bySession.get(m.sessionId) ?? [];
    arr.push(m);
    bySession.set(m.sessionId, arr);
  }

  const summaries: CoachSessionSummary[] = [];
  for (const [sessionId, msgs] of bySession) {
    const sorted = msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const firstUser = sorted.find((m) => m.role === "user");
    summaries.push({
      sessionId,
      title: (firstUser?.content ?? "New conversation").slice(0, 60),
      lastAt: sorted[sorted.length - 1].createdAt,
      messageCount: sorted.length,
    });
  }

  return summaries
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    .slice(0, limit);
}
