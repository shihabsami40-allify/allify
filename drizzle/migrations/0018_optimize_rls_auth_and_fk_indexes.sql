-- Optimize RLS auth context evaluation and add missing FK covering indexes.
-- The policy predicates are unchanged semantically; auth.uid() is evaluated once
-- per statement through a scalar subquery rather than once per candidate row.

do $$
declare
  p record;
  using_expr text;
  check_expr text;
  statement text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%'
      )
  loop
    using_expr := case
      when p.qual is null then null
      else replace(p.qual, 'auth.uid()', '(select auth.uid())')
    end;
    check_expr := case
      when p.with_check is null then null
      else replace(p.with_check, 'auth.uid()', '(select auth.uid())')
    end;

    statement := format(
      'alter policy %I on %I.%I',
      p.policyname, p.schemaname, p.tablename
    );
    if using_expr is not null then
      statement := statement || format(' using (%s)', using_expr);
    end if;
    if check_expr is not null then
      statement := statement || format(' with check (%s)', check_expr);
    end if;
    execute statement;
  end loop;
end
$$;

create index if not exists cart_items_product_id_idx
  on public.cart_items (product_id);
create index if not exists order_items_product_id_idx
  on public.order_items (product_id);
create index if not exists product_images_product_id_idx
  on public.product_images (product_id);
