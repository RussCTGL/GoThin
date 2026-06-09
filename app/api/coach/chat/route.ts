import type Anthropic from "@anthropic-ai/sdk";
import { coachReply } from "@/lib/ai/coach";
import { newTraceId, recordUsage } from "@/lib/ai/usage";
import { buildCoachContext } from "@/lib/coach-context";
import { getUserId } from "@/lib/auth/user";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { sessionId, message } = (await req.json()) as {
    sessionId?: string;
    message?: string;
  };
  if (!sessionId || !message?.trim()) {
    return Response.json({ error: "sessionId and message required" }, { status: 400 });
  }

  const userId = await getUserId();

  // Prior turns in this conversation become the model's history.
  const prior = await db.listCoachMessages(userId, sessionId);
  const history: Anthropic.MessageParam[] = prior.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Persist the new user message, then build live context for this turn.
  await db.addCoachMessage({
    userId,
    sessionId,
    role: "user",
    content: message,
    createdAt: new Date().toISOString(),
  });
  const context = await buildCoachContext(userId);

  const ai = coachReply(context, history, message);

  const traceId = newTraceId();
  const t0 = performance.now();
  let ttftMs: number | undefined;
  let assistantText = "";

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      ai.on("text", (delta) => {
        if (ttftMs === undefined) ttftMs = Math.round(performance.now() - t0);
        assistantText += delta;
        controller.enqueue(encoder.encode(delta));
      });
      try {
        const final = await ai.finalMessage();
        recordUsage("coach.chat", final.model, final.usage, {
          userId,
          traceId,
          latencyMs: Math.round(performance.now() - t0),
          ttftMs,
        });
        await db.addCoachMessage({
          userId,
          sessionId,
          role: "assistant",
          content: assistantText,
          createdAt: new Date().toISOString(),
        });
      } catch {
        controller.enqueue(
          encoder.encode(
            "\n\n[Coach is unavailable right now — try again in a moment.]",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-trace-id": traceId,
    },
  });
}
