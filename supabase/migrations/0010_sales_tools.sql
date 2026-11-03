-- Payment links, business accounts, volume prices, reminders and verified reviews.
-- Row level security with no policies: only the server reaches the new tables, so a customer
-- can never edit their own discount or approve their own review.

alter type public.order_status add value if not exists 'on_terms';

alter table public.orders
  add column quote_id uuid references public.quote_requests (id) on delete set null,
  add column pay_token text unique,
  add column pay_expires_at timestamptz,
  add column invoice_due_at timestamptz,
  add column invoice_paid_at timestamptz;

create table public.product_sales_rules (
  product_id uuid primary key references public.products (id) on delete cascade,
  reorder_days integer check (reorder_days is null or reorder_days between 1 and 3650),
  volume jsonb not null default '[]'
);

create table public.b2b_accounts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null,
  company text not null,
  tax_id text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  discount_bps integer not null default 0 check (discount_bps between 0 and 9000),
  terms_days integer not null default 0 check (terms_days between 0 and 180),
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  author text not null,
  body text not null,
  locale text not null default 'en',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);
create index reviews_product_idx on public.reviews (product_id) where status = 'approved';

create table public.email_optouts (
  email text primary key,
  created_at timestamptz not null default now()
);

-- A reminder is sent once: inserting its key is what claims it.
create table public.email_reminders (
  key text primary key,
  sent_at timestamptz not null default now()
);

alter table public.product_sales_rules enable row level security;
alter table public.b2b_accounts enable row level security;
alter table public.reviews enable row level security;
alter table public.email_optouts enable row level security;
alter table public.email_reminders enable row level security;
revoke all on public.product_sales_rules, public.b2b_accounts, public.reviews, public.email_optouts, public.email_reminders from anon, authenticated;
