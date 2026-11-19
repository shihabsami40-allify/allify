import { describe, expect, it } from 'vitest';
import { hasRecoveryHash } from '@/lib/auth';

describe('password recovery link detection', () => {
  it('recognizes Supabase recovery hashes with token parameters', () => {
    expect(hasRecoveryHash('#access_token=example&refresh_token=example&type=recovery')).toBe(true);
  });

  it('recognizes a recovery type when it is the only hash parameter', () => {
    expect(hasRecoveryHash('#type=recovery')).toBe(true);
  });

  it('does not treat signup, invite, or ordinary hashes as recovery links', () => {
    expect(hasRecoveryHash('#type=signup')).toBe(false);
    expect(hasRecoveryHash('#type=invite')).toBe(false);
    expect(hasRecoveryHash('#section=products')).toBe(false);
    expect(hasRecoveryHash('')).toBe(false);
  });

  it('does not accept a recovery marker outside the URL hash parameters', () => {
    expect(hasRecoveryHash('#not_type=recovery')).toBe(false);
    expect(hasRecoveryHash('#type=recovery-extra')).toBe(false);
  });
});
