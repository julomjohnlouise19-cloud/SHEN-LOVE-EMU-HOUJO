import { client } from "./cloud-client";
import { cloudEnabled, cloudUserId, type CloudProfile } from "./cloud";
import { LocalStorageAdapter } from "./adapter";
import { hasPlatform, platformRequest } from "./platform";
import { accountError } from "../core/account-errors";

const adapter = new LocalStorageAdapter();
const photos = new Map<
  string,
  { url: string; path?: string; expires: number }
>();
const key = (id: string) => `csl:photo:${id}`;
const notify = () => window.dispatchEvent(new Event("csl:photo"));
export function photoUrl(id: string) {
  const photo = photos.get(id);
  return photo && photo.expires > Date.now() ? photo.url : undefined;
}
export function clearPrivatePhotos() {
  for (const [id, p] of photos) if (p.path) photos.delete(id);
  notify();
}
export async function hydratePhoto(id: string, profile?: CloudProfile) {
  if (cloudEnabled && id !== "guest") {
    if (!profile?.photo_path || id !== cloudUserId()) return;
    const { data, error } = await client!.storage
      .from("csl-avatars")
      .createSignedUrl(profile.photo_path, 3600);
    if (error) return;
    if (id === cloudUserId())
      photos.set(id, {
        url: data.signedUrl,
        path: profile.photo_path,
        expires: Date.now() + 3500000,
      });
  } else {
    const value = await adapter.get<unknown>(key(id));
    if (
      typeof value === "string" &&
      value.length < 400000 &&
      /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(value)
    )
      photos.set(id, { url: value, expires: Infinity });
  }
  notify();
}
async function normalizePhoto(file: File): Promise<Blob> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    !file.size ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Choose a JPG, PNG or WebP photo smaller than 5 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "That file could not be opened as a photo. Try another JPG, PNG or WebP.",
    );
  }
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 24000000
    )
      throw new Error("Choose a photo smaller than 24 megapixels.");
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Photo processing is unavailable in this browser.");
    const side = Math.min(bitmap.width, bitmap.height);
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      256,
      256,
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    if (!blob || blob.type !== "image/webp" || blob.size > 262144)
      throw new Error(
        "This photo could not be prepared. Try a smaller image or a newer browser.",
      );
    return blob;
  } finally {
    bitmap.close();
  }
}
const dataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("This photo could not be read."));
    reader.readAsDataURL(blob);
  });
export async function uploadPhoto(id: string, file: File) {
  const blob = await normalizePhoto(file);
  if (cloudEnabled && id !== "guest") {
    if (!hasPlatform())
      throw new Error(
        "Photo uploads need a service update. Please contact your teacher.",
      );
    if (id !== cloudUserId())
      throw new Error("Sign in to update your own photo.");
    const path = `${id}/${crypto.randomUUID()}.webp`,
      old = photos.get(id)?.path;
    const { error } = await client!.storage
      .from("csl-avatars")
      .upload(path, blob, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "3600",
      });
    if (error) throw accountError(error);
    try {
      await platformRequest("csl_set_photo", { p_user_id: id, p_path: path });
    } catch (error) {
      await client!.storage.from("csl-avatars").remove([path]);
      throw error;
    }
    if (id !== cloudUserId()) return;
    photos.set(id, { url: await dataUrl(blob), path, expires: Infinity });
    if (old) await client!.storage.from("csl-avatars").remove([old]);
  } else {
    const value = await dataUrl(blob);
    await adapter.set(key(id), value);
    photos.set(id, { url: value, expires: Infinity });
  }
  notify();
}
export async function removePhoto(id: string) {
  const old = photos.get(id)?.path;
  if (cloudEnabled && id !== "guest") {
    await platformRequest("csl_set_photo", { p_user_id: id, p_path: null });
    if (old) await client!.storage.from("csl-avatars").remove([old]);
  } else await adapter.set(key(id), null);
  photos.delete(id);
  notify();
}
