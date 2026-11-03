-- Inventory by warehouse, supplier orders, returns, change history and first-party analytics.
-- Row level security with no policies: only the server reaches these tables.

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.stock_levels (
  product_id uuid not null references public.products (id) on delete cascade,
  warehouse_id uuid not null references public.warehouses (id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  primary key (product_id, warehouse_id)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  warehouse_id uuid references public.warehouses (id) on delete set null,
  delta integer not null,
  reason text not null,
  note text,
  actor text,
  created_at timestamptz not null default now()
);
create index stock_movements_created_idx on public.stock_movements (created_at desc);

create table public.inventory_settings (
  product_id uuid primary key references public.products (id) on delete cascade,
  reorder_point integer check (reorder_point is null or reorder_point >= 0),
  supplier text
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier text not null,
  warehouse_id uuid references public.warehouses (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'received', 'cancelled')),
  note text,
  items jsonb not null,
  created_at timestamptz not null default now(),
  received_at timestamptz
);

create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  items jsonb not null,
  reason text not null,
  note text,
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'received', 'closed')),
  team_note text,
  created_at timestamptz not null default now()
);
-- One open return per order at a time.
create unique index return_requests_open_idx on public.return_requests (order_id) where status in ('requested', 'approved', 'received');

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  target text,
  detail text,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- No names, emails or addresses: a random id that lasts one browser session.
create table public.analytics_events (
  id bigint generated always as identity primary key,
  name text not null check (name in ('view_product', 'add_to_cart', 'begin_checkout', 'purchase', 'search')),
  session text not null,
  product_slug text,
  query text,
  results integer,
  locale text,
  created_at timestamptz not null default now()
);
create index analytics_events_created_idx on public.analytics_events (created_at desc);

-- A manual change, as one unit: the warehouse, the product total and the record of why.
create function public.adjust_stock(p_slug text, p_warehouse uuid, p_delta integer, p_reason text, p_note text, p_actor text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  product uuid;
begin
  select id into product from public.products where slug = p_slug;
  if product is null then raise exception 'Unknown product'; end if;
  if p_warehouse is not null then
    insert into public.stock_levels as l (product_id, warehouse_id, quantity)
    values (product, p_warehouse, greatest(0, p_delta))
    on conflict (product_id, warehouse_id) do update set quantity = greatest(0, l.quantity + p_delta);
  end if;
  update public.products set stock_qty = greatest(0, coalesce(stock_qty, 0) + p_delta), updated_at = now() where id = product;
  insert into public.stock_movements (product_slug, warehouse_id, delta, reason, note, actor) values (p_slug, p_warehouse, p_delta, p_reason, p_note, p_actor);
end;
$$;

-- A sale takes stock from the warehouse holding the most of that product.
create function public.apply_sale(items jsonb, reference text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  item jsonb;
  product uuid;
  tracked integer;
  source uuid;
  amount integer;
begin
  for item in select * from jsonb_array_elements(items) loop
    amount := (item ->> 'quantity')::integer;
    select id, stock_qty into product, tracked from public.products where slug = item ->> 'slug' for update;
    if product is null or tracked is null then continue; end if;
    update public.products set stock_qty = greatest(0, stock_qty - amount), updated_at = now() where id = product;
    select warehouse_id into source from public.stock_levels where product_id = product order by quantity desc limit 1;
    if source is not null then
      update public.stock_levels set quantity = greatest(0, quantity - amount) where product_id = product and warehouse_id = source;
    end if;
    insert into public.stock_movements (product_slug, warehouse_id, delta, reason, note) values (item ->> 'slug', source, -amount, 'sale', reference);
  end loop;
end;
$$;

alter table public.warehouses enable row level security;
alter table public.stock_levels enable row level security;
alter table public.stock_movements enable row level security;
alter table public.inventory_settings enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.return_requests enable row level security;
alter table public.audit_log enable row level security;
alter table public.analytics_events enable row level security;
revoke all on public.warehouses, public.stock_levels, public.stock_movements, public.inventory_settings, public.purchase_orders, public.return_requests, public.audit_log, public.analytics_events from anon, authenticated;

revoke execute on function public.adjust_stock(text, uuid, integer, text, text, text) from public, anon, authenticated;
revoke execute on function public.apply_sale(jsonb, text) from public, anon, authenticated;
grant execute on function public.adjust_stock(text, uuid, integer, text, text, text) to service_role;
grant execute on function public.apply_sale(jsonb, text) to service_role;
