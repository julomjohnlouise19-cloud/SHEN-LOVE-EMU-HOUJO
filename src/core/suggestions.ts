export type SuggestionStatus = "new" | "reviewing" | "done";
export interface SuggestionDraft {
  requestId?: string;
  category: string;
  title: string;
  message: string;
  deck: string;
  question: string;
}
export interface Suggestion extends SuggestionDraft {
  id: string;
  user_id: string;
  display_name: string;
  status: SuggestionStatus;
  reply: string;
  version: number;
  created_at: string;
}
export function validateSuggestion(value: SuggestionDraft) {
  if (
    !["idea", "question", "problem"].includes(value.category) ||
    value.title.trim().length < 3 ||
    value.title.trim().length > 80 ||
    value.message.trim().length < 10 ||
    value.message.trim().length > 1500
  )
    throw new Error(
      "Choose a category, a title of 3–80 characters and a message of 10–1500 characters.",
    );
}
export function validateReply(status: string, reply: string) {
  if (
    !["new", "reviewing", "done"].includes(status) ||
    reply.length > 600 ||
    (status === "done" && reply.trim().length < 3)
  )
    throw new Error(
      "Choose a status and add a short reply before resolving a suggestion.",
    );
}
