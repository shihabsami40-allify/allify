import { describe, expect, it } from "vitest";

import { canPurchaseProduct, sanitizeStoredCart } from "@/lib/cart-validation";

const product = (overrides: Record<string, unknown> = {}) => ({
  id: "product-1",
  title_bn: "শার্ট",
  price: 850,
  stock: 5,
  seller_stores: { is_demo: false },
  ...overrides,
});

describe("sanitizeStoredCart", () => {
  it("keeps a valid cart line", () => {
    expect(sanitizeStoredCart([{ product: product(), quantity: 2 }])).toEqual([
      { product: product(), quantity: 2 },
    ]);
  });

  it.each([null, undefined, {}, "invalid", 42])(
    "returns an empty cart for non-array input",
    (value) => {
      expect(sanitizeStoredCart(value)).toEqual([]);
    },
  );

  it("drops malformed lines and invalid product snapshots", () => {
    expect(
      sanitizeStoredCart([
        null,
        { product: null, quantity: 1 },
        { product: product({ price: Number.NaN }), quantity: 1 },
        { product: product({ stock: -1 }), quantity: 1 },
        { product: product({ title_bn: " " }), quantity: 1 },
        { product: product({ id: "" }), quantity: 1 },
      ]),
    ).toEqual([]);
  });

  it("drops non-integer, non-positive, over-limit and over-stock quantities", () => {
    expect(
      sanitizeStoredCart([
        { product: product(), quantity: 0 },
        { product: product(), quantity: 1.5 },
        { product: product(), quantity: 100 },
        { product: product(), quantity: 6 },
      ]),
    ).toEqual([]);
  });

  it("removes demo products and duplicate product IDs", () => {
    expect(
      sanitizeStoredCart([
        { product: product({ id: "demo", seller_stores: { is_demo: true } }), quantity: 1 },
        { product: product(), quantity: 2 },
        { product: product({ title_bn: "অন্য নাম" }), quantity: 1 },
      ]),
    ).toEqual([{ product: product(), quantity: 2 }]);
  });

  it("normalizes product IDs and titles before storing accepted rows", () => {
    expect(
      sanitizeStoredCart([
        { product: product({ id: "  product-1  ", title_bn: "  শার্ট  " }), quantity: 1 },
      ]),
    ).toEqual([{ product: product({ id: "product-1", title_bn: "শার্ট" }), quantity: 1 }]);
  });

  it("rejects malformed seller relation shapes without treating them as real stores", () => {
    expect(
      sanitizeStoredCart([
        { product: product({ seller_stores: [] }), quantity: 1 },
        { product: product({ seller_stores: { is_demo: "false" } }), quantity: 1 },
      ]),
    ).toEqual([]);
  });

  it("deduplicates IDs after trimming whitespace", () => {
    expect(
      sanitizeStoredCart([
        { product: product({ id: "product-1" }), quantity: 1 },
        { product: product({ id: "  product-1  ", title_bn: "অন্য নাম" }), quantity: 2 },
      ]),
    ).toEqual([{ product: product(), quantity: 1 }]);
  });

  it("limits the cart to 50 distinct lines", () => {
    const lines = Array.from({ length: 55 }, (_, index) => ({
      product: product({ id: `product-${index}` }),
      quantity: 1,
    }));
    expect(sanitizeStoredCart(lines)).toHaveLength(50);
  });
});


describe("canPurchaseProduct", () => {
  it("allows an in-stock product from a real store", () => {
    expect(canPurchaseProduct({ stock: 3, seller_stores: { is_demo: false } })).toBe(true);
  });

  it("blocks demo products even when they have stock", () => {
    expect(canPurchaseProduct({ stock: 3, seller_stores: { is_demo: true } })).toBe(false);
  });

  it("blocks products with no valid stock", () => {
    expect(canPurchaseProduct({ stock: 0 })).toBe(false);
    expect(canPurchaseProduct({ stock: 1.5 })).toBe(false);
  });
});
