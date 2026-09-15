create table if not exists public.ai_summary_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  generation_count integer not null default 0 check (generation_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_start)
);

alter table public.ai_summary_usage enable row level security;

create or replace function public.consume_ai_summary_quota(
  p_user_id uuid,
  p_month_start date,
  p_limit integer default 30
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  insert into public.ai_summary_usage (user_id, month_start, generation_count, updated_at)
  values (p_user_id, p_month_start, 1, now())
  on conflict (user_id, month_start) do update
    set generation_count = public.ai_summary_usage.generation_count + 1,
        updated_at = now()
    where public.ai_summary_usage.generation_count < p_limit
  returning generation_count into next_count;

  return next_count;
end;
$$;

create or replace function public.release_ai_summary_quota(
  p_user_id uuid,
  p_month_start date
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_summary_usage
  set generation_count = greatest(generation_count - 1, 0),
      updated_at = now()
  where user_id = p_user_id and month_start = p_month_start;
$$;

revoke all on table public.ai_summary_usage from anon, authenticated;
revoke all on function public.consume_ai_summary_quota(uuid, date, integer) from public, anon, authenticated;
revoke all on function public.release_ai_summary_quota(uuid, date) from public, anon, authenticated;
grant execute on function public.consume_ai_summary_quota(uuid, date, integer) to service_role;
grant execute on function public.release_ai_summary_quota(uuid, date) to service_role;
