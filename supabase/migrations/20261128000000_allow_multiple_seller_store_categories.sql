ALTER TABLE public.seller_applications
  DROP CONSTRAINT IF EXISTS seller_applications_category_hint_check;

ALTER TABLE public.seller_applications
  ADD CONSTRAINT seller_applications_category_hint_check
  CHECK (char_length(category_hint) <= 1000);
