export const PASSWORD_RESET_FEEDBACK_MESSAGE =
  "যদি এই ইমেইলে ALLIFY অ্যাকাউন্ট থাকে এবং অনুরোধটি গ্রহণ করা হয়, তাহলে পাসওয়ার্ড রিসেটের নির্দেশনা পাঠানো হবে। ইনবক্স ও Spam ফোল্ডার দেখুন; ইমেইল না এলে কিছুক্ষণ পরে আবার চেষ্টা করুন।";

/**
 * Keep the password-reset response identical for successful, unknown-account,
 * rate-limit, provider and network outcomes so the UI cannot reveal account
 * existence or expose Auth provider details.
 */
export function getPasswordResetFeedback(error?: unknown): string {
  void error;
  return PASSWORD_RESET_FEEDBACK_MESSAGE;
}
