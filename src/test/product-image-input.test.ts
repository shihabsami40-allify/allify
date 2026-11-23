import { describe, expect, it } from "vitest";

import {
  buildSellerProductImagePath,
  validateSellerProductImage,
} from "@/lib/product-image-input";

describe("validateSellerProductImage", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts supported image type %s", (type) => {
    expect(validateSellerProductImage({ type, size: 1024 })).toEqual({ ok: true });
  });

  it("accepts a file at the 5 MB limit", () => {
    expect(validateSellerProductImage({ type: "image/jpeg", size: 5 * 1024 * 1024 })).toEqual({
      ok: true,
    });
  });

  it.each(["image/gif", "image/svg+xml", "application/pdf", ""])(
    "rejects unsupported type %s",
    (type) => {
      expect(validateSellerProductImage({ type, size: 1024 })).toMatchObject({ ok: false });
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid file size %s", (size) => {
    expect(validateSellerProductImage({ type: "image/jpeg", size })).toMatchObject({ ok: false });
  });

  it("rejects files larger than 5 MB", () => {
    expect(
      validateSellerProductImage({ type: "image/png", size: 5 * 1024 * 1024 + 1 }),
    ).toMatchObject({ ok: false });
  });
});

describe("buildSellerProductImagePath", () => {
  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ])("builds the RLS-compatible two-folder path for %s", (mimeType, extension) => {
    expect(
      buildSellerProductImagePath("user-1", "store-2", "product-3", mimeType, 1234),
    ).toBe("user-1/store-2/product-3-1234." + extension);
  });

  it("rejects path segments that could escape the seller folder", () => {
    expect(buildSellerProductImagePath("user/other", "store-2", "product-3", "image/png", 1234)).toBeNull();
  });

  it("rejects unsupported MIME types and invalid timestamps", () => {
    expect(buildSellerProductImagePath("user-1", "store-2", "product-3", "image/gif", 1234)).toBeNull();
    expect(buildSellerProductImagePath("user-1", "store-2", "product-3", "image/png", -1)).toBeNull();
  });
});
