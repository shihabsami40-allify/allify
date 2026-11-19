import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/market-provider.tsx'),
  'utf8',
);

describe('auth session bootstrap race protection', () => {
  it('records auth events before applying their session state', () => {
    expect(source).toContain('const authEventReceived=useRef(false)');
    expect(source).toContain('onAuthStateChange((event,session)=>{authEventReceived.current=true;setUser(session?.user??null)');
  });

  it('does not let a delayed getUser response overwrite a newer auth event', () => {
    expect(source).toContain('getUser().then(({data})=>{if(!authEventReceived.current)setUser(data.user);setAuthReady(true);})');
  });

  it('still marks authentication ready when the initial session lookup fails', () => {
    expect(source).toContain('.catch(()=>setAuthReady(true))');
  });

  it('unsubscribes the auth listener when the provider unmounts', () => {
    expect(source).toContain('return()=>subscription.unsubscribe()');
  });
});
