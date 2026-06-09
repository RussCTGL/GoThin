import { createClient } from "@supabase/supabase-js";
import { summarizeSessions } from "./group";
import type { CoachMessage, CoachRole, Meal, Profile, Store } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCoachMessage(d: any): CoachMessage {
  return {
    id: d.id,
    userId: d.user_id,
    sessionId: d.session_id,
    role: d.role as CoachRole,
    content: d.content,
    createdAt: d.created_at,
  };
}

function mapMeal(d: any): Meal {
  return {
    id: d.id,
    userId: d.user_id,
    rawInput: d.raw_input ?? "",
    calories: d.calories,
    proteinG: Number(d.protein_g),
    carbsG: Number(d.carbs_g),
    fatG: Number(d.fat_g),
    confidence: d.confidence ?? "",
    eatenAt: d.eaten_at,
  };
}

function mapProfile(d: any): Profile {
  return {
    userId: d.user_id,
    targetCalories: d.target_calories,
    targetProteinG: d.target_protein_g,
    goalWeightKg: d.goal_weight_kg != null ? Number(d.goal_weight_kg) : undefined,
    dietaryPreferences: d.dietary_preferences ?? undefined,
    timezone: d.timezone ?? undefined,
    updatedAt: d.updated_at,
  };
}

/**
 * Supabase-backed store. Constructed only when the SUPABASE env vars are
 * present (see ./index.ts). Uses the service-role key, so this must only ever
 * run server-side. Schema: supabase/schema.sql.
 */
export function createSupabaseStore(): Store {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb = createClient(url, key, { auth: { persistSession: false } });

  return {
    async addWeight(e) {
      const { data, error } = await sb
        .from("weight_entries")
        .insert({ user_id: e.userId, weight_kg: e.weightKg, logged_at: e.loggedAt })
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        userId: data.user_id,
        weightKg: Number(data.weight_kg),
        loggedAt: data.logged_at,
      };
    },

    async listWeights(userId) {
      const { data, error } = await sb
        .from("weight_entries")
        .select("*")
        .eq("user_id", userId)
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((d) => ({
        id: d.id,
        userId: d.user_id,
        weightKg: Number(d.weight_kg),
        loggedAt: d.logged_at,
      }));
    },

    async addMeal(m) {
      const { data, error } = await sb
        .from("meals")
        .insert({
          user_id: m.userId,
          raw_input: m.rawInput,
          calories: m.calories,
          protein_g: m.proteinG,
          carbs_g: m.carbsG,
          fat_g: m.fatG,
          confidence: m.confidence,
          eaten_at: m.eatenAt,
        })
        .select()
        .single();
      if (error) throw error;
      return mapMeal(data);
    },

    async listMeals(userId, limit = 100) {
      const { data, error } = await sb
        .from("meals")
        .select("*")
        .eq("user_id", userId)
        .order("eaten_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(mapMeal);
    },

    async getProfile(userId) {
      const { data, error } = await sb
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapProfile(data) : null;
    },

    async upsertProfile(p) {
      const { data, error } = await sb
        .from("profiles")
        .upsert(
          {
            user_id: p.userId,
            target_calories: p.targetCalories,
            target_protein_g: p.targetProteinG,
            goal_weight_kg: p.goalWeightKg ?? null,
            dietary_preferences: p.dietaryPreferences ?? null,
            timezone: p.timezone ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return mapProfile(data);
    },

    async addCoachMessage(m) {
      const { data, error } = await sb
        .from("coach_messages")
        .insert({
          user_id: m.userId,
          session_id: m.sessionId,
          role: m.role,
          content: m.content,
          created_at: m.createdAt,
        })
        .select()
        .single();
      if (error) throw error;
      return mapCoachMessage(data);
    },

    async listCoachMessages(userId, sessionId) {
      const { data, error } = await sb
        .from("coach_messages")
        .select("*")
        .eq("user_id", userId)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapCoachMessage);
    },

    async listCoachSessions(userId, limit = 20) {
      // Pull recent messages and group them client-side into session summaries.
      const { data, error } = await sb
        .from("coach_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return summarizeSessions((data ?? []).map(mapCoachMessage), limit);
    },

    async addUsage(u) {
      const { error } = await sb.from("ai_usage").insert({
        feature: u.feature,
        model: u.model,
        trace_id: u.traceId,
        input_tokens: u.inputTokens,
        output_tokens: u.outputTokens,
        cache_read_tokens: u.cacheReadTokens,
        cache_write_tokens: u.cacheWriteTokens,
        latency_ms: u.latencyMs,
        ttft_ms: u.ttftMs ?? null,
        cost_usd: u.costUsd,
        at: u.at,
      });
      if (error) throw error;
    },

    async listUsage(limit = 50) {
      const { data, error } = await sb
        .from("ai_usage")
        .select("*")
        .order("at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((d) => ({
        id: d.id,
        feature: d.feature,
        model: d.model,
        traceId: d.trace_id,
        inputTokens: d.input_tokens,
        outputTokens: d.output_tokens,
        cacheReadTokens: d.cache_read_tokens,
        cacheWriteTokens: d.cache_write_tokens,
        latencyMs: d.latency_ms,
        ttftMs: d.ttft_ms ?? undefined,
        costUsd: Number(d.cost_usd),
        at: d.at,
      }));
    },
  };
}
