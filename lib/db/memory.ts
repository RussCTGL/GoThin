import { randomUUID } from "node:crypto";
import { summarizeSessions } from "./group";
import type {
  CoachMessage,
  Meal,
  Profile,
  Store,
  UsageRow,
  WeightEntry,
} from "./types";

// Process-lifetime storage. Persists across requests within one server run,
// resets on restart. Fine for local dev and demos; swap to Supabase for real
// persistence (set the SUPABASE_* env vars).
//
// Pinned on globalThis so every route bundle shares ONE instance — Next.js may
// otherwise give each route its own copy of this module, splitting the state.
const g = globalThis as typeof globalThis & {
  __gothinWeights?: WeightEntry[];
  __gothinMeals?: Meal[];
  __gothinProfiles?: Map<string, Profile>;
  __gothinCoach?: CoachMessage[];
  __gothinUsage?: UsageRow[];
};
const weights: WeightEntry[] = (g.__gothinWeights ??= []);
const meals: Meal[] = (g.__gothinMeals ??= []);
const profiles: Map<string, Profile> = (g.__gothinProfiles ??= new Map());
const coachMessages: CoachMessage[] = (g.__gothinCoach ??= []);
const usage: UsageRow[] = (g.__gothinUsage ??= []);

export const memoryStore: Store = {
  async addWeight(e) {
    const row: WeightEntry = { ...e, id: randomUUID() };
    weights.push(row);
    return row;
  },
  async listWeights(userId) {
    return weights
      .filter((w) => w.userId === userId)
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  },

  async addMeal(m) {
    const row: Meal = { ...m, id: randomUUID() };
    meals.push(row);
    return row;
  },
  async listMeals(userId, limit = 100) {
    return meals
      .filter((m) => m.userId === userId)
      .sort((a, b) => b.eatenAt.localeCompare(a.eatenAt))
      .slice(0, limit);
  },

  async getProfile(userId) {
    return profiles.get(userId) ?? null;
  },
  async upsertProfile(p) {
    profiles.set(p.userId, p);
    return p;
  },

  async addCoachMessage(m) {
    const row: CoachMessage = { ...m, id: randomUUID() };
    coachMessages.push(row);
    return row;
  },
  async listCoachMessages(userId, sessionId) {
    return coachMessages
      .filter((m) => m.userId === userId && m.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  async listCoachSessions(userId, limit = 20) {
    return summarizeSessions(
      coachMessages.filter((m) => m.userId === userId),
      limit,
    );
  },

  async addUsage(u) {
    usage.push({ ...u, id: randomUUID() });
  },
  async listUsage(userId, limit = 50) {
    return [...usage]
      .filter((u) => u.userId === userId)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit);
  },
  async listAllUsage(limit = 200) {
    return [...usage]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit);
  },
};
