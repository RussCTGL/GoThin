-- AI Fitness Coach — Supabase schema.
-- Run this in the Supabase SQL editor (or `supabase db push`) AFTER creating a
-- project. The app uses the in-memory store until SUPABASE_URL +
-- SUPABASE_SERVICE_ROLE_KEY are set in .env; then it persists here.
--
-- Note: these tables are written via the service-role key from the server
-- (lib/db/supabase.ts), so Row Level Security is not required for the current
-- single-demo-user setup. Add RLS + auth.uid() policies when real auth lands.

create table if not exists weight_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  weight_kg   numeric(5, 2) not null,
  logged_at   timestamptz not null default now()
);
create index if not exists weight_entries_user_logged
  on weight_entries (user_id, logged_at desc);

create table if not exists ai_usage (
  id                  uuid primary key default gen_random_uuid(),
  user_id             text,
  feature             text not null,
  model               text not null,
  trace_id            uuid not null,
  input_tokens        integer not null default 0,
  output_tokens       integer not null default 0,
  cache_read_tokens   integer not null default 0,
  cache_write_tokens  integer not null default 0,
  latency_ms          integer not null default 0,
  ttft_ms             integer,
  cost_usd            numeric(12, 6) not null default 0,
  at                  timestamptz not null default now()
);
create index if not exists ai_usage_at on ai_usage (at desc);
create index if not exists ai_usage_trace on ai_usage (trace_id);
create index if not exists ai_usage_user on ai_usage (user_id, at desc);
-- For projects that created `ai_usage` before the user_id column existed:
alter table ai_usage add column if not exists user_id text;

create table if not exists meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  raw_input   text,
  calories    integer not null default 0,
  protein_g   numeric(6, 2) not null default 0,
  carbs_g     numeric(6, 2) not null default 0,
  fat_g       numeric(6, 2) not null default 0,
  confidence  text,
  eaten_at    timestamptz not null default now()
);
create index if not exists meals_user_eaten on meals (user_id, eaten_at desc);

create table if not exists profiles (
  user_id            text primary key,
  target_calories    integer not null,
  target_protein_g   integer not null,
  goal_weight_kg     numeric(5, 2),
  dietary_preferences text,
  timezone           text,
  updated_at         timestamptz not null default now()
);
-- For projects that created `profiles` before the timezone column existed:
alter table profiles add column if not exists timezone text;

create table if not exists coach_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  session_id  uuid not null,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists coach_messages_session
  on coach_messages (user_id, session_id, created_at);

-- Roadmap tables (not used yet): workouts.
