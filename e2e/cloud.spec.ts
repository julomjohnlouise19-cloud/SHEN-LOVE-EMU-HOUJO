import { test as base, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import cells from "../src/data/questions/life/cells.json" with { type: "json" };
import type { Question } from "../src/core/types";
import { isCorrect } from "../src/core/rules";
import type { CloudRecord } from "../src/store/cloud";

const host = "https://cozy-backend-test.supabase.co";
const users = ["student1", "student2", "teacher"].map((name, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index + 1}`,
  email: `${name}@example.test`,
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-11-10T00:00:00Z",
}));
const test = base.extend<{
  backend: {
    available: boolean;
    failUploads: boolean;
    uploads: number;
    rejected: number;
    rows: CloudRecord[];
  };
}>({
  backend: [
    async ({ context }, use) => {
      const state = {
        available: true,
        failUploads: false,
        uploads: 0,
        rejected: 0,
        rows: [] as CloudRecord[],
      };
      const errors: string[] = [];
      const profiles = users.map((user, index) => ({
        user_id: user.id,
        display_name: ["Student One", "Student Two", "Teacher"][index],
        grade: 8,
        section: "Curiosity",
        is_teacher: index === 2,
      }));
      context.on("page", (page) => {
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (message.type() !== "error") return;
          // Explicitly injected HTTP failures are asserted by their individual tests.
          if (
            message.location().url.startsWith(host) &&
            /(?:400|404|503)/.test(message.text())
          )
            return;
          errors.push(message.text());
        });
      });
      await context.route(`${host}/**`, async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        const body = request.postDataJSON() as Record<string, unknown> | null;
        let who = -1;
        try {
          who = users.findIndex(
            (u) =>
              u.id ===
              JSON.parse(
                Buffer.from(
                  request.headers().authorization.split(".")[1],
                  "base64url",
                ).toString(),
              ).sub,
          );
        } catch {
          /* Anonymous public key. */
        }
        const respond = (data: unknown, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify(data),
            headers: { "access-control-allow-origin": "*" },
          });
        if (url.pathname === "/auth/v1/token") {
          const user = users.find((u) => u.email === body?.email) ?? users[0];
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
        if (url.pathname === "/auth/v1/signup")
          return respond({ ...users[0], email: body?.email, identities: [] });
        if (url.pathname === "/auth/v1/user")
          return respond(users[Math.max(0, who)]);
        if (url.pathname === "/auth/v1/logout")
          return route.fulfill({ status: 204 });
        const rpc = url.pathname.split("/").pop();
        if (rpc === "csl_backend_status")
          return state.available
            ? respond({ version: 1, questions: 972 })
            : respond({ message: "function not installed" }, 404);
        if (who < 0) return respond({ message: "Not signed in" }, 400);
        if (rpc === "csl_my_profile") return respond(profiles[who]);
        if (rpc === "csl_update_profile") {
          expect(body?.p_user_id).toBe(users[who].id);
          Object.assign(profiles[who], {
            display_name: body?.p_name,
            grade: body?.p_grade,
            section: body?.p_section,
          });
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
          expect(body?.p_user_id).toBe(users[who].id);
          const existing = state.rows.find(
            (r) =>
              r.id === body?.p_client_run_id && r.user_id === users[who].id,
          );
          if (existing)
            return respond({
              id: existing.id,
              correct: existing.correct,
              total: existing.total,
            });
          const responses = (
            body?.p_answers as { question_id: string; value: string }[]
          ).map((a) => {
            const question = (cells as Question[]).find(
              (q) => q.id === a.question_id,
            )!;
            return {
              ...a,
              prompt: question.prompt,
              correct: isCorrect(question, a.value),
            };
          });
          const row: CloudRecord = {
            id: String(body?.p_client_run_id),
            ...profiles[who],
            deck_id: String(body?.p_deck_id),
            level: String(body?.p_level),
            mode: String(body?.p_mode),
            correct: responses.filter((r) => r.correct).length,
            total: responses.length,
            received_at: new Date().toISOString(),
            responses,
          };
          state.rows.unshift(row);
          return respond({
            id: row.id,
            correct: row.correct,
            total: row.total,
          });
        }
        if (rpc === "csl_list_records")
          return respond(
            state.rows
              .filter((r) => who === 2 || r.user_id === users[who].id)
              .slice(
                Number(body?.p_offset),
                Number(body?.p_offset) + Number(body?.p_limit),
              ),
          );
        throw new Error(`Unexpected cloud request: ${url.pathname}`);
      });
      await use(state);
      expect(errors, "No unexpected browser or application errors").toEqual([]);
    },
    { auto: true },
  ],
});
async function signIn(page: Page, name = "student1") {
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
async function signOut(page: Page) {
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.getByRole("button", { name: "Log out now", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
}
async function startQuiz(page: Page) {
  await page.goto("#/branch/life");
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  await page.getByRole("button", { name: "Let’s make a discovery" }).click();
}
async function answer(page: Page) {
  await expect(
    page.getByRole("button", { name: "Check my answer" }),
  ).toBeVisible();
  const prompt = await page.locator(".question-card > h2").innerText();
  const q = (cells as Question[]).find((q) => q.prompt === prompt)!;
  if (q.type === "match") {
    for (const [key, value] of Object.entries(q.answer))
      await page
        .getByRole("combobox", { name: `Match ${key}` })
        .selectOption(value);
  } else if (q.type === "order") {
    /* Retain shuffled order; server still records it. */
  } else if (q.options)
    await page
      .getByRole("button", {
        name: q.options.find((o) => o.id === q.answer)!.text,
        exact: false,
      })
      .click();
  else
    await page
      .getByLabel("Your answer", { exact: true })
      .fill(String(q.answer));
  await page.getByRole("button", { name: "Check my answer" }).click();
}
test("email confirmation and guest exploration are explicit", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByText("Demo admin:")).toHaveCount(0);
  await page.getByLabel("Your name", { exact: true }).fill("New Scientist");
  await page
    .getByLabel("Email", { exact: true })
    .fill("new-scientist@example.test");
  await page.getByLabel("Password", { exact: true }).fill("new-password-123");
  await page.getByRole("button", { name: "Make my little lab" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Explore as guest", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
  await expect(page.locator("[data-cloud-notice]")).toContainText(
    "Guest practice stays on this device.",
  );
  await signOut(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
});
test("quiz upload survives failures and logout without crossing accounts", async ({
  page,
  backend,
}) => {
  backend.failUploads = true;
  await page.goto("./");
  await signIn(page);
  await startQuiz(page);
  for (let i = 0; i < 8; i++) {
    await answer(page);
    await expect(page.locator(".answer-feedback")).toBeVisible();
    await page
      .getByRole("button", {
        name: i === 7 ? "See my discoveries" : "On to the next little wonder",
      })
      .click();
  }
  await expect(page.locator("[data-cloud-notice]")).toContainText(
    "Temporary test outage",
  );
  expect(backend.rejected).toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("csl:cloud-outbox")!).pending.length,
    ),
  ).toBe(1);
  await signOut(page);
  const before = backend.uploads;
  await signIn(page, "student2");
  await page.getByRole("link", { name: "Cloud quiz records" }).click();
  await expect(
    page.getByRole("heading", { name: "Your first discovery is waiting" }),
  ).toBeVisible();
  expect(backend.uploads).toBe(before);
  await signOut(page);
  await signIn(page);
  await expect(page.locator("[data-cloud-notice]")).toContainText(
    "Temporary test outage",
  );
  backend.failUploads = false;
  await page.getByRole("button", { name: "Retry upload" }).click();
  await expect(page.locator("[data-cloud-notice]")).toContainText(
    "Completed quiz records are uploaded.",
  );
  expect(backend.rows).toHaveLength(1);
  await page.getByRole("link", { name: "Cloud quiz records" }).click();
  await expect(
    page.getByRole("cell", { name: "Student One", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /View answers for/ }).click();
  await expect(page.locator(".record-answer")).toHaveCount(8);
  await page.getByRole("button", { name: "Close dialog" }).click();
  const file = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download this page as CSV" }).click();
  expect((await file).suggestedFilename()).toBe(
    "cozy-science-quiz-records.csv",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your cloud quiz records" }),
  ).toBeVisible();
  expect(backend.rows).toHaveLength(1);
  await page.setViewportSize({ width: 320, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("teacher reports use verified role and show student answers", async ({
  page,
  backend,
}) => {
  backend.rows = [0, 1].map((index) => ({
    id: randomUUID(),
    user_id: users[index].id,
    display_name: index === 0 ? "Student One" : "Student Two",
    grade: 8,
    section: "Curiosity",
    deck_id: "life.cells",
    level: "medium",
    mode: "practice",
    correct: 1,
    total: 1,
    received_at: new Date().toISOString(),
    responses: [
      {
        question_id: "q",
        prompt: "A science discovery",
        value: "a",
        correct: true,
      },
    ],
  }));
  await page.goto("./");
  await signIn(page, "teacher");
  await expect(
    page.getByRole("heading", { name: "Your class discoveries" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Student One", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Student Two", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Supplies", exact: true }),
  ).toHaveCount(0);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({
    path: "/tmp/cozy-cloud-teacher.png",
    fullPage: true,
  });
  await signOut(page);
  await signIn(page);
  await page.goto("#/admin");
  await expect(
    page.getByRole("heading", { name: "Teacher access needed" }),
  ).toBeVisible();
});
test("cloud logout clears private views across browser tabs and reload", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await signIn(page);
  const other = await context.newPage();
  await other.goto("./#/records");
  await expect(
    other.getByRole("heading", { name: "Your cloud quiz records" }),
  ).toBeVisible();
  await signOut(page);
  await expect(
    other.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("csl:cloud-auth")),
  ).toBeNull();
});
test("missing database setup keeps guest practice available and blocks fake cloud sign-in", async ({
  page,
  backend,
}) => {
  backend.available = false;
  await page.goto("./");
  await expect(page.locator("[data-cloud-notice]")).toContainText(
    "Cloud setup is not ready",
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("teacher@example.test");
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(page.locator(".form-error")).toContainText(
    "Cloud setup is not ready",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Explore as guest", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
});

test("cloud profile updates survive reload", async ({ page }) => {
  await page.goto("./");
  await signIn(page);
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Updated Scientist");
  await page.getByLabel("Section", { exact: true }).fill("Discovery");
  await page.getByRole("button", { name: "Save my profile" }).click();
  await expect(
    page.getByRole("button", { name: /Updated Scientist Grade/ }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Updated Scientist",
  );
  await expect(page.getByLabel("Section", { exact: true })).toHaveValue(
    "Discovery",
  );
});

test("a failed queue write rolls back the final answer and rewards", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  await startQuiz(page);
  for (let i = 0; i < 7; i++) {
    await answer(page);
    await expect(page.locator(".answer-feedback")).toBeVisible();
    await page
      .getByRole("button", { name: "On to the next little wonder" })
      .click();
  }
  await expect(
    page.getByRole("button", { name: "Check my answer" }),
  ).toBeVisible();
  const before = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("csl:state")!);
    const user = state.users.find(
      (u: { username: string }) => u.username === "student1@example.test",
    );
    return {
      xp: user.xp,
      merits: user.merits,
      answers: state.runs.at(-1).answers.length,
    };
  });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "csl:cloud-outbox" && JSON.parse(value).pending.length)
        throw new DOMException("Test queue quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
    Object.assign(window, {
      restoreQueueStorage: () => {
        Storage.prototype.setItem = original;
      },
    });
  });
  await answer(page);
  await expect(
    page.getByText("Test queue quota", { exact: true }),
  ).toBeVisible();
  const after = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("csl:state")!);
    const user = state.users.find(
      (u: { username: string }) => u.username === "student1@example.test",
    );
    return {
      xp: user.xp,
      merits: user.merits,
      answers: state.runs.at(-1).answers.length,
    };
  });
  expect(after).toEqual(before);
  expect(after.answers).toBe(7);
  expect(backend.rows).toHaveLength(0);
  await page.evaluate(() =>
    (
      window as unknown as { restoreQueueStorage: () => void }
    ).restoreQueueStorage(),
  );
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.locator(".answer-feedback")).toBeVisible();
  await expect.poll(() => backend.rows.length).toBe(1);
  expect(backend.rows[0].total).toBe(8);
});
