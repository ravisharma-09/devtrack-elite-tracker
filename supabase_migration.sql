-- ============================================================
-- DevTrack Safe Migration — Run this INSTEAD of the full schema
-- Only adds new columns. Safe to run multiple times.
-- ============================================================

-- 1. New connection-status and topic columns on users table
alter table public.users add column if not exists cf_connected boolean default false;
alter table public.users add column if not exists lc_connected boolean default false;
alter table public.users add column if not exists gh_connected boolean default false;
alter table public.users add column if not exists weak_topics text[] default '{}';
alter table public.users add column if not exists strong_topics text[] default '{}';

-- 2. external_activity table (unified timeline)
create table if not exists public.external_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  activity_type text not null,
  activity_title text not null,
  activity_link text,
  activity_timestamp timestamptz not null default now(),
  metadata jsonb,
  created_at timestamptz default now()
);
create unique index if not exists ext_activity_dedup
  on public.external_activity(user_id, platform, activity_title, activity_timestamp);
create index if not exists ext_activity_user_ts
  on public.external_activity(user_id, activity_timestamp desc);
alter table public.external_activity enable row level security;
drop policy if exists "Users can CRUD own external activity" on public.external_activity;
create policy "Users can CRUD own external activity"
  on public.external_activity for all using (auth.uid() = user_id);

-- 3. external_stats table (CF / LC / GH stats JSON blob)
create table if not exists public.external_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cf jsonb,
  lc jsonb,
  gh jsonb,
  last_synced timestamptz default now()
);
alter table public.external_stats enable row level security;
drop policy if exists "Users can CRUD own external stats" on public.external_stats;
create policy "Users can CRUD own external stats"
  on public.external_stats for all using (auth.uid() = user_id);

-- 4. recommendations table (Targeted Practice cards)
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  content jsonb not null,
  created_at timestamptz default now()
);
create index if not exists recommendations_user on public.recommendations(user_id, created_at desc);
alter table public.recommendations enable row level security;
drop policy if exists "Users can CRUD own recommendations" on public.recommendations;
create policy "Users can CRUD own recommendations"
  on public.recommendations for all using (auth.uid() = user_id);

-- 5. problem_attempts table (Topic Mastery engine reads this)
create table if not exists public.problem_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id text not null,
  topic text,
  rating integer,
  verdict text,     -- 'AC', 'WA', 'TLE', etc.
  attempted_at timestamptz default now(),
  unique(user_id, problem_id)
);
create index if not exists problem_attempts_user_topic
  on public.problem_attempts(user_id, topic);
alter table public.problem_attempts enable row level security;
drop policy if exists "Users can CRUD own problem attempts" on public.problem_attempts;
create policy "Users can CRUD own problem attempts"
  on public.problem_attempts for all using (auth.uid() = user_id);
