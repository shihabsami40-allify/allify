export type StoredCartLine = {
  product: {
    id: string;
    title_bn: string;
    price: number;
    stock: number;
    seller_stores?: { is_demo?: boolean } | null;
    [key: string]: unknown;
  };
  quantity: number;
};

/**
 * Treat localStorage as untrusted input. Keep only purchasable, well-shaped
 * product snapshots and prevent duplicate IDs or quantities above current stock.
 */
export function sanitizeStoredCart(value: unknown): StoredCartLine[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const safe: StoredCartLine[] = [];

  for (const candidate of value) {
    if (safe.length >= 50 || !candidate || typeof candidate !== "object") continue;

    const line = candidate as Record<string, unknown>;
    const product = line.product;
    if (!product || typeof product !== "object" || Array.isArray(product)) continue;

    const item = product as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const title = typeof item.title_bn === "string" ? item.title_bn.trim() : "";
    const price = item.price;
    const stock = item.stock;
    const quantity = line.quantity;
    const seller = item.seller_stores;

    if (
      !id ||
      seen.has(id) ||
      !title ||
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price <= 0 ||
      typeof stock !== "number" ||
      !Number.isInteger(stock) ||
      stock < 1 ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99 ||
      quantity > stock ||
      (seller !== null && seller !== undefined && (typeof seller !== "object" || Array.isArray(seller))) ||
      (seller && typeof (seller as Record<string, unknown>).is_demo !== "undefined" && typeof (seller as Record<string, unknown>).is_demo !== "boolean") ||
      (seller && (seller as Record<string, unknown>).is_demo === true)
    ) continue;

    seen.add(id);
    safe.push({
      product: { ...item, id, title_bn: title } as StoredCartLine["product"],
      quantity,
    });
  }

  return safe;
}
