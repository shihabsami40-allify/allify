-- ALLIFY authoritative Supabase inventory (READ ONLY)
-- Run in the SQL Editor of project onqadpqdontbdvecnvby.
-- This script performs SELECTs only. It does not read auth user data or object contents,
-- and it does not create/alter/drop anything.

-- 1) Public table and column definitions
SELECT table_name, ordinal_position, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 2) Constraints and their definitions
SELECT conrelid::regclass AS table_name, conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

-- 3) Indexes
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4) RLS enabled/forced state
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

-- 5) Policies and their USING / WITH CHECK expressions
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6) Triggers and trigger function identities
SELECT event_object_table AS table_name, trigger_name, event_manipulation,
       action_timing, action_orientation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 7) Public-schema routines, definitions and effective execute grants
SELECT p.oid::regprocedure AS signature, p.prosecdef AS security_definer,
       p.proconfig AS function_settings, pg_get_functiondef(p.oid) AS definition,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname, p.oid::regprocedure::text;

-- 8) Enum labels (including legacy values that must not be silently removed)
SELECT t.typname AS enum_name, e.enumsortorder, e.enumlabel
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- 9) Non-sensitive row counts for public application tables only
SELECT 'categories' AS table_name, count(*) AS row_count FROM public.categories
UNION ALL SELECT 'profiles', count(*) FROM public.profiles
UNION ALL SELECT 'stores', count(*) FROM public.stores
UNION ALL SELECT 'products', count(*) FROM public.products
UNION ALL SELECT 'orders', count(*) FROM public.orders
UNION ALL SELECT 'order_items', count(*) FROM public.order_items
ORDER BY table_name;

-- 10) Storage bucket configuration only; no object names or contents
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY id;

-- 11) Storage object policies and their access predicates; no object names or contents
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- 12) Supabase migration ledger (may be empty or absent depending on migration tooling)
SELECT to_regclass('supabase_migrations.schema_migrations') AS supabase_migration_ledger;

-- 13) Effective table privileges for application roles. This is important when
-- adding parallel target tables without accidentally widening legacy access.
SELECT table_name,
       has_table_privilege('anon', format('public.%I', table_name), 'SELECT') AS anon_select,
       has_table_privilege('anon', format('public.%I', table_name), 'INSERT') AS anon_insert,
       has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT') AS authenticated_select,
       has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT') AS authenticated_insert,
       has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE') AS authenticated_update,
       has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE') AS authenticated_delete,
       has_table_privilege('service_role', format('public.%I', table_name), 'ALL') AS service_role_all
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 14) Sequence privileges. Identity/serial defaults can fail even when table
-- privileges look correct; report sequence access without changing grants.
SELECT sequence_name,
       has_sequence_privilege('anon', format('public.%I', sequence_name), 'USAGE') AS anon_usage,
       has_sequence_privilege('authenticated', format('public.%I', sequence_name), 'USAGE') AS authenticated_usage,
       has_sequence_privilege('service_role', format('public.%I', sequence_name), 'USAGE') AS service_role_usage
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- 15) Existing default privileges. These affect future objects and are not
-- represented by the current per-table grants above.
SELECT COALESCE(r.rolname, 'PUBLIC') AS grantor_role,
       COALESCE(n.nspname, 'all schemas') AS schema_name,
       d.defaclobjtype AS object_type,
       d.defaclacl AS default_acl
FROM pg_default_acl d
LEFT JOIN pg_roles r ON r.oid = d.defaclrole
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
ORDER BY grantor_role, schema_name, object_type;

-- 16) Dependencies on legacy SECURITY DEFINER helpers. Preserve these
-- dependencies until each dependent policy/trigger is migrated and tested.
SELECT p.oid::regprocedure AS referenced_function,
       d.deptype AS dependency_type,
       CASE
         WHEN d.classid = 'pg_policy'::regclass THEN
           (SELECT format('%I.%I policy %I', n.nspname, c.relname, pol.polname)
            FROM pg_policy pol
            JOIN pg_class c ON c.oid = pol.polrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE pol.oid = d.objid)
         WHEN d.classid = 'pg_trigger'::regclass THEN
           (SELECT format('%I.%I trigger %I', n.nspname, c.relname, t.tgname)
            FROM pg_trigger t
            JOIN pg_class c ON c.oid = t.tgrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE t.oid = d.objid)
         ELSE pg_describe_object(d.classid, d.objid, d.objsubid)
       END AS dependent_object
FROM pg_proc p
JOIN pg_namespace pn ON pn.oid = p.pronamespace
JOIN pg_depend d ON d.refclassid = 'pg_proc'::regclass AND d.refobjid = p.oid
WHERE pn.nspname = 'public'
  AND p.proname IN ('is_admin', 'owns_store', 'lookup_order',
                    'place_marketplace_order', 'sync_seller_role')
ORDER BY referenced_function::text, dependent_object;
