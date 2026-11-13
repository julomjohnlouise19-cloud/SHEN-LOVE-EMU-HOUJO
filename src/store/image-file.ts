import { inspectImage, IMAGE_INPUT_PIXELS } from "../core/image-format";

export const imageInputAccept =
  "image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,image/heic,image/heif,.jpg,.jpeg,.jfif,.png,.webp,.gif,.avif,.bmp,.heic,.heif";
const aborted = () =>
  new DOMException("Image preparation cancelled", "AbortError");
export const imageDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error("This image could not be read. Choose the file again."));
    reader.onabort = () => reject(aborted());
    reader.readAsDataURL(blob);
  });
function bounded<T>(
  task: Promise<T>,
  signal?: AbortSignal,
  dispose?: (value: T) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let ended = false;
    const finish = (error?: unknown, value?: T) => {
      if (ended) {
        if (value !== undefined) dispose?.(value);
        return;
      }
      ended = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      if (error) reject(error);
      else resolve(value!);
    };
    const cancel = () => finish(aborted());
    const timer = setTimeout(
      () =>
        finish(
          new Error("This image took too long to open. Try a smaller copy."),
        ),
      12000,
    );
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();
    task.then(
      (value) => finish(undefined, value),
      (error) => finish(error),
    );
  });
}
async function openImage(file: File, signal?: AbortSignal) {
  const info = inspectImage(
    new Uint8Array(await file.slice(0, 1048576).arrayBuffer()),
    file.size,
  );
  if (signal?.aborted) throw aborted();
  const blob = new Blob([file], { type: info.type });
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await bounded(
        createImageBitmap(blob, { imageOrientation: "from-image" }),
        signal,
        (value) => value.close(),
      );
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  const image = new Image();
  image.decoding = "async";
  const close = () => {
    image.onload = image.onerror = null;
    image.removeAttribute("src");
  };
  try {
    const url = await bounded(imageDataUrl(blob), signal);
    if (signal?.aborted) throw aborted();
    await bounded(
      new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(
            new Error(
              info.label === "HEIC"
                ? "This browser cannot open this HEIC photo. Export it as JPG or PNG in your photo app, then choose that copy."
                : "This image could not be opened. It may be damaged or unsupported; try a JPG, PNG or WebP copy.",
            ),
          );
        image.src = url;
      }),
      signal,
    );
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close,
    };
  } catch (error) {
    close();
    throw error;
  }
}
export async function prepareImage(
  file: File,
  kind: "photo" | "banner",
  signal?: AbortSignal,
) {
  const image = await openImage(file, signal);
  try {
    if (signal?.aborted) throw aborted();
    if (
      !image.width ||
      !image.height ||
      image.width * image.height > IMAGE_INPUT_PIXELS
    )
      throw new Error(
        "Choose an image up to 64 megapixels. Export a smaller copy from your photo app.",
      );
    const canvas = document.createElement("canvas"),
      ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error(
        "Image preparation is unavailable. Try reopening this page in your browser.",
      );
    for (const [side, quality] of kind === "photo"
      ? [
          [256, 0.85],
          [256, 0.7],
          [256, 0.55],
        ]
      : [
          [1280, 0.82],
          [1120, 0.72],
          [960, 0.6],
        ]) {
      if (signal?.aborted) throw aborted();
      if (kind === "photo") {
        canvas.width = canvas.height = side;
        const crop = Math.min(image.width, image.height);
        ctx.drawImage(
          image.source,
          (image.width - crop) / 2,
          (image.height - crop) / 2,
          crop,
          crop,
          0,
          0,
          side,
          side,
        );
      } else {
        const scale = Math.min(1, side / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        ctx.drawImage(image.source, 0, 0, canvas.width, canvas.height);
      }
      const blob = await bounded(
        new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality),
        ),
        signal,
      );
      if (blob?.type === "image/webp" && blob.size <= 262144)
        return { blob, preview: await imageDataUrl(blob) };
      if (blob && blob.type !== "image/webp")
        throw new Error(
          "This browser cannot prepare a WebP image. Try the latest Chrome, Firefox or Safari, or choose another device.",
        );
    }
    throw new Error(
      "This image could not be made small enough. Try a simpler or smaller copy.",
    );
  } finally {
    image.close();
  }
}
