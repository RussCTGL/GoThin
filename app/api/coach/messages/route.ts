import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }
  const userId = await getUserId();
  const messages = await db.listCoachMessages(userId, sessionId);
  return Response.json({ messages });
}
