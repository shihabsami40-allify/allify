-- Prevent future postgres-owned public tables/sequences from regaining unnecessary API grants.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) x
    WHERE d.defaclrole = 'postgres'::regrole
      AND d.defaclnamespace = 'public'::regnamespace
      AND x.grantee IN ('anon'::regrole, 'authenticated'::regrole)
      AND d.defaclobjtype = 'r'
      AND x.privilege_type IN ('TRUNCATE', 'REFERENCES', 'TRIGGER')
  ) THEN
    RAISE EXCEPTION 'Postgres default table privileges still include unnecessary API grants';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) x
    WHERE d.defaclrole = 'postgres'::regrole
      AND d.defaclnamespace = 'public'::regnamespace
      AND x.grantee IN ('anon'::regrole, 'authenticated'::regrole)
      AND d.defaclobjtype = 'S'
  ) THEN
    RAISE EXCEPTION 'Postgres default sequence privileges still include API grants';
  END IF;
END;
$$;
