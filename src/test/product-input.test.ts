import { describe, expect, it } from "vitest";

import { validateSellerProductNumbers, validateSellerProductTitle } from "@/lib/product-input";

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

  it.each(["", "0", "-1", "NaN", "Infinity", "10000000", "100000001"])("rejects invalid price %s", (price) => {
    expect(validateSellerProductNumbers(price, 0, "")).toMatchObject({ ok: false });
  });

  it.each(["-1", "1.5", "100001", "NaN", "Infinity"])("rejects invalid stock %s", (stock) => {
    expect(validateSellerProductNumbers("100", stock, "")).toMatchObject({ ok: false });
  });

  it.each(["0", "-1", "NaN", "Infinity", "100000000", "100"])(
    "rejects invalid comparison price %s",
    (comparePrice) => {
      expect(validateSellerProductNumbers("100", 0, comparePrice)).toMatchObject({ ok: false });
    },
  );

  it.each([true, false, [], {}])("rejects non-string/non-number price input %s", (price) => {
    expect(validateSellerProductNumbers(price, 0, "")).toMatchObject({ ok: false });
  });

  it("rejects non-string/non-number stock input", () => {
    expect(validateSellerProductNumbers("100", true, "")).toMatchObject({ ok: false });
  });

  it("rejects non-string/non-number comparison price input", () => {
    expect(validateSellerProductNumbers("100", 0, true)).toMatchObject({ ok: false });
  });

  it("rejects a comparison price below the sale price", () => {
    expect(validateSellerProductNumbers("100", 0, "90")).toMatchObject({ ok: false });
  });
});

describe("validateSellerProductTitle", () => {
  it("trims and accepts a title within the database length limit", () => {
    expect(validateSellerProductTitle("  সুন্দর পণ্য  ")).toEqual({
      ok: true,
      value: "সুন্দর পণ্য",
    });
    expect(validateSellerProductTitle("ক".repeat(120))).toMatchObject({ ok: true });
  });

  it.each(["", " ", "ক", "ক".repeat(121), null, 42, true])(
    "rejects an invalid product title %s",
    (title) => {
      expect(validateSellerProductTitle(title)).toMatchObject({ ok: false });
    },
  );
});
