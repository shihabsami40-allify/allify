export function getSellerApplicationSubmitError(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
    return "তোমার একটি আবেদন ইতিমধ্যে পর্যালোচনার অপেক্ষায় আছে।";
  }

  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message || "আবেদন জমা হয়নি।";
  }

  return "আবেদন জমা হয়নি।";
}
