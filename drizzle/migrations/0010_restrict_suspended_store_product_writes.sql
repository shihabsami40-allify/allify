-- Prevent sellers from bypassing suspended-store UI restrictions through the Data API.
-- Admins retain moderation access; owners may write only while their real store is active.
DROP POLICY IF EXISTS "products owner insert" ON public.products;
CREATE POLICY "products owner insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.owns_store(store_id)
      AND EXISTS (
        SELECT 1 FROM public.seller_stores s
        WHERE s.id = store_id
          AND s.status = 'active'
          AND s.is_demo = false
      )
    )
  );

DROP POLICY IF EXISTS "products owner update" ON public.products;
CREATE POLICY "products owner update" ON public.products
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.owns_store(store_id)
      AND EXISTS (
        SELECT 1 FROM public.seller_stores s
        WHERE s.id = store_id
          AND s.status = 'active'
          AND s.is_demo = false
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.owns_store(store_id)
      AND EXISTS (
        SELECT 1 FROM public.seller_stores s
        WHERE s.id = store_id
          AND s.status = 'active'
          AND s.is_demo = false
      )
    )
  );
