import type { AppState, Command, Question, Session } from "../core/types";
import { execute, applyResult } from "../core/commands";
import { seededRng } from "../core/random";
import { LocalStorageAdapter } from "./adapter";
import { initialState, newUser } from "./seed";
import { hashPassword, makeSalt, constantTimeEqual } from "./auth";
import { isQuestion, validState, parseBackup } from "./schema";
import { migrateState } from "../core/migrations";
const KEY = "csl:state";
const adapter = new LocalStorageAdapter();
let state: AppState;
const listeners = new Set<() => void>();
export const clock = { now: () => Date.now() };
const context = (s: AppState) => ({
  clock,
  rng: seededRng(crypto.getRandomValues(new Uint32Array(1))[0]),
  rules: s.rules,
});
export const getState = () => state;
export const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
function sessionToken(): string | undefined {
  try {
    const raw: unknown = JSON.parse(
      sessionStorage.getItem("csl:session") ?? "null",
    );
    if (
      !raw ||
      typeof raw !== "object" ||
      !("token" in raw) ||
      typeof raw.token !== "string"
    )
      return undefined;
    return raw.token;
  } catch {
    return undefined;
  }
}
export function session(): Session | undefined {
  const token = sessionToken();
  return state.sessions.find(
    (s) => s.token === token && s.expires > Date.now(),
  );
}
export const currentUser = () =>
  state.users.find((u) => u.id === session()?.userId);
export function clearInvalidSession() {
  if (!currentUser()) sessionStorage.removeItem("csl:session");
}
const requireActor = () => {
  const actor = currentUser();
  if (!actor) throw new Error("Your session expired. Please sign in again.");
  return actor;
};
export async function initStore() {
  const existing = await adapter.get<unknown>(KEY);
  if (!validState(existing)) {
    const salt = makeSalt(),
      hash = await hashPassword("admin123", salt);
    await adapter.transaction([KEY], (tx) => {
      const previous = tx.get<unknown>(KEY);
      if (validState(previous)) return;
      const migrated = migrateState(previous);
      if (validState(migrated)) {
        tx.set(KEY, { ...migrated, rev: migrated.rev + 1 });
        return;
      }
      if (previous !== undefined) {
        adapter.quarantine(previous);
        tx.set(KEY, initialState(hash, salt, Date.now()));
        window.dispatchEvent(
          new CustomEvent("csl:recovery", {
            detail:
              "Saved data did not match the current schema. A recovery copy was kept and safe defaults restored.",
          }),
        );
      } else tx.set(KEY, initialState(hash, salt, Date.now()));
    });
  }
  state = (await adapter.get<AppState>(KEY))!;
  adapter.subscribe(KEY, (value) => {
    if (validState(value)) {
      state = value;
      listeners.forEach((fn) => fn());
    }
  });
  clearInvalidSession();
  setInterval(() => {
    const actor = currentUser();
    if (!actor || document.visibilityState !== "visible") return;
    void adapter
      .transaction([KEY], (tx) => {
        const s = tx.get<AppState>(KEY)!;
        tx.set(KEY, {
          ...s,
          rev: s.rev + 1,
          users: s.users.map((u) =>
            u.id === actor.id ? { ...u, lastSeen: Date.now() } : u,
          ),
        });
      })
      .catch(() => undefined);
  }, 60000);
}
async function createSession(userId: string) {
  const previousToken = sessionToken();
  const record: Session = {
    token: crypto.randomUUID(),
    userId,
    expires: Date.now() + 8 * 60 * 60 * 1000,
  };
  await adapter.transaction([KEY], (tx) => {
    const s = tx.get<AppState>(KEY)!;
    tx.set(KEY, {
      ...s,
      rev: s.rev + 1,
      sessions: [
        ...s.sessions.filter(
          (t) => t.expires > Date.now() && t.token !== previousToken,
        ),
        record,
      ],
      users: s.users.map((u) =>
        u.id === userId ? { ...u, lastSeen: Date.now() } : u,
      ),
    });
  });
  sessionStorage.setItem(
    "csl:session",
    JSON.stringify({ token: record.token }),
  );
  listeners.forEach((fn) => fn());
}
export async function guestSession() {
  await createSession("guest");
}
export async function logout() {
  const token = sessionToken();
  try {
    if (token)
      await adapter.transaction([KEY], (tx) => {
        const s = tx.get<AppState>(KEY)!;
        tx.set(KEY, {
          ...s,
          rev: s.rev + 1,
          sessions: s.sessions.filter((t) => t.token !== token),
        });
      });
  } finally {
    sessionStorage.removeItem("csl:session");
    listeners.forEach((fn) => fn());
  }
}
export async function login(username: string, password: string) {
  const name = username.trim().toLowerCase();
  const limiterKey = `csl:login:${name.slice(0, 40)}`;
  const limiter = await adapter.get<{ tries: number; until: number }>(
    limiterKey,
  );
  if (limiter && limiter.until > Date.now())
    throw new Error(
      `Take a breath. Try again in ${Math.ceil((limiter.until - Date.now()) / 1000)} seconds.`,
    );
  const s = (await adapter.get<AppState>(KEY))!,
    user = s.users.find((u) => u.username === name && u.id !== "guest");
  const hash = await hashPassword(
    password,
    user?.salt || "cozy-demo-timing-salt",
  );
  if (!user || !constantTimeEqual(hash, user.hash)) {
    await adapter.transaction([limiterKey], (tx) => {
      const previous = tx.get<{ tries: number; until: number }>(limiterKey);
      if (previous && previous.until > Date.now())
        throw new Error(
          "Take a breath. Please wait 30 seconds before trying again.",
        );
      const tries = (previous && previous.until === 0 ? previous.tries : 0) + 1;
      tx.set(limiterKey, { tries, until: tries >= 5 ? Date.now() + 30000 : 0 });
    });
    throw new Error(
      "That username or password isn’t quite right. Please try again.",
    );
  }
  await adapter.set(limiterKey, { tries: 0, until: 0 });
  await createSession(user.id);
}
export async function register(input: {
  username: string;
  password: string;
  name: string;
  grade: number;
  section: string;
}) {
  const username = input.username.trim().toLowerCase();
  if (
    !/^[a-z][a-z0-9_]{2,19}$/.test(username) ||
    input.password.length < 8 ||
    input.password.length > 128 ||
    input.name.trim().length < 2 ||
    input.name.length > 40 ||
    ![7, 8, 9, 10].includes(input.grade) ||
    input.section.length > 40
  )
    throw new Error(
      "Use a 3–20 character username, an 8+ character password, your name, and a grade from 7 to 10.",
    );
  const salt = makeSalt(),
    hash = await hashPassword(input.password, salt),
    id = crypto.randomUUID();
  await adapter.transaction([KEY], (tx) => {
    const s = tx.get<AppState>(KEY)!;
    if (s.users.some((u) => u.username === username))
      throw new Error(
        "That username has a scientist already. Try a different one.",
      );
    const user = {
      ...newUser(id, username, input.name.trim(), Date.now()),
      merits: s.rules.starterMerits,
      grade: input.grade,
      section: input.section.trim(),
      salt,
      hash,
    };
    const event = {
      id: `registration-${s.rev + 1}`,
      type: "Registration",
      actor: id,
      time: Date.now(),
      text: `${user.name} joined the lab (Grade ${user.grade}).`,
    };
    tx.set(KEY, {
      ...s,
      rev: s.rev + 1,
      users: [...s.users, user],
      events: [...s.events, event],
      notifications: [
        ...s.notifications,
        ...s.users
          .filter((u) => u.role === "admin")
          .map((u) => ({
            id: `${event.id}-${u.id}`,
            userId: u.id,
            text: event.text,
            time: event.time,
            read: false,
          })),
      ],
    });
  });
  await createSession(id);
}
export async function dispatch(command: Command) {
  const actor = requireActor();
  if (command.type === "SubmitAnswer" && !isQuestion(command.question))
    throw new Error("This question could not be validated.");
  if (command.type === "AdminQuestion" && !isQuestion(command.overlay.question))
    throw new Error("The question JSON does not match the schema.");
  return adapter.transaction([KEY], (tx) => {
    const s = tx.get<AppState>(KEY)!;
    if (
      !s.sessions.some(
        (t) =>
          t.token === session()?.token &&
          t.userId === actor.id &&
          t.expires > Date.now(),
      )
    )
      throw new Error("Your session expired. Please sign in.");
    const ctx = context(s),
      result = execute(s, actor.id, command, ctx);
    tx.set(KEY, applyResult(s, actor.id, command, result, ctx));
    return result.events;
  });
}
export function exportBackup() {
  return JSON.stringify(
    {
      ...state,
      sessions: [],
      audit: state.audit.map((a) => ({ ...a, inverse: undefined })),
    },
    null,
    2,
  );
}
export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  const actor = requireActor(),
    token = session()?.token;
  if (actor.id === "guest")
    throw new Error("Join the lab to set a password for your own account.");
  if (newPassword.length < 8 || newPassword.length > 128)
    throw new Error("Use a new password with 8–128 characters.");
  if (
    !constantTimeEqual(
      await hashPassword(currentPassword, actor.salt),
      actor.hash,
    )
  )
    throw new Error("Your current password does not match.");
  const salt = makeSalt(),
    hash = await hashPassword(newPassword, salt);
  await adapter.transaction([KEY], (tx) => {
    const s = tx.get<AppState>(KEY)!,
      user = s.users.find((u) => u.id === actor.id);
    if (
      !user ||
      user.hash !== actor.hash ||
      !s.sessions.some((t) => t.token === token && t.expires > Date.now())
    )
      throw new Error("Your account changed. Sign in and try again.");
    tx.set(KEY, {
      ...s,
      rev: s.rev + 1,
      users: s.users.map((u) => (u.id === actor.id ? { ...u, salt, hash } : u)),
      sessions: s.sessions.filter(
        (t) => t.userId !== actor.id || t.token === token,
      ),
      events: [
        ...s.events,
        {
          id: `password-${s.rev + 1}`,
          type: "PasswordChanged",
          actor: actor.id,
          time: Date.now(),
          text: `${actor.name} changed their demo password.`,
        },
      ],
    });
  });
}
export async function importBackup(contents: string) {
  const actor = requireActor(),
    parsed = parseBackup(contents);
  await adapter.transaction([KEY], (tx) => {
    const s = tx.get<AppState>(KEY)!;
    if (
      s.users.find((u) => u.id === actor.id)?.role !== "admin" ||
      !s.sessions.some(
        (t) => t.token === session()?.token && t.expires > Date.now(),
      )
    )
      throw new Error("Only a signed-in admin can restore a backup.");
    tx.set(KEY, { ...parsed, rev: s.rev + 1, sessions: [] });
  });
  sessionStorage.removeItem("csl:session");
}
const banks = import.meta.glob<{ default: Question[] }>(
  "../data/questions/*/*.json",
);
const loaded = new Map<string, Question[]>();
export async function loadBranch(branch: string): Promise<Question[]> {
  if (!loaded.has(branch)) {
    const files = Object.entries(banks).filter(([key]) =>
      key.includes(`/questions/${branch}/`),
    );
    const data = await Promise.all(
      files.map(async ([, load]) => (await load()).default),
    );
    loaded.set(branch, data.flat());
  }
  const all = [...(loaded.get(branch) ?? [])],
    overlays = Object.values(state.overlays).filter((o) =>
      o.question.deckId.startsWith(`${branch}.`),
    );
  return [
    ...all.filter((q) => !overlays.some((o) => o.question.id === q.id)),
    ...overlays.filter((o) => o.op !== "delete").map((o) => o.question),
  ];
}
export async function loadDeck(id: string) {
  return (await loadBranch(id.split(".")[0])).filter((q) => q.deckId === id);
}
