// Single demo user until auth lands. Everything is scoped to this id so the
// data model is already multi-user; wiring real auth later just swaps the id.
export const DEMO_USER_ID = "demo-user";

export interface WeightEntry {
  id: string;
  userId: string;
  weightKg: number;
  loggedAt: string; // ISO 8601
}

export interface Meal {
  id: string;
  userId: string;
  rawInput: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: string;
  eatenAt: string; // ISO 8601
}

export interface Profile {
  userId: string;
  targetCalories: number;
  targetProteinG: number;
  goalWeightKg?: number;
  dietaryPreferences?: string;
  timezone?: string; // IANA tz, e.g. "America/Los_Angeles" — defines the user's day
  updatedAt: string; // ISO 8601
}

export type CoachRole = "user" | "assistant";

export interface CoachMessage {
  id: string;
  userId: string;
  sessionId: string;
  role: CoachRole;
  content: string;
  createdAt: string; // ISO 8601
}

export interface CoachSessionSummary {
  sessionId: string;
  title: string;
  lastAt: string;
  messageCount: number;
}

export interface UsageRow {
  id: string;
  userId: string;
  feature: string;
  model: string;
  traceId: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  latencyMs: number;
  ttftMs?: number;
  costUsd: number;
  at: string; // ISO 8601
}

/**
 * Storage interface. Two implementations: an in-memory store (default, for
 * local dev / demo) and a Supabase store (used automatically when SUPABASE
 * env vars are set). Routes and pages depend only on this.
 */
export interface Store {
  addWeight(e: Omit<WeightEntry, "id">): Promise<WeightEntry>;
  listWeights(userId: string): Promise<WeightEntry[]>; // newest first

  addMeal(m: Omit<Meal, "id">): Promise<Meal>;
  listMeals(userId: string, limit?: number): Promise<Meal[]>; // newest first

  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(p: Profile): Promise<Profile>;

  addCoachMessage(m: Omit<CoachMessage, "id">): Promise<CoachMessage>;
  listCoachMessages(userId: string, sessionId: string): Promise<CoachMessage[]>; // oldest first
  listCoachSessions(userId: string, limit?: number): Promise<CoachSessionSummary[]>; // newest first

  addUsage(u: Omit<UsageRow, "id">): Promise<void>;
  listUsage(userId: string, limit?: number): Promise<UsageRow[]>; // newest first
  listAllUsage(limit?: number): Promise<UsageRow[]>; // newest first, all users (admin)
}
