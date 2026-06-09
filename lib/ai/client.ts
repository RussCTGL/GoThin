import Anthropic from "@anthropic-ai/sdk";

/**
 * One shared Claude client for the whole app. Every AI call goes through this
 * module — never construct a second client or call the SDK directly from a
 * route. Centralizing here is what makes retries, timeouts, fallback, and usage
 * logging uniform across every feature.
 *
 * The SDK already retries 408/409/429/5xx with exponential backoff; we just
 * raise the count and set a hard timeout so a hung request can't wedge a route.
 */
export const anthropic = new Anthropic({
  maxRetries: 4,
  timeout: 30_000, // 30s ceiling for non-streaming calls
});

/**
 * Task → model routing. This is the core efficiency lever (see
 * efficiency_learnings.md): cheap Haiku for high-volume structured parsing,
 * Sonnet for work that needs judgement and tone.
 *
 * Use these exact IDs — no date suffixes.
 */
export const MODELS = {
  parse: "claude-haiku-4-5", // meal text parsing, classification
  coach: "claude-sonnet-4-6", // daily coaching, coach chat
} as const;

/**
 * Fallback chain used when the primary model is overloaded (HTTP 529) or hits a
 * 5xx. Degrade the model rather than failing the feature.
 */
const FALLBACKS: Record<string, string> = {
  "claude-sonnet-4-6": "claude-haiku-4-5",
  "claude-haiku-4-5": "claude-haiku-4-5", // terminal — no further fallback
};

/** Returns [primary, ...fallbacks] with duplicates removed. */
export function withFallback(model: string): string[] {
  return [model, FALLBACKS[model]].filter((m, i, a) => m && a.indexOf(m) === i);
}
