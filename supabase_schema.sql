-- DevTrack Supabase Schema with RLS
-- Run this ENTIRE script in Supabase SQL Editor

-- ════════════════════════════════════════════════════
-- 1. USER PROFILES TABLE
-- ════════════════════════════════════════════════════
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default 'Dev',
  created_at timestamptz default now()
);
alter table public.users enable row level security;
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
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
create policy "Users can CRUD own activity" on public.activity_log for all using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════
-- 6. AUTO-CREATE USER PROFILE ON SIGNUP (trigger)
-- ════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', 'Dev'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
