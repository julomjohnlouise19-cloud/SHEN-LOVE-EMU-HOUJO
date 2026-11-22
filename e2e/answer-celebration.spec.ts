import { test, expect, exploreAsGuest } from "./fixtures";
import type { Page } from "@playwright/test";
import cells from "../src/data/questions/life/cells.json" with { type: "json" };
import type { Question } from "../src/core/types";
import { explorerPlanets } from "../src/data/activity-planets";

test.use({ reducedMotion: "no-preference" });

async function observeBursts(page: Page) {
  await page.addInitScript(() => {
    const stats = window as unknown as {
      answerBursts: {
        pieces: number;
        decorative: boolean;
        passThrough: boolean;
      }[];
      maximumBursts: number;
    };
    stats.answerBursts = [];
    stats.maximumBursts = 0;
    addEventListener("DOMContentLoaded", () => {
      new MutationObserver((records) => {
        for (const record of records)
          for (const node of record.addedNodes) {
            if (
              !(node instanceof HTMLElement) ||
              !node.classList.contains("answer-confetti")
            )
              continue;
            stats.answerBursts.push({
              pieces: node.children.length,
              decorative: node.getAttribute("aria-hidden") === "true",
              passThrough: getComputedStyle(node).pointerEvents === "none",
            });
          }
        stats.maximumBursts = Math.max(
          stats.maximumBursts,
          document.querySelectorAll(".answer-confetti").length,
        );
      }).observe(document.body, { childList: true, subtree: true });
    });
  });
}
async function bursts(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { answerBursts: unknown[] }).answerBursts.length,
  );
}
async function startCells(page: Page) {
  await page.goto("/#/branch/life");
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  await page
    .getByRole("button", { name: "Easy peasy Recall & recognize", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Let’s make a discovery", exact: true })
    .click();
}
async function answer(page: Page, correct: boolean) {
  const prompt = await page.locator(".question-card > h2").innerText();
  const question = (cells as Question[]).find((q) => q.prompt === prompt)!;
  expect(question).toBeTruthy();
  if (question.options) {
    const choice = question.options.find(
      (option) => (option.id === question.answer) === correct,
    )!;
    await page.getByRole("button", { name: choice.text, exact: false }).click();
  } else
    await page
      .getByLabel("Your answer", { exact: true })
      .fill(
        correct
          ? String(question.answer)
          : question.type === "calc"
            ? String(Number(question.answer) + 1000)
            : "definitely incorrect",
      );
  await page
    .getByRole("button", { name: "Check my answer", exact: true })
    .click();
  await expect(page.locator(".answer-feedback")).toBeVisible();
}
async function next(page: Page) {
  await page
    .getByRole("button", { name: "On to the next little wonder", exact: true })
    .click();
}

test("each saved correct answer gets one lightweight confetti burst, including activity answers, without replay on refresh", async ({
  page,
}) => {
  await observeBursts(page);
  await exploreAsGuest(page);
  await startCells(page);
  await expect(
    page.getByRole("button", { name: "Turn on learning sounds", exact: true }),
  ).toBeEnabled();
  await answer(page, true);
  await expect.poll(() => bursts(page)).toBe(1);
  await next(page);
  await answer(page, true);
  await expect.poll(() => bursts(page)).toBe(2);
  await next(page);
  await answer(page, false);
  expect(await bursts(page)).toBe(2);
  await expect(page.locator(".answer-confetti")).toHaveCount(0);
  const before = await page.locator("#main").elementHandle();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect
    .poll(() => before!.evaluate((node) => node.isConnected))
    .toBe(false);
  expect(await bursts(page)).toBe(2);
  await before!.dispose();
  const saved = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("csl:state")!);
    return state.runs
      .at(-1)
      .answers.map((value: { correct: boolean }) => value.correct);
  });
  expect(saved).toEqual([true, true, false]);
  expect(
    await page.evaluate(
      () => (window as unknown as { maximumBursts: number }).maximumBursts,
    ),
  ).toBe(1);
  expect(
    await page.evaluate(
      () => (window as unknown as { answerBursts: unknown[] }).answerBursts,
    ),
  ).toEqual([
    { pieces: 12, decorative: true, passThrough: true },
    { pieces: 12, decorative: true, passThrough: true },
  ]);
  await page.goto("/#/island/activities/planets");
  const mercury = explorerPlanets[0];
  await page
    .getByRole("button", { name: mercury.options[mercury.answer], exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Mercury, in your passport!",
      exact: true,
    }),
  ).toBeVisible();
  await expect.poll(() => bursts(page)).toBe(3);
  await expect(page.locator(".answer-confetti")).toHaveCount(0, {
    timeout: 3000,
  });
  await page.reload();
  await expect(page.locator(".answer-confetti")).toHaveCount(0);
  expect(await bursts(page)).toBe(0);
});

test("correct feedback keeps user and device reduced motion, while mute leaves visual celebrations available", async ({
  page,
}) => {
  await observeBursts(page);
  await exploreAsGuest(page);
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Animation style", exact: true })
    .selectOption("reduce");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await page.keyboard.press("Escape");
  await startCells(page);
  await answer(page, true);
  expect(await bursts(page)).toBe(0);
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Animation style", exact: true })
    .selectOption("system");
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await next(page);
  await answer(page, true);
  expect(await bursts(page)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  await next(page);
  await answer(page, true);
  await expect.poll(() => bursts(page)).toBe(1);
  await page.goto("/#/island");
  await expect(page.locator(".answer-confetti")).toHaveCount(0);
});
