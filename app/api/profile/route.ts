import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  const profile = await db.getProfile(userId);
  return Response.json({ profile });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    targetCalories?: unknown;
    targetProteinG?: unknown;
    goalWeightKg?: unknown;
    dietaryPreferences?: unknown;
    timezone?: unknown;
  };

  const targetCalories = Number(body.targetCalories);
  const targetProteinG = Number(body.targetProteinG);
  if (!Number.isFinite(targetCalories) || targetCalories <= 0 || !Number.isFinite(targetProteinG) || targetProteinG <= 0) {
    return Response.json({ error: "targets must be positive numbers" }, { status: 400 });
  }

  const goalRaw = Number(body.goalWeightKg);
  const userId = await getUserId();
  const profile = await db.upsertProfile({
    userId,
    targetCalories: Math.round(targetCalories),
    targetProteinG: Math.round(targetProteinG),
    goalWeightKg: Number.isFinite(goalRaw) && goalRaw > 0 ? goalRaw : undefined,
    dietaryPreferences:
      typeof body.dietaryPreferences === "string" && body.dietaryPreferences.trim()
        ? body.dietaryPreferences.trim()
        : undefined,
    timezone:
      typeof body.timezone === "string" && body.timezone.trim()
        ? body.timezone.trim()
        : undefined,
    updatedAt: new Date().toISOString(),
  });
  return Response.json({ profile });
}
