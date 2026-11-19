import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/marketplace/admin-dashboard.tsx'),
  'utf8',
);

describe('admin dashboard safety contract', () => {
  it('requires confirmation before approving or rejecting real seller applications', () => {
    expect(source).toContain('window.confirm');
    expect(source).toContain("action:'approve'");
    expect(source).toContain("action:'reject'");
    expect(source).toContain("a.status==='pending'&&a.user_id");
  });

  it('keeps demo stores and demo orders out of real moderation actions', () => {
    expect(source).toContain('s.is_demo?<span');
    expect(source).toContain('p.seller_stores?.is_demo===true');
    expect(source).toContain('o.is_demo?<p');
  });

  it('labels dashboard totals as real marketplace data, not payment receipts', () => {
    expect(source).toContain('!s.is_demo');
    expect(source).toContain('orderReportTotals(data.orders)');
    expect(source).toContain('এই মূল্য পেমেন্ট প্রাপ্তির প্রমাণ নয়।');
  });

  it('invalidates affected admin, catalog, account and customer order queries after writes', () => {
    expect(source).toContain("queryKey:['admin-management']");
    expect(source).toContain("queryKey:['catalog']");
    expect(source).toContain("queryKey:['account']");
    expect(source).toContain("queryKey:['customer-orders']");
  });
});
