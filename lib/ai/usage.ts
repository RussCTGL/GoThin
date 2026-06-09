import type Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
import { db } from "../db";

/**
 * Normalized trace record for the cost/efficiency dashboard. Logged on EVERY
 * Claude call — this is the central research artifact (see
 * efficiency_learnings.md §2.5). Captures cost, tokens, cache hits, AND latency,
 * all keyed by a correlation id so a whole user interaction can be reassembled.
 */
export interface UsageRecord {
  feature: string;
  model: string;
  traceId: string; // correlation id threading all calls for one interaction
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  latencyMs: number; // total wall-clock for the call
  ttftMs?: number; // time-to-first-token (streaming only)
  at: string;
}

/** New correlation id for one user interaction (parse → coach → summary …). */
export function newTraceId(): string {
  return randomUUID();
}

// Rough $/token, input/output, by model (USD per token). Keep in sync with
// efficiency_learnings.md §1.
const PRICE: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5": { in: 1e-6, out: 5e-6 },
  "claude-sonnet-4-6": { in: 3e-6, out: 15e-6 },
  "claude-opus-4-8": { in: 5e-6, out: 25e-6 },
};

/** Approximate USD cost of a call. Cache reads are billed at ~0.1× input. */
export function estimateCostUsd(rec: UsageRecord): number {
  const p = PRICE[rec.model] ?? { in: 0, out: 0 };
  return (
    rec.inputTokens * p.in +
    rec.cacheReadTokens * p.in * 0.1 +
    rec.cacheWriteTokens * p.in * 1.25 +
    rec.outputTokens * p.out
  );
}

export interface UsageMeta {
  traceId: string;
  latencyMs: number;
  ttftMs?: number;
}

/**
 * Record one call. For now logs to stdout; swap the body for a Supabase insert
 * (e.g. an `ai_usage` table) once the DB is wired.
 */
export function recordUsage(
  feature: string,
  model: string,
  usage: Anthropic.Usage,
  meta: UsageMeta,
): UsageRecord {
  const rec: UsageRecord = {
    feature,
    model,
    traceId: meta.traceId,
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    latencyMs: meta.latencyMs,
    ttftMs: meta.ttftMs,
    at: new Date().toISOString(),
  };
  const costUsd = estimateCostUsd(rec);
  console.log("[ai.usage]", { ...rec, costUsd });
  // Persist for the dashboard. Fire-and-forget so logging never blocks or
  // breaks an AI response if the DB write fails.
  void db
    .addUsage({ ...rec, costUsd })
    .catch((e) => console.error("[ai.usage] persist failed:", e));
  return rec;
}
