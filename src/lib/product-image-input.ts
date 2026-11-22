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
