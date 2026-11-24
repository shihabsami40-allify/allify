export type SellerProductTitleResult = { ok: true; value: string } | { ok: false; error: string };

export const validateSellerProductTitle = (input: unknown): SellerProductTitleResult => {
  const title = typeof input === "string" ? input.trim() : "";
  if (title.length < 2 || title.length > 120) {
    return { ok: false, error: "পণ্যের নাম ২ থেকে ১২০ অক্ষরের মধ্যে লিখুন।" };
  }
  return { ok: true, value: title };
};

export type SellerProductNumbers = {
  price: number;
  comparePrice: number | null;
  stock: number;
};

export type SellerProductNumbersResult =
  | { ok: true; value: SellerProductNumbers }
  | {
      ok: false;
      error: string;
    };

/**
 * Validate numeric values before a seller product is sent to the database.
 * Keep the limits aligned with the seller product-update handler.
 */
export const validateSellerProductNumbers = (
  priceInput: unknown,
  stockInput: unknown,
  comparePriceInput: unknown,
): SellerProductNumbersResult => {
  const price =
    typeof priceInput === "number"
      ? priceInput
      : typeof priceInput === "string" && priceInput.trim() !== ""
        ? Number(priceInput)
        : Number.NaN;
  if (!Number.isFinite(price) || price <= 0 || price >= 10000000) {
    return { ok: false, error: "পণ্যের সঠিক মূল্য লিখুন।" };
  }

  const stock =
    typeof stockInput === "number"
      ? stockInput
      : typeof stockInput === "string" && stockInput.trim() !== ""
        ? Number(stockInput)
        : Number.NaN;
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) {
    return { ok: false, error: "স্টক ০ থেকে ১,০০,০০০-এর মধ্যে পূর্ণসংখ্যা হতে হবে।" };
  }

  const comparePrice =
    comparePriceInput === "" || comparePriceInput === null || comparePriceInput === undefined
      ? null
      : typeof comparePriceInput === "number"
        ? comparePriceInput
        : typeof comparePriceInput === "string" && comparePriceInput.trim() !== ""
          ? Number(comparePriceInput)
          : Number.NaN;

  if (
    comparePrice !== null &&
    (!Number.isFinite(comparePrice) || comparePrice <= price || comparePrice > 99999999.99)
  ) {
    return { ok: false, error: "তুলনামূলক মূল্য পণ্যের মূল্যের চেয়ে বেশি হতে হবে।" };
  }

  return { ok: true, value: { price, comparePrice, stock } };
};
