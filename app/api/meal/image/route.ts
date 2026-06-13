import { parseMealImage, type ImageMediaType } from "@/lib/ai/parseMeal";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: ImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/**
 * Analyze a food photo and log it in one shot — the automated path. The client
 * sends a downsized base64 image; we estimate macros and, when successful,
 * immediately persist the meal so the user never has to press "save". The saved
 * meal is returned so the client can offer an undo.
 */
export async function POST(req: Request) {
  const { imageBase64, mediaType } = (await req.json()) as {
    imageBase64?: unknown;
    mediaType?: unknown;
  };

  if (
    typeof imageBase64 !== "string" ||
    !imageBase64 ||
    typeof mediaType !== "string" ||
    !ALLOWED.includes(mediaType as ImageMediaType)
  ) {
    return Response.json(
      { ok: false, reason: "unavailable" as const },
      { status: 400 },
    );
  }

  const userId = await getUserId();
  const result = await parseMealImage(
    imageBase64,
    mediaType as ImageMediaType,
    userId,
  );

  if (!result.ok) return Response.json(result);

  // Auto-save: the whole point of the photo flow is zero manual steps.
  const { estimate } = result;
  const meal = await db.addMeal({
    userId,
    rawInput: estimate.items.map((i) => i.name).join(", "),
    calories: Math.round(estimate.calories),
    proteinG: estimate.protein_g,
    carbsG: estimate.carbs_g,
    fatG: estimate.fat_g,
    confidence: estimate.confidence,
    eatenAt: new Date().toISOString(),
  });

  return Response.json({ ok: true, estimate, meal });
}
