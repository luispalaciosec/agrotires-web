-- Attempt counters shared by every server instance. Keys are hashed, so no address is stored.

create table public.rate_limits (
  key text primary key,
  hits integer not null,
  reset_at timestamptz not null
);

-- Row level security with no policies: nobody reaches this table through the public API.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Counts one attempt atomically and answers whether the limit is exceeded.
create function public.hit_rate_limit(p_key text, p_limit integer, p_window_ms integer) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  current_hits integer;
begin
  -- Old rows are swept now and then instead of needing a scheduled job.
  if random() < 0.01 then
    delete from public.rate_limits where reset_at < now();
  end if;
  insert into public.rate_limits as r (key, hits, reset_at)
  values (p_key, 1, now() + p_window_ms * interval '1 millisecond')
  on conflict (key) do update set
    hits = case when r.reset_at < now() then 1 else r.hits + 1 end,
    reset_at = case when r.reset_at < now() then excluded.reset_at else r.reset_at end
  returning r.hits into current_hits;
  return current_hits > p_limit;
end;
$$;

-- Only the server may call it.
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
