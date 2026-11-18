import {afterEach,describe,expect,it,vi} from 'vitest';
import {readStoredJson,removeStoredValue,writeStoredJson} from '@/lib/browser-storage';
afterEach(()=>{vi.restoreAllMocks();window.localStorage.clear();});
const isStringArray=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(item=>typeof item==='string');
describe('browser storage safeguards',()=>{
 it('returns a fallback for malformed or invalid persisted JSON',()=>{window.localStorage.setItem('test','{bad json');expect(readStoredJson('test',['safe'],isStringArray)).toEqual(['safe']);window.localStorage.setItem('test','[1,2]');expect(readStoredJson('test',['safe'],isStringArray)).toEqual(['safe']);});
 it('reads valid persisted data',()=>{window.localStorage.setItem('test','["one","two"]');expect(readStoredJson('test',[],isStringArray)).toEqual(['one','two']);});
 it('does not throw when browser storage reads are blocked',()=>{vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked');});expect(readStoredJson('test',['safe'],isStringArray)).toEqual(['safe']);});
 it('does not throw when writes or removals are blocked',()=>{vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('blocked');});vi.spyOn(Storage.prototype,'removeItem').mockImplementation(()=>{throw new Error('blocked');});expect(()=>writeStoredJson('test',{ok:true})).not.toThrow();expect(()=>removeStoredValue('test')).not.toThrow();});
});
