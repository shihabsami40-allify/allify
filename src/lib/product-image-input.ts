const ALLOWED_PRODUCT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export type SellerProductImageInput = {
  type: string;
  size: number;
};

export function validateSellerProductImage(file: SellerProductImageInput) {
  if (!ALLOWED_PRODUCT_IMAGE_TYPES.has(file.type)) {
    return { ok: false as const, error: "শুধু JPG, PNG বা WebP ছবি আপলোড করা যাবে।" };
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false as const, error: "ছবির ফাইলটি খালি বা অবৈধ।" };
  }

  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return { ok: false as const, error: "ছবির আকার সর্বোচ্চ ৫ MB হতে পারবে।" };
  }

  return { ok: true as const };
}

export function buildSellerProductImagePath(
  userId: string,
  storeId: string,
  productId: string,
  mimeType: string,
  timestamp: number,
) {
  const segments = [userId, storeId, productId];
  if (segments.some((segment) => !segment || segment.includes("/") || segment.includes("\\"))) {
    return null;
  }

  if (!Number.isSafeInteger(timestamp) || timestamp < 0) return null;

  const extensionByMimeType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensionByMimeType[mimeType];
  if (!extension) return null;

  return userId + "/" + storeId + "/" + productId + "-" + timestamp + "." + extension;
}

export function isProductDeletionConfirmed(result: {
  data?: { id?: string } | null;
  error?: unknown;
}) {
  return !result.error && Boolean(result.data?.id);
}
