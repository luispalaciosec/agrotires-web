-- Tracks how much of each order has gone back to the customer, and returns items to stock.

alter table public.orders add column refunded_cents integer not null default 0;
alter table public.orders add constraint refund_within_total check (refunded_cents >= 0 and refunded_cents <= total_cents);

create function public.restock(items jsonb) returns void
language sql security definer set search_path = ''
as $$
  update public.products p
  set stock_qty = p.stock_qty + (i ->> 'quantity')::integer, updated_at = now()
  from jsonb_array_elements(items) i
  where p.slug = i ->> 'slug' and p.stock_qty is not null;
$$;

-- Only the server may call it.
revoke execute on function public.restock(jsonb) from public, anon, authenticated;
grant execute on function public.restock(jsonb) to service_role;
