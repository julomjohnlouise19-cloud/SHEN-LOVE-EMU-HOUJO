import { currentUser, getState, loadBranch } from ".";
import { LocalStorageAdapter } from "./adapter";
import { cloudEnabled } from "./cloud";
import {
  currentRemoteArcade,
  remoteArcadeAction,
  remoteArcadeRankings,
  startRemoteArcade,
  type ArcadeView,
} from "./platform";
import {
  arcadeAction,
  startArcade,
  validArcadeRules,
  type ArcadeAction,
  type ArcadeCategory,
  type ArcadeState,
} from "../core/arcade";
import { seededRng } from "../core/random";
import type { ArcadeRanking } from "../core/platform";

const adapter = new LocalStorageAdapter();
const stateKey = (id: string) => `csl:arcade:${id}`;
const RANKS = "csl:arcade-ranks";
interface LocalRank {
  userId: string;
  category: ArcadeCategory;
  score: number;
  correct: number;
  completedAt: string;
  runId: string;
}
const isRemote = () => cloudEnabled && currentUser()?.id !== "guest";
function actor() {
  const user = currentUser();
  if (!user) throw new Error("Sign in or choose guest exploration to play.");
  return user;
}
function validState(value: unknown): value is ArcadeState {
  const s = value as ArcadeState | null;
  return (
    !!s &&
    s.version === 1 &&
    typeof s.id === "string" &&
    typeof s.userId === "string" &&
    ["life", "chemistry", "physics", "earth"].includes(s.category) &&
    Array.isArray(s.ids) &&
    s.ids.length === 9 &&
    new Set(s.ids).size === 9 &&
    s.ids.every((id) => typeof id === "string") &&
    Number.isInteger(s.index) &&
    s.index >= 0 &&
    s.index <= 9 &&
    s.completed === (s.index === 9) &&
    [
      s.revision,
      s.score,
      s.coins,
      s.combo,
      s.correct,
      s.darts,
      s.deadline,
      s.reloadUntil,
      s.created,
    ].every((n) => Number.isFinite(n) && n >= 0) &&
    s.correct <= 9 &&
    s.combo <= 9 &&
    s.darts <= 3 &&
    Array.isArray(s.wrong) &&
    s.wrong.every((v) => typeof v === "string") &&
    typeof s.timeUsed === "boolean" &&
    typeof s.dartUsed === "boolean" &&
    validArcadeRules(s.rules)
  );
}
async function localView(state: ArcadeState): Promise<ArcadeView> {
  const q = (await loadBranch(state.category)).find(
    (q) => q.id === state.ids[state.index],
  );
  return {
    state,
    serverNow: Date.now(),
    question: q
      ? {
          id: q.id,
          deckId: q.deckId,
          level: q.level,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          topic: q.topic,
          gradeBand: q.gradeBand,
          bloom: q.bloom,
          curriculumArea: q.curriculumArea,
          reviewed: q.reviewed,
        }
      : null,
  };
}
export async function currentArcade(): Promise<ArcadeView | null> {
  const user = actor();
  if (isRemote()) return currentRemoteArcade();
  const value = await adapter.get<unknown>(stateKey(user.id));
  if (value === undefined || value === null) return null;
  if (!validState(value) || value.userId !== user.id) {
    adapter.quarantine(value);
    throw new Error(
      "This saved round needs recovery. A copy was kept; start a new round.",
    );
  }
  return value.completed ? null : localView(value);
}
export async function beginArcade(
  category: ArcadeCategory,
  requestId: string,
): Promise<ArcadeView> {
  const user = actor();
  if (isRemote()) return startRemoteArcade(category, requestId);
  const questions = await loadBranch(category);
  const state = startArcade(
    requestId,
    user.id,
    category,
    questions,
    Date.now(),
    seededRng(crypto.getRandomValues(new Uint32Array(1))[0]),
  );
  await adapter.set(stateKey(user.id), state);
  return localView(state);
}
export async function performArcade(
  view: ArcadeView,
  action: ArcadeAction,
  requestId: string,
): Promise<ArcadeView> {
  const user = actor();
  if (isRemote()) return remoteArcadeAction(view, action, requestId);
  const questions = await loadBranch(view.state.category),
    key = stateKey(user.id);
  const next = await adapter.transaction([key, RANKS], (tx) => {
    const state = tx.get<ArcadeState>(key);
    if (
      !validState(state) ||
      state.id !== view.state.id ||
      state.index !== view.state.index ||
      state.userId !== user.id ||
      currentUser()?.id !== user.id
    )
      throw new Error("This discovery already moved on. Reopen your round.");
    const q = questions.find((q) => q.id === state.ids[state.index]);
    if (!q) throw new Error("This card is unavailable. Start a new round.");
    const next = arcadeAction(state, q, action, Date.now());
    tx.set(key, next);
    if (next.completed) {
      const ranks = tx.get<LocalRank[]>(RANKS) ?? [];
      const old = ranks.find(
        (r) => r.userId === user.id && r.category === next.category,
      );
      if (
        !old ||
        next.score > old.score ||
        (next.score === old.score && next.correct > old.correct)
      )
        tx.set(
          RANKS,
          [
            ...ranks.filter(
              (r) => !(r.userId === user.id && r.category === next.category),
            ),
            {
              userId: user.id,
              category: next.category,
              score: next.score,
              correct: next.correct,
              completedAt: new Date().toISOString(),
              runId: next.id,
            },
          ].slice(-500),
        );
    }
    return next;
  });
  return localView(next);
}
export async function arcadeRankings(
  category: ArcadeCategory | "all",
): Promise<ArcadeRanking[]> {
  actor();
  if (isRemote()) return remoteArcadeRankings(category);
  const ranks = ((await adapter.get<LocalRank[]>(RANKS)) ?? [])
    .filter((r) => category === "all" || r.category === category)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.correct - a.correct ||
        a.completedAt.localeCompare(b.completedAt),
    );
  const best = [...new Map(ranks.map((r) => [r.userId, r])).keys()].map((id) =>
    ranks.find((r) => r.userId === id)!,
  );
  return best.slice(0, 100).map((r, index) => ({
    rank: index + 1,
    user_id: r.userId,
    display_name:
      getState().users.find((u) => u.id === r.userId)?.name ?? "Scientist",
    category: r.category,
    score: r.score,
    correct: r.correct,
    completed_at: r.completedAt,
  }));
}
export async function arcadePreferences() {
  return (
    (await adapter.get<{ sound: boolean; calm: boolean }>(
      "csl:arcade-preferences",
    )) ?? { sound: true, calm: false }
  );
}
export const saveArcadePreferences = (sound: boolean, calm: boolean) =>
  adapter.set("csl:arcade-preferences", { sound, calm });
