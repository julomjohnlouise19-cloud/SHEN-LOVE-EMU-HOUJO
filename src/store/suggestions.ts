import { currentUser, getState } from ".";
import { dayKey } from "../core/time";
import { LocalStorageAdapter } from "./adapter";
import { cloudEnabled, cloudUserId } from "./cloud";
import { client } from "./cloud-client";
import { platformRequest } from "./platform";
import {
  validateSuggestion,
  validateReply,
  type Suggestion,
  type SuggestionDraft,
} from "../core/suggestions";
const adapter = new LocalStorageAdapter();
const key = "csl:suggestions:demo:v1";
const draftKey = (id: string) => `csl:suggestion-draft:${id}`;
function actor(teacher = false) {
  const user = currentUser();
  if (!user || (teacher && user.role !== "admin"))
    throw new Error(
      "Teacher access is required to review classroom suggestions.",
    );
  return user;
}
export async function suggestionService() {
  if (!cloudEnabled) return true;
  if (!cloudUserId()) return false;
  const { data, error } = await client!.rpc("csl_suggestions_status");
  return !error && data?.version === 1;
}
export const loadSuggestionDraft = () =>
  adapter.get<SuggestionDraft>(draftKey(actor().id));
export const saveSuggestionDraft = (value: SuggestionDraft) =>
  adapter.set(draftKey(actor().id), value);
export async function sendSuggestion(
  value: SuggestionDraft,
  id: string,
): Promise<Suggestion> {
  const user = actor();
  validateSuggestion(value);
  if (cloudEnabled) {
    if (user.id === "guest")
      throw new Error(
        "Sign in to send a suggestion to your teachers. Your draft stays on this device.",
      );
    return platformRequest("csl_send_suggestion", {
      p_actor: user.id,
      p_id: id,
      p_category: value.category,
      p_title: value.title.trim(),
      p_message: value.message.trim(),
      p_deck: value.deck,
      p_question: value.question,
    });
  }
  return adapter.transaction([key], (tx) => {
    const rows = tx.get<Suggestion[]>(key) ?? [];
    const old = rows.find((r) => r.id === id);
    if (old) {
      if (
        old.user_id !== user.id ||
        old.title !== value.title.trim() ||
        old.message !== value.message.trim()
      )
        throw new Error("Start a new suggestion for different details.");
      return old;
    }
    if (
      rows.filter(
        (r) =>
          r.user_id === user.id &&
          dayKey(
            { now: () => new Date(r.created_at).getTime() },
            getState().rules.timezone,
          ) === dayKey({ now: () => Date.now() }, getState().rules.timezone),
      ).length >= 5
    )
      throw new Error(
        "You have sent five suggestions today. Save a draft for tomorrow.",
      );
    const row: Suggestion = {
      ...value,
      title: value.title.trim(),
      message: value.message.trim(),
      id,
      user_id: user.id,
      display_name: user.name,
      status: "new",
      reply: "",
      version: 1,
      created_at: new Date().toISOString(),
    };
    if (rows.length >= 2000)
      throw new Error(
        "The practice inbox is full. Ask the demo teacher to export its messages.",
      );
    tx.set(key, [row, ...rows]);
    return row;
  });
}
export async function suggestionInbox(
  teacher = false,
  status = "all",
  offset = 0,
): Promise<{ rows: Suggestion[]; total: number }> {
  const user = actor(teacher);
  if (cloudEnabled) {
    const result = await platformRequest<{
      rows: (Suggestion & { deck_id: string; question_id: string })[];
      total: number;
    }>("csl_suggestion_inbox", {
      p_teacher: teacher,
      p_status: status,
      p_offset: offset,
    });
    return {
      ...result,
      rows: result.rows.map((r) => ({
        ...r,
        deck: r.deck_id,
        question: r.question_id,
      })),
    };
  }
  const rows = ((await adapter.get<Suggestion[]>(key)) ?? []).filter(
    (r) =>
      (teacher || r.user_id === user.id) &&
      (status === "all" || r.status === status),
  );
  return { rows: rows.slice(offset, offset + 20), total: rows.length };
}
export async function replySuggestion(
  row: Suggestion,
  status: string,
  reply: string,
) {
  const user = actor(true);
  validateReply(status, reply);
  if (cloudEnabled)
    return platformRequest("csl_reply_suggestion", {
      p_actor: user.id,
      p_id: row.id,
      p_version: row.version,
      p_status: status,
      p_reply: reply,
    });
  await adapter.transaction([key], (tx) => {
    const rows = tx.get<Suggestion[]>(key) ?? [];
    const old = rows.find((r) => r.id === row.id);
    if (!old || old.version !== row.version)
      throw new Error("This suggestion changed. Refresh before saving.");
    tx.set(
      key,
      rows.map((r) =>
        r.id === row.id
          ? {
              ...r,
              status: status as Suggestion["status"],
              reply: reply.trim(),
              version: r.version + 1,
            }
          : r,
      ),
    );
  });
}
