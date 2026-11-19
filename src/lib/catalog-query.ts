import {queryOptions} from '@tanstack/react-query';
import {getCatalog} from './marketplace.functions';
import type {Catalog, Product} from './marketplace';

export type CatalogFilters = {
  q: string;
  category: string;
  sort: 'popular' | 'low' | 'high' | 'new';
  availability: 'all' | 'in-stock';
};

export function filterCatalogProducts(
  products: Product[],
  categories: Catalog['categories'],
  filters: CatalogFilters,
): Product[] {
  const query = filters.q.trim().toLocaleLowerCase();
  const categoryId = filters.category
    ? categories.find((category) => category.slug === filters.category)?.id
    : undefined;

  return products
    .filter((product) => {
      if (filters.category && product.category_id !== categoryId) return false;
      if (filters.availability === 'in-stock' && product.stock <= 0) return false;
      return [product.title_bn, product.title_en, product.seller_stores?.name].some(
        (value) => value?.toLocaleLowerCase().includes(query),
      );
    })
    .sort((a, b) => {
      if (filters.sort === 'low') return a.price - b.price;
      if (filters.sort === 'high') return b.price - a.price;
      if (filters.sort === 'new') return b.created_at.localeCompare(a.created_at);
      return b.sold_count - a.sold_count;
    });
}

export const catalogOptions=queryOptions({queryKey:['catalog'],queryFn:()=>getCatalog(),staleTime:30000});
