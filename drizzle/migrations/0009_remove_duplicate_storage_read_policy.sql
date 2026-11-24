-- Keep the canonical public-read Storage policy and remove its duplicate.
drop policy if exists "product images public read" on storage.objects;
