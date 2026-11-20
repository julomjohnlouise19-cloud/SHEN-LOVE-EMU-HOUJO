import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect, exploreAsGuest } from "./fixtures";
import { boundedPage, brightSurfaces } from "./interface-helpers";

async function profile(page: Page) {
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await expect(page.locator(".badge-showcase-status")).toContainText(
    "of 3 selected",
  );
}
async function earnedFixture(page: Page) {
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("csl:state")!);
    const user = saved.users.find(
      (value: { id: string }) => value.id === "guest",
    );
    user.badges = [
      "first-deck",
      "ten-right",
      "perfect-easy",
      "week-streak",
      "perfect-deck",
    ];
    localStorage.setItem("csl:state", JSON.stringify(saved));
  });
  await page.reload();
}
test("the avatar chooser becomes an honest empty badge shelf with a working earning route", async ({
  page,
}) => {
  await exploreAsGuest(page);
  await profile(page);
  await expect(
    page.getByRole("heading", { name: "Your illustrated avatar", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".avatar-choice")).toHaveCount(0);
  await expect(page.locator(".scientist-card-avatar")).toBeAttached();
  await expect(page.locator(".profile-badge-choice")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save my badges", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".badge-showcase-empty")).toContainText(
    "Your first badge is waiting to bloom",
  );
  await page
    .getByRole("button", { name: "Explore my growth garden", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/growth$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("three earned pins save, survive reload, protect another tab's edits and clear without changing learning", async ({
  page,
  context,
}) => {
  await exploreAsGuest(page);
  await earnedFixture(page);
  const learning = await page.evaluate(() => {
    const user = JSON.parse(localStorage.getItem("csl:state")!).users.find(
      (value: { id: string }) => value.id === "guest",
    );
    return {
      xp: user.xp,
      merits: user.merits,
      mastery: user.mastery,
      badges: user.badges,
      avatar: user.avatar,
    };
  });
  await profile(page);
  const names = [
    "First little discovery",
    "First 10 correct",
    "Perfect easy deck",
  ];
  for (const name of names)
    await page
      .getByRole("button", { name: "Display " + name, exact: true })
      .click();
  await expect(
    page.getByRole("button", { name: "Display 7-day streak", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("[data-displayed-badge]")).toHaveCount(0);
  await expect(page.locator("[data-preview-badge]")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Save my badges", exact: true })
    .click();
  await expect(page.locator("[data-displayed-badge]")).toHaveCount(3);
  await page.reload();
  await profile(page);
  await expect(page.locator("[data-displayed-badge]")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Display First 10 correct", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const other = await context.newPage();
  await exploreAsGuest(other, "/#/growth");
  await profile(other);
  await other
    .getByRole("button", { name: "Remove First little discovery", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save my badges", exact: true })
    .click();
  await expect(other.locator(".badge-showcase-status")).toContainText(
    "changed in another tab",
  );
  await expect(other.locator("[data-preview-badge]")).toHaveCount(2);
  await expect(
    other.getByRole("button", { name: "Save my badges", exact: true }),
  ).toBeDisabled();
  await other
    .getByRole("button", { name: "Undo changes", exact: true })
    .click();
  await expect(other.locator("[data-preview-badge]")).toHaveCount(0);
  await expect(other.locator("[data-displayed-badge]")).toHaveCount(0);
  await other.close();
  expect(
    await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem("csl:state")!).users.find(
        (value: { id: string }) => value.id === "guest",
      );
      return {
        xp: user.xp,
        merits: user.merits,
        mastery: user.mastery,
        badges: user.badges,
        avatar: user.avatar,
      };
    }),
  ).toEqual(learning);
});
test("the cute badge shelf stays readable and bounded in every phone and desktop palette", async ({
  page,
}) => {
  test.setTimeout(180000);
  await exploreAsGuest(page);
  await earnedFixture(page);
  await profile(page);
  await page
    .getByRole("button", {
      name: "Display First little discovery",
      exact: true,
    })
    .click();
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["meadow", "aurora", "sunset"])
      for (const mode of ["light", "dark"]) {
        await page.evaluate(
          ({ theme, mode }) => {
            document.documentElement.dataset.theme = theme;
            document.documentElement.dataset.colorMode = mode;
          },
          { theme, mode },
        );
        await page.locator(".profile-badge-editor").scrollIntoViewIfNeeded();
        await boundedPage(page);
        expect(
          await page
            .locator(".profile-badge-editor")
            .evaluate((node) => node.scrollWidth <= node.clientWidth),
        ).toBe(true);
        if (mode === "dark")
          expect(await brightSurfaces(page, "dialog[open]")).toEqual([]);
        expect(
          (
            await new AxeBuilder({ page })
              .include("dialog[open]")
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
      }
    await page.screenshot({
      path: "/tmp/cozy-profile-badges-dark-" + width + ".png",
    });
  }
});
