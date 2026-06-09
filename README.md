# GoThin — AI Fitness Coach

A web app where you log meals and weight in plain English, get AI calorie/macro
estimates, track your progress, and chat with an AI coach that uses your **real**
data. Built with a deliberate focus on **LLM efficiency** — model routing,
prompt caching, and a cost/latency dashboard — not just "call an LLM."

> The goal isn't to be another calorie tracker. It's to answer three questions:
> *What happened today? Am I still on track? What should I do next?*

## Features

- **AI meal logging** — describe a meal in text; Claude returns structured
  calories + macros (schema-validated), which you save to your day.
- **Profile & targets** — set calorie/protein goals; the dashboard and coach use
  them.
- **Weight tracking** — log weigh-ins, see a trend chart with a goal line, and a
  linear-regression **goal-date projection**.
- **Persistent AI coach** — multi-turn conversations that remember the thread and
  reason over your live context (targets, today's intake, weight trend).
- **Timezone-aware "today"** — your day rolls over at *your* local midnight (auto
  detected), live, without a reload.
- **Auth** — email/password via Supabase; all data scoped per user.
- **Efficiency dashboard** — every AI call logs cost, latency, TTFT, and cache
  hits.

## Tech stack

| Layer    | Technology                                   |
|----------|----------------------------------------------|
| Frontend | Next.js (App Router), React, TypeScript      |
| Styling  | Plain CSS, Recharts for charts               |
| Backend  | Next.js route handlers (Node runtime)        |
| AI       | Claude (Anthropic SDK) — Haiku + Sonnet      |
| Data/Auth| Supabase (Postgres + Auth)                   |
| Hosting  | Vercel (frontend + API) + Supabase (data)    |

## Efficiency focus

This project treats the AI layer's cost/latency as a first-class concern (see
[`efficiency_learnings.md`](./efficiency_learnings.md)):

- **Model routing** — Haiku for high-volume meal parsing, Sonnet for coaching.
- **Prompt caching** — multi-turn coach conversations cache the stable prefix.
  Measured: in a 10-turn chat, caching engaged at turn 6 and held cost-per-message
  flat (~$0.006) instead of growing — roughly **7× cheaper input** by turn 10.
- **Structured outputs** — meal parsing is schema-constrained, so responses are
  validated, never reparsed.
- **Trace dashboard** — cost, latency, time-to-first-token, and cache reads logged
  per call.

The whole AI layer lives behind one module — see [`lib/ai/README.md`](./lib/ai/README.md).

## Getting started

### Prerequisites
- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com) (billed pay-per-token,
  separate from a Claude subscription)
- A [Supabase](https://supabase.com) project (free tier is fine)

### 1. Install
```bash
git clone https://github.com/RussCTGL/GoThin.git
cd GoThin
npm install
```

### 2. Configure environment
Copy the template and fill in your keys:
```bash
cp .env.example .env
```
Set in `.env`:
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only secret)

> Leave the Supabase vars unset to run in **demo mode** (in-memory store, auth
> disabled) — handy for a quick local spin without a database.

### 3. Create the database schema
In the Supabase **SQL Editor**, run [`supabase/schema.sql`](./supabase/schema.sql).
For easy local testing, also turn **off** "Confirm email" in
Authentication → Sign In / Providers → Email.

### 4. Run
```bash
npm run dev          # http://localhost:3000
```

### Verify the AI layer (optional)
```bash
npm run smoke        # one real meal-parse call
npm run smoke:coach  # one streaming coach reply
```

## Project structure

```
app/                 Next.js routes (pages + API route handlers)
  api/               meal parse, meals, weight, profile, coach (chat/sessions/messages)
  coach/ dashboard/ meal/ profile/ login/ signup/
lib/
  ai/                Claude layer: client, routing, parseMeal, coach, usage logging
  db/                Store interface + in-memory and Supabase implementations
  auth/              Supabase auth (server/browser clients, getUser)
  coach-context.ts   assembles the coach's real per-user context
  projection.ts      weight trend + goal-date math
middleware.ts        session refresh + route protection
supabase/schema.sql  database tables
scripts/             smoke tests
```

## Deployment

- **Frontend + API → Vercel:** import the GitHub repo, add the four env vars,
  deploy. `NEXT_PUBLIC_*` vars must be set before the build.
- **Database/Auth → Supabase:** already cloud-hosted. After deploying, set the
  Vercel URL as the **Site URL** + **Redirect URL** in Supabase
  Authentication → URL Configuration.

## Notes

- Secrets live only in `.env` (gitignored) and your host's env settings — never in
  the repo.
- `.env.example` documents every variable with placeholders.
