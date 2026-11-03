-- English and Spanish. English stays in the existing columns; a blank Spanish
-- field falls back to English, so an untranslated product is still sellable.

alter table public.categories
  add column name_es text,
  add column description_es text,
  add column tag_es text;

alter table public.products
  add column name_es text,
  add column description_es text;

-- Search finds a product by its name in either language.
alter table public.products drop column search;
alter table public.products add column search tsvector generated always as (
  to_tsvector('simple',
    coalesce(name, '') || ' ' || coalesce(name_es, '') || ' ' || coalesce(sku, '') || ' ' || coalesce(brand, '') || ' ' ||
    coalesce(tire_size, '') || ' ' || coalesce(equipment_make, '') || ' ' || coalesce(equipment_model, ''))
) stored;
create index products_search_idx on public.products using gin (search);

-- The language each customer used, so emails and replies go out in it.
alter table public.profiles add column locale text not null default 'en' check (locale in ('en', 'es'));
alter table public.orders add column locale text not null default 'en' check (locale in ('en', 'es'));
alter table public.quote_requests add column locale text not null default 'en' check (locale in ('en', 'es'));

update public.categories set name_es = 'Llantas y ruedas', description_es = 'Pensadas para el trabajo que haces.', tag_es = 'LA TRACCIÓN IMPORTA' where id = 'tires';
update public.categories set name_es = 'Piezas y componentes', description_es = 'Componentes esenciales, sin complicaciones.', tag_es = 'SIEMPRE EN MARCHA' where id = 'parts';
update public.categories set name_es = 'Equipos e implementos', description_es = 'Soluciones para cada temporada.', tag_es = 'LISTOS PARA TRABAJAR' where id = 'equipment';
update public.categories set name_es = 'Taller y mantenimiento', description_es = 'Para los trabajos entre trabajos.', tag_es = 'ESENCIALES DEL DÍA A DÍA' where id = 'maintenance';
update public.categories set name_es = 'Tecnología agrícola', description_es = 'Herramientas más inteligentes para la agricultura moderna.', tag_es = 'CULTIVA CON INTELIGENCIA' where id = 'technology';
