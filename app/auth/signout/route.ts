import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { authEnabled } from "@/lib/auth/user";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (authEnabled()) {
    const sb = await createSupabaseServerClient();
    await sb.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
