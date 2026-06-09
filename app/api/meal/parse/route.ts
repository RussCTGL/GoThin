import { parseMeal } from "@/lib/ai/parseMeal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: unknown };
  if (typeof text !== "string" || !text.trim()) {
    return Response.json(
      { ok: false, reason: "unavailable" as const },
      { status: 400 },
    );
  }
  const result = await parseMeal(text);
  return Response.json(result);
}
