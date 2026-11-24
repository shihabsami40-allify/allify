import { describe, expect, it } from "vitest";

import { getSellerApplicationSubmitError } from "@/lib/seller-application-error";

describe("getSellerApplicationSubmitError", () => {
  it("explains the database-enforced pending-application conflict", () => {
    expect(getSellerApplicationSubmitError({ code: "23505", message: "duplicate key" })).toBe(
      "তোমার একটি আবেদন ইতিমধ্যে পর্যালোচনার অপেক্ষায় আছে।",
    );
  });

  it("preserves a useful database error message for other failures", () => {
    expect(getSellerApplicationSubmitError({ code: "42501", message: "Permission denied" })).toBe(
      "Permission denied",
    );
  });

  it("uses a safe fallback for unknown errors", () => {
    expect(getSellerApplicationSubmitError(null)).toBe("আবেদন জমা হয়নি।");
  });
});
