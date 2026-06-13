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
  "You estimate nutrition from a meal. Return JSON only. " +
  "If uncertain, lower the confidence — never claim medical certainty.";

const IMAGE_PROMPT =
  "Identify the foods in this photo and estimate the total calories, protein, " +
  "carbs, and fat for the whole meal. Portion sizes are approximate, so reflect " +
  "that in the confidence level.";

/**
 * Shared estimator. Both the text and image paths build a `content` payload and
 * run it through the same reliability layers:
 *  - JSON-schema-constrained output → Claude returns the exact shape
 *  - local Zod validation → we never trust the response blindly
 *  - model fallback on 429/5xx/529 → degrade the model, not the feature
 *  - typed `ParseResult` → callers must handle the unavailable case
 *  - 4xx (our bug) still throws → caught in dev, not silently masked
 */
async function estimate(
  feature: string,
  content: Anthropic.MessageParam["content"],
  userId: string,
  traceId: string,
): Promise<ParseResult> {
  for (const model of withFallback(MODELS.parse)) {
    const t0 = performance.now();
    try {
      const res = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{ role: "user", content }],
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
 * Parse a free-text meal into validated macros.
 *
 * Pass a `traceId` to correlate this call with the rest of one user interaction;
 * omit it and one is generated. The id is returned so callers can thread it on.
 */
export function parseMeal(
  text: string,
  userId: string,
  traceId: string = newTraceId(),
): Promise<ParseResult> {
  return estimate("meal.parse", text, userId, traceId);
}

/**
 * Estimate macros from a food photo. `imageBase64` is the raw base64 (no data:
 * URL prefix). Uses the same vision-capable parse model and structured output
 * as the text path, so the result shape and reliability guarantees are identical.
 */
export function parseMealImage(
  imageBase64: string,
  mediaType: ImageMediaType,
  userId: string,
  traceId: string = newTraceId(),
): Promise<ParseResult> {
  return estimate(
    "meal.image",
    [
      {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: imageBase64 },
      },
      { type: "text", text: IMAGE_PROMPT },
    ],
    userId,
    traceId,
  );
}
