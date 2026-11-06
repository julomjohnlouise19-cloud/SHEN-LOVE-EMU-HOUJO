import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import cells from "../src/data/questions/life/cells.json" with { type: "json" };
import type { Question } from "../src/core/types";
async function ready(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
}
test("phase 1: Cells vertical slice, mastery and Review Box", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await ready(page);
  await page.goto("/#/branch/life");
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  await page.getByRole("button", { name: "Let’s make a discovery" }).click();
  for (let i = 0; i < 8; i++) {
    await expect(
      page.getByRole("button", { name: "Check my answer" }),
    ).toBeVisible();
    const prompt = await page.locator(".question-card > h2").innerText(),
      q = (cells as Question[]).find((q) => q.prompt === prompt)!;
    expect(q).toBeTruthy();
    if (q.type === "order") {
      /* intentionally keep the shuffled order: mix-ups are part of this smoke test */
    } else if (q.type === "match" && typeof q.answer === "object") {
      for (const [key, value] of Object.entries(q.answer))
        await page
          .getByRole("combobox", { name: `Match ${key}` })
          .selectOption(value);
    } else if (q.options) {
      const choice =
        i === 0
          ? q.options.find((o) => o.id !== q.answer)!
          : q.options.find((o) => o.id === q.answer)!;
      await page
        .getByRole("button", { name: choice.text, exact: false })
        .click();
    } else
      await page
        .getByLabel("Your answer", { exact: true })
        .fill(String(q.answer));
    await page.getByRole("button", { name: "Check my answer" }).click();
    await expect(page.locator(".answer-feedback")).toBeVisible();
    await page
      .getByRole("button", {
        name: i === 7 ? "See my discoveries" : "On to the next little wonder",
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: /discovered|perfect little/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Visit my Review Box" }).click();
  await expect(
    page.getByRole("heading", { name: "Your Review Box", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("csl:state")!).users.find(
          (u: { id: string }) => u.id === "guest",
        ).mastery["life.cells"].completed,
    ),
  ).toBe(1);
  expect(errors).toEqual([]);
});
test("dashboard has no serious accessibility errors and fits a phone", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("main");
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({
    path: "/tmp/cozy-dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/cozy-dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(
    page.getByRole("link", { name: "Science Island" }),
  ).toBeVisible();
});
test("phase 2: daily spin, notebook, demo accounts, supply redemption and admin collection", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await ready(page);
  await page.goto("/#/spin");
  await page.getByRole("button", { name: "Let’s give it a spin" }).click();
  await expect(
    page.getByRole("button", { name: "Today’s discovery is yours" }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Today’s discovery is yours" }),
  ).toBeDisabled();
  await page.goto("/#/notebook");
  await page.getByRole("button", { name: "A fresh little page" }).click();
  await page.getByLabel("Give your thought a title").fill("My cell discovery");
  await page
    .getByLabel("Your science note")
    .fill("The nucleus holds most DNA in a plant cell.");
  await page
    .getByRole("button", { name: "Keep this thought", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "My cell discovery" }),
  ).toBeVisible();
  await page.goto("/#/admin");
  await page.getByRole("button", { name: "Admin sign in" }).click();
  await page.getByLabel("Username", { exact: true }).fill("admin");
  await page.getByLabel("Password", { exact: true }).fill("admin123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little care makes a lab grow." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Scientists", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Little scientist" })
    .getByRole("button", { name: "Adjust merits" })
    .click();
  await page.getByLabel("Whole merits to add or subtract").fill("100");
  await page.getByLabel("Reason", { exact: true }).fill("Demo reward test");
  await page.getByRole("button", { name: "Save adjustment" }).click();
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
  await page.goto("/#/shop");
  await page
    .getByRole("button", { name: "Exchange 35 merits for Little idea pencils" })
    .click();
  await page
    .getByRole("button", { name: "Exchange 35 merits", exact: true })
    .click();
  await expect(page.locator(".claim-code")).toHaveText(/^CSL-/);
  await page.getByRole("button", { name: "Redeem this code" }).click();
  await expect(
    page.getByRole("dialog").getByText("redeemed", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto("/#/admin");
  await page.getByRole("button", { name: "Admin sign in" }).click();
  await page.getByLabel("Username", { exact: true }).fill("admin");
  await page.getByLabel("Password", { exact: true }).fill("admin123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await page.getByRole("button", { name: "Claims", exact: true }).click();
  await page.getByRole("button", { name: "Confirm collected" }).click();
  await page.getByRole("button", { name: "Verified & handed over" }).click();
  await expect(
    page.getByText("Collected with teacher", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("phase 2: two tabs cannot buy the last supply twice", async ({
  page,
  context,
}) => {
  await ready(page);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("csl:state")!);
    s.users.find((u: { id: string }) => u.id === "guest").merits = 500;
    s.items[0].stock = 1;
    localStorage.setItem("csl:state", JSON.stringify(s));
  });
  const other = await context.newPage();
  await other.goto("/#/shop");
  await page.reload();
  await page.goto("/#/shop");
  await page
    .getByRole("button", { name: "Exchange 35 merits for Little idea pencils" })
    .click();
  await other
    .getByRole("button", { name: "Exchange 35 merits for Little idea pencils" })
    .click();
  await Promise.all([
    page
      .getByRole("button", { name: "Exchange 35 merits", exact: true })
      .click(),
    other
      .getByRole("button", { name: "Exchange 35 merits", exact: true })
      .click(),
  ]);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem("csl:state")!);
        return s.purchases.filter(
          (p: { itemId: string }) => p.itemId === "pencil",
        ).length;
      }),
    )
    .toBe(1);
  expect(
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("csl:state")!);
      return { stock: s.items[0].stock, balance: s.users[0].merits };
    }),
  ).toEqual({ stock: 0, balance: 465 });
  await other.close();
});
