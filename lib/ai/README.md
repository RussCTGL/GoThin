# `lib/ai` — Reliable Claude AI layer

Every Claude call in the product goes through this module. Centralizing means
retries, timeouts, model fallback, structured-output validation, and usage
logging are uniform across every feature — not re-implemented per route.

See [`../../efficiency_learnings.md`](../../efficiency_learnings.md) for the cost
and efficiency rationale behind the design.

## Files

| File          | Responsibility                                                        |
|---------------|-----------------------------------------------------------------------|
| `client.ts`   | Shared `Anthropic` client, model routing table, fallback chain        |
| `schemas.ts`  | Zod output schema (`MealEstimate`) + `CoachContext` input type        |
| `usage.ts`    | `recordUsage` / `estimateCostUsd` / `newTraceId` — logs cost + latency per call, keyed by correlation id |
| `parseMeal.ts`| Structured meal parsing with fallback + graceful degradation          |
| `coach.ts`    | Streaming coach reply (prompt-cached persona)                         |
| `index.ts`    | Barrel export                                                         |

## Reliability model

1. **Structured outputs** — `parseMeal` constrains Claude to the `MealEstimate`
   schema, so callers get a validated object, never an unparsed string.
2. **Retries + timeout** — the SDK auto-retries 408/409/429/5xx; we raise
   `maxRetries` to 4 and cap non-streaming calls at 30s.
3. **Model fallback** — on `529`/5xx, `withFallback` degrades the model
   (Sonnet → Haiku) instead of failing the request.
4. **Graceful degradation** — `parseMeal` returns a typed
   `{ ok: false, reason }` so the UI can fall back to manual entry.
5. **Loud on real bugs** — 4xx/auth errors still throw; they're our mistakes.
6. **Usage logging** — `recordUsage` runs on every call (swap the body for a
   Supabase insert when the DB is wired).

## Setup

```bash
npm install
cp .env.example .env        # add your ANTHROPIC_API_KEY
```

## Usage

### Meal parsing (any server context)

```ts
import { parseMeal } from "@/lib/ai";

const result = await parseMeal("Breakfast: sausage egg McMuffin, hash brown, black coffee");
if (result.ok) {
  // result.estimate: { items, calories, protein_g, carbs_g, fat_g, confidence }
} else {
  // result.reason === "refused" | "unavailable" → show manual-entry UI
}
```

### Coach chat — Next.js App Router route handler

`app/api/coach/chat/route.ts`:

```ts
import { coachReply } from "@/lib/ai";
import { newTraceId, recordUsage } from "@/lib/ai/usage";

export async function POST(req: Request) {
  const { context, history, message } = await req.json();
  const ai = coachReply(context, history ?? [], message);

  const traceId = newTraceId();
  const t0 = performance.now();
  let ttftMs: number | undefined;

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      ai.on("text", (delta) => {
        if (ttftMs === undefined) ttftMs = Math.round(performance.now() - t0);
        controller.enqueue(encoder.encode(delta));
      });
      try {
        const final = await ai.finalMessage();
        recordUsage("coach.chat", final.model, final.usage, {
          traceId,
          latencyMs: Math.round(performance.now() - t0),
          ttftMs,
        });
      } catch {
        controller.enqueue(
          encoder.encode("\n\n[Coach is unavailable right now — try again in a moment.]"),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "x-trace-id": traceId },
  });
}
```

The browser reads the response as a stream of text deltas. A full trace —
cost, tokens, cache hits, total latency, and time-to-first-token — is logged
from `finalMessage()` after the stream ends, keyed by `traceId` (also returned
in the `x-trace-id` header for client-side correlation).

## Notes

- Model IDs are exact: `claude-haiku-4-5`, `claude-sonnet-4-6` — no date suffixes.
- This is the **AI layer only**, framework-agnostic. The Next.js app, DB, and
  auth are scaffolded separately (Week 1 of the roadmap).
- After `npm install`, pin `@anthropic-ai/sdk` to the resolved version in
  `package.json` for reproducibility.
