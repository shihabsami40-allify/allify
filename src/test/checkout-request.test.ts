import { describe, expect, it } from "vitest";

import {
  buildCheckoutRequestFingerprint,
  type CheckoutRequestFingerprintInput,
} from "@/lib/checkout-request";

const request = (
  overrides: Partial<CheckoutRequestFingerprintInput> = {},
): CheckoutRequestFingerprintInput => ({
  userId: "buyer-1",
  items: [
    { productId: "product-b", quantity: 1 },
    { productId: "product-a", quantity: 2 },
  ],
  recipient: "Buyer",
  phone: "01712345678",
  area: "Chattogram",
  address: "Agrabad, Chattogram",
  note: "",
  saveAddress: false,
  ...overrides,
});

describe("buildCheckoutRequestFingerprint", () => {
  it("is stable when the same cart lines are displayed in a different order", () => {
    const original = request();
    const reordered = request({
      items: [
        { productId: "product-a", quantity: 2 },
        { productId: "product-b", quantity: 1 },
      ],
    });

    expect(buildCheckoutRequestFingerprint(original)).toBe(
      buildCheckoutRequestFingerprint(reordered),
    );
  });

  it("changes when a product quantity changes", () => {
    const original = request();
    const changed = request({
      items: [
        { productId: "product-b", quantity: 1 },
        { productId: "product-a", quantity: 3 },
      ],
    });

    expect(buildCheckoutRequestFingerprint(original)).not.toBe(
      buildCheckoutRequestFingerprint(changed),
    );
  });

  const changedFields: Array<[string, Partial<CheckoutRequestFingerprintInput>]> = [
    ["buyer", { userId: "buyer-2" }],
    ["recipient", { recipient: "Another buyer" }],
    ["phone", { phone: "01812345678" }],
    ["area", { area: "Pahartali" }],
    ["address", { address: "Pahartali, Chattogram" }],
    ["note", { note: "Call before delivery" }],
    ["saved-address preference", { saveAddress: true }],
  ];

  it.each(changedFields)("changes when the %s changes", (_field, overrides) => {
    expect(buildCheckoutRequestFingerprint(request())).not.toBe(
      buildCheckoutRequestFingerprint(request(overrides)),
    );
  });
});
