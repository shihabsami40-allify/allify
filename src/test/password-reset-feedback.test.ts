import { describe, expect, it } from "vitest";

import {
  getPasswordResetFeedback,
  PASSWORD_RESET_FEEDBACK_MESSAGE,
} from "@/lib/password-reset-feedback";

const outcomes: Array<[string, unknown]> = [
  ["accepted request", undefined],
  ["unknown account", { code: "user_not_found", message: "User not found" }],
  ["email rate limit", { status: 429, code: "over_email_send_rate_limit", message: "Too many emails" }],
  ["provider failure", { status: 500, message: "SMTP provider internal detail" }],
  ["network failure", new Error("private network diagnostic")],
];

describe("getPasswordResetFeedback", () => {
  it.each(outcomes)("%s returns the same privacy-preserving response", (_label, outcome) => {
    expect(getPasswordResetFeedback(outcome)).toBe(PASSWORD_RESET_FEEDBACK_MESSAGE);
  });
});
