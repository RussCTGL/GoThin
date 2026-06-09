import { DEMO_USER_ID } from "@/lib/db";
import { createSupabaseServerClient } from "./server";

/** True when Supabase auth is configured. When false, the app runs in demo mode. */
export function authEnabled(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** The current Supabase user, or null (not signed in / auth disabled). */
export async function getUser() {
  if (!authEnabled()) return null;
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user ?? null;
}

/**
 * The id to scope data by: the signed-in user's id, or the demo user when auth
 * is off. Keeps the data layer multi-user without forcing auth in demo mode.
 */
export async function getUserId(): Promise<string> {
  const user = await getUser();
  return user?.id ?? DEMO_USER_ID;
}
