-- ============================================================
-- UPSC Mains Answer Tracker — Supabase schema
-- Run this in your Supabase project's SQL Editor
-- ============================================================

create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  counts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

-- Each user can only see their own row
create policy "Users can view their own progress"
  on public.progress
  for select
  using (auth.uid() = user_id);

-- Each user can only create a row for themselves
create policy "Users can insert their own progress"
  on public.progress
  for insert
  with check (auth.uid() = user_id);

-- Each user can only update their own row
create policy "Users can update their own progress"
  on public.progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
