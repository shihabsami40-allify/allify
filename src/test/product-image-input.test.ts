import { describe, expect, it } from "vitest";

import { validateSellerProductImage } from "@/lib/product-image-input";

describe("validateSellerProductImage", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts supported image type %s", (type) => {
    expect(validateSellerProductImage({ type, size: 1024 })).toEqual({ ok: true });
  });

  it("accepts a file at the 5 MB limit", () => {
    expect(validateSellerProductImage({ type: "image/jpeg", size: 5 * 1024 * 1024 })).toEqual({ ok: true });
  });

  it.each(["image/gif", "image/svg+xml", "application/pdf", ""])("rejects unsupported type %s", (type) => {
    expect(validateSellerProductImage({ type, size: 1024 })).toMatchObject({ ok: false });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid file size %s", (size) => {
    expect(validateSellerProductImage({ type: "image/jpeg", size })).toMatchObject({ ok: false });
  });

  it("rejects files larger than 5 MB", () => {
    expect(validateSellerProductImage({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toMatchObject({ ok: false });
  });
});
