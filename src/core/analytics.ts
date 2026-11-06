import type { DomainEvent, User } from "./types";
export function misconceptionCounts(
  events: DomainEvent[],
  users: User[],
  section?: string,
): Record<string, number> {
  const undone = new Set(
    events
      .filter((e) => e.type === "ChangeUndone")
      .map((e) => String(e.data?.undoneRev)),
  );
  return events
    .filter(
      (e) =>
        e.type === "AnswerSubmitted" &&
        e.data?.misconception &&
        !undone.has(e.id.split("-")[0]) &&
        (!section ||
          (users.find((u) => u.id === e.actor)?.section || "No section yet") ===
            section),
    )
    .reduce<Record<string, number>>((counts, e) => {
      const id = String(e.data?.misconception);
      counts[id] = (counts[id] ?? 0) + 1;
      return counts;
    }, {});
}
