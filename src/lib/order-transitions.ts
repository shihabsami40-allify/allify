export type OrderItemStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

const ALLOWED_ORDER_TRANSITIONS: Readonly<Record<string, readonly OrderItemStatus[]>> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
};

/**
 * Return whether an order item may move directly to the requested lifecycle state.
 * Terminal states (delivered and cancelled) intentionally have no outgoing transitions.
 */
export const canTransitionOrderItemStatus = (current: string, next: string): boolean =>
  ALLOWED_ORDER_TRANSITIONS[current]?.includes(next as OrderItemStatus) ?? false;
