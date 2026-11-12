export type CommunityPeriod = "week" | "all";
export type CommunityScope = "school" | "friends";
export type FriendshipState =
  "none" | "incoming" | "outgoing" | "friends" | "blocked";
export interface CommunitySettings {
  username: string;
  listed: boolean;
  share_photo: boolean;
  share_bio: boolean;
  share_grade: boolean;
  version: number;
}
export interface ScientistCard {
  user_id: string;
  username: string;
  display_name: string;
  photo_path: string | null;
  bio: string;
  grade: number | null;
  points: number;
  correct: number;
  answers: number;
  discoveries: number;
  level: number;
  rank?: number;
  relationship: FriendshipState;
  friendship_version: number;
  active_recently?: boolean;
}
export interface CommunityHome {
  settings: CommunitySettings;
  friends: number;
  incoming: number;
  outgoing: number;
  teacher: boolean;
}
export interface CommunityRanking {
  rows: ScientistCard[];
  total: number;
  you: ScientistCard | null;
  week_start: string;
  week_end: string;
  refresh_at: string;
  server_now: string;
  timezone: string;
}
export interface FriendList {
  rows: ScientistCard[];
  total: number;
  active_count?: number;
}
export const blankCommunitySettings = (): CommunitySettings => ({
  username: "",
  listed: true,
  share_photo: false,
  share_bio: false,
  share_grade: false,
  version: 0,
});
export function friendLookup(value: string) {
  const name = value.trim();
  if (name.length < 2 || name.length > 254 || /[\r\n\0]/.test(name))
    throw new Error(
      "Enter at least two characters of their account name or existing sign-in.",
    );
  return name;
}
export function validateCommunitySettings(value: CommunitySettings) {
  if (
    [value.listed, value.share_photo, value.share_bio, value.share_grade].some(
      (v) => typeof v !== "boolean",
    ) ||
    !Number.isSafeInteger(value.version) ||
    value.version < 0
  )
    throw new Error(
      "Check your classroom sharing choices and refresh before saving.",
    );
}
export function weeklyCountdown(now: number, refreshAt: string) {
  const remaining = Date.parse(refreshAt) - now;
  if (!Number.isFinite(remaining)) return "Weekly standings";
  if (remaining <= 0) return "A fresh week is starting…";
  const minutes = Math.ceil(remaining / 60000);
  const days = Math.floor(minutes / 1440),
    hours = Math.floor((minutes % 1440) / 60),
    mins = minutes % 60;
  return `New week in ${days ? `${days}d ` : ""}${hours ? `${hours}h ` : ""}${mins}m`;
}
export interface ScoredDiscovery {
  user_id: string;
  deck_id: string;
  level: string;
  day: string;
  correct: number;
  total: number;
  archived?: boolean;
}
export function discoveryTotals(records: ScoredDiscovery[], from = "") {
  const best = new Map<string, ScoredDiscovery>();
  for (const r of records) {
    if (r.archived || r.day < from) continue;
    const key = `${r.user_id}/${r.deck_id}/${r.level}/${r.day}`;
    const previous = best.get(key);
    if (
      !previous ||
      r.correct > previous.correct ||
      (r.correct === previous.correct && r.total < previous.total)
    )
      best.set(key, r);
  }
  const totals = new Map<
    string,
    {
      points: number;
      correct: number;
      answers: number;
      discoveries: number;
      level: number;
    }
  >();
  for (const r of best.values()) {
    const t = totals.get(r.user_id) ?? {
      points: 0,
      correct: 0,
      answers: 0,
      discoveries: 0,
      level: 1,
    };
    t.points += r.correct * 10;
    t.correct += r.correct;
    t.answers += r.total;
    t.discoveries++;
    t.level =
      1 + Math.floor((t.correct * 12 + (t.answers - t.correct) * 3) / 120);
    totals.set(r.user_id, t);
  }
  return totals;
}
