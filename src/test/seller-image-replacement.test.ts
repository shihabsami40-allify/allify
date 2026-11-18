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
  expect(source.slice(cleanupCheck,stateSwitch)).toContain('if(rollback.error)setOrphanedImagePaths');
  expect(stateSwitch).toBeGreaterThan(cleanupCheck);
  expect(source.slice(cleanupCheck,stateSwitch)).toContain("throw new Error('আগের অস্থায়ী ছবিটি পরিষ্কার করা যায়নি; নতুন ছবি যোগ করা হয়নি।')");
 });

 it('retains selected and orphaned temporary files when storage cleanup fails',()=>{
  const discard=source.slice(source.indexOf('const discardPendingImage='),source.indexOf('useEffect('));
  expect(discard).toContain('...orphanedImagePaths');
  expect(discard).toContain('for(const path of paths)');
  expect(discard).toContain('if(cleanup.error)failed.push(path)');
  expect(discard).toContain('setOrphanedImagePaths(failed.filter(path=>path!==uploadedImagePath))');
  expect(discard).toContain('if(failed.length)');
  expect(discard).toContain('return false');
 });

 it('waits for temporary-image cleanup before switching product forms',()=>{
  expect(source).toContain("if(await discardPendingImage()){setImageUrl('');setUploadedImagePath(null);setEdit('new');}");
  expect(source).toContain('if(await discardPendingImage())setEdit(p)');
  expect(source).toContain('if(await discardPendingImage())setEdit(null)');
  expect(source).toContain('disabled={busy||imageUploading}');
 });

 it('tracks failed rollback uploads so a later cleanup can retry them',()=>{
  expect(source).toContain('if(rollback.error)setOrphanedImagePaths');
  expect(source).toContain('setOrphanedImagePaths(paths=>[...new Set([...paths,uploaded.data.path])])');
 });

 it('tracks temporary-image cleanup failures after save or upload errors',()=>{
  expect(source).toContain('if(cleanup.error)setOrphanedImagePaths(paths=>[...new Set([...paths,pendingUpload])])');
  expect(source).toContain('if(cleanup.error){setOrphanedImagePaths(paths=>[...new Set([...paths,pendingUpload])])');
 });
});

describe('new product image form reset',()=>{
 it('clears the previous image URL before reopening a new product form',()=>{
  expect(source).toContain("if(await discardPendingImage()){setImageUrl('');setUploadedImagePath(null);setEdit('new');}");
 });
});
