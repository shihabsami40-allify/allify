import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const source=readFileSync(resolve(process.cwd(),'src/lib/marketplace.functions.ts'),'utf8');

describe('public catalog data minimization',()=>{
 it('selects only public storefront fields for the public catalog',()=>{
  expect(source).toContain("db.from('seller_stores').select('id,name,name_en,slug,description,area,rating,is_demo,logo_url,banner_url,created_at,status').eq('status','active')");
  expect(source).not.toContain("db.from('seller_stores').select('*').eq('status','active')");
 });
});
