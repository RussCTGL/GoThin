import { z } from "zod";

/**
 * Output schema for meal parsing. Passed to `messages.parse` so Claude is
 * constrained to return exactly this shape — we get a validated object, not a
 * string we have to hope is JSON. This is the single biggest reliability win.
 */
export const MealEstimate = z.object({
  // Per-item breakdown. Estimating each food separately then summing is far
  // more accurate than one lump guess — especially for photos.
  items: z.array(
    z.object({
      name: z.string(),
      calories: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
    }),
  ),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  confidence: z.enum(["low", "medium", "high"]),
});
export type MealEstimate = z.infer<typeof MealEstimate>;

/**
 * The same shape as a raw JSON Schema, passed to `output_config.format` on the
 * API call. We hand-write it (rather than deriving from the Zod schema via an
 * SDK helper) so the API boundary doesn't depend on the installed Zod version.
 * Zod above is used only for local validation of the returned object.
 *
 * `additionalProperties: false` is required for structured outputs.
 */
export const MEAL_JSON_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          calories: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
        },
        required: ["name", "calories", "protein_g", "carbs_g", "fat_g"],
        additionalProperties: false,
      },
    },
    calories: { type: "number" },
    protein_g: { type: "number" },
    carbs_g: { type: "number" },
    fat_g: { type: "number" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: ["items", "calories", "protein_g", "carbs_g", "fat_g", "confidence"],
  additionalProperties: false,
} as const;

/**
 * Per-request user context the coach reasons over. This is *input* typing —
 * it's injected into the message, not produced by the model.
 */
export interface CoachContext {
  targetCalories: number;
  targetProtein: number;
  caloriesToday: number;
  proteinToday: number;
  weeklyAvgWeightKg?: number;
  goalWeightKg?: number;
  dietaryPreferences?: string;
}
