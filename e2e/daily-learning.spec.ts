import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import {
  boundedPage,
  brightSurfaces,
  visitRenderedRoute,
} from "./interface-helpers";

test("vocabulary follows the Manila day and the calendar shows dated practice without awarding rewards", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-19T15:59:00Z"));
  await exploreAsGuest(page);
  const vocabulary = page.getByRole("region", {
    name: "Vocabulary of the day",
    exact: true,
  });
  await expect(vocabulary.locator(".vocabulary-date")).toContainText(
    "2026-11-19",
  );
  const word = await vocabulary.locator(".vocabulary-word").innerText();
  await vocabulary
    .getByRole("button", { name: "Reveal the meaning", exact: true })
    .click();
  await expect(vocabulary.locator(".vocabulary-meaning")).toBeVisible();
  await vocabulary
    .getByRole("button", { name: "Read its notes & sources", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Supporting sources");
  await page.keyboard.press("Escape");
  await expect(
    vocabulary.getByRole("button", {
      name: "Read its notes & sources",
      exact: true,
    }),
  ).toBeFocused();
  const topic = await vocabulary.locator(".vocabulary-topic").innerText();
  await vocabulary
    .getByRole("button", { name: "Try this topic", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: topic, exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    vocabulary.getByRole("button", { name: "Try this topic", exact: true }),
  ).toBeFocused();
  await page.clock.setFixedTime(new Date("2026-11-19T16:01:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("csl:daily-tick")));
  await expect(vocabulary.locator(".vocabulary-date")).toContainText(
    "2026-11-20",
  );
  await expect(vocabulary.locator(".vocabulary-word")).not.toHaveText(word);
  await expect(vocabulary.locator(".vocabulary-meaning")).toBeHidden();
  const nextWord = await vocabulary.locator(".vocabulary-word").innerText();
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("csl:state")!);
    const user = state.users.find(
      (user: { id: string }) => user.id === "guest",
    );
    const daily = (answers: number, correct: number) => ({
      answers,
      correct,
      merits: 0,
      spin: true,
      quests: [],
      challenge: false,
    });
    user.daily["2026-10-31"] = daily(8, 7);
    user.daily["2026-11-18"] = daily(2, 1);
    user.daily["2026-11-19"] = daily(8, 6);
    user.daily["2026-11-20"] = daily(0, 0);
    localStorage.setItem("csl:state", JSON.stringify(state));
  });
  await page.reload();
  await expect(page.locator(".vocabulary-word")).toHaveText(nextWord);
  await visitRenderedRoute(page, "/");
  await page
    .getByRole("button", { name: "Open learning history", exact: true })
    .click();
  const calendar = page.getByRole("dialog", {
    name: "Your learning calendar",
    exact: true,
  });
  await expect(calendar.locator(".learning-calendar-summary")).toHaveText(
    "2 active days · 10 answers · 1 goal met",
  );
  await expect(
    calendar.locator('[data-learning-date="2026-11-21"]'),
  ).toBeDisabled();
  const day = calendar.locator('[data-learning-date="2026-11-19"]');
  await day.click();
  await expect(calendar.locator(".learning-day-detail")).toContainText(
    "8 answers · 6 correct",
  );
  await expect(calendar.locator(".learning-day-detail")).toContainText(
    "goal met",
  );
  await page.keyboard.press("ArrowLeft");
  await expect(
    calendar.locator('[data-learning-date="2026-11-18"]'),
  ).toBeFocused();
  await expect(calendar.locator(".learning-day-detail")).toContainText(
    "2 answers · 1 correct",
  );
  await calendar
    .getByRole("button", { name: "Previous learning month", exact: true })
    .click();
  await expect(calendar.locator(".learning-calendar-navigation h3")).toHaveText(
    "October 2026",
  );
  await page.keyboard.press("End");
  await expect(
    calendar.locator('[data-learning-date="2026-10-31"]'),
  ).toBeFocused();
  await expect(calendar.locator(".learning-day-detail")).toContainText(
    "8 answers · 7 correct",
  );
  await calendar
    .getByRole("button", { name: "Show today", exact: true })
    .click();
  await expect(
    calendar.locator('[data-learning-date="2026-11-20"]'),
  ).toBeFocused();
  await expect(
    calendar.getByRole("button", { name: "Next learning month", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open learning history", exact: true }),
  ).toBeFocused();
  await visitRenderedRoute(page, "/growth");
  await expect(page.locator(".learning-calendar-summary")).toHaveText(
    "2 active days · 10 answers · 1 goal met",
  );
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  const profile = page.getByRole("dialog").last();
  await expect(
    profile.getByRole("button", {
      name: "Preview selected sound",
      exact: true,
    }),
  ).toBeDisabled();
  await profile
    .getByRole("button", { name: "Turn on learning sounds", exact: true })
    .click();
  await expect(
    profile.getByRole("button", {
      name: "Preview selected sound",
      exact: true,
    }),
  ).toBeEnabled();
  await profile
    .getByRole("button", { name: "Preview selected sound", exact: true })
    .click();
  await profile
    .getByRole("button", { name: "Mute learning sounds", exact: true })
    .click();
  await expect(
    profile.getByRole("button", {
      name: "Preview selected sound",
      exact: true,
    }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem("csl:state")!).users.find(
        (u: { id: string }) => u.id === "guest",
      );
      return { xp: user.xp, badges: user.badges };
    }),
  ).toEqual({ xp: 0, badges: [] });
});

test("My lab vocabulary refreshes after visiting another area across classroom midnight", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-20T15:59:00Z"));
  await exploreAsGuest(page);
  await expect(page.locator(".vocabulary-date")).toContainText("2026-11-20");
  const previousWord = await page.locator(".vocabulary-word").innerText();
  await page
    .getByRole("button", { name: "Reveal the meaning", exact: true })
    .click();
  await visitRenderedRoute(page, "/sources?view=word");
  await expect(page.locator(".daily-vocabulary")).toHaveCount(0);
  await expect(page.locator(".daily-fact")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Study notes & sources", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await visitRenderedRoute(page, "/");
  await expect(page.locator(".vocabulary-meaning")).toBeHidden();
  await visitRenderedRoute(page, "/sources?view=illustrations");
  const before = await page.evaluate(() => localStorage.getItem("csl:state"));
  await page.clock.setFixedTime(new Date("2026-11-20T16:01:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("csl:daily-tick")));
  await visitRenderedRoute(page, "/");
  await expect(page.locator(".vocabulary-date")).toContainText("2026-11-21");
  await expect(page.locator(".vocabulary-word")).not.toHaveText(previousWord);
  await expect(page.locator(".vocabulary-meaning")).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("csl:state"))).toBe(
    before,
  );
});

test("daily vocabulary, learning days and saved achievement controls keep readable themed phone surfaces", async ({
  page,
}) => {
  test.setTimeout(180000);
  await exploreAsGuest(page);
  await expect(page.locator(".vocabulary-word")).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 });
  for (const theme of ["meadow", "aurora", "sunset"])
    for (const mode of ["light", "dark"]) {
      await page.evaluate(
        ({ theme, mode }) => {
          document.documentElement.dataset.theme = theme;
          document.documentElement.dataset.colorMode = mode;
        },
        { theme, mode },
      );
      await visitRenderedRoute(page, "/");
      await page
        .getByRole("button", { name: "Open learning history", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Your learning calendar",
        exact: true,
      });
      await expect(dialog).toBeVisible();
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
      await page.keyboard.press("Escape");
      expect(
        (
          await new AxeBuilder({ page })
            .include(".daily-vocabulary")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
  await page.locator(".mobile-menu").click();
  await page
    .getByRole("button", { name: "Open notifications", exact: true })
    .click();
  const notices = page.getByRole("dialog", {
    name: "Little lab updates",
    exact: true,
  });
  await notices
    .getByRole("button", { name: "Achievements", exact: true })
    .click();
  await expect(notices).toContainText("0 saved achievements");
  expect(
    (
      await new AxeBuilder({ page })
        .include("dialog[open]")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await boundedPage(page);
  await brightSurfaces(page, "dialog[open]");
  await page.screenshot({
    path: "/tmp/cozy-saved-updates-dark-320.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await visitRenderedRoute(page, "/growth");
  await page.screenshot({
    path: "/tmp/cozy-learning-calendar-dark-320.png",
    fullPage: true,
  });
});
