# Engineering Decisions & Lessons

A record of the non-obvious choices and the bugs worth talking about. Written
as interview prep (concrete stories) and as a depth signal beyond the README.

---

## Key architecture decisions

### Pluggable storage behind one `Store` interface
`lib/db/` defines a `Store` interface with **two implementations**: an in-memory
store (default) and a Supabase/Postgres store (auto-selected when the SUPABASE
env vars are set).
- **Why:** the app runs end-to-end with **zero external setup** for a quick local
  demo, and switches to real persistence by adding env vars — no code change.
- **Trade-off:** the in-memory store resets on restart and (in serverless) isn't
  durable. Acceptable for demo mode; Supabase is the real path.

### One centralized AI layer (`lib/ai/`)
Every Claude call goes through a single module — model routing, retries,
timeouts, model fallback, structured-output validation, and usage logging live
in one place.
- **Why:** reliability and cost controls are uniform, not re-implemented per
  route. Adding a new AI feature inherits all of it for free.

### Server-only data access + RLS as defense-in-depth
All DB access is server-side using the **service-role key** (which bypasses RLS).
The browser only uses the public anon key for **auth**, never for table queries.
RLS is enabled on every table with no policies.
- **Why:** the public anon key is exposed in the browser bundle. RLS-on +
  no-policies means that key **cannot read the tables** even if grants change,
  while the server keeps full access. Verified empirically (anon → 404,
  service-role → 200).

### Timezone-correct "today"
"Today's" meals are computed by comparing **day-keys** (`YYYY-MM-DD`) in the
user's timezone (auto-detected from the browser, stored on the profile), not the
server's. Display timestamps are formatted **client-side** in the viewer's zone.
- **Why:** servers (e.g. Vercel) run in UTC, so server-side "today" and
  `toLocaleString()` are wrong for users elsewhere.

### Prompt-cache placement for multi-turn chat
The coach caches the **stable prefix** (system + raw prior turns) with the
breakpoint on the last history message; the **volatile** per-turn context + new
message sit *after* the breakpoint. History is stored **raw** (no context
injected) so the prefix is byte-identical across requests.
- **Why:** caching is a prefix match — any change to the prefix invalidates it.
  Injecting changing context into history would defeat caching entirely.
- **Result:** measured ~7× cheaper input on a long conversation (see
  `efficiency_learnings.md` §2.2).

### Admin by env-var email list
Admins are defined by `ADMIN_EMAILS` and checked server-side against the
**verified session email**. The `/admin` page 404s for non-admins.
- **Why:** simple, secure (no client trust), and no schema/role machinery.

---

## Bugs debugged (root cause → fix)

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| Weight trend showed **+200 kg/week** from 3 entries | Regression slope = Δweight / Δtime; weigh-ins minutes apart → near-zero Δtime → exploding slope | Aggregate to one point **per calendar day**; require ≥2 distinct days |
| Weigh-in time showed **6:28am** (should be 11:28pm) | `toLocaleString()` ran in a **server component** → UTC on Vercel | Format timestamps in a **client** component (viewer's timezone) |
| "Today" totals attributed to the wrong day | Day boundary computed in the **server's** timezone | Per-user timezone on the profile + day-key comparison |
| Dashboard data not shared across API routes | Next.js gives each route bundle its **own module instance** → separate in-memory arrays | Pin the in-memory store on `globalThis` (singleton) |
| Coach error handler crashed | `Anthropic.OverloadedError` doesn't exist in SDK 0.102 | Status-based handling (`429 || >= 500`) — more robust anyway |
| `zodOutputFormat` threw on the API call | zod v3/v4 mismatch in the SDK helper | Pass a **raw JSON schema** to the API; keep zod for **local** validation only — decouples the API boundary from the zod version |
| Service-role reads intermittently 404'd | PostgREST **schema-cache reload** after DDL (`CREATE`/`ALTER`/RLS) | Transient — poll until stable; not a real failure |
| Login forms didn't work after adding Supabase keys | `NEXT_PUBLIC_*` vars are **inlined at build time** | Rebuild after setting them |

---

## Trade-offs taken

- **Plain CSS over Tailwind/shadcn** — kept the build bulletproof and the focus on
  functionality; styling can be upgraded later.
- **Demo mode (in-memory, auth off)** — the app works with no DB so it's trivially
  runnable, at the cost of durability until Supabase is configured.
- **Pull-based day rollover** — "today" recomputes on each request; a small client
  timer (`MidnightRefresher`) triggers a refresh at local midnight rather than a
  server push.
- **Global vs per-account usage** — started global (research view), then refactored
  to per-account with an admin global view once it became a product, not just a
  dashboard.

---

## Interview talking points

- *"Tell me about a tricky bug."* → the +200 kg/week trend (numerical edge case:
  dividing by near-zero time) or the UTC-server "today"/timestamp bugs.
- *"A design trade-off you made."* → the pluggable `Store` interface (demo-mode
  in-memory ↔ Supabase) and why.
- *"How did you make it efficient / cheap?"* → model routing + prompt caching with
  a **measured** ~7× input reduction, surfaced on a cost/latency dashboard.
- *"How did you handle security?"* → service-role + RLS (anon can't read tables),
  secrets only in env (never in git), admin gated by verified email.
- *"How do you know it works?"* → smoke tests against the live API, typecheck gates,
  and verifying data end-to-end in Postgres after each change.
