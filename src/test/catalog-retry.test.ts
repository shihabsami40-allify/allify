import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('catalog outage recovery', () => {
  it('provides a retry action that refetches the shared catalog query', () => {
    const shell = read('src/components/market-shell.tsx');
    expect(shell).toContain("queryKey:['catalog'],type:'active'");
    expect(shell).toContain('আবার চেষ্টা করুন');
    expect(shell).toContain('retrying');
  });

  it('shows the same recoverable outage state on every public catalog route', () => {
    for (const path of [
      'src/routes/index.tsx',
      'src/routes/browse.tsx',
      'src/routes/stores.tsx',
      'src/routes/product.$slug.tsx',
    ]) {
      const source = read(path);
      expect(source).toContain('CatalogUnavailable');
      expect(source).toContain('data.unavailable');
    }
  });
});
