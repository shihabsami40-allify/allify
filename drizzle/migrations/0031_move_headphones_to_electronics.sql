UPDATE public.categories
SET
  slug = 'electronics-headphones',
  name_bn = 'হেডফোন ও ইয়ারফোন',
  name_en = 'Headphones & Earphones',
  parent_id = (SELECT id FROM public.categories WHERE slug = 'electronics'),
  sort_order = 6
WHERE slug IN ('mobile-headphones', 'electronics-headphones')
  AND EXISTS (SELECT 1 FROM public.categories WHERE slug = 'electronics');
