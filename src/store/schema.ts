import type { AppState } from "../core/types";
import { validRules } from "../core/rules";
import { object, isQuestion } from "../core/schema";
import { migrateState } from "../core/migrations";
export { object, isQuestion } from "../core/schema";
export function validState(value: unknown): value is AppState {
  if (
    !object(value) ||
    value.version !== 3 ||
    !Number.isSafeInteger(value.rev) ||
    !object(value.rules) ||
    !validRules(value.rules as unknown as AppState["rules"])
  )
    return false;
  const arrays = [
    "users",
    "items",
    "purchases",
    "runs",
    "events",
    "audit",
    "notifications",
    "sessions",
  ];
  if (
    !arrays.every(
      (k) =>
        Array.isArray(value[k]) && (value[k] as unknown[]).length <= 100000,
    ) ||
    !object(value.overlays)
  )
    return false;
  const s = value as unknown as AppState;
  if (
    !s.users.every(
      (u) =>
        object(u) &&
        [
          "id",
          "username",
          "name",
          "salt",
          "hash",
          "avatar",
          "section",
          "lastDay",
        ].every((k) => typeof u[k] === "string") &&
        ["admin", "student"].includes(u.role) &&
        [7, 8, 9, 10].includes(u.grade) &&
        ["merits", "xp", "streak", "lastSeen", "created"].every(
          (k) => Number.isFinite(u[k]) && Number(u[k]) >= 0,
        ) &&
        object(u.daily) &&
        Object.values(u.daily).every(
          (d) =>
            object(d) &&
            (["merits", "answers", "correct"] as const).every((k) =>
              Number.isFinite(d[k]),
            ) &&
            typeof d.spin === "boolean" &&
            typeof d.challenge === "boolean" &&
            Array.isArray(d.quests) &&
            d.quests.every((q) => typeof q === "string"),
        ) &&
        object(u.mastery) &&
        Object.values(u.mastery).every(
          (m) =>
            object(m) &&
            (["correct", "attempts", "completed"] as const).every(
              (k) => Number.isFinite(m[k]) && Number(m[k]) >= 0,
            ),
        ) &&
        Array.isArray(u.notes) &&
        u.notes.every(
          (n) =>
            object(n) &&
            (["id", "title", "text", "topic"] as const).every(
              (k) => typeof n[k] === "string",
            ) &&
            Number.isFinite(n.created),
        ) &&
        Array.isArray(u.review) &&
        u.review.every(
          (c) =>
            object(c) &&
            typeof c.questionId === "string" &&
            typeof c.deckId === "string" &&
            typeof c.due === "string" &&
            Number.isInteger(c.box) &&
            Number(c.box) >= 0 &&
            Number(c.box) <= 5,
        ) &&
        Array.isArray(u.badges) &&
        u.badges.every((b) => typeof b === "string"),
    )
  )
    return false;
  if (
    new Set(s.users.map((u) => u.id)).size !== s.users.length ||
    new Set(s.users.map((u) => u.username)).size !== s.users.length ||
    !s.users.some((u) => u.role === "admin")
  )
    return false;
  if (
    !s.items.every(
      (i) =>
        object(i) &&
        ["id", "name", "description", "icon", "color", "category"].every(
          (k) => typeof i[k] === "string",
        ) &&
        Number.isSafeInteger(i.price) &&
        i.price >= 0 &&
        Number.isSafeInteger(i.stock) &&
        i.stock >= 0,
    )
  )
    return false;
  if (
    !s.purchases.every(
      (p) =>
        object(p) &&
        ["id", "userId", "itemId", "itemName", "code"].every(
          (k) => typeof p[k] === "string",
        ) &&
        ["purchased", "redeemed", "claimed"].includes(p.status) &&
        Number.isFinite(p.price) &&
        Number.isFinite(p.created),
    )
  )
    return false;
  if (
    !s.runs.every(
      (r) =>
        object(r) &&
        ["id", "userId", "deckId", "level", "mode"].every(
          (k) => typeof r[k] === "string",
        ) &&
        Array.isArray(r.ids) &&
        r.ids.every((i) => typeof i === "string") &&
        Array.isArray(r.answers) &&
        r.answers.every(
          (a) =>
            object(a) &&
            typeof a.questionId === "string" &&
            typeof a.correct === "boolean" &&
            Number.isFinite(a.xp) &&
            Number.isFinite(a.merits),
        ) &&
        typeof r.completed === "boolean" &&
        Number.isFinite(r.created),
    )
  )
    return false;
  if (
    !s.events.every(
      (e) =>
        object(e) &&
        ["id", "type", "actor", "text"].every(
          (k) => typeof e[k] === "string",
        ) &&
        Number.isFinite(e.time),
    )
  )
    return false;
  if (
    !s.audit.every(
      (a) =>
        object(a) &&
        ["id", "actor", "command", "text"].every(
          (k) => typeof a[k] === "string",
        ) &&
        Number.isFinite(a.time) &&
        Number.isFinite(a.afterRev) &&
        typeof a.undone === "boolean",
    )
  )
    return false;
  if (
    !s.notifications.every(
      (n) =>
        object(n) &&
        ["id", "userId", "text"].every((k) => typeof n[k] === "string") &&
        typeof n.read === "boolean" &&
        Number.isFinite(n.time),
    )
  )
    return false;
  if (
    !s.sessions.every(
      (t) =>
        object(t) &&
        typeof t.token === "string" &&
        typeof t.userId === "string" &&
        Number.isFinite(t.expires),
    )
  )
    return false;
  return Object.values(s.overlays).every(
    (o) =>
      object(o) &&
      ["add", "patch", "delete"].includes(o.op) &&
      isQuestion(o.question),
  );
}
export function parseBackup(text: string): AppState {
  if (text.length > 15_000_000)
    throw new Error("That backup is too large (15 MB maximum).");
  const parsed: unknown = migrateState(JSON.parse(text));
  if (!validState(parsed))
    throw new Error(
      "This file is not a valid Cozy Science Lab backup. Your data is unchanged.",
    );
  // Inverse patches are not trusted input. They cannot be used to inject invalid state later.
  return {
    ...parsed,
    sessions: [],
    audit: parsed.audit.map((a) => ({ ...a, inverse: undefined })),
  };
}
