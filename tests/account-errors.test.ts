import { expect, it } from "vitest";
import { accountError } from "../src/core/account-errors";
it("explains email quota, confirmation and sender restrictions without service branding", () => {
  expect(accountError({ code: "over_email_send_rate_limit" })).toMatchObject({
    kind: "rate",
    waitSeconds: 60,
  });
  expect(accountError({ message: "email rate exceeded" }).kind).toBe("rate");
  expect(accountError({ status: 429 })).toMatchObject({
    kind: "rate",
    waitSeconds: 60,
  });
  expect(accountError({ code: "email_not_confirmed" }).kind).toBe("confirm");
  expect(accountError({ code: "email_address_not_authorized" }).kind).toBe(
    "configuration",
  );
  expect(accountError({ code: "invalid_credentials" }).kind).toBe(
    "credentials",
  );
  expect(accountError({ code: "captcha_failed" }).message).toContain(
    "sign-in protection",
  );
  expect(accountError({ code: "user_banned" })).toMatchObject({
    kind: "access",
    message: expect.stringContaining("banned from classroom access"),
  });
  expect(
    accountError({
      message: "Your account is paused. Please contact your teacher.",
    }).kind,
  ).toBe("access");
  expect(accountError({ message: "Failed to fetch" }).kind).not.toBe("access");
  expect(
    accountError({ message: "Supabase could not connect" }).message,
  ).not.toMatch(/supabase/i);
});
it("distinguishes failed email delivery from accepted requests and other server errors", () => {
  for (const message of [
    "Error sending confirmation email",
    "Error sending recovery email",
    "Error sending email",
    "Failed to send reset email",
  ]) {
    const error = accountError({
      code: "unexpected_failure",
      status: 500,
      message,
    });
    expect(error).toMatchObject({ kind: "delivery", waitSeconds: 60 });
    expect(error.message).toContain("could not be sent");
    expect(error.message).not.toMatch(/supabase|SMTP|password/i);
    expect(accountError(error)).toBe(error);
  }
  expect(
    accountError({
      status: 500,
      code: "unexpected_failure",
      message: "Database error saving new user",
    }).kind,
  ).toBe("other");
  expect(
    accountError({ status: 429, message: "Error sending confirmation email" })
      .kind,
  ).toBe("rate");
});
