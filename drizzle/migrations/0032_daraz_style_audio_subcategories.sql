UPDATE public.categories
SET name_bn = 'অডিও', name_en = 'Audio'
WHERE slug = 'electronics-audio';

UPDATE public.categories
SET parent_id = (SELECT id FROM public.categories WHERE slug = 'electronics-audio'),
    sort_order = 1
WHERE slug = 'electronics-headphones'
  AND EXISTS (SELECT 1 FROM public.categories WHERE slug = 'electronics-audio');

INSERT INTO public.categories (slug, name_bn, name_en, icon, sort_order, parent_id)
SELECT 'electronics-speakers', 'স্পিকার', 'Speakers', 'Speaker', 2, id
FROM public.categories
WHERE slug = 'electronics-audio'
ON CONFLICT (slug) DO UPDATE
SET name_bn = EXCLUDED.name_bn,
    name_en = EXCLUDED.name_en,
    parent_id = EXCLUDED.parent_id,
    sort_order = EXCLUDED.sort_order;
