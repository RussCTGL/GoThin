import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  const entries = await db.listWeights(userId);
  return Response.json({ entries });
}

export async function POST(req: Request) {
  const { weightKg } = (await req.json()) as { weightKg?: unknown };
  if (typeof weightKg !== "number" || !Number.isFinite(weightKg) || weightKg <= 0) {
    return Response.json({ error: "invalid weight" }, { status: 400 });
  }
  const userId = await getUserId();
  const entry = await db.addWeight({
    userId,
    weightKg,
    loggedAt: new Date().toISOString(),
  });
  return Response.json({ entry });
}
