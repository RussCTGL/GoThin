import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODELS } from "./client";
import type { CoachContext } from "./schemas";

/**
 * Coach persona — the start of the cached prefix.
 */
const COACH_SYSTEM =
  "You are an AI fitness coach. Use the user's calorie and protein targets, " +
  "today's intake, and weight trend to give direct, supportive advice. " +
  "Focus on consistency, not perfection. Never shame the user. " +
  "Avoid medical diagnosis. Keep replies under 150 words.";

function contextBlock(ctx: CoachContext): string {
  const lines = [
    `Calorie target: ${ctx.targetCalories} kcal (eaten today: ${ctx.caloriesToday})`,
    `Protein target: ${ctx.targetProtein} g (eaten today: ${ctx.proteinToday})`,
  ];
  if (ctx.weeklyAvgWeightKg != null)
    lines.push(`7-day avg weight: ${ctx.weeklyAvgWeightKg} kg`);
  if (ctx.goalWeightKg != null) lines.push(`Goal weight: ${ctx.goalWeightKg} kg`);
  if (ctx.dietaryPreferences)
    lines.push(`Dietary preferences: ${ctx.dietaryPreferences}`);
  return `User's current status:\n${lines.join("\n")}`;
}

/**
 * Streaming coach reply with prompt caching for multi-turn conversations.
 *
 * Caching strategy (see efficiency_learnings.md §2.2):
 *  - The STABLE prefix is `system` + the raw prior turns (`history`). We put one
 *    cache breakpoint on the LAST history message, so on every later turn the
 *    re-sent conversation is billed at ~0.1x instead of full price.
 *  - The VOLATILE part — the fresh context snapshot + the new user message —
 *    goes AFTER the breakpoint, so a changing context never invalidates the
 *    cached history.
 *
 * `history` must be the raw stored turns (no context injected) so the prefix is
 * byte-identical across requests. Caching engages once the prefix exceeds
 * Sonnet's ~2048-token minimum (a handful of turns in); shorter chats simply
 * run uncached, which is already cheap.
 */
export function coachReply(
  ctx: CoachContext,
  history: Anthropic.MessageParam[],
  userMessage: string,
) {
  const cachedHistory: Anthropic.MessageParam[] = history.map((m, i) =>
    i === history.length - 1 && typeof m.content === "string"
      ? {
          role: m.role,
          content: [
            {
              type: "text",
              text: m.content,
              cache_control: { type: "ephemeral" },
            },
          ],
        }
      : m,
  );

  return anthropic.messages.stream({
    model: MODELS.coach,
    max_tokens: 1024,
    system: COACH_SYSTEM,
    messages: [
      ...cachedHistory,
      { role: "user", content: `${contextBlock(ctx)}\n\n${userMessage}` },
    ],
  });
}
