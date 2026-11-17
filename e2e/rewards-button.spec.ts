import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import cells from "../src/data/questions/life/cells.json" with { type: "json" };
import type { Question } from "../src/core/types";

test("header rewards open over a quiz, preserve its answer and return keyboard focus", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/branch/life");
  await expect(
    page.getByRole("link", { name: "Daily rewards", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  await page
    .getByRole("button", { name: "Easy peasy Recall & recognize", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Let’s make a discovery", exact: true })
    .click();
  const question = await page.locator(".question-card > h2").innerText();
  const card = (cells as Question[]).find((q) => q.prompt === question)!;
  expect(card).toBeTruthy();
  const area = page.locator(".answer-area");
  if (card.type === "match") {
    for (const [key, value] of Object.entries(card.answer))
      await area
        .getByRole("combobox", { name: `Match ${key}` })
        .selectOption(value);
  } else if (card.type === "order") {
    await area.locator("button:enabled").first().click();
  } else if (card.options) {
    await area.locator(".answer-option").first().click();
  } else {
    await area
      .getByLabel("Your answer", { exact: true })
      .fill(String(card.answer));
  }
  const readDraft = () =>
    area.evaluate((node) => ({
      text: node.textContent,
      controls: [
        ...node.querySelectorAll<
          HTMLInputElement | HTMLSelectElement | HTMLButtonElement
        >("input,select,button[aria-pressed]"),
      ].map((control) => ({
        value: control.value,
        pressed: control.getAttribute("aria-pressed"),
      })),
    }));
  const draft = await readDraft();
  const url = page.url(),
    reward = page.locator("[data-daily-rewards-button]");
  await reward.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Daily rewards",
    exact: true,
  });
  await expect(dialog.locator("[data-calendar-day]")).toHaveCount(49);
  await expect(dialog.getByRole("gridcell")).toHaveCount(7);
  expect(page.url()).toBe(url);
  await dialog.getByRole("button", { name: /^Show week 7,/ }).click();
  await dialog.locator("[data-calendar-day='49']").click();
  await expect(page.getByRole("dialog")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(dialog.locator("[data-calendar-day='49']")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(reward).toBeFocused();
  await expect(page.locator(".question-card > h2")).toHaveText(question);
  expect(await readDraft()).toEqual(draft);
  await expect(
    page.getByRole("button", { name: "Check my answer", exact: true }),
  ).toBeEnabled();
});

test("reward button and popup stay usable on a small phone, tablet and desktop", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/island");
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const reward = page.locator("[data-daily-rewards-button]");
    await expect(reward).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await reward.click();
    const dialog = page.getByRole("dialog", {
      name: "Daily rewards",
      exact: true,
    });
    await expect(dialog.getByRole("gridcell")).toHaveCount(7);
    await dialog.getByRole("button", { name: /^Show week 7,/ }).click();
    await expect(dialog.locator(".calendar-week-summary")).toContainText(
      "Week 7 of 7",
    );
    await dialog
      .getByRole("button", { name: "Show today in the calendar", exact: true })
      .click();
    await expect(dialog.locator("[data-calendar-day='1']")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(dialog.locator("[data-calendar-day='8']")).toBeFocused();
    await expect(dialog.locator(".calendar-week-summary")).toContainText(
      "Week 2 of 7",
    );
    await dialog
      .getByRole("button", { name: "Show today in the calendar", exact: true })
      .click();
    expect(
      await dialog.evaluate((n) => {
        const r = n.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth;
      }),
    ).toBe(true);
    expect(await dialog.evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(
      true,
    );
    const close = dialog.getByRole("button", {
      name: "Close and return to page",
      exact: true,
    });
    await expect(close).toBeInViewport();
    expect(
      await close.evaluate((n) => {
        const r = n.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth;
      }),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .include(".daily-rewards-dialog")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `/tmp/cozy-rewards-button-${viewport.width}.png`,
    });
    await close.click();
    await expect(reward).toBeFocused();
    expect(page.url()).toMatch(/#\/island$/);
  }
});

test("a popup destination closes rewards and keeps old calendar bookmarks functional", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/island");
  await page.locator("[data-daily-rewards-button]").click();
  const dialog = page.getByRole("dialog", {
    name: "Daily rewards",
    exact: true,
  });
  await dialog
    .getByRole("link", { name: "Visit the daily wheel", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/#\/spin$/);
  await page.goto("/#/daily-rewards");
  await expect(page.locator(".daily-calendar-page")).toBeVisible();
  await page.locator("[data-daily-rewards-button]").click();
  await expect(
    page
      .getByRole("dialog", { name: "Daily rewards", exact: true })
      .locator("[data-calendar-day]"),
  ).toHaveCount(49);
  await page.keyboard.press("Escape");
  await expect(
    page.locator("main .daily-calendar-page [role=gridcell]"),
  ).toHaveCount(49);
});
