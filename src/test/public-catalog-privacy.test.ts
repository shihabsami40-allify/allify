import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const source=readFileSync(resolve(process.cwd(),'src/lib/marketplace.functions.ts'),'utf8');
const storePage=readFileSync(resolve(process.cwd(),'src/routes/store.$slug.tsx'),'utf8');

describe('public catalog data minimization',()=>{
 it('selects only public storefront fields for the public catalog',()=>{
  expect(source).toContain("db.from('seller_stores').select('id,name,name_en,slug,description,area,rating,is_demo,logo_url,banner_url,created_at,status').eq('status','active')");
  expect(source).not.toContain("db.from('seller_stores').select('*').eq('status','active')");
 });
});

describe('storefront branding',()=>{
 it('renders the saved banner and logo only after validating their URLs',()=>{
  expect(storePage).toContain('const banner=s.banner_url&&safeImageUrl(s.banner_url)?s.banner_url:null');
  expect(storePage).toContain('const logo=s.logo_url&&safeImageUrl(s.logo_url)?s.logo_url:null');
  expect(storePage).toContain('<img src={banner} alt=""');
  expect(storePage).toContain('<img src={logo} alt={s.name}');
 });
 it('keeps a neutral store icon when no valid logo is available',()=>{
  expect(storePage).toContain('{logo?<img src={logo} alt={s.name}');
  expect(storePage).toContain(':<Store className="size-10 text-primary"/>');
 });
});
