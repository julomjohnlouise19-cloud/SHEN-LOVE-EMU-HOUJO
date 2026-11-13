import { currentUser } from ".";
import { LocalStorageAdapter } from "./adapter";
import { cloudEnabled, cloudUserId, profileStylesVersion } from "./cloud";
import { client } from "./cloud-client";
import { prepareImage } from "./image-file";
import { imageAccount, ImageRequestError } from "./image-service";
import { platformRequest } from "./platform";
import {
  defaultProfileDesign,
  isBannerData,
  ownedBanner,
  readProfileDesign,
  validateProfileDesign,
  type ProfileDesign,
} from "../core/profile-design";

const adapter = new LocalStorageAdapter();
const designs = new Map<string, ProfileDesign>();
const covers = new Map<
  string,
  { url: string; path: string | null; expires: number }
>();
const pending = new Map<string, Promise<ProfileDesign>>();
const coverPending = new Set<string>();
const coverAttempt = new Map<string, number>();
let owner = "",
  generation = 0;
const key = (id: string) => `csl:profile-design:${id}`;
const actorKey = () =>
  currentUser()
    ? `${cloudEnabled ? "cloud" : "local"}:${currentUser()!.id}:${cloudUserId() ?? ""}`
    : "";
function context() {
  const next = actorKey();
  if (next !== owner) {
    owner = next;
    generation++;
    designs.clear();
    covers.clear();
    pending.clear();
    coverPending.clear();
    coverAttempt.clear();
  }
  return { owner, generation };
}
const validContext = (captured: ReturnType<typeof context>) =>
  captured.owner === actorKey() && captured.generation === generation;
const notify = () => window.dispatchEvent(new Event("csl:profile-design"));
export function getProfileDesign(id: string) {
  context();
  return designs.get(id) ?? defaultProfileDesign();
}
export function bannerUrl(id: string) {
  const captured = context(),
    item = covers.get(id),
    design = designs.get(id);
  if (
    item &&
    item.expires > Date.now() &&
    (!cloudEnabled || id === "guest" || item.path === design?.banner_path)
  )
    return item.url;
  if (cloudEnabled && design?.banner_path)
    void hydrateCover(id, design, captured);
  return undefined;
}
export const prepareBanner = (file: File, signal?: AbortSignal) =>
  prepareImage(file, "banner", signal);
async function hydrateCover(
  id: string,
  design: ProfileDesign,
  captured: ReturnType<typeof context>,
) {
  const path = design.banner_path;
  if (!path || !ownedBanner(path, id)) {
    covers.delete(id);
    return;
  }
  if (covers.get(id)?.path === path && covers.get(id)!.expires > Date.now())
    return;
  if (coverPending.has(id) || Date.now() - (coverAttempt.get(id) ?? 0) < 30000)
    return;
  coverPending.add(id);
  coverAttempt.set(id, Date.now());
  try {
    const { data, error } = await client!.storage
      .from("csl-avatars")
      .createSignedUrl(path, 300);
    if (
      error ||
      !data?.signedUrl ||
      !validContext(captured) ||
      designs.get(id)?.banner_path !== path
    )
      return;
    covers.set(id, { url: data.signedUrl, path, expires: Date.now() + 250000 });
    notify();
  } catch {
    /* A missing cover keeps the readable color background. */
  } finally {
    if (validContext(captured)) coverPending.delete(id);
  }
}
export async function loadProfileDesign(id: string): Promise<ProfileDesign> {
  const captured = context();
  if (id !== currentUser()?.id) return getProfileDesign(id);
  if (designs.has(id)) return designs.get(id)!;
  if (pending.has(id)) return pending.get(id)!;
  const task = (async () => {
    const local = await adapter
      .get<{ design?: unknown; banner?: unknown }>(key(id))
      .catch(() => null);
    let design = readProfileDesign(local?.design, id);
    if (cloudEnabled && id !== "guest") {
      if (id !== cloudUserId()) return defaultProfileDesign();
      const { data, error } = await client!.auth.getUser();
      if (!error && data.user?.id === id)
        design = readProfileDesign(
          data.user.user_metadata?.csl_profile_style,
          id,
        );
    }
    if (!validContext(captured)) return defaultProfileDesign();
    designs.set(id, design);
    if ((!cloudEnabled || id === "guest") && isBannerData(local?.banner))
      covers.set(id, { url: local.banner, path: null, expires: Infinity });
    notify();
    if (cloudEnabled && id !== "guest") void hydrateCover(id, design, captured);
    return design;
  })();
  pending.set(id, task);
  try {
    return await task;
  } finally {
    if (pending.get(id) === task) pending.delete(id);
  }
}
let peerLoaded = 0;
const peerPending = new Set<string>();
export async function loadProfileDesigns(ids: string[]) {
  if (!profileStylesVersion() || !cloudUserId()) return;
  const captured = context();
  const targets = [...new Set(ids)].filter((id) => id !== cloudUserId());
  if (!targets.length) return;
  const requestKey = targets.slice().sort().join(",");
  if (
    peerPending.has(requestKey) ||
    (Date.now() - peerLoaded < 30000 && targets.every((id) => designs.has(id)))
  )
    return;
  peerPending.add(requestKey);
  try {
    for (let offset = 0; offset < targets.length; offset += 50) {
      const batch = targets.slice(offset, offset + 50);
      const rows = await platformRequest<
        { user_id: string; design: unknown }[]
      >("csl_profile_styles", { p_users: batch });
      if (!validContext(captured)) return;
      for (const id of batch) {
        const row = rows.find((item) => item.user_id === id);
        if (!row) {
          designs.delete(id);
          covers.delete(id);
          continue;
        }
        const design = readProfileDesign(row.design, id);
        designs.set(id, design);
        if (design.banner_path) void hydrateCover(id, design, captured);
        else covers.delete(id);
      }
      notify();
    }
    peerLoaded = Date.now();
  } catch {
    /* Existing avatars remain available until shared designs can load. */
  } finally {
    peerPending.delete(requestKey);
  }
}
interface BannerChange {
  kind: "keep" | "remove" | "replace";
  blob?: Blob;
  preview?: string;
}
export async function saveProfileDesign(
  id: string,
  value: ProfileDesign,
  banner: BannerChange,
) {
  const captured = context();
  if (id !== currentUser()?.id)
    throw new Error("Sign in to edit your own profile.");
  validateProfileDesign(value, id);
  let previous = getProfileDesign(id);
  let next = { ...value };
  if (
    banner.kind === "replace" &&
    (!banner.blob ||
      banner.blob.type !== "image/webp" ||
      banner.blob.size > 262144 ||
      !isBannerData(banner.preview))
  )
    throw new Error("Choose and prepare a valid banner before saving.");
  if (cloudEnabled && id !== "guest") {
    if (id !== cloudUserId())
      throw new Error("Sign in to edit your own profile.");
    const { request, remove, profile, user } = await imageAccount(id);
    previous = readProfileDesign(user.user_metadata?.csl_profile_style, id);
    if (banner.kind === "keep" && previous.banner_path !== next.banner_path)
      next = {
        ...next,
        banner_path: previous.banner_path,
        x: previous.x,
        y: previous.y,
        share_banner: false,
      };
    if (!validContext(captured))
      throw new Error("Your account changed. Open your profile again.");
    let uploaded: string | undefined;
    let writing = false;
    try {
      if (banner.kind === "replace") {
        uploaded = `${id}/${crypto.randomUUID()}.webp`;
        await request(`/storage/v1/object/csl-avatars/${uploaded}`, {
          method: "POST",
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "max-age=3600",
            "x-upsert": "false",
          },
          body: banner.blob,
        });
        next.banner_path = uploaded;
      } else if (banner.kind === "remove") next.banner_path = null;
      if (!validContext(captured))
        throw new Error("Your account changed. Open your profile again.");
      writing = true;
      const result = await request("/auth/v1/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { csl_profile_style: next } }),
      });
      if (result.id !== id)
        throw new Error("Your profile could not be verified. Sign in again.");
    } catch (error) {
      // Keep an uploaded image if a disconnected metadata write may have committed.
      if (
        uploaded &&
        (!writing || (error instanceof ImageRequestError && error.rejected))
      )
        await remove(uploaded).catch(() => undefined);
      throw error;
    }
    if (
      previous.banner_path &&
      previous.banner_path !== next.banner_path &&
      previous.banner_path !== profile.photo_path
    )
      void remove(previous.banner_path).catch(() => undefined);
    if (!validContext(captured)) return;
    await adapter
      .set(key(id), { design: next, banner: null })
      .catch(() => undefined);
  } else {
    const old = await adapter.get<{ banner?: unknown }>(key(id));
    const image =
      banner.kind === "replace"
        ? banner.preview
        : banner.kind === "remove"
          ? null
          : old?.banner;
    next = { ...next, banner_path: null, share_banner: false };
    await adapter.set(key(id), {
      design: next,
      banner: isBannerData(image) ? image : null,
    });
  }
  if (!validContext(captured)) return;
  designs.set(id, next);
  if (banner.kind === "replace")
    covers.set(id, {
      url: banner.preview!,
      path: next.banner_path,
      expires: cloudEnabled && id !== "guest" ? Date.now() + 250000 : Infinity,
    });
  else if (banner.kind === "remove") covers.delete(id);
  else if (cloudEnabled && covers.get(id)?.path !== next.banner_path)
    covers.delete(id);
  notify();
}
window.addEventListener("csl:platform", () => {
  if (!cloudUserId()) {
    context();
    peerLoaded = 0;
    peerPending.clear();
    notify();
  }
});
window.addEventListener("csl:community", () => {
  context();
  for (const id of designs.keys())
    if (id !== currentUser()?.id) {
      designs.delete(id);
      covers.delete(id);
    }
  peerLoaded = 0;
  notify();
});
