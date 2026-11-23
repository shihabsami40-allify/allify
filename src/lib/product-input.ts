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
  const price = Number(priceInput);
  if (!Number.isFinite(price) || price <= 0 || price > 100000000) {
    return { ok: false, error: "পণ্যের সঠিক মূল্য লিখুন।" };
  }

  const stock = Number(stockInput);
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) {
    return { ok: false, error: "স্টক ০ থেকে ১,০০,০০০-এর মধ্যে পূর্ণসংখ্যা হতে হবে।" };
  }

  const comparePrice =
    comparePriceInput === "" || comparePriceInput === null || comparePriceInput === undefined
      ? null
      : Number(comparePriceInput);

  if (
    comparePrice !== null &&
    (!Number.isFinite(comparePrice) || comparePrice <= price || comparePrice > 100000000)
  ) {
    return { ok: false, error: "তুলনামূলক মূল্য পণ্যের মূল্যের চেয়ে বেশি হতে হবে।" };
  }

  return { ok: true, value: { price, comparePrice, stock } };
};
