-- Sales tax rates, editable email templates and shipment tracking for the admin panel.
-- Row level security with no policies: only the server reaches these tables, after its own checks.
-- Customers see a shipment only through its unguessable code, and only the fields the server chooses.

create table public.tax_rates (
  state char(2) primary key,
  rate_bps integer not null check (rate_bps between 0 and 2000),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.email_templates (
  key text primary key,
  enabled boolean not null default true,
  subject_en text not null,
  body_en text not null,
  subject_es text not null,
  body_es text not null,
  updated_at timestamptz not null default now()
);

create type public.shipment_status as enum ('label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception');

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  code text not null unique,
  carrier text not null,
  tracking_number text,
  status public.shipment_status not null default 'label_created',
  created_at timestamptz not null default now()
);

create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  status public.shipment_status not null,
  location text,
  note text,
  occurred_at timestamptz not null default now()
);
create index shipment_events_shipment_idx on public.shipment_events (shipment_id, occurred_at);

alter table public.tax_rates enable row level security;
alter table public.email_templates enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
revoke all on public.tax_rates, public.email_templates, public.shipments, public.shipment_events from anon, authenticated;
