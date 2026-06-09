import { memoryStore } from "./memory";
import { createSupabaseStore } from "./supabase";
import type { Store } from "./types";

// Auto-select the backend: Supabase when credentials are present, otherwise the
// in-memory store. No code change needed to switch — just set the env vars.
const useSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

export const db: Store = useSupabase ? createSupabaseStore() : memoryStore;

export * from "./types";
