import { describe, it, expect } from "vitest";
import {
  defaultProfileDesign,
  isBannerData,
  ownedBanner,
  readProfileDesign,
  validateProfileDesign,
} from "../src/core/profile-design";
const id = "00000000-0000-4000-8000-000000000001";
const path = `${id}/00000000-0000-4000-8000-000000000002.webp`;
describe("profile design boundaries", () => {
  it("keeps banners private by default and accepts the supplied border catalog", () => {
    expect(defaultProfileDesign()).toMatchObject({
      border: "",
      share_banner: false,
      x: 50,
      y: 50,
    });
    const design = {
      ...defaultProfileDesign(),
      border: "moon-garden",
      banner_path: path,
      y: 100,
    };
    expect(readProfileDesign(design, id)).toEqual(design);
    expect(() => validateProfileDesign(design, id)).not.toThrow();
  });
  it("discards foreign image paths, unknown borders and malformed metadata", () => {
    expect(ownedBanner(path, id)).toBe(true);
    expect(ownedBanner(path, "different-account")).toBe(false);
    const invalid = readProfileDesign(
      {
        version: 1,
        border: "https://example.test/frame",
        banner_path: "../someone/image.webp",
        x: "25",
        y: 101,
        share_banner: "true",
        is_teacher: true,
      },
      id,
    );
    expect(invalid).toEqual(defaultProfileDesign());
    expect(
      readProfileDesign({ version: 2, border: "moon-garden" }, id),
    ).toEqual(defaultProfileDesign());
  });
  it("rejects invalid save positions and paths without coercing data", () => {
    for (const patch of [
      { x: NaN },
      { y: -1 },
      { x: 2.5 },
      { border: "unknown" },
      { banner_path: "https://example.test/image" },
    ])
      expect(() =>
        validateProfileDesign({ ...defaultProfileDesign(), ...patch }, id),
      ).toThrow();
  });
  it("bounds local image data to prepared WebP bytes", () => {
    expect(isBannerData("data:image/webp;base64,AAAA")).toBe(true);
    expect(isBannerData("data:image/svg+xml,<svg/> ")).toBe(false);
    expect(isBannerData("data:image/webp;base64," + "A".repeat(400000))).toBe(
      false,
    );
  });
});
