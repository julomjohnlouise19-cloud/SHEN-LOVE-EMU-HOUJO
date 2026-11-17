import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { test, expect, signIn, signOut, users } from "./community-fixtures";
import { displayMode, boundedPage } from "./interface-helpers";

test("populated student and teacher pages plus account dialogs remain readable in both modes", async ({
  page,
  backend,
}, info) => {
  test.setTimeout(300000);
  const timestamp = new Date().toISOString();
  backend.rows = [0, 1].map((index) => ({
    id: randomUUID(),
    user_id: users[index].id,
    display_name: backend.profiles[index].display_name,
    grade: 8,
    section: "Curiosity",
    deck_id: "life.cells",
    level: "medium",
    mode: "practice",
    correct: 1,
    total: 1,
    received_at: timestamp,
    responses: [
      {
        question_id: "q",
        prompt: "A science discovery",
        value: "a",
        correct: true,
      },
    ],
  }));
  backend.orders = [
    {
      id: randomUUID(),
      user_id: users[0].id,
      item_id: backend.items[0].id,
      item_name: backend.items[0].name,
      price: backend.items[0].price,
      code: "CSL-READABLE",
      status: "reserved",
      created_at: timestamp,
    },
  ];
  backend.activity = [
    {
      id: randomUUID(),
      created_at: timestamp,
      actor_name: "Teacher",
      action: "item",
      note: "Classroom supplies reviewed",
      payload: {},
    },
  ];
  const failures: { view: string; mode: string; issues: unknown[] }[] = [];
  async function scan(view: string, mode: string) {
    await boundedPage(page);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    if (result.violations.length) {
      await info.attach(`${mode}-${view.replaceAll("/", "-")}`, {
        body: JSON.stringify(result.violations),
        contentType: "application/json",
      });
      failures.push({
        view,
        mode,
        issues: result.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./");
  for (const account of ["student1", "teacher"] as const) {
    await signIn(page, account);
    for (const mode of ["dark", "light"] as const) {
      await displayMode(page, mode);
      const routes =
        account === "teacher"
          ? [
              "/teacher",
              "/teacher/students",
              "/teacher/reports",
              "/teacher/health",
              "/teacher/shop",
              "/teacher/claims",
              "/teacher/content",
              "/teacher/settings",
              "/teacher/activity",
              "/teacher/suggestions",
            ]
          : [
              "/",
              "/island",
              "/branch/life",
              "/sources",
              "/island/activities",
              "/island/activities/match",
              "/island/activities/words",
              "/island/activities/cards",
              "/island/activities/planets",
              "/island/activities/badges",
              "/shop",
              "/spin",
              "/quests",
              "/leaderboard",
              "/friends",
              "/review",
              "/notebook",
              "/records",
              "/suggestions",
              "/experiment",
            ];
      for (const route of routes) {
        await page.goto(`#${route}`);
        await expect(
          page.getByRole("button", { name: "Log out", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { level: 1 }).first(),
        ).toBeVisible();
        if (
          [
            "/teacher/students",
            "/teacher/reports",
            "/teacher/shop",
            "/teacher/claims",
            "/teacher/content",
            "/teacher/activity",
            "/records",
          ].includes(route)
        )
          await expect(page.locator("tbody tr").first()).toBeVisible();
        if (route === "/friends")
          await expect(page.locator(".friend-card").first()).toBeVisible();
        if (route === "/leaderboard")
          await expect(page.locator(".community-rank-row")).toHaveCount(2);
        await scan(route, mode);
      }
    }
    await signOut(page);
  }
  for (const mode of ["dark", "light"] as const) {
    await signIn(page, "teacher");
    await displayMode(page, mode);
    await signOut(page);
    await scan("welcome", mode);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await scan("sign-in", mode);
    await page
      .getByRole("button", { name: "Join the lab", exact: true })
      .click();
    await scan("sign-up", mode);
    await page
      .getByRole("button", { name: "Read Terms & Conditions", exact: true })
      .click();
    await scan("terms", mode);
    await page.keyboard.press("Escape");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Forgot your password?", exact: true })
      .click();
    await scan("password-reset", mode);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close and return to page", exact: true })
      .click();
  }
  expect(failures).toEqual([]);
});
