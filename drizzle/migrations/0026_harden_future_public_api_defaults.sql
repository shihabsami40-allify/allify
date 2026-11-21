-- New postgres-owned API objects must start private; migrations grant only what they need.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) x
    WHERE d.defaclrole = 'postgres'::regrole
      AND d.defaclnamespace = 'public'::regnamespace
      AND d.defaclobjtype = 'r'
      AND x.grantee = 'anon'::regrole
  ) THEN
    RAISE EXCEPTION 'Anonymous default table privileges remain for new public tables';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) x
    WHERE d.defaclrole = 'postgres'::regrole
      AND d.defaclnamespace = 'public'::regnamespace
      AND d.defaclobjtype = 'r'
      AND x.grantee IN ('anon'::regrole, 'authenticated'::regrole)
      AND x.privilege_type = 'MAINTAIN'
  ) THEN
    RAISE EXCEPTION 'API default MAINTAIN privilege remains';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) x
    WHERE d.defaclrole = 'postgres'::regrole
      AND d.defaclnamespace = 'public'::regnamespace
      AND d.defaclobjtype = 'f'
      AND (x.grantee = 0 OR x.grantee IN ('anon'::regrole, 'authenticated'::regrole))
      AND x.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Public/API default function EXECUTE remains';
  END IF;
END;
$$;
