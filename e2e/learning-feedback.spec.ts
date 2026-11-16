import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import type { AppState, Question, Run } from "../src/core/types";
import cells from "../src/data/questions/life/cells.json" with { type: "json" };

test("incorrect cell choices explain the confusion and medium evidence checks leave grading intact", async ({
  page,
}) => {
  await exploreAsGuest(page);
  const question = (cells as Question[]).find(
    (q) =>
      q.level === "medium" &&
      /sunlight.*sugar/i.test(q.prompt) &&
      q.options?.some((o) => /mitochondri/i.test(o.text)),
  )!;
  const id = "feedback-evidence-test";
  await page.evaluate(
    ({ id, q }) => {
      const state = JSON.parse(localStorage.getItem("csl:state")!) as AppState;
      const run: Run = {
        id,
        userId: "guest",
        deckId: q.deckId,
        level: q.level,
        mode: "practice",
        ids: [q.id],
        answers: [],
        completed: false,
        created: Date.now(),
      };
      state.runs.push(run);
      state.rev++;
      localStorage.setItem("csl:state", JSON.stringify(state));
    },
    { id, q: question },
  );
  await page.goto(`/#/play/${id}`);
  await page.reload();
  const wrong = question.options!.find((o) => /mitochondri/i.test(o.text))!;
  await page.getByRole("button", { name: wrong.text, exact: false }).click();
  await page
    .getByRole("button", { name: "Check my answer", exact: true })
    .click();
  await expect(page.locator(".choice-rationale")).toContainText(
    "Mitochondria release usable energy through cellular respiration",
  );
  const check = page.getByRole("region", {
    name: "Cells reasoning practice",
    exact: true,
  });
  await expect(check.getByRole("table")).toContainText("Iodine starch test");
  await check
    .getByRole("button", {
      name: "Every form of respiration stops in darkness",
      exact: true,
    })
    .click();
  await expect(check.getByRole("status")).toContainText(
    "It does not show that respiration stops in darkness",
  );
  const before = await page.evaluate(() => localStorage.getItem("csl:state"));
  await check
    .getByRole("button", {
      name: "Light supported starch production under these conditions",
      exact: true,
    })
    .click();
  await expect(check.getByRole("status")).toContainText("That reasoning fits");
  expect(await page.evaluate(() => localStorage.getItem("csl:state"))).toBe(
    before,
  );
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page
        .locator(".choice-rationale")
        .evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
    ).toBeGreaterThanOrEqual(14);
    expect(
      await page
        .locator(".fine-print")
        .first()
        .evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
    ).toBeGreaterThanOrEqual(13);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .include(".answer-feedback")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: "/tmp/cozy-cell-feedback-phone.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "See my discoveries", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /discovered|perfect little/ }),
  ).toBeVisible();
});

test("daily wheel reminders disappear after spinning and return on the next classroom day", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-16T15:55:00Z") });
  await exploreAsGuest(page);
  const bell = page.getByRole("button", { name: /^Notifications/ });
  await bell.click();
  await expect(
    page.getByRole("region", { name: "Daily wheel reminder", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("All quiet in the lab.", { exact: false }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Spin today’s wheel", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/spin$/);
  await page
    .getByRole("button", { name: "Let’s give it a spin", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Today’s discovery is yours",
      exact: true,
    }),
  ).toBeDisabled();
  await bell.click();
  await expect(
    page.getByRole("region", { name: "Daily wheel reminder", exact: true }),
  ).not.toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await bell.click();
  await expect(
    page.getByRole("region", { name: "Daily wheel reminder", exact: true }),
  ).not.toBeVisible();
  await page.keyboard.press("Escape");
  await page.clock.setSystemTime(new Date("2026-11-16T16:01:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("csl:daily-tick")));
  await bell.click();
  await expect(
    page.getByRole("region", { name: "Daily wheel reminder", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Daily wheel reminder", exact: true }),
  ).toHaveCount(1);
});
