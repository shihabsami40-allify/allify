import { describe, expect, it } from "vitest";

import { canTransitionOrderItemStatus } from "@/lib/order-transitions";

describe("canTransitionOrderItemStatus", () => {
  it.each([
    ["pending", "confirmed"],
    ["pending", "cancelled"],
    ["confirmed", "shipped"],
    ["confirmed", "cancelled"],
    ["shipped", "delivered"],
  ])("allows %s -> %s", (current, next) => {
    expect(canTransitionOrderItemStatus(current, next)).toBe(true);
  });

  it.each([
    ["pending", "pending"],
    ["pending", "shipped"],
    ["pending", "delivered"],
    ["confirmed", "pending"],
    ["confirmed", "confirmed"],
    ["confirmed", "delivered"],
    ["shipped", "pending"],
    ["shipped", "confirmed"],
    ["shipped", "cancelled"],
    ["delivered", "cancelled"],
    ["cancelled", "pending"],
    ["cancelled", "confirmed"],
    ["unknown", "pending"],
  ])("rejects %s -> %s", (current, next) => {
    expect(canTransitionOrderItemStatus(current, next)).toBe(false);
  });
});
