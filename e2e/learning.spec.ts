import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";

test("My lab keeps a compact welcome and daily vocabulary while other tools stay in their areas", async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  await exploreAsGuest(page);
  const welcome = page.getByRole("region", {
    name: "Welcome to The Cozy Science Lab",
    exact: true,
  });
  await expect(welcome).toBeVisible();
  await expect(welcome).toContainText("Explore science at your own pace");
  await expect(page.locator(".my-lab-details > div")).toHaveCount(3);
  await expect(page.locator("#main .button.primary")).toHaveCount(1);
  await expect(page.locator("#main .my-lab > .daily-vocabulary")).toHaveCount(
    1,
  );
  await expect(
    page.locator(
      "#main .branches-section, #main .quest-card, #main .daily-spin-card, #main .daily-fact, #main .learning-trail",
    ),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Start today’s discovery", exact: true }),
  ).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem("csl:state"));
  for (const theme of ["meadow", "aurora", "sunset"]) {
    for (const mode of ["light", "dark"]) {
      await page.evaluate(
        ({ theme, mode }) => {
          document.documentElement.dataset.theme = theme;
          document.documentElement.dataset.colorMode = mode;
        },
        { theme, mode },
      );
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(
          await page.locator("#main").evaluate((node) => node.scrollHeight),
        ).toBeLessThan(1900);
        expect(
          (
            await new AxeBuilder({ page })
              .include("#main")
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
      }
    }
    await page.screenshot({
      path: testInfo.outputPath("my-lab-" + theme + ".png"),
      fullPage: true,
    });
    await page.screenshot({
      path: "/tmp/cozy-my-lab-" + theme + "-dark-320.png",
      fullPage: true,
    });
  }
  await page.goto("/#/sources?view=word");
  await expect(
    page.getByRole("region", { name: "Vocabulary of the day", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".daily-fact")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Little science wonders", exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("csl:state"))).toBe(
    saved,
  );
  await page
    .getByRole("button", { name: "Illustrations", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Try the tiny lab", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/experiment$/);
  await page.goto("/#/review");
  await expect(page).toHaveURL(/#\/review$/);
  await page.goto("/#/notebook");
  await expect(page).toHaveURL(/#\/notebook$/);
});

test("old minigame bookmarks lead through the welcome hub to science learning", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/arcade");
  await expect(page).toHaveURL(/#\/island$/);
  await page.goto("/#/leaderboard");
  await expect(page).toHaveURL(/#\/leaderboard$/);
  await page.getByRole("link", { name: "My lab", exact: true }).click();
  await page
    .getByRole("button", { name: "Start today’s discovery", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("button", {
      name: "A little stretch Apply & explain",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Let’s make a discovery", exact: true })
    .click();
  await expect(page.locator(".question-card")).toBeVisible();
});
