import { describe, expect, it } from "vitest";
import { DEFAULT_PICKUP_LOCATION, pickupLocation } from "../src/core/classroom";
describe("classroom collection instructions", () => {
  it("provides a usable location for old settings and rejects missing or malformed values", () => {
    for (const value of [undefined, null, false, "", " x ", "x".repeat(161)])
      expect(pickupLocation({ pickupLocation: value })).toBe(
        DEFAULT_PICKUP_LOCATION,
      );
    expect(
      pickupLocation({ pickupLocation: "  Grade 10 SSC · Science corner  " }),
    ).toBe("Grade 10 SSC · Science corner");
  });
});
