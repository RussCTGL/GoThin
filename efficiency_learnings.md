# AI Fitness Coach — Efficiency Learnings & Research Plan

> Companion to [`ai_fitness_coach_layout.md`](./ai_fitness_coach_layout.md).
> This is a **personal/portfolio project**, and a core goal is to demonstrate
> *research and learnings on efficiency* — not just "call an LLM," but measure
> and drive down its cost and latency. The AI layer is the only non-free part of
> the stack, which makes it the natural subject of study.

---

## 1. Cost Landscape

### What's free
Everything except the AI is $0 on free tiers:

- **Supabase** — Postgres + Auth + Storage in one service (free project pauses after ~1 week idle; one click to wake).
- **Alt:** **Neon** (Postgres) + **NextAuth** (auth) + **Cloudflare R2** (photo storage) — all free, fully portable, no auto-pause, more wiring.
- **Vercel** — Next.js frontend hosting (free hobby tier).

### What costs money — the AI (pay-per-token)
No meaningful free tier for production LLM use. Both Claude and OpenAI give a small one-time trial credit, then pay-as-you-go. For a portfolio app the usage is **cents to single-digit dollars**.

**Claude pricing (per 1M tokens):**

| Model            | Input | Output | Role in this app                          |
|------------------|-------|--------|-------------------------------------------|
| Claude Haiku 4.5 | $1    | $5     | Meal text parsing, simple classification  |
| Claude Sonnet 4.6| $3    | $15    | Daily coaching, coach chat                |
| Claude Opus 4.8  | $5    | $25    | Hardest reasoning (rarely needed here)    |

**Caching economics:** cache *reads* cost ~0.1× input price; cache *writes* cost 1.25× (5-min TTL) or 2× (1-hour TTL). Break-even is ~2 requests for the 5-min TTL.

**Batch API:** 50% off standard token prices for non-latency-sensitive work; most batches finish within an hour (max 24h).

---

## 2. Efficiency Experiments (the research artifact)

Each experiment has a **baseline → intervention → measured result** shape. The
measured numbers go straight into the project README's "Efficiency" section.

### 2.1 Model routing
Route by task difficulty instead of using one model for everything.

- **Haiku** → meal text parsing (high volume, structured, easy).
- **Sonnet** → daily coaching + chat (needs judgment/tone).
- **Opus** → reserved; likely unused in MVP.

**Measure:** cost/quality vs. an "everything on Opus" baseline. Expected ~5–10× cost cut on the high-volume parsing path.

### 2.2 Prompt caching
The coach prompt has a **stable prefix** (user profile + calorie/protein targets + recent logs) and a **volatile suffix** (today's new question). Cache the prefix.

- Put `cache_control` at the end of the stable prefix; keep volatile content after it.
- **Measure:** `usage.cache_read_input_tokens` > 0 across repeated requests. If it's zero, a silent invalidator is present (timestamp/UUID in the prefix, unsorted JSON, varying tool set).
- **Headline win** for the chat/coaching path: cached prefix served at ~0.1× input cost.
- **Implemented** in `lib/ai/coach.ts`: multi-turn coach conversations cache the
  stable prefix (`system` + raw prior turns), with the breakpoint on the last
  history message. The volatile per-turn context snapshot + new message sit
  *after* the breakpoint so a changing context never invalidates the cache.
  History is stored raw (no context injected) so the prefix is byte-identical
  across turns. Engages once the prefix exceeds Sonnet's ~2048-token minimum
  (~8+ turns); shorter chats run uncached (already cheap). Visible on the
  dashboard as `cacheRead` climbing on later turns while cost-per-turn stays flat.
- **Measured (2026-06-09), 10-turn conversation:** caching kicked in at turn 6
  (once the prefix passed ~2,048 tokens). Full-price `input_tokens` dropped from
  ~875 (turn 4, uncached) to ~86 from turn 6 on, the growing history served via
  `cacheRead` (1,037 → 2,188). **Cost-per-message held flat at ~$0.0060** instead
  of climbing — the input side cost ~7× less than uncached by turn 10.

### 2.3 Batch API for daily summaries
The daily coach summary is **not** latency-sensitive — it can run overnight.

- Generate all users' daily summaries in one batch job → **50% off**.
- **Measure:** cost of batched nightly run vs. on-demand synchronous calls.
- Story: "I matched the API surface to the workload shape."

### 2.4 Structured outputs (JSON schema)
Constrain the meal-parser's output to a JSON schema so it's always valid and parseable.

- Eliminates reparse/retry waste; guarantees the `{calories, protein_g, carbs_g, fat_g, confidence}` shape.
- **Measure:** retry/parse-failure rate before vs. after.

### 2.5 Token counting + cost dashboard
Log the `usage` block on **every** API call from day one.

- Track cost-per-user-per-day; watch it trend down as 2.1–2.4 are applied.
- Use the token-counting endpoint (not `tiktoken`, which is OpenAI's tokenizer and undercounts Claude) to estimate before sending.
- **This dashboard is the central research deliverable** — the visible proof of the efficiency work.

### 2.6 Vision cost control (food photos)
Food-photo estimation is the most expensive per-call path.

- Downsample images client-side before upload.
- **Measure:** tokens-per-image and cost-per-photo before vs. after.

---

## 3. Recommended Build Decisions

| Decision        | Choice                              | Why                                                        |
|-----------------|-------------------------------------|------------------------------------------------------------|
| Frontend        | Next.js + TS + Tailwind + shadcn/ui | Per the layout doc; good for streaming AI responses        |
| Backend (MVP)   | Next.js API routes                  | Simplest path; no separate service to host                 |
| DB + Auth + Storage | Supabase                        | All-in-one, free, least glue code                          |
| AI provider     | Claude, with **model routing**      | Strong JSON/instruction following; routing is the cost lever|
| Observability   | Usage logging from commit #1        | Efficiency must be measurable, not bolted on later         |

---

## 4. What "good" looks like for the README

A short **Efficiency** section that reports:

1. A **baseline** cost/latency (naive: one model, no caching, synchronous).
2. Four interventions (routing, caching, batching, structured outputs).
3. A **measured** cost-per-active-user-per-day reduction and a latency note.
4. A screenshot of the cost dashboard trending down.

That converts "I built an AI app" into "I engineered an AI app to be cheap and fast, and here are the numbers."

---

## 5. Reliable AI Layer

Implemented in [`lib/ai/`](./lib/ai/) — every Claude call goes through one
module so reliability is uniform, not re-implemented per feature.

**Billing note:** these API calls are billed pay-per-token on the Console,
**separately** from a Claude Max plan. Max covers your interactive use (claude.ai,
Claude Code); app traffic serving end users is metered API usage. The efficiency
work below is what keeps that bill in the cents-to-single-dollars range.

Reliability layers (cheapest → most valuable):

1. **Structured outputs** — meal parsing is constrained to a Zod schema
   (`messages.parse` + `output_config.format`), so callers get a validated
   object, never an unparsed string. Biggest single reliability win.
2. **Retries + timeout** — SDK auto-retries 408/409/429/5xx with backoff;
   `maxRetries: 4` and a 30s timeout so a hung call can't wedge a route.
3. **Model fallback** — on `529`/5xx, degrade the model (Sonnet → Haiku)
   instead of failing the request.
4. **Graceful degradation** — `parseMeal` returns a typed
   `{ ok: false, reason }`; the UI falls back to manual entry. The app never
   blocks the user.
5. **Loud on real bugs** — 4xx/auth errors still throw, caught in dev.
6. **Usage logging on every call** — `recordUsage` feeds the cost dashboard
   (§2.5); the central research artifact.

Module map: `client.ts` (shared client + routing + fallback), `schemas.ts`
(Zod schema + context type), `usage.ts` (logging + cost estimate),
`parseMeal.ts` (structured parse), `coach.ts` (streaming, prompt-cached coach).

**First measured result (2026-06-09):** `parseMeal` verified end-to-end against
the live API on `claude-haiku-4-5` — one meal parse = 404 in / 59 out tokens =
**~$0.0007 (0.07¢)**. This is the routing baseline; caching and batching numbers
get added as those land. (SDK 0.102.0; runnable via `npm run smoke`.)

---

## 6. Open Decisions

- [ ] Confirm Supabase vs. Neon+NextAuth+R2 for the free stack.
- [ ] Confirm Claude as the AI provider (vs. OpenAI / a thin abstraction layer).
- [ ] Wire `recordUsage` to a Supabase `ai_usage` table (currently logs to stdout).
- [ ] Scaffold the Next.js app shell (Week 1) around the existing `lib/ai/` layer.
