export function readStoredJson<T>(key:string,fallback:T,validate:(value:unknown)=>value is T):T {
 try {
  if(typeof window==='undefined') return fallback;
  const raw=window.localStorage.getItem(key);
  if(raw===null) return fallback;
  const value:unknown=JSON.parse(raw);
  return validate(value)?value:fallback;
 } catch { return fallback; }
}
export function writeStoredJson(key:string,value:unknown):void {
 try { if(typeof window!=='undefined') window.localStorage.setItem(key,JSON.stringify(value)); } catch { /* Storage may be disabled or full. */ }
}
export function removeStoredValue(key:string):void {
 try { if(typeof window!=='undefined') window.localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
}
