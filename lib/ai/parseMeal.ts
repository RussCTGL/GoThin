import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { anthropic, MODELS, withFallback } from "./client";
import { MealEstimate, MEAL_JSON_SCHEMA } from "./schemas";
import { newTraceId, recordUsage } from "./usage";

/**
 * Result type forces callers to handle the "AI couldn't answer" path. The
 * product keeps working (manual entry) instead of crashing or blocking the
 * user — per the layout doc's key principle, the app never blocks the user.
 */
export type ParseResult =
  | { ok: true; estimate: MealEstimate; traceId: string }
  | { ok: false; reason: "refused" | "unavailable"; traceId: string };

/** Image formats the vision model accepts. */
export type ImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

const SYSTEM =
  "You are a careful nutrition estimator. Identify each food in the meal, " +
  "estimate each item's portion and macros separately, then sum them for the " +
  "totals. Prefer realistic numbers over round ones, and account for cooking " +
  "oils, sauces, and dressings — they're easy to miss. Return JSON only. If a " +
  "portion or identity is uncertain, lower the confidence; never claim medical " +
  "certainty.";

const IMAGE_PROMPT =
  "Estimate the nutrition of this meal from the photo. List every distinct food " +
  "and drink you can see. For each one, judge the portion size using visual " +
  "reference cues — plate/bowl/utensil size, packaging, or a hand — then give " +
  "its calories, protein, carbs, and fat. Sum the items for the totals.";

// Adaptive thinking and structured outputs are only worth enabling on the
// stronger models; Haiku doesn't support adaptive thinking.
function supportsThinking(model: string) {
  return model.startsWith("claude-sonnet") || model.startsWith("claude-opus");
}

/**
 * Shared estimator. Both the text and image paths build a `content` payload and
 * run it through the same reliability layers:
 *  - JSON-schema-constrained output → Claude returns the exact shape
 *  - local Zod validation → we never trust the response blindly
 *  - model fallback on 429/5xx/529 → degrade the model, not the feature
 *  - typed `ParseResult` → callers must handle the unavailable case
 *  - 4xx (our bug) still throws → caught in dev, not silently masked
 *
 * `think` turns on adaptive thinking on capable models — meaningfully better
 * portion reasoning for photos, at some extra latency/cost.
 */
async function estimate(
  feature: string,
  primaryModel: string,
  content: Anthropic.MessageParam["content"],
  userId: string,
  traceId: string,
  think: boolean,
): Promise<ParseResult> {
  for (const model of withFallback(primaryModel)) {
    const t0 = performance.now();
    const thinking = think && supportsThinking(model);
    try {
      const res = await anthropic.messages.create({
        model,
        // Leave headroom for thinking tokens + the itemized JSON.
        max_tokens: thinking ? 2560 : 1024,
        system: SYSTEM,
        messages: [{ role: "user", content }],
        ...(thinking ? { thinking: { type: "adaptive" as const } } : {}),
        output_config: {
          format: { type: "json_schema", schema: MEAL_JSON_SCHEMA },
        },
      });

      recordUsage(feature, model, res.usage, {
        userId,
        traceId,
        latencyMs: Math.round(performance.now() - t0),
      });

      if (res.stop_reason === "refusal")
        return { ok: false, reason: "refused", traceId };

      const block = res.content.find((b) => b.type === "text");
      if (!block || block.type !== "text") continue; // e.g. max_tokens, no text

      let data: unknown;
      try {
        data = JSON.parse(block.text);
      } catch {
        continue; // malformed JSON → try the next model
      }

      const parsed = MealEstimate.safeParse(data);
      if (parsed.success) return { ok: true, estimate: parsed.data, traceId };
      // schema validation failed → try the next model
    } catch (err) {
      // Overloaded (529), server error (5xx), or rate limit (429) → fall
      // through to the next model. Everything else (4xx / auth) is a real bug.
      if (err instanceof APIError && (err.status === 429 || err.status >= 500)) {
        continue;
      }
      throw err;
    }
  }
  return { ok: false, reason: "unavailable", traceId };
}

/**
 * Parse a free-text meal into validated macros. Text is easy, so this stays on
 * the cheap/fast model with no thinking.
 */
export function parseMeal(
  text: string,
  userId: string,
  traceId: string = newTraceId(),
): Promise<ParseResult> {
  return estimate("meal.parse", MODELS.parse, text, userId, traceId, false);
}

/**
 * Estimate macros from a food photo. Uses the stronger vision model with an
 * itemized, portion-aware prompt for accuracy. Adaptive thinking is left OFF
 * here: on Sonnet it pushed photo analysis to ~60s (well past a usable logging
 * UX), and the model + itemization + prompt already lift accuracy a lot without
 * it. (Flip the last arg to re-enable thinking if latency stops mattering.)
 */
export function parseMealImage(
  imageBase64: string,
  mediaType: ImageMediaType,
  userId: string,
  traceId: string = newTraceId(),
): Promise<ParseResult> {
  return estimate(
    "meal.image",
    MODELS.vision,
    [
      {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: imageBase64 },
      },
      { type: "text", text: IMAGE_PROMPT },
    ],
    userId,
    traceId,
    false,
  );
}
