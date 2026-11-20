-- Remove legacy permissive Storage policies that bypass the active-store
-- ownership checks enforced by the newer seller-specific policies.
drop policy if exists "product images own upload" on storage.objects;
drop policy if exists "product images own delete" on storage.objects;
