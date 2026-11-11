import { test, expect, exploreAsGuest } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import cells from "../src/data/questions/life/cells.json" with { type: "json" };
import type { Question } from "../src/core/types";

test("school identity renders at the left of welcome, mobile pages and dialogs", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/The Cozy Science Lab/);
  const welcomeLogo = page.locator(".welcome-header .school-logo");
  await expect(welcomeLogo).toBeVisible();
  expect(
    await welcomeLogo.evaluate(async (image: HTMLImageElement) => {
      await image.decode();
      return image.naturalWidth > 0;
    }),
  ).toBe(true);
  const logoBox = (await welcomeLogo.boundingBox())!;
  const nameBox = (await page
    .locator(".welcome-header .brand-copy")
    .boundingBox())!;
  expect(logoBox.x + logoBox.width).toBeLessThanOrEqual(nameBox.x);
  await page
    .getByRole("button", { name: "Explore as guest", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator(".topbar .school-logo")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Log out", exact: true }),
    ).toBeVisible();
    const box = (await page.locator(".topbar .school-logo").boundingBox())!;
    expect(box.x).toBeLessThan(width / 2);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 320) {
      const copy = (await page.locator(".hero-card .hero-copy").boundingBox())!;
      const art = (await page
        .locator(".hero-card > .hero-illustration")
        .boundingBox())!;
      expect(art.y).toBeGreaterThanOrEqual(copy.y + copy.height);
    }
  }
  await page.screenshot({
    path: "/tmp/the-cozy-science-lab-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.getByRole("button", {
    name: "Toggle navigation",
    includeHidden: true,
  });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await page.locator(".sidebar .school-brand").click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".sidebar")).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto("/#/branch/life");
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cells", exact: true });
  await expect(dialog.locator(".modal-identity .school-logo")).toBeVisible();
  await expect(
    dialog.getByText("The Cozy Science Lab", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/the-cozy-science-lab-dialog.png",
    fullPage: true,
  });
});

test("topic search finds decks across branches, explains empty results and respects the Skills gate", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/island");
  const search = page.getByLabel("Search all science decks", { exact: true });
  await search.fill("chemistry atoms");
  await expect(
    page.getByRole("button", {
      name: "Open Atoms & the Periodic Table",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("button", {
      name: "Open Atoms & the Periodic Table",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: "Atoms & the Periodic Table",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await search.fill("zzzyy no such science topic");
  await expect(page.locator(".topic-status")).toContainText(
    "No matching decks",
  );
  await expect(page.locator(".topic-result")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await search.fill("science skills");
  await expect(page.locator(".topic-result")).toHaveCount(3);
  for (const result of await page.locator(".topic-result").all())
    await expect(result).toBeDisabled();
  await search.press("Escape");
  await expect(search).toHaveValue("");
  await page.screenshot({
    path: "/tmp/the-cozy-science-lab-topic-search.png",
    fullPage: true,
  });
});

test("Continue learning resumes the same saved question after logout without duplicating rewards", async ({
  page,
}) => {
  await exploreAsGuest(page);
  await page.goto("/#/branch/life");
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  await page.getByRole("button", { name: "Let’s make a discovery" }).click();
  await expect(
    page.getByRole("button", { name: "Check my answer" }),
  ).toBeVisible();
  const prompt = await page.locator(".question-card > h2").innerText();
  const question = (cells as Question[]).find((q) => q.prompt === prompt)!;
  expect(question).toBeTruthy();
  if (
    question.type === "match" &&
    typeof question.answer === "object" &&
    !Array.isArray(question.answer)
  ) {
    for (const [key, value] of Object.entries(question.answer))
      await page
        .getByRole("combobox", { name: `Match ${key}` })
        .selectOption(value);
  } else if (question.type !== "order") {
    if (question.options) await page.locator(".answer-option").first().click();
    else
      await page
        .getByLabel("Your answer", { exact: true })
        .fill(String(question.answer));
  }
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.locator(".answer-feedback")).toBeVisible();
  await page
    .getByRole("button", { name: "On to the next little wonder" })
    .click();
  await expect(
    page.getByRole("button", { name: "Check my answer" }),
  ).toBeVisible();
  const nextPrompt = await page.locator(".question-card > h2").innerText();
  const snapshot = () =>
    page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("csl:state")!);
      const user = state.users.find(
        (user: { id: string }) => user.id === "guest",
      );
      const runs = state.runs.filter(
        (run: { userId: string; completed: boolean }) =>
          run.userId === "guest" && !run.completed,
      );
      return {
        ids: runs.map((run: { id: string }) => run.id),
        answers: runs[0].answers.length,
        merits: user.merits,
        xp: user.xp,
      };
    });
  const before = await snapshot();
  await page.goto("/#/");
  await expect(
    page.getByRole("region", { name: "Continue your science session" }),
  ).toContainText("1 of 8 cards answered");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.getByRole("button", { name: "Log out now" }).click();
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Explore as guest", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continue learning", exact: true })
    .click();
  await expect(page.locator(".question-card > h2")).toHaveText(nextPrompt);
  expect(await snapshot()).toEqual(before);
});

test("offline guidance preserves an active search and the school logo remains available offline", async ({
  page,
  context,
}) => {
  await exploreAsGuest(page, "/#/island");
  const search = page.getByLabel("Search all science decks", { exact: true });
  await search.fill("atoms");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await expect(page.locator("[data-connection-notice]")).toBeVisible();
  await expect(search).toHaveValue("atoms");
  await page
    .getByRole("button", {
      name: "Open Atoms & the Periodic Table",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog").locator(".school-logo")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(page.locator("[data-connection-notice]")).toBeVisible();
  expect(
    await page
      .locator(".topbar .school-logo")
      .evaluate(async (image: HTMLImageElement) => {
        await image.decode();
        return image.naturalWidth > 0;
      }),
  ).toBe(true);
  await search.fill("cells");
  await context.setOffline(false);
  await expect(page.locator("[data-connection-notice]")).toBeHidden();
  await expect(search).toHaveValue("cells");
});
