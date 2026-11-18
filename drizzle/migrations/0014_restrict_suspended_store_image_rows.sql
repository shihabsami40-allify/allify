-- Close the product_images table-policy bypass left by the original owner-write policy.
-- Sellers may manage image rows only while their own store is active and non-demo.
-- Admin moderation access is retained.
DROP POLICY IF EXISTS "images owner write" ON public.product_images;

CREATE POLICY "images owner write" ON public.product_images
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.seller_stores s ON s.id = p.store_id
    WHERE p.id = product_id
      AND s.owner_id = auth.uid()
      AND s.status = 'active'
      AND s.is_demo = false
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.seller_stores s ON s.id = p.store_id
    WHERE p.id = product_id
      AND s.owner_id = auth.uid()
      AND s.status = 'active'
      AND s.is_demo = false
  )
);
