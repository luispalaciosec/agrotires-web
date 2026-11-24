-- Store-wide switches set from the panel, such as catalog mode.
-- Row level security with no policies: only the server reaches this table.

create table public.store_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;
revoke all on public.store_settings from anon, authenticated;
