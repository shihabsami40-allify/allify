import {describe,expect,it} from 'vitest';
import {filterCatalogProducts} from '@/lib/catalog-query';
import type {Product} from '@/lib/marketplace';

const products=[
  {id:'a',title_bn:'শার্ট',title_en:'Shirt',category_id:'clothes',stock:4,price:500,sold_count:12,created_at:'2026-11-01',seller_stores:{name:'আলিফ স্টোর'}},
  {id:'b',title_bn:'জুতা',title_en:'Shoes',category_id:'shoes',stock:0,price:300,sold_count:30,created_at:'2026-11-03',seller_stores:{name:'রহিম ফ্যাশন'}},
  {id:'c',title_bn:'ব্যাগ',title_en:'Bag',category_id:'bags',stock:8,price:900,sold_count:5,created_at:'2026-11-02',seller_stores:{name:'আলিফ স্টোর'}},
] as unknown as Product[];
const categories=[
  {id:'clothes',slug:'clothing'},
  {id:'shoes',slug:'shoes'},
  {id:'bags',slug:'bags'},
] as any;
const filters={
  q:'',category:'',sort:'popular' as const,availability:'all' as const,
};

describe('catalog filtering and sorting',()=>{
  it('matches trimmed case-insensitive text across product names and store names',()=>{
    expect(filterCatalogProducts(products,categories,{...filters,q:'  sHiRt  '}).map(p=>p.id)).toEqual(['a']);
    expect(filterCatalogProducts(products,categories,{...filters,q:'  রহিম  '}).map(p=>p.id)).toEqual(['b']);
  });

  it('filters by the selected category slug',()=>{
    expect(filterCatalogProducts(products,categories,{...filters,category:'clothing'}).map(p=>p.id)).toEqual(['a']);
  });

  it('shows only products with positive stock when requested',()=>{
    expect(filterCatalogProducts(products,categories,{...filters,availability:'in-stock'}).map(p=>p.id)).toEqual(['a','c']);
  });

  it('sorts by price in both directions, newest date, and popularity',()=>{
    expect(filterCatalogProducts(products,categories,{...filters,sort:'low'}).map(p=>p.id)).toEqual(['b','a','c']);
    expect(filterCatalogProducts(products,categories,{...filters,sort:'high'}).map(p=>p.id)).toEqual(['c','a','b']);
    expect(filterCatalogProducts(products,categories,{...filters,sort:'new'}).map(p=>p.id)).toEqual(['b','c','a']);
    expect(filterCatalogProducts(products,categories,filters).map(p=>p.id)).toEqual(['b','a','c']);
  });

  it('returns an empty result for an unknown category without mutating source products',()=>{
    const original=[...products];
    expect(filterCatalogProducts(products,categories,{...filters,category:'unknown'})).toEqual([]);
    expect(products).toEqual(original);
  });
});
