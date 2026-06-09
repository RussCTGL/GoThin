// Smoke test for the streaming coach path. Loads .env, streams one real coach
// reply, prints it live, and logs a full trace (cost + latency + TTFT).
// Run with: npm run smoke:coach
import "dotenv/config";
import { coachReply } from "../lib/ai/coach";
import { newTraceId, recordUsage } from "../lib/ai/usage";
import type { CoachContext } from "../lib/ai/schemas";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Add it to .env first.");
  process.exit(1);
}

const ctx: CoachContext = {
  targetCalories: 2150,
  targetProtein: 160,
  caloriesToday: 1800,
  proteinToday: 110,
  weeklyAvgWeightKg: 107.4,
  goalWeightKg: 100,
};

const question = "Can I eat Korean BBQ tonight and still stay on track?";
console.log("Q:", question, "\n");
process.stdout.write("Coach: ");

const traceId = newTraceId();
const t0 = performance.now();
let ttftMs: number | undefined;

const stream = coachReply(ctx, [], question);
stream.on("text", (delta) => {
  if (ttftMs === undefined) ttftMs = Math.round(performance.now() - t0);
  process.stdout.write(delta);
});

const final = await stream.finalMessage();
recordUsage("coach.chat", final.model, final.usage, {
  userId: "smoke-user",
  traceId,
  latencyMs: Math.round(performance.now() - t0),
  ttftMs,
});

console.log("\n\n✅ Coach streaming path works end-to-end.");
