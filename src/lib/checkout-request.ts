export type CheckoutRequestItem = {
  productId: string;
  quantity: number;
};

export type CheckoutRequestFingerprintInput = {
  userId: string;
  items: readonly CheckoutRequestItem[];
  recipient: string;
  phone: string;
  area: string;
  address: string;
  note: string;
  saveAddress: boolean;
};

/**
 * Build a stable key for retrying the same checkout request.
 * Cart display order is not part of the order's meaning, so sort by product ID
 * before serializing. All order-affecting fields remain part of the key.
 */
export function buildCheckoutRequestFingerprint(input: CheckoutRequestFingerprintInput): string {
  const items = input.items
    .map(({ productId, quantity }) => ({ product_id: productId, quantity }))
    .sort((left, right) => left.product_id < right.product_id ? -1 : left.product_id > right.product_id ? 1 : 0);

  return JSON.stringify({
    user: input.userId,
    items,
    recipient: input.recipient,
    phone: input.phone,
    area: input.area,
    address: input.address,
    note: input.note,
    save: input.saveAddress,
  });
}
