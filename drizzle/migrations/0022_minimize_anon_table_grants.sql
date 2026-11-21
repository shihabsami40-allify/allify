-- Reduce anonymous Data API privileges to the public catalog only.
-- RLS remains the row-level boundary; these grants remove unnecessary table operations.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON TABLE
  public.categories,
  public.delivery_areas,
  public.products,
  public.seller_stores,
  public.product_images
TO anon;

DO $$
DECLARE
  v_bad_count integer;
BEGIN
  SELECT count(*) INTO v_bad_count
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND grantee = 'anon'
    AND privilege_type <> 'SELECT';
  IF v_bad_count <> 0 THEN
    RAISE EXCEPTION 'Anonymous role retains non-read table privileges';
  END IF;
END;
$$;
