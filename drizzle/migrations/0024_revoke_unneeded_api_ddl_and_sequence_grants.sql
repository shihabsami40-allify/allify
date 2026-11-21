-- API roles do not need DDL-oriented table privileges or direct sequence access.
REVOKE TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND (
        has_table_privilege('anon', c.oid, 'TRIGGER')
        OR has_table_privilege('anon', c.oid, 'REFERENCES')
        OR has_table_privilege('authenticated', c.oid, 'TRIGGER')
        OR has_table_privilege('authenticated', c.oid, 'REFERENCES')
      )
  ) THEN
    RAISE EXCEPTION 'API role retains unnecessary TRIGGER or REFERENCES table privilege';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'S'
      AND (
        has_sequence_privilege('anon', c.oid, 'USAGE')
        OR has_sequence_privilege('anon', c.oid, 'SELECT')
        OR has_sequence_privilege('anon', c.oid, 'UPDATE')
        OR has_sequence_privilege('authenticated', c.oid, 'USAGE')
        OR has_sequence_privilege('authenticated', c.oid, 'SELECT')
        OR has_sequence_privilege('authenticated', c.oid, 'UPDATE')
      )
  ) THEN
    RAISE EXCEPTION 'API role retains direct sequence privileges';
  END IF;
END;
$$;
