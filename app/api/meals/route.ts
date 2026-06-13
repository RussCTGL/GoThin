import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EstimateInput = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: string;
};

export async function POST(req: Request) {
  const { rawInput, estimate } = (await req.json()) as {
    rawInput?: string;
    estimate?: EstimateInput;
  };

  if (
    !estimate ||
    typeof estimate.calories !== "number" ||
    typeof estimate.protein_g !== "number"
  ) {
    return Response.json({ error: "invalid estimate" }, { status: 400 });
  }

  const userId = await getUserId();
  const meal = await db.addMeal({
    userId,
    rawInput: rawInput ?? "",
    calories: Math.round(estimate.calories),
    proteinG: estimate.protein_g,
    carbsG: estimate.carbs_g,
    fatG: estimate.fat_g,
    confidence: estimate.confidence ?? "",
    eatenAt: new Date().toISOString(),
  });
  return Response.json({ meal });
}

/** Undo a just-logged meal: DELETE /api/meals?id=<mealId>. */
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "missing id" }, { status: 400 });

  const userId = await getUserId();
  await db.deleteMeal(userId, id);
  return Response.json({ ok: true });
}
