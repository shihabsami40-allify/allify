import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const route = readFileSync(
  resolve(process.cwd(), 'src/routes/reset-password.tsx'),
  'utf8',
);

describe('password recovery route contract', () => {
  it('supports both recovery URL hashes and the Supabase recovery auth event', () => {
    expect(route).toContain('hasRecoveryHash(window.location.hash)');
    expect(route).toContain("event==='PASSWORD_RECOVERY'");
    expect(route).toContain('supabase.auth.onAuthStateChange');
  });

  it('unsubscribes from the auth event listener when the route unmounts', () => {
    expect(route).toContain('return ()=>subscription.unsubscribe()');
  });

  it('requires matching passwords before updating the account', () => {
    expect(route).toContain('password!==confirm');
    expect(route).toContain('supabase.auth.updateUser({password})');
  });

  it('does not show the password form before a recovery session is confirmed', () => {
    expect(route).toContain('{recovery?<>' );
    expect(route).toContain('ইমেইলে পাঠানো পাসওয়ার্ড পুনরুদ্ধারের লিংক দিয়ে এই পৃষ্ঠা খুলুন।');
  });
});
