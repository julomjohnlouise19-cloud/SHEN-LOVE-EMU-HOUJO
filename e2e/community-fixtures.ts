import {
  test as cloudTest,
  expect,
  users,
  signIn,
  signOut,
} from "./cloud-fixtures";
import {
  blankCommunitySettings,
  discoveryTotals,
  publicUsername,
  type CommunitySettings,
  type ScientistCard,
} from "../src/core/community";
interface Link {
  a: string;
  b: string;
  by: string;
  status: "pending" | "accepted" | "declined" | "blocked";
  blockedBy?: string;
  version: number;
  updated: number;
}
export interface SocialFixture {
  settings: Record<string, CommunitySettings>;
  links: Link[];
  sent: number;
  searches: number;
}
export const test = cloudTest.extend<{ social: SocialFixture }>({
  social: [
    async ({ backend, context }, use) => {
      backend.communityReady = true;
      const social: SocialFixture = {
        settings: Object.fromEntries(
          users.map((u, i) => [
            u.id,
            {
              ...blankCommunitySettings(),
              username: `curious_${i + 1}`,
              listed: i < 2,
              version: 1,
            },
          ]),
        ),
        links: [],
        sent: 0,
        searches: 0,
      };
      const actions = new Map<string, { payload: string; result: unknown }>();
      const pair = (a: string, b: string) =>
        social.links.find(
          (f) => [f.a, f.b].includes(a) && [f.a, f.b].includes(b),
        );
      const visible = (target: string, viewer: string) => {
        const p = backend.profiles.find((p) => p.user_id === target);
        return (
          p?.active &&
          !p.is_teacher &&
          social.settings[target]?.listed &&
          pair(target, viewer)?.status !== "blocked"
        );
      };
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Manila",
      });
      const monday = new Date(`${today}T00:00:00Z`);
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
      const week = monday.toISOString().slice(0, 10);
      const records = () =>
        backend.rows.map((r) => ({
          user_id: r.user_id,
          deck_id: r.deck_id,
          level: r.level,
          correct: r.correct,
          total: r.total,
          day: new Date(r.received_at).toLocaleDateString("en-CA", {
            timeZone: "Asia/Manila",
          }),
          archived: backend.labels[r.id]?.archived,
        }));
      const card = (id: string, viewer: string): ScientistCard | null => {
        if (id !== viewer && !visible(id, viewer)) return null;
        const p = backend.profiles.find((p) => p.user_id === id),
          s = social.settings[id];
        if (!p || !s) return null;
        const relation = pair(id, viewer),
          t = discoveryTotals(records()).get(id);
        return {
          user_id: id,
          display_name: p.display_name,
          username: s.username,
          photo_path: s.share_photo ? p.photo_path : null,
          bio: s.share_bio ? (backend.preferences[id]?.bio ?? "") : "",
          grade: s.share_grade ? p.grade : null,
          points: t?.points ?? 0,
          correct: t?.correct ?? 0,
          answers: t?.answers ?? 0,
          discoveries: t?.discoveries ?? 0,
          level: t?.level ?? 1,
          relationship:
            relation?.status === "accepted"
              ? "friends"
              : relation?.status === "blocked"
                ? "blocked"
                : relation?.status === "pending"
                  ? relation.by === viewer
                    ? "outgoing"
                    : "incoming"
                  : "none",
          friendship_version: relation?.version ?? 0,
        };
      };
      const home = (id: string) => {
        const peers = social.links.filter(
          (f) =>
            [f.a, f.b].includes(id) &&
            social.settings[id].listed &&
            visible(f.a === id ? f.b : f.a, id),
        );
        return {
          settings: social.settings[id],
          teacher: backend.profiles.find((p) => p.user_id === id)!.is_teacher,
          friends: peers.filter((f) => f.status === "accepted").length,
          incoming: peers.filter((f) => f.status === "pending" && f.by !== id)
            .length,
          outgoing: peers.filter((f) => f.status === "pending" && f.by === id)
            .length,
        };
      };
      await context.route(
        /\/rest\/v1\/rpc\/csl_(?:social_home|save_social_profile|leaderboard|find_scientist|scientist_card|friend_list|social_action)$/,
        async (route) => {
          const request = route.request();
          const respond = (value: unknown, status = 200) =>
            route.fulfill({
              status,
              contentType: "application/json",
              body: JSON.stringify(value),
              headers: {
                "access-control-allow-origin": "*",
                "access-control-allow-headers": "*",
                "access-control-allow-methods": "GET,POST,OPTIONS",
              },
            });
          if (request.method() === "OPTIONS") return respond(null, 204);
          let id = "";
          try {
            id = JSON.parse(
              Buffer.from(
                request.headers().authorization.split(".")[1],
                "base64url",
              ).toString(),
            ).sub;
          } catch {
            /* Public request fails below. */
          }
          const p = backend.profiles.find((p) => p.user_id === id);
          const fail = (message: string) =>
            respond({ code: "P0001", message }, 400);
          if (!p?.active)
            return fail("Your account is paused. Please contact your teacher.");
          const body = request.postDataJSON() as Record<string, unknown>;
          const rpc = new URL(request.url()).pathname.split("/").pop();
          backend.sharedPhotoPaths = backend.profiles
            .filter(
              (p) =>
                p.active &&
                social.settings[p.user_id]?.listed &&
                social.settings[p.user_id]?.share_photo &&
                p.photo_path,
            )
            .map((p) => p.photo_path!);
          if (rpc === "csl_social_home") return respond(home(id));
          if (rpc === "csl_save_social_profile") {
            let name: string;
            try {
              name = publicUsername(String(body.p_username));
            } catch {
              return fail("Choose a valid classroom username.");
            }
            const s = social.settings[id];
            if (p.is_teacher)
              return fail("Student sharing is available to student accounts.");
            if (s.version !== body.p_version)
              return fail(
                "Your sharing settings changed. Refresh before saving.",
              );
            if (
              Object.entries(social.settings).some(
                ([other, cfg]) => other !== id && cfg.username === name,
              )
            )
              return fail(
                "That username is already taken. Choose another one.",
              );
            social.settings[id] = {
              username: name,
              listed: Boolean(body.p_listed),
              share_photo: Boolean(body.p_share_photo),
              share_bio: Boolean(body.p_share_bio),
              share_grade: Boolean(body.p_share_grade),
              version: s.version + 1,
            };
            return respond(home(id));
          }
          if (rpc === "csl_leaderboard") {
            const stats = discoveryTotals(
              records(),
              body.p_period === "week" ? week : "",
            );
            const rows = backend.profiles
              .filter(
                (p) =>
                  visible(p.user_id, id) &&
                  (body.p_scope !== "friends" ||
                    p.user_id === id ||
                    pair(p.user_id, id)?.status === "accepted") &&
                  (!body.p_grade ||
                    (social.settings[p.user_id].share_grade &&
                      p.grade === body.p_grade)),
              )
              .map((p) => {
                const c = card(p.user_id, id)!,
                  t = stats.get(p.user_id);
                return {
                  ...c,
                  points: t?.points ?? 0,
                  correct: t?.correct ?? 0,
                  answers: t?.answers ?? 0,
                  discoveries: t?.discoveries ?? 0,
                };
              })
              .sort(
                (a, b) =>
                  b.points - a.points || a.username.localeCompare(b.username),
              );
            let rank = 0,
              points = -1;
            const ranked = rows.map((r) => {
              if (r.points !== points) {
                rank++;
                points = r.points;
              }
              return { ...r, rank };
            });
            const offset = Number(body.p_offset ?? 0);
            return respond({
              rows: ranked.slice(offset, offset + 20),
              total: ranked.length,
              you: ranked.find((r) => r.user_id === id) ?? null,
            });
          }
          if (rpc === "csl_scientist_card")
            return respond(card(String(body.p_user_id), id));
          if (rpc === "csl_find_scientist") {
            social.searches++;
            const handle = String(body.p_username)
              .toLowerCase()
              .replace(/^@/, "");
            const target = Object.keys(social.settings).find(
              (uid) => social.settings[uid].username === handle,
            );
            if (target === id)
              return fail("That is your username. Try a classmate’s username.");
            return respond(target ? card(target, id) : null);
          }
          if (rpc === "csl_friend_list") {
            const kind = String(body.p_kind);
            const all = social.links
              .filter((f) => [f.a, f.b].includes(id))
              .filter((f) =>
                kind === "blocked"
                  ? f.status === "blocked" && f.blockedBy === id
                  : social.settings[id].listed &&
                    visible(f.a === id ? f.b : f.a, id) &&
                    (kind === "friends"
                      ? f.status === "accepted"
                      : f.status === "pending" &&
                        (kind === "incoming" ? f.by !== id : f.by === id)),
              )
              .map((f) => {
                const target = f.a === id ? f.b : f.a;
                return kind === "blocked"
                  ? {
                      user_id: target,
                      display_name: backend.profiles.find(
                        (p) => p.user_id === target,
                      )!.display_name,
                      username: social.settings[target].username,
                      photo_path: null,
                      bio: "",
                      grade: null,
                      points: 0,
                      correct: 0,
                      answers: 0,
                      discoveries: 0,
                      level: 1,
                      relationship: "blocked",
                      friendship_version: f.version,
                    }
                  : card(target, id);
              });
            const offset = Number(body.p_offset ?? 0);
            return respond({
              rows: all.slice(offset, offset + 20),
              total: all.length,
            });
          }
          if (rpc === "csl_social_action") {
            if (p.is_teacher)
              return fail("Friend requests are for student accounts.");
            const kind = String(body.p_action),
              key = `${id}/${body.p_request_id}`,
              payload = JSON.stringify(body);
            if (actions.has(key))
              return actions.get(key)!.payload === payload
                ? respond(actions.get(key)!.result)
                : fail("This action ID belongs to different details.");
            const target =
              kind === "send"
                ? Object.keys(social.settings).find(
                    (uid) => social.settings[uid].username === body.p_username,
                  )
                : String(body.p_target);
            if (!target || target === id)
              return fail("Choose another scientist.");
            let f = pair(id, target);
            if (
              ["send", "accept"].includes(kind) &&
              (!social.settings[id].listed || !visible(target, id))
            )
              return fail(
                "Join classroom sharing and choose an available student.",
              );
            if (kind === "send") {
              if (f?.status === "blocked")
                return fail("This scientist is unavailable.");
              if (f?.status !== "pending" && f?.status !== "accepted") {
                if (f && Date.now() - f.updated < 86400000)
                  return fail(
                    "Please wait a day before sending another invitation to this scientist.",
                  );
                if (!f) {
                  f = {
                    a: id,
                    b: target,
                    by: id,
                    status: "pending",
                    version: 1,
                    updated: Date.now(),
                  };
                  social.links.push(f);
                } else {
                  f.status = "pending";
                  f.by = id;
                  f.version++;
                  f.updated = Date.now();
                }
                social.sent++;
              }
            } else {
              if (kind === "block" && !f) {
                f = {
                  a: id,
                  b: target,
                  by: id,
                  status: "blocked",
                  blockedBy: id,
                  version: 1,
                  updated: Date.now(),
                };
                social.links.push(f);
              } else {
                if (!f || f.version !== body.p_version)
                  return fail(
                    "This invitation changed. Refresh before trying again.",
                  );
                if (
                  ["accept", "decline"].includes(kind) &&
                  (f.status !== "pending" || f.by === id)
                )
                  return fail(
                    "Only the invited scientist can answer this request.",
                  );
                if (
                  kind === "cancel" &&
                  (f.status !== "pending" || f.by !== id)
                )
                  return fail(
                    "Only your own pending invitation can be cancelled.",
                  );
                if (kind === "remove" && f.status !== "accepted")
                  return fail("This friendship is no longer active.");
                if (
                  kind === "unblock" &&
                  (f.status !== "blocked" || f.blockedBy !== id)
                )
                  return fail("Only your own block can be removed.");
                f.status =
                  kind === "accept"
                    ? "accepted"
                    : kind === "block"
                      ? "blocked"
                      : "declined";
                f.blockedBy = kind === "block" ? id : undefined;
                f.version++;
                f.updated = Date.now();
              }
            }
            const result = {
              ok: true,
              state:
                f!.status === "accepted"
                  ? "friends"
                  : f!.status === "blocked"
                    ? "blocked"
                    : f!.status === "pending"
                      ? f!.by === id
                        ? "outgoing"
                        : "incoming"
                      : "none",
            };
            actions.set(key, { payload, result });
            return respond(result);
          }
          return fail("Unknown community request");
        },
      );
      await use(social);
    },
    { auto: true },
  ],
});
export { expect, users, signIn, signOut };
