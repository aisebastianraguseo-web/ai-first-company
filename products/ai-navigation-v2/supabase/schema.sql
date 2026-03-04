-- AI Navigation v2 — Supabase Schema
-- Run this in: supabase.com → Project → SQL Editor → New query
--
-- Architecture: user_id = auth.uid() = tenant_id (MVP: 1 user per tenant)
-- RLS enforces isolation on DB level — no application-level bypass possible.

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── filter_configurations ────────────────────────────────────────────────────
-- One row per user. Stores their domain filter settings persistently.

create table if not exists public.filter_configurations (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  keywords            jsonb not null default '[]'::jsonb,
  source_weights      jsonb not null default '{"github": 50, "arxiv": 30, "hn": 20}'::jsonb,
  relevance_threshold integer not null default 60 check (relevance_threshold between 0 and 100),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id)    -- one config per user, upsert via merge-duplicates
);

-- Index for fast user lookup
create index if not exists filter_configurations_user_id_idx
  on public.filter_configurations(user_id);

-- Enable Row Level Security
alter table public.filter_configurations enable row level security;

-- Users can only read their own config
create policy "Users read own filter config"
  on public.filter_configurations for select
  using (auth.uid() = user_id);

-- Users can only insert their own config
create policy "Users insert own filter config"
  on public.filter_configurations for insert
  with check (auth.uid() = user_id);

-- Users can only update their own config
create policy "Users update own filter config"
  on public.filter_configurations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── clear_analyses ────────────────────────────────────────────────────────────
-- History of CLEAR analyses. Max 50 per user (enforced by app, not DB).

create table if not exists public.clear_analyses (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  dimensions     jsonb not null,  -- {cost, latency, efficiency, assurance, reliability}
  context        text,            -- user-provided use case description
  recommendation text not null,   -- Claude's response
  cost_usd       numeric(10, 6),  -- API call cost tracking
  created_at     timestamptz not null default now()
);

-- Index for history queries (user + newest first)
create index if not exists clear_analyses_user_created_idx
  on public.clear_analyses(user_id, created_at desc);

-- Enable Row Level Security
alter table public.clear_analyses enable row level security;

create policy "Users read own analyses"
  on public.clear_analyses for select
  using (auth.uid() = user_id);

create policy "Users insert own analyses"
  on public.clear_analyses for insert
  with check (auth.uid() = user_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_filter_configurations_updated_at
  before update on public.filter_configurations
  for each row execute function public.set_updated_at();

-- ── Verify ───────────────────────────────────────────────────────────────────
-- After running, confirm RLS is active:
-- select tablename, rowsecurity from pg_tables
--   where schemaname = 'public';
-- Both tables should show rowsecurity = true.
