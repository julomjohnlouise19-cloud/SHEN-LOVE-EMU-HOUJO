export const IMAGE_INPUT_BYTES = 20 * 1024 * 1024;
export const IMAGE_INPUT_PIXELS = 64000000;
export interface RasterInfo {
  type: string;
  label: string;
  width?: number;
  height?: number;
}
const ascii = (bytes: Uint8Array, offset: number, count: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + count));

// Read raster signatures, not the device's optional or inaccurate MIME label.
export function inspectImage(bytes: Uint8Array, size: number): RasterInfo {
  if (!size) throw new Error("This file is empty. Choose another image.");
  if (size > IMAGE_INPUT_BYTES)
    throw new Error(
      "Choose an image up to 20 MB. Your current image has not changed.",
    );
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let info: RasterInfo | undefined;
  if (
    bytes.length >= 24 &&
    ascii(bytes, 1, 3) === "PNG" &&
    bytes[0] === 137 &&
    ascii(bytes, 12, 4) === "IHDR"
  )
    info = {
      type: "image/png",
      label: "PNG",
      width: view.getUint32(16),
      height: view.getUint32(20),
    };
  else if (
    bytes.length >= 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  ) {
    info = { type: "image/jpeg", label: "JPG" };
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 216)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        length >= 7
      ) {
        info.height = view.getUint16(offset + 3);
        info.width = view.getUint16(offset + 5);
        break;
      }
      offset += length;
    }
  } else if (
    bytes.length >= 12 &&
    ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6))
  )
    info = {
      type: "image/gif",
      label: "GIF",
      width: view.getUint16(6, true),
      height: view.getUint16(8, true),
    };
  else if (
    bytes.length >= 30 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 4) === "WEBP"
  ) {
    info = { type: "image/webp", label: "WebP" };
    const chunk = ascii(bytes, 12, 4);
    const u24 = (n: number) =>
      bytes[n] | (bytes[n + 1] << 8) | (bytes[n + 2] << 16);
    if (chunk === "VP8X") {
      info.width = u24(24) + 1;
      info.height = u24(27) + 1;
    } else if (chunk === "VP8L" && bytes[20] === 47) {
      const bits = view.getUint32(21, true);
      info.width = (bits & 16383) + 1;
      info.height = ((bits >>> 14) & 16383) + 1;
    } else if (
      chunk === "VP8 " &&
      bytes[23] === 157 &&
      bytes[24] === 1 &&
      bytes[25] === 42
    ) {
      info.width = view.getUint16(26, true) & 16383;
      info.height = view.getUint16(28, true) & 16383;
    }
  } else if (bytes.length >= 26 && ascii(bytes, 0, 2) === "BM")
    info = {
      type: "image/bmp",
      label: "BMP",
      width: Math.abs(view.getInt32(18, true)),
      height: Math.abs(view.getInt32(22, true)),
    };
  else if (bytes.length >= 16 && ascii(bytes, 4, 4) === "ftyp") {
    const brands = Array.from(
      {
        length:
          Math.floor(Math.min(bytes.length, view.getUint32(0), 128) / 4) - 2,
      },
      (_, i) => ascii(bytes, 8 + i * 4, 4),
    );
    if (brands.some((b) => ["avif", "avis"].includes(b)))
      info = { type: "image/avif", label: "AVIF" };
    else if (
      brands.some((b) =>
        ["heic", "heix", "hevc", "hevx", "heif", "mif1", "msf1"].includes(b),
      )
    )
      info = { type: "image/heic", label: "HEIC" };
  }
  if (!info)
    throw new Error(
      "Choose a JPG, PNG or WebP image. GIF, AVIF and compatible phone photos are supported too; SVG and documents cannot be used.",
    );
  if (
    info.width !== undefined &&
    (!info.width ||
      !info.height ||
      info.width * info.height > IMAGE_INPUT_PIXELS)
  )
    throw new Error(
      "Choose an image up to 64 megapixels. Export a smaller copy from your photo app.",
    );
  return info;
}
