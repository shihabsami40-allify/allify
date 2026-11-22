-- Enforce at most one pending seller application per authenticated account.
-- Keep all existing rows intact: if legacy duplicate pending applications exist,
-- stop the migration and require an explicit administrative review before retrying.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.seller_applications
    WHERE user_id IS NOT NULL
      AND status = 'pending'
    GROUP BY user_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate pending seller applications exist; review them explicitly before creating the unique index';
  END IF;
END;
$$;

CREATE UNIQUE INDEX seller_applications_one_pending_per_user
  ON public.seller_applications (user_id)
  WHERE user_id IS NOT NULL
    AND status = 'pending';
