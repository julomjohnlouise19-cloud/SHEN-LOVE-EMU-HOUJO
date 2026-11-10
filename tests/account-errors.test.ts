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
  expect(
    accountError({ message: "Supabase could not connect" }).message,
  ).not.toMatch(/supabase/i);
});
