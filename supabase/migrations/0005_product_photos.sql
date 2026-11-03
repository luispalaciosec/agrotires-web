-- Product photos uploaded from the admin panel.
-- Anyone can view a photo by its URL. There are no write policies on purpose:
-- only the server, after checking the admin session, can add or remove files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
