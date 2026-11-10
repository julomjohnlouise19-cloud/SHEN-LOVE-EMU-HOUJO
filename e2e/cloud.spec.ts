import type { Page } from "@playwright/test";
import { test, expect, users, signIn, signOut } from "./cloud-fixtures";
import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import cells from "../src/data/questions/life/cells.json" with { type: "json" };
import type { Question } from "../src/core/types";

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
  await page.getByRole("link", { name: "Saved records" }).click();
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
    "Your completed discoveries are saved.",
  );
  expect(backend.rows).toHaveLength(1);
  await page.getByRole("link", { name: "Saved records" }).click();
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
    page.getByRole("heading", { name: "Your saved discoveries" }),
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
  await page.getByRole("link", { name: "Class reports", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Class discoveries" }),
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
    other.getByRole("heading", { name: "Your saved discoveries" }),
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
    "Account services are temporarily unavailable",
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("teacher@example.test");
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(page.locator(".form-error")).toContainText(
    "Account services are temporarily unavailable",
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
