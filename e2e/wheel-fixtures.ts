import { test as base, expect, host, users } from "./cloud-fixtures";
import type { ClassWheel, WheelReceipt } from "../src/core/daily-wheel";

interface WheelFixture {
  day: string;
  prize: number;
  slot: number;
  failAfter: boolean;
  failBefore: boolean;
  reads: number;
  requests: string[];
  claims: Map<string, WheelReceipt>;
  holdSpin: Promise<void> | undefined;
}
export const test = base.extend<{ wheel: WheelFixture }>({
  wheel: [
    async ({ backend, context }, use) => {
      backend.dailyWheelReady = true;
      const state: WheelFixture = {
        day: "2026-11-18",
        prize: 5,
        slot: 4,
        failAfter: false,
        failBefore: false,
        reads: 0,
        requests: [],
        claims: new Map(),
        holdSpin: undefined,
      };
      const ids = new Map<string, string>();
      const snapshot = (owner: string): ClassWheel => ({
        version: 1,
        basis: "class_credits",
        student: !backend.profiles.find((p) => p.user_id === owner)!.is_teacher,
        timezone: "Asia/Manila",
        server_day: state.day,
        maximum: backend.rules.spinMax,
        eligible:
          !backend.profiles.find((p) => p.user_id === owner)!.is_teacher &&
          !state.claims.has(owner + state.day),
        balance: backend.credits[owner],
        receipt: state.claims.get(owner + state.day) ?? null,
      });
      await context.route(`${host}/rest/v1/rpc/csl_*`, async (route) => {
        const name = new URL(route.request().url()).pathname.split("/").pop();
        if (name !== "csl_daily_wheel" && name !== "csl_spin_daily_wheel")
          return route.fallback();
        const request = route.request();
        const headers = {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "POST,OPTIONS",
        };
        const respond = (body: unknown, status = 200) =>
          route.fulfill({
            status,
            headers,
            contentType: "application/json",
            body: JSON.stringify(body),
          });
        if (request.method() === "OPTIONS")
          return route.fulfill({ status: 204, headers });
        const token = request.headers().authorization?.split(" ")[1];
        const owner = token
          ? (JSON.parse(
              Buffer.from(token.split(".")[1], "base64url").toString(),
            ).sub as string)
          : undefined;
        expect(users.some((u) => u.id === owner)).toBe(true);
        if (!owner) return respond({ message: "Sign in first" }, 400);
        if (name === "csl_daily_wheel") {
          state.reads++;
          return respond(snapshot(owner));
        }
        const body = request.postDataJSON() as {
          p_user_id: string;
          p_expected_date: string;
          p_request_id: string;
        };
        expect(body.p_user_id).toBe(owner);
        state.requests.push(body.p_request_id);
        if (backend.profiles.find((p) => p.user_id === owner)?.is_teacher)
          return respond(
            { message: "Daily wheel claims are for student accounts." },
            400,
          );
        if (state.failBefore) {
          state.failBefore = false;
          return respond(
            { message: "Wheel service temporarily unavailable" },
            503,
          );
        }
        if (state.holdSpin) await state.holdSpin;
        const key = owner + body.p_request_id;
        const previousDay = ids.get(key);
        if (previousDay && previousDay !== body.p_expected_date)
          return respond(
            { message: "This spin ID was already used for another date." },
            400,
          );
        if (!previousDay && body.p_expected_date !== state.day)
          return respond(
            {
              message:
                "A new classroom day has started. Refresh the wheel before spinning.",
            },
            400,
          );
        const date = previousDay ?? state.day;
        let receipt = state.claims.get(owner + date);
        const duplicate = !!receipt;
        if (!receipt) {
          receipt = {
            claim_date: date,
            credits: Math.min(state.prize, backend.rules.spinMax),
            maximum: backend.rules.spinMax,
            slot: state.slot,
          };
          state.claims.set(owner + date, receipt);
          ids.set(key, date);
          backend.credits[owner] += receipt.credits;
        }
        if (state.failAfter) {
          state.failAfter = false;
          return respond(
            { message: "The response was interrupted. Try again." },
            503,
          );
        }
        return respond({
          wheel: snapshot(owner),
          awarded: duplicate ? 0 : receipt.credits,
          already_claimed: duplicate,
          receipt,
        });
      });
      await use(state);
    },
    { auto: true },
  ],
});
export { expect, users };
