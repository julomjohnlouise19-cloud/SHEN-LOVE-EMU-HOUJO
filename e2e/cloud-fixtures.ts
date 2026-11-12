import { test as base, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import type { CloudRecord } from "../src/store/cloud";
import type { ArcadeView } from "../src/store/platform";
import type { Question, Answer } from "../src/core/types";
import type { ClassroomRules } from "../src/core/classroom";
import type { LabItem, LabOrder } from "../src/core/platform";
import {
  defaultArcadeRules,
  startArcade,
  arcadeAction,
  type ArcadeRules,
  type ArcadeAction,
} from "../src/core/arcade";
import { isCorrect, defaultRules } from "../src/core/rules";
import { seededRng } from "../src/core/random";
import { initialState } from "../src/store/seed";
import type { Appearance } from "../src/core/appearance";

export const host = "https://cozy-backend-test.supabase.co";
export const users = ["student1", "student2", "teacher"].map((name, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index + 1}`,
  email: `${name}@example.test`,
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-11-10T00:00:00Z",
}));
const sourceBank = readdirSync("src/data/questions").flatMap((dir) =>
  readdirSync(`src/data/questions/${dir}`).flatMap(
    (file) =>
      JSON.parse(
        readFileSync(`src/data/questions/${dir}/${file}`, "utf8"),
      ) as Question[],
  ),
);
interface Profile {
  user_id: string;
  display_name: string;
  grade: number;
  section: string;
  is_teacher: boolean;
  active: boolean;
  photo_path: string | null;
  version: number;
}
export interface Backend {
  available: boolean;
  suggestionsReady: boolean;
  accountsReady: boolean;
  suggestions: Record<string, unknown>[];
  platform: number;
  failUploads: boolean;
  uploads: number;
  rejected: number;
  rows: CloudRecord[];
  emailLimited: boolean;
  emailDeliveryFailed: boolean;
  signupCalls: number;
  signupMetadata: Record<string, unknown>;
  resendCalls: number;
  photoUploads: number;
  recoverCalls: number;
  invalidRecoveryCode: boolean;
  getUserCalls: number;
  tokenCalls: number;
  passwordChanges: number;
  statusDelay: number;
  preferences: Record<string, Appearance>;
  labels: Record<
    string,
    { archived: boolean; version: number; reason: string }
  >;
  profiles: Profile[];
  items: LabItem[];
  orders: LabOrder[];
  credits: Record<string, number>;
  rules: ClassroomRules;
  game: ArcadeRules;
  settingsVersion: number;
  activity: Record<string, unknown>[];
  overrides: { question: Question; active: boolean; version: number }[];
}
export const test = base.extend<{ backend: Backend }>({
  backend: [
    async ({ context }, use) => {
      const state: Backend = {
        available: true,
        suggestionsReady: true,
        accountsReady: true,
        suggestions: [],
        platform: 3,
        failUploads: false,
        uploads: 0,
        rejected: 0,
        rows: [],
        emailLimited: false,
        emailDeliveryFailed: false,
        signupCalls: 0,
        signupMetadata: {},
        resendCalls: 0,
        photoUploads: 0,
        recoverCalls: 0,
        invalidRecoveryCode: false,
        getUserCalls: 0,
        tokenCalls: 0,
        passwordChanges: 0,
        statusDelay: 0,
        preferences: {},
        labels: {},
        profiles: users.map((user, index) => ({
          user_id: user.id,
          display_name: ["Student One", "Student Two", "Teacher"][index],
          grade: 8,
          section: "Curiosity",
          is_teacher: index === 2,
          active: true,
          photo_path: null,
          version: 0,
        })),
        items: initialState("", "", 0).items.map((item) => ({
          ...item,
          active: true,
          version: 1,
        })),
        orders: [],
        credits: Object.fromEntries(users.map((user) => [user.id, 200])),
        rules: { ...defaultRules },
        game: structuredClone(defaultArcadeRules),
        settingsVersion: 1,
        activity: [],
        overrides: [],
      };
      const errors: string[] = [],
        photos = new Map<string, Buffer>(),
        requests = new Map<string, unknown>(),
        games = new Map<string, ArcadeView>();
      const bank = new Map(sourceBank.map((q) => [q.id, structuredClone(q)])),
        versions = new Map(
          sourceBank.map((q) => [`${q.id}/0`, structuredClone(q)]),
        );
      const fingerprint = (p: Profile) =>
        createHash("md5").update(JSON.stringify(p)).digest("hex");
      const lab = (who: number) => ({
        credits: state.credits[users[who].id],
        items: state.items.filter((item) => item.active),
        orders: state.orders.filter((order) => order.user_id === users[who].id),
        rules: state.rules,
        game: state.game,
        settings_version: state.settingsVersion,
        overrides: state.overrides,
      });
      const toView = (game: ArcadeView): ArcadeView => {
        const q = bank.get(game.state.ids[game.state.index]);
        let publicQ: ArcadeView["question"] = null;
        if (q) {
          const copy = { ...q } as Partial<Question>;
          delete copy.answer;
          delete copy.explanation;
          delete copy.scienceFact;
          publicQ = copy as ArcadeView["question"];
        }
        return {
          state: structuredClone(game.state),
          question: publicQ,
          serverNow: Date.now(),
        };
      };
      context.on("page", (page) => {
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (message.type() !== "error") return;
          if (
            message.location().url.startsWith(host) &&
            (/(?:400|404|429|503)/.test(message.text()) ||
              (state.emailDeliveryFailed &&
                /\/auth\/v1\/(?:signup|resend|recover)/.test(
                  message.location().url,
                ) &&
                /500/.test(message.text())))
          )
            return;
          errors.push(message.text());
        });
      });
      await context.route(`${host}/**`, async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        const contentType = request.headers()["content-type"] ?? "";
        const body = contentType.includes("application/json")
          ? (request.postDataJSON() as Record<string, unknown>)
          : null;
        let who = -1;
        try {
          const sub = JSON.parse(
            Buffer.from(
              request.headers().authorization.split(".")[1],
              "base64url",
            ).toString(),
          ).sub;
          who = users.findIndex((user) => user.id === sub);
        } catch {
          /* Public request. */
        }
        const respond = (data: unknown, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify(data),
            headers: {
              "access-control-allow-origin": "*",
              "access-control-allow-headers": "*",
              "access-control-allow-methods": "GET,POST,DELETE,PUT,OPTIONS",
            },
          });
        const failed = (message: string, status = 400) =>
          respond({ code: "P0001", message }, status);
        if (request.method() === "OPTIONS")
          return route.fulfill({
            status: 204,
            headers: {
              "access-control-allow-origin": "*",
              "access-control-allow-headers": "*",
              "access-control-allow-methods": "GET,POST,DELETE,PUT,OPTIONS",
            },
          });
        if (url.pathname === "/auth/v1/token") {
          state.tokenCalls++;
          if (
            url.searchParams.get("grant_type") === "pkce" &&
            state.invalidRecoveryCode
          )
            return respond(
              {
                code: "flow_state_expired",
                message:
                  "The recovery link has expired or has already been used.",
              },
              400,
            );
          const user =
            users.find((user) => user.email === body?.email) ?? users[0];
          if (body?.password === "wrong-password")
            return respond(
              {
                message: "Invalid login credentials",
                error_code: "invalid_credentials",
              },
              400,
            );
          const payload = {
            sub: user.id,
            aud: "authenticated",
            role: "authenticated",
            exp: Math.floor(Date.now() / 1000) + 3600,
          };
          return respond({
            access_token: `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.fixture`,
            token_type: "bearer",
            expires_in: 3600,
            refresh_token: "fixture-refresh",
            user,
          });
        }
        if (url.pathname === "/auth/v1/signup") {
          state.signupCalls++;
          state.signupMetadata = (body?.data ?? {}) as Record<string, unknown>;
          if (state.emailDeliveryFailed)
            return respond(
              {
                code: "unexpected_failure",
                message: "Error sending confirmation email",
              },
              500,
            );
          if (state.emailLimited)
            return respond(
              {
                message: "email rate exceeded",
                code: "over_email_send_rate_limit",
                error_code: "over_email_send_rate_limit",
              },
              429,
            );
          return respond({ ...users[0], email: body?.email, identities: [] });
        }
        if (url.pathname === "/auth/v1/resend") {
          state.resendCalls++;
          if (state.emailDeliveryFailed)
            return respond(
              {
                code: "unexpected_failure",
                message: "Error sending confirmation email",
              },
              500,
            );
          return respond({});
        }
        if (url.pathname === "/auth/v1/recover") {
          state.recoverCalls++;
          if (state.emailDeliveryFailed)
            return respond(
              {
                code: "unexpected_failure",
                message: "Error sending recovery email",
              },
              500,
            );
          if (state.emailLimited)
            return respond(
              {
                code: "over_email_send_rate_limit",
                error_code: "over_email_send_rate_limit",
                message: "email rate exceeded",
              },
              429,
            );
          return respond({});
        }
        if (url.pathname === "/auth/v1/user") {
          state.getUserCalls++;
          if (request.method() === "PUT" && body?.password)
            state.passwordChanges++;
          return respond(users[Math.max(0, who)]);
        }
        if (url.pathname === "/auth/v1/logout")
          return route.fulfill({ status: 204 });
        const storage = "/storage/v1/object/";
        if (url.pathname.startsWith(storage)) {
          if (url.pathname.startsWith(`${storage}sign/csl-avatars/`)) {
            const path = url.pathname.slice(
              `${storage}sign/csl-avatars/`.length,
            );
            if (request.method() === "GET")
              return route.fulfill({
                status: 200,
                contentType: "image/webp",
                body: photos.get(path)!,
              });
            expect(who >= 0).toBe(true);
            expect(
              path.startsWith(`${users[who].id}/`) ||
                state.profiles[who].is_teacher,
            ).toBe(true);
            return respond({
              signedURL: `/object/sign/csl-avatars/${path}?token=fixture`,
            });
          }
          if (request.method() === "DELETE") {
            for (const path of (body?.prefixes ?? []) as string[]) {
              expect(path.startsWith(`${users[who].id}/`)).toBe(true);
              photos.delete(path);
            }
            return respond([]);
          }
          const path = url.pathname.slice(`${storage}csl-avatars/`.length),
            raw = request.postDataBuffer()!;
          expect(path.startsWith(`${users[who].id}/`)).toBe(true);
          const riff = raw.indexOf(Buffer.from("RIFF"));
          expect(riff).toBeGreaterThanOrEqual(0);
          const length = raw.readUInt32LE(riff + 4) + 8;
          expect(length).toBeLessThanOrEqual(262144);
          photos.set(path, raw.subarray(riff, riff + length));
          state.photoUploads++;
          return respond({ Key: `csl-avatars/${path}`, Id: "photo-fixture" });
        }
        const rpc = url.pathname.split("/").pop();
        if (rpc === "csl_backend_status") {
          if (state.statusDelay)
            await new Promise((resolve) =>
              setTimeout(resolve, state.statusDelay),
            );
          return state.available
            ? respond({
                version: 1,
                questions: 972,
                platform: state.platform,
                accounts: state.accountsReady ? 1 : 0,
              })
            : respond({ message: "function not installed" }, 404);
        }
        if (rpc === "csl_suggestions_status")
          return state.suggestionsReady
            ? respond({ version: 1 })
            : respond({ message: "function not installed" }, 404);
        if (who < 0) return failed("Not signed in");
        const uid = users[who].id,
          profile = state.profiles[who];
        if (!profile.active)
          return failed("Your account is paused. Please contact your teacher.");
        if (rpc === "csl_scientist_profile") {
          if (!state.accountsReady)
            return failed("Function not installed", 404);
          if (!profile.is_teacher) return failed("Teacher access is required.");
          const target = state.profiles.find(
            (p) => p.user_id === body?.p_user_id,
          );
          if (!target) return failed("Scientist not found.");
          const rows = state.rows.filter((r) => r.user_id === target.user_id);
          return respond({
            ...target,
            created_at: "2026-11-10T00:00:00Z",
            email: users.find((u) => u.id === target.user_id)!.email,
            ...(state.preferences[target.user_id] ?? {
              theme: "meadow",
              bio: "",
            }),
            credits: state.credits[target.user_id],
            attempts: rows.length,
            correct: rows.reduce((n, r) => n + r.correct, 0),
            answers: rows.reduce((n, r) => n + r.total, 0),
            pending_reservations: state.orders.filter(
              (o) => o.user_id === target.user_id && o.status === "reserved",
            ).length,
            expected_updated: fingerprint(target),
            terms_accepted: false,
            terms_version: "",
            terms_accepted_at: "",
          });
        }
        if (rpc === "csl_send_suggestion") {
          const id = String(body?.p_id),
            old = state.suggestions.find((r) => r.id === id);
          if (old)
            return old.user_id === uid
              ? respond(old)
              : failed("Request already used");
          const row = {
            id,
            user_id: uid,
            display_name: profile.display_name,
            category: body?.p_category,
            title: body?.p_title,
            message: body?.p_message,
            deck_id: body?.p_deck,
            question_id: body?.p_question,
            status: "new",
            reply: "",
            version: 1,
            created_at: new Date().toISOString(),
          };
          state.suggestions.unshift(row);
          return respond(row);
        }
        if (rpc === "csl_suggestion_inbox") {
          if (body?.p_teacher && !profile.is_teacher)
            return failed("Teacher access required");
          const rows = state.suggestions.filter(
            (r) =>
              (body?.p_teacher || r.user_id === uid) &&
              (body?.p_status === "all" || r.status === body?.p_status),
          );
          const offset = Number(body?.p_offset) || 0;
          return respond({
            rows: rows.slice(offset, offset + 20),
            total: rows.length,
          });
        }
        if (rpc === "csl_reply_suggestion") {
          if (!profile.is_teacher) return failed("Teacher access required");
          const row = state.suggestions.find((r) => r.id === body?.p_id);
          if (!row || row.version !== body?.p_version)
            return failed(
              "Another teacher updated this suggestion. Refresh before saving.",
            );
          Object.assign(row, {
            status: body?.p_status,
            reply: body?.p_reply,
            version: Number(row.version) + 1,
          });
          return respond(row);
        }
        if (rpc === "csl_preferences") {
          if (body?.p_theme)
            state.preferences[uid] = {
              theme: body.p_theme,
              bio: body.p_bio,
            } as Appearance;
          return respond(
            state.preferences[uid] ?? { theme: "meadow", bio: "" },
          );
        }
        if (rpc === "csl_my_profile")
          return respond({ ...profile, credits: state.credits[uid] });
        if (rpc === "csl_my_lab") {
          expect(body?.p_user_id).toBe(uid);
          return respond(lab(who));
        }
        if (rpc === "csl_update_profile") {
          expect(body?.p_user_id).toBe(uid);
          Object.assign(profile, {
            display_name: body?.p_name,
            grade: body?.p_grade,
            section: body?.p_section,
            version: profile.version + 1,
          });
          return respond(null);
        }
        if (rpc === "csl_set_photo") {
          expect(body?.p_user_id).toBe(uid);
          profile.photo_path = body?.p_path as string | null;
          return respond(null);
        }
        if (rpc === "csl_record_quiz") {
          state.uploads++;
          if (state.failUploads) {
            state.rejected++;
            return respond(
              { message: "Temporary test outage", code: "TEST" },
              503,
            );
          }
          expect(body?.p_user_id).toBe(uid);
          const old = state.rows.find(
            (row) => row.id === body?.p_client_run_id && row.user_id === uid,
          );
          if (old)
            return respond({
              id: old.id,
              correct: old.correct,
              total: old.total,
            });
          const responses = (
            body?.p_answers as {
              question_id: string;
              value: Answer;
              question_version?: number;
            }[]
          ).map((answer) => {
            const q = versions.get(
              `${answer.question_id}/${answer.question_version ?? 0}`,
            )!;
            return {
              ...answer,
              prompt: q.prompt,
              correct: isCorrect(q, answer.value),
            };
          });
          const row: CloudRecord = {
            id: String(body?.p_client_run_id),
            user_id: uid,
            display_name: profile.display_name,
            grade: profile.grade,
            section: profile.section,
            deck_id: String(body?.p_deck_id),
            level: String(body?.p_level),
            mode: String(body?.p_mode),
            correct: responses.filter((r) => r.correct).length,
            total: responses.length,
            received_at: new Date().toISOString(),
            responses,
          };
          state.rows.unshift(row);
          state.credits[uid] += row.correct * 5;
          return respond({
            id: row.id,
            correct: row.correct,
            total: row.total,
          });
        }
        if (rpc === "csl_list_records")
          return respond(
            state.rows
              .filter((row) => profile.is_teacher || row.user_id === uid)
              .slice(
                Number(body?.p_offset),
                Number(body?.p_offset) + Number(body?.p_limit),
              ),
          );
        if (rpc === "csl_reserve_item") {
          expect(body?.p_user_id).toBe(uid);
          const key = `reserve/${uid}/${body?.p_request_id}`;
          if (requests.has(key)) return respond(requests.get(key));
          const item = state.items.find((i) => i.id === body?.p_item_id)!;
          if (!item || !item.active || !item.stock)
            return failed("This item is out of stock. Refresh the shelf.");
          if (
            item.price !== body?.p_expected_price ||
            item.version !== body?.p_expected_version
          )
            return failed(
              "This item changed. Refresh the shelf and review its price before reserving.",
            );
          if (state.credits[uid] < item.price)
            return failed("You need more class credits for this item.");
          state.credits[uid] -= item.price;
          item.stock--;
          item.version++;
          const order: LabOrder = {
            id: `order-${state.orders.length + 1}`,
            user_id: uid,
            item_id: item.id,
            item_name: item.name,
            price: item.price,
            code: `CSL-00000000000${state.orders.length + 1}`,
            status: "reserved",
            created_at: new Date().toISOString(),
          };
          state.orders.unshift(order);
          requests.set(key, order);
          return respond(order);
        }
        if (rpc === "csl_arcade_current")
          return respond(
            games.has(uid) && !games.get(uid)!.state.completed
              ? toView(games.get(uid)!)
              : null,
          );
        if (rpc === "csl_arcade_start") {
          expect(body?.p_user_id).toBe(uid);
          const game = startArcade(
            String(body?.p_request_id),
            uid,
            body?.p_category as "life",
            [...bank.values()],
            Date.now(),
            seededRng(91),
            state.game,
          );
          const value: ArcadeView = {
            state: game,
            question: null,
            serverNow: Date.now(),
          };
          games.set(uid, value);
          return respond(toView(value));
        }
        if (rpc === "csl_arcade_action") {
          expect(body?.p_user_id).toBe(uid);
          const game = games.get(uid)!;
          expect(body?.p_session_id).toBe(game.state.id);
          const key = `shot/${uid}/${body?.p_command_id}`;
          if (requests.has(key)) return respond(toView(game));
          const q = bank.get(game.state.ids[game.state.index])!;
          expect(body?.p_question_id).toBe(q.id);
          const action = (
            body?.p_action === "shoot"
              ? { type: "shoot", option: String(body?.p_option) }
              : { type: body?.p_action }
          ) as ArcadeAction;
          try {
            game.state = arcadeAction(game.state, q, action, Date.now());
          } catch (error) {
            return failed(
              error instanceof Error ? error.message : "Invalid action",
            );
          }
          requests.set(key, true);
          if (game.state.completed) state.credits[uid] += game.state.correct;
          return respond(toView(game));
        }
        if (rpc === "csl_arcade_rankings")
          return respond(
            [...games.values()]
              .filter(
                (game) =>
                  game.state.completed &&
                  !state.labels[game.state.id]?.archived &&
                  (body?.p_category === "all" ||
                    body?.p_category === game.state.category),
              )
              .sort((a, b) => b.state.score - a.state.score)
              .map((game, index) => ({
                rank: index + 1,
                user_id: game.state.userId,
                display_name: state.profiles.find(
                  (p) => p.user_id === game.state.userId,
                )!.display_name,
                category: game.state.category,
                score: game.state.score,
                correct: game.state.correct,
                completed_at: new Date().toISOString(),
              })),
          );
        if (rpc === "csl_teacher_data" || rpc === "csl_studio_data") {
          const view = body?.p_view === "quizzes" ? "reports" : body?.p_view;
          if (
            !profile.is_teacher &&
            !(
              rpc === "csl_studio_data" &&
              ["reports", "games"].includes(String(view))
            )
          )
            return failed("Teacher access is required.");
          const filters = (body?.p_filters ?? {}) as Record<string, string>,
            offset = Number(body?.p_offset ?? 0);
          if (view === "overview")
            return respond({
              rows: [],
              total: 0,
              stats: {
                students: 2,
                active: 2,
                attempts: state.rows.length,
                correct: state.rows.reduce((n, r) => n + r.correct, 0),
                answers: state.rows.reduce((n, r) => n + r.total, 0),
                pending: state.orders.filter((o) => o.status === "reserved")
                  .length,
                low_stock: state.items.filter((i) => i.stock <= 5).length,
                games: [...games.values()].filter((g) => g.state.completed)
                  .length,
              },
              charts: [],
              timeline: Array.from({ length: 7 }, (_, index) => ({
                day_key: `2026-11-${String(4 + index).padStart(2, "0")}`,
                quizzes: index === 6 ? state.rows.length : 0,
                games: 0,
              })),
            });
          if (view === "health")
            return respond({
              total: 4,
              stats: {
                quizzes: state.rows.length,
                games: [...games.values()].filter((g) => g.state.completed)
                  .length,
                archived: Object.values(state.labels).filter((m) => m.archived)
                  .length,
                teachers: state.profiles.filter((p) => p.is_teacher && p.active)
                  .length,
              },
              rows: [
                ["wallets", "Class credit ledger"],
                ["stock", "Supply stock"],
                ["quizzes", "Quiz evidence"],
                ["games", "Completed arcade rounds"],
              ].map(([id, label]) => ({
                id,
                label,
                issues: 0,
                detail: "All recorded values agree.",
              })),
            });
          let rows: Record<string, unknown>[] = [];
          if (view === "students")
            rows = state.profiles.map((p) => ({
              ...p,
              credits: state.credits[p.user_id],
              created_at: "2026-11-10T00:00:00Z",
              attempts: state.rows.filter((r) => r.user_id === p.user_id)
                .length,
              expected_updated: fingerprint(p),
            }));
          if (view === "shop") rows = state.items.map((i) => ({ ...i }));
          if (view === "claims")
            rows = state.orders.map((o) => ({
              ...o,
              display_name: state.profiles.find((p) => p.user_id === o.user_id)!
                .display_name,
              grade: 8,
              section: "Curiosity",
            }));
          if (view === "reports")
            rows = state.rows.map((r) => ({
              ...r,
              teacher_note:
                (r as CloudRecord & { teacher_note?: string }).teacher_note ??
                "",
            }));
          if (view === "games")
            rows = [...games.values()]
              .filter((g) => g.state.completed)
              .map((g) => ({
                id: g.state.id,
                user_id: g.state.userId,
                display_name: state.profiles.find(
                  (p) => p.user_id === g.state.userId,
                )!.display_name,
                grade: 8,
                section: "Curiosity",
                category: g.state.category,
                score: g.state.score,
                correct: g.state.correct,
                total: 9,
                coins: g.state.coins,
                received_at: new Date().toISOString(),
              }));
          if (
            rpc === "csl_studio_data" &&
            ["reports", "games"].includes(String(view))
          )
            rows = rows
              .map((row): Record<string, unknown> => ({
                ...row,
                archived: state.labels[String(row.id)]?.archived ?? false,
                metadata_version: state.labels[String(row.id)]?.version ?? 0,
              }))
              .filter(
                (row) =>
                  ((profile.is_teacher && filters.self !== "true") ||
                    row.user_id === uid) &&
                  ((filters.state ?? "active") === "all" ||
                    row.archived ===
                      ((filters.state ?? "active") === "archived")) &&
                  (!filters.from ||
                    String(row.received_at).slice(0, 10) >= filters.from) &&
                  (!filters.to ||
                    String(row.received_at).slice(0, 10) <= filters.to),
              );
          if (view === "content")
            rows = [...bank.values()].map((question) => ({
              question,
              active:
                state.overrides.find((o) => o.question.id === question.id)
                  ?.active ?? true,
              version:
                state.overrides.find((o) => o.question.id === question.id)
                  ?.version ?? 0,
            }));
          if (view === "activity") rows = state.activity;
          if (view === "settings")
            return respond({
              rows: [
                {
                  rules: state.rules,
                  game: state.game,
                  version: state.settingsVersion,
                },
              ],
              total: 1,
            });
          rows = rows.filter((r) => {
            const q = r.question as Question | undefined;
            return (
              (!filters.search ||
                String(r.display_name ?? r.name ?? q?.prompt ?? r.action ?? "")
                  .toLowerCase()
                  .includes(filters.search.toLowerCase())) &&
              (!filters.grade || String(r.grade) === filters.grade) &&
              (!filters.section ||
                String(r.section)
                  .toLowerCase()
                  .includes(filters.section.toLowerCase())) &&
              (!filters.deck || (r.deck_id ?? q?.deckId) === filters.deck) &&
              (!filters.category || r.category === filters.category) &&
              (!filters.status || r.status === filters.status)
            );
          });
          if (filters.sort)
            rows.sort((a, b) =>
              filters.sort === "best"
                ? Number(b.score ?? Number(b.correct) / Number(b.total)) -
                  Number(a.score ?? Number(a.correct) / Number(a.total))
                : String(a.received_at).localeCompare(String(b.received_at)) *
                  (filters.sort === "oldest" ? 1 : -1),
            );
          return respond({
            total: rows.length,
            rows: rows.slice(offset, offset + 50),
            ...(["reports", "games"].includes(String(view))
              ? {
                  stats: {
                    attempts: rows.length,
                    correct: rows.reduce((n, r) => n + Number(r.correct), 0),
                    answers: rows.reduce((n, r) => n + Number(r.total), 0),
                    best: Math.max(0, ...rows.map((r) => Number(r.score ?? 0))),
                  },
                }
              : {}),
          });
        }
        if (rpc === "csl_studio_command") {
          if (!profile.is_teacher) return failed("Teacher access is required.");
          const key = `studio/${uid}/${body?.p_request_id}`;
          if (requests.has(key)) return respond(requests.get(key));
          const value = body?.p_body as Record<string, unknown>;
          if (body?.p_action === "records") {
            const versions = value.versions as Record<string, number>;
            for (const id of value.ids as string[]) {
              expect(versions[id]).toBe(state.labels[id]?.version ?? 0);
              state.labels[id] = {
                archived: Boolean(value.archived),
                version: versions[id] + 1,
                reason: String(value.reason),
              };
            }
          } else if (body?.p_action === "role") {
            if (value.user_id === uid)
              return failed("Your own teaching access is protected.");
            const target = state.profiles.find(
              (p) => p.user_id === value.user_id,
            )!;
            expect(target.is_teacher).toBe(value.was_teacher);
            target.is_teacher = Boolean(value.is_teacher);
          } else throw new Error("Unknown studio action");
          state.activity.unshift({
            id: state.activity.length + 1,
            actor_name: profile.display_name,
            action: `studio:${body?.p_action}`,
            note: value.reason,
            after_value: value,
            created_at: new Date().toISOString(),
          });
          const result = { ok: true, value };
          requests.set(key, result);
          return respond(result);
        }
        if (rpc === "csl_teacher_command") {
          if (!profile.is_teacher) return failed("Teacher access is required.");
          const key = `teacher/${uid}/${body?.p_request_id}`;
          if (requests.has(key)) return respond(requests.get(key));
          const action = String(body?.p_action),
            value = body?.p_body as Record<string, unknown>;
          if (action === "student") {
            const p = state.profiles.find((p) => p.user_id === value.user_id)!;
            if (!value.active && p.is_teacher)
              return failed("Teacher accounts cannot be banned.");
            expect(value.expected_updated).toBe(fingerprint(p));
            Object.assign(p, {
              display_name: value.display_name,
              grade: value.grade,
              section: value.section,
              active: value.active,
              version: p.version + 1,
            });
          } else if (action === "credits")
            state.credits[String(value.user_id)] += Number(value.delta);
          else if (action === "item") {
            if (
              typeof value.category !== "string" ||
              value.category.trim().length < 2 ||
              typeof value.active !== "boolean"
            )
              return failed("Check the supply name, description and category.");
            const old = state.items.find((i) => i.id === value.id);
            expect(Number(value.version)).toBe(old?.version ?? 0);
            const next = {
              ...value,
              version: Number(value.version) + 1,
            } as unknown as LabItem;
            if (old) Object.assign(old, next);
            else state.items.push(next);
          } else if (action === "claim") {
            const order = state.orders.find((o) => o.id === value.id)!;
            expect(order.status).toBe("reserved");
            if (value.status === "collected")
              expect(value.code).toBe(order.code);
            else {
              state.credits[order.user_id] += order.price;
              const item = state.items.find((i) => i.id === order.item_id)!;
              item.stock++;
              item.version++;
            }
            order.status = value.status as LabOrder["status"];
          } else if (action === "rules" || action === "game") {
            expect(value.version).toBe(state.settingsVersion);
            state.settingsVersion++;
            if (action === "rules") state.rules = value.rules as ClassroomRules;
            else state.game = value.game as ArcadeRules;
          } else if (action === "question") {
            const q = value.question as Question,
              old = state.overrides.find((o) => o.question.id === q.id),
              version = (old?.version ?? 0) + 1;
            expect(Number(value.version)).toBe(version - 1);
            bank.set(q.id, q);
            versions.set(`${q.id}/${version}`, q);
            const next = {
              question: q,
              active: Boolean(value.active),
              version,
            };
            if (old) Object.assign(old, next);
            else state.overrides.push(next);
          } else if (action === "feedback")
            Object.assign(
              state.rows.find((r) => r.id === value.attempt_id)!,
              { teacher_note: value.note },
            );
          else throw new Error(`Unexpected teacher action ${action}`);
          state.activity.unshift({
            id: state.activity.length + 1,
            actor_name: profile.display_name,
            action,
            note: value.reason ?? "",
            before_value: null,
            after_value: value,
            created_at: new Date().toISOString(),
          });
          const result = { ok: true, value };
          requests.set(key, result);
          return respond(result);
        }
        throw new Error(`Unexpected cloud request: ${url.pathname}`);
      });
      await use(state);
      expect(errors, "No unexpected browser or application errors").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
export async function signIn(page: Page, name = "student1") {
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill(`${name}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
}
export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.getByRole("button", { name: "Log out now", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
}
