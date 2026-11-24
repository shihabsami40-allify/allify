-- Remove PostgreSQL's global default EXECUTE grant for newly created functions.
-- Schema-scoped default ACL revokes cannot cancel the global PUBLIC grant.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) x
    WHERE d.defaclrole = 'postgres'::regrole
      AND (d.defaclnamespace = 0 OR d.defaclnamespace = 'public'::regnamespace)
      AND d.defaclobjtype = 'f'
      AND x.grantee IN (0, 'anon'::regrole, 'authenticated'::regrole)
      AND x.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Global/public postgres default function EXECUTE remains for PUBLIC/API roles';
  END IF;
END;
$$;
