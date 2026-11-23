import { describe, expect, it } from "vitest";

import { deriveOrderStatus } from "@/lib/order-status";

describe("deriveOrderStatus", () => {
  it("uses pending for an empty order", () => {
    expect(deriveOrderStatus([])).toBe("pending");
  });

  it("marks an order cancelled only when every item is cancelled", () => {
    expect(deriveOrderStatus([{ status: "cancelled" }, { status: "cancelled" }])).toBe(
      "cancelled",
    );
  });

  it("gives pending items priority over later lifecycle states", () => {
    expect(
      deriveOrderStatus([
        { status: "delivered" },
        { status: "cancelled" },
        { status: "confirmed" },
        { status: "pending" },
      ]),
    ).toBe("pending");
  });

  it("gives confirmed items priority when no item is pending", () => {
    expect(
      deriveOrderStatus([
        { status: "delivered" },
        { status: "cancelled" },
        { status: "shipped" },
        { status: "confirmed" },
      ]),
    ).toBe("confirmed");
  });

  it("gives shipped items priority over delivered and cancelled items", () => {
    expect(
      deriveOrderStatus([{ status: "delivered" }, { status: "cancelled" }, { status: "shipped" }]),
    ).toBe("shipped");
  });

  it("keeps delivered when remaining items are already delivered or cancelled", () => {
    expect(deriveOrderStatus([{ status: "delivered" }, { status: "cancelled" }])).toBe(
      "delivered",
    );
  });

  it("falls back safely for an unexpected item status", () => {
    expect(deriveOrderStatus([{ status: "unknown" }])).toBe("pending");
  });
});
