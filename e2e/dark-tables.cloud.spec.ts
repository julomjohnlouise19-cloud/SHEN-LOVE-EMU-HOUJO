import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { test, expect, signIn, signOut, users } from "./community-fixtures";

test("populated studio and student tables keep readable headers, badges and usable actions", async ({
  page,
  backend,
}, info) => {
  test.setTimeout(180000);
  const timestamp = new Date().toISOString();
  backend.profiles[1].active = false;
  backend.items[0].stock = 1;
  backend.items[1].stock = 0;
  backend.items[1].active = false;
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
  backend.orders = (["reserved", "collected", "cancelled"] as const).map(
    (status, index) => ({
      id: randomUUID(),
      user_id: users[0].id,
      item_id: backend.items[0].id,
      item_name: backend.items[0].name,
      price: backend.items[0].price,
      code: `CSL-READABLE-${index + 1}`,
      status,
      created_at: timestamp,
    }),
  );
  backend.activity = [
    {
      id: randomUUID(),
      created_at: timestamp,
      actor_name: "Teacher",
      action: "item",
      note: "Restocked classroom supplies",
      payload: {},
    },
  ];
  const failures: { view: string; width: number; issues: unknown[] }[] = [];
  async function check(view: string, width: number) {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    await info.attach(`${view}-${width}`, {
      body: JSON.stringify(result.violations),
      contentType: "application/json",
    });
    if (result.violations.length)
      failures.push({
        view,
        width,
        issues: result.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("./");
  await signIn(page, "teacher");
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.locator(".dark-mode-switch").click();
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await page.keyboard.press("Escape");
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const section of [
      "students",
      "reports",
      "shop",
      "claims",
      "content",
      "activity",
    ]) {
      await page.goto(`#/teacher/${section}`);
      const table = page.locator(".teacher-table");
      await expect(table.locator("tbody tr").first()).toBeVisible();
      await check(`teacher-${section}`, width);
      if (section === "students" || section === "shop") {
        await table.locator("caption").evaluate((node) => {
          node.scrollIntoView({ block: "start" });
          scrollBy(0, -100);
        });
        await page.screenshot({
          path: `/tmp/cozy-dark-${section}-${width}.png`,
        });
      }
      if (
        width === 1280 &&
        ["students", "shop", "activity"].includes(section)
      ) {
        const labels: Record<string, string> = {
          students: "View profile",
          shop: "Edit supply",
          activity: "View change",
        };
        const action = table
          .getByRole("button", { name: labels[section], exact: true })
          .first();
        await action.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(action).toBeFocused();
      }
    }
  }
  await signOut(page);
  await signIn(page);
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("#/records");
    await expect(page.locator(".records-page tbody tr")).toHaveCount(1);
    await check("student-records", width);
    await page.goto("#/shop");
    await page
      .getByRole("button", { name: "My reservations (3)", exact: true })
      .click();
    await expect(page.locator(".status-tag")).toHaveCount(3);
    await check("student-reservations", width);
    await page.screenshot({ path: `/tmp/cozy-dark-reservations-${width}.png` });
    await page.keyboard.press("Escape");
  }
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.locator(".dark-mode-switch").click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-color-mode",
    "light",
  );
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("#/records");
  await expect(page.locator(".records-page tbody tr")).toHaveCount(1);
  await check("student-records-light", 1280);
  expect(backend.items[0].stock).toBe(1);
  expect(backend.orders).toHaveLength(3);
  expect(backend.credits[users[0].id]).toBe(200);
  expect(failures).toEqual([]);
});
