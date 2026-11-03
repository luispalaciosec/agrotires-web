-- Blank stock means "not tracked", and stock is reduced atomically when an order is paid.

alter table public.products alter column stock_qty drop not null;
alter table public.products alter column stock_qty drop default;

create function public.reduce_stock(items jsonb) returns void
language sql security definer set search_path = ''
as $$
  update public.products p
  set stock_qty = greatest(0, p.stock_qty - (i ->> 'quantity')::integer), updated_at = now()
  from jsonb_array_elements(items) i
  where p.slug = i ->> 'slug' and p.stock_qty is not null;
$$;

-- Only the server may call it.
revoke execute on function public.reduce_stock(jsonb) from public, anon, authenticated;
grant execute on function public.reduce_stock(jsonb) to service_role;
