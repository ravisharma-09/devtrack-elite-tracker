-- DevTrack Supabase Schema
-- Run this in your Supabase SQL Editor

-- Study Sessions
create table if not exists study_sessions (
  id text primary key,
  user_id text not null default 'local',
  topic text not null,
  category text not null,
  duration_minutes integer not null,
  difficulty text not null,
  notes text,
  date text not null,
  created_at timestamptz default now()
);
create index on study_sessions(user_id, date);

-- Roadmap Topic Progress
create table if not exists roadmap_progress (
  id text primary key,
  user_id text not null default 'local',
  topic_id text not null,
  category_id text not null,
  progress integer default 0,
  completed boolean default false,
  created_at timestamptz default now(),
  unique(user_id, topic_id)
);
create index on roadmap_progress(user_id);

-- Micro-task Progress
create table if not exists microtask_progress (
  id text primary key,
  user_id text not null default 'local',
  topic_id text not null,
  task_id text not null,
  completed boolean default false,
  created_at timestamptz default now(),
  unique(user_id, task_id)
);
create index on microtask_progress(user_id);

-- Activity Log (heatmap data)
create table if not exists activity_log (
  id text primary key,
  user_id text not null default 'local',
  date text not null,
  minutes_studied integer default 0,
  tasks_completed integer default 0,
  topics text[] default '{}',
  created_at timestamptz default now(),
  unique(user_id, date)
);
create index on activity_log(user_id, date);
