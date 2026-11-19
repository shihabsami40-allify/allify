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

-- 11) Supabase migration ledger (may be empty or absent depending on migration tooling)
SELECT to_regclass('supabase_migrations.schema_migrations') AS supabase_migration_ledger;
