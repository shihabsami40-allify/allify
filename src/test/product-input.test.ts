import { describe, expect, it } from "vitest";

import { validateSellerProductNumbers } from "@/lib/product-input";

describe("validateSellerProductNumbers", () => {
  it("accepts a valid price, optional comparison price and integer stock", () => {
    expect(validateSellerProductNumbers("1250", "8", "1500")).toEqual({
      ok: true,
      value: { price: 1250, comparePrice: 1500, stock: 8 },
    });
  });

  it("allows omitted comparison price and zero stock", () => {
    expect(validateSellerProductNumbers("1250", 0, "")).toEqual({
      ok: true,
      value: { price: 1250, comparePrice: null, stock: 0 },
    });
  });

  it.each(["", "0", "-1", "NaN", "Infinity", "100000001"])(
    "rejects invalid price %s",
    (price) => {
      expect(validateSellerProductNumbers(price, 0, "")).toMatchObject({ ok: false });
    },
  );

  it.each(["-1", "1.5", "100001", "NaN", "Infinity"])(
    "rejects invalid stock %s",
    (stock) => {
      expect(validateSellerProductNumbers("100", stock, "")).toMatchObject({ ok: false });
    },
  );

  it.each(["0", "-1", "NaN", "Infinity", "100000001", "100"])(
    "rejects invalid comparison price %s",
    (comparePrice) => {
      expect(validateSellerProductNumbers("100", 0, comparePrice)).toMatchObject({ ok: false });
    },
  );

  it("rejects a comparison price below the sale price", () => {
    expect(validateSellerProductNumbers("100", 0, "90")).toMatchObject({ ok: false });
  });
});
