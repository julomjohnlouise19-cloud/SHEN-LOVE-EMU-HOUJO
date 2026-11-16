import { test as base, expect, host, users } from "./cloud-fixtures";
import { addDays } from "../src/core/time";
import type {
  CalendarClaim,
  CalendarSettings,
  DailyCalendar,
} from "../src/core/daily-calendar";

export interface CalendarBackend {
  day: string;
  calendars: Record<
    string,
    { start: string; daily: number; weekly: number; claims: CalendarClaim[] }
  >;
  settings: CalendarSettings;
  requests: { owner: string; date: string; request: string }[];
  loseNextReceipt: boolean;
  settingsWrites: number;
  failSettings: boolean;
}
export const test = base.extend<{ calendar: CalendarBackend }>({
  calendar: [
    async ({ context, backend }, use) => {
      backend.dailyCalendarReady = true;
      const state: CalendarBackend = {
        day: "2026-11-16",
        calendars: {},
        requests: [],
        loseNextReceipt: false,
        settings: {
          enabled: true,
          daily_credits: 5,
          weekly_credits: 10,
          version: 1,
          enrolled: 0,
          claims_today: 0,
          credits_awarded: 0,
        },
        settingsWrites: 0,
        failSettings: false,
      };
      const receipts = new Map<string, CalendarClaim>();
      const snapshot = (owner: string): DailyCalendar => {
        const c = state.calendars[owner];
        const day = c
          ? Math.floor(
              (Date.parse(state.day) - Date.parse(c.start)) / 86400000,
            ) + 1
          : 1;
        const student = !backend.profiles.find((p) => p.user_id === owner)!
          .is_teacher;
        return {
          version: 1,
          student,
          enabled: state.settings.enabled,
          timezone: "Asia/Manila",
          server_day: state.day,
          started_on: c?.start ?? null,
          day_index: day,
          daily_credits: c?.daily ?? state.settings.daily_credits,
          weekly_credits: c?.weekly ?? state.settings.weekly_credits,
          eligible:
            student &&
            state.settings.enabled &&
            day <= 49 &&
            !c?.claims.some((cl) => cl.day_number === day),
          balance: backend.credits[owner],
          claims: c?.claims ?? [],
        };
      };
      await context.route(
        `${host}/rest/v1/rpc/csl_*calendar*`,
        async (route) => {
          const req = route.request();
          const respond = (data: unknown, status = 200) =>
            route.fulfill({
              status,
              contentType: "application/json",
              headers: {
                "access-control-allow-origin": "*",
                "access-control-allow-headers": "*",
                "access-control-allow-methods": "POST,OPTIONS",
              },
              body: JSON.stringify(data),
            });
          if (req.method() === "OPTIONS") return respond({});
          let owner = "";
          try {
            owner = JSON.parse(
              Buffer.from(
                req.headers().authorization.split(".")[1],
                "base64url",
              ).toString(),
            ).sub;
          } catch {
            /* Anonymous. */
          }
          const profile = backend.profiles.find((p) => p.user_id === owner);
          if (!profile?.active)
            return respond(
              { code: "P0001", message: "Sign in with an active account." },
              400,
            );
          const body = req.postDataJSON() as Record<string, unknown>;
          const rpc = new URL(req.url()).pathname.split("/").pop();
          if (rpc === "csl_daily_calendar") return respond(snapshot(owner));
          if (rpc === "csl_calendar_settings") {
            if (!profile.is_teacher)
              return respond(
                { code: "P0001", message: "Teacher access is required." },
                400,
              );
            if (body.p_request_id) {
              if (state.failSettings)
                return respond(
                  {
                    code: "P0001",
                    message: "Settings were not saved. Try again.",
                  },
                  503,
                );
              if (body.p_version !== state.settings.version)
                return respond(
                  {
                    code: "P0001",
                    message: "Settings changed. Refresh before saving.",
                  },
                  400,
                );
              state.settings = {
                ...state.settings,
                enabled: Boolean(body.p_enabled),
                daily_credits: Number(body.p_daily),
                weekly_credits: Number(body.p_weekly),
                version: state.settings.version + 1,
              };
              state.settingsWrites++;
            }
            return respond(state.settings);
          }
          const date = String(body.p_expected_date),
            request = String(body.p_request_id);
          state.requests.push({ owner, date, request });
          if (body.p_user_id !== owner)
            return respond({ code: "P0001", message: "Account changed." }, 400);
          if (profile.is_teacher)
            return respond(
              { code: "P0001", message: "Rewards are for student accounts." },
              400,
            );
          const previous = receipts.get(`${owner}:${request}`);
          if (previous)
            return respond({
              calendar: snapshot(owner),
              awarded: 0,
              already_claimed: true,
              receipt: previous,
            });
          if (!state.settings.enabled)
            return respond(
              { code: "P0001", message: "Daily claims are paused." },
              400,
            );
          if (date !== state.day)
            return respond(
              {
                code: "P0001",
                message:
                  "A new classroom day has started. Refresh your calendar.",
              },
              400,
            );
          let c = state.calendars[owner];
          if (!c) {
            c = state.calendars[owner] = {
              start: date,
              daily: state.settings.daily_credits,
              weekly: state.settings.weekly_credits,
              claims: [],
            };
            state.settings.enrolled++;
          }
          const day = snapshot(owner).day_index;
          if (day > 49)
            return respond(
              { code: "P0001", message: "Your calendar has ended." },
              400,
            );
          const existing = c.claims.find((cl) => cl.day_number === day);
          if (existing)
            return respond({
              calendar: snapshot(owner),
              awarded: 0,
              already_claimed: true,
              receipt: existing,
            });
          const receipt = {
            day_number: day,
            claim_date: date,
            credits: day % 7 === 0 ? c.weekly : c.daily,
          };
          c.claims.push(receipt);
          receipts.set(`${owner}:${request}`, receipt);
          backend.credits[owner] += receipt.credits;
          state.settings.credits_awarded += receipt.credits;
          if (state.loseNextReceipt) {
            state.loseNextReceipt = false;
            return respond(
              {
                code: "P0001",
                message:
                  "Connection interrupted after saving. Reopen your calendar to check the reward.",
              },
              503,
            );
          }
          return respond({
            calendar: snapshot(owner),
            awarded: receipt.credits,
            already_claimed: false,
            receipt,
          });
        },
      );
      await use(state);
    },
    { auto: true },
  ],
});
export { expect, users, addDays };
