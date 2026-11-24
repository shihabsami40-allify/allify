# ALLIFY legacy category RLS policy cleanup — 2026-11-24

Applied directly to production Supabase project `onqadpqdontbdvecnvby`.

The legacy `public.legacy_categories` table had an admin `FOR ALL` policy overlapping its public-read `SELECT` policy. Replaced the broad admin policy with separate INSERT, UPDATE, and DELETE policies so SELECT is handled only by the public-read policy (which also allows admins to read inactive rows).

```sql
DROP POLICY IF EXISTS categories_admin_manage ON public.legacy_categories;
CREATE POLICY categories_admin_insert ON public.legacy_categories
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY categories_admin_update ON public.legacy_categories
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY categories_admin_delete ON public.legacy_categories
  FOR DELETE TO authenticated USING (public.is_admin());
```

Verification: queried `pg_policies` after applying. The table now has exactly one policy per action: admin INSERT, admin UPDATE, admin DELETE, and public/active + admin SELECT. Supabase performance advisor no longer reports `multiple_permissive_policies` for this table.

No user data was changed or deleted.
