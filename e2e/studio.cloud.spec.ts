import { test, expect, signIn, signOut, users, host } from "./cloud-fixtures";
import type { Backend } from "./cloud-fixtures";
import type { CloudRecord } from "../src/store/cloud";
import cells from "../src/data/questions/life/cells.json" with { type: "json" };
import type { Question } from "../src/core/types";
import AxeBuilder from "@axe-core/playwright";
function seedHistory(backend: Backend) {
  backend.rows = [0, 1, 2].map((n): CloudRecord => ({
    id: `10000000-0000-4000-8000-00000000000${n + 1}`,
    user_id: users[n === 1 ? 1 : 0].id,
    display_name: n === 1 ? "Student Two" : "Student One",
    grade: 8,
    section: "Curiosity",
    deck_id: "life.cells",
    level: "medium",
    mode: "practice",
    correct: n === 0 ? 6 : n === 1 ? 4 : 8,
    total: 8,
    received_at: n === 0 ? "2026-11-10T02:00:00Z" : "2026-11-08T02:00:00Z",
    responses: (cells as Question[])
      .filter((q) => q.level === "medium")
      .slice(0, 8)
      .map((q, index) => ({
        question_id: q.id,
        prompt: q.prompt,
        value: index < (n === 0 ? 6 : n === 1 ? 4 : 8) ? q.answer : "mix-up",
        correct: index < (n === 0 ? 6 : n === 1 ? 4 : 8),
      })),
  }));
}

test("welcome is available while readiness waits, password login verifies once and never sends email", async ({
  page,
  backend,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`${host}/rest/v1/rpc/csl_backend_status`, async (route) => {
    await held;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: 1, platform: 3, questions: 972 }),
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
      },
    });
  });
  try {
    await page.goto("./", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "A little curiosity starts here." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByLabel("Email", { exact: true })
      .fill("STUDENT1@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("cloud-password-123");
    await page
      .getByRole("button", { name: "Welcome back", exact: true })
      .click();
    await expect.poll(() => backend.tokenCalls).toBe(1);
    await expect(
      page.getByRole("button", { name: "Signing you in…", exact: true }),
    ).toBeDisabled();
    expect(backend.getUserCalls).toBe(0);
    release();
    await expect(
      page.getByRole("button", { name: "Log out", exact: true }),
    ).toBeVisible();
    expect(backend.signupCalls).toBe(0);
    expect(backend.resendCalls).toBe(0);
    expect(backend.recoverCalls).toBe(0);
  } finally {
    release();
  }
});

test("password reset requests one email, enforces cooldown and completes a verified recovery link", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(users[0].email);
  await page
    .getByRole("button", { name: "Forgot your password?", exact: true })
    .click();
  await expect(page.getByLabel("Account email", { exact: true })).toHaveValue(
    users[0].email,
  );
  await page
    .getByRole("button", { name: "Send reset link", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "If this email has an account" }),
  ).toBeVisible();
  expect(backend.recoverCalls).toBe(1);
  await expect(
    page.getByRole("button", { name: /Request again in/ }),
  ).toBeDisabled();
  await page.goto("./?code=fixture-recovery-code&flow=recovery");
  await expect(
    page.getByRole("dialog", { name: "A fresh start for your account" }),
  ).toBeVisible();
  await page
    .getByLabel("New password", { exact: true })
    .fill("a-new-private-password");
  await page
    .getByLabel("Repeat new password", { exact: true })
    .fill("not-the-same-password");
  await page
    .getByRole("button", { name: "Save new password", exact: true })
    .click();
  await expect(page.locator(".recovery-dialog .form-error")).toContainText(
    "need to match",
  );
  await page
    .getByLabel("Repeat new password", { exact: true })
    .fill("a-new-private-password");
  await page
    .getByRole("button", { name: "Save new password", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(backend.passwordChanges).toBe(1);
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
});

test("a recovery query without a verified session cannot open password controls", async ({
  page,
  backend,
}) => {
  await page.goto("./?flow=recovery");
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
  await expect(page.locator(".recovery-dialog")).toHaveCount(0);
  expect(backend.passwordChanges).toBe(0);
  await expect(
    page.getByRole("heading", { name: "Reset your password", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await expect(page).not.toHaveURL(/flow=recovery/);
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("profile colors and introduction sync, survive reload and keep accessible contrast", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  await expect(page.locator(".scientist-card")).toContainText("Student One");
  await page.screenshot({
    path: "/tmp/cozy-profile-studio-desktop.png",
    fullPage: true,
  });
  for (const theme of ["Aurora", "Sunset", "Meadow"]) {
    await page
      .getByRole("button", { name: `Choose ${theme} colors`, exact: true })
      .click();
    await page
      .getByLabel("A little about me", { exact: true })
      .fill("I love discovering how our planet works.");
    await page
      .getByRole("button", { name: "Save my style", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      theme.toLowerCase(),
    );
    expect(backend.preferences[users[0].id]).toEqual({
      theme: theme.toLowerCase(),
      bio: "I love discovering how our planet works.",
    });
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  }
  await page
    .getByRole("button", { name: "Choose Aurora colors", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save my style", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.evaluate(
    (id) => localStorage.removeItem(`csl:appearance:${id}`),
    users[0].id,
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "aurora");
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  await expect(
    page.getByLabel("A little about me", { exact: true }),
  ).toHaveValue("I love discovering how our planet works.");
  await page.setViewportSize({ width: 320, height: 780 });
  expect(
    await page.getByRole("dialog").evaluate((el) => {
      const b = el.getBoundingClientRect();
      return (
        b.left >= 0 && b.right <= innerWidth && el.scrollWidth <= el.clientWidth
      );
    }),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Profile details", exact: true })
    .click();
  await expect(page.getByRole("button", {name:"Close and return to page", exact:true})).toBeInViewport();
  await page.screenshot({
    path: "/tmp/cozy-profile-studio-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await signOut(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "meadow");
});

test("personal history filters, sorts, exports and scopes saved evidence", async ({
  page,
  backend,
}) => {
  seedHistory(backend);
  await page.goto("./");
  await signIn(page);
  await page.goto("#/records");
  await expect(
    page.getByRole("cell", { name: "Student One", exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("cell", { name: "Student Two", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("From date", { exact: true }).fill("2026-11-09");
  await page
    .getByRole("button", { name: "Apply record filters", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Student One", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: /View answers for/ }).click();
  await expect(page.getByRole("dialog").locator(".record-answer")).toHaveCount(
    8,
  );
  await page
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export filtered records", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "cozy-science-quiz-records.csv",
  );
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Student One", exact: true }),
  ).toHaveCount(2);
  await page.getByLabel("Order", { exact: true }).selectOption("best");
  await page
    .getByRole("button", { name: "Apply record filters", exact: true })
    .click();
  await expect(page.locator("tbody tr").first()).toContainText("8/8");
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});

test("teacher archive and restore are audited, versioned and preserve original scores", async ({
  page,
  backend,
}) => {
  seedHistory(backend);
  const original = JSON.stringify(backend.rows);
  await page.goto("./");
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Class reports", exact: true }).click();
  await page
    .getByLabel("Select all records on this page", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Archive selected", exact: true })
    .click();
  await page
    .getByLabel("Reason for this record change", { exact: true })
    .fill("Reviewed for the end-of-week report");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect
    .poll(() => Object.values(backend.labels).filter((r) => r.archived).length)
    .toBe(3);
  await expect(
    page.getByRole("button", { name: "Archive record", exact: true }),
  ).toHaveCount(0);
  expect(JSON.stringify(backend.rows)).toBe(original);
  await page
    .getByLabel("Filter by record state", { exact: true })
    .selectOption("archived");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Restore record", exact: true }),
  ).toHaveCount(3);
  await page
    .getByRole("button", { name: "Restore record", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Reason for this record change", { exact: true })
    .fill("Return this discovery to active review");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect
    .poll(() => Object.values(backend.labels).filter((r) => r.archived).length)
    .toBe(2);
  await page.getByRole("link", { name: "Record care", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Class credit ledger", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("All checked records agree", { exact: true }),
  ).toHaveCount(4);
  expect(backend.credits[users[0].id]).toBe(200);
  await page.setViewportSize({ width: 320, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/cozy-record-care-mobile.png",
    fullPage: true,
  });
});

test("teacher access is delegated through the studio and removed authoritatively", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Scientists", exact: true }).click();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Teacher" })
      .getByRole("button", { name: "Teaching access", exact: true })
      .last(),
  ).toBeDisabled();
  const student = page.getByRole("row").filter({ hasText: "Student Two" });
  await student
    .getByRole("button", { name: "Teaching access", exact: true })
    .click();
  await page
    .getByLabel("Account role", { exact: true })
    .selectOption("teacher");
  await page
    .getByLabel("Reason for access change", { exact: true })
    .fill("Approved co-teacher for our class");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => backend.profiles[1].is_teacher).toBe(true);
  await signOut(page);
  await signIn(page, "student2");
  await expect(
    page.getByRole("heading", { name: "Teacher studio", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Record care", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "A clear, cared-for classroom",
      exact: true,
    }),
  ).toBeVisible();
  await signOut(page);
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Scientists", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Student Two" })
    .getByRole("button", { name: "Teaching access", exact: true })
    .click();
  await page
    .getByLabel("Account role", { exact: true })
    .selectOption("student");
  await page
    .getByLabel("Reason for access change", { exact: true })
    .fill("Return this account to student access");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => backend.profiles[1].is_teacher).toBe(false);
  await signOut(page);
  await signIn(page, "student2");
  await page.goto("#/teacher/health");
  await expect(
    page.getByRole("heading", { name: "Teacher access needed", exact: true }),
  ).toBeVisible();
});

test("login and refreshed profiles remain usable before the optional studio upgrade", async ({
  page,
  backend,
}) => {
  backend.platform = 2;
  await page.goto("./");
  await signIn(page, "teacher");
  await expect(
    page.getByRole("heading", { name: "Teacher studio", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Record care", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  await page
    .getByRole("button", { name: "Choose Sunset colors", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save my style", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sunset");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sunset");
});
