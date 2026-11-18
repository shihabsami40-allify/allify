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
