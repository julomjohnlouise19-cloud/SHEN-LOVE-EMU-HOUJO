import type { Answer, Run } from "./types";

export interface CloudJob {
  userId: string;
  runId: string;
  deckId: string;
  level: Run["level"];
  mode: Run["mode"];
  startedAt: string;
  answers: { question_id: string; value: Answer; question_version?: number }[];
}
export interface CloudOutbox {
  version: 1;
  pending: CloudJob[];
  sent: string[];
}
export function readOutbox(value: unknown): CloudOutbox {
  if (value === undefined) return { version: 1, pending: [], sent: [] };
  const object = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
  const answer = (v: unknown) =>
    typeof v === "string" ||
    (Array.isArray(v) && v.every((item) => typeof item === "string")) ||
    (object(v) && Object.values(v).every((item) => typeof item === "string"));
  if (
    object(value) &&
    value.version === 1 &&
    Array.isArray(value.sent) &&
    value.sent.every((item) => typeof item === "string") &&
    Array.isArray(value.pending) &&
    value.pending.every(
      (job) =>
        object(job) &&
        ["userId", "runId", "deckId", "startedAt"].every(
          (key) => typeof job[key] === "string",
        ) &&
        ["easy", "medium", "hard"].includes(String(job.level)) &&
        ["practice", "review", "daily", "boss"].includes(String(job.mode)) &&
        Array.isArray(job.answers) &&
        job.answers.length > 0 &&
        job.answers.length <= 8 &&
        job.answers.every(
          (entry) =>
            object(entry) &&
            typeof entry.question_id === "string" &&
            answer(entry.value),
        ),
    )
  )
    return value as unknown as CloudOutbox;
  throw new Error(
    "The cloud upload queue needs recovery. Preserve browser site data before clearing storage.",
  );
}
export const cloudJobKey = (job: Pick<CloudJob, "userId" | "runId">) =>
  `${job.userId}/${job.runId}`;
export function jobForRun(run: Run): CloudJob {
  if (!run.completed || !run.answers.length)
    throw new Error("Only completed discoveries can be uploaded.");
  return {
    userId: run.userId,
    runId: run.id,
    deckId: run.deckId,
    level: run.level,
    mode: run.mode,
    startedAt: new Date(run.created).toISOString(),
    answers: run.answers.map(({ questionId, value, questionVersion }) => ({
      question_id: questionId,
      value,
      ...(questionVersion === undefined
        ? {}
        : { question_version: questionVersion }),
    })),
  };
}
export function enqueue(outbox: CloudOutbox, job: CloudJob): CloudOutbox {
  const key = cloudJobKey(job);
  if (
    outbox.sent.includes(key) ||
    outbox.pending.some((p) => cloudJobKey(p) === key)
  )
    return outbox;
  return { ...outbox, pending: [...outbox.pending, job] };
}
export function acknowledge(outbox: CloudOutbox, job: CloudJob): CloudOutbox {
  const key = cloudJobKey(job);
  return {
    version: 1,
    pending: outbox.pending.filter((p) => cloudJobKey(p) !== key),
    sent: [...outbox.sent.filter((p) => p !== key), key].slice(-4000),
  };
}
export function csvCell(value: unknown): string {
  const text = String(value ?? "");
  // Quoting alone does not stop spreadsheet formula execution.
  return `"${(/^[\s]*[=+\-@\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
}
