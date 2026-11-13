import { client } from "./cloud-client";
import { cloudEnabled, cloudUserId, type CloudProfile } from "./cloud";
import { LocalStorageAdapter } from "./adapter";
import { prepareImage } from "./image-file";
import { imageAccount, ImageRequestError } from "./image-service";
import { readProfileDesign } from "../core/profile-design";
import { currentUser } from ".";

const adapter = new LocalStorageAdapter();
let photoEpoch = 0;
const photos = new Map<
  string,
  { url: string; path?: string; expires: number }
>();
const teacherPhotoPaths = new Map<string, string>();
const key = (id: string) => `csl:photo:${id}`;
const notify = () => window.dispatchEvent(new Event("csl:photo"));
export function photoUrl(id: string) {
  const photo = photos.get(id);
  return photo && photo.expires > Date.now() ? photo.url : undefined;
}
export function clearPrivatePhotos() {
  photoEpoch++;
  teacherPhotoPaths.clear();
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
export async function hydrateTeacherPhoto(id: string, path?: string | null) {
  const actor = cloudUserId();
  if (!actor || currentUser()?.role !== "admin" || !client) return;
  if (!path || !path.startsWith(`${id}/`)) {
    teacherPhotoPaths.delete(id);
    if (photos.get(id)?.path && photos.delete(id)) notify();
    return;
  }
  teacherPhotoPaths.set(id, path);
  const cached = photos.get(id);
  if (cached?.path === path && cached.expires > Date.now()) return;
  try {
    const { data, error } = await client.storage
      .from("csl-avatars")
      .createSignedUrl(path, 3600);
    if (
      error ||
      !data?.signedUrl ||
      actor !== cloudUserId() ||
      currentUser()?.role !== "admin" ||
      teacherPhotoPaths.get(id) !== path
    )
      return;
    photos.set(id, {
      url: data.signedUrl,
      path,
      expires: Date.now() + 3500000,
    });
    notify();
  } catch {
    /* The illustrated avatar remains available when a photo cannot load. */
  }
}
export async function uploadPhoto(id: string, file: File) {
  if (id !== currentUser()?.id)
    throw new Error("Sign in to update your own photo.");
  const epoch = photoEpoch;
  const { blob, preview } = await prepareImage(file, "photo");
  const stillOwner = () =>
    epoch === photoEpoch &&
    currentUser()?.id === id &&
    (!cloudEnabled || id === "guest" || cloudUserId() === id);
  if (!stillOwner())
    throw new Error("Your account changed. Open your profile again.");
  if (cloudEnabled && id !== "guest") {
    const { request, remove, profile, user } = await imageAccount(id);
    const path = `${id}/${crypto.randomUUID()}.webp`;
    const old = profile.photo_path;
    let writing = false;
    try {
      await request(`/storage/v1/object/csl-avatars/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "image/webp",
          "x-upsert": "false",
          "Cache-Control": "max-age=3600",
        },
        body: blob,
      });
      if (!stillOwner())
        throw new Error("Your account changed. Open your profile again.");
      writing = true;
      await request("/rest/v1/rpc/csl_set_photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_user_id: id, p_path: path }),
      });
    } catch (error) {
      if (!writing || (error instanceof ImageRequestError && error.rejected))
        await remove(path).catch(() => undefined);
      throw error;
    }
    if (
      old &&
      old !== path &&
      old !==
        readProfileDesign(user.user_metadata?.csl_profile_style, id).banner_path
    )
      void remove(old).catch(() => undefined);
    if (!stillOwner()) return;
    photos.set(id, { url: preview, path, expires: Date.now() + 3500000 });
  } else {
    await adapter.set(key(id), preview);
    if (!stillOwner()) return;
    photos.set(id, { url: preview, expires: Infinity });
  }
  notify();
}
export async function removePhoto(id: string) {
  if (id !== currentUser()?.id)
    throw new Error("Sign in to update your own photo.");
  const epoch = photoEpoch;
  if (cloudEnabled && id !== "guest") {
    const { request, remove, profile, user } = await imageAccount(id);
    await request("/rest/v1/rpc/csl_set_photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_user_id: id, p_path: null }),
    });
    if (
      profile.photo_path &&
      profile.photo_path !==
        readProfileDesign(user.user_metadata?.csl_profile_style, id).banner_path
    )
      void remove(profile.photo_path).catch(() => undefined);
  } else await adapter.set(key(id), null);
  if (epoch !== photoEpoch || currentUser()?.id !== id) return;
  photos.delete(id);
  notify();
}
