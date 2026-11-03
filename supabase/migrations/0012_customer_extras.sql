-- Newsletter, favorites and machines saved to an account, partial restock and sending orders to suppliers.
-- Row level security with no policies: only the server reaches the new tables.

create table public.newsletter_subscribers (
  email text primary key,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

create table public.wishlists (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  product_slug text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, product_slug)
);

create table public.saved_machines (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  make text not null,
  model text not null,
  year integer check (year is null or year between 1900 and 2100),
  created_at timestamptz not null default now()
);
create index saved_machines_profile_idx on public.saved_machines (profile_id);

alter table public.b2b_accounts add column locale text not null default 'en';
alter table public.orders add column restocked jsonb not null default '{}';
alter table public.purchase_orders add column supplier_email text, add column sent_at timestamptz;
create index orders_created_idx on public.orders (created_at desc);

alter table public.newsletter_subscribers enable row level security;
alter table public.wishlists enable row level security;
alter table public.saved_machines enable row level security;
revoke all on public.newsletter_subscribers, public.wishlists, public.saved_machines from anon, authenticated;
