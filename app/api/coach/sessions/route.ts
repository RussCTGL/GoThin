import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  const sessions = await db.listCoachSessions(userId);
  return Response.json({ sessions });
}
