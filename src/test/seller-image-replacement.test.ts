import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const source=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');

describe('seller temporary image replacement',()=>{
 it('keeps the previous temporary image selected when its cleanup fails',()=>{
  const cleanupCheck=source.indexOf("if(previousCleanup.error)");
  const stateSwitch=source.indexOf("setUploadedImagePath(uploaded.data.path)",cleanupCheck);
  expect(cleanupCheck).toBeGreaterThan(-1);
  expect(source.indexOf("remove([uploaded.data.path])",cleanupCheck)).toBeGreaterThan(cleanupCheck);
  expect(stateSwitch).toBeGreaterThan(cleanupCheck);
  expect(source.slice(cleanupCheck,stateSwitch)).toContain("throw new Error('আগের অস্থায়ী ছবিটি পরিষ্কার করা যায়নি; নতুন ছবি যোগ করা হয়নি।')");
 });
});

 it('does not discard a temporary upload when storage cleanup fails',()=>{
  const discard=source.slice(source.indexOf('const discardPendingImage='),source.indexOf('useEffect('));
  expect(discard).toContain('await supabase.storage.from(\'product-images\').remove([uploadedImagePath])');
  expect(discard.indexOf('if(cleanup.error)')).toBeGreaterThan(-1);
  expect(discard.indexOf('setUploadedImagePath(null)')).toBeGreaterThan(discard.indexOf('if(cleanup.error)'));
  expect(discard).toContain('return false');
 });
 it('waits for temporary-image cleanup before switching product forms',()=>{
  expect(source).toContain("if(await discardPendingImage()){setImageUrl('');setUploadedImagePath(null);setEdit('new');}");
  expect(source).toContain('if(await discardPendingImage())setEdit(p)');
  expect(source).toContain('if(await discardPendingImage())setEdit(null)');
  expect(source).toContain('disabled={busy||imageUploading}');
 });


describe('new product image form reset',()=>{
 it('clears the previous image URL before reopening a new product form',()=>{
  expect(source).toContain("if(await discardPendingImage()){setImageUrl('');setUploadedImagePath(null);setEdit('new');}");
 });
});
