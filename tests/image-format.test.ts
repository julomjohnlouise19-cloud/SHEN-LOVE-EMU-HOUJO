import { it, expect } from "vitest";
import { inspectImage, IMAGE_INPUT_BYTES } from "../src/core/image-format";
it("recognizes camera rasters from bytes without relying on file labels", () => {
  const png = new Uint8Array(24);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  png.set([73, 72, 68, 82], 12);
  const view = new DataView(png.buffer);
  view.setUint32(16, 400);
  view.setUint32(20, 700);
  expect(inspectImage(png, 6000000)).toMatchObject({
    type: "image/png",
    width: 400,
    height: 700,
  });
  const jpg = Uint8Array.from([
    255, 216, 255, 192, 0, 17, 8, 1, 224, 2, 128, 3, 1, 17, 0, 2, 17, 0, 3, 17,
    0,
  ]);
  expect(inspectImage(jpg, 1024)).toMatchObject({
    type: "image/jpeg",
    width: 640,
    height: 480,
  });
  const gif = Uint8Array.from([71, 73, 70, 56, 57, 97, 32, 0, 24, 0, 0, 0]);
  expect(inspectImage(gif, 100)).toMatchObject({
    type: "image/gif",
    width: 32,
    height: 24,
  });
});
it("rejects empty, oversized and executable input before decoding", () => {
  expect(() => inspectImage(new Uint8Array(), 0)).toThrow("empty");
  expect(() => inspectImage(new Uint8Array(), IMAGE_INPUT_BYTES + 1)).toThrow(
    "20 MB",
  );
  expect(() =>
    inspectImage(new TextEncoder().encode('<svg onload="alert(1)"/>'), 23),
  ).toThrow("SVG");
});
it("bounds image dimensions and distinguishes modern image containers", () => {
  const png = new Uint8Array(24);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  png.set([73, 72, 68, 82], 12);
  const view = new DataView(png.buffer);
  view.setUint32(16, 100000);
  view.setUint32(20, 100000);
  expect(() => inspectImage(png, 100)).toThrow("64 megapixels");
  const ftyp = new Uint8Array(24);
  new DataView(ftyp.buffer).setUint32(0, 24);
  ftyp.set(new TextEncoder().encode("ftypavif"), 4);
  expect(inspectImage(ftyp, 100).type).toBe("image/avif");
  ftyp.set(new TextEncoder().encode("heic"), 8);
  expect(inspectImage(ftyp, 100).label).toBe("HEIC");
});
