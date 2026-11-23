export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

type OrderItemState = {
  status?: string | null;
};

const ACTIVE_ORDER_STATUS_PRIORITY: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
];

/**
 * Derive the customer-visible parent order status from its item statuses.
 * Cancelled is used only when every item is cancelled; otherwise the first
 * active status in lifecycle priority order represents the parent order.
 */
export const deriveOrderStatus = (items: readonly OrderItemState[]): OrderStatus => {
  if (items.length === 0) return "pending";
  if (items.every((item) => item.status === "cancelled")) return "cancelled";

  return (
    ACTIVE_ORDER_STATUS_PRIORITY.find((status) => items.some((item) => item.status === status)) ??
    "pending"
  );
};
