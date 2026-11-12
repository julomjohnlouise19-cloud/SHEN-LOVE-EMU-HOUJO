import { currentUser } from ".";
import { cloudEnabled, cloudUserId, communityVersion } from "./cloud";
import { client } from "./cloud-client";
import { platformRequest } from "./platform";
import {
  friendLookup,
  validateCommunitySettings,
  type CommunityHome,
  type CommunityRanking,
  type CommunitySettings,
  type CommunityPeriod,
  type CommunityScope,
  type ScientistCard,
  type FriendList,
} from "../core/community";
export const communityReady = () =>
  cloudEnabled && !!cloudUserId() && communityVersion() >= 2;
function requireCommunity() {
  if (!communityReady())
    throw new Error(
      "Classroom connections are being prepared. Your existing discoveries are safe; contact your teacher.",
    );
}
export function communityHome() {
  requireCommunity();
  return platformRequest<CommunityHome>("csl_social_home");
}
export async function saveCommunityProfile(value: CommunitySettings) {
  requireCommunity();
  validateCommunitySettings(value);
  const home = await platformRequest<CommunityHome>("csl_save_social_profile", {
    p_username: null,
    p_listed: value.listed,
    p_share_photo: value.share_photo,
    p_share_bio: value.share_bio,
    p_share_grade: value.share_grade,
    p_version: value.version,
  });
  window.dispatchEvent(new Event("csl:community"));
  return home;
}
export function communityRanking(
  period: CommunityPeriod,
  scope: CommunityScope,
  offset = 0,
  grade: number | null = null,
) {
  requireCommunity();
  return platformRequest<CommunityRanking>("csl_leaderboard", {
    p_period: period,
    p_scope: scope,
    p_offset: offset,
    p_grade: grade,
  });
}
export function findScientist(name: string) {
  requireCommunity();
  return platformRequest<ScientistCard | null>("csl_find_scientist", {
    p_username: friendLookup(name),
  });
}
export function classmateDirectory(query = "", activeOnly = false, offset = 0) {
  requireCommunity();
  return platformRequest<FriendList>("csl_classmate_directory", {
    p_query: query.trim() ? friendLookup(query) : "",
    p_active_only: activeOnly,
    p_offset: offset,
  });
}
let activityOwner: string | undefined;
let lastActivity = 0;
export async function touchCommunityActivity() {
  const actor = cloudUserId();
  if (!communityReady() || !actor || document.hidden || !navigator.onLine)
    return;
  if (activityOwner === actor && Date.now() - lastActivity < 45000) return;
  activityOwner = actor;
  lastActivity = Date.now();
  try {
    await platformRequest("csl_touch_social_activity");
  } catch {
    /* The directory remains usable while presence catches up. */
  }
}
export function scientistCard(id: string) {
  requireCommunity();
  return platformRequest<ScientistCard | null>("csl_scientist_card", {
    p_user_id: id,
  });
}
export function friendsList(
  kind: "friends" | "incoming" | "outgoing" | "blocked",
  offset = 0,
) {
  requireCommunity();
  return platformRequest<FriendList>("csl_friend_list", {
    p_kind: kind,
    p_offset: offset,
  });
}
export async function friendAction(
  action:
    "send" | "accept" | "decline" | "cancel" | "remove" | "block" | "unblock",
  card: ScientistCard,
  requestId = crypto.randomUUID(),
) {
  requireCommunity();
  const result = await platformRequest<{ ok: boolean; state: string }>(
    "csl_social_action",
    {
      p_action: action,
      p_target: card.user_id,
      p_username: null,
      p_version: card.friendship_version,
      p_request_id: requestId,
    },
  );
  if (action === "block" || action === "remove") {
    photos.delete(card.user_id);
    photoPaths.delete(card.user_id);
    window.dispatchEvent(new Event("csl:community-photo"));
  }
  window.dispatchEvent(new Event("csl:community"));
  return result;
}
const photos = new Map<
  string,
  { url: string; path: string; expires: number }
>();
let photoOwner: string | undefined;
const photoPaths = new Map<string, string>();
export const sharedPhoto = (id: string) => {
  if (photoOwner !== cloudUserId()) return undefined;
  const value = photos.get(id);
  return value && value.expires > Date.now() ? value.url : undefined;
};
export async function loadSharedPhotos(cards: ScientistCard[]) {
  const actor = cloudUserId();
  if (!actor || !communityReady()) return;
  if (photoOwner !== actor) {
    photos.clear();
    photoPaths.clear();
    photoOwner = actor;
  }
  await Promise.allSettled(
    cards.map(async (card) => {
      const path = card.photo_path;
      if (!path || !path.startsWith(`${card.user_id}/`) || path.length > 180) {
        photos.delete(card.user_id);
        photoPaths.delete(card.user_id);
        return;
      }
      const cached = photos.get(card.user_id);
      photoPaths.set(card.user_id, path);
      if (cached?.path === path && cached.expires > Date.now()) return;
      const { data, error } = await client!.storage
        .from("csl-avatars")
        .createSignedUrl(path, 300);
      if (
        error ||
        !data?.signedUrl ||
        actor !== cloudUserId() ||
        currentUser()?.id !== actor ||
        photoPaths.get(card.user_id) !== path
      )
        return;
      photos.set(card.user_id, {
        url: data.signedUrl,
        path,
        expires: Date.now() + 250000,
      });
    }),
  );
  if (actor === cloudUserId())
    window.dispatchEvent(new Event("csl:community-photo"));
}
window.addEventListener("csl:platform", () => {
  if (!cloudUserId()) {
    photoOwner = undefined;
    photos.clear();
    photoPaths.clear();
    window.dispatchEvent(new Event("csl:community-photo"));
  }
});
