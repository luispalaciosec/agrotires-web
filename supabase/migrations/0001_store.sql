-- AGROTIRES store schema. Money is stored as integer cents, in USD.
-- Orders and quote requests are written only from the server with the service role,
-- so totals are always computed on the server and never trusted from the browser.

create type public.user_role as enum ('customer', 'staff', 'admin');
create type public.shipping_class as enum ('parcel', 'freight_quote', 'pickup');
create type public.order_status as enum ('pending_payment', 'paid', 'fulfilled', 'cancelled', 'refunded', 'payment_failed');
create type public.quote_status as enum ('new', 'in_progress', 'answered', 'closed');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

-- security definer so policies can read roles without recursing through profiles RLS.
create function public.is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A customer may edit their own contact details but never their role.
create function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null
     and not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only an admin can change roles';
  end if;
  return new;
end;
$$;

create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  recipient text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'US',
  phone text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id text primary key,
  name text not null,
  description text,
  tag text,
  image_path text,
  sort_order integer not null default 0,
  active boolean not null default true
);

-- Columns follow AGROTIRES-product-import-template.csv.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sku text not null unique,
  name text not null,
  category_id text not null references public.categories (id),
  brand text,
  description text not null default '',
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text not null default 'USD' check (currency = 'USD'),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  weight_lb numeric(10, 2),
  length_in numeric(10, 2),
  width_in numeric(10, 2),
  height_in numeric(10, 2),
  tire_size text,
  equipment_make text,
  equipment_model text,
  compatibility_verified boolean not null default false,
  shipping_class public.shipping_class not null default 'parcel',
  active boolean not null default false,
  search tsvector generated always as (
    to_tsvector('simple',
      coalesce(name, '') || ' ' || coalesce(sku, '') || ' ' || coalesce(brand, '') || ' ' ||
      coalesce(tire_size, '') || ' ' || coalesce(equipment_make, '') || ' ' || coalesce(equipment_model, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- An unpriced product can never be listed for sale.
  constraint active_needs_price check (not active or price_cents is not null)
);
create index products_category_idx on public.products (category_id) where active;
create index products_search_idx on public.products using gin (search);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null,
  alt text not null default '',
  sort_order integer not null default 0
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  profile_id uuid references public.profiles (id) on delete set null,
  email text not null,
  status public.order_status not null default 'pending_payment',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'USD' check (currency = 'USD'),
  shipping_address jsonb,
  -- unique: a replayed PayPal webhook or double click cannot create or capture twice.
  paypal_order_id text unique,
  paypal_capture_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint total_adds_up check (total_cents = subtotal_cents + shipping_cents + tax_cents)
);
create index orders_profile_idx on public.orders (profile_id);

-- Name, SKU and price are copied so later catalog edits never rewrite past orders.
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  sku text not null,
  name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  delivery_zip text,
  topic text not null,
  product_id uuid references public.products (id) on delete set null,
  message text not null,
  status public.quote_status not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.quote_requests enable row level security;

create policy "own profile or staff reads" on public.profiles for select
  using (id = auth.uid() or public.is_staff());
create policy "own profile updates" on public.profiles for update
  using (id = auth.uid() or public.is_staff()) with check (id = auth.uid() or public.is_staff());

create policy "own addresses" on public.addresses for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "staff reads addresses" on public.addresses for select using (public.is_staff());

create policy "public reads active categories" on public.categories for select
  using (active or public.is_staff());
create policy "staff manages categories" on public.categories for all
  using (public.is_staff()) with check (public.is_staff());

create policy "public reads active products" on public.products for select
  using (active or public.is_staff());
create policy "staff manages products" on public.products for all
  using (public.is_staff()) with check (public.is_staff());

create policy "public reads images of active products" on public.product_images for select
  using (public.is_staff() or exists (select 1 from public.products p where p.id = product_id and p.active));
create policy "staff manages images" on public.product_images for all
  using (public.is_staff()) with check (public.is_staff());

-- No insert policies on orders, order_items or quote_requests: only the server can create them.
create policy "own orders or staff reads" on public.orders for select
  using (profile_id = auth.uid() or public.is_staff());
create policy "staff updates orders" on public.orders for update
  using (public.is_staff()) with check (public.is_staff());

create policy "own order items or staff reads" on public.order_items for select
  using (public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.profile_id = auth.uid()));

create policy "staff reads quotes" on public.quote_requests for select using (public.is_staff());
create policy "staff updates quotes" on public.quote_requests for update
  using (public.is_staff()) with check (public.is_staff());

-- Roles need table privileges for the policies above to apply on a plain Postgres too;
-- Supabase also grants these by default.
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.product_images to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;
grant insert, update, delete on public.categories, public.products, public.product_images to authenticated;
grant select, update on public.orders, public.quote_requests to authenticated;
grant select on public.order_items to authenticated;
