-- Fields the admin panel uses, and the store's starting departments.

alter table public.products add column tags text[] not null default '{}';
alter table public.quote_requests add column product_name text;

insert into public.categories (id, name, description, tag, image_path, sort_order) values
  ('tires', 'Tires & Wheels', 'Built around the work you do.', 'TRACTION MATTERS', 'agro-tires.webp', 1),
  ('parts', 'Parts & Components', 'Essential components, simplified.', 'KEEP IT RUNNING', 'agro-hydraulics.webp', 2),
  ('equipment', 'Equipment & Implements', 'Solutions for every season.', 'READY FOR WORK', 'agro-fieldwork.webp', 3),
  ('maintenance', 'Workshop & Maintenance', 'For the jobs between jobs.', 'EVERYDAY ESSENTIALS', 'agro-maintenance.webp', 4),
  ('technology', 'Agricultural Technology', 'Smarter tools for modern farming.', 'FARM SMARTER', 'agro-precision.webp', 5)
on conflict (id) do nothing;
