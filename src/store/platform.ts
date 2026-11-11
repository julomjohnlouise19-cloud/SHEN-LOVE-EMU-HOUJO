import { client } from "./cloud-client";
import { cloudUserId, platformVersion } from "./cloud";
import { accountError } from "../core/account-errors";
import type {
  LabItem,
  LabOrder,
  LabSnapshot,
  TeacherData,
} from "../core/platform";
import type { ArcadeState } from "../core/arcade";
import type { Question } from "../core/types";

let owner: string | undefined;
let snapshot: LabSnapshot | undefined;
let loadedAt = 0;
let loading: Promise<LabSnapshot> | undefined;
export const getLabSnapshot = () =>
  owner === cloudUserId() ? snapshot : undefined;
export const classCredits = () => getLabSnapshot()?.credits ?? 0;
export const hasPlatform = () => platformVersion() >= 2;
export const hasStudio = () => platformVersion() >= 3;
export function clearLab() {
  owner = undefined;
  snapshot = undefined;
  loadedAt = 0;
  loading = undefined;
  window.dispatchEvent(new Event("csl:platform"));
}
export async function platformRequest<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const actor = cloudUserId();
  if (!client || !actor)
    throw new Error("Sign in to connect your saved discoveries.");
  if (!hasPlatform())
    throw new Error(
      "These new features need a service update. Your saved records are safe; please contact the site owner.",
    );
  const { data, error } = await client.rpc(name, args);
  if (actor !== cloudUserId())
    throw new Error("Your account changed. Please sign in again.");
  if (error) throw accountError(error);
  return data as T;
}
export async function refreshLab(force = false): Promise<LabSnapshot> {
  const actor = cloudUserId();
  if (!actor) throw new Error("Sign in to view your saved lab.");
  if (!force && getLabSnapshot() && Date.now() - loadedAt < 30000)
    return snapshot!;
  if (loading && owner === actor) return loading;
  owner = actor;
  const request = platformRequest<LabSnapshot>("csl_my_lab", {
    p_user_id: actor,
  }).then((value) => {
    if (actor !== cloudUserId())
      throw new Error("Your account changed. Please sign in again.");
    snapshot = value;
    owner = actor;
    loadedAt = Date.now();
    window.dispatchEvent(new Event("csl:platform"));
    return value;
  });
  loading = request;
  try {
    return await request;
  } finally {
    if (loading === request) loading = undefined;
  }
}
window.addEventListener("csl:quiz-saved", () => {
  if (hasPlatform() && cloudUserId())
    void refreshLab(true).catch(() => undefined);
});
export async function reserveItem(item: LabItem, requestId: string) {
  const result = await platformRequest<LabOrder>("csl_reserve_item", {
    p_user_id: cloudUserId(),
    p_request_id: requestId,
    p_item_id: item.id,
    p_expected_price: item.price,
    p_expected_version: item.version,
  });
  await refreshLab(true);
  return result;
}
async function refreshSavedEdit() {
  try {
    await refreshLab(true);
  } catch {
    loadedAt = 0;
    window.dispatchEvent(new Event("csl:teacher-refresh-needed"));
  }
}
export async function teacherCommand(
  action: string,
  body: unknown,
  requestId: string = crypto.randomUUID(),
) {
  const result = await platformRequest<{ ok: boolean; value: unknown }>(
    "csl_teacher_command",
    { p_request_id: requestId, p_action: action, p_body: body },
  );
  await refreshSavedEdit();
  return result;
}
export const studioData = (
  view: "quizzes" | "games" | "health" | "overview",
  filters: Record<string, string> = {},
  offset = 0,
) =>
  platformRequest<TeacherData>("csl_studio_data", {
    p_view: view,
    p_filters: filters,
    p_offset: offset,
  });
export async function studioCommand(
  action: "records" | "role",
  body: unknown,
  requestId = crypto.randomUUID(),
) {
  const result = await platformRequest("csl_studio_command", {
    p_request_id: requestId,
    p_action: action,
    p_body: body,
  });
  await refreshSavedEdit();
  return result;
}
export const teacherData = (
  view: string,
  filters: Record<string, string> = {},
  offset = 0,
) =>
  hasStudio() && ["reports", "games", "health", "overview"].includes(view)
    ? studioData(
        (view === "reports" ? "quizzes" : view) as
          "quizzes" | "games" | "health" | "overview",
        filters,
        offset,
      )
    : platformRequest<TeacherData>("csl_teacher_data", {
        p_view: view,
        p_filters: filters,
        p_offset: offset,
      });
export interface ArcadeView {
  state: ArcadeState;
  question: Omit<Question, "answer" | "explanation" | "scienceFact"> | null;
  serverNow: number;
}
