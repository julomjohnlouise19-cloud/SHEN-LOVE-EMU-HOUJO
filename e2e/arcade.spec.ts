import { test, expect, exploreAsGuest } from "./fixtures";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, readdirSync } from "node:fs";
import type { Question } from "../src/core/types";

const questions = readdirSync("src/data/questions").flatMap((dir) =>
  readdirSync(`src/data/questions/${dir}`).flatMap(
    (file) =>
      JSON.parse(
        readFileSync(`src/data/questions/${dir}/${file}`, "utf8"),
      ) as Question[],
  ),
);
async function start(page: Page, category = "Biology") {
  await exploreAsGuest(page);
  await page.getByRole("link", { name: "Science Arcade", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Science Arcade", exact: true }),
  ).toBeVisible();
  for (const name of ["Biology", "Chemistry", "Physics", "Earth & space"])
    await expect(
      page.getByRole("button", {
        name: new RegExp(`${name}.*PLAY 9 DISCOVERIES`),
      }),
    ).toBeVisible();
  await page
    .getByRole("button", {
      name: new RegExp(`${category}.*PLAY 9 DISCOVERIES`),
    })
    .click();
  await expect(page.locator(".arcade-question .eyebrow")).toHaveText(
    "DISCOVERY 1 / 9",
  );
}
async function currentQuestion(page: Page) {
  const prompt = await page.locator(".arcade-question h1").innerText();
  const q = questions.find((q) => q.prompt === prompt);
  expect(q).toBeTruthy();
  return q!;
}
async function correctShot(page: Page) {
  const q = await currentQuestion(page);
  await page
    .getByRole("button", {
      name: `Shoot ${q.options!.find((o) => o.id === q.answer)!.text}`,
      exact: true,
    })
    .click();
}
function metric(page: Page, label: string) {
  return page
    .locator(".arcade-hud > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("strong");
}

test("guest plays all levels with one-second reload, combos, boosts and a saved ranking", async ({
  page,
}) => {
  await page.clock.install();
  await start(page);
  await expect(page.locator(".arcade-target")).toHaveCount(4);
  for (let i = 0; i < 9; i++) {
    await expect(page.locator(".arcade-question .eyebrow")).toHaveText(
      `DISCOVERY ${i + 1} / 9`,
    );
    await expect(page.locator(".arcade-topline .pill")).toContainText(
      `Level ${Math.floor(i / 3) + 1}`,
    );
    if (i === 3) {
      await expect(metric(page, "COMBO")).toHaveText("×2");
      await page
        .getByRole("button", { name: "Buy five extra seconds", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Buy five extra seconds",
          exact: true,
        }),
      ).toBeDisabled();
      await page
        .getByRole("button", { name: "Buy an extra dart", exact: true })
        .click();
      await expect(metric(page, "DARTS")).toHaveText("3");
      await expect(
        page.getByRole("button", { name: "Buy an extra dart", exact: true }),
      ).toBeDisabled();
    }
    if (i === 6) await expect(metric(page, "COMBO")).toHaveText("×3");
    await correctShot(page);
    if (i < 8) {
      await expect(page.locator(".arcade-question .eyebrow")).toHaveText(
        `DISCOVERY ${i + 2} / 9`,
      );
      await expect(page.locator(".arcade-reload")).toContainText("Reloading");
      await expect(page.locator(".arcade-target:disabled")).toHaveCount(4);
      await page.clock.fastForward(1100);
      await expect(page.locator(".arcade-target:disabled")).toHaveCount(0);
    }
  }
  await expect(page.locator(".arcade-final-score")).toHaveText("2,000");
  await expect(
    page.getByText("9/9 correct · 22 round coins left", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View arcade leaderboard", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "2000", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", { name: "Play another round", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Physics.*PLAY 9 DISCOVERIES/ })
    .click();
  await expect(metric(page, "ROUND COINS")).toHaveText("0");
  await expect(metric(page, "SCORE")).toHaveText("0");
});

test("wrong shots and timeouts are bounded and resumed rounds keep their deadline", async ({
  page,
}) => {
  await page.clock.install();
  await start(page, "Chemistry");
  const q = await currentQuestion(page),
    wrong = q.options!.find((o) => o.id !== q.answer)!;
  await page
    .getByRole("button", { name: `Shoot ${wrong.text}`, exact: true })
    .click();
  await expect(page.locator(".arcade-feedback")).toContainText(
    "Reload and try another target",
  );
  await expect(metric(page, "SCORE")).toHaveText("0");
  await expect(metric(page, "ROUND COINS")).toHaveText("0");
  await expect(metric(page, "DARTS")).toHaveText("1");
  await page.clock.fastForward(1100);
  await expect(
    page.getByRole("button", { name: `Shoot ${wrong.text}`, exact: true }),
  ).toBeDisabled();
  await correctShot(page);
  await expect(page.locator(".arcade-question .eyebrow")).toHaveText(
    "DISCOVERY 2 / 9",
  );
  await page.getByRole("link", { name: "My lab", exact: true }).click();
  await page.clock.fastForward(25000);
  await page.getByRole("link", { name: "Science Arcade", exact: true }).click();
  await page
    .getByRole("button", { name: "Resume my round", exact: true })
    .click();
  await expect(page.locator(".arcade-question .eyebrow")).toHaveText(
    "DISCOVERY 3 / 9",
  );
  await expect(page.locator(".arcade-feedback")).toContainText("Time’s up");
  await expect(metric(page, "SCORE")).toHaveText("75");
  await expect(metric(page, "ROUND COINS")).toHaveText("2");
  await expect(metric(page, "COMBO")).toHaveText("×1");
  await page.reload();
  await page
    .getByRole("button", { name: "Resume my round", exact: true })
    .click();
  await expect(page.locator(".arcade-question .eyebrow")).toHaveText(
    "DISCOVERY 3 / 9",
  );
  await expect(metric(page, "SCORE")).toHaveText("75");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.getByRole("button", { name: "Log out now", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
  await expect(page.locator(".arcade-target")).toHaveCount(0);
});

test("arcade supports keyboard aim, sound preferences and calm mobile targets", async ({
  page,
}) => {
  await page.clock.install();
  await start(page, "Earth & space");
  await expect(page.getByLabel("Calm targets", { exact: true })).toBeChecked();
  await page.getByLabel("Calm targets", { exact: true }).uncheck();
  await expect(page.locator(".arcade-targets")).not.toHaveClass(/calm-targets/);
  await page.getByLabel("Calm targets", { exact: true }).check();
  await page.getByRole("button", { name: "Sound on", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sound off", exact: true }),
  ).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({
    path: "/tmp/cozy-arcade-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const q = await currentQuestion(page);
  expect(
    await page
      .locator(".arcade-targets")
      .evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight),
  ).toBe(true);
  const target = page.getByRole("button", {
    name: `Shoot ${q.options!.find((o) => o.id === q.answer)!.text}`,
    exact: true,
  });
  await target.focus();
  await expect(target).toHaveClass(/aimed/);
  await expect(
    page.getByRole("button", { name: "Shoot aimed target", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Enter");
  await expect(page.locator(".arcade-question .eyebrow")).toHaveText(
    "DISCOVERY 2 / 9",
  );
  await page.clock.fastForward(1100);
  await page.screenshot({
    path: "/tmp/cozy-arcade-mobile.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Sound off", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume my round", exact: true })
    .click();
  await expect(page.getByLabel("Calm targets", { exact: true })).toBeChecked();
});
