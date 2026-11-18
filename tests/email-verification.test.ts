import { describe, expect, it } from "vitest";
import {
  emailCode,
  emailMailbox,
  registrationEmail,
  hasVerifiedInbox,
} from "../src/core/email-verification";

describe("Gmail signup and emailed codes", () => {
  it("accepts usable Gmail spellings and rejects malformed or different domains", () => {
    expect(registrationEmail(" Student.Name@gmail.com ")).toBe(
      "student.name@gmail.com",
    );
    expect(registrationEmail("student.name+class@gmail.com")).toBe(
      "student.name+class@gmail.com",
    );
    for (const address of [
      "",
      "student",
      "student@gmaill.com",
      "student@gmail.com.fake",
      "student@example.com",
      "student..name@gmail.com",
      ".student@gmail.com",
      "student.@gmail.com",
      "student name@gmail.com",
      `${"a".repeat(31)}@gmail.com`,
    ])
      expect(registrationEmail(address)).toBeUndefined();
    expect(registrationEmail(`${"a".repeat(30)}+class@gmail.com`)).toBe(
      `${"a".repeat(30)}+class@gmail.com`,
    );
    expect(registrationEmail(`${"a.".repeat(29)}a@gmail.com`)).toBe(
      `${"a.".repeat(29)}a@gmail.com`,
    );
  });
  it("requires confirmation from the account service rather than a plausible address or user metadata", () => {
    expect(hasVerifiedInbox({ email: "real.looking@gmail.com" })).toBe(false);
    expect(
      hasVerifiedInbox({
        email: "real.looking@gmail.com",
        email_confirmed_at: "",
      }),
    ).toBe(false);
    expect(
      hasVerifiedInbox({
        email: "real.looking@gmail.com",
        email_confirmed_at: "not a date",
      }),
    ).toBe(false);
    expect(
      hasVerifiedInbox({
        email: "teacher@school.edu",
        email_confirmed_at: "2026-11-10T00:00:00Z",
      }),
    ).toBe(true);
  });
  it("retains leading zeroes and accepts pasted code spacing without accepting partial or alphabetic codes", () => {
    expect(emailCode("000123")).toBe("000123");
    expect(emailCode("123 456")).toBe("123456");
    expect(emailCode("123-456")).toBe("123456");
    expect(emailCode("00001234")).toBe("00001234");
    expect(emailCode("1234 5678")).toBe("12345678");
    expect(emailCode("123456789")).toBeUndefined();
    for (const code of ["", "12345", "1234567", "12a456", "1e2345"])
      expect(emailCode(code)).toBeUndefined();
  });
  it("makes dot and plus aliases share a mailbox cooldown while preserving legacy addresses", () => {
    expect(emailMailbox("Student.Name+science@gmail.com")).toBe(
      emailMailbox("studentname@gmail.com"),
    );
    expect(emailMailbox(" Teacher@School.edu ")).toBe("teacher@school.edu");
  });
});
