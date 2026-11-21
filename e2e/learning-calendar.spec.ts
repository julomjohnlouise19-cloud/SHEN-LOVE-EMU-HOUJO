import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import {
  boundedPage,
  brightSurfaces,
  visitRenderedRoute,
} from "./interface-helpers";
import type { Page } from "@playwright/test";

async function seedDiary(page: Page, dates: Record<string, [number, number]>) {
  await page.evaluate((dates) => {
    const state = JSON.parse(localStorage.getItem("csl:state")!);
    const user = state.users.find(
      (value: { id: string }) => value.id === "guest",
    );
    user.daily = Object.fromEntries(
      Object.entries(dates).map(([day, [answers, correct]]) => [
        day,
        {
          answers,
          correct,
          merits: 0,
          spin: true,
          quests: [],
          challenge: false,
        },
      ]),
    );
    const other = state.users.find(
      (value: { id: string }) => value.id !== "guest",
    );
    if (other)
      other.daily["2020-01-01"] = {
        answers: 400,
        correct: 300,
        merits: 0,
        spin: true,
        quests: [],
        challenge: false,
      };
    localStorage.setItem("csl:state", JSON.stringify(state));
  }, dates);
  await page.reload();
}
async function progressSnapshot(page: Page) {
  return page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("csl:state")!);
    const user = state.users.find(
      (value: { id: string }) => value.id === "guest",
    );
    return {
      daily: user.daily,
      xp: user.xp,
      merits: user.merits,
      badges: user.badges,
      runs: state.runs,
    };
  });
}

test("the learning diary browses real practice, validates months and opens useful study actions without awarding progress", async ({
  page,
  context,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-20T04:00:00Z"));
  await exploreAsGuest(page);
  await seedDiary(page, {
    "2026-10-31": [8, 7],
    "2026-11-18": [2, 1],
    "2026-11-19": [9, 6],
    "2026-11-20": [0, 0],
    "2026-11-21": [99, 99],
  });
  const before = await progressSnapshot(page);
  await page
    .getByRole("button", { name: "My learning calendar", exact: true })
    .click();
  const calendar = page.getByRole("region", {
    name: "Learning progress calendar",
    exact: true,
  });
  await expect(calendar.locator(".learning-calendar-summary")).toHaveText(
    "2 active days · 11 answers · 1 goal met",
  );
  const today = calendar.locator('[data-learning-date="2026-11-20"]');
  await expect(today).toHaveAttribute("aria-current", "date");
  await expect(
    calendar.getByRole("progressbar", { name: "Daily practice goal" }),
  ).toHaveAttribute("value", "0");
  await expect(
    calendar.locator('[data-learning-date="2026-11-21"]'),
  ).toBeDisabled();
  await expect(
    calendar.locator(
      '[data-learning-date="2026-11-21"] .science-diary-sticker',
    ),
  ).toHaveCount(0);
  await calendar
    .getByRole("button", { name: "Previous practice day", exact: true })
    .click();
  await expect(
    calendar.locator('[data-learning-date="2026-11-19"]'),
  ).toBeFocused();
  await expect(calendar.locator(".learning-day-detail")).toContainText(
    "9 answers · 6 correct",
  );
  await expect(
    calendar.getByRole("progressbar", { name: "Daily practice goal" }),
  ).toHaveAttribute("value", "8");
  await expect(
    calendar.locator(
      '[data-learning-date="2026-11-19"] .science-diary-sticker',
    ),
  ).toHaveCount(1);
  await expect(
    calendar.getByRole("button", { name: "Next practice day", exact: true }),
  ).toBeDisabled();
  await calendar
    .getByRole("button", { name: "Previous practice day", exact: true })
    .click();
  await expect(calendar.locator(".learning-day-detail")).toContainText(
    "2 answers · 1 correct",
  );
  await expect(
    calendar.getByRole("progressbar", { name: "Daily practice goal" }),
  ).toHaveAttribute("value", "2");
  await calendar
    .getByRole("button", { name: "Previous practice day", exact: true })
    .click();
  await expect(calendar.locator(".learning-calendar-navigation h3")).toHaveText(
    "October 2026",
  );
  await expect(
    calendar.getByRole("button", {
      name: "Previous practice day",
      exact: true,
    }),
  ).toBeDisabled();
  await calendar
    .getByRole("button", { name: "Next practice day", exact: true })
    .click();
  await expect(
    calendar.locator('[data-learning-date="2026-11-18"]'),
  ).toBeFocused();
  await calendar
    .getByRole("button", { name: "Choose month", exact: true })
    .click();
  const month = calendar.getByLabel("Month and year", { exact: true });
  await expect(month).toHaveAttribute("min", "2026-10");
  await expect(month).toHaveAttribute("max", "2026-11");
  await month.fill("2026-12");
  await expect(month).toHaveAttribute("aria-invalid", "true");
  await expect(calendar.getByRole("alert")).toContainText(
    "saved learning history",
  );
  await expect(calendar.locator(".learning-calendar-navigation h3")).toHaveText(
    "November 2026",
  );
  await month.fill("2026-10");
  await expect(calendar.locator(".learning-calendar-navigation h3")).toHaveText(
    "October 2026",
  );
  await expect(
    calendar.getByRole("button", { name: "Choose month", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await calendar
    .getByRole("button", { name: "Show today", exact: true })
    .click();
  await expect(today).toBeFocused();
  expect(await progressSnapshot(page)).toEqual(before);
  const otherTab = await context.newPage();
  await otherTab.goto("/");
  await expect(
    otherTab.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
  await otherTab.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("csl:state")!);
    const user = state.users.find(
      (value: { id: string }) => value.id === "guest",
    );
    user.daily["2026-11-20"].answers = 2;
    user.daily["2026-11-20"].correct = 1;
    localStorage.setItem("csl:state", JSON.stringify(state));
  });
  await expect(calendar.locator(".learning-calendar-summary")).toHaveText(
    "3 active days · 13 answers · 1 goal met",
  );
  await expect(calendar.locator(".learning-day-detail")).toContainText(
    "2 answers · 1 correct",
  );
  await expect(today).toBeFocused();
  const updated = await progressSnapshot(page);
  expect(updated).toEqual({
    ...before,
    daily: {
      ...before.daily,
      "2026-11-20": { ...before.daily["2026-11-20"], answers: 2, correct: 1 },
    },
  });
  await otherTab.close();
  await calendar
    .getByRole("button", { name: "Study Room", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/sources$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await visitRenderedRoute(page, "/growth");
  await page
    .getByRole("region", { name: "Learning progress calendar", exact: true })
    .getByRole("button", { name: "Find a science discovery", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/island$/);
  expect(await progressSnapshot(page)).toEqual(updated);
});

test("the diary keeps leap-day keyboard navigation, midnight rollover and cute populated layouts readable in all palettes", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.clock.setFixedTime(new Date("2024-03-01T15:59:00Z"));
  await exploreAsGuest(page);
  await seedDiary(page, {
    "2024-01-31": [8, 8],
    "2024-02-14": [3, 2],
    "2024-02-28": [8, 6],
    "2024-02-29": [10, 7],
    "2024-03-01": [2, 1],
  });
  await page
    .getByRole("button", { name: "My learning calendar", exact: true })
    .click();
  const calendar = page.getByRole("region", {
    name: "Learning progress calendar",
    exact: true,
  });
  await page.locator('[data-learning-date="2024-03-01"]').focus();
  await page.keyboard.press("PageUp");
  await expect(
    calendar.locator('[data-learning-date="2024-02-01"]'),
  ).toBeFocused();
  await page.keyboard.press("End");
  const leap = calendar.locator('[data-learning-date="2024-02-29"]');
  await expect(leap).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    calendar.locator('[data-learning-date="2024-03-01"]'),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    calendar.locator('[data-learning-date="2024-03-01"]'),
  ).toBeFocused();
  await page.clock.setFixedTime(new Date("2024-03-01T16:01:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("csl:daily-tick")));
  await expect(
    calendar.locator('[data-learning-date="2024-03-02"]'),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    calendar.locator('[data-learning-date="2024-03-02"]'),
  ).toHaveAttribute("aria-current", "date");
  await calendar
    .getByRole("button", { name: "Previous practice day", exact: true })
    .click();
  await page.keyboard.press("ArrowLeft");
  await expect(leap).toBeFocused();
  await page.keyboard.press("PageUp");
  await expect(
    calendar.locator('[data-learning-date="2024-01-29"]'),
  ).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect(leap).toBeFocused();
  await expect(calendar.locator(".learning-calendar-summary")).toHaveText(
    "3 active days · 21 answers · 2 goals met",
  );
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["meadow", "aurora", "sunset"]) {
      for (const mode of ["light", "dark"]) {
        await page.evaluate(
          ({ theme, mode }) => {
            document.documentElement.dataset.theme = theme;
            document.documentElement.dataset.colorMode = mode;
          },
          { theme, mode },
        );
        await boundedPage(page);
        if (mode === "dark") await brightSurfaces(page, "dialog[open]");
        expect(
          (
            await new AxeBuilder({ page })
              .include("dialog[open]")
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
      }
      await page
        .getByRole("dialog", { name: "Your learning calendar", exact: true })
        .evaluate((node) => {
          node.scrollTop = 0;
        });
      await page.screenshot({
        path: "/tmp/cozy-diary-" + theme + "-dark-" + width + ".png",
        fullPage: false,
      });
      await calendar.locator(".learning-day-detail").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: "/tmp/cozy-diary-detail-" + theme + "-dark-" + width + ".png",
        fullPage: false,
      });
    }
  }
  await expect(calendar.locator(".growth-buddy")).toHaveCount(0);
  for (const image of await calendar
    .locator(".science-diary-sticker img:visible")
    .all())
    expect(
      await image.evaluate(
        (node) =>
          (node as HTMLImageElement).complete &&
          (node as HTMLImageElement).naturalWidth > 0,
      ),
    ).toBe(true);
  await expect(
    calendar.locator('[data-learning-date][tabindex="0"]'),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "My learning calendar", exact: true }),
  ).toBeFocused();
});
