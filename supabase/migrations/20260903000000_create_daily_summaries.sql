create table if not exists public.daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  summary_date date not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, summary_date)
);

alter table public.daily_summaries enable row level security;

drop policy if exists "Users can read their own daily summaries" on public.daily_summaries;
drop policy if exists "Users can insert their own daily summaries" on public.daily_summaries;
drop policy if exists "Users can update their own daily summaries" on public.daily_summaries;

create policy "Users can read their own daily summaries"
  on public.daily_summaries for select using (auth.uid() = user_id);

create policy "Users can insert their own daily summaries"
  on public.daily_summaries for insert with check (auth.uid() = user_id);

create policy "Users can update their own daily summaries"
  on public.daily_summaries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
