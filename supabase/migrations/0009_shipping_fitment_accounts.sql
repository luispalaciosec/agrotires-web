-- Shipping rates, local tax rates, verified machine fitment and customer accounts.
-- Row level security with no policies: only the server reaches the new tables.

create table public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  states text[] not null,
  base_cents integer not null check (base_cents >= 0),
  per_lb_cents integer not null default 0 check (per_lb_cents >= 0),
  free_over_cents integer check (free_over_cents is null or free_over_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- A rate for one ZIP code wins over its state's rate. Filled from a file the business imports.
create table public.tax_zip_rates (
  zip char(5) primary key,
  rate_bps integer not null check (rate_bps between 0 and 2000),
  region text
);

alter table public.tax_rates add column tax_shipping boolean not null default false;

create table public.product_fitment (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  make text not null,
  model text not null,
  year_from integer not null check (year_from between 1900 and 2100),
  year_to integer not null check (year_to between 1900 and 2100),
  constraint fitment_years check (year_from <= year_to)
);
create index product_fitment_product_idx on public.product_fitment (product_id);
create index product_fitment_machine_idx on public.product_fitment (lower(make), lower(model));

-- The welcome email goes out once, after the customer confirms their address.
alter table public.profiles add column welcomed_at timestamptz;

create index orders_email_idx on public.orders (lower(email));

alter table public.shipping_zones enable row level security;
alter table public.tax_zip_rates enable row level security;
alter table public.product_fitment enable row level security;
revoke all on public.shipping_zones, public.tax_zip_rates, public.product_fitment from anon, authenticated;
