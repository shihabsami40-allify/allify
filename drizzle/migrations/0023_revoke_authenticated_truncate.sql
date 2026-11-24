-- RLS policies do not apply to TRUNCATE. Never expose table-wide truncation to API users.
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee = 'authenticated'
      AND privilege_type = 'TRUNCATE'
  ) THEN
    RAISE EXCEPTION 'Authenticated TRUNCATE privilege remains on a public table';
  END IF;
END;
$$;
