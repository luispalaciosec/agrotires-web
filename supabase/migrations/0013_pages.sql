-- Pages the team builds from blocks in the panel.
-- Row level security with no policies: only the server reaches this table.

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_es text not null default '',
  desc_en text not null default '',
  desc_es text not null default '',
  blocks jsonb not null default '[]',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pages enable row level security;
revoke all on public.pages from anon, authenticated;
