-- DevTrack Supabase Schema with RLS
-- Run this ENTIRE script in Supabase SQL Editor

-- ════════════════════════════════════════════════════
-- 1. USER PROFILES TABLE (with platform handles)
-- ════════════════════════════════════════════════════
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default 'Dev',
  codeforces_handle text default '',
  leetcode_username text default '',
  github_username text default '',
  created_at timestamptz default now()
);
alter table public.users enable row level security;
drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- ════════════════════════════════════════════════════
-- 2. STUDY SESSIONS TABLE
-- ════════════════════════════════════════════════════
create table if not exists public.study_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  category text not null,
  duration_minutes integer not null,
  difficulty text not null,
  notes text,
  date text not null,
  created_at timestamptz default now()
);
create index if not exists study_sessions_user_date on public.study_sessions(user_id, date);
alter table public.study_sessions enable row level security;
drop policy if exists "Users can CRUD own sessions" on public.study_sessions;
create policy "Users can CRUD own sessions" on public.study_sessions for all using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- 3. ROADMAP TOPIC PROGRESS TABLE
-- ════════════════════════════════════════════════════
create table if not exists public.roadmap_progress (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null,
  category_id text not null,
  progress integer default 0,
  completed boolean default false,
  created_at timestamptz default now(),
  unique(user_id, topic_id)
);
create index if not exists roadmap_progress_user on public.roadmap_progress(user_id);
alter table public.roadmap_progress enable row level security;
drop policy if exists "Users can CRUD own roadmap" on public.roadmap_progress;
create policy "Users can CRUD own roadmap" on public.roadmap_progress for all using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- 4. MICRO-TASK PROGRESS TABLE
-- ════════════════════════════════════════════════════
create table if not exists public.microtask_progress (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null,
  task_id text not null,
  completed boolean default false,
  created_at timestamptz default now(),
  unique(user_id, task_id)
);
create index if not exists microtask_progress_user on public.microtask_progress(user_id);
alter table public.microtask_progress enable row level security;
drop policy if exists "Users can CRUD own microtasks" on public.microtask_progress;
create policy "Users can CRUD own microtasks" on public.microtask_progress for all using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- 5. ACTIVITY LOG TABLE (heatmap data)
-- ════════════════════════════════════════════════════
create table if not exists public.activity_log (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  minutes_studied integer default 0,
  tasks_completed integer default 0,
  topics text[] default '{}',
  created_at timestamptz default now(),
  unique(user_id, date)
);
create index if not exists activity_log_user_date on public.activity_log(user_id, date);
alter table public.activity_log enable row level security;
drop policy if exists "Users can CRUD own activity" on public.activity_log;
create policy "Users can CRUD own activity" on public.activity_log for all using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- 6. CODEFORCES STATS TABLE
-- ════════════════════════════════════════════════════
create table if not exists public.codeforces_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null default '',
  rating integer default 0,
  max_rating integer default 0,
  rank text default 'unrated',
  problems_solved integer default 0,
  total_submissions integer default 0,
  recent_dates text[] default '{}',
  last_synced timestamptz default now()
);
alter table public.codeforces_stats enable row level security;
drop policy if exists "Users can CRUD own CF stats" on public.codeforces_stats;
create policy "Users can CRUD own CF stats" on public.codeforces_stats for all using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- 7. LEETCODE STATS TABLE
-- ════════════════════════════════════════════════════
create table if not exists public.leetcode_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null default '',
  total_solved integer default 0,
  easy_solved integer default 0,
  medium_solved integer default 0,
  hard_solved integer default 0,
  ranking integer default 0,
  submission_dates text[] default '{}',
  last_synced timestamptz default now()
);
alter table public.leetcode_stats enable row level security;
drop policy if exists "Users can CRUD own LC stats" on public.leetcode_stats;
create policy "Users can CRUD own LC stats" on public.leetcode_stats for all using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- 8. GITHUB STATS TABLE
-- ════════════════════════════════════════════════════
create table if not exists public.github_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null default '',
  public_repos integer default 0,
  followers integer default 0,
  total_stars integer default 0,
  total_commits_estimate integer default 0,
  last_month_commits integer default 0,
  contribution_dates text[] default '{}',
  top_languages text[] default '{}',
  last_synced timestamptz default now()
);
alter table public.github_stats enable row level security;
drop policy if exists "Users can CRUD own GH stats" on public.github_stats;
create policy "Users can CRUD own GH stats" on public.github_stats for all using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- 9. ALTER existing users table if already created
-- (Run this block if you already ran the old schema)
-- ════════════════════════════════════════════════════
alter table public.users add column if not exists codeforces_handle text default '';
alter table public.users add column if not exists leetcode_username text default '';
alter table public.users add column if not exists github_username text default '';
alter table public.users add column if not exists cf_connected boolean default false;
alter table public.users add column if not exists lc_connected boolean default false;
alter table public.users add column if not exists gh_connected boolean default false;
alter table public.users add column if not exists weak_topics text[] default '{}';
alter table public.users add column if not exists strong_topics text[] default '{}';

-- ════════════════════════════════════════════════════
-- 10. AUTO-CREATE USER PROFILE ON SIGNUP (trigger)
-- ════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', 'Dev'));
  
  insert into public.profiles (id, email, username)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', 'Dev'));
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ════════════════════════════════════════════════════
-- 11. UNIFIED EXTERNAL STATS TABLE (Final Architecture)
-- ════════════════════════════════════════════════════
create table if not exists public.external_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cf jsonb,
  lc jsonb,
  gh jsonb,
  last_synced timestamptz default now()
);
alter table public.external_stats enable row level security;
drop policy if exists "Users can CRUD own external stats" on public.external_stats;
create policy "Users can CRUD own external stats" on public.external_stats for all using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- 12. SKILL HISTORY TABLE (for Growth Chart)
-- ════════════════════════════════════════════════════
create table if not exists public.skill_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  skill_score integer not null,
  created_at timestamptz default now(),
  primary key (user_id, date)
);
alter table public.skill_history enable row level security;
drop policy if exists "Users can CRUD own skill history" on public.skill_history;
create policy "Users can CRUD own skill history" on public.skill_history for all using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- 13. AI ANALYTICS CACHE TABLE (Anti-Spam)
-- ════════════════════════════════════════════════════
create table if not exists public.ai_analytics_cache (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weak_topics text[] default '{}',
  strong_topics text[] default '{}',
  daily_plan text[] default '{}',
  suggestions jsonb default '[]',
  updated_at timestamptz default now()
);
alter table public.ai_analytics_cache enable row level security;
drop policy if exists "Users can CRUD own AI cache" on public.ai_analytics_cache;
create policy "Users can CRUD own AI cache" on public.ai_analytics_cache for all using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- 14. LEADERBOARD STATS TABLE
-- ════════════════════════════════════════════════════
create table if not exists public.leaderboard_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  username text not null,
  skill_score integer default 0,
  problems_solved integer default 0,
  study_hours integer default 0,
  consistency_score integer default 0,
  codeforces_rating integer default 0,
  leetcode_solved integer default 0,
  github_activity_score integer default 0,
  batch text,
  last_updated timestamptz default now()
);
alter table public.leaderboard_stats enable row level security;
drop policy if exists "Anyone can view leaderboard" on public.leaderboard_stats;
create policy "Anyone can view leaderboard" on public.leaderboard_stats for select using (true);
drop policy if exists "Users can update own leaderboard row" on public.leaderboard_stats;
create policy "Users can update own leaderboard row" on public.leaderboard_stats for update using (auth.uid() = user_id);
drop policy if exists "Users can insert own leaderboard row" on public.leaderboard_stats;
create policy "Users can insert own leaderboard row" on public.leaderboard_stats for insert with check (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- 15. LEADERBOARD CACHE TABLE
-- ════════════════════════════════════════════════════
create table if not exists public.leaderboard_cache (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  updated_at timestamptz default now()
);
alter table public.leaderboard_cache enable row level security;
drop policy if exists "Anyone can view leaderboard cache" on public.leaderboard_cache;
create policy "Anyone can view leaderboard cache" on public.leaderboard_cache for select using (true);
drop policy if exists "Anyone can update leaderboard cache" on public.leaderboard_cache;
create policy "Anyone can update leaderboard cache" on public.leaderboard_cache for all using (true);

-- ════════════════════════════════════════════════════
-- 16. RANK HISTORY TABLE
-- ════════════════════════════════════════════════════
create table if not exists public.rank_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  rank integer not null,
  created_at timestamptz default now(),
  primary key (user_id, date)
);
alter table public.rank_history enable row level security;
drop policy if exists "Users can CRUD own rank history" on public.rank_history;
create policy "Users can CRUD own rank history" on public.rank_history for all using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- 17. EXTERNAL ACTIVITY TABLE
-- ════════════════════════════════════════════════════
create table if not exists public.external_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  activity_type text not null,
  activity_title text not null,
  activity_link text,
  activity_timestamp timestamptz not null,
  metadata jsonb,
  created_at timestamptz default now(),
  unique(user_id, platform, activity_title, activity_timestamp) -- prevent duplicates
);
create index if not exists external_activity_user_time on public.external_activity(user_id, activity_timestamp desc);
alter table public.external_activity enable row level security;
drop policy if exists "Users can CRUD own external activity" on public.external_activity;
create policy "Users can CRUD own external activity" on public.external_activity for all using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- TELEMETRY SYSTEM OVERHAUL TABLES
-- ════════════════════════════════════════════════════

-- PROFILES (Unified user data)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text not null,
  cf_handle text,
  leetcode_handle text,
  github_username text,
  skill_score integer default 0,
  problems_solved integer default 0,
  cf_rating integer default 0,
  consistency_score integer default 0,
  study_minutes integer default 0,
  strong_topics jsonb default '[]',
  weak_topics jsonb default '[]',
  current_level text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Anyone can view telemetry profiles" on public.profiles for select using (true);
create policy "Users can update own telemetry profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own telemetry profile" on public.profiles for insert with check (auth.uid() = id);

-- ACTIVITIES (Unified activity stream)
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null, -- codeforces | lc | github | devtrack
  type text not null,   -- solve | contest | commit | study
  title text not null,
  topic text,
  difficulty text,
  rating integer default 0,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
alter table public.activities enable row level security;
create policy "Users can CRUD own activities" on public.activities for all using (auth.uid() = user_id);

-- PROBLEM ATTEMPTS
create table if not exists public.problem_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,  -- codeforces, leetcode, etc.
  problem_id text not null,
  name text not null,
  topic text,
  rating integer default 0,
  verdict text not null,
  created_at timestamptz default now()
);
alter table public.problem_attempts enable row level security;
create policy "Users can CRUD own problem attempts" on public.problem_attempts for all using (auth.uid() = user_id);



-- USER TIMETABLE (Weekly schedule state)
create table if not exists public.user_timetable (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schedule jsonb not null default '[]',
  updated_at timestamptz default now()
);
alter table public.user_timetable enable row level security;
create policy "Users can CRUD own timetable" on public.user_timetable for all using (auth.uid() = user_id);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- dsa | web | open_source
  content jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.recommendations enable row level security;
drop policy if exists "Users can CRUD own recommendations" on public.recommendations;
create policy "Users can CRUD own recommendations" on public.recommendations for all using (auth.uid() = user_id);

