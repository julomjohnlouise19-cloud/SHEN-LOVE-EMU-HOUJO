import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";

test("learning trail and science ideas are useful, responsive and accessible", async ({
  page,
}, testInfo) => {
  await exploreAsGuest(page);
  const trail = page.getByRole("region", {
    name: "Your learning trail",
    exact: true,
  });
  await expect(trail).toBeVisible();
  await expect(
    trail.getByText("0 / 8 answers today", { exact: true }),
  ).toBeVisible();
  const wonder = page.locator(".daily-fact [role=status]");
  const original = await wonder.textContent();
  const saved = await page.evaluate(() => localStorage.getItem("csl:state"));
  await page
    .getByRole("button", { name: "Next science fact", exact: true })
    .click();
  await expect(wonder).not.toHaveText(original!);
  for (let i = 0; i < 5; i++)
    await page
      .getByRole("button", { name: "Next science fact", exact: true })
      .click();
  await expect(wonder).toHaveText(original!);
  expect(await page.evaluate(() => localStorage.getItem("csl:state"))).toBe(
    saved,
  );
  await expect(
    page.getByRole("link", { name: "Science Arcade", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Leaderboard", exact: true }),
  ).toBeVisible();
  for (const [theme, width] of [
    ["meadow", 1280],
    ["aurora", 390],
    ["sunset", 320],
  ] as const) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .include(".discovery-hero")
          .include(".learning-trail")
          .include(".daily-fact")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`learning-${theme}.png`),
      fullPage: true,
    });
  }
  await trail
    .getByRole("link", { name: "Open my notebook", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/notebook$/);
  await page.goto("/#/");
  await page
    .getByRole("region", { name: "Your learning trail", exact: true })
    .getByRole("link", { name: "Open Review Box", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/review$/);
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
